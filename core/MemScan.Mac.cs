using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace FMSuperScout;

/// <summary>
/// Op de Mac draait de scan ín het FM-proces (de module wordt bij het starten meegeladen; een
/// externe lezer mag daar niet zonder SIP-aanpassing, zie docs/macos.md). Er is dus maar één
/// proces: het eigen.
/// </summary>
internal sealed class GameProcess : IDisposable
{
    public static GameProcess Current() => new();
    public void Dispose() { }
}

/// <summary>
/// Mac-deel: lezen via mach_vm_read_overwrite op de eigen task (geeft bij een ongeldig adres
/// een foutcode, crasht niet), regio's via mach_vm_region en de modulekaart via dyld.
///
/// Klassen worden herkend aan hun RTTI-naam (Itanium-ABI: offset-to-top op [vtable-16],
/// type_info op [vtable-8], naam op type_info+8). De scan neemt alleen het objectbegin
/// (offset-to-top 0); de veldblokken liggen per klasse op een vaste plek (gemeten, zie
/// docs/macos.md). Klassen die nog niet gemeten zijn, meet de scan zelf op aan het eerste
/// bruikbare exemplaar (<see cref="Calibrate"/>).
/// </summary>
internal sealed partial class MemScan
{
    private const string LibSystem = "/usr/lib/libSystem.B.dylib";

    [DllImport(LibSystem)]
    private static extern unsafe int mach_vm_read_overwrite(uint task, ulong address, ulong size, void* data, out ulong outsize);
    [DllImport(LibSystem)]
    private static extern unsafe int mach_vm_region(uint task, ref ulong address, ref ulong size, int flavor, int* info, ref uint count, out uint objectName);
    [DllImport(LibSystem)] private static extern uint _dyld_image_count();
    [DllImport(LibSystem)] private static extern nint _dyld_get_image_header(uint i);
    [DllImport(LibSystem)] private static extern nint _dyld_get_image_vmaddr_slide(uint i);
    [DllImport(LibSystem)] private static extern nint _dyld_get_image_name(uint i);

    private const int VM_REGION_BASIC_INFO_64 = 9;
    private const uint VM_REGION_BASIC_INFO_COUNT_64 = 9;
    private const int VM_PROT_READ = 1, VM_PROT_WRITE = 2;
    private const uint LC_SEGMENT_64 = 0x19;

    // mach_task_self() is in C een macro voor de globale variabele mach_task_self_.
    private static readonly uint Task = (uint)Marshal.ReadInt32(
        NativeLibrary.GetExport(NativeLibrary.Load(LibSystem), "mach_task_self_"));

    /// <summary>Bovengrens voor het aantal leesthreads: de reads zijn in-process al snel.</summary>
    public const int MaxWorkers = 4;

    public bool ClubsByShape => false;   // clubs komen als db::CLUB uit de klassenherkenning
    public bool Snapshotted => false;
    public long SnapshotMs => 0;
    public string SnapshotError { get; private set; }
    public string ImageNote => null;
    public void ReleaseSnapshot() { }

    /// <summary>Geen betrouwbare "vrij geheugen"-maat op macOS (de bestandscache telt als bezet): onbekend.</summary>
    public static (ulong availPhys, ulong availCommit, uint loadPct) MemoryStatus() => (0, 0, 0);

    private string _appPath;   // pad van het FM-programma (versie-terugval)

    public MemScan(GameProcess game, bool useSnapshot = false)
    {
        if (useSnapshot) SnapshotError = "geen momentopname op macOS";
        FindModules();
        BuildRegions();
    }

    private unsafe bool ReadRaw(ulong addr, void* dst, int len)
    {
        if (addr == 0) return false;
        return mach_vm_read_overwrite(Task, addr, (ulong)len, dst, out ulong n) == 0 && n == (ulong)len;
    }

    private unsafe void FindModules()
    {
        uint count = _dyld_image_count();
        for (uint i = 0; i < count; i++)
        {
            string name = Marshal.PtrToStringUTF8(_dyld_get_image_name(i));
            if (name == null) continue;
            if (i == 0) _appPath = name;
            bool gp = name.EndsWith("/game_plugin.bundle/Contents/MacOS/game_plugin", StringComparison.Ordinal);
            bool ga = name.EndsWith("/GameAssembly.dylib", StringComparison.Ordinal);
            if (!gp && !ga) continue;
            var (lo, hi) = ImageRange(_dyld_get_image_header(i), _dyld_get_image_vmaddr_slide(i));
            if (hi <= lo) continue;
            if (gp) { GpBase = lo; GpEnd = hi; GpPath = name; }
            else { GaBase = lo; GaEnd = hi; }
        }
        SetModuleBounds();
    }

    // Bereik van een geladen Mach-O-image: van het laagste tot het hoogste segment (+ slide).
    private unsafe (ulong lo, ulong hi) ImageRange(nint header, nint slide)
    {
        ulong lo = ulong.MaxValue, hi = 0;
        ulong h = (ulong)header;
        uint ncmds = U32(h + 16);
        ulong lc = h + 32;   // na mach_header_64
        byte* seg = stackalloc byte[16];   // segname: 16 bytes, niet altijd 0-afgesloten
        for (uint c = 0; c < ncmds && c < 512; c++)
        {
            uint cmd = U32(lc), size = U32(lc + 4);
            if (size < 8) break;
            if (cmd == LC_SEGMENT_64)
            {
                ReadRaw(lc + 8, seg, 16);
                bool pageZero = Marshal.PtrToStringUTF8((nint)seg, 16).TrimEnd('\0') == "__PAGEZERO";
                ulong vmaddr = Ptr(lc + 24), vmsize = Ptr(lc + 32);
                if (!pageZero && vmsize > 0)
                {
                    lo = System.Math.Min(lo, vmaddr + (ulong)slide);
                    hi = System.Math.Max(hi, vmaddr + (ulong)slide + vmsize);
                }
            }
            lc += size;
        }
        return lo == ulong.MaxValue ? (0, 0) : (lo, hi);
    }

    // Alle lees-/schrijfbare gebieden (de heap), behalve de twee modules zelf en onze eigen
    // leesbuffers. Grote gebieden (>1 GB) zijn reserveringen, geen objectgeheugen.
    private unsafe void BuildRegions()
    {
        List<(ulong lo, ulong hi)> own;
        lock (OwnBuffers) own = new(OwnBuffers);
        ulong addr = 0, size = 0;
        int* info = stackalloc int[16];
        for (int guard = 0; guard < 1_000_000; guard++)
        {
            uint cnt = VM_REGION_BASIC_INFO_COUNT_64;
            if (mach_vm_region(Task, ref addr, ref size, VM_REGION_BASIC_INFO_64, info, ref cnt, out _) != 0) break;
            int prot = info[0];
            bool rw = (prot & (VM_PROT_READ | VM_PROT_WRITE)) == (VM_PROT_READ | VM_PROT_WRITE);
            bool skip = Overlaps(addr, size, GpBase, GpEnd) || Overlaps(addr, size, GaBase, GaEnd);
            foreach (var (lo, hi) in own) skip |= Overlaps(addr, size, lo, hi);
            if (rw && !skip && size <= (1UL << 30)) ScanRegions.Add((addr, size));
            addr += size;
        }
    }

    private static bool Overlaps(ulong a, ulong size, ulong lo, ulong hi) => hi > lo && a < hi && a + size > lo;

    // ---------- klassen ----------

    // Gemeten op dezelfde save als Windows (2 november 2026, docs/macos.md). Offsets t.o.v.
    // het objectbegin; PersonOff = persoonsfacet − 0x30, zodat de PERO_*-offsets uit Fields
    // ongewijzigd gelden.
    private static readonly Dictionary<string, (ObjKind kind, long block, long person, long db)> Measured = new()
    {
        ["db::ACTUAL_PLAYER"] = (ObjKind.Player, -8, 0x278 - 0x30, 0x388),
        ["db::ACTUAL_NON_PLAYER"] = (ObjKind.Staff, 0, 0xF8 - 0x30, 0x208),
    };
    // Klassen met "PLAYER" in de naam die géén persoon zijn (of niet meetellen, zoals op Windows).
    private static readonly HashSet<string> NotPersons = new()
    {
        "db::VIRTUAL_PLAYER", "db::PLAYING_DATA", "db::NON_PLAYING_DATA", "db::INTERNATIONAL_PLAYER_DATA",
    };

    private sealed class MacClass
    {
        public string Name;
        public int Id;
        public ObjClass Cls;          // null = geen (bruikbaar) DB-object
        public volatile bool Pending; // nog op te meten aan een exemplaar
        public int Tries;
        public string Calibration;    // uitkomst van de zelfmeting (diagnostics)
        public long Seen;
    }

    // Sleutel = vtable − GpBase: zo staat er nergens een game_plugin-adres op onze eigen heap,
    // die de scan (in hetzelfde proces) ook doorloopt.
    private readonly ConcurrentDictionary<ulong, MacClass> _byVt = new();
    private readonly ConcurrentDictionary<string, MacClass> _byName = new();
    private readonly List<MacClass> _ids = new();
    private static readonly MacClass Nothing = new() { Name = "-" };

    public ObjClass Classify(ulong vt, ulong p, Fields f)
    {
        if (!InGp(vt)) return null;
        ulong key = vt - GpBase;
        if (!_byVt.TryGetValue(key, out var mc)) mc = _byVt.GetOrAdd(key, Resolve(vt));
        if (mc == Nothing) return null;
        Interlocked.Increment(ref mc.Seen);
        if (mc.Pending)
            lock (mc) if (mc.Pending) Calibrate(mc, p, f);
        return mc.Cls;
    }

    private MacClass Resolve(ulong vt)
    {
        if (I64(vt - 16) != 0) return Nothing;           // secundaire vtable: niet het objectbegin
        string name = ClassNameOf(vt);
        if (name == null) return Nothing;
        // Eén MacClass per naam (meerdere vtables kunnen dezelfde klasse opleveren); onder slot,
        // zodat twee threads niet elk een eigen exemplaar met een eigen id aanmaken.
        lock (_ids)
        {
            if (_byName.TryGetValue(name, out var known)) return known;
            var mc = new MacClass { Name = name, Id = _ids.Count + 1 };
            var hist = new ObjClass { Kind = ObjKind.None, Hist = mc.Id };
            if (Measured.TryGetValue(name, out var m))
            {
                mc.Cls = new ObjClass { Kind = m.kind, BlockOff = m.block, PersonOff = m.person, DbOff = m.db, Hist = mc.Id, Exact = true };
                mc.Pending = true;                       // ook meten: controle van de meetmethode
            }
            else if (name == "db::CLUB") mc.Cls = new ObjClass { Kind = ObjKind.Club, Hist = mc.Id, Exact = true };
            // Overige echte personen (speler-staf, menselijke manager): zelf opmeten. Alleen
            // ACTUAL_/HUMAN_-klassen; andere "PLAYER"-klassen telden op Windows ook niet mee.
            else if (name.StartsWith("db::", StringComparison.Ordinal) && name.Contains("PLAYER")
                     && (name.Contains("ACTUAL") || name.Contains("HUMAN")) && !NotPersons.Contains(name))
            { mc.Cls = hist; mc.Pending = true; }
            else mc.Cls = hist;
            _ids.Add(mc);
            _byName[name] = mc;
            return mc;
        }
    }

    // Klassenaam bij een vtable: [vt-8] = type_info, [type_info+8] = gemangelde naam
    // ("N2db13ACTUAL_PLAYERE" → "db::ACTUAL_PLAYER"). Op arm64 kan het hoogste bit van de
    // naampointer een vlag zijn (niet-unieke RTTI); dat maskeren we weg.
    private string ClassNameOf(ulong vt)
    {
        ulong ti = Ptr(vt - 8);
        if (ti == 0) return null;
        ulong np = Ptr(ti + 8) & 0x7FFF_FFFF_FFFF_FFFFUL;
        return Demangle(CStr(np, 128));
    }

    private string ClassNameOfObject(ulong obj)
    {
        ulong vt = Ptr(obj);
        return InGp(vt) ? ClassNameOf(vt) : null;
    }

    // Alleen de eenvoudige vormen die DB-klassen hebben: "13ACTUAL_PLAYER" of "N2db13ACTUAL_PLAYERE".
    internal static string Demangle(string m)
    {
        if (string.IsNullOrEmpty(m)) return null;
        int i = 0;
        bool nested = m[0] == 'N';
        if (nested) i++;
        var parts = new List<string>();
        while (i < m.Length && char.IsAsciiDigit(m[i]))
        {
            int len = 0;
            while (i < m.Length && char.IsAsciiDigit(m[i])) len = len * 10 + (m[i++] - '0');
            if (len <= 0 || len > 200 || i + len > m.Length) return null;
            parts.Add(m.Substring(i, len));
            i += len;
        }
        if (parts.Count == 0 || (nested && (i >= m.Length || m[i++] != 'E'))) return null;
        return i == m.Length ? string.Join("::", parts) : null;
    }

    /// <summary>
    /// Zelfmeting aan één exemplaar (objectbegin s): zoek de deelobjecten (een vtable met
    /// offset-to-top −o en dezelfde type_info), het persoonsfacet (zijn contractpointer wijst
    /// naar een db::FULL_CONTRACT) en de DB-basis (het laatste deelobject, met een UID). Het
    /// speler- of stafblok staat vooraan, zoals bij de gemeten klassen. Voor gemeten klassen
    /// alleen ter controle (diagnostics); voor de rest bepaalt dit de layout.
    /// </summary>
    private unsafe void Calibrate(MacClass mc, ulong s, Fields f)
    {
        if (++mc.Tries > 50) { mc.Pending = false; mc.Calibration ??= "niet gelukt na 50 exemplaren"; return; }
        ulong ti = Ptr(Ptr(s) - 8);
        const int span = 0x1000;
        byte* obj = stackalloc byte[span];
        int len = span;
        while (len >= 0x100 && !ReadRaw(s, obj, len)) len /= 2;
        if (len < 0x100) return;

        var subs = new List<long>();
        for (int o = 8; o + 8 <= len; o += 8)
        {
            ulong v = *(ulong*)(obj + o);
            if (InGp(v) && I64(v - 16) == -o && Ptr(v - 8) == ti) subs.Add(o);
        }
        // Kopie wissen: de scan loopt ook langs onze eigen stack en zou het object anders
        // daar nog een keer vinden.
        new Span<byte>(obj, len).Clear();
        long facet = -1;
        foreach (long o in subs)
        {
            ulong con = Ptr(s + (ulong)o + f.PERO_FULL_CONTRACT - 0x30);
            if (con != 0 && ClassNameOfObject(con) == "db::FULL_CONTRACT") { facet = o; break; }
        }
        long db = subs.Count > 0 ? subs[^1] : -1;
        if (facet < 0 || db <= facet) return;            // dit exemplaar zegt niets: volgende
        uint uid = U32(s + (ulong)db + f.OBJ_DUNI);
        if (uid == 0 || uid == 0xFFFFFFFF) return;

        string found = $"facet 0x{facet:X}, DB 0x{db:X} (deelobjecten {string.Join(", ", subs.Select(x => $"0x{x:X}"))})";
        if (mc.Cls.Exact)
        {
            bool ok = mc.Cls.PersonOff == facet - 0x30 && mc.Cls.DbOff == db;
            mc.Calibration = found + (ok ? " = gemeten ✓" : $" ≠ gemeten (facet 0x{mc.Cls.PersonOff + 0x30:X}, DB 0x{mc.Cls.DbOff:X})");
            mc.Pending = false;
            return;
        }
        var cls = new ObjClass { PersonOff = facet - 0x30, DbOff = db, Hist = mc.Id, Exact = true };
        static bool Plausible(ushort ca, ushort pa) => ca is >= 1 and <= 200 && pa is >= 1 and <= 200;
        if (mc.Name.Contains("HUMAN"))
        { cls.Kind = ObjKind.HumanManager; cls.BlockOff = 0; }
        else if (Plausible(U16(s - 8 + f.PLAO_CA), U16(s - 8 + f.PLAO_PA)))
        { cls.Kind = ObjKind.Player; cls.BlockOff = -8; }
        else if (Plausible(U16(s + f.NPLO_CA), U16(s + f.NPLO_PA)))
        { cls.Kind = ObjKind.Staff; cls.BlockOff = 0; }
        else { mc.Calibration = found + " — geen speler- of stafblok vooraan"; mc.Pending = false; return; }
        mc.Calibration = found + $" → {cls.Kind}";
        mc.Cls = cls;          // eerst de layout, dan pas Pending uit: andere threads lezen zonder slot
        mc.Pending = false;
    }

    public string HistLabel(int key)
    {
        lock (_ids) return key >= 1 && key <= _ids.Count ? _ids[key - 1].Name : $"#{key}";
    }

    /// <summary>Herkende klassen met hun layout en de uitkomst van de zelfmeting.</summary>
    public IEnumerable<string> ClassReport()
    {
        List<MacClass> all;
        lock (_ids) all = new(_ids);
        yield return "=== Mac: persoonsklassen (RTTI) ===";
        foreach (var mc in all.Where(x => x.Name.Contains("PLAYER") || x.Name == "db::CLUB").OrderByDescending(x => x.Seen))
        {
            var c = mc.Cls;
            string layout = c == null || c.Kind == ObjKind.None ? "niet gebruikt"
                : c.Kind == ObjKind.Club ? "club"
                : $"{c.Kind}: blok {c.BlockOff:+0;-0}, persoon +0x{c.PersonOff:X}, DB +0x{c.DbOff:X}";
            yield return $"  {mc.Name,-34} {mc.Seen,8:N0}×  {layout}" + (mc.Calibration != null ? $"  · meting: {mc.Calibration}" : "");
        }
        yield return "";
    }

    /// <summary>
    /// Versie uit de Info.plist van game_plugin.bundle, anders die van fm.app; lukt beide niet,
    /// dan de hoofdversie uit de programmanaam ("Football Manager 27"), met onbekende minor.
    /// </summary>
    public (string version, int major, int minor) GameVersionInfo()
    {
        foreach (string exe in new[] { GpPath, _appPath })
        {
            if (string.IsNullOrEmpty(exe)) continue;
            try
            {
                string plist = Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(exe)), "Info.plist");
                if (!File.Exists(plist)) continue;
                string xml = File.ReadAllText(plist);
                foreach (string key in new[] { "CFBundleShortVersionString", "CFBundleVersion" })
                {
                    var m = Regex.Match(xml, $@"<key>{key}</key>\s*<string>\s*(\d+)\.(\d+)[^<]*</string>");
                    if (m.Success && int.Parse(m.Groups[1].Value) >= 20)
                        return (m.Value[(m.Value.IndexOf("<string>") + 8)..m.Value.IndexOf("</string>")].Trim(),
                                int.Parse(m.Groups[1].Value), int.Parse(m.Groups[2].Value));
                }
            }
            catch { }
        }
        var n = Regex.Match(_appPath ?? "", @"Football Manager (\d{2})");
        return n.Success ? ($"{n.Groups[1].Value} (versie onbekend)", int.Parse(n.Groups[1].Value), -1) : (null, 0, 0);
    }
}
