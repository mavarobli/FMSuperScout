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
    private static extern ulong VirtualQuery(ulong lpAddress, out MEMORY_BASIC_INFORMATION lpBuffer, ulong dwLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern nint GetCurrentProcess();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool ReadProcessMemory(nint hProcess, ulong lpBaseAddress,
        byte[] lpBuffer, nuint nSize, out nuint lpNumberOfBytesRead);

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

    private readonly nint _proc = GetCurrentProcess();

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

    public MemScan()
    {
        BuildRegions();
        FindModules();
        _gp = ReadImage(GpBase, GpEnd);
        _ga = ReadImage(GaBase, GaEnd);
    }

    private byte[] ReadImage(ulong start, ulong end)
    {
        if (start == 0 || end <= start) return null;
        int len = (int)(end - start);
        var img = new byte[len];
        const int chunk = 8 * 1024 * 1024;
        var tmp = new byte[chunk];
        int done = 0;
        while (done < len)
        {
            int want = System.Math.Min(chunk, len - done);
            if (ReadBlock(start + (ulong)done, tmp, want))
                System.Array.Copy(tmp, 0, img, done, want);
            // bij een gat blijft die sectie 0 — prima voor onze read-checks
            done += want;
        }
        return img;
    }

    // Snelle image-reads (buiten bereik → 0).
    private ulong ImgPtr(ulong addr)
    {
        if (_gp != null && addr >= GpBase && addr + 8 <= GpEnd) return BitConverter.ToUInt64(_gp, (int)(addr - GpBase));
        if (_ga != null && addr >= GaBase && addr + 8 <= GaEnd) return BitConverter.ToUInt64(_ga, (int)(addr - GaBase));
        return Ptr(addr); // fallback via RPM
    }
    private int ImgI32(ulong addr)
    {
        if (_gp != null && addr >= GpBase && addr + 4 <= GpEnd) return BitConverter.ToInt32(_gp, (int)(addr - GpBase));
        if (_ga != null && addr >= GaBase && addr + 4 <= GaEnd) return BitConverter.ToInt32(_ga, (int)(addr - GaBase));
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
            if (VirtualQuery(addr, out var mbi, (ulong)Marshal.SizeOf<MEMORY_BASIC_INFORMATION>()) == 0)
                break;
            if (mbi.RegionSize == 0) break;
            if (IsScannable(mbi) && mbi.RegionSize <= 512UL * 1024 * 1024)
                ScanRegions.Add((mbi.BaseAddress, mbi.RegionSize));
            addr = mbi.BaseAddress + mbi.RegionSize;
        }
    }

    // Alle geladen module-ranges (voor de vtable-check), gesorteerd op start.
    private (ulong start, ulong end)[] _mods = System.Array.Empty<(ulong, ulong)>();

    private void FindModules()
    {
        var list = new List<(ulong, ulong)>();
        foreach (ProcessModule m in Process.GetCurrentProcess().Modules)
        {
            ulong b = (ulong)m.BaseAddress.ToInt64();
            ulong e = b + (ulong)m.ModuleMemorySize;
            list.Add((b, e));
            if (string.Equals(m.ModuleName, "GameAssembly.dll", StringComparison.OrdinalIgnoreCase))
            { GaBase = b; GaEnd = e; }
            else if (string.Equals(m.ModuleName, "game_plugin.dll", StringComparison.OrdinalIgnoreCase))
            { GpBase = b; GpEnd = e; GpPath = m.FileName; }
        }
        list.Sort((a, b) => a.Item1.CompareTo(b.Item1));
        _mods = list.ToArray();
    }

    public bool InGa(ulong addr) => addr >= GaBase && addr < GaEnd;
    public bool InGp(ulong addr) => GpBase != 0 && addr >= GpBase && addr < GpEnd;

    /// <summary>Ligt dit adres in een geladen module (mogelijke vtable)?</summary>
    public bool IsVtable(ulong addr)
    {
        int lo = 0, hi = _mods.Length - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            if (addr < _mods[mid].start) hi = mid - 1;
            else if (addr >= _mods[mid].end) lo = mid + 1;
            else return true;
        }
        return false;
    }

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
