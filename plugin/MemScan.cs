using System.Diagnostics;
using System.Runtime.InteropServices;

namespace FMSuperScout;

/// <summary>
/// In-process geheugentoegang. Omdat we in het adresruim van fm.exe zelf draaien,
/// lezen we gevalideerde adressen rechtstreeks via pointers (geen ReadProcessMemory).
/// Elk adres wordt eerst tegen de lijst van committed leesbare regio's gecheckt,
/// zodat een ongeldige pointer nooit een access violation veroorzaakt.
/// </summary>
internal sealed unsafe class MemScan
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

    private const uint MEM_COMMIT = 0x1000;
    private const uint PAGE_READONLY = 0x02;
    private const uint PAGE_READWRITE = 0x04;
    private const uint PAGE_WRITECOPY = 0x08;
    private const uint PAGE_EXECUTE_READ = 0x20;
    private const uint PAGE_EXECUTE_READWRITE = 0x40;
    private const uint PAGE_EXECUTE_WRITECOPY = 0x80;
    private const uint PAGE_GUARD = 0x100;
    private const uint PAGE_NOACCESS = 0x01;

    // Gesorteerde regio's (start, end) voor snelle validatie.
    public readonly List<(ulong start, ulong end)> Regions = new();
    private ulong[] _starts = Array.Empty<ulong>();
    private ulong[] _ends = Array.Empty<ulong>();

    public ulong GaBase { get; private set; }
    public ulong GaEnd { get; private set; }

    public MemScan()
    {
        BuildRegions();
        FindGameAssembly();
    }

    private static bool IsReadable(uint protect)
    {
        if ((protect & PAGE_GUARD) != 0) return false;
        if ((protect & PAGE_NOACCESS) != 0) return false;
        return (protect & (PAGE_READONLY | PAGE_READWRITE | PAGE_WRITECOPY |
                           PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY)) != 0;
    }

    private void BuildRegions()
    {
        ulong addr = 0x10000;
        ulong max = 0x7FFFFFFFFFFF;
        int guard = 0;
        while (addr < max && guard++ < 2_000_000)
        {
            if (VirtualQuery(addr, out var mbi, (ulong)sizeof(MEMORY_BASIC_INFORMATION)) == 0)
                break;
            if (mbi.RegionSize == 0) break;
            if (mbi.State == MEM_COMMIT && IsReadable(mbi.Protect))
                Regions.Add((mbi.BaseAddress, mbi.BaseAddress + mbi.RegionSize));
            addr = mbi.BaseAddress + mbi.RegionSize;
        }
        Regions.Sort((a, b) => a.start.CompareTo(b.start));
        _starts = Regions.Select(r => r.start).ToArray();
        _ends = Regions.Select(r => r.end).ToArray();
    }

    private void FindGameAssembly()
    {
        foreach (ProcessModule m in Process.GetCurrentProcess().Modules)
        {
            if (string.Equals(m.ModuleName, "GameAssembly.dll", StringComparison.OrdinalIgnoreCase))
            {
                GaBase = (ulong)m.BaseAddress.ToInt64();
                GaEnd = GaBase + (ulong)m.ModuleMemorySize;
                return;
            }
        }
    }

    /// <summary>Zit [addr, addr+len) volledig in één committed leesbare regio?</summary>
    public bool Valid(ulong addr, int len)
    {
        if (addr == 0) return false;
        int lo = 0, hi = _starts.Length - 1, idx = -1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            if (_starts[mid] <= addr) { idx = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        if (idx < 0) return false;
        return addr + (ulong)len <= _ends[idx];
    }

    public bool InGa(ulong addr) => addr >= GaBase && addr < GaEnd;

    // Veilige reads (geven false/0 terug bij ongeldig adres).
    public ulong Ptr(ulong a) => Valid(a, 8) ? *(ulong*)a : 0;
    public uint U32(ulong a) => Valid(a, 4) ? *(uint*)a : 0;
    public int I32(ulong a) => Valid(a, 4) ? *(int*)a : 0;
    public ushort U16(ulong a) => Valid(a, 2) ? *(ushort*)a : (ushort)0;
    public byte U8(ulong a) => Valid(a, 1) ? *(byte*)a : (byte)0;

    /// <summary>Genest FM-stringpatroon: [addr]→outer, [outer]→inner, string op inner+4 (UTF-8, null-terminated).</summary>
    public string NestedString(ulong addr, int maxLen = 128)
    {
        ulong outer = Ptr(addr);
        if (outer == 0) return null;
        ulong inner = Ptr(outer);
        if (inner == 0) return null;
        return CStr(inner + 4, maxLen);
    }

    /// <summary>Indirecte FM-string: [addr]→ptr, string op ptr+4.</summary>
    public string IndirectString(ulong addr, int maxLen = 128)
    {
        ulong p = Ptr(addr);
        if (p == 0) return null;
        return CStr(p + 4, maxLen);
    }

    public string CStr(ulong addr, int maxLen)
    {
        if (!Valid(addr, 1)) return null;
        byte* p = (byte*)addr;
        int n = 0;
        while (n < maxLen && Valid(addr + (ulong)n, 1) && p[n] != 0) n++;
        if (n == 0) return null;
        var bytes = new byte[n];
        Marshal.Copy((nint)addr, bytes, 0, n);
        var s = System.Text.Encoding.UTF8.GetString(bytes).Trim();
        return s.Length == 0 ? null : s;
    }

    /// <summary>Meta-offset-truc: vtable=[person]; meta=[vtable-8]; return int32 op meta+4.</summary>
    public int DynamicOffset(ulong person)
    {
        ulong vtable = Ptr(person);
        if (vtable == 0 || !InGa(vtable)) return 0;
        ulong meta = Ptr(vtable - 8);
        if (meta == 0 || !Valid(meta + 4, 4)) return 0;
        return I32(meta + 4);
    }
}
