#nullable enable

using System.Reflection;
using System.Text;

internal static class PersonNameChecks
{
    public static void Run(Assembly scanner)
    {
        var type = scanner.GetType("FMSuperScout.FmPersonNames", throwOnError: true)!;
        var parse = type.GetMethod("Parse")!;
        var resolve = type.GetMethod("Resolve")!;
        using var payload = new MemoryStream();
        using var writer = new BinaryWriter(payload, Encoding.UTF8, leaveOpen: true);
        writer.Write(new byte[] { 3, 1, (byte)'t', (byte)'a', (byte)'d', (byte)'.', 0xa9, 0x0e });

        void WriteString(string value)
        {
            var bytes = Encoding.UTF8.GetBytes(value);
            writer.Write(bytes.Length);
            writer.Write(bytes);
        }

        void Row(string display, string first, string second, string common, uint uid, ushort nation)
        {
            WriteString(display);
            WriteString(first);
            WriteString(second);
            WriteString(common);
            writer.Write(uid);
            writer.Write(nation);
            writer.Write((byte)0);
        }

        Row("吴磊", "Lei", "Wu", "Wu Lei", 137637, 55);
        Row("武磊", "Lei", "Wu", "Wu Lei", 1016974, 55);
        Row("王钰栋", "Yudong", "Wang", "Wang Yudong", 2000303600, 55);
        Row("钰栋", "Yudong", "", "", uint.MaxValue, 55);
        Row("王", "", "Wang", "", uint.MaxValue, 55);
        Row("孙兴慜", "Heung-Min", "Son", "", uint.MaxValue, ushort.MaxValue);
        Row("佩德里", "Pedro", "González López", "Pedri", uint.MaxValue, 170);
        Row("阿德勒", "", "Messi", "", uint.MaxValue, 11);
        Row("梅西", "", "Messi", "", uint.MaxValue, 187);
        Row("格伦", "Glenn", "", "", uint.MaxValue, 139);
        Row("莫里斯", "", "Morris", "", uint.MaxValue, 139);
        Row("穆罕默德", "Mohamed", "", "", uint.MaxValue, 11);
        Row("萨拉赫", "", "Salah", "", uint.MaxValue, 11);
        Row("基利安", "Kylian", "", "", uint.MaxValue, 143);
        Row("姆巴佩", "", "Mbappé", "", uint.MaxValue, 6);
        writer.Write(0);
        var names = parse.Invoke(null, new object[] { payload.ToArray() });

        var cases = new (uint Uid, uint Nation, string? First, string? Last, string? Common, uint FirstNation, uint LastNation, string? Expected)[]
        {
            (137637, 55, "Lei", "Wu", "Wu Lei", 55, 55, "吴磊"),
            (1016974, 55, "Lei", "Wu", "Wu Lei", 55, 55, "武磊"),
            (999, 55, "Lei", "Wu", "Wu Lei", 55, 55, null),
            (1016974, 55, "Wrong", "Wu", "Wu Lei", 55, 55, null),
            (2000303600, 55, "Yudong", "Wang", "Wang Yudong", 55, 55, "王钰栋"),
            (999, 55, "Yudong", "Wang", null, 55, 55, null),
            (92020288, 79, "Heung-Min", "Son", null, 79, 79, "孙兴慜"),
            (67293495, 170, "Pedro", "González López", "Pedri", 170, 170, "佩德里"),
            (67293495, 170, "Pedro", "Fernández", "Pedri", 170, 170, null),
            (7458500, 187, "Lionel", "Messi", null, 187, 187, null),
            (5101753, 139, "Glenn", "Morris", null, 139, 139, "格伦·莫里斯"),
            (5101753, 139, "Glenn", "Morris", null, 139, 11, null),
            (98028755, 11, "Mohamed", "Salah", null, 11, 11, "穆罕默德·萨拉赫"),
            (85139014, 143, "Kylian", "Mbappé", null, 143, 6, "基利安·姆巴佩"),
        };

        foreach (var item in cases)
        {
            var actual = (string?)resolve.Invoke(names, new object?[]
            {
                item.Uid, item.Nation, item.First, item.Last, item.Common, item.FirstNation, item.LastNation,
            });
            if (actual != item.Expected)
                throw new Exception($"Person {item.Uid} ({item.First} {item.Last}) expected '{item.Expected}', got '{actual}'.");
        }

        try
        {
            parse.Invoke(null, new object[] { payload.ToArray()[..^1] });
            throw new Exception("The name table accepted a truncated terminator.");
        }
        catch (TargetInvocationException error) when (error.InnerException is InvalidDataException)
        {
        }

        Console.WriteLine($"Passed {cases.Length} person name checks and validated truncation handling.");
    }
}
