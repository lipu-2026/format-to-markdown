Option Explicit

Dim shell, fso, appDir, candidates, pythonw, item
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)

candidates = Array( _
  "D:\Python3.14\pythonw.exe", _
  shell.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python314\pythonw.exe"), _
  shell.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python313\pythonw.exe"), _
  shell.ExpandEnvironmentStrings("%LocalAppData%\Programs\Python\Python312\pythonw.exe") _
)

pythonw = ""
For Each item In candidates
  If fso.FileExists(item) Then
    pythonw = item
    Exit For
  End If
Next

If pythonw = "" Then
  MsgBox "Python was not found. Please use start.bat once to diagnose the installation.", 16, "Format to Markdown"
  WScript.Quit 1
End If

shell.Run """" & pythonw & """ """ & appDir & "\desktop.py""", 0, False
