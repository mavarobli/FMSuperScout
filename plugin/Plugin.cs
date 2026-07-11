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

    // On-screen status (zichtbaar in de game, ook zonder console).
    internal static string Status = "";
    internal static DateTime StatusExpiry = DateTime.MinValue;
    internal static void SetStatus(string msg, double seconds)
    {
        Status = msg;
        StatusExpiry = DateTime.Now.AddSeconds(seconds);
    }

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

    // Tekstvlak linksboven in de game met de dump-status (werkt zonder console).
    private GUIStyle _style;
    private void OnGUI()
    {
      try
      {
        if (DateTime.Now > Plugin.StatusExpiry || string.IsNullOrEmpty(Plugin.Status)) return;
        if (_style == null)
        {
            _style = new GUIStyle();
            _style.fontSize = 16;
            _style.normal.textColor = Color.white;
        }
        string txt = "⚽ FMSuperScout — " + Plugin.Status;
        float w = 10f * txt.Length + 28f;
        if (w > 900f) w = 900f;
        var box = new Rect(12f, 12f, w, 38f);
        GUI.color = new Color(0.06f, 0.12f, 0.08f, 0.95f);
        GUI.DrawTexture(box, Texture2D.whiteTexture);        // gevulde achtergrond (altijd zichtbaar)
        GUI.color = Color.white;
        GUI.Label(new Rect(26f, 20f, w, 26f), txt, _style);  // tekst erover
      }
      catch { /* IMGUI niet beschikbaar — web-app toont de status ook */ }

    }

    private int _frame;
    private static readonly string RequestFile = System.IO.Path.Combine(
        System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData),
        "FMSuperScout", "request.flag");

    private void Update()
    {
        var kb = Keyboard.current;
        if (_busy) return;

        bool f9 = kb != null && kb[Key.F9].wasPressedThisFrame;
        bool requested = false;
        // Trigger vanuit de web-app: check ~1x/sec op request.flag.
        if (!f9 && (++_frame % 60 == 0))
        {
            try { if (System.IO.File.Exists(RequestFile)) { System.IO.File.Delete(RequestFile); requested = true; } }
            catch { }
        }

        if (f9 || requested)
        {
            _busy = true;
            Plugin.Log.LogInfo($"{(f9 ? "F9" : "web-app")} → dump gestart op achtergrond-thread…");
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
