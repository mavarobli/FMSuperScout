namespace FMSuperScout;

// A live name identifies the applicable variant even when licensed and
// unlicensed names share a database ID. Keep the live name authoritative.
internal sealed class FmClubResources
{
    private const string English = "8";
    private const string SimplifiedChinese = "1000002";
    private const string PersonNamesMember = SimplifiedChinese + "person_names.dat";

    private enum Table { Club = 3, Nation = 9, Competition = 25 }

    private readonly record struct Names(string Full, string Short, string Abbreviation)
    {
        public Names FillMissing(Names other) => new(Prefer(Full, other.Full), Prefer(Short, other.Short),
            Prefer(Abbreviation, other.Abbreviation));

        public string ForSource(string source, Names destination)
        {
            if (Matches(source, Full)) return Prefer(destination.Full, destination.Short);
            if (Matches(source, Short)) return Prefer(destination.Short, destination.Full);
            if (Matches(source, Abbreviation)) return Prefer(destination.Abbreviation, destination.Short);
            return null;
        }

        public bool MatchesAny(string source) => Matches(source, Full) || Matches(source, Short)
            || Matches(source, Abbreviation);

        public string[] Aliases(string source) => new[] { Full, Short, Abbreviation }
            .Where(name => !string.IsNullOrWhiteSpace(name) && !Matches(source, name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        private static bool Matches(string source, string name) => !string.IsNullOrEmpty(name)
            && string.Equals(source, name, StringComparison.OrdinalIgnoreCase);

        private static string Prefer(string first, string second) => string.IsNullOrEmpty(first) ? second : first;
    }

    private readonly record struct LocalizedNames(Names EnglishNames, Names ChineseNames)
    {
        public string Alias(string source, bool inEnglish)
        {
            var destination = inEnglish ? EnglishNames : ChineseNames;
            return EnglishNames.ForSource(source, destination) ?? ChineseNames.ForSource(source, destination);
        }

        public string[] OppositeAliases(string source)
        {
            if (EnglishNames.MatchesAny(source)) return ChineseNames.Aliases(source);
            if (ChineseNames.MatchesAny(source)) return EnglishNames.Aliases(source);
            return null;
        }
    }

    private sealed class Catalog
    {
        public readonly Dictionary<uint, LocalizedNames> Clubs;
        public readonly Dictionary<uint, LocalizedNames> Competitions;
        public readonly Dictionary<uint, LocalizedNames> Nations;

        public Catalog(FmLanguageArchive archive, int major)
        {
            Clubs = ReadNames(archive, Table.Club, major);
            Competitions = ReadNames(archive, Table.Competition, major);
            Nations = ReadNames(archive, Table.Nation, major);
        }

        public Dictionary<uint, LocalizedNames> Entries(Table table) => table switch
        {
            Table.Club => Clubs,
            Table.Competition => Competitions,
            _ => Nations,
        };
    }

    private readonly Catalog primary;
    private readonly Catalog general;
    private readonly string archivePath;
    private readonly string baseArchivePath;

    private FmClubResources(Catalog primary, Catalog general, string archivePath, string baseArchivePath)
    {
        this.primary = primary;
        this.general = general;
        this.archivePath = archivePath;
        this.baseArchivePath = baseArchivePath;
    }

    // FM26's 2620 update supplies a full set of translations, while FM27
    // supplies a separate small catalog for certain unlicensed names.
    public static FmClubResources Load(string gameDirectory, int gameMajor)
    {
        string db = Path.Combine(gameDirectory, "shared", "data", "database", "db");
        string version = $"{gameMajor}00";
        string folder = Path.Combine(db, version, version + "_fm");
        string basePath = Path.Combine(folder, "lang_db.dat");
        string path = basePath;
        if (gameMajor == 26)
        {
            string update = Path.Combine(db, "2620", "2620_fm", "lang_update_db.dat");
            if (File.Exists(update)) path = update;
        }
        if (!File.Exists(path)) return null;

        using var mainArchive = FmLanguageArchive.Open(path);
        var main = new Catalog(mainArchive, gameMajor);
        string generalPath = Path.Combine(folder, "lang_db_general.dat");
        Catalog general = null;
        if (File.Exists(generalPath))
        {
            try
            {
                using var generalArchive = FmLanguageArchive.Open(generalPath);
                general = new Catalog(generalArchive, gameMajor);
            }
            catch (Exception error) when (error is IOException or UnauthorizedAccessException or InvalidDataException)
            {
                Host.Warn($"Could not read FM's optional general language catalog: {error.Message}");
            }
        }
        return new FmClubResources(main, general, path, basePath);
    }

    public byte[] ReadPersonNames()
    {
        using var archive = FmLanguageArchive.Open(archivePath);
        return archive.ReadMember(PersonNamesMember);
    }

    // Older saves can still use the base database when the update is installed.
    public byte[] ReadBasePersonNames()
    {
        if (archivePath == baseArchivePath || !File.Exists(baseArchivePath)) return null;

        using var archive = FmLanguageArchive.Open(baseArchivePath);
        return archive.ReadMember(PersonNamesMember);
    }

    public string NationEnglish(uint id, string liveName) => Find(Table.Nation, id, liveName, true);

    public string Nation(uint id, string liveName) => Find(Table.Nation, id, liveName, false);

    public string[] ClubAliases(uint id, string liveName) => FindAliases(Table.Club, id, liveName);
    public string[] CompetitionAliases(uint id, string liveName) => FindAliases(Table.Competition, id, liveName);

    private string[] FindAliases(Table table, uint id, string liveName)
    {
        if (id == 0 || id == uint.MaxValue || string.IsNullOrWhiteSpace(liveName)) return Array.Empty<string>();

        string[] primaryAliases = primary.Entries(table).TryGetValue(id, out var names)
            ? names.OppositeAliases(liveName) : null;
        string[] generalAliases = general != null && general.Entries(table).TryGetValue(id, out var alternate)
            ? alternate.OppositeAliases(liveName) : null;

        // Some variants have a shared short name. Only emit their common aliases
        // when a live name does not establish which of those variants is active.
        return primaryAliases != null && generalAliases != null
            ? primaryAliases.Intersect(generalAliases, StringComparer.OrdinalIgnoreCase).ToArray()
            : primaryAliases ?? generalAliases ?? Array.Empty<string>();
    }

    private string Find(Table table, uint id, string liveName, bool inEnglish)
    {
        if (id == 0 || id == uint.MaxValue || string.IsNullOrWhiteSpace(liveName)) return null;
        if (general != null && general.Entries(table).TryGetValue(id, out var alternate))
        {
            string alias = alternate.Alias(liveName, inEnglish);
            if (!string.IsNullOrEmpty(alias)) return alias;
        }
        return primary.Entries(table).TryGetValue(id, out var names) ? names.Alias(liveName, inEnglish) : null;
    }

    private static Dictionary<uint, LocalizedNames> ReadNames(FmLanguageArchive archive, Table table, int major)
    {
        var english = ReadTable(archive.ReadMember($"{English}_{(int)table}.dat"), table, major);
        var chinese = ReadTable(archive.ReadMember($"{SimplifiedChinese}_{(int)table}.dat"), table, major);
        var joint = new Dictionary<uint, LocalizedNames>(Math.Min(english.Count, chinese.Count));
        foreach (var (id, englishNames) in english)
        {
            if (chinese.TryGetValue(id, out var chineseNames))
                joint.Add(id, new LocalizedNames(englishNames, chineseNames));
        }
        return joint;
    }

    private static Dictionary<uint, Names> ReadTable(byte[] data, Table table, int major)
    {
        if (data == null) return new();
        if (data.Length < 12 || data[0] != 3 || data[1] != 1 || !data.AsSpan(2, 4).SequenceEqual("tad."u8))
            throw new InvalidDataException("Unrecognized FM language member header.");

        var reader = new FmLanguageReader(data.AsSpan(8));
        uint count = reader.ReadUInt32();
        if (count > reader.Remaining / 16) throw new InvalidDataException("Invalid FM language record count.");
        var names = new Dictionary<uint, Names>((int)count);

        for (int i = 0; i < count; i++)
        {
            uint id = reader.ReadUInt32();
            string full = reader.ReadString();
            reader.Skip(1);
            string shortName = reader.ReadString();
            reader.Skip(1);
            string abbreviation = reader.ReadString();

            switch (table)
            {
                case Table.Club:
                    reader.SkipString(); // country-independent club code
                    reader.SkipString(); // alternate short code
                    reader.Skip(1);
                    reader.SkipString(); // nickname
                    reader.Skip(4);
                    if (major >= 27) reader.SkipString(); // auxiliary name introduced by FM27
                    break;
                case Table.Competition:
                    reader.Skip(1);
                    break;
                case Table.Nation:
                    reader.SkipString(); // demonym
                    int variants = reader.ReadByte();
                    for (int variant = 0; variant < variants; variant++)
                    {
                        reader.SkipString();
                        reader.Skip(3);
                    }
                    break;
            }

            var entry = new Names(full, shortName, abbreviation);
            // Some localization rows repeat the same ID with only one populated name.
            if (names.TryGetValue(id, out var previous)) entry = previous.FillMissing(entry);
            names[id] = entry;
        }

        reader.RequireEnd();
        return names;
    }
}
