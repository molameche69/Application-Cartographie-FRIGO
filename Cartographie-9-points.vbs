Set WshShell = CreateObject("WScript.Shell")

WshShell.CurrentDirectory = "C:\Users\mlameche\Desktop\Application-Cartographie-FRIGO"
WshShell.Run "mongoose.exe", 0, False

WScript.Sleep 1000

WshShell.Run "http://localhost:8000/index.html"