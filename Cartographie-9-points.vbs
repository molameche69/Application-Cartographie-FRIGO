Set WshShell = CreateObject("WScript.Shell")

' 1. Se déplacer vers le dossier du site et lancer Mongoose sans fenêtre (le 0 gère l'invisibilité)
WshShell.CurrentDirectory = "C:\Users\molam\Documents\Application-Cartographie-FRIGO"
WshShell.Run "mongoose.exe", 0, False

' 2. Attendre 1 seconde (1000 millisecondes) que le serveur s'allume
WScript.Sleep 1000

' 3. Ouvrir le navigateur directement sur le site
WshShell.Run "http://localhost:8000/index.html"