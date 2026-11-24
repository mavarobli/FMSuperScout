using System.Reflection;
using System.Text;
using ZstdSharp;

internal static class LanguageArchiveChecks
{
    private const uint ClubId = 6754321;
    private const uint CompetitionId = 7654321;
    private const string PersonMember = "1000002person_names.dat";

    public static void Run(Assembly scanner)
    {
        var archiveType = scanner.GetType("FMSuperScout.FmLanguageArchive", throwOnError: true);
        var resourceType = scanner.GetType("FMSuperScout.FmClubResources", throwOnError: true);
        var fixture = Directory.CreateTempSubdirectory("fmss-language-");
        try
        {
            string fm27 = DatabasePath(fixture.FullName, 2700);
            string main = Path.Combine(fm27, "lang_db.dat");
            string general = Path.Combine(fm27, "lang_db_general.dat");
            byte[] people = "fictional people table"u8.ToArray();
            WriteArchive(main,
                ("8_3.dat", Clubs(("Fixture City Football Club", "Fixture City", "FCF"))),
                ("1000002_3.dat", Clubs(("样本城足球俱乐部", "样本城", "样本城"))),
                ("8_25.dat", Competitions(("Fixture First League", "Fixture League", "FFL"))),
                ("1000002_25.dat", Competitions(("样本甲级联赛", "", ""), ("", "样本联赛", "样联"))),
                (PersonMember, people));
            WriteArchive(general,
                ("8_3.dat", Clubs(("Unlicensed City", "Fixture City", "FCF"))),
                ("1000002_3.dat", Clubs(("化名足球俱乐部", "样本城", "化名"))));

            object archive = archiveType.GetMethod("Open").Invoke(null, new object[] { main });
            using ((IDisposable)archive)
            {
                var read = archiveType.GetMethod("ReadMember");
                Equal("reads indexed UTF-8 member bytes", people, (byte[])read.Invoke(archive, new object[] { PersonMember }));
                if (read.Invoke(archive, new object[] { "missing.dat" }) != null)
                    throw new Exception("Unknown archive member should be absent.");
            }

            object resources = Load(27);
            Equal("Chinese to English aliases", new[] { "Fixture City Football Club", "Fixture City", "FCF" },
                Aliases("ClubAliases", ClubId, "样本城足球俱乐部"));
            Equal("English to Chinese aliases are unique", new[] { "样本城足球俱乐部", "样本城" },
                Aliases("ClubAliases", ClubId, "Fixture City Football Club"));
            Equal("alternate licenses use the exact live name", new[] { "化名足球俱乐部", "样本城", "化名" },
                Aliases("ClubAliases", ClubId, "Unlicensed City"));
            Equal("shared names include only common aliases", new[] { "样本城" },
                Aliases("ClubAliases", ClubId, "Fixture City"));
            Equal("unknown custom live names are preserved", Array.Empty<string>(),
                Aliases("ClubAliases", ClubId, "Custom Fixture"));
            Equal("identical live names with a different ID are unconfirmed", Array.Empty<string>(),
                Aliases("ClubAliases", ClubId + 1, "Fixture City Football Club"));
            Equal("partial duplicate competition rows merge", new[] { "样本甲级联赛", "样本联赛", "样联" },
                Aliases("CompetitionAliases", CompetitionId, "Fixture First League"));
            if (PersonNames("ReadBasePersonNames") != null)
                throw new Exception("FM27 should have only one person archive in the fixture.");

            File.WriteAllBytes(general, new byte[4]);
            resources = Load(27);
            Equal("corrupt optional archive preserves main aliases", new[] { "样本城足球俱乐部", "样本城" },
                Aliases("ClubAliases", ClubId, "Fixture City Football Club"));

            byte[] oldPeople = "fictional base people table"u8.ToArray();
            WriteArchive(Path.Combine(DatabasePath(fixture.FullName, 2600), "lang_db.dat"), (PersonMember, oldPeople));
            WriteArchive(Path.Combine(DatabasePath(fixture.FullName, 2620), "lang_update_db.dat"), (PersonMember, people));
            resources = Load(26);
            Equal("FM26 prefers the update person member", people, PersonNames("ReadPersonNames"));
            Equal("FM26 also exposes the base person member", oldPeople, PersonNames("ReadBasePersonNames"));

            Console.WriteLine("Passed language archive, alias and database selection checks.");

            object Load(int major) => resourceType.GetMethod("Load").Invoke(null, new object[] { fixture.FullName, major });
            byte[] PersonNames(string method) => (byte[])resourceType.GetMethod(method).Invoke(resources, Array.Empty<object>());
            string[] Aliases(string method, uint id, string name) =>
                (string[])resourceType.GetMethod(method).Invoke(resources, new object[] { id, name });
        }
        finally
        {
            fixture.Delete(recursive: true);
        }
    }

    private static string DatabasePath(string root, int version)
    {
        string path = Path.Combine(root, "shared", "data", "database", "db", version.ToString(), $"{version}_fm");
        Directory.CreateDirectory(path);
        return path;
    }

    private static void WriteArchive(string path, params (string Name, byte[] Data)[] members)
    {
        using var compressor = new Compressor();
        byte[][] payloads = members.Select(member => compressor.Wrap(member.Data).ToArray()).ToArray();
        byte[] indexBytes = WriteBytes(index =>
        {
            WriteString(index, "fixture");
            index.Write(members.Length);
            long offset = 0;
            for (int i = 0; i < members.Length; i++)
            {
                WriteString(index, Path.GetFileNameWithoutExtension(members[i].Name));
                WriteString(index, Path.GetExtension(members[i].Name));
                index.Write(offset);
                index.Write((long)payloads[i].Length);
                index.Write((long)members[i].Data.Length);
                index.Write(new byte[16]);
                offset += payloads[i].Length;
            }
            index.Write(0);
        });

        using var output = new BinaryWriter(File.Create(path));
        output.Write(Convert.FromHexString("03017461642EA00FA90E09000201666D662E080000"));
        long indexFrame = 38 + payloads.Sum(frame => frame.Length) + 9;
        output.Write(indexFrame - 30);
        output.Write(new byte[9]);
        foreach (var frame in payloads) output.Write(frame);
        output.Write(Convert.FromHexString("0201666D662E080000"));
        output.Write(compressor.Wrap(indexBytes));
    }

    private static byte[] Clubs((string Full, string Short, string Abbreviation) names) => WriteBytes(table =>
    {
        table.Write(Convert.FromHexString("03017461642EA90E"));
        table.Write(1);
        table.Write(ClubId);
        WriteNames(table, names);
        WriteString(table, "");
        WriteString(table, "");
        table.Write((byte)0);
        WriteString(table, "");
        table.Write(0);
        WriteString(table, "");
    });

    private static byte[] Competitions(params (string Full, string Short, string Abbreviation)[] rows) => WriteBytes(table =>
    {
        table.Write(Convert.FromHexString("03017461642EA90E"));
        table.Write(rows.Length);
        foreach (var names in rows)
        {
            table.Write(CompetitionId);
            WriteNames(table, names);
            table.Write((byte)0);
        }
    });

    private static void WriteNames(BinaryWriter writer, (string Full, string Short, string Abbreviation) names)
    {
        WriteString(writer, names.Full);
        writer.Write((byte)0);
        WriteString(writer, names.Short);
        writer.Write((byte)0);
        WriteString(writer, names.Abbreviation);
    }

    private static void WriteString(BinaryWriter writer, string value)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(value);
        writer.Write(bytes.Length);
        writer.Write(bytes);
    }

    private static byte[] WriteBytes(Action<BinaryWriter> write)
    {
        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream);
        write(writer);
        return stream.ToArray();
    }

    private static void Equal<T>(string check, T[] expected, T[] actual)
    {
        if (actual == null || !actual.SequenceEqual(expected)) throw new Exception($"Failed to {check}.");
    }
}
