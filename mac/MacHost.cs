using System.Runtime.InteropServices;
using System.Text;

namespace FMSuperScout;

/// <summary>
/// FMSuperScout in Football Manager op de Mac. De lader (loader/fmss_loader.c) wordt bij het
/// starten van FM meegeladen, laadt deze bibliotheek en roept <see cref="Run"/> aan op een
/// eigen thread. Daarna wacht de module op "Nieuwe data" uit de web-app (request.flag) en
/// scant dan met dezelfde kern als de Windows-scanner. Alleen lezen; FM en saves blijven
/// ongemoeid.
/// </summary>
internal static class MacHost
{
    public const string Version = "1.7.0";

    private static readonly string Dir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FMSuperScout");
    private static string RequestFile => Path.Combine(Dir, "request.flag");
    private static string LogFile => Path.Combine(Dir, "mac.log");
    // Teken van leven voor de web-app: draait FM mét module? (pid + tijd, elke 5 s ververst)
    private static string AgentFile => Path.Combine(Dir, "mac-agent.json");

    [UnmanagedCallersOnly(EntryPoint = "fmss_run")]
    public static int Run()
    {
        try
        {
            Directory.CreateDirectory(Dir);
            Host.Kind = "mac";
            Host.Version = Version;
            Host.Info = m => Log("INFO", m);
            Host.Warn = m => Log("WARN", m);
            Host.Error = m => Log("ERROR", m);
            Log("INFO", $"FMSuperScout {Version} actief in Football Manager (pid {Environment.ProcessId}, {RuntimeInformation.ProcessArchitecture}).");
            Loop();
            return 0;
        }
        catch (Exception e)
        {
            Log("ERROR", "Module gestopt: " + e);
            return 1;
        }
    }

    private static void Loop()
    {
        // Een verzoek van vóór deze FM-sessie is niet meer bedoeld voor deze save.
        try { File.Delete(RequestFile); } catch { }
        // Teken van leven op een eigen timer: ook tijdens een lange scan blijft het vers, anders
        // denkt de app dat FM zonder module draait.
        BeatTimer = new Timer(_ => Beat(), null, 0, 5000);
        for (; ;)
        {
            if (TakeRequest())
            {
                Log("INFO", "web-app → scan gestart.");
                try { using var game = GameProcess.Current(); Dumper.TryDump(game); }
                catch (Exception e)
                {
                    Log("ERROR", "Scan mislukt: " + e);
                    Dumper.WriteError("Reading the game failed: " + e.Message);
                }
                finally { Dumper.ReleaseScan(); }
            }
            Thread.Sleep(400);
        }
    }

    private static Timer BeatTimer;   // veld: houdt de timer in leven

    private static void Beat()
    {
        try
        {
            File.WriteAllText(AgentFile + ".tmp",
                $"{{\"pid\":{Environment.ProcessId},\"version\":\"{Version}\",\"at\":{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}}}");
            File.Move(AgentFile + ".tmp", AgentFile, true);
        }
        catch { }
    }

    // Zelfde regels als de Windows-scanner (scanner/Program.cs): verlopen of onleesbare
    // vlaggen weggooien, een kraakverse onleesbare vlag nog even laten liggen (half geschreven).
    private static bool TakeRequest()
    {
        try
        {
            if (!File.Exists(RequestFile)) return false;
            string raw = File.ReadAllText(RequestFile).Trim();
            long nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            bool parsed = long.TryParse(raw, out long flagMs);
            if (!parsed || nowMs - flagMs > 120_000)
            {
                if (!parsed && (DateTime.UtcNow - File.GetLastWriteTimeUtc(RequestFile)).TotalSeconds < 10) return false;
                File.Delete(RequestFile);
                Log("WARN", $"Verlopen/onleesbaar data-verzoek genegeerd (vlag: '{raw}').");
                return false;
            }
            File.Delete(RequestFile);
            return true;
        }
        catch { return false; }
    }

    private static readonly object LogLock = new();

    private static void Log(string level, string msg)
    {
        lock (LogLock)
        {
            try
            {
                var fi = new FileInfo(LogFile);
                if (fi.Exists && fi.Length > 2_000_000) File.Move(LogFile, LogFile + ".1", true);
                File.AppendAllText(LogFile, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} {level} {msg}\n", Encoding.UTF8);
            }
            catch { }
        }
    }
}
