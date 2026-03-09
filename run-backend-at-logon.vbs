' Runs START-BACKEND-AT-LOGON.bat with no launcher window (for Startup shortcut)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd.exe /c """ & WshShell.CurrentDirectory & "\START-BACKEND-AT-LOGON.bat""", 0, False
Set WshShell = Nothing
