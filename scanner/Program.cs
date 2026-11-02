using System.Diagnostics;
using System.Runtime.InteropServices;

namespace FMSuperScout;

/// <summary>
/// Externe FMSuperScout-scanner: leest het draaiende fm.exe van buitenaf, met dezelfde
/// scan-kern als de BepInEx-plugin. Geen mod-laag in de gamemap nodig — daarmee werkt de
/// tool op FM27 (waar BepInEx nog niet bewezen is) en verdwijnen de bekende BepInEx-
/// struikelblokken (antivirus op winhttp.dll, trage eerste start, Doorstop-herstartbug).
///
///   scan                     één dump, daarna stoppen (exitcode 0 = gelukt)
///   watch [--parent PID]     wachter: F9 in FM en "Nieuwe data" in de app (request.flag)
///                            starten een scan. Blijft actief zolang de app (ouder) óf FM
///                            draait: zo werkt F9 de hele FM-sessie, ook na het sluiten van
///                            de app. Stopt pas als beide weg zijn.
///
/// Alleen leesrechten op fm.exe; er wordt nooit iets in de game geschreven.
/// </summary>
internal static class Program
{
    private static readonly string DataDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FMSuperScout");
    private static readonly string LogFile = Path.Combine(DataDir, "scanner.log");
    private static readonly string RequestFile = Path.Combine(DataDir, "request.flag");
    private static readonly object LogLock = new();

    private static int Main(string[] args)
    {
        Directory.CreateDirectory(DataDir);
        Host.Kind = "scanner";
        Host.Version = typeof(Program).Assembly.GetName().Version?.ToString(3) ?? "?";
        Host.Info = s => Log("INFO", s);
        Host.Warn = s => Log("WARN", s);
        Host.Error = s => Log("FOUT", s);

        string mode = args.Length > 0 ? args[0].ToLowerInvariant() : "scan";
        try
        {
            return mode switch
            {
                "scan" => Scan(),
                "watch" => Watch(ParentPid(args)),
                _ => Usage(),
            };
        }
        catch (Exception e)
        {
            Host.Error($"{mode} mislukt: {e}");
            if (mode == "scan") Dumper.WriteError("Scan failed: " + e.Message);
            return 1;
        }
    }

    private static int Usage()
    {
        Console.WriteLine("FMSuperScout.Scanner scan | watch [--parent PID]");
        return 64;
    }

    private static int ParentPid(string[] args)
    {
        int i = Array.IndexOf(args, "--parent");
        return i >= 0 && i + 1 < args.Length && int.TryParse(args[i + 1], out int pid) ? pid : 0;
    }

    // ---------- scan ----------

    private static int Scan()
    {
        using var fm = FindFm(out bool denied);
        if (fm == null)
        {
            // fm.exe die we niet mogen openen = vrijwel altijd FM als administrator (of via een
            // launcher die elevated start). Eerder meldden we dan "draait niet", wat precies
            // het verkeerde spoor is.
            if (denied)
            {
                Host.Warn("fm.exe draait, maar is niet te openen (toegang geweigerd: FM draait waarschijnlijk als administrator).");
                Dumper.WriteError("Football Manager is running as administrator, so FMSuperScout may not read it. " +
                                  "Start Football Manager normally (not as administrator), or run FMSuperScout as administrator too.");
                return 4;
            }
            Host.Warn("fm.exe draait niet — niets te scannen.");
            Dumper.WriteError("Football Manager is not running. Start it, load your save and try again.");
            return 2;
        }
        Host.Info($"FMSuperScout scanner {Host.Version} → fm.exe (pid {fm.Id}, {fm.MainModule?.FileName})");
        GameProcess game;
        try { game = GameProcess.Open(fm); }
        catch (System.ComponentModel.Win32Exception e) when (e.NativeErrorCode == 5)
        {
            Host.Warn($"Openen van fm.exe geweigerd: {e.Message}");
            Dumper.WriteError("Football Manager is running as administrator, so FMSuperScout may not read it. " +
                              "Start Football Manager normally (not as administrator), or run FMSuperScout as administrator too.");
            return 4;
        }
        using var _ = game;
        try
        {
            if (!Dumper.TryDump(game))
            {
                Host.Info("Er loopt al een dump (plugin of andere scanner) — overgeslagen.");
                return 3;
            }
            return 0;
        }
        finally { Dumper.ReleaseScan(); }
    }

    /// <summary>
    /// Het echte Football Manager-proces: fm.exe met een fm_Data-map ernaast (er bestaan
    /// meer programma's die "fm" heten). Bij meerdere: het meest recent gestarte.
    /// </summary>
    /// <param name="denied">Er draait een fm.exe die we niet mogen inspecteren (elevated).</param>
    private static Process FindFm(out bool denied)
    {
        Process best = null;
        denied = false;
        foreach (var p in Process.GetProcessesByName("fm"))
        {
            try
            {
                string exe = p.MainModule?.FileName;
                bool real = exe != null && Directory.Exists(Path.Combine(Path.GetDirectoryName(exe)!, "fm_Data"));
                if (real && (best == null || p.StartTime > best.StartTime)) { best?.Dispose(); best = p; continue; }
            }
            catch (System.ComponentModel.Win32Exception) { denied = true; }   // elevated of ander account
            catch { }
            p.Dispose();
        }
        if (best != null) denied = false;
        return best;
    }

    // ---------- watch ----------

    [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int vKey);
    [DllImport("user32.dll")] private static extern nint GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(nint hWnd, out int pid);
    private const int VK_F9 = 0x78;

    private static readonly string AdoptFile = Path.Combine(DataDir, "watch.adopt");
    private static readonly TimeSpan ScanTimeout = TimeSpan.FromMinutes(5);

    private static int Watch(int parentPid)
    {
        // Eén wachter tegelijk (de app kan meerdere keren gestart worden). Een mutex van een
        // elevated proces is voor ons niet te openen: dan draait er dus al een wachter.
        Mutex single;
        bool first;
        try { single = new Mutex(true, @"Local\FMSuperScout-watch", out first); }
        catch (UnauthorizedAccessException) { Console.WriteLine("Wachter draait al (elevated)."); return 0; }
        using var _ = single;
        if (!first)
        {
            // Een nieuwe app-sessie terwijl de wachter van een vorige sessie nog meedraait (FM
            // stond open): geef onze app-pid door, zodat die wachter ook op déze app blijft
            // letten. Anders stopt hij zodra FM sluit en zit deze app zonder wachter.
            if (parentPid > 0) try { File.AppendAllText(AdoptFile, parentPid + Environment.NewLine); } catch { }
            Console.WriteLine("Wachter draait al.");
            return 0;
        }

        var parents = new List<Process>();
        void Adopt(int pid) { try { if (pid > 0 && !parents.Any(x => x.Id == pid)) parents.Add(Process.GetProcessById(pid)); } catch { /* al weg */ } }
        Adopt(parentPid);
        Host.Info($"Wachter {Host.Version} gestart (ouder-pid {(parentPid > 0 ? parentPid : "-")}). F9 in FM of 'Nieuwe data' in de app start een scan.");

        Process fm = null, child = null;
        DateTime childStart = default;
        bool f9Down = false, fmDenied = false, pluginActive = false;
        long nextSlowTick = 0;
        var clock = Stopwatch.StartNew();
        for (; ; )
        {
            Thread.Sleep(50);
            long now = clock.ElapsedMilliseconds;

            // F9 alleen als FM het voorgrondvenster is (anders steelt de wachter F9 van andere apps
            // niet, maar zou hij wel scans starten terwijl je iets anders doet).
            bool down = (GetAsyncKeyState(VK_F9) & 0x8000) != 0;
            if (down && !f9Down && fm != null && !pluginActive && IsForeground(fm)) Trigger(ref child, ref childStart, "F9");
            f9Down = down;

            if (now < nextSlowTick) continue;
            nextSlowTick = now + 1000;

            try
            {
                if (File.Exists(AdoptFile))
                {
                    foreach (var line in File.ReadAllLines(AdoptFile))
                        if (int.TryParse(line, out int pid)) { Adopt(pid); Host.Info($"Nieuwe app-sessie (pid {pid}) overgenomen."); }
                    File.Delete(AdoptFile);
                }
            }
            catch { /* volgende tick */ }
            foreach (var gone in parents.Where(HasExited).ToList())
            {
                parents.Remove(gone); gone.Dispose();
                if (parents.Count == 0) Host.Info("App gesloten — wachter blijft actief zolang FM draait.");
            }
            if (fm == null || HasExited(fm))
            {
                fm?.Dispose(); fm = FindFm(out fmDenied);
                bool was = pluginActive;
                pluginActive = fm != null && PluginLoaded(fm);
                if (pluginActive && !was) Host.Info("FM draait met de FMSuperScout-plugin (BepInEx) — die handelt F9 en 'Nieuwe data' af; de wachter blijft stil.");
            }
            if (child != null && HasExited(child)) { child.Dispose(); child = null; }
            else if (child != null && DateTime.UtcNow - childStart > ScanTimeout)
            {
                // Een vastgelopen scan mag de wachter niet blijvend blokkeren.
                Host.Error($"Scan reageert na {ScanTimeout.TotalMinutes:0} minuten niet meer — afgebroken.");
                try { child.Kill(); } catch { }
                child.Dispose(); child = null;
                Dumper.WriteError("The scan took too long and was stopped. Try again; if this keeps happening, restart Football Manager.");
            }
            if (parents.Count == 0 && fm == null && !fmDenied && child == null) { Host.Info("App en FM gesloten — wachter stopt."); return 0; }
            // Ook bij een niet te openen (elevated) FM: de scan schrijft dan een heldere fout
            // naar status.json, i.p.v. dat de app na 15 s "wordt niet opgepikt" meldt.
            if ((fm != null || fmDenied) && !pluginActive && TakeRequest()) Trigger(ref child, ref childStart, "web-app");
        }
    }

    /// <summary>
    /// Draait de FMSuperScout-plugin (BepInEx, FM26 t/m 1.5.0) in dit fm.exe? Die reageert zelf
    /// op F9 en request.flag, maar kent de mutex van 1.6 niet: twee scans tegelijk zouden
    /// elkaars bestanden raken. Kenmerk: BepInEx' loader (winhttp.dll uit de gamemap) is
    /// geladen én de plugin-DLL staat in BepInEx\plugins.
    /// </summary>
    private static bool PluginLoaded(Process fm)
    {
        try
        {
            string dir = Path.GetDirectoryName(fm.MainModule!.FileName)!;
            if (!File.Exists(Path.Combine(dir, "BepInEx", "plugins", "FMSuperScout.dll"))) return false;
            foreach (ProcessModule m in fm.Modules)
                if (m.ModuleName.Equals("winhttp.dll", StringComparison.OrdinalIgnoreCase)
                    && Path.GetDirectoryName(m.FileName)!.Equals(dir, StringComparison.OrdinalIgnoreCase))
                    return true;
        }
        catch { }
        return false;
    }

    private static bool HasExited(Process p) { try { return p.HasExited; } catch { return true; } }

    private static bool IsForeground(Process fm)
    {
        GetWindowThreadProcessId(GetForegroundWindow(), out int pid);
        return pid == fm.Id;
    }

    // Elke scan in een eigen kindproces: de scan houdt tijdelijk honderden MB aan module-images
    // en buffers vast. Na afloop is dat geheugen meteen terug bij Windows, en de wachter
    // zelf blijft klein (hij draait de hele sessie mee naast FM).
    private static void Trigger(ref Process child, ref DateTime childStart, string why)
    {
        if (child != null) { Host.Info($"{why}: er loopt al een scan — genegeerd."); return; }
        Host.Info($"{why} → scan gestart.");
        try
        {
            child = Process.Start(new ProcessStartInfo(Environment.ProcessPath!, "scan")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
            });
            childStart = DateTime.UtcNow;
        }
        catch (Exception e)
        {
            // Bv. de virusscanner blokkeert de exe: melden, maar de wachter blijft draaien.
            Host.Error($"Scan starten mislukt: {e.Message}");
            Dumper.WriteError("Could not start the scan: " + e.Message);
            child = null;
        }
    }

    /// <summary>
    /// "Nieuwe data" uit de app: request.flag met de aanmaaktijd (ms sinds epoch). Zelfde
    /// regels als de plugin: eerst valideren, dan pas verwijderen; ouder dan 2 minuten is
    /// verlopen (bv. blijven liggen van een vorige sessie) en wordt opgeruimd zonder scan.
    /// </summary>
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
                // Kraakvers maar onleesbaar = vrijwel zeker half geschreven: volgende tick opnieuw.
                // (Alleen bij onleesbaar; een leesbare maar verlopen tijd is gewoon verlopen.)
                if (!parsed && (DateTime.UtcNow - File.GetLastWriteTimeUtc(RequestFile)).TotalSeconds < 10) return false;
                File.Delete(RequestFile);
                Host.Warn($"Verlopen/onleesbaar data-verzoek genegeerd (vlag: '{raw}').");
                return false;
            }
            File.Delete(RequestFile);
            return true;
        }
        catch { return false; }   // bestand net weg of vergrendeld: volgende tick
    }

    // ---------- log ----------

    private static void Log(string level, string msg)
    {
        string line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} [{Environment.ProcessId}] {level} {msg}";
        Console.WriteLine(line);
        lock (LogLock)
        {
            try
            {
                // Klein houden: boven 1 MB de oudste helft weggooien.
                var fi = new FileInfo(LogFile);
                if (fi.Exists && fi.Length > 1 << 20)
                {
                    var lines = File.ReadAllLines(LogFile);
                    File.WriteAllLines(LogFile, lines.Skip(lines.Length / 2), new System.Text.UTF8Encoding(true));
                }
                // UTF-8 mét BOM (alleen bij een nieuw bestand): anders toont o.a. Kladblok-oud en
                // PowerShell 5 de pijlen en streepjes als rommel in bijgevoegde logs.
                File.AppendAllText(LogFile, line + Environment.NewLine, new System.Text.UTF8Encoding(true));
            }
            catch { /* log is best effort; twee processen tegelijk kan even botsen */ }
        }
    }
}
