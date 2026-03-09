' Launches Watchdog.ps1 with no visible window (used by Task Scheduler to avoid blank cmd flash)
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
watchdogPath = fso.BuildPath(scriptDir, "Watchdog.ps1")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & watchdogPath & """", 0, False
Set WshShell = Nothing
Set fso = Nothing
