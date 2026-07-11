using System.Diagnostics;

namespace FMSuperScout;

internal static class Dumper
{
    private static readonly string OutDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FMSuperScout");

    // Diagnose-data (histogram van alle voorkomende class-offsets, gezet tijdens de scan).
    internal static Dictionary<int, long> AllOffHist = new();
    internal static long VtGp;
    // Person-adressen van de eerste spelers, voor club-offset-discovery in de diagnose.
    internal static readonly List<(ulong person, string name, string club)> DiagPersons = new();
    internal static string MyClub;       // club van de human-manager
    internal static string ManagerName;  // naam van de human-manager

    // 0xFFFFFFFF is FM's "niet ingesteld"-sentinel → onbekend (-1). Anders de waarde.
    private static long Money(uint v) => v == 0xFFFFFFFF ? -1 : v;
    // JSON: negatief (onbekend) → null, anders getal.
    private static void Money(JsonWriter j, string key, long v) { if (v < 0) j.Null4(key); else j.Prop(key, v); }

    public static void DumpAll()
    {
        var sw = Stopwatch.StartNew();
        Plugin.Log.LogInfo("FMSuperScout: geheugen scannen…");
        Plugin.SetStatus("FMSuperScout: database scannen… (±20 sec)", 3600);
        Directory.CreateDirectory(OutDir);

        var mem = new MemScan();
        if (mem.GaBase == 0)
        {
            Plugin.Log.LogError("GameAssembly.dll niet gevonden — kan niet dumpen.");
            return;
        }
        Plugin.Log.LogInfo($"Scanregio's: {mem.ScanRegions.Count}, GameAssembly {mem.GaBase:X}-{mem.GaEnd:X}, " +
                           $"game_plugin {mem.GpBase:X}-{mem.GpEnd:X}");
        if (mem.GpBase == 0)
            Plugin.Log.LogWarning("game_plugin.dll niet gevonden! Person-objecten leven daar — dump zal leeg zijn.");

        var players = new Dictionary<uint, Person>();
        var staff = new Dictionary<uint, Person>();
        var offsetHist = new Dictionary<int, int>();     // matches (speler/staf)
        var allOffHist = new Dictionary<int, long>();     // ALLE class-offsets (diagnose)
        var managers = new List<(ulong person, string name, string club)>(); // human-managers
        long candidates = 0, vtGp = 0;

        const int ChunkSize = 32 * 1024 * 1024; // 32 MB blokken
        var buf = new byte[ChunkSize];

        foreach (var (start, size) in mem.ScanRegions)
        {
            if (size < 0x40) continue;
            ulong scanned = 0;
            while (scanned < size)
            {
                int want = (int)System.Math.Min((ulong)ChunkSize, size - scanned);
                ulong chunkBase = start + scanned;
                if (!mem.ReadBlock(chunkBase, buf, want)) { scanned += (ulong)want; continue; }

                for (int i = 0; i + 0x10 <= want; i += 8)
                {
                    ulong vt = BitConverter.ToUInt64(buf, i);
                    // vtable moet in game_plugin.dll (native DB) of GameAssembly liggen
                    if (!mem.IsVtable(vt)) continue;
                    candidates++;
                    if (mem.InGp(vt)) vtGp++;

                    ulong p = chunkBase + (ulong)i; // kandidaat person-object
                    int off = mem.DynamicOffsetFromVtable(vt);
                    if (off == 0) continue;

                    // Diagnose: registreer élk class-offset dat een plausibele UID heeft,
                    // zodat we de echte speler/staf-offsets kunnen zien als er 0 matchen.
                    uint uid = mem.U32(p + Fields.OBJ_DUNI);
                    if (uid == 0 || uid == 0xFFFFFFFF) continue;
                    if (off is > 0 and < 0x2000)
                        allOffHist[off] = allOffHist.GetValueOrDefault(off) + 1;

                    bool isPlayer = off == Fields.PLAYER_OFFSET || off == Fields.PLAYER_STAFF_OFFSET;
                    bool isStaff = off == Fields.STAFF_OFFSET || off == Fields.HUMAN_MANAGER_OFFSET;
                    if (!isPlayer && !isStaff) continue;

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
                        {
                            var st = ReadStaff(mem, p, basePtr, uid, ca, pa);
                            staff[uid] = st;
                            if (off == Fields.HUMAN_MANAGER_OFFSET)
                                managers.Add((p, st.Name, st.Club));
                        }
                    }
                }
                scanned += (ulong)want;
            }
        }
        Plugin.Log.LogInfo($"vtables in game_plugin: {vtGp:N0} van {candidates:N0} kandidaten");
        Dumper.AllOffHist = allOffHist;
        Dumper.VtGp = vtGp;

        // Human-manager → jouw club. Kies de manager met een resolvebare club.
        var me = managers.FirstOrDefault(x => !string.IsNullOrEmpty(x.club));
        if (me.person == 0 && managers.Count > 0) me = managers[0];
        MyClub = me.club;
        ManagerName = me.name;
        Plugin.Log.LogInfo($"Manager: {ManagerName ?? "?"} · club: {MyClub ?? "?"} ({managers.Count} human-managers)");

        Plugin.Log.LogInfo($"Gevonden: {players.Count} spelers, {staff.Count} staf " +
                           $"({candidates:N0} kandidaten, {sw.ElapsedMilliseconds} ms). JSON schrijven…");

        WriteJson(players.Values, staff.Values);
        WriteDiag(mem, players, staff, offsetHist, candidates, sw.ElapsedMilliseconds);

        Plugin.Log.LogInfo($"Klaar in {sw.ElapsedMilliseconds} ms. Bestand in {OutDir}. " +
                           "Open de FMSuperScout web-app en klik Verversen.");
        Plugin.SetStatus($"FMSuperScout klaar ✓  {players.Count:N0} spelers, {staff.Count:N0} staf — " +
                         "open de web-app en klik Verversen", 20);
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
        e.Value = Money(m.U32(pl + Fields.PLAO_TRANSFER_VALUE));
        e.GuideValue = Money(m.U32(pl + Fields.PLAO_GUIDE_VALUE));
        ulong con = m.Ptr(person + Fields.PERO_FULL_CONTRACT);
        if (con != 0)
        {
            e.Wage = Money(m.U32(con + Fields.CON_WEEKLY_WAGE));
            e.Expires = FmDateIso(m.U32(con + Fields.CON_EXPIRY));
            byte flags = m.U8(con + Fields.CON_STATUS_FLAGS);
            e.Listed = (flags & (1 << 0)) != 0 || (flags & (1 << 3)) != 0; // Listed / by request
            e.NotForSale = (flags & (1 << 4)) != 0;
            e.SetForRelease = (flags & (1 << 5)) != 0;
        }
        e.Club = ResolveClubName(m, person);
        if (DiagPersons.Count < 60) DiagPersons.Add((person, e.Name, e.Club));
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
        if (con != 0)
        {
            e.Wage = Money(m.U32(con + Fields.CON_WEEKLY_WAGE));
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

    // Huidige club via de brondata-keten (authoritatief, uit gedecompileerde CE-tabel):
    //   contract = [person + 0xA8]   (pero.Pflc, volledig contract)
    //   team     = [contract + 0x10] (pero.Pcti)
    //   club     = [team + 0x30]     (teao.Tclu)
    //   naam     = indirecte string op club + 0xC0 (cluo.Cnam) / +0xC8 (Csnm)
    private const int CLUB_NAME = 0xC0;
    private const int CLUB_SHORT_NAME = 0xC8;
    private const int CON_TEAM = 0x10;
    private const int TEAM_CLUB = 0x30;

    private static string ResolveClubName(MemScan m, ulong person)
    {
        ulong con = m.Ptr(person + (ulong)Fields.PERO_FULL_CONTRACT);
        if (con == 0) return null;
        ulong team = m.Ptr(con + CON_TEAM);
        if (team == 0) return null;
        ulong club = m.Ptr(team + (ulong)TEAM_CLUB);
        if (club == 0) return null;
        return ClubNameOf(m, club);
    }

    private static string ClubNameOf(MemScan m, ulong club)
    {
        string name = m.IndirectString(club + CLUB_NAME) ?? m.IndirectString(club + CLUB_SHORT_NAME);
        return PlausibleClub(name) ? name : null;
    }

    // Alleen echte namen: overwegend Latijnse letters, geen Cyrillische/rare bytes.
    private static bool PlausibleClub(string s)
    {
        if (string.IsNullOrEmpty(s) || s.Length is < 2 or > 48) return false;
        int latin = 0, weird = 0;
        foreach (char c in s)
        {
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) latin++;
            else if (c > 0x7F && !"àáâäãåèéêëìíîïòóôöõùúûüñçøæœšžčćđ".Contains(char.ToLower(c))) weird++;
        }
        return latin >= 2 && weird == 0;
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
        if (year < 2000) return null; // contractdatums zijn 2025+; <2000 = sentinel/geen contract
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
        j.Prop("manager", ManagerName);
        j.Prop("myClub", MyClub);
        j.Prop("currency", "GBP");
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
        Money(j, "wage", p.Wage);
        j.Prop("expires", p.Expires);
        if (isPlayer)
        {
            j.Prop("pos", string.Join(", ", p.PosArr));
            j.Key("posArr"); j.BeginArr(); foreach (var x in p.PosArr) j.Val(x); j.EndArr();
            j.Prop("foot", p.Foot);
            if (p.Height > 0) j.Prop("height", p.Height);
            Money(j, "value", p.Value);
            Money(j, "askingPrice", p.Value); // v1: transferwaarde; echte vraagprijs in v2
            j.Null4("wageDemand");
            j.Prop("listed", p.Listed);
            j.Prop("notForSale", p.NotForSale);
            j.Prop("setForRelease", p.SetForRelease);
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
            w.WriteLine($"Scanregio's: {m.ScanRegions.Count}");
            w.WriteLine($"GameAssembly.dll: {m.GaBase:X}-{m.GaEnd:X}");
            w.WriteLine($"game_plugin.dll:  {m.GpBase:X}-{m.GpEnd:X}");
            w.WriteLine($"Kandidaten: {candidates:N0}  (vtable in game_plugin: {VtGp:N0})");
            w.WriteLine($"Spelers: {players.Count}  Staf: {staff.Count}  Tijd: {ms} ms");
            w.WriteLine();
            w.WriteLine("=== DIAGNOSE: alle class-offsets (meta+4) met plausibele UID, top 50 ===");
            w.WriteLine("(De echte speler/staf-classes zijn de grote pieken; vergelijk met verwacht speler=0x288)");
            foreach (var kv in AllOffHist.OrderByDescending(x => x.Value).Take(50))
                w.WriteLine($"  0x{kv.Key:X} ({kv.Key,5}) : {kv.Value:N0}");
            w.WriteLine();
            w.WriteLine("Matches per offset (speler/staf-filter geslaagd):");
            foreach (var kv in hist.OrderByDescending(x => x.Value))
                w.WriteLine($"  0x{kv.Key:X} ({kv.Key}) : {kv.Value}");
            w.WriteLine();

            // === CLUB-OFFSET DISCOVERY ===
            // Voor de eerste spelers: welke person-offset wijst naar een object met een
            // plausibele clubnaam (indirecte string op +0xC0/+0xC8)? De offset met de
            // meeste hits is de echte persoon→club-pointer.
            w.WriteLine("=== CLUB-OFFSET DISCOVERY (person→club) ===");
            var clubHits = new Dictionary<int, int>();
            var clubSamples = new Dictionary<int, List<string>>();
            foreach (var (person, _, _) in DiagPersons)
            {
                for (int off = 0x08; off <= 0x180; off += 8)
                {
                    ulong club = m.Ptr(person + (ulong)off);
                    if (club == 0) continue;
                    string name = m.IndirectString(club + 0xC0) ?? m.IndirectString(club + 0xC8);
                    if (!PlausibleClub(name)) continue;
                    clubHits[off] = clubHits.GetValueOrDefault(off) + 1;
                    var lst = clubSamples.GetValueOrDefault(off) ?? (clubSamples[off] = new List<string>());
                    if (lst.Count < 5 && !lst.Contains(name)) lst.Add(name);
                }
            }
            if (clubHits.Count == 0)
                w.WriteLine("  (geen enkele offset gaf clubnamen — clubnaam-string zit mogelijk anders)");
            foreach (var kv in clubHits.OrderByDescending(x => x.Value).Take(20))
                w.WriteLine($"  person+0x{kv.Key:X} : {kv.Value}/{DiagPersons.Count} hits  bv. [{string.Join(", ", clubSamples[kv.Key])}]");
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
    public bool NotForSale;
    public bool SetForRelease;
    public string Job;
    public Dictionary<string, int> Attrs = new();
    public Dictionary<string, int> StaffAttrs = new();
}
