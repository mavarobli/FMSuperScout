// FMSuperScout-lader voor macOS.
//
// FMSuperScout.command start Football Manager met DYLD_INSERT_LIBRARIES naar deze lader. FM27
// staat dat toe (entitlements allow-dyld-environment-variables en disable-library-validation,
// gemeten met SIP aan, zie docs/macos.md). De lader start één eigen thread die de eigenlijke
// module (fmss_core.dylib, .NET NativeAOT) laadt en daarin fmss_run() aanroept. Meer doet hij
// niet: geen hooks, niets aan FM veranderd.
//
// Hulpprocessen die FM start (crashreporter, webweergave) erven de omgevingsvariabele; daar
// doet de lader niets, en hij haalt de variabele weg zodat ze hem niet doorgeven.
#include <dlfcn.h>
#include <limits.h>
#include <mach-o/dyld.h>
#include <pthread.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

static void logf_(const char *fmt, ...) {
  const char *home = getenv("HOME");
  if (!home) return;
  char dir[PATH_MAX], path[PATH_MAX];
  snprintf(dir, sizeof dir, "%s/Library/Application Support/FMSuperScout", home);
  mkdir(dir, 0755);
  snprintf(path, sizeof path, "%s/mac.log", dir);
  FILE *f = fopen(path, "a");
  if (!f) return;
  time_t t = time(NULL);
  char ts[32];
  strftime(ts, sizeof ts, "%Y-%m-%d %H:%M:%S", localtime(&t));
  fprintf(f, "%s LOADER ", ts);
  va_list ap;
  va_start(ap, fmt);
  vfprintf(f, fmt, ap);
  va_end(ap);
  fputc('\n', f);
  fclose(f);
}

static void *worker(void *arg) {
  (void)arg;
  // Pas laden als FM zelf is opgestart. De .NET-runtime zet bij het starten een eigen
  // signaalafhandeling neer (voor NullReferenceException) die doorgeeft aan wat er al stond.
  // Komt Unity's crashafhandeling ná ons, dan kan die de onze wegdrukken; daarom wachten.
  sleep(20);
  // De module staat naast de lader.
  Dl_info info;
  if (!dladdr((const void *)worker, &info) || !info.dli_fname) { logf_("eigen pad onbekend"); return NULL; }
  char core[PATH_MAX];
  snprintf(core, sizeof core, "%s", info.dli_fname);
  char *slash = strrchr(core, '/');
  if (!slash) return NULL;
  snprintf(slash + 1, sizeof core - (size_t)(slash + 1 - core), "fmss_core.dylib");

  void *h = dlopen(core, RTLD_NOW | RTLD_LOCAL);
  if (!h) { logf_("module niet geladen: %s", dlerror()); return NULL; }
  int (*run)(void) = (int (*)(void))dlsym(h, "fmss_run");
  if (!run) { logf_("fmss_run ontbreekt in %s", core); return NULL; }
  logf_("module geladen, start");
  int rc = run();   // keert alleen terug als de module stopt
  logf_("module gestopt (%d)", rc);
  return NULL;
}

__attribute__((constructor)) static void fmss_loader_init(void) {
  char exe[PATH_MAX];
  uint32_t n = sizeof exe;
  if (_NSGetExecutablePath(exe, &n) != 0) return;
  if (!strstr(exe, ".app/Contents/MacOS/Football Manager 2")) return;   // alleen FM zelf
  unsetenv("DYLD_INSERT_LIBRARIES");
  logf_("geladen in %s (pid %d)", strrchr(exe, '/') + 1, getpid());

  pthread_attr_t a;
  pthread_attr_init(&a);
  pthread_attr_setdetachstate(&a, PTHREAD_CREATE_DETACHED);
  pthread_attr_setstacksize(&a, 8u << 20);   // beheerde code: ruimer dan de standaard 512 KB
  pthread_t t;
  if (pthread_create(&t, &a, worker, NULL) != 0) logf_("thread niet gestart");
  pthread_attr_destroy(&a);
}
