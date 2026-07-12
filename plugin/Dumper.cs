using System.Diagnostics;

namespace FMSuperScout;

internal static class Dumper
{

    private static readonly string OutDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FMSuperScout");

    // Diagnose-data (histogram van alle voorkomende class-offsets, gezet tijdens de scan).
    internal static Dictionary<int, long> AllOffHist = new();
    internal static long VtGp;
    internal static int LinkedViaSquad;
    internal static int ClubCount;
    // Person-adressen van de eerste spelers, voor club-offset-discovery in de diagnose.
    internal static readonly List<(ulong person, string name, string club)> DiagPersons = new();
    internal static string MyClub;       // club van de human-manager
    internal static string ManagerName;  // naam van de human-manager
    internal static int MyClubRep;       // reputatie van jouw club (~0..10000)
    internal static int GameYear;        // afgeleid huidig seizoensjaar

    // Statusbestand dat de web-app pollt (betrouwbare F9-feedback, ook zonder console).
    private static void WriteStatus(string state, int players, int staff)
    {
        try
        {
            Directory.CreateDirectory(OutDir);
            File.WriteAllText(Path.Combine(OutDir, "status.json"),
                $"{{\"state\":\"{state}\",\"players\":{players},\"staff\":{staff},\"at\":\"{DateTime.Now:s}\"}}");
        }
        catch { }
    }

    // 0xFFFFFFFF is FM's "niet ingesteld"-sentinel → onbekend (-1). Anders de waarde.
    private static long Money(uint v) => v == 0xFFFFFFFF ? -1 : v;
    // Marktwaarde-veld (pl+0x234): naast 0xFFFFFFFF gebruikt FM 300.000.000 als "niet vastgelegd".
    private static long MoneyVal(uint v) => (v == 0xFFFFFFFF || v == 300_000_000u) ? -1 : v;
    // JSON: negatief (onbekend) → null, anders getal.
    private static void Money(JsonWriter j, string key, long v) { if (v < 0) j.Null4(key); else j.Prop(key, v); }

    public static void DumpAll()
    {
        var sw = Stopwatch.StartNew();
        Plugin.Log.LogInfo("FMSuperScout: geheugen scannen…");
        Directory.CreateDirectory(OutDir);
        WriteStatus("scanning", 0, 0);

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
        var managers = new List<(ulong person, string name, string club, int rep)>(); // human-managers
        var personToUid = new Dictionary<ulong, uint>(1 << 17); // person/objectstart-adres → uid
        var clubObjs = new List<ulong>();                        // gedetecteerde club-objecten
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
                    if (!isPlayer && !isStaff)
                    {
                        // Club-detectie: object met teams-vector op +0x18/+0x20 en naam op +0xC0.
                        ulong tb = mem.Ptr(p + 0x18), te = mem.Ptr(p + 0x20);
                        if (tb != 0 && te > tb && (te - tb) % 8 == 0 && (te - tb) / 8 is >= 1 and <= 64
                            && ClubNameOf(mem, p) != null)
                            clubObjs.Add(p);
                        continue;
                    }

                    ulong basePtr = p - (ulong)off;
                    if (isPlayer)
                    {
                        ushort ca = mem.U16(basePtr + Fields.PLAO_CA);
                        ushort pa = mem.U16(basePtr + Fields.PLAO_PA);
                        if (ca < 1 || ca > 200 || pa < 1 || pa > 200) continue;
                        offsetHist[off] = offsetHist.GetValueOrDefault(off) + 1;
                        if (!players.ContainsKey(uid))
                        {
                            players[uid] = ReadPlayer(mem, p, basePtr, uid, ca, pa);
                            personToUid[p] = uid;
                            personToUid[basePtr] = uid;
                        }
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
                            {
                                var (mc, mrep) = ResolveClub(mem, p);
                                managers.Add((p, st.Name, mc ?? st.Club, mrep));
                            }
                        }
                    }
                }
                scanned += (ulong)want;
            }
        }
        Plugin.Log.LogInfo($"vtables in game_plugin: {vtGp:N0} van {candidates:N0} kandidaten");
        Dumper.AllOffHist = allOffHist;
        Dumper.VtGp = vtGp;

        // ---- Squad-gebaseerde clubkoppeling (authoritatief) ----
        // Loop clubs → teams → spelerslijst. Elke speler krijgt de club van zijn selectie;
        // bij meerdere selecties wint het eerste elftal (laagste teamtype). Ook: welke club
        // heeft de human-manager als teammanager → jouw club.
        var mgrAddrs = new HashSet<ulong>(managers.Select(x => x.person));
        var squadClub = new Dictionary<uint, (string club, int tt, int rep)>();
        foreach (ulong club in clubObjs)
        {
            string cname = ClubNameOf(mem, club);
            if (cname == null) continue;
            ulong tb = mem.Ptr(club + 0x18), te = mem.Ptr(club + 0x20);
            if (tb == 0 || te <= tb) continue;
            ulong teamCount = (te - tb) / 8;
            if (teamCount > 64) continue;
            for (ulong ti = 0; ti < teamCount; ti++)
            {
                ulong team = mem.Ptr(tb + ti * 8);
                if (team == 0) continue;
                int tt = mem.U8(team + 0x28);            // teamtype (0 = eerste elftal)
                int trep = mem.U16(team + 0xA8);
                if (trep is < 0 or > 12000) trep = 0;
                // manager van dit team → is het jouw human-manager?
                ulong mgr = mem.Ptr(team + 0x80);
                if (mgr != 0 && mgrAddrs.Contains(mgr) && (MyClub == null || tt == 0))
                { MyClub = cname; MyClubRep = trep; }
                // spelerslijst
                ulong pb = mem.Ptr(team + 0x38), pe = mem.Ptr(team + 0x40);
                if (pb == 0 || pe <= pb) continue;
                ulong pcount = (pe - pb) / 8;
                if (pcount > 200) continue;
                for (ulong pi = 0; pi < pcount; pi++)
                {
                    ulong pp = mem.Ptr(pb + pi * 8);
                    if (pp == 0 || !personToUid.TryGetValue(pp, out uint puid)) continue;
                    if (!squadClub.TryGetValue(puid, out var cur) || tt < cur.tt)
                        squadClub[puid] = (cname, tt, trep);
                }
            }
        }
        // Koppel clubs aan spelers (squad wint; anders blijft contract-keten-fallback staan).
        foreach (var p in players.Values)
            if (squadClub.TryGetValue(p.Uid, out var sc)) { p.Club = sc.club; if (sc.rep > 0) p.ClubRep = sc.rep; }

        Dumper.LinkedViaSquad = squadClub.Count;
        Dumper.ClubCount = clubObjs.Count;

        // Human-manager fallback als geen team-match gevonden is.
        var me = managers.FirstOrDefault(x => !string.IsNullOrEmpty(x.club));
        if (me.person == 0 && managers.Count > 0) me = managers[0];
        ManagerName = me.name;
        if (MyClub == null) { MyClub = me.club; MyClubRep = me.rep; }
        Plugin.Log.LogInfo($"Manager: {ManagerName ?? "?"} · club: {MyClub ?? "?"} (rep {MyClubRep}) · " +
                           $"{clubObjs.Count} clubs, {squadClub.Count} spelers via selectie gekoppeld");

        // Huidig seizoensjaar afleiden uit de data: de jeugdinstroom genereert elk jaar
        // een groot cohort ~16-jarigen. Het hoogste geboortejaar met een fors cohort +16
        // ≈ het huidige in-game jaar. Robuust en patch-bestendig (geen offsets nodig).
        var byHist = new Dictionary<int, int>();
        foreach (var pl in players.Values)
            if (pl.BirthYear is >= 1990 and <= 2100)
                byHist[pl.BirthYear] = byHist.GetValueOrDefault(pl.BirthYear) + 1;
        int youngestCohort = byHist.Where(kv => kv.Value >= 30).Select(kv => kv.Key).DefaultIfEmpty(0).Max();
        GameYear = youngestCohort > 0 ? youngestCohort + 16 : DateTime.Now.Year;
        Plugin.Log.LogInfo($"Afgeleid seizoensjaar: {GameYear} (jongste cohort {youngestCohort})");

        Plugin.Log.LogInfo($"Gevonden: {players.Count} spelers, {staff.Count} staf " +
                           $"({candidates:N0} kandidaten, {sw.ElapsedMilliseconds} ms). JSON schrijven…");

        WriteJson(players.Values, staff.Values);
        WriteDiag(mem, players, staff, offsetHist, candidates, sw.ElapsedMilliseconds);

        Plugin.Log.LogInfo($"Klaar in {sw.ElapsedMilliseconds} ms. Bestand in {OutDir}. " +
                           "Open de FMSuperScout web-app en klik Verversen.");
        WriteStatus("done", players.Count, staff.Count);   // web-app-banner leest dit
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

        // Marktwaarde: 0x234 is FM's echte transferwaarde (geverifieerd via offset-discovery
        // tegen in-game bedragen); 0x238 is de vraagprijs (meestal niet ingesteld).
        e.Value = MoneyVal(m.U32(pl + Fields.PLAO_GUIDE_VALUE));   // 0x234
        e.GuideValue = Money(m.U32(pl + Fields.PLAO_TRANSFER_VALUE)); // 0x238 (vraagprijs)
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
        e.CurRep = m.U16(pl + Fields.PLAO_CUR_REP);
        e.WorldRep = m.U16(pl + Fields.PLAO_WORLD_REP);
        e.Ambition = ClampAttr(m.U8(person + Fields.PERO_AMBITION));
        e.Loyalty = ClampAttr(m.U8(person + Fields.PERO_LOYALTY));
        e.Professionalism = ClampAttr(m.U8(person + Fields.PERO_PROFESSIONALISM));
        e.Adaptability = ClampAttr(m.U8(person + Fields.PERO_ADAPTABILITY));
        e.Pressure = ClampAttr(m.U8(person + Fields.PERO_PRESSURE));
        e.Sportsmanship = ClampAttr(m.U8(person + Fields.PERO_SPORTSMANSHIP));
        e.Temperament = ClampAttr(m.U8(person + Fields.PERO_TEMPERAMENT));
        e.Controversy = ClampAttr(m.U8(person + Fields.PERO_CONTROVERSY));
        e.PersonAddr = person;
        e.PlAddr = pl;
        var (cname, crep) = ResolveClub(m, person);
        e.Club = cname; e.ClubRep = crep;
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

        ulong con = m.Ptr(person + Fields.PERO_FULL_CONTRACT);
        if (con != 0)
        {
            e.Wage = Money(m.U32(con + Fields.CON_WEEKLY_WAGE));
            e.Expires = FmDateIso(m.U32(con + Fields.CON_EXPIRY));
            e.Job = JobName(m.U8(con + 0x26));   // pero.Pcjo — echte functie uit contract
        }
        if (string.IsNullOrEmpty(e.Job)) e.Job = "Staflid";
        e.Club = ResolveClubName(m, person);
        return e;
    }

    private static int Attr(MemScan m, ulong addr)
    {
        int raw = m.U8(addr);
        int v = (int)System.Math.Floor(raw / 5.0 + 0.5);
        return System.Math.Clamp(v, 0, 20);
    }

    // Persoonlijkheid is als rauwe byte 1..20 opgeslagen (geen ×5).
    private static int ClampAttr(int raw) => raw is >= 1 and <= 20 ? raw : 0;

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

    // Fallback-club via contract-keten: contract(0xA8)→team(0x10)→club(0x30). Voor spelers
    // buiten geladen competities (die niet in een selectie-object staan). De squad-walk
    // overschrijft dit met de authoritatieve club. Ook gebruikt voor staf/manager.
    private static (string name, int rep) ResolveClub(MemScan m, ulong person)
    {
        ulong con = m.Ptr(person + (ulong)Fields.PERO_FULL_CONTRACT);
        if (con == 0) return (null, 0);
        ulong team = m.Ptr(con + 0x10);
        if (team == 0) return (null, 0);
        int rep = m.U16(team + 0xA8);
        if (rep is < 0 or > 12000) rep = 0;
        ulong club = m.Ptr(team + 0x30);
        return (club == 0 ? null : ClubNameOf(m, club), rep);
    }

    private static string ResolveClubName(MemScan m, ulong person) => ResolveClub(m, person).name;

    // Diagnose-helpers: clubnaam via directe pointer op person+off, en via de oude keten.
    private static string ClubNameAt(MemScan m, ulong addr)
    {
        ulong club = m.Ptr(addr);
        return club == 0 ? "-" : (ClubNameOf(m, club) ?? "-");
    }
    private static string ChainClubName(MemScan m, ulong person)
    {
        ulong con = m.Ptr(person + (ulong)Fields.PERO_FULL_CONTRACT);
        if (con == 0) return "-";
        ulong team = m.Ptr(con + 0x10);
        if (team == 0) return "-";
        ulong club = m.Ptr(team + 0x30);
        return club == 0 ? "-" : (ClubNameOf(m, club) ?? "-");
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

    // Echte functie uit personJobTypes-enum (byte op contract+0x26).
    private static readonly Dictionary<int, string> Jobs = new()
    {
        [1] = "Speler", [2] = "Coach", [3] = "Speler/Coach", [4] = "Voorzitter",
        [6] = "Directeur", [8] = "Algemeen directeur", [10] = "Technisch directeur",
        [12] = "Fysiotherapeut", [14] = "Scout", [16] = "Manager", [17] = "Speler/Manager",
        [20] = "Assistent-manager", [21] = "Speler/Assistent-manager", [22] = "Media-analist",
        [24] = "Algemeen manager", [26] = "Fitnesscoach", [27] = "Speler/Fitnesscoach",
        [34] = "Keeperstrainer", [35] = "Speler/Keeperstrainer", [36] = "Hoofd data-analyse",
        [38] = "Clubarts", [40] = "Hoofd sportwetenschap", [42] = "Data-analist",
        [44] = "Hoofdscout", [45] = "Speler/Hoofdscout", [46] = "Arts", [48] = "Sportwetenschapper",
        [49] = "Speler/Jeugdtrainer", [50] = "Hoofd fysiotherapie", [52] = "U19-manager",
        [54] = "Trainer eerste elftal", [64] = "Hoofd jeugdopleiding", [65] = "Speler/Hoofd jeugd",
        [66] = "Eigenaar", [70] = "President", [86] = "Loanmanager", [88] = "Technisch directeur",
        [144] = "Interim-manager",
    };
    private static string JobName(int v) => Jobs.TryGetValue(v, out var s) ? s : null;

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
        // Afgeleid seizoensjaar met de systeemmaand/-dag (jaar is het betrouwbare deel).
        int gy = GameYear > 0 ? GameYear : DateTime.Now.Year;
        j.Prop("gameDate", $"{gy:D4}-{DateTime.Now:MM-dd}");
        j.Prop("gameYear", gy);
        j.Prop("manager", ManagerName);
        j.Prop("myClub", MyClub);
        j.Prop("myClubRep", MyClubRep);
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
        if (p.BirthYear > 0) { j.Prop("dob", $"{p.BirthYear:D4}"); j.Prop("birthYear", p.BirthYear); j.Prop("birthDoy", p.BirthDoy); }
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
            j.Prop("clubRep", p.ClubRep);
            j.Prop("worldRep", p.WorldRep);
            j.Prop("ambition", p.Ambition);
            j.Prop("loyalty", p.Loyalty);
            j.Prop("professionalism", p.Professionalism);
            j.Prop("adaptability", p.Adaptability);
            j.Prop("pressure", p.Pressure);
            j.Prop("sportsmanship", p.Sportsmanship);
            j.Prop("temperament", p.Temperament);
            j.Prop("controversy", p.Controversy);
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
            w.WriteLine($"Mijn club: {ManagerName} · {MyClub} · reputatie={MyClubRep}");
            w.WriteLine($"Clubs gedetecteerd: {ClubCount} · spelers via selectie gekoppeld: {LinkedViaSquad}");
            w.WriteLine();
            w.WriteLine("=== TOP-20 CA — huidige club (via selectie) vs alternatieven ===");
            w.WriteLine("(FINAL = wat de app toont; vergelijk met in-game. 0x80=geboorteplaats, 0x108/keten=oude bron)");
            foreach (var p in players.Values.OrderByDescending(x => x.Ca).Take(20))
            {
                string c108 = ClubNameAt(m, p.PersonAddr + 0x108);
                string cChain = ChainClubName(m, p.PersonAddr);
                w.WriteLine($"  {p.Name,-22} CA{p.Ca} rep={p.ClubRep,-5} | FINAL={p.Club ?? "-"} | 0x108={c108} | keten={cChain}");
            }
            w.WriteLine();
            w.WriteLine("Sample spelers (eerste 12) — let op reputatie-schaal (clubRep/worldRep):");
            foreach (var p in players.Values.Take(12))
                w.WriteLine($"  uid={p.Uid} {p.Name} lft={p.Age} CA={p.Ca} PA={p.Pa} pos={string.Join("/", p.PosArr)} club={p.Club} clubRep={p.ClubRep} worldRep={p.WorldRep} nat={string.Join(",", p.Nat)} val={p.Value} wage={p.Wage} exp={p.Expires}");
            w.WriteLine();
            w.WriteLine("Sample staf (eerste 8):");
            foreach (var p in staff.Values.Take(8))
                w.WriteLine($"  uid={p.Uid} {p.Name} lft={p.Age} CA={p.Ca} PA={p.Pa} rol={p.Job} club={p.Club}");
            w.WriteLine();

            // === WAARDE-OFFSET DISCOVERY ===
            // Doel: het geheugenveld vinden dat FM's echte transferwaarde bevat (zoals GenieScout leest).
            // Voor bekende spelers loggen we alle "geld-achtige" u32-waarden in een venster op het
            // player-data-object. Zoek in GenieScout de echte waarde van deze spelers op; de offset
            // waarvan de waarde (in £; €-bedrag ÷ 1,16) klopt over meerdere spelers is de juiste.
            w.WriteLine("=== WAARDE-OFFSET DISCOVERY ===");
            w.WriteLine("(Zoek onderstaande spelers in GenieScout; geef mij hun exacte waarde. Money-achtige u32 op pl+offset:)");
            bool Moneyish(uint v) => v >= 50_000u && v <= 600_000_000u && v != 0xFFFFFFFFu;
            foreach (var p in players.Values.Where(x => x.PlAddr != 0).OrderByDescending(x => x.Ca).Take(20))
            {
                var hits = new List<string>();
                for (int off = 0x160; off <= 0x320; off += 4)
                {
                    uint v = m.U32(p.PlAddr + (ulong)off);
                    if (Moneyish(v)) hits.Add($"0x{off:X}={v:N0}");
                }
                w.WriteLine($"  {p.Name,-22} CA{p.Ca} lft{p.Age} wage={p.Wage} val0x238={p.Value} clubRep={p.ClubRep}");
                w.WriteLine($"      {string.Join("  ", hits)}");
            }
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
    public bool NotForSale;
    public bool SetForRelease;
    public int CurRep;
    public int WorldRep;
    public int ClubRep;
    public int Ambition;
    public int Loyalty;
    public int Professionalism;
    public int Adaptability;
    public int Pressure;
    public int Sportsmanship;
    public int Temperament;
    public int Controversy;
    public ulong PersonAddr;
    public ulong PlAddr;      // player-data object (basePtr), voor de waarde-offset-diagnose
    public string Job;
    public Dictionary<string, int> Attrs = new();
    public Dictionary<string, int> StaffAttrs = new();
}
