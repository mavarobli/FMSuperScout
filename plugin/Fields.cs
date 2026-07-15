namespace FMSuperScout;

/// <summary>
/// FM26-geheugenoffsets, ontleend aan de gedecompileerde Cheat Engine-tabellen
/// (tdg6661, gepind op FM 26.3.x — game_plugin.dll 26.3.0/26.3.2).
/// Alle offsets zijn t.o.v. een objectbasis; zie commentaar per groep.
/// </summary>
internal static class Fields
{
    // Game-versie waarop deze offsets zijn gepind (major.minor van game_plugin.dll).
    // Wijkt de geladen game hiervan af, dan waarschuwt de web-app dat de data
    // mogelijk onbetrouwbaar is tot de offsets opnieuw geverifieerd zijn.
    public const int SUPPORTED_MAJOR = 26;
    public const int SUPPORTED_MINOR = 3;
    public const string SUPPORTED_VERSION = "26.3";

    // --- Object-header (elk DB-object) ---
    public const int OBJ_DUNI = 0x0C;         // uint32 Unique ID (UID)

    // --- Dynamische offsets (meta+4 → persoonsveld-offset per class) ---
    public const int PLAYER_OFFSET = 0x288;   // pure speler
    public const int PLAYER_STAFF_OFFSET = 0x380; // speler die ook staf is
    public const int STAFF_OFFSET = 0x100;    // pure staf (non-player)
    public const int HUMAN_MANAGER_OFFSET = 0x450;

    // --- Speler-blok (plao); basis = player = person - dynamicOffset ---
    public const int PLAO_CA = 0x264;         // u16, echte waarde 1..200
    public const int PLAO_PA = 0x266;         // u16
    public const int PLAO_HOME_REP = 0x25E;   // u16
    public const int PLAO_CUR_REP = 0x260;    // u16
    public const int PLAO_WORLD_REP = 0x262;  // u16
    public const int PLAO_CONDITION = 0x258;  // u16
    public const int PLAO_MORALE = 0x26C;     // byte
    public const int PLAO_HEIGHT = 0x22E;     // u16 (cm)
    public const int PLAO_POSITIONS = 0x150;  // 15 bytes (0..20 geschiktheid)
    public const int PLAO_ATTRS = 0x15F;      // 55 bytes, opgeslagen ×5
    public const int PLAO_GUIDE_VALUE = 0x234;   // u32 GBP
    public const int PLAO_TRANSFER_VALUE = 0x238; // u32 GBP

    // --- Persoon-blok (pero); basis = person ---
    // Geslacht: byte op person+0x19, bit 0x10 gezet = vrouw. Gepind 15-07 via discovery v3
    // (jeugd-man vs jeugd-vrouw): 0x18 bit 0x08 bleek de JEUGD-vlag (bij álle jeugd gezet),
    // maar 0x19 bit 0x10 is zuiver geslacht — 9 mannen (jong+oud+elite+lager) 0x02, alle
    // vrouwen 0x12. Eerdere pins 0x0A en 0x18 waren beide jeugd/teamtype-vlaggen.
    public const int PERO_GENDER = 0x19;
    public const int GENDER_FEMALE_BIT = 0x10;
    public const int PERO_FIRST_NAME = 0x50;  // nested string
    public const int PERO_SECOND_NAME = 0x58;
    public const int PERO_COMMON_NAME = 0x60;
    public const int PERO_NATION = 0x68;      // ptr → nation
    public const int PERO_DOB = 0x88;         // u32 FM-datum
    public const int PERO_FULL_CONTRACT = 0xA8; // ptr → contract-object

    // Verborgen persoonlijkheid (pero.Pada), bytes 1..20:
    public const int PERO_ADAPTABILITY = 0x70;
    public const int PERO_AMBITION = 0x71;
    public const int PERO_LOYALTY = 0x72;
    public const int PERO_PRESSURE = 0x73;
    public const int PERO_PROFESSIONALISM = 0x74;
    public const int PERO_SPORTSMANSHIP = 0x75;
    public const int PERO_TEMPERAMENT = 0x76;
    public const int PERO_CONTROVERSY = 0x77;

    // --- In het contract-object (via [person+PERO_FULL_CONTRACT]) ---
    public const int CON_WEEKLY_WAGE = 0x20;  // u32 GBP p/w
    public const int CON_EXPIRY = 0x48;       // u32 FM-datum
    public const int CON_SQUAD_NUMBER = 0x5D; // byte
    public const int CON_STATUS_FLAGS = 0x57; // byte bitfield (transferstatus)
    //   bit0 = Listed, bit3 = Listed by Request, bit4 = Not for Sale, bit5 = Set for Release

    // --- Nation ---
    public const int NATION_SHORT_NAME = 0x20; // indirecte string
    public const int NATION_NAME = 0x30;

    // --- Team → competitie (gepind via diepe offset-kaart Feyenoord, 14-07-2026) ---
    public const int TEAM_COMP = 0x50;         // ptr → competitie-object
    public const int TEAM_COMP_ALT = 0x60;     // idem (beide wezen naar de Eredivisie)
    public const int COMP_NAME = 0x40;         // indirecte string, volledige (sponsor)naam
    public const int COMP_SHORT_NAME = 0x48;   // indirecte string, korte naam ("Eredivisie")

    // Fixture/schema-object van een team: [team+0xA0]; +0x94 = eerstvolgende wedstrijddatum
    // (= "vandaag" op wedstrijddagen, anders enkele dagen vooruit). Gepind 15-07-2026.
    public const int TEAM_SCHEDULE = 0xA0;
    public const int SCHED_NEXT_MATCH = 0x94;
    public const int SCHED_NEXT_MATCH_ALT = 0x18;   // droeg dezelfde datum in alle metingen

    // --- Staf-blok (nplo); basis = staffBase = person - dynamicOffset ---
    public const int NPLO_CA = 0xDA;          // u16
    public const int NPLO_PA = 0xDC;          // u16
    public const int NPLO_HOME_REP = 0xD4;    // u16
    public const int NPLO_CUR_REP = 0xD6;     // u16
    public const int NPLO_WORLD_REP = 0xD8;   // u16
    public const int NPLO_ATTRS = 0x10;       // basis staf-attributen

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

    // Staf-attributen (web-app-sleutel → offset vanaf NPLO_ATTRS). Meeste ÷5.
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
}
