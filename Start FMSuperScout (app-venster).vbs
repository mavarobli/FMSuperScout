' Start FMSuperScout in app-modus vanaf de broncode: eigen chromeless venster i.p.v. browser-tab.
' Gebruikt de node uit je PATH. Sluit je het venster, dan stopt de server vanzelf.
Option Explicit
Dim sh, fso, base
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = base
sh.Environment("PROCESS")("FMSS_APP") = "1"
sh.Run "node ""app\server.js""", 0, False
