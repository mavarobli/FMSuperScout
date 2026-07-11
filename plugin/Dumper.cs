using System.Diagnostics;

namespace FMSuperScout;

internal static class Dumper
{
    private static readonly string OutDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FMSuperScout");

    public static void DumpAll()
    {
        var sw = Stopwatch.StartNew();
        Plugin.Log.LogInfo("FMSuperScout: geheugen scannen…");
        Directory.CreateDirectory(OutDir);

        var mem = new MemScan();
        if (mem.GaBase == 0)
        {
            Plugin.Log.LogError("GameAssembly.dll niet gevonden — kan niet dumpen.");
            return;
        }
        Plugin.Log.LogInfo($"Regio's: {mem.Regions.Count}, GameAssembly {mem.GaBase:X}-{mem.GaEnd:X}");

        var players = new Dictionary<uint, Person>();
        var staff = new Dictionary<uint, Person>();
        var offsetHist = new Dictionary<int, int>();
        long candidates = 0;

        foreach (var (start, end) in mem.Regions)
        {
            // Sla enorme of niet-heap regio's niet over: person-objecten staan in de GC-heap.
            ulong size = end - start;
            if (size < 0x40) continue;
            unsafe
            {
                for (ulong p = start; p + 0x10 <= end; p += 8)
                {
                    ulong vt = *(ulong*)p;
                    if (vt < mem.GaBase || vt >= mem.GaEnd) continue; // snelle prune: vtable in GameAssembly
                    candidates++;
                    int off = mem.DynamicOffset(p);
                    if (off == 0) continue;

                    bool isPlayer = off == Fields.PLAYER_OFFSET || off == Fields.PLAYER_STAFF_OFFSET;
                    bool isStaff = off == Fields.STAFF_OFFSET || off == Fields.HUMAN_MANAGER_OFFSET;
                    if (!isPlayer && !isStaff) continue;

                    uint uid = mem.U32(p + Fields.OBJ_DUNI);
                    if (uid == 0 || uid == 0xFFFFFFFF) continue;

                    ulong basePtr = p - (ulong)off;
                    if (isPlayer)
                    {
                        ushort ca = mem.U16(basePtr + Fields.PLAO_CA);
                        ushort pa = mem.U16(basePtr + Fields.PLAO_PA);
                        if (ca < 1 || ca > 200 || pa < 1 || pa > 200) continue;
                        offsetHist[off] = offsetHist.GetValueOrDefault(off) + 1;
                        if (!players.ContainsKey(uid))
                            players[uid] = ReadPlayer(mem, p, basePtr, uid, ca, pa);
                    }
                    else
                    {
                        ushort ca = mem.U16(basePtr + Fields.NPLO_CA);
                        ushort pa = mem.U16(basePtr + Fields.NPLO_PA);
                        if (ca < 1 || ca > 200 || pa < 1 || pa > 200) continue;
                        offsetHist[off] = offsetHist.GetValueOrDefault(off) + 1;
                        if (!staff.ContainsKey(uid))
                            staff[uid] = ReadStaff(mem, p, basePtr, uid, ca, pa);
                    }
                }
            }
        }

        Plugin.Log.LogInfo($"Gevonden: {players.Count} spelers, {staff.Count} staf " +
                           $"({candidates:N0} kandidaten, {sw.ElapsedMilliseconds} ms). JSON schrijven…");

        WriteJson(players.Values, staff.Values);
        WriteDiag(mem, players, staff, offsetHist, candidates, sw.ElapsedMilliseconds);

        Plugin.Log.LogInfo($"Klaar in {sw.ElapsedMilliseconds} ms. Bestand in {OutDir}. " +
                           "Open de FMSuperScout web-app en klik Verversen.");
    }

    // ---------- speler ----------
    private static Person ReadPlayer(MemScan m, ulong person, ulong pl, uint uid, ushort ca, ushort pa)
    {
        var e = new Person { Uid = uid, Ca = ca, Pa = pa, IsPlayer = true };
        e.Name = ReadName(m, person);
        (e.BirthYear, e.BirthDoy) = DecodeFmDate(m.U32(person + Fields.PERO_DOB));
        e.Age = AgeFrom(e.BirthYear, e.BirthDoy);
        e.Nat = ReadNation(m, person);
        e.Height = m.U16(pl + Fields.PLAO_HEIGHT);
        if (e.Height is < 140 or > 220) e.Height = 0;

        // attributen (÷5)
        foreach (var (key, off) in Fields.PlayerAttrs)
            e.Attrs[key] = Attr(m, pl + (ulong)Fields.PLAO_ATTRS + (ulong)off);
        foreach (var (key, off) in Fields.PlayerHiddenAttrs)
            e.Attrs[key] = Attr(m, pl + (ulong)Fields.PLAO_ATTRS + (ulong)off);

        int lf = Attr(m, pl + (ulong)Fields.PLAO_ATTRS + Fields.FOOT_LEFT);
        int rf = Attr(m, pl + (ulong)Fields.PLAO_ATTRS + Fields.FOOT_RIGHT);
        e.Foot = (rf >= 14 && lf >= 14) ? "Beide" : (rf >= lf ? "Rechts" : "Links");

        // posities
        var pos = new List<(string k, int v)>();
        foreach (var (key, off) in Fields.Positions)
        {
            int v = m.U8(pl + (ulong)Fields.PLAO_POSITIONS + (ulong)off);
            if (v >= 1) pos.Add((key, v));
        }
        int top = pos.Count > 0 ? pos.Max(x => x.v) : 0;
        e.PosArr = pos.Where(x => x.v >= System.Math.Max(15, top - 2)).OrderByDescending(x => x.v).Select(x => x.k).ToList();
        if (e.PosArr.Count == 0 && pos.Count > 0)
            e.PosArr = pos.OrderByDescending(x => x.v).Take(1).Select(x => x.k).ToList();

        // waarde & contract
        e.Value = m.U32(pl + Fields.PLAO_TRANSFER_VALUE);
        e.GuideValue = m.U32(pl + Fields.PLAO_GUIDE_VALUE);
        ulong con = m.Ptr(person + Fields.PERO_FULL_CONTRACT);
        if (con != 0 && m.Valid(con, 0x60))
        {
            e.Wage = m.U32(con + Fields.CON_WEEKLY_WAGE);
            e.Expires = FmDateIso(m.U32(con + Fields.CON_EXPIRY));
            byte flags = m.U8(con + Fields.CON_STATUS_FLAGS);
            e.Listed = (flags & (1 << 0)) != 0 || (flags & (1 << 3)) != 0;
        }
        e.Club = ResolveClubName(m, person);
        return e;
    }

    // ---------- staf ----------
    private static Person ReadStaff(MemScan m, ulong person, ulong st, uint uid, ushort ca, ushort pa)
    {
        var e = new Person { Uid = uid, Ca = ca, Pa = pa, IsPlayer = false };
        e.Name = ReadName(m, person);
        (e.BirthYear, e.BirthDoy) = DecodeFmDate(m.U32(person + Fields.PERO_DOB));
        e.Age = AgeFrom(e.BirthYear, e.BirthDoy);
        e.Nat = ReadNation(m, person);

        foreach (var (key, off) in Fields.StaffAttrs)
            e.StaffAttrs[key] = Attr(m, st + (ulong)Fields.NPLO_ATTRS + (ulong)off);
        e.Job = GuessStaffRole(e.StaffAttrs);

        ulong con = m.Ptr(person + Fields.PERO_FULL_CONTRACT);
        if (con != 0 && m.Valid(con, 0x60))
        {
            e.Wage = m.U32(con + Fields.CON_WEEKLY_WAGE);
            e.Expires = FmDateIso(m.U32(con + Fields.CON_EXPIRY));
        }
        e.Club = ResolveClubName(m, person);
        return e;
    }

    private static int Attr(MemScan m, ulong addr)
    {
        int raw = m.U8(addr);
        int v = (int)System.Math.Floor(raw / 5.0 + 0.5);
        return System.Math.Clamp(v, 0, 20);
    }

    private static string ReadName(MemScan m, ulong person)
    {
        string common = m.NestedString(person + Fields.PERO_COMMON_NAME);
        if (!string.IsNullOrEmpty(common)) return common;
        string first = m.NestedString(person + Fields.PERO_FIRST_NAME);
        string second = m.NestedString(person + Fields.PERO_SECOND_NAME);
        string name = string.Join(" ", new[] { first, second }.Where(s => !string.IsNullOrEmpty(s)));
        return string.IsNullOrEmpty(name) ? null : name;
    }

    private static List<string> ReadNation(MemScan m, ulong person)
    {
        ulong nat = m.Ptr(person + Fields.PERO_NATION);
        if (nat == 0) return new List<string>();
        string s = m.IndirectString(nat + Fields.NATION_SHORT_NAME)
                 ?? m.IndirectString(nat + Fields.NATION_NAME);
        return s == null ? new List<string>() : new List<string> { s };
    }

    // Best-effort clubnaam: probeer persoon-offsets die naar een club-object wijzen
    // (club heeft geneste naam op +0xC0). Wordt in e2e vastgepind.
    private static readonly int[] ClubCandidateOffsets = { 0x98, 0xA0, 0xB0, 0xB8, 0xC0, 0xC8, 0xD0, 0xE8, 0xF8 };
    private const int CLUB_NAME = 0xC0;

    private static string ResolveClubName(MemScan m, ulong person)
    {
        foreach (int off in ClubCandidateOffsets)
        {
            ulong club = m.Ptr(person + (ulong)off);
            if (club == 0 || !m.Valid(club, CLUB_NAME + 8)) continue;
            string name = m.NestedString(club + CLUB_NAME);
            if (!string.IsNullOrEmpty(name) && name.Length is >= 2 and <= 48 && LooksLikeName(name))
                return name;
        }
        return null;
    }

    private static bool LooksLikeName(string s)
    {
        int letters = s.Count(char.IsLetter);
        return letters >= 2 && letters >= s.Length / 2;
    }

    private static string GuessStaffRole(Dictionary<string, int> a)
    {
        int G(string k) => a.GetValueOrDefault(k);
        int gk = (G("KV_distributie") + G("KV_vangen") + G("KV_reflexen")) / 3;
        int scout = (G("Oordeel_vermogen") + G("Oordeel_potentie")) / 2;
        int coach = (G("Aanvallen") + G("Verdedigen") + G("Technisch") + G("Tactisch")) / 4;
        int med = (G("Fysiotherapie") + G("Sportwetenschap")) / 2;
        int fit = G("Fitheid");
        int data = G("Data_analyse");
        var opts = new (string role, int score)[]
        {
            ("Keeperstrainer", gk), ("Scout", scout), ("Coach", coach),
            ("Fysiotherapeut", med), ("Fitnesscoach", fit), ("Data-analist", data),
        };
        var best = opts.OrderByDescending(o => o.score).First();
        return best.score >= 8 ? best.role : "Staflid";
    }

    // FM-datum: u32, jaar = raw>>16, dag-van-jaar = raw & 0x1ff
    private static (int year, int doy) DecodeFmDate(uint raw)
    {
        int year = (int)(raw >> 16);
        int doy = (int)(raw & 0x1ff);
        if (year is < 1900 or > 2100 || doy is < 1 or > 366) return (0, 0);
        return (year, doy);
    }

    private static string FmDateIso(uint raw)
    {
        var (year, doy) = DecodeFmDate(raw);
        if (year == 0) return null;
        try { return new DateTime(year, 1, 1).AddDays(doy - 1).ToString("yyyy-MM-dd"); }
        catch { return null; }
    }

    private static int AgeFrom(int year, int doy)
    {
        if (year == 0) return 0;
        var now = DateTime.Now; // in-game datum ≈ echte datum voor deze save; wordt in v2 exact ingelezen
        int nowDoy = now.DayOfYear;
        int age = now.Year - year - (doy <= nowDoy ? 0 : 1);
        return age is >= 0 and <= 80 ? age : 0;
    }

    // ---------- output ----------
    private static void WriteJson(IEnumerable<Person> players, IEnumerable<Person> staff)
    {
        string path = Path.Combine(OutDir, "dump.json");
        var j = new JsonWriter(path);
        j.BeginObj();
        j.Key("meta"); j.BeginObj();
        j.Prop("generated", DateTime.Now.ToString("s"));
        j.Prop("gameDate", DateTime.Now.ToString("yyyy-MM-dd"));
        j.Prop("source", "FMSuperScout plugin v" + Plugin.Version);
        j.EndObj();

        j.Key("players"); j.BeginArr();
        foreach (var p in players) WritePerson(j, p, true);
        j.EndArr();

        j.Key("staff"); j.BeginArr();
        foreach (var p in staff) WritePerson(j, p, false);
        j.EndArr();
        j.EndObj();
        j.Close();
    }

    private static void WritePerson(JsonWriter j, Person p, bool isPlayer)
    {
        j.BeginObj();
        j.Prop("id", p.Uid);
        j.Prop("name", p.Name ?? "?");
        j.Prop("searchName", p.Name ?? "");
        j.Prop("age", p.Age);
        if (p.BirthYear > 0) j.Prop("dob", $"{p.BirthYear:D4}");
        j.Key("nat"); j.BeginArr(); foreach (var n in p.Nat) j.Val(n); j.EndArr();
        j.Prop("club", p.Club);
        j.Null4("div");
        j.Prop("ca", p.Ca);
        j.Prop("pa", p.Pa);
        j.Prop("wage", p.Wage);
        j.Prop("expires", p.Expires);
        if (isPlayer)
        {
            j.Prop("pos", string.Join(", ", p.PosArr));
            j.Key("posArr"); j.BeginArr(); foreach (var x in p.PosArr) j.Val(x); j.EndArr();
            j.Prop("foot", p.Foot);
            if (p.Height > 0) j.Prop("height", p.Height);
            j.Prop("value", p.Value);
            j.Prop("askingPrice", p.Value); // v1: transferwaarde als benadering; echte vraagprijs in v2
            j.Null4("wageDemand");
            j.Prop("listed", p.Listed);
            j.Prop("loanListed", p.LoanListed);
            j.Prop("interested", p.Interested);
            j.Key("attrs"); j.BeginObj();
            foreach (var kv in p.Attrs) { j.Key(kv.Key); j.Val((long)kv.Value); }
            j.EndObj();
        }
        else
        {
            j.Prop("job", p.Job);
            j.Key("staffAttrs"); j.BeginObj();
            foreach (var kv in p.StaffAttrs) { j.Key(kv.Key); j.Val((long)kv.Value); }
            j.EndObj();
        }
        j.EndObj();
    }

    private static void WriteDiag(MemScan m, Dictionary<uint, Person> players, Dictionary<uint, Person> staff,
        Dictionary<int, int> hist, long candidates, long ms)
    {
        try
        {
            string path = Path.Combine(OutDir, "diagnostics.txt");
            using var w = new StreamWriter(path, false);
            w.WriteLine($"FMSuperScout diagnostics — {DateTime.Now}");
            w.WriteLine($"Regio's: {m.Regions.Count}  GameAssembly: {m.GaBase:X}-{m.GaEnd:X}");
            w.WriteLine($"Kandidaten: {candidates:N0}  Spelers: {players.Count}  Staf: {staff.Count}  Tijd: {ms} ms");
            w.WriteLine("Dynamic-offset histogram:");
            foreach (var kv in hist.OrderByDescending(x => x.Value))
                w.WriteLine($"  0x{kv.Key:X} ({kv.Key}) : {kv.Value}");
            w.WriteLine();
            w.WriteLine("Sample spelers (eerste 12):");
            foreach (var p in players.Values.Take(12))
                w.WriteLine($"  uid={p.Uid} {p.Name} lft={p.Age} CA={p.Ca} PA={p.Pa} pos={string.Join("/", p.PosArr)} club={p.Club} nat={string.Join(",", p.Nat)} val={p.Value} wage={p.Wage} exp={p.Expires}");
            w.WriteLine();
            w.WriteLine("Sample staf (eerste 8):");
            foreach (var p in staff.Values.Take(8))
                w.WriteLine($"  uid={p.Uid} {p.Name} lft={p.Age} CA={p.Ca} PA={p.Pa} rol={p.Job} club={p.Club}");
        }
        catch (Exception e) { Plugin.Log.LogWarning("Diag schrijven mislukt: " + e.Message); }
    }
}

internal sealed class Person
{
    public uint Uid;
    public string Name;
    public int Age;
    public int BirthYear;
    public int BirthDoy;
    public List<string> Nat = new();
    public string Club;
    public bool IsPlayer;
    public ushort Ca;
    public ushort Pa;
    public int Height;
    public string Foot;
    public List<string> PosArr = new();
    public long Value;
    public long GuideValue;
    public long Wage;
    public string Expires;
    public bool Listed;
    public bool LoanListed;
    public bool Interested;
    public string Job;
    public Dictionary<string, int> Attrs = new();
    public Dictionary<string, int> StaffAttrs = new();
}
