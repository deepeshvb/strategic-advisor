' Runs backend daemon with no visible window (0 = hidden)
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
batPath = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "run-backend-daemon.bat")
WshShell.Run "cmd.exe /c """ & batPath & """", 0, False
