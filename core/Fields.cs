namespace FMSuperScout;

/// <summary>
/// Geheugenindeling per FM-versie. FM26 is ontleend aan de gedecompileerde Cheat
/// Engine-tabellen (tdg6661, gepind op FM 26.3.x — game_plugin.dll 26.3.0/26.3.2); FM27 is
/// daarvan afgeleid en per veld opnieuw geverifieerd tegen een draaiende FM 27.0 (zie
/// <see cref="FM27"/>). Alle offsets zijn t.o.v. een objectbasis; zie commentaar per groep.
///
/// Een nieuwe FM-versie of grote patch = een nieuwe layout met alleen de afwijkende velden
/// (<c>FM26.With(f => ...)</c>) en een regel in <see cref="ForVersion"/>. Werkwijze:
/// docs/repin-guide.md.
/// </summary>
internal sealed class Fields
{
    // Game waarvoor deze layout geldt, en de game_plugin.dll-versie (major.minor) waarop de
    // offsets gepind zijn. Wijkt de minor af, dan waarschuwt de web-app dat de data mogelijk
    // onbetrouwbaar is tot de offsets opnieuw geverifieerd zijn.
    public string Game { get; private set; } = "FM26";
    public int SupportedMajor { get; private set; } = 26;
    public int SupportedMinor { get; private set; } = 3;
    public string SupportedVersion => $"{SupportedMajor}.{SupportedMinor}";

    // --- Object-header (elk DB-object) ---
    public uint OBJ_DUNI { get; private set; } = 0x0C;         // uint32 Unique ID (UID)

    // --- Dynamische offsets (meta+4 → persoonsveld-offset per class) ---
    public uint PLAYER_OFFSET { get; private set; } = 0x288;   // pure speler
    public uint PLAYER_STAFF_OFFSET { get; private set; } = 0x380; // speler die ook staf is
    public uint STAFF_OFFSET { get; private set; } = 0x100;    // pure staf (non-player)
    public uint HUMAN_MANAGER_OFFSET { get; private set; } = 0x450;

    // --- Speler-blok (plao); basis = player = person - dynamicOffset ---
    public uint PLAO_CA { get; private set; } = 0x264;         // u16, echte waarde 1..200
    public uint PLAO_PA { get; private set; } = 0x266;         // u16
    public uint PLAO_HOME_REP { get; private set; } = 0x25E;   // u16
    public uint PLAO_CUR_REP { get; private set; } = 0x260;    // u16
    public uint PLAO_WORLD_REP { get; private set; } = 0x262;  // u16
    public uint PLAO_CONDITION { get; private set; } = 0x258;  // u16
    public uint PLAO_MORALE { get; private set; } = 0x26C;     // byte
    public uint PLAO_HEIGHT { get; private set; } = 0x22E;     // u16 (cm)
    public uint PLAO_POSITIONS { get; private set; } = 0x150;  // 15 bytes (0..20 geschiktheid)
    public uint PLAO_ATTRS { get; private set; } = 0x15F;      // 55 bytes, opgeslagen ×5
    public uint PLAO_GUIDE_VALUE { get; private set; } = 0x234;   // u32 GBP
    public uint PLAO_TRANSFER_VALUE { get; private set; } = 0x238; // u32 GBP

    // --- Persoon-blok (pero); basis = person ---
    // Geslacht: byte op person+0x19, bit 0x10 gezet = vrouw. Gepind 15-07 via discovery v3
    // (jeugd-man vs jeugd-vrouw): 0x18 bit 0x08 bleek de JEUGD-vlag (bij álle jeugd gezet),
    // maar 0x19 bit 0x10 is zuiver geslacht — 9 mannen (jong+oud+elite+lager) 0x02, alle
    // vrouwen 0x12. Eerdere pins 0x0A en 0x18 waren beide jeugd/teamtype-vlaggen.
    public uint PERO_GENDER { get; private set; } = 0x19;
    public uint GENDER_FEMALE_BIT { get; private set; } = 0x10;
    public uint PERO_FIRST_NAME { get; private set; } = 0x50;  // nested string
    public uint PERO_SECOND_NAME { get; private set; } = 0x58;
    public uint PERO_COMMON_NAME { get; private set; } = 0x60;
    public uint PERO_NATION { get; private set; } = 0x68;      // ptr → nation
    public uint PERO_DOB { get; private set; } = 0x88;         // u32 FM-datum
    public uint PERO_FULL_CONTRACT { get; private set; } = 0xA8; // ptr → contract-object
    // ptr → 15 bytes (1..20): voorkeur per functiegroep, hoogste = FM's "Voorkeursbaan".
    // Gepind 04-11-2026 op FM27 (zie Dumper.ReadJobPrefs); op FM26 niet geverifieerd.
    public uint PERO_JOB_PREFS { get; private set; } = 0xD0;

    // Verborgen persoonlijkheid (pero.Pada), bytes 1..20:
    public uint PERO_ADAPTABILITY { get; private set; } = 0x70;
    public uint PERO_AMBITION { get; private set; } = 0x71;
    public uint PERO_LOYALTY { get; private set; } = 0x72;
    public uint PERO_PRESSURE { get; private set; } = 0x73;
    public uint PERO_PROFESSIONALISM { get; private set; } = 0x74;
    public uint PERO_SPORTSMANSHIP { get; private set; } = 0x75;
    public uint PERO_TEMPERAMENT { get; private set; } = 0x76;
    public uint PERO_CONTROVERSY { get; private set; } = 0x77;

    // --- In het contract-object (via [person+PERO_FULL_CONTRACT]) ---
    public uint CON_WEEKLY_WAGE { get; private set; } = 0x20;  // u32 GBP p/w
    public uint CON_EXPIRY { get; private set; } = 0x48;       // u32 FM-datum
    public uint CON_SQUAD_NUMBER { get; private set; } = 0x5D; // byte
    public uint CON_STATUS_FLAGS { get; private set; } = 0x57; // byte bitfield (transferstatus)
    //   bit0 = Listed, bit3 = Listed by Request, bit4 = Not for Sale, bit5 = Set for Release

    // --- Nation ---
    public uint NATION_SHORT_NAME { get; private set; } = 0x20; // indirecte string
    public uint NATION_NAME { get; private set; } = 0x30;

    // --- Team → competitie (gepind via diepe offset-kaart Feyenoord, 14-07-2026) ---
    public uint TEAM_COMP { get; private set; } = 0x50;         // ptr → competitie-object
    public uint TEAM_COMP_ALT { get; private set; } = 0x60;     // idem (beide wezen naar de Eredivisie)
    public uint COMP_NAME { get; private set; } = 0x40;         // indirecte string, volledige (sponsor)naam
    public uint COMP_SHORT_NAME { get; private set; } = 0x48;   // indirecte string, korte naam ("Eredivisie")

    // Fixture/schema-object van een team: [team+0xA0]; +0x94 = eerstvolgende wedstrijddatum
    // (= "vandaag" op wedstrijddagen, anders enkele dagen vooruit). Gepind 15-07-2026.
    public uint TEAM_SCHEDULE { get; private set; } = 0xA0;
    public uint SCHED_NEXT_MATCH { get; private set; } = 0x94;
    public uint SCHED_NEXT_MATCH_ALT { get; private set; } = 0x18;   // droeg dezelfde datum in alle metingen

    // --- Staf-blok (nplo); basis = staffBase = person - dynamicOffset ---
    public uint NPLO_CA { get; private set; } = 0xDA;          // u16
    public uint NPLO_PA { get; private set; } = 0xDC;          // u16
    public uint NPLO_HOME_REP { get; private set; } = 0xD4;    // u16
    public uint NPLO_CUR_REP { get; private set; } = 0xD6;     // u16
    public uint NPLO_WORLD_REP { get; private set; } = 0xD8;   // u16
    public uint NPLO_ATTRS { get; private set; } = 0x10;       // basis staf-attributen


    // Club → teams → selectie. Club: teamvector [club+0x18, club+0x20); team: selectievector
    // [team+0x38, team+0x40). Contract → team → club is de keten voor de moederclub.
    public uint CLUB_TEAMS_BEGIN { get; private set; } = 0x18;
    public uint CLUB_TEAMS_END { get; private set; } = 0x20;
    public uint CLUB_NAME { get; private set; } = 0xC0;        // indirecte string (cluo.Cnam)
    public uint CLUB_SHORT_NAME { get; private set; } = 0xC8;  // indirecte string (cluo.Csnm)
    public uint TEAM_TYPE { get; private set; } = 0x28;        // byte: 0 = 1e elftal, ~3 = reserves, ≥10 = jeugd
    public uint TEAM_CLUB { get; private set; } = 0x30;        // ptr → club (teao.Tclu)
    public uint TEAM_PLAYERS_BEGIN { get; private set; } = 0x38;
    public uint TEAM_PLAYERS_END { get; private set; } = 0x40;
    public uint TEAM_MANAGER { get; private set; } = 0x80;     // ptr → person van de teammanager
    public uint TEAM_REP { get; private set; } = 0xA8;         // u16 reputatie (~0..10000)
    public uint CON_TEAM { get; private set; } = 0x10;         // ptr → team (pero.Pcti)
    public uint CON_JOB { get; private set; } = 0x26;          // byte: functie (personJobTypes, pero.Pcjo)

    // Transferdeals (FM27, gemeten 05-11-2026). Records van 0xC8 bytes in een tabel zonder
    // vtable; herkend op vorm: [+0x00] person, [+0x08] team koper, [+0x18] team verkoper,
    // [+0x2C] = FFFFFFFF en [+0x34] = 0x076C0001 (lege datum). Status-byte: 0x14 afgerond,
    // 0x13 akkoord maar nog niet uitgevoerd, 0x0F afgewezen; overige = lopend/vervallen.
    // Census over ~3.800 deals: alle 180 toekomstige deals hebben 0x13. Het bedrag (+0x20)
    // is niet betrouwbaar (vaak exact de marktwaarde) en wordt niet gebruikt.
    public uint DEAL_TO_TEAM { get; private set; } = 0x08;
    public uint DEAL_FROM_TEAM { get; private set; } = 0x18;
    public uint DEAL_SENT1 { get; private set; } = 0x2C;       // u32 = 0xFFFFFFFF
    public uint DEAL_SENT2 { get; private set; } = 0x34;       // u32 = 0x076C0001
    public uint DEAL_DATE { get; private set; } = 0x44;        // u32 FM-datum: ingangsdatum transfer
    public uint DEAL_STATUS { get; private set; } = 0x55;      // byte, zie boven
    public byte DEAL_STATUS_AGREED { get; private set; } = 0x13;

    /// <summary>FM26, gepind op 26.3.x.</summary>
    public static readonly Fields FM26 = new();

    /// <summary>
    /// FM27 (Unity 6000.3, game_plugin.dll 27.0). De database-layout is vrijwel ongewijzigd
    /// t.o.v. FM26; geverifieerd 02-11-2026 tegen een draaiende FM 27.0-save.
    /// </summary>
    public static readonly Fields FM27 = FM26.With(f =>
    {
        f.Game = "FM27"; f.SupportedMajor = 27; f.SupportedMinor = 0;
        f.HUMAN_MANAGER_OFFSET = 0x440;   // FM26: 0x450 (piekpaar 0x440/0x468 in het histogram)
    });

    // Kopie met alleen de afwijkende velden. Geen record/with: records genereren
    // NullableAttribute-gebruik, en die attribuut-klasse is uitgekleed in de Il2Cpp-referenties.
    private Fields With(Action<Fields> change)
    {
        var copy = (Fields)MemberwiseClone();
        change(copy);
        return copy;
    }

    /// <summary>Layout bij een game_plugin.dll-hoofdversie; null = onbekende FM-versie.</summary>
    public static Fields ForVersion(int major) => major switch
    {
        26 => FM26,
        27 => FM27,
        _ => null,
    };

    /// <summary>Alle bekende layouts, nieuwste eerst (fallback bij onbekende versie-info).</summary>
    public static readonly Fields[] All = { FM27, FM26 };

    // Spelerattributen: sleutel (web-app) → offset vanaf PLAO_ATTRS. Opgeslagen ×5.
    public static readonly (string key, int off)[] PlayerAttrs =
    {
        ("Crossing", 0x00), ("Dribbling", 0x01), ("Finishing", 0x02), ("Heading", 0x03),
        ("LongShots", 0x04), ("Marking", 0x05), ("OffTheBall", 0x06), ("Passing", 0x07),
        ("PenaltyTaking", 0x08), ("Tackling", 0x09), ("Vision", 0x0A), ("Handling", 0x0B),
        ("AerialReach", 0x0C), ("CommandOfArea", 0x0D), ("Communication", 0x0E), ("Kicking", 0x0F),
        ("Throwing", 0x10), ("Anticipation", 0x11), ("Decisions", 0x12), ("OneOnOnes", 0x13),
        ("Positioning", 0x14), ("Reflexes", 0x15), ("FirstTouch", 0x16), ("Technique", 0x17),
        ("Flair", 0x1A), ("Corners", 0x1B), ("Teamwork", 0x1C), ("WorkRate", 0x1D),
        ("LongThrows", 0x1E), ("Eccentricity", 0x1F), ("RushingOut", 0x20), ("Punching", 0x21),
        ("Acceleration", 0x22), ("FreeKicks", 0x23), ("Strength", 0x24), ("Stamina", 0x25),
        ("Pace", 0x26), ("JumpingReach", 0x27), ("Leadership", 0x28), ("Balance", 0x2A),
        ("Bravery", 0x2B), ("Aggression", 0x2D), ("Agility", 0x2E), ("NaturalFitness", 0x32),
        ("Determination", 0x33), ("Composure", 0x34), ("Concentration", 0x35),
    };

    // "Verborgen" spelerattributen (ook ÷5) — handig voor scouting.
    public static readonly (string key, int off)[] PlayerHiddenAttrs =
    {
        ("Dirtiness", 0x29), ("Consistency", 0x2C), ("ImportantMatches", 0x2F),
        ("InjuryProneness", 0x30), ("Versatility", 0x31),
    };

    public const int FOOT_LEFT = 0x18;
    public const int FOOT_RIGHT = 0x19;

    // Positie-index (byte 0..20) vanaf PLAO_POSITIONS.
    public static readonly (string key, int off)[] Positions =
    {
        ("GK", 0x00), ("SW", 0x01), ("DL", 0x02), ("DC", 0x03), ("DR", 0x04), ("DM", 0x05),
        ("ML", 0x06), ("MC", 0x07), ("MR", 0x08), ("AML", 0x09), ("AMC", 0x0A), ("AMR", 0x0B),
        ("ST", 0x0C), ("WBL", 0x0D), ("WBR", 0x0E),
    };

    // Staf-attributen (web-app-sleutel → offset vanaf NPLO_ATTRS). Opgeslagen ×5, behalve de
    // sleutels in StaffAttrsRaw. Geverifieerd 02-11-2026 tegen FM27's stafprofiel (Oscar
    // Moens, Feyenoord) en per functie over 24k stafleden: "Jeugd" = Werken met jonge
    // spelers (ruw 1-20; hoofden jeugdopleiding gemiddeld 16 tegen ~12), "KV_reflexen" =
    // Keepen (keeperstrainers 10,7 tegen ~2,5), "KV_distributie" = Autoriteit (Oscar 14 =
    // Goed, Zeb Jacobs 15 = Zeer goed). "KV_vangen" is een nog onbekende mentale waarde
    // (~11 bij iedereen); de app toont hem niet. Sleutelnamen blijven ongewijzigd voor
    // compatibiliteit met oudere dumps.
    public static readonly (string key, int off)[] StaffAttrs =
    {
        ("Aanvallen", 0x22), ("Verdedigen", 0x23), ("Fitheid", 0x24), ("Balbezit", 0x25),
        ("Technisch", 0x26), ("Tactisch", 0x27), ("Standaardsituaties", 0x33),
        ("Vastberadenheid", 0x0D), ("Man-management", 0x1E), ("Motiveren", 0x1F),
        ("Oordeel_vermogen", 0x1C), ("Oordeel_potentie", 0x1D), ("Oordeel_staf", 0x32),
        ("Onderhandelen", 0x31), ("Tactische_kennis", 0x21), ("Fysiotherapie", 0x20),
        ("Sportwetenschap", 0x2F), ("Data_analyse", 0x2C), ("Jeugd", 0x0C),
        ("KV_distributie", 0x2A), ("KV_vangen", 0x29), ("KV_reflexen", 0x1B),
    };
    public static readonly HashSet<string> StaffAttrsRaw = new() { "Jeugd" };

    // Functiegroepen van de voorkeurstabel (PERO_JOB_PREFS), afgeleid uit 26k FM27-stafleden
    // (hoogste groep tegen de functie-byte van het contract): 0 manager, 1 assistent-manager,
    // 2 trainer, 3 fysio, 4 scout, 5 keeperstrainer, 6 conditietrainer, 7 functie 22,
    // 8 bestuur (voorzitter/directeur/eigenaar), 9 directeur voetbalzaken, 10 hoofd
    // jeugdopleiding, 11 (ver)huurmanager, 12 analist (rekrutering én prestatie: FM slaat
    // geen subtype op), 13 sportwetenschap, 14 technisch directeur. De app vertaalt.
    public const int JobPrefGroups = 15;
}
