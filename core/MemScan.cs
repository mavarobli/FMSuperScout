namespace FMSuperScout;

/// <summary>Wat een gevonden object in FM's database is.</summary>
internal enum ObjKind : byte { None, Player, Staff, HumanManager, Club }

/// <summary>
/// Herkende objectklasse en waar de veldblokken liggen, gerekend vanaf de plek <c>p</c> waar
/// de scan de vtable vond. Op Windows is p het persoonsdeel (MSVC-offset-truc, zie
/// MemScan.Win.cs); op de Mac het objectbegin (RTTI-klassenaam, zie MemScan.Mac.cs). De
/// offsets in <see cref="Fields"/> gelden daarna op beide platforms ongewijzigd.
/// </summary>
internal sealed class ObjClass
{
    public ObjKind Kind;
    public long BlockOff;    // speler- of stafblok (PLAO_*/NPLO_*) = p + BlockOff
    public long PersonOff;   // persoonsblok (PERO_*) = p + PersonOff
    public long DbOff;       // DB-basis (OBJ_DUNI, PERO_GENDER) = p + DbOff
    public int Hist;         // sleutel in het class-histogram (diagnostics)
    public bool Exact;       // op klassenaam herkend: geen vormcontrole nodig
}

/// <summary>
/// Geheugentoegang op het FM-proces, alleen lezend. Het platformdeel (MemScan.Win.cs of
/// MemScan.Mac.cs) levert de regio's, de modulekaart, <c>ReadRaw</c> en de klassenherkenning;
/// hier staan de getypeerde reads en de FM-strings die beide delen.
///
/// Elke read gaat via het besturingssysteem (ReadProcessMemory, mach_vm_read_overwrite) en
/// geeft bij een ongeldig adres 0/false terug. Een rauwe pointer-deref (*(ulong*)p) zou het
/// spel bij één verkeerd adres onherstelbaar laten crashen.
/// </summary>
internal sealed partial class MemScan
{
    // Regio's om te scannen naar DB-objecten (de heap van FM).
    public readonly List<(ulong start, ulong size)> ScanRegions = new();

    public ulong GaBase { get; private set; }   // GameAssembly (Unity/C#-laag)
    public ulong GaEnd { get; private set; }
    public ulong GpBase { get; private set; }   // game_plugin (native C++ database — hier leven person-objecten)
    public ulong GpEnd { get; private set; }
    public string GpPath { get; private set; }  // bestandspad van game_plugin (voor versiedetectie)

    // Snelle onder-/bovengrens die precies de twee modules omspant waar DB-objecten hun
    // vtable hebben. Verreweg de meeste 8-byte-woorden in de heap zijn kleine getallen
    // (nullen, tellers) die ver onder _loMod liggen → in de scan-hotloop in één vergelijking
    // weg, vóór de precieze InGp/InGa-check.
    private ulong _loMod, _hiMod;

    private void SetModuleBounds()
    {
        ulong lo = ulong.MaxValue, hi = 0;
        if (GpBase != 0) { lo = System.Math.Min(lo, GpBase); hi = System.Math.Max(hi, GpEnd); }
        if (GaBase != 0) { lo = System.Math.Min(lo, GaBase); hi = System.Math.Max(hi, GaEnd); }
        _loMod = lo == ulong.MaxValue ? 0 : lo;
        _hiMod = hi;
    }

    // Onze eigen leesbuffers (vastgepind). De Mac-scan draait in FM's proces en slaat ze over:
    // anders telt hij de kopieën van FM-objecten erin als tweede exemplaar.
    private static readonly List<(ulong lo, ulong hi)> OwnBuffers = new();
    public static unsafe void RegisterOwnBuffer(byte[] buf)
    {
        fixed (byte* b = buf) lock (OwnBuffers) OwnBuffers.Add(((ulong)b, (ulong)b + (ulong)buf.Length));
    }

    public bool InGa(ulong addr) => addr >= GaBase && addr < GaEnd;
    public bool InGp(ulong addr) => GpBase != 0 && addr >= GpBase && addr < GpEnd;
    public ulong ModLo => _loMod;
    public ulong ModHi => _hiMod;

    /// <summary>Leest een heel blok. Geeft false bij ongeldig adres (crasht nooit).</summary>
    public unsafe bool ReadBlock(ulong addr, byte[] buf, int len)
    {
        fixed (byte* b = buf) return ReadRaw(addr, b, len);
    }

    // Getypeerde reads naar een lokale variabele: niets van FM's geheugen blijft op onze heap
    // achter (op de Mac scant de scan ook onze eigen heap, zie MemScan.Mac.cs).
    public unsafe ulong Ptr(ulong a) { ulong v; return ReadRaw(a, &v, 8) ? v : 0UL; }
    public unsafe long I64(ulong a) { long v; return ReadRaw(a, &v, 8) ? v : 0L; }
    public unsafe uint U32(ulong a) { uint v; return ReadRaw(a, &v, 4) ? v : 0U; }
    public unsafe int I32(ulong a) { int v; return ReadRaw(a, &v, 4) ? v : 0; }
    public unsafe ushort U16(ulong a) { ushort v; return ReadRaw(a, &v, 2) ? v : (ushort)0; }
    public unsafe byte U8(ulong a) { byte v; return ReadRaw(a, &v, 1) ? v : (byte)0; }

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

    public unsafe string CStr(ulong addr, int maxLen)
    {
        maxLen = System.Math.Clamp(maxLen, 32, 256);
        byte* buf = stackalloc byte[maxLen];
        if (!ReadRaw(addr, buf, maxLen))
        {
            // Fallback: lees korter (adres kan vlak bij regio-einde liggen).
            maxLen = 32;
            if (!ReadRaw(addr, buf, maxLen)) return null;
        }
        int n = 0;
        while (n < maxLen && buf[n] != 0) n++;
        var s = n == 0 ? "" : System.Text.Encoding.UTF8.GetString(buf, n).Trim();
        new Span<byte>(buf, maxLen).Clear();   // geen kopie van FM-geheugen op de stack laten staan (Mac)
        return s.Length == 0 ? null : s;
    }
}
