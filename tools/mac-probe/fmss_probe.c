// FMSuperScout — Mac-meetmodule (fase 0 van docs/macos.md). Alleen lezen.
//
// FM27 voor de Mac mag bij het starten een extra bibliotheek laden (entitlements
// allow-dyld-environment-variables + disable-library-validation; zie tools/mac-diagnose.sh).
// Deze module gebruikt dat om binnen FM's eigen proces te meten wat de Windows-scanner
// van buitenaf meet: welke database-klassen er in het geheugen staan en op welke
// sub-object-offsets. Op Windows leest de scanner dat uit MSVC-RTTI ([vtable-8] → +4);
// de Mac-build gebruikt de Itanium-ABI: offset-to-top op [vtable-16] en de type_info met
// de (gemangelde) klassenaam op [vtable-8].
//
// Gedrag:
//   - bij het laden: één regel in ~/Library/Application Support/FMSuperScout/mac-probe.txt
//     ("geladen") — bewijs dat het laden werkt;
//   - wacht daarna op het bestand mac-probe.flag in dezelfde map (aanmaken met `touch`,
//     als je save geladen is), scant dan het geheugen en schrijft het rapport.
// Er wordt nooit iets in FM geschreven: alle reads gaan via mach_vm_read_overwrite, dat bij
// een ongeldig adres een foutcode teruggeeft in plaats van te crashen.
//
// Bouwen: zie build.sh (clang -dynamiclib -arch arm64 -arch x86_64).

#include <mach/mach.h>
#include <mach/mach_vm.h>
#include <mach-o/dyld.h>
#include <mach-o/loader.h>
#include <pthread.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

extern char *__cxa_demangle(const char *mangled, char *buf, size_t *len, int *status);

static char g_dir[1024], g_out[1100], g_flag[1100];
static const char *g_home;

typedef struct { uintptr_t lo, hi; char name[512]; } image_t;
static image_t g_gp, g_ga;   // game_plugin en GameAssembly

// ---------- uitvoer ----------
// Thuismap vervangen door ~ (geen gebruikersnaam in het rapport).
static void anon(const char *in, char *out, size_t cap) {
  size_t hl = g_home ? strlen(g_home) : 0, o = 0;
  for (size_t i = 0; in[i] && o + 1 < cap;) {
    if (hl && strncmp(in + i, g_home, hl) == 0) { out[o++] = '~'; i += hl; }
    else out[o++] = in[i++];
  }
  out[o] = 0;
}
static void outf(FILE *f, const char *fmt, ...) {
  char raw[2048], clean[2048];
  va_list ap; va_start(ap, fmt); vsnprintf(raw, sizeof raw, fmt, ap); va_end(ap);
  anon(raw, clean, sizeof clean);
  fputs(clean, f); fflush(f);
}
static double now_ms(void) {
  struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1000.0 + t.tv_nsec / 1e6;
}

// ---------- veilig lezen ----------
static int rd(uintptr_t a, void *buf, size_t n) {
  mach_vm_size_t got = 0;
  return mach_vm_read_overwrite(mach_task_self(), a, n, (mach_vm_address_t)buf, &got) == KERN_SUCCESS && got == n;
}
static uint64_t rd64(uintptr_t a) { uint64_t v = 0; return rd(a, &v, 8) ? v : 0; }

// ---------- modules ----------
static void image_range(uint32_t i, image_t *img) {
  const struct mach_header_64 *h = (const struct mach_header_64 *)_dyld_get_image_header(i);
  intptr_t slide = _dyld_get_image_vmaddr_slide(i);
  uintptr_t lo = UINTPTR_MAX, hi = 0;
  const uint8_t *p = (const uint8_t *)(h + 1);
  for (uint32_t c = 0; c < h->ncmds; c++) {
    const struct load_command *lc = (const struct load_command *)p;
    if (lc->cmd == LC_SEGMENT_64) {
      const struct segment_command_64 *s = (const struct segment_command_64 *)lc;
      if (strcmp(s->segname, "__PAGEZERO") != 0) {
        uintptr_t a = (uintptr_t)s->vmaddr + slide;
        if (a < lo) lo = a;
        if (a + s->vmsize > hi) hi = a + s->vmsize;
      }
    }
    p += lc->cmdsize;
  }
  img->lo = lo; img->hi = hi;
  snprintf(img->name, sizeof img->name, "%s", _dyld_get_image_name(i));
}
static void find_images(FILE *f) {
  uint32_t n = _dyld_image_count();
  outf(f, "\n== Modules van FM (uit de app) ==\n");
  for (uint32_t i = 0; i < n; i++) {
    const char *nm = _dyld_get_image_name(i);
    if (!nm || !strstr(nm, "fm.app")) continue;
    image_t im; image_range(i, &im);
    outf(f, "  %10.1f MB  %s\n", (im.hi - im.lo) / 1048576.0, nm);
    if (strstr(nm, "game_plugin")) g_gp = im;
    if (strstr(nm, "GameAssembly")) g_ga = im;
  }
}

// ---------- telling per vtable ----------
#define TBITS 21
#define TSIZE (1u << TBITS)
typedef struct { uint64_t vt, count; } slot_t;
static slot_t *g_tab;
static void count_vt(uint64_t vt) {
  uint64_t h = (vt >> 3) * 0x9E3779B97F4A7C15ull;
  for (uint32_t k = 0, i = (uint32_t)(h >> (64 - TBITS)); k < 64; k++, i = (i + 1) & (TSIZE - 1)) {
    if (g_tab[i].vt == vt) { g_tab[i].count++; return; }
    if (g_tab[i].vt == 0) { g_tab[i].vt = vt; g_tab[i].count = 1; return; }
  }
}
static int by_count(const void *a, const void *b) {
  const slot_t *x = a, *y = b;
  return x->count < y->count ? 1 : x->count > y->count ? -1 : 0;
}

// ---------- de scan ----------
static void scan(void) {
  FILE *f = fopen(g_out, "a");
  if (!f) return;
  double t0 = now_ms();
  outf(f, "\n===== Scan %ld =====\n", (long)time(NULL));
  memset(&g_gp, 0, sizeof g_gp); memset(&g_ga, 0, sizeof g_ga);
  find_images(f);
  if (!g_gp.hi) { outf(f, "game_plugin niet gevonden — is je save geladen?\n"); fclose(f); return; }
  outf(f, "game_plugin: 0x%lx-0x%lx\n", (unsigned long)g_gp.lo, (unsigned long)g_gp.hi);

  if (!g_tab) g_tab = calloc(TSIZE, sizeof(slot_t));
  else memset(g_tab, 0, TSIZE * sizeof(slot_t));
  const size_t CH = 8u << 20;
  uint8_t *buf = malloc(CH);
  if (!g_tab || !buf) { outf(f, "geen geheugen voor de scan\n"); fclose(f); free(buf); return; }
  uintptr_t skip[4][2] = {
    { (uintptr_t)g_tab, (uintptr_t)g_tab + TSIZE * sizeof(slot_t) }, { (uintptr_t)buf, (uintptr_t)buf + CH },
    { g_gp.lo, g_gp.hi }, { g_ga.lo, g_ga.hi } };

  // Alle lees-/schrijfbare geheugengebieden (de heap), behalve de modules zelf en onze buffers.
  mach_vm_address_t addr = 0; mach_vm_size_t size = 0;
  uint64_t scanned = 0, regions = 0, unread = 0, cands = 0;
  for (;;) {
    vm_region_basic_info_data_64_t info; mach_msg_type_number_t cnt = VM_REGION_BASIC_INFO_COUNT_64; mach_port_t obj;
    if (mach_vm_region(mach_task_self(), &addr, &size, VM_REGION_BASIC_INFO_64, (vm_region_info_t)&info, &cnt, &obj) != KERN_SUCCESS) break;
    int rw = (info.protection & (VM_PROT_READ | VM_PROT_WRITE)) == (VM_PROT_READ | VM_PROT_WRITE);
    int skipme = 0;
    for (int s = 0; s < 4; s++) if (skip[s][1] && addr < skip[s][1] && addr + size > skip[s][0]) skipme = 1;
    if (rw && !skipme && size <= (1ull << 30)) {
      regions++;
      for (mach_vm_size_t off = 0; off < size; off += CH) {
        size_t want = (size - off) < CH ? (size_t)(size - off) : CH;
        if (!rd(addr + off, buf, want)) { unread += want; continue; }
        scanned += want;
        for (size_t i = 0; i + 8 <= want; i += 8) {
          uint64_t v = *(uint64_t *)(buf + i);
          if (v < g_gp.lo || v >= g_gp.hi || (v & 7)) continue;
          cands++;
          count_vt(v);
        }
      }
    }
    addr += size;
  }
  free(buf);
  outf(f, "Gescand: %.0f MB in %llu gebieden (%.0f MB onleesbaar), %llu kandidaten, %.1f s\n",
       scanned / 1048576.0, regions, unread / 1048576.0, cands, (now_ms() - t0) / 1000.0);

  // Alleen echte vtables tellen: [vt-8] moet naar een type_info wijzen waarvan de naam
  // leesbaar is. Sorteren op aantal; de grote klassen (personen) bovenaan.
  qsort(g_tab, TSIZE, sizeof(slot_t), by_count);
  outf(f, "\n== Klassen (top 120): aantal · offset-to-top · vtable-offset in game_plugin · naam ==\n");
  int shown = 0;
  for (uint32_t i = 0; i < TSIZE && shown < 120 && g_tab[i].count >= 20; i++) {
    uint64_t vt = g_tab[i].vt;
    int64_t ott = (int64_t)rd64(vt - 16);
    uint64_t ti = rd64(vt - 8);
    if (!ti) continue;
    uint64_t np = rd64(ti + 8);
    char mangled[256] = {0};
    if (!np || !rd(np, mangled, sizeof mangled - 1)) continue;
    mangled[sizeof mangled - 1] = 0;
    int ok = 1;
    for (char *c = mangled; *c; c++) if (*c < 32 || *c > 126) { ok = 0; break; }
    if (!ok || !mangled[0]) continue;
    int st = 0; char *dem = __cxa_demangle(mangled, NULL, NULL, &st);
    outf(f, "%10llu  %6lld  0x%08llx  %s\n", g_tab[i].count, (long long)-ott,
         (unsigned long long)(vt - g_gp.lo), st == 0 && dem ? dem : mangled);
    free(dem);
    shown++;
  }
  if (!shown) outf(f, "Geen klassen met leesbare naam gevonden (build zonder RTTI?) — volgende stap: offset-to-top-histogram.\n");
  outf(f, "\nKlaar in %.1f s.\n", (now_ms() - t0) / 1000.0);
  fclose(f);
}

static void *worker(void *arg) {
  (void)arg;
  for (;;) {
    sleep(2);
    struct stat st;
    if (stat(g_flag, &st) == 0) { unlink(g_flag); scan(); }
  }
  return NULL;
}

__attribute__((constructor)) static void fmss_probe_init(void) {
  g_home = getenv("HOME");
  snprintf(g_dir, sizeof g_dir, "%s/Library/Application Support/FMSuperScout", g_home ? g_home : "/tmp");
  mkdir(g_dir, 0755);
  snprintf(g_out, sizeof g_out, "%s/mac-probe.txt", g_dir);
  snprintf(g_flag, sizeof g_flag, "%s/mac-probe.flag", g_dir);
  FILE *f = fopen(g_out, "a");
  if (f) {
    char exe[1024] = {0}; uint32_t n = sizeof exe;
    _NSGetExecutablePath(exe, &n);
#if defined(__arm64__)
    const char *arch = "arm64";
#else
    const char *arch = "x86_64";
#endif
    outf(f, "FMSuperScout mac-probe geladen (%s) in: %s — pid %d, %ld\n", arch, exe, getpid(), (long)time(NULL));
    fclose(f);
  }
  pthread_t t; pthread_attr_t a; pthread_attr_init(&a); pthread_attr_setdetachstate(&a, PTHREAD_CREATE_DETACHED);
  pthread_create(&t, &a, worker, NULL);
}
