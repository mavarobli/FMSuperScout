; FMSuperScout — standalone installer
; Installeert alleen de viewer (app + node.exe) en de externe scanner. Sinds 1.6.0 komt
; er niets meer in de gamemap: de scanner leest Football Manager (FM27 en FM26) van
; buitenaf, zonder BepInEx. Een eerder geïnstalleerde FM26-plugin blijft gewoon werken;
; de uninstaller ruimt hem nog wel op (GamePath uit een oudere installatie).
; Bouwen: installer\build-exe.ps1 (staged payload in dist\stage).

#define MyAppName "FMSuperScout"
#define MyAppVersion "1.7.3"
#define Stage "..\dist\stage"

[Setup]
AppId={{6E3F0B7C-9D24-4A8B-B1E5-2C7F4D98A310}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=FMSuperScout
AppPublisherURL=https://github.com/mavarobli/FMSuperScout
DefaultDirName={autopf}\{#MyAppName}
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=admin
OutputDir=..\dist
OutputBaseFilename=FMSuperScout-Setup
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\icon.ico
Compression=lzma2/max
SolidCompression=yes
; Draaiende FMSuperScout (node.exe houdt app-bestanden vast) automatisch sluiten bij
; een update; 'force' omdat een consoleproces geen nette sluit-melding kan ontvangen.
; Maakt de één-klik-update betrouwbaar, ook als de gebruiker de app open laat staan.
CloseApplications=force
RestartApplications=no
WizardStyle=modern
DisableProgramGroupPage=yes
DisableWelcomePage=no
; App-stijl branding (gegenereerd door make-wizard-images.js; Inno kiest per DPI)
WizardImageFile=wizard-side.bmp,wizard-side-2x.bmp
WizardSmallImageFile=wizard-small.bmp,wizard-small-2x.bmp
; Nette exe-metadata: zichtbaar in Eigenschappen/UAC/AV-scanners — oogt legitiem
AppCopyright=(c) 2026 mavarobli
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany=FMSuperScout
VersionInfoDescription=FMSuperScout Setup - scout-tool voor Football Manager
VersionInfoCopyright=(c) 2026 mavarobli
AppSupportURL=https://github.com/mavarobli/FMSuperScout/issues
AppUpdatesURL=https://github.com/mavarobli/FMSuperScout/releases

[Languages]
Name: "nl"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
nl.FirstRunNote=Klaar.%n%nZo werkt het: start Football Manager (FM27 of FM26), laad je save en open FMSuperScout. Klik op "Nieuwe data" of druk in de game op F9.%n%nEr wordt niets in je gamemap geïnstalleerd: FMSuperScout leest de game alleen uit, het verandert niets.
nl.RunViewer=FMSuperScout nu starten
en.FirstRunNote=Done.%n%nHow it works: start Football Manager (FM27 or FM26), load your save and open FMSuperScout. Click "New data" or press F9 in the game.%n%nNothing is installed into your game folder: FMSuperScout only reads the game, it never changes it.
en.RunViewer=Launch FMSuperScout now

[Files]
; viewer + scanner (FMSuperScout.Scanner.exe staat in de viewer-stage)
Source: "{#Stage}\viewer\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[InstallDelete]
; Overblijfsel van ≤1.5.0 (BepInEx-licentie; BepInEx wordt niet meer meegeleverd)
Type: files; Name: "{app}\LICENSE-BepInEx.txt"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\FMSuperScout.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\FMSuperScout.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Run]
Filename: "wscript.exe"; Parameters: """{app}\FMSuperScout.vbs"""; Description: "{cm:RunViewer}"; Flags: postinstall nowait skipifsilent

[UninstallRun]
; De scan-wachter kan na het sluiten van de app doorlopen zolang FM draait; stoppen
; zodat de bestanden verwijderd kunnen worden.
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM FMSuperScout.Scanner.exe"; Flags: runhidden; RunOnceId: "StopScanner"

[Code]
procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpFinished then
    WizardForm.FinishedLabel.Caption := CustomMessage('FirstRunNote');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  GamePath: string;
begin
  { Installaties t/m 1.5.0 zetten een plugin-DLL in de FM26-map. Alleen díe weghalen;
    BepInEx laten staan (andere mods kunnen ervan afhangen). De viewer-map wordt door
    de standaard-uninstall verwijderd. }
  if CurUninstallStep = usUninstall then
    if RegQueryStringValue(HKLM, 'Software\FMSuperScout', 'GamePath', GamePath) then
      DeleteFile(AddBackslash(GamePath) + 'BepInEx\plugins\FMSuperScout.dll');
end;
