#if WINDOWS
using System.Buffers.Binary;
using System.Text;

namespace FMSuperScout;

/// <summary>Reads the nickname a particular human manager assigned to an FM person.</summary>
internal static class FmNicknames
{
    // FM26.3 / FM27.1 ACTUAL_PERSON_BASE follows the scanner's PERSON facet by 0x28.
    // Its NICK_NAME_ARRAY pointer is at +0x10. The array holds pointers to name/key pairs.
    private const uint NicknameArray = 0x38;
    private const int PointerSize = 8;
    private const int MaxEntries = 1024;
    private const int MaxNameBytes = 1024;
    private static readonly UTF8Encoding Utf8 = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    public static string Read(MemScan mem, ulong person, uint managerIndex)
    {
        if (!IsPointer(person) || managerIndex == uint.MaxValue) return null;
        ulong array = mem.Ptr(person + NicknameArray);
        if (!IsPointer(array) || array % PointerSize != 0) return null;

        var header = new byte[3 * PointerSize];
        if (!mem.ReadBlock(array, header, header.Length)) return null;
        ulong begin = BinaryPrimitives.ReadUInt64LittleEndian(header);
        ulong end = BinaryPrimitives.ReadUInt64LittleEndian(header.AsSpan(PointerSize));
        ulong capacity = BinaryPrimitives.ReadUInt64LittleEndian(header.AsSpan(2 * PointerSize));
        if (!IsPointer(begin) || !IsPointer(capacity) || begin >= end || end > capacity ||
            (begin | end | capacity) % PointerSize != 0 || end - begin > MaxEntries * PointerSize)
            return null;

        var slots = new byte[(int)(end - begin)];
        if (!mem.ReadBlock(begin, slots, slots.Length)) return null;
        var record = new byte[PointerSize + sizeof(uint)];
        for (int offset = 0; offset < slots.Length; offset += PointerSize)
        {
            ulong entry = BinaryPrimitives.ReadUInt64LittleEndian(slots.AsSpan(offset));
            if (!IsPointer(entry) || entry % PointerSize != 0 || !mem.ReadBlock(entry, record, record.Length))
                return null;
            if (BinaryPrimitives.ReadUInt32LittleEndian(record.AsSpan(PointerSize)) != managerIndex) continue;

            ulong name = BinaryPrimitives.ReadUInt64LittleEndian(record);
            if (!IsPointer(name) || name % sizeof(uint) != 0) return null;
            int length = mem.I32(name);
            if (length <= 0 || length > MaxNameBytes) return null;
            var bytes = new byte[length + 1];
            if (!mem.ReadBlock(name + sizeof(uint), bytes, bytes.Length) || bytes[length] != 0) return null;
            if (mem.Ptr(person + NicknameArray) != array || mem.Ptr(array) != begin ||
                mem.Ptr(array + PointerSize) != end || mem.Ptr(begin + (ulong)offset) != entry ||
                mem.Ptr(entry) != name || mem.U32(entry + PointerSize) != managerIndex)
                return null;

            try
            {
                string nickname = Utf8.GetString(bytes, 0, length);
                return nickname.Contains('\0') ? null : nickname;
            }
            catch (DecoderFallbackException)
            {
                return null;
            }
        }

        return null;
    }

    private static bool IsPointer(ulong address) => address is >= 0x10000 and < 0x800000000000;
}
#endif
