namespace FMSuperScout;

/// <summary>
/// Wie de scan draait: de BepInEx-plugin (in fm.exe) of de externe scanner (eigen proces).
/// De gedeelde kern logt en stempelt de dump via deze haakjes, zodat Dumper/MemScan niets
/// van BepInEx hoeven te weten.
/// </summary>
internal static class Host
{
    public static Action<string> Info = _ => { };
    public static Action<string> Warn = _ => { };
    public static Action<string> Error = _ => { };

    /// <summary>"plugin" of "scanner" — gaat mee in dump-meta en diagnostics.</summary>
    public static string Kind = "plugin";
    public static string Version = "?";
}
