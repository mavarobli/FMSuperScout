using System.Xml.Linq;

namespace FMSuperScout;

internal static class FmDataLanguage
{
    public static string Read(string localAppData, int gameMajor)
    {
        string preferences = Path.Combine(localAppData, "Sports Interactive",
            $"Football Manager {gameMajor}", "Preferences");
        try
        {
            if (!Directory.Exists(preferences)) return null;
            var newest = Directory.EnumerateDirectories(preferences, "version *")
                .Select(dir => Path.Combine(dir, "current_db_language.xml"))
                .Where(File.Exists)
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .FirstOrDefault();
            if (newest == null) return null;
            return (string)XDocument.Load(newest).Root?.Elements("string")
                .FirstOrDefault(item => (string)item.Attribute("id") == "value")?.Attribute("value");
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or System.Xml.XmlException)
        {
            Host.Warn($"Could not read FM's data language preference: {e.Message}");
            return null;
        }
    }
}
