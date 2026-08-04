using System.Diagnostics;
using System.Runtime.InteropServices;

namespace FMSuperScout;

/// <summary>
/// Geheugentoegang via ReadProcessMemory op ONS EIGEN proces.
/// Belangrijk: rauwe pointer-derefs (*(ulong*)p) crashen de game onherstelbaar
/// bij één ongeldig adres (access violation, niet op te vangen in .NET).
/// ReadProcessMemory doet de read in kernel-mode en geeft false terug bij een
/// slecht adres — dus volledig crash-veilig. Dit is dezelfde aanpak als
/// externe FM-editors bewust gebruiken.
/// </summary>
internal sealed class MemScan
{
    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORY_BASIC_INFORMATION
    {
        public ulong BaseAddress;
        public ulong AllocationBase;
        public uint AllocationProtect;
        public uint __alignment1;
        public ulong RegionSize;
        public uint State;
        public uint Protect;
        public uint Type;
        public uint __alignment2;
    }

    [DllImport("kernel32.dll")]
    private static extern ulong VirtualQueryEx(nint hProcess, ulong lpAddress, out MEMORY_BASIC_INFORMATION lpBuffer, ulong dwLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern nint GetCurrentProcess();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(nint hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool ReadProcessMemory(nint hProcess, ulong lpBaseAddress,
        byte[] lpBuffer, nuint nSize, out nuint lpNumberOfBytesRead);

    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile,
                     ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
    }
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    /// <summary>
    /// Vrij fysiek geheugen, vrije commit (RAM+pagefile) en belasting (%). Stuurt de
    /// adaptieve keuzes (workers, image-cache) en gaat mee in log + diagnostics, zodat
    /// leesproblemen op krappe machines in het veld te herleiden zijn.
    /// </summary>
    public static (ulong availPhys, ulong availCommit, uint loadPct) MemoryStatus()
    {
        try
        {
            var ms = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref ms)) return (ms.ullAvailPhys, ms.ullAvailPageFile, ms.dwMemoryLoad);
        }
        catch { }
        return (0, 0, 0);
    }

    // Process Snapshotting API (Win 8.1+): copy-on-write kloon van de eigen adresruimte.
    [DllImport("kernel32.dll")]
    private static extern uint PssCaptureSnapshot(nint processHandle, uint captureFlags, uint threadContextFlags, out nint snapshotHandle);
    [DllImport("kernel32.dll")]
    private static extern uint PssQuerySnapshot(nint snapshotHandle, uint informationClass, out nint buffer, uint bufferLength);
    [DllImport("kernel32.dll")]
    private static extern uint PssFreeSnapshot(nint processHandle, nint snapshotHandle);
    private const uint PSS_CAPTURE_VA_CLONE = 0x00000001;
    private const uint PSS_QUERY_VA_CLONE_INFORMATION = 1;

    private const uint MEM_COMMIT = 0x1000;
    private const uint MEM_PRIVATE = 0x20000;
    private const uint PAGE_READONLY = 0x02;
    private const uint PAGE_READWRITE = 0x04;
    private const uint PAGE_WRITECOPY = 0x08;
    private const uint PAGE_EXECUTE_READ = 0x20;
    private const uint PAGE_EXECUTE_READWRITE = 0x40;
    private const uint PAGE_EXECUTE_WRITECOPY = 0x80;
    private const uint PAGE_GUARD = 0x100;
    private const uint PAGE_NOACCESS = 0x01;

    // Leesbron: standaard het live proces (snel, geen extra geheugendruk). Op verzoek een
    // VA-kloon: bevroren copy-on-write-momentopname van de hele adresruimte. Alles wat FM
    // daarna vrijgeeft of herschrijft blijft in de kloon leesbaar — een consistent
    // point-in-time-beeld. De kloon kost wél commit-geheugen en vertraagt FM (elke write
    // wordt een pagina-kopie), dus hij is een herkansing voor als live lezen faalt, geen
    // standaardroute.
    private nint _proc = GetCurrentProcess();
    private nint _snap, _vaClone;
    public bool Snapshotted { get; private set; }

    // Regio's om te scannen naar person-objecten: private + committed + read-write (de GC-heap).
    public readonly List<(ulong start, ulong size)> ScanRegions = new();

    public ulong GaBase { get; private set; }   // GameAssembly.dll (Unity/C#-laag)
    public ulong GaEnd { get; private set; }
    public ulong GpBase { get; private set; }   // game_plugin.dll (native C++ database — hier leven person-objecten)
    public ulong GpEnd { get; private set; }
    public string GpPath { get; private set; }  // bestandspad van game_plugin.dll (voor versiedetectie)

    [ThreadStatic] private static byte[] _tls;
    private static byte[] Tls => _tls ??= new byte[16];

    // Gecachte module-images voor snelle vtable/meta-resolutie zonder syscall per kandidaat.
    private byte[] _gp;   // game_plugin.dll
    private byte[] _ga;   // GameAssembly.dll

    // Herbruikbare image-buffers over scans heen. Elke scan vers alloceren (±550 MB samen)
    // liet de Large Object Heap per scan groeien/fragmenteren — de commit-charge van het
    // FM-proces liep op en precies op krappe machines mondde dat uit in Win32 1450 bij de
    // snapshot of onleesbare pagina's bij live lezen. Modulegroottes liggen per sessie vast,
    // dus de arrays zijn perfect herbruikbaar.
    private static byte[] _gpPool, _gaPool;

    /// <summary>Gezet als de image-cache bewust is overgeslagen (weinig vrij geheugen) — voor de log.</summary>
    public string ImageNote { get; private set; }

    /// <summary>Duur van de snapshot-opname in ms (alleen relevant als erom gevraagd is).</summary>
    public long SnapshotMs { get; private set; }

    public MemScan(bool useSnapshot = false)
    {
        if (useSnapshot) TrySnapshot();   // zet _proc op de kloon; regio's en reads gaan dan uit de momentopname
        BuildRegions();
        FindModules();      // moduleadressen zijn identiek in de kloon
        _gp = CacheImage(ref _gpPool, GpBase, GpEnd, "game_plugin.dll");
        _ga = CacheImage(ref _gaPool, GaBase, GaEnd, "GameAssembly.dll");
    }

    /// <summary>Waarom de snapshot niet lukte (leeg = wél gelukt). Gaat mee in de log en diagnostics.</summary>
    public string SnapshotError { get; private set; }

    private void TrySnapshot()
    {
        var sw = Stopwatch.StartNew();
        try
        {
            uint rc = PssCaptureSnapshot(GetCurrentProcess(), PSS_CAPTURE_VA_CLONE, 0, out _snap);
            if (rc != 0)
            {
                // Win32-code meelogen: 8 = ONOUGH_MEMORY, 1455 = COMMITMENT_LIMIT, 5 = ACCESS_DENIED.
                // Zonder deze code is een mislukte snapshot in het veld niet te diagnosticeren.
                SnapshotError = $"PssCaptureSnapshot faalde (Win32 {rc}: {new System.ComponentModel.Win32Exception((int)rc).Message})";
                _snap = 0;
                return;
            }
            if (PssQuerySnapshot(_snap, PSS_QUERY_VA_CLONE_INFORMATION, out nint clone, (uint)IntPtr.Size) is uint qrc && (qrc != 0 || clone == 0))
            {
                SnapshotError = $"PssQuerySnapshot faalde (Win32 {qrc})";
                PssFreeSnapshot(GetCurrentProcess(), _snap); _snap = 0;
                return;
            }
            _vaClone = clone;
            _proc = clone;
            Snapshotted = true;
        }
        catch (System.Exception e)
        {
            SnapshotError = "uitzondering: " + e.Message;   // fallback: live lezen
        }
        finally { SnapshotMs = sw.ElapsedMilliseconds; }
    }

    /// <summary>
    /// Kloon vrijgeven zodra de scan klaar is: zolang hij leeft kost elke pagina die FM
    /// wijzigt een copy-on-write-kopie. Reads vallen daarna terug op het live proces,
    /// zodat een nakomende lezer nooit tegen een dichte handle aanloopt.
    /// </summary>
    public void ReleaseSnapshot()
    {
        if (!Snapshotted) return;
        Snapshotted = false;
        _proc = GetCurrentProcess();
        try { CloseHandle(_vaClone); } catch { }
        try { PssFreeSnapshot(GetCurrentProcess(), _snap); } catch { }
        _vaClone = 0; _snap = 0;
    }

    private byte[] CacheImage(ref byte[] pool, ulong start, ulong end, string name)
    {
        if (start == 0 || end <= start) return null;
        ulong len64 = end - start;
        if (len64 > int.MaxValue) return null;
        int len = (int)len64;
        if (pool == null || pool.Length != len)
        {
            // Krap aan vrij fysiek geheugen? Cache overslaan: ImgPtr/ImgI32 vallen dan
            // terug op losse reads — trager, maar de allocatie zelf verergert de
            // geheugendruk niet en de scan blijft werken (elke Windows-pc).
            var (availPhys, _, _) = MemoryStatus();
            if (availPhys != 0 && (ulong)len * 2 > availPhys)
            {
                ImageNote = $"image-cache {name} ({len / (1024 * 1024)} MB) overgeslagen: maar {availPhys / (1024 * 1024)} MB fysiek vrij — scan gebruikt losse reads (trager)";
                return null;
            }
            try { pool = new byte[len]; }
            catch (System.OutOfMemoryException)
            {
                ImageNote = $"image-cache {name} ({len / (1024 * 1024)} MB) niet gealloceerd (OutOfMemory) — scan gebruikt losse reads (trager)";
                return null;
            }
        }
        const int chunk = 8 * 1024 * 1024;
        var tmp = new byte[chunk];
        int done = 0;
        while (done < len)
        {
            int want = System.Math.Min(chunk, len - done);
            if (ReadBlock(start + (ulong)done, tmp, want))
                System.Array.Copy(tmp, 0, pool, done, want);
            else
                System.Array.Clear(pool, done, want);   // hergebruikte buffer: gat expliciet nullen
            done += want;
        }
        return pool;
    }

    // Snelle image-reads (buiten bereik → 0).
    // Bounds via (addr - base) i.p.v. (addr + 8 <= end): bij een corrupte meta-pointer
    // rond ulong.MaxValue wrapte addr+8 om, waardoor de check onterecht slaagde en de
    // (int)-cast een negatieve index opleverde → BitConverter-crash 'startIndex', die de
    // hele dump om zeep hielp (issue #16). addr >= base garandeert dat addr-base niet
    // wrapt, en de vergelijking met de arraylengte kan daarna niet meer overlopen.
    private ulong ImgPtr(ulong addr)
    {
        if (_gp != null && addr >= GpBase && addr - GpBase + 8 <= (ulong)_gp.Length) return BitConverter.ToUInt64(_gp, (int)(addr - GpBase));
        if (_ga != null && addr >= GaBase && addr - GaBase + 8 <= (ulong)_ga.Length) return BitConverter.ToUInt64(_ga, (int)(addr - GaBase));
        return Ptr(addr); // fallback via RPM
    }
    private int ImgI32(ulong addr)
    {
        if (_gp != null && addr >= GpBase && addr - GpBase + 4 <= (ulong)_gp.Length) return BitConverter.ToInt32(_gp, (int)(addr - GpBase));
        if (_ga != null && addr >= GaBase && addr - GaBase + 4 <= (ulong)_ga.Length) return BitConverter.ToInt32(_ga, (int)(addr - GaBase));
        return I32(addr);
    }

    private static bool IsReadable(uint protect)
    {
        if ((protect & PAGE_GUARD) != 0) return false;
        if ((protect & PAGE_NOACCESS) != 0) return false;
        return (protect & (PAGE_READONLY | PAGE_READWRITE | PAGE_WRITECOPY |
                           PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY)) != 0;
    }

    private static bool IsScannable(in MEMORY_BASIC_INFORMATION m)
    {
        if (m.State != MEM_COMMIT) return false;
        if ((m.Protect & PAGE_GUARD) != 0 || (m.Protect & PAGE_NOACCESS) != 0) return false;
        // Person-objecten leven in de private read/write GC-heap. Beperk hiertoe:
        // dit vermijdt image-, mapped- en code-regio's die traag/gevaarlijk zijn.
        if (m.Type != MEM_PRIVATE) return false;
        return (m.Protect & (PAGE_READWRITE | PAGE_WRITECOPY)) != 0;
    }

    private void BuildRegions()
    {
        ulong addr = 0x10000;
        ulong max = 0x7FFFFFFFFFFF;
        int guard = 0;
        while (addr < max && guard++ < 2_000_000)
        {
            if (VirtualQueryEx(_proc, addr, out var mbi, (ulong)Marshal.SizeOf<MEMORY_BASIC_INFORMATION>()) == 0)
                break;
            if (mbi.RegionSize == 0) break;
            if (IsScannable(mbi) && mbi.RegionSize <= 512UL * 1024 * 1024)
                ScanRegions.Add((mbi.BaseAddress, mbi.RegionSize));
            addr = mbi.BaseAddress + mbi.RegionSize;
        }
    }

    // Snelle onder-/bovengrens die precies de twee modules omspant waar person-/DB-objecten
    // hun vtable hebben (game_plugin + GameAssembly). Verreweg de meeste 8-byte-woorden in de
    // heap zijn kleine getallen (nullen, tellers) die ver onder _loMod liggen → in de scan-
    // hotloop in één vergelijking weg, vóór de precieze InGp/InGa-check.
    private ulong _loMod, _hiMod;

    private void FindModules()
    {
        foreach (ProcessModule m in Process.GetCurrentProcess().Modules)
        {
            ulong b = (ulong)m.BaseAddress.ToInt64();
            ulong e = b + (ulong)m.ModuleMemorySize;
            if (string.Equals(m.ModuleName, "GameAssembly.dll", StringComparison.OrdinalIgnoreCase))
            { GaBase = b; GaEnd = e; }
            else if (string.Equals(m.ModuleName, "game_plugin.dll", StringComparison.OrdinalIgnoreCase))
            { GpBase = b; GpEnd = e; GpPath = m.FileName; }
        }
        // Grenzen over {game_plugin, GameAssembly}; de niet-gevonden module telt niet mee.
        ulong lo = ulong.MaxValue, hi = 0;
        if (GpBase != 0) { lo = System.Math.Min(lo, GpBase); hi = System.Math.Max(hi, GpEnd); }
        if (GaBase != 0) { lo = System.Math.Min(lo, GaBase); hi = System.Math.Max(hi, GaEnd); }
        _loMod = lo == ulong.MaxValue ? 0 : lo;
        _hiMod = hi;
    }

    public bool InGa(ulong addr) => addr >= GaBase && addr < GaEnd;
    public bool InGp(ulong addr) => GpBase != 0 && addr >= GpBase && addr < GpEnd;
    // Grenzen voor de inline snelle afwijzing in de scan-hotloop.
    public ulong ModLo => _loMod;
    public ulong ModHi => _hiMod;

    /// <summary>Leest een heel blok. Geeft false bij ongeldig adres (crasht nooit).</summary>
    public bool ReadBlock(ulong addr, byte[] buf, int len)
    {
        if (addr == 0) return false;
        return ReadProcessMemory(_proc, addr, buf, (nuint)len, out var read) && (int)read == len;
    }

    // Veilige typed reads.
    public ulong Ptr(ulong a)
    {
        var b = Tls;
        return ReadBlock(a, b, 8) ? BitConverter.ToUInt64(b, 0) : 0UL;
    }
    public uint U32(ulong a)
    {
        var b = Tls;
        return ReadBlock(a, b, 4) ? BitConverter.ToUInt32(b, 0) : 0U;
    }
    public int I32(ulong a)
    {
        var b = Tls;
        return ReadBlock(a, b, 4) ? BitConverter.ToInt32(b, 0) : 0;
    }
    public ushort U16(ulong a)
    {
        var b = Tls;
        return ReadBlock(a, b, 2) ? BitConverter.ToUInt16(b, 0) : (ushort)0;
    }
    public byte U8(ulong a)
    {
        var b = Tls;
        return ReadBlock(a, b, 1) ? b[0] : (byte)0;
    }

    /// <summary>Genest FM-stringpatroon: [addr]→outer, [outer]→inner, UTF-8 string op inner+4.</summary>
    public string NestedString(ulong addr, int maxLen = 128)
    {
        ulong outer = Ptr(addr);
        if (outer == 0) return null;
        ulong inner = Ptr(outer);
        if (inner == 0) return null;
        return CStr(inner + 4, maxLen);
    }

    /// <summary>Indirecte FM-string: [addr]→ptr, UTF-8 string op ptr+4.</summary>
    public string IndirectString(ulong addr, int maxLen = 128)
    {
        ulong p = Ptr(addr);
        if (p == 0) return null;
        return CStr(p + 4, maxLen);
    }

    public string CStr(ulong addr, int maxLen)
    {
        var buf = new byte[maxLen];
        if (!ReadBlock(addr, buf, maxLen))
        {
            // Fallback: lees korter (adres kan vlak bij regio-einde liggen).
            int shorter = 32;
            buf = new byte[shorter];
            if (!ReadBlock(addr, buf, shorter)) return null;
            maxLen = shorter;
        }
        int n = 0;
        while (n < maxLen && buf[n] != 0) n++;
        if (n == 0) return null;
        var s = System.Text.Encoding.UTF8.GetString(buf, 0, n).Trim();
        return s.Length == 0 ? null : s;
    }

    /// <summary>
    /// Meta-offset-truc: meta=[vtable-8]; return int32 op meta+4. Vtable is al bekend
    /// (uit de scanbuffer), dus we hoeven [person] niet opnieuw te lezen. Volledig uit
    /// de gecachte module-images → geen syscall.
    /// </summary>
    public int DynamicOffsetFromVtable(ulong vtable)
    {
        ulong meta = ImgPtr(vtable - 8);
        if (meta == 0) return 0;
        return ImgI32(meta + 4);
    }
}
