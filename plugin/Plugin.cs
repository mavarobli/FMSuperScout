using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using Il2CppInterop.Runtime.Injection;
using UnityEngine;
using UnityEngine.InputSystem;

namespace FMSuperScout;

[BepInPlugin(Id, Name, Version)]
public class Plugin : BasePlugin
{
    public const string Id = "com.mavarobli.fmsuperscout";
    public const string Name = "FMSuperScout";
    public const string Version = "0.1.38";

    internal static new ManualLogSource Log;

    private static readonly string RequestFile = System.IO.Path.Combine(
        System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData),
        "FMSuperScout", "request.flag");

    // 0 = idle, 1 = dump bezig (Interlocked; gedeeld tussen F9/Update en de poll-thread).
    private static int _dumpBusy;

    public override void Load()
    {
        Log = base.Log;
        ClassInjector.RegisterTypeInIl2Cpp<HotkeyBehaviour>();

        var go = new GameObject("FMSuperScout");
        UnityEngine.Object.DontDestroyOnLoad(go);
        go.hideFlags = HideFlags.HideAndDontSave;
        go.AddComponent<HotkeyBehaviour>();

        // Web-app-trigger (request.flag) pollen op een eigen background-thread, onafhankelijk
        // van Unity. In sommige sessies tickt de geïnjecteerde MonoBehaviour nooit
        // (Update blijft uit — IL2CPP-injectie is daar flaky in), waardoor "Nieuwe data"
        // in de app eeuwig op "inlezen…" bleef hangen. De dump draait toch al op een
        // achtergrond-thread (ReadProcessMemory is thread-safe), dus Unity is voor deze
        // route helemaal niet nodig. F9 blijft via Update lopen.
        // (ThreadStart is parameterloos — een Timer-callback struikelt hier over de
        // uitgeklede NullableAttribute in de Il2Cpp-referenties, zelfde truc als in Dumper.)
        var poller = new System.Threading.Thread(PollLoop) { IsBackground = true, Name = "FMSS-poll" };
        poller.Start();

        Log.LogInfo($"{Name} {Version} geladen. Druk in de game op F9 om te dumpen.");
    }

    private static void PollLoop()
    {
        for (; ; )
        {
            System.Threading.Thread.Sleep(1000);
            try
            {
                if (!System.IO.File.Exists(RequestFile)) continue;
                System.IO.File.Delete(RequestFile);
                TryStartDump("web-app");
            }
            catch { /* volgende tick opnieuw */ }
        }
    }

    // Start een dump op een achtergrond-thread, hooguit één tegelijk (F9 én web-app).
    internal static void TryStartDump(string trigger)
    {
        if (System.Threading.Interlocked.CompareExchange(ref _dumpBusy, 1, 0) != 0) return;
        Log.LogInfo($"{trigger} → dump gestart op achtergrond-thread…");
        // Scan draait op een achtergrond-thread: ReadProcessMemory is thread-safe en de
        // IL2CPP-GC verplaatst objecten niet, dus de game bevriest niet tijdens het dumpen.
        System.Threading.Tasks.Task.Run(() =>
        {
            try { Dumper.DumpAll(); }
            catch (System.Exception e)
            {
                Log.LogError($"Dump mislukt: {e}");
                Dumper.WriteError("Dump mislukt: " + e.Message);   // web-app toont dit i.p.v. eeuwig "scanning"
            }
            finally { System.Threading.Interlocked.Exchange(ref _dumpBusy, 0); }
        });
    }
}

public class HotkeyBehaviour : MonoBehaviour
{
    // Verplichte ctor voor via Il2CppInterop geïnjecteerde MonoBehaviours.
    public HotkeyBehaviour(System.IntPtr ptr) : base(ptr) { }

    private void Update()
    {
        var kb = Keyboard.current;
        if (kb != null && kb[Key.F9].wasPressedThisFrame)
            Plugin.TryStartDump("F9");
    }
}
