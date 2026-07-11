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
    public const string Id = "com.mark.fmsuperscout";
    public const string Name = "FMSuperScout";
    public const string Version = "0.1.0";

    internal static new ManualLogSource Log;

    public override void Load()
    {
        Log = base.Log;
        ClassInjector.RegisterTypeInIl2Cpp<HotkeyBehaviour>();

        var go = new GameObject("FMSuperScout");
        UnityEngine.Object.DontDestroyOnLoad(go);
        go.hideFlags = HideFlags.HideAndDontSave;
        go.AddComponent<HotkeyBehaviour>();

        Log.LogInfo($"{Name} {Version} geladen. Druk in de game op F9 om te dumpen.");
    }
}

public class HotkeyBehaviour : MonoBehaviour
{
    // Verplichte ctor voor via Il2CppInterop geïnjecteerde MonoBehaviours.
    public HotkeyBehaviour(System.IntPtr ptr) : base(ptr) { }

    private bool _busy;

    private void Update()
    {
        var kb = Keyboard.current;
        if (kb == null || _busy) return;

        if (kb[Key.F9].wasPressedThisFrame)
        {
            _busy = true;
            Plugin.Log.LogInfo("F9 → dump gestart op achtergrond-thread (game blijft speelbaar)…");
            // Scan draait op een achtergrond-thread: ReadProcessMemory is thread-safe en de
            // IL2CPP-GC verplaatst objecten niet, dus de game bevriest niet tijdens het dumpen.
            System.Threading.Tasks.Task.Run(() =>
            {
                try { Dumper.DumpAll(); }
                catch (System.Exception e) { Plugin.Log.LogError($"Dump mislukt: {e}"); }
                finally { _busy = false; }
            });
        }
    }
}
