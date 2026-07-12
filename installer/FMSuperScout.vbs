' FMSuperScout launcher: start de lokale server in app-modus, zonder console-venster.
' De server opent zelf het chromeless Edge-venster zodra hij luistert en stopt weer
' zodra dat venster gesloten wordt (heartbeat).
Option Explicit
Dim sh, fso, base, node
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = base

' Gebundelde node.exe naast dit script, anders de node uit PATH.
node = base & "\node.exe"
If Not fso.FileExists(node) Then node = "node"

sh.Environment("PROCESS")("FMSS_APP") = "1"
' 0 = venster verborgen, False = niet wachten op afsluiten.
sh.Run """" & node & """ """ & base & "\app\server.js""", 0, False
