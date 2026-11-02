using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace FMSuperScout;

/// <summary>
/// Het FM-proces dat gelezen wordt: het eigen proces (BepInEx-plugin, draait ín fm.exe)
/// of een extern fm.exe (scanner). Alleen leesrechten; er wordt nooit iets geschreven.
/// </summary>
internal sealed class GameProcess : IDisposable
{
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern nint OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern nint GetCurrentProcess();
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(nint h);

    private const uint PROCESS_VM_READ = 0x0010;
    private const uint PROCESS_QUERY_INFORMATION = 0x0400;
    private const uint PROCESS_DUP_HANDLE = 0x0040;
    private const uint PROCESS_CREATE_PROCESS = 0x0080;   // nodig voor de VA-kloon (PssCaptureSnapshot)

    public nint Handle { get; }
    public Process Process { get; }
    private readonly bool _own;

    private GameProcess(nint h, Process p, bool own) { Handle = h; Process = p; _own = own; }

    public static GameProcess Current() => new(GetCurrentProcess(), Process.GetCurrentProcess(), false);

    /// <summary>Open een extern FM-proces, alleen met leesrechten (least privilege).</summary>
    public static GameProcess Open(Process p)
    {
        nint h = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, false, p.Id);
        if (h == 0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), $"fm.exe (pid {p.Id}) niet te openen");
        return new(h, p, true);
    }

    /// <summary>
    /// Handle met kloonrechten voor PssCaptureSnapshot — alleen bij de snapshot-herkansing
    /// nodig, dus pas dan aangevraagd. 0 = niet gekregen. Eigen proces: de pseudo-handle.
    /// Een extern handle sluit de aanroeper (ReleaseCloneHandle) zodra de opname klaar is.
    /// </summary>
    public nint OpenCloneHandle() =>
        _own ? OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION | PROCESS_DUP_HANDLE | PROCESS_CREATE_PROCESS, false, Process.Id) : Handle;
    public void ReleaseCloneHandle(nint h) { if (_own && h != 0) CloseHandle(h); }

    public void Dispose() { if (_own) CloseHandle(Handle); }
}

/// <summary>
/// Windows-deel: ReadProcessMemory op het FM-proces (eigen of extern, zie GameProcess).
/// ReadProcessMemory doet de read in kernel-mode en geeft false terug bij een slecht adres —
/// dus volledig crash-veilig. Dit is dezelfde aanpak als externe FM-editors bewust gebruiken.
/// </summary>
internal sealed partial class MemScan
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
    private static extern bool CloseHandle(nint hObject);

    [DllImport("kernel32.dll")]
    private static extern nint GetCurrentProcess();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern unsafe bool ReadProcessMemory(nint hProcess, ulong lpBaseAddress,
        void* lpBuffer, nuint nSize, out nuint lpNumberOfBytesRead);

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
    private const uint PAGE_READWRITE = 0x04;
    private const uint PAGE_WRITECOPY = 0x08;
    private const uint PAGE_GUARD = 0x100;
    private const uint PAGE_NOACCESS = 0x01;

    // Leesbron: standaard het live proces (snel, geen extra geheugendruk). Op verzoek een
    // VA-kloon: bevroren copy-on-write-momentopname van de hele adresruimte. Alles wat FM
    // daarna vrijgeeft of herschrijft blijft in de kloon leesbaar — een consistent
    // point-in-time-beeld. De kloon kost wél commit-geheugen en vertraagt FM (elke write
    // wordt een pagina-kopie), dus hij is een herkansing voor als live lezen faalt, geen
    // standaardroute.
    private readonly GameProcess _game;
    private nint _proc;
    private nint _snap, _vaClone;
    public bool Snapshotted { get; private set; }

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

    /// <summary>Bovengrens voor het aantal parallelle leesthreads.</summary>
    public const int MaxWorkers = 8;

    /// <summary>Klassen worden op Windows aan hun vorm herkend: clubs via de teamvector.</summary>
    public bool ClubsByShape => true;

    public MemScan(GameProcess game, bool useSnapshot = false)
    {
        _game = game;
        _proc = game.Handle;
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
            nint cloneRights = _game.OpenCloneHandle();
            if (cloneRights == 0)
            {
                SnapshotError = $"geen kloonrechten op fm.exe (Win32 {Marshal.GetLastWin32Error()})";
                return;
            }
            uint rc;
            try { rc = PssCaptureSnapshot(cloneRights, PSS_CAPTURE_VA_CLONE, 0, out _snap); }
            finally { _game.ReleaseCloneHandle(cloneRights); }   // de kloon zelf leeft los van dit handle
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
    // NB PssFreeSnapshot: het eerste argument is het proces dat de snapshot-handle bevat —
    // dat zijn wijzelf (scanner of plugin), niet fm.exe.
    public void ReleaseSnapshot()
    {
        if (!Snapshotted) return;
        Snapshotted = false;
        _proc = _game.Handle;
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

    private void FindModules()
    {
        _game.Process.Refresh();   // modulelijst kan sinds de vorige scan gewijzigd zijn (game_plugin laadt laat)
        foreach (ProcessModule m in _game.Process.Modules)
        {
            ulong b = (ulong)m.BaseAddress.ToInt64();
            ulong e = b + (ulong)m.ModuleMemorySize;
            if (string.Equals(m.ModuleName, "GameAssembly.dll", StringComparison.OrdinalIgnoreCase))
            { GaBase = b; GaEnd = e; }
            else if (string.Equals(m.ModuleName, "game_plugin.dll", StringComparison.OrdinalIgnoreCase))
            { GpBase = b; GpEnd = e; GpPath = m.FileName; }
        }
        SetModuleBounds();
    }

    private unsafe bool ReadRaw(ulong addr, void* dst, int len)
    {
        if (addr == 0) return false;
        return ReadProcessMemory(_proc, addr, dst, (nuint)len, out var read) && (int)read == len;
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

    // Eén ObjClass per class-offset; de scan-threads delen de cache.
    private readonly ConcurrentDictionary<int, ObjClass> _classes = new();

    /// <summary>
    /// Klasse van het object met deze vtable, via MSVC's RTTI-meta: de int op meta+4 is de
    /// afstand van dit (persoons)deel tot het objectbegin, en die is per klasse vast. null =
    /// geen DB-object. Kind None met een Hist = ander DB-object (mogelijk een club).
    /// </summary>
    public ObjClass Classify(ulong vt, ulong p, Fields f)
    {
        int off = DynamicOffsetFromVtable(vt);
        if (off == 0) return null;
        if (_classes.TryGetValue(off, out var c)) return c;
        var kind = off == f.PLAYER_OFFSET || off == f.PLAYER_STAFF_OFFSET ? ObjKind.Player
                 : off == f.STAFF_OFFSET ? ObjKind.Staff
                 : off == f.HUMAN_MANAGER_OFFSET ? ObjKind.HumanManager
                 : ObjKind.None;
        return _classes.GetOrAdd(off, new ObjClass
        {
            Kind = kind, BlockOff = -off, PersonOff = 0, DbOff = 0, Exact = false,
            Hist = off is > 0 and < 0x2000 ? off : 0,
        });
    }

    /// <summary>Label van een histogram-sleutel in diagnostics.</summary>
    public string HistLabel(int key) => $"0x{key:X} ({key,5})";

    /// <summary>Platformspecifieke regels voor diagnostics (Windows: niets extra).</summary>
    public IEnumerable<string> ClassReport() => Array.Empty<string>();

    /// <summary>Versie van game_plugin.dll (bv. 27.0.x).</summary>
    public (string version, int major, int minor) GameVersionInfo()
    {
        if (string.IsNullOrEmpty(GpPath)) return (null, 0, 0);
        var fvi = FileVersionInfo.GetVersionInfo(GpPath);
        return (fvi.FileVersion, fvi.FileMajorPart, fvi.FileMinorPart);
    }
}
