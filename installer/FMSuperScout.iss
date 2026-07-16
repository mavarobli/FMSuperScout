; FMSuperScout — standalone installer
; Installeert: viewer (app + node.exe), BepInEx 6 (alleen als nog niet aanwezig)
; en de FMSuperScout-plugin in de Football Manager 26-map.
; De FM26-map wordt automatisch gedetecteerd: Steam (alle libraries via
; libraryfolders.vdf), Epic (launcher-manifests) en Xbox/Game Pass (XboxGames),
; met een handmatige mapkiezer als vangnet.
; Bouwen: installer\build-exe.ps1 (staged payload in dist\stage).

#define MyAppName "FMSuperScout"
#define MyAppVersion "1.0.0"
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
VersionInfoDescription=FMSuperScout Setup - scout-tool voor Football Manager 26
VersionInfoCopyright=(c) 2026 mavarobli
AppSupportURL=https://github.com/mavarobli/FMSuperScout/issues
AppUpdatesURL=https://github.com/mavarobli/FMSuperScout/releases

[Languages]
Name: "nl"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
nl.GamePageCaption=Football Manager 26-map
nl.GamePageDesc=Waar staat Football Manager 26 geïnstalleerd?
nl.GamePageInfo=De plugin (en BepInEx, indien nog niet aanwezig) wordt in deze map geïnstalleerd. Controleer of het pad klopt.
nl.DetectedSteam=Automatisch gevonden via Steam.
nl.DetectedEpic=Automatisch gevonden via de Epic Games Launcher.
nl.DetectedXbox=Automatisch gevonden via de Xbox-app (XboxGames).
nl.DetectedNone=Niet automatisch gevonden — wijs de map zelf aan (de map met fm.exe).
nl.InvalidGameDir=Dit lijkt geen Football Manager 26-map (fm.exe niet gevonden). Kies de juiste map.
nl.FmRunning=Football Manager 26 draait nog. Sluit de game volledig af en klik op "Opnieuw".
nl.FirstRunNote=Klaar! Let op:%n%n• De EERSTE keer dat je FM26 start duurt het 1-3 minuten extra (zwart consolevenster = normaal): de mod-laag stelt zichzelf in.%n• Meldt je virusscanner iets over BepInEx/winhttp.dll? Dat is de bekende mod-laag die ook door andere FM26-mods gebruikt wordt; keur hem goed.%n%nDaarna: start FM26, laad je save en druk op F9 — FMSuperScout doet de rest.
nl.RunViewer=FMSuperScout nu starten
en.GamePageCaption=Football Manager 26 folder
en.GamePageDesc=Where is Football Manager 26 installed?
en.GamePageInfo=The plugin (and BepInEx, if not yet present) will be installed into this folder. Please verify the path.
en.DetectedSteam=Detected automatically via Steam.
en.DetectedEpic=Detected automatically via the Epic Games Launcher.
en.DetectedXbox=Detected automatically via the Xbox app (XboxGames).
en.DetectedNone=Not detected automatically — please locate the folder yourself (the one containing fm.exe).
en.InvalidGameDir=This does not look like a Football Manager 26 folder (fm.exe not found). Please pick the correct folder.
en.FmRunning=Football Manager 26 is still running. Close the game completely, then click "Retry".
en.FirstRunNote=Done! Please note:%n%n• The FIRST launch of FM26 takes 1-3 minutes longer (a black console window is normal): the mod layer is setting itself up.%n• If your antivirus flags BepInEx/winhttp.dll: that is the well-known mod loader also used by other FM26 mods; allow it.%n%nThen: start FM26, load your save and press F9 — FMSuperScout does the rest.
en.RunViewer=Launch FMSuperScout now

[Files]
; ---- viewer ----
Source: "{#Stage}\viewer\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion
Source: "{#Stage}\LICENSE-BepInEx.txt"; DestDir: "{app}"; Flags: ignoreversion
; ---- BepInEx (alleen als er nog geen BepInEx in de gamemap staat) ----
Source: "{#Stage}\bepinex\*"; DestDir: "{code:GetGameDir}"; Flags: recursesubdirs ignoreversion; Check: NeedBepInEx
; ---- plugin ----
Source: "{#Stage}\FMSuperScout.dll"; DestDir: "{code:GetGameDir}\BepInEx\plugins"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\FMSuperScout.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\FMSuperScout.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Registry]
; Gamemap onthouden voor de uninstaller en voor her-installaties.
Root: HKLM; Subkey: "Software\FMSuperScout"; ValueType: string; ValueName: "GamePath"; ValueData: "{code:GetGameDir}"; Flags: uninsdeletekey

[Run]
Filename: "wscript.exe"; Parameters: """{app}\FMSuperScout.vbs"""; Description: "{cm:RunViewer}"; Flags: postinstall nowait skipifsilent

[Code]
var
  GamePage: TInputDirWizardPage;
  DetectSource: string;

{ ---------- kleine parse-helpers ---------- }

{ Eerstvolgende "..."-waarde in S vanaf positie P; P schuift voorbij de waarde. }
function NextQuotedValue(const S: string; var P: Integer): string;
var
  A, B: Integer;
begin
  Result := '';
  A := P;
  while (A <= Length(S)) and (S[A] <> '"') do A := A + 1;
  if A > Length(S) then begin P := A; exit; end;
  B := A + 1;
  while (B <= Length(S)) and (S[B] <> '"') do B := B + 1;
  if B > Length(S) then begin P := B; exit; end;
  Result := Copy(S, A + 1, B - A - 1);
  P := B + 1;
end;

{ Waarde achter een "Key" (VDF/JSON): zoek de sleutel, pak de volgende quoted string. }
function ValueAfterKey(const S, Key: string; var From: Integer): string;
var
  K, P: Integer;
begin
  Result := '';
  K := Pos('"' + Key + '"', Copy(S, From, MaxInt));
  if K = 0 then begin From := 0; exit; end;
  P := From + K - 1 + Length(Key) + 2;
  Result := NextQuotedValue(S, P);
  From := P;
end;

{ \\ → \ (VDF en JSON escapen backslashes) }
function Unescape(const S: string): string;
begin
  Result := S;
  StringChangeEx(Result, '\\', '\', True);
end;

function ValidGameDir(const Dir: string): Boolean;
begin
  Result := (Dir <> '') and FileExists(AddBackslash(Dir) + 'fm.exe');
end;

{ ---------- platformdetectie ---------- }

function DetectSteam: string;
var
  SteamRoot, Vdf, Acf, Content, InstallDir, LibPath, Cand: string;
  Libs: TStringList;
  AnsiContent: AnsiString;
  P, I: Integer;
begin
  Result := '';
  { Steam is 32-bit → onder WOW6432Node op 64-bit Windows (HKLM32). }
  if not RegQueryStringValue(HKLM32, 'SOFTWARE\Valve\Steam', 'InstallPath', SteamRoot) then
    if not RegQueryStringValue(HKCU, 'Software\Valve\Steam', 'SteamPath', SteamRoot) then
      exit;
  StringChangeEx(SteamRoot, '/', '\', True);
  Libs := TStringList.Create;
  try
    Libs.Add(SteamRoot);
    { Alle extra libraries (D:\SteamLibrary etc.) uit libraryfolders.vdf. }
    Vdf := AddBackslash(SteamRoot) + 'steamapps\libraryfolders.vdf';
    if LoadStringFromFile(Vdf, AnsiContent) then
    begin
      Content := String(AnsiContent);
      P := 1;
      repeat
        LibPath := ValueAfterKey(Content, 'path', P);
        if (P > 0) and (LibPath <> '') then Libs.Add(Unescape(LibPath));
      until P = 0;
    end;
    { FM26 = Steam AppID 3551340. Zoek de library met het app-manifest. }
    for I := 0 to Libs.Count - 1 do
    begin
      Acf := AddBackslash(Libs[I]) + 'steamapps\appmanifest_3551340.acf';
      if LoadStringFromFile(Acf, AnsiContent) then
      begin
        Content := String(AnsiContent);
        P := 1;
        InstallDir := ValueAfterKey(Content, 'installdir', P);
        if InstallDir = '' then InstallDir := 'Football Manager 26';
        Cand := AddBackslash(Libs[I]) + 'steamapps\common\' + InstallDir;
        if ValidGameDir(Cand) then begin Result := Cand; exit; end;
      end;
    end;
  finally
    Libs.Free;
  end;
end;

function DetectEpic: string;
var
  Dir, Content, Loc: string;
  FindRec: TFindRec;
  AnsiContent: AnsiString;
  P: Integer;
begin
  Result := '';
  Dir := ExpandConstant('{commonappdata}\Epic\EpicGamesLauncher\Data\Manifests');
  if not FindFirst(Dir + '\*.item', FindRec) then exit;
  try
    repeat
      if LoadStringFromFile(Dir + '\' + FindRec.Name, AnsiContent) then
      begin
        Content := String(AnsiContent);
        if Pos('Football Manager 26', Content) > 0 then
        begin
          P := 1;
          Loc := Unescape(ValueAfterKey(Content, 'InstallLocation', P));
          if ValidGameDir(Loc) then begin Result := Loc; exit; end;
        end;
      end;
    until not FindNext(FindRec);
  finally
    FindClose(FindRec);
  end;
end;

function DetectXbox: string;
var
  D: Integer;
  Cand: string;
begin
  Result := '';
  { Xbox-app installeert moddable games onder <schijf>:\XboxGames\<naam>\Content. }
  for D := Ord('C') to Ord('L') do
  begin
    Cand := Chr(D) + ':\XboxGames\Football Manager 26\Content';
    if ValidGameDir(Cand) then begin Result := Cand; exit; end;
  end;
end;

{ ---------- wizard ---------- }

procedure InitializeWizard;
var
  Detected: string;
begin
  Detected := DetectSteam;
  if Detected <> '' then DetectSource := CustomMessage('DetectedSteam')
  else
  begin
    Detected := DetectEpic;
    if Detected <> '' then DetectSource := CustomMessage('DetectedEpic')
    else
    begin
      Detected := DetectXbox;
      if Detected <> '' then DetectSource := CustomMessage('DetectedXbox')
      else DetectSource := CustomMessage('DetectedNone');
    end;
  end;

  GamePage := CreateInputDirPage(wpSelectDir,
    CustomMessage('GamePageCaption'), CustomMessage('GamePageDesc'),
    CustomMessage('GamePageInfo') + #13#10 + DetectSource, False, 'Football Manager 26');
  GamePage.Add('');
  GamePage.Values[0] := Detected;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (GamePage <> nil) and (CurPageID = GamePage.ID) then
    if not ValidGameDir(GamePage.Values[0]) then
    begin
      MsgBox(CustomMessage('InvalidGameDir'), mbError, MB_OK);
      Result := False;
    end;
end;

function GetGameDir(Param: string): string;
begin
  Result := RemoveBackslashUnlessRoot(GamePage.Values[0]);
end;

{ Eén keer bepalen en cachen: de Check wordt per payload-bestand aangeroepen, en
  zodra de eerste core-DLL gekopieerd is zou een live-check omslaan en de rest
  van de payload overslaan. }
var
  BepInExNeeded, BepInExChecked: Boolean;

function NeedBepInEx: Boolean;
begin
  if not BepInExChecked then
  begin
    BepInExNeeded := not FileExists(AddBackslash(GetGameDir('')) + 'BepInEx\core\BepInEx.Core.dll');
    BepInExChecked := True;
  end;
  Result := BepInExNeeded;
end;

{ ---------- fm.exe-draaicheck ---------- }

function IsFMRunning: Boolean;
var
  Locator, WMI, Procs: Variant;
begin
  Result := False;
  try
    Locator := CreateOleObject('WbemScripting.SWbemLocator');
    WMI := Locator.ConnectServer('', 'root\cimv2');
    Procs := WMI.ExecQuery('SELECT Name FROM Win32_Process WHERE Name=''fm.exe''');
    Result := Procs.Count > 0;
  except
    { WMI niet beschikbaar → niet blokkeren }
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  while IsFMRunning do
    if MsgBox(CustomMessage('FmRunning'), mbError, MB_RETRYCANCEL) = IDCANCEL then
    begin
      Result := CustomMessage('FmRunning');
      exit;
    end;
end;

{ ---------- afronding & uninstall ---------- }

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpFinished then
    WizardForm.FinishedLabel.Caption := CustomMessage('FirstRunNote');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  GamePath: string;
begin
  { Alleen ónze plugin-DLL weghalen; BepInEx laten staan (andere mods kunnen
    ervan afhangen). De viewer-map wordt door de standaard-uninstall verwijderd. }
  if CurUninstallStep = usUninstall then
    if RegQueryStringValue(HKLM, 'Software\FMSuperScout', 'GamePath', GamePath) then
      DeleteFile(AddBackslash(GamePath) + 'BepInEx\plugins\FMSuperScout.dll');
end;
