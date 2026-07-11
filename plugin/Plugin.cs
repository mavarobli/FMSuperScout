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

    internal static ManualLogSource Log;

    public override void Load()
    {
        Log = base.Log;
        ClassInjector.RegisterTypeInIl2Cpp<HotkeyBehaviour>();

        var go = new GameObject("FMSuperScout");
        Object.DontDestroyOnLoad(go);
        go.hideFlags = HideFlags.HideAndDontSave;
        go.AddComponent<HotkeyBehaviour>();

        Log.LogInfo($"{Name} {Version} geladen. Druk in de game op F9 om te dumpen.");
    }
}

public class HotkeyBehaviour : MonoBehaviour
{
    private bool _busy;

    private void Update()
    {
        var kb = Keyboard.current;
        if (kb == null || _busy) return;

        if (kb[Key.F9].wasPressedThisFrame)
        {
            _busy = true;
            try
            {
                Dumper.DumpAll();
            }
            catch (System.Exception e)
            {
                Plugin.Log.LogError($"Dump mislukt: {e}");
            }
            finally
            {
                _busy = false;
            }
        }
    }
}
