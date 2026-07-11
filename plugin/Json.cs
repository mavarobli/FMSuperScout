using System.Globalization;
using System.Text;

namespace FMSuperScout;

/// <summary>Minimalistische, snelle JSON-writer (geen dependencies).</summary>
public sealed class JsonWriter
{
    private readonly StreamWriter _w;
    private readonly StringBuilder _sb = new(1 << 16);
    private bool _needComma;

    public JsonWriter(string path)
    {
        _w = new StreamWriter(path, false, new UTF8Encoding(false), 1 << 20);
    }

    private void Sep()
    {
        if (_needComma) _sb.Append(',');
        _needComma = false;
        if (_sb.Length > (1 << 15)) { _w.Write(_sb); _sb.Clear(); }
    }

    public void BeginObj() { Sep(); _sb.Append('{'); }
    public void EndObj() { _sb.Append('}'); _needComma = true; }
    public void BeginArr() { Sep(); _sb.Append('['); }
    public void EndArr() { _sb.Append(']'); _needComma = true; }

    public void Key(string name)
    {
        Sep();
        _sb.Append('"').Append(name).Append("\":");
    }

    public void Val(string s)
    {
        Sep();
        if (s == null) { _sb.Append("null"); }
        else
        {
            _sb.Append('"');
            foreach (var c in s)
            {
                switch (c)
                {
                    case '"': _sb.Append("\\\""); break;
                    case '\\': _sb.Append("\\\\"); break;
                    case '\n': _sb.Append("\\n"); break;
                    case '\r': _sb.Append("\\r"); break;
                    case '\t': _sb.Append("\\t"); break;
                    default:
                        if (c < 0x20) _sb.Append("\\u").Append(((int)c).ToString("x4"));
                        else _sb.Append(c);
                        break;
                }
            }
            _sb.Append('"');
        }
        _needComma = true;
    }

    public void Val(long v) { Sep(); _sb.Append(v.ToString(CultureInfo.InvariantCulture)); _needComma = true; }
    public void Val(double v) { Sep(); _sb.Append(double.IsFinite(v) ? v.ToString("R", CultureInfo.InvariantCulture) : "null"); _needComma = true; }
    public void Val(bool v) { Sep(); _sb.Append(v ? "true" : "false"); _needComma = true; }
    public void Null() { Sep(); _sb.Append("null"); _needComma = true; }

    // gemaksmethoden
    public void Prop(string k, string v) { Key(k); Val(v); }
    public void Prop(string k, long v) { Key(k); Val(v); }
    public void Prop(string k, bool v) { Key(k); Val(v); }
    public void PropOpt(string k, long? v) { if (v.HasValue) { Key(k); Val(v.Value); } }

    public void Close()
    {
        _w.Write(_sb);
        _sb.Clear();
        _w.Flush();
        _w.Dispose();
    }
}
