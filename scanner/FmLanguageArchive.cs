using System.Buffers.Binary;
using System.Text;
using ZstdSharp;

namespace FMSuperScout;

// The database's .dat archive stores a Zstandard frame per member and a
// separate Zstandard index at the end. Only the requested members are read.
internal sealed class FmLanguageArchive : IDisposable
{
    private const int DataStart = 38;
    private const int IndexFrameOffset = 30;
    private const int MaxIndexSize = 1024 * 1024;
    private const int MaxMemberSize = 128 * 1024 * 1024;

    private readonly FileStream file;
    private readonly Dictionary<string, Member> members;

    private readonly record struct Member(long Offset, int CompressedSize, int Size);

    private FmLanguageArchive(FileStream file)
    {
        this.file = file;
        members = ReadIndex();
    }

    public static FmLanguageArchive Open(string path)
    {
        var file = File.OpenRead(path);
        try { return new FmLanguageArchive(file); }
        catch { file.Dispose(); throw; }
    }

    private Dictionary<string, Member> ReadIndex()
    {
        Span<byte> header = stackalloc byte[DataStart];
        file.ReadExactly(header);
        if (header[0] != 3 || header[1] != 1 || !header.Slice(2, 4).SequenceEqual("tad."u8)
            || !header.Slice(14, 4).SequenceEqual("fmf."u8))
            throw new InvalidDataException("Unrecognized FM language archive header.");

        ulong indexPointer = BinaryPrimitives.ReadUInt64LittleEndian(header[21..]);
        if (indexPointer < DataStart || indexPointer > (ulong)file.Length - IndexFrameOffset)
            throw new InvalidDataException("FM language archive index offset is outside the file.");

        long indexStart = (long)indexPointer + IndexFrameOffset;
        if (file.Length - indexStart > MaxIndexSize)
            throw new InvalidDataException("FM language archive index exceeds its size limit.");

        file.Position = indexStart;
        byte[] compressed = new byte[file.Length - indexStart];
        file.ReadExactly(compressed);
        using var decompressor = new Decompressor();
        Span<byte> decoded;
        try { decoded = decompressor.Unwrap(compressed, MaxIndexSize); }
        catch (ZstdException error) { throw new InvalidDataException("Invalid FM language archive index frame.", error); }

        var reader = new FmLanguageReader(decoded);
        reader.SkipString(); // archive root name
        uint count = reader.ReadUInt32();
        if (count > 4096) throw new InvalidDataException("Too many FM language archive members.");

        var index = new Dictionary<string, Member>((int)count, StringComparer.Ordinal);
        ulong dataSize = (ulong)(indexStart - 9 - DataStart); // the index frame has a 9-byte header
        for (int i = 0; i < count; i++)
        {
            string name = reader.ReadString() + reader.ReadString();
            ulong offset = reader.ReadUInt64();
            ulong compressedSize = reader.ReadUInt64();
            ulong size = reader.ReadUInt64();
            reader.Skip(16); // member timestamps
            if (offset > dataSize || compressedSize > dataSize - offset || compressedSize > MaxMemberSize
                || size > MaxMemberSize || !index.TryAdd(name, new Member((long)offset + DataStart,
                    (int)compressedSize, (int)size)))
                throw new InvalidDataException("Invalid FM language archive member.");
        }

        reader.Skip(4); // archive root trailer
        reader.RequireEnd();
        return index;
    }

    // Member names include the extension, for example "1000002_3.dat".
    public byte[] ReadMember(string name)
    {
        if (!members.TryGetValue(name, out var member)) return null;

        file.Position = member.Offset;
        byte[] compressed = new byte[member.CompressedSize];
        file.ReadExactly(compressed);
        byte[] result = new byte[member.Size];
        using var decompressor = new Decompressor();
        try
        {
            if (decompressor.Unwrap(compressed, result.AsSpan()) != result.Length)
                throw new InvalidDataException("FM language archive member size does not match the index.");
        }
        catch (ZstdException error)
        {
            throw new InvalidDataException($"Invalid FM language archive frame for {name}.", error);
        }
        return result;
    }

    public void Dispose() => file.Dispose();
}

internal ref struct FmLanguageReader
{
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);
    private ReadOnlySpan<byte> remaining;

    public FmLanguageReader(ReadOnlySpan<byte> data) => remaining = data;

    public int Remaining => remaining.Length;
    public byte ReadByte() => Read(1)[0];
    public uint ReadUInt32() => BinaryPrimitives.ReadUInt32LittleEndian(Read(4));
    public ulong ReadUInt64() => BinaryPrimitives.ReadUInt64LittleEndian(Read(8));
    public string ReadString()
    {
        try { return StrictUtf8.GetString(ReadStringBytes()); }
        catch (DecoderFallbackException error) { throw new InvalidDataException("Invalid UTF-8 in FM language data.", error); }
    }
    public void SkipString() => ReadStringBytes();
    public void Skip(int count) => Read(count);

    public void RequireEnd()
    {
        if (!remaining.IsEmpty) throw new InvalidDataException("Unexpected bytes at the end of FM language data.");
    }

    private ReadOnlySpan<byte> ReadStringBytes()
    {
        uint length = ReadUInt32();
        if (length > (uint)remaining.Length)
            throw new InvalidDataException("FM language string crosses the end of its member.");
        return Read((int)length);
    }

    private ReadOnlySpan<byte> Read(int count)
    {
        if (count > remaining.Length) throw new InvalidDataException("Truncated FM language data.");
        ReadOnlySpan<byte> bytes = remaining[..count];
        remaining = remaining[count..];
        return bytes;
    }
}
