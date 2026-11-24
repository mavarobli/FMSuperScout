using System.Buffers.Binary;
using System.Text;

namespace FMSuperScout;

/// <summary>Football Manager's Simplified Chinese person-name table.</summary>
internal sealed class FmPersonNames
{
    private const uint AnyPerson = uint.MaxValue;
    private const uint AnyNation = ushort.MaxValue;
    private static readonly UTF8Encoding Utf8 = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    private readonly Dictionary<(uint Uid, uint Nation, string First, string Last, string Common), string> _names = new();

    public static FmPersonNames Parse(byte[] data)
    {
        if (data == null) return null;
        if (data.Length < 12 || data[0] != 3 || data[1] != 1 || data[2] != 't' ||
            data[3] != 'a' || data[4] != 'd' || data[5] != '.' || data[7] != 0x0e ||
            data[6] is not (0x8d or 0x90 or 0xa9))
            throw new InvalidDataException("Unsupported FM person-name table header.");

        var table = new FmPersonNames();
        var offset = 8;
        while (true)
        {
            var display = ReadString(data, ref offset);
            if (display.Length == 0)
            {
                if (offset != data.Length)
                    throw new InvalidDataException("Unexpected data after the FM person-name terminator.");
                return table;
            }

            var first = ReadString(data, ref offset);
            var last = ReadString(data, ref offset);
            var common = ReadString(data, ref offset);
            if (data.Length - offset < 7) throw new InvalidDataException("Incomplete FM person-name record.");
            var uid = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(offset, 4));
            var nation = BinaryPrimitives.ReadUInt16LittleEndian(data.AsSpan(offset + 4, 2));
            var mode = data[offset + 6];
            offset += 7;

            // All Simplified Chinese display-name rows use mode 0. A conflicting exact key is ambiguous.
            if (mode != 0 || (first.Length == 0 && last.Length == 0 && common.Length == 0)) continue;
            var key = (uid, (uint)nation, first, last, common);
            if (!table._names.TryAdd(key, display) && table._names[key] != display) table._names[key] = null;
        }
    }

    public string Resolve(uint uid, uint nation, string first, string last, string common, uint firstNation, uint lastNation)
    {
        first ??= "";
        last ??= "";
        common ??= "";
        if (TryLookup(uid, nation, first, last, common, out var display)) return display;

        // Both separately translated name fields must be available for a middle-dot display name.
        // FM uses other formatting when both fields have East Asian name origins.
        if (common.Length != 0 || first.Length == 0 || last.Length == 0) return null;
        if (IsEastAsianNameOrigin(firstNation) && IsEastAsianNameOrigin(lastNation)) return null;
        if (!TryLookup(uid, firstNation, first, "", "", out var localFirst) || localFirst == null ||
            !TryLookup(uid, lastNation, "", last, "", out var localLast) || localLast == null)
            return null;

        return $"{localFirst}·{localLast}";
    }

    // Compact nation table indices for the name-origin checks in FM27's Chinese formatter.
    private static bool IsEastAsianNameOrigin(uint nation) =>
        nation is 55 or 56 or 61 or 69 or 74 or 79 or 80 or 83 or 198 or 221 or 222 or 223 or 224;

    private bool TryLookup(uint uid, uint nation, string first, string last, string common, out string display)
    {
        return _names.TryGetValue((uid, nation, first, last, common), out display)
            || _names.TryGetValue((uid, AnyNation, first, last, common), out display)
            || _names.TryGetValue((AnyPerson, nation, first, last, common), out display)
            || _names.TryGetValue((AnyPerson, AnyNation, first, last, common), out display);
    }

    private static string ReadString(byte[] data, ref int offset)
    {
        if (data.Length - offset < sizeof(int)) throw new InvalidDataException("Incomplete FM person-name string length.");
        var length = BinaryPrimitives.ReadInt32LittleEndian(data.AsSpan(offset, sizeof(int)));
        offset += sizeof(int);
        if (length < 0 || length > data.Length - offset) throw new InvalidDataException("Out-of-range FM person-name string length.");
        try
        {
            var value = Utf8.GetString(data, offset, length);
            offset += length;
            return value;
        }
        catch (DecoderFallbackException error)
        {
            throw new InvalidDataException("Invalid UTF-8 in the FM person-name table.", error);
        }
    }
}
