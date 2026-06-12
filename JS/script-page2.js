let monGraphiqueInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Démarrage du script de rendu du rapport conforme NF X 15-140...");

  // Le bouton est directement cliquable avec cette méthode
  const btnPdf = document.getElementById("btn-telecharger-pdf");
  if (btnPdf) {
    btnPdf.disabled = false;
    btnPdf.style.opacity = "1";
    btnPdf.style.cursor = "pointer";
  }

  // ==========================================================
  // 1. INJECTION DES CHAMPS TEXTES DEPUIS LE LOCALSTORAGE
  // ==========================================================
  const champs = {
    "report-username": "username",
    "report-userEntreprise": "userEntreprise",
    "report-userService": "userService",
    "report-userReference": "userReference",
    "report-userCaracteristique": "userCaracteristique",
    "report-userLoc": "userLoc",
    "report-tdeconsigne": "tdeconsigne",
    "report-valeur": "valeur",
    "report-periode": "periode"
  };

  for (let id in champs) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = localStorage.getItem(champs[id]) || "Non renseigné";
    }
  }

  // --- Gestion explicite des filtres de la période d'analyse ---
  const elDebut = document.getElementById("report-filtreHeureDebut");
  const elFin = document.getElementById("report-filtreHeureFin");
  
  const heureDebutStockee = localStorage.getItem("filtreHeureDebut");
  const heureFinStockee = localStorage.getItem("filtreHeureFin");

  if (elDebut) {
    elDebut.textContent = heureDebutStockee && heureDebutStockee !== "" 
      ? heureDebutStockee.substring(0, 5) 
      : "Début de l'enregistrement";
  }
  if (elFin) {
    elFin.textContent = heureFinStockee && heureFinStockee !== "" 
      ? heureFinStockee.substring(0, 5) 
      : "Fin de l'enregistrement";
  }

  // --- Gestion propre du Mode Opératoire ---
  const elMessage = document.getElementById("report-message");
  if (elMessage) {
    const messageStocke = localStorage.getItem("userMessage");
    if (messageStocke) {
      elMessage.innerHTML = messageStocke.replace(/\n/g, "<br />");
    } else {
      elMessage.textContent = "Non renseigné";
    }
  }

  // ==========================================================
  // 2. RESTITUTION CORRECTE ET REDIMENSIONNÉE DES SONDES
  // ==========================================================
  const carteRapport = document.getElementById("carte-rapport");
  const sondesStockees = localStorage.getItem("positionsSondes");

  if (carteRapport && sondesStockees) {
    try {
      JSON.parse(sondesStockees).forEach((sonde) => {
        const imgSonde = document.createElement("img");
        imgSonde.src = sonde.src;
        imgSonde.className = "sonde-icone";
        imgSonde.style.position = "absolute";
        imgSonde.style.left = sonde.left;
        imgSonde.style.top = sonde.top;
        imgSonde.style.transform = "translate(-50%, -50%)";
        
        imgSonde.style.width = "28px";
        imgSonde.style.height = "28px";
        imgSonde.style.objectFit = "contain";

        carteRapport.appendChild(imgSonde);
      });
    } catch (e) {
      console.error("Erreur d'injection des sondes :", e);
    }
  }

  chargerDonneesODSRapport();
});

// ==========================================================
// 3. TRAITEMENT DE L'IMAGE DU GRAPHIQUE ET CHARGEMENT MEMOIRE
// ==========================================================
function chargerDonneesODSRapport() {
  const imageZoomee = localStorage.getItem("imageGraphiqueZoome");
  const canvasRapport = document.getElementById("graphiqueTemperatures");

  if (!imageZoomee) {
    if (canvasRapport) canvasRapport.classList.add("masque");
  } else if (canvasRapport) {
    const wrapper = canvasRapport.closest(".wrapper-canvas");
    if (wrapper) {
      wrapper.innerHTML = `<img src="${imageZoomee}" class="graphique-image-zoom graphique-rapport-img" alt="Graphique Sélectionné" />`;
    }
  }

  const conteneurTableau = document.querySelector(".conteneur-tableau");
  if (!conteneurTableau) return;

  const filtreDebut = localStorage.getItem("filtreHeureDebut") || "";
  const filtreFin = localStorage.getItem("filtreHeureFin") || "";

  // RÉCUPÉRATION DU FICHIER TRANSMIS PAR LA PAGE 1 EN BASE64
  const fichierBase64 = localStorage.getItem("fichierOdsBase64");

  if (!fichierBase64) {
    conteneurTableau.innerHTML = `<p class="erreur-filtrage">Aucun fichier de relevés disponible. Veuillez importer un fichier en page 1.</p>`;
    return;
  }

  try {
    // Décodage de la chaîne Base64 pour reconstituer le tableau binaire (XLSX)
    const chaineBinaire = atob(fichierBase64);
    const longueur = chaineBinaire.length;
    const buffer = new Uint8Array(longueur);
    
    for (let i = 0; i < longueur; i++) {
      buffer[i] = chaineBinaire.charCodeAt(i);
    }

    const workbook = XLSX.read(buffer, { type: "array" });
    const feuille = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(feuille, { header: 1 });

    const donneesCapteurs = {};

    for (let i = 1; i < json.length; i++) {
      const ligne = json[i];
      if (ligne && ligne[0] !== undefined && ligne[1] !== undefined && ligne[2] !== undefined) {
        const id = ligne[0].toString().trim();
        let tempsBrut = ligne[1].toString().trim();
        let tempsAffiche = tempsBrut.includes("T") ? tempsBrut.split("T")[1].replace("Z", "") : tempsBrut;

        tempsAffiche = tempsAffiche.substring(0, 8);

        if (filtreDebut && tempsAffiche < filtreDebut) continue;
        if (filtreFin && tempsAffiche > filtreFin) continue;

        if (!donneesCapteurs[id]) donneesCapteurs[id] = [];
        donneesCapteurs[id].push(parseFloat(ligne[2]));
      }
    }

    const statsCapteurs = {};
    let sommeDesMoyennes = 0;
    let nombreCapteurs = Object.keys(donneesCapteurs).length;

    if (nombreCapteurs === 0) {
      conteneurTableau.innerHTML = `<p class="erreur-filtrage">Aucune donnée trouvée pour la plage horaire sélectionnée.</p>`;
      return;
    }

    Object.keys(donneesCapteurs).forEach((id) => {
      const releves = donneesCapteurs[id].filter((v) => !isNaN(v));
      const n = releves.length;
      if (n === 0) return;

      const max = Math.max(...releves);
      const min = Math.min(...releves);
      const moyenne = releves.reduce((a, b) => a + b, 0) / n;
      sommeDesMoyennes += moyenne;

      const stabilite = max - min;
      const sommeCarresSomme = releves.reduce((acc, val) => acc + Math.pow(val - moyenne, 2), 0);
      const ecartTypeExp = n > 1 ? Math.sqrt(sommeCarresSomme / (n - 1)) : 0;

      statsCapteurs[id] = { moyenne, stabilite, ecartTypeExp, n };
    });

    const Xair = nombreCapteurs > 0 ? sommeDesMoyennes / nombreCapteurs : 0;
    const toutesLesStabilites = Object.values(statsCapteurs).map((s) => s.stabilite);
    const SXM = toutesLesStabilites.length > 0 ? Math.max(...toutesLesStabilites) : 0;
    const sommeEcartTypeExpCarre = Object.values(statsCapteurs).reduce((acc, s) => acc + Math.pow(s.ecartTypeExp, 2), 0);
    const Sr = nombreCapteurs > 0 ? Math.sqrt(sommeEcartTypeExpCarre / nombreCapteurs) : 0;

    const premierId = Object.keys(statsCapteurs)[0];
    const nGenerique = premierId ? statsCapteurs[premierId].n : 1;
    const sommeVarianceInterCapteurs = Object.values(statsCapteurs).reduce((acc, s) => acc + Math.pow(s.moyenne - Xair, 2), 0);
    const partieDroiteSR = nombreCapteurs > 1 ? (1 / (nombreCapteurs - 1)) * sommeVarianceInterCapteurs : 0;
    const SR = Math.sqrt(Math.pow(Sr, 2) * (1 - 1 / nGenerique) + partieDroiteSR);

    // Fonction d'affichage du tableau statistique
    creerTableauStatistiques(statsCapteurs, Xair, SXM, Sr, SR);

  } catch (err) {
    console.error("Erreur d'analyse ODS en Page 2 :", err);
    conteneurTableau.innerHTML = `<p class="erreur-ods">Erreur lors de la génération des statistiques du rapport.</p>`;
  }
}

// ==========================================================
// INTERNE : COMPILATION ET RENDU DU TABLEAU NF X 15-140
// ==========================================================
function creerTableauStatistiques(statsCapteurs, Xair, SXM, Sr, SR) {
  const conteneurTableau = document.querySelector(".conteneur-tableau");
  if (!conteneurTableau) return;

  const tempConsigne = parseFloat(localStorage.getItem("tdeconsigne")) || 0.0;
  const emt = parseFloat(localStorage.getItem("valeur")) || 2.0;

  let html = `
    <table class="tab-donnees table-rapport-spec">
      <thead>
        <tr class="entete-gris">
          <th class="cellule-commune">Capteur / Paramètre Global</th>
          <th class="cellule-commune">Moyenne (Xmj)</th>
          <th class="cellule-commune">Stabilité (SXj)</th>
          <th class="cellule-commune">Écart / Consigne</th>
          <th class="cellule-commune">Statut (NF X 15-140)</th>
        </tr>
      </thead>
      <tbody>
  `;

  let enceinteConforme = true;

  Object.keys(statsCapteurs).forEach((id) => {
    const s = statsCapteurs[id];
    const ecartConsigne = Math.abs(s.moyenne - tempConsigne);
    const estConforme = ecartConsigne + (s.stabilite / 2) <= emt;

    if (!estConforme) enceinteConforme = false;

    html += `
      <tr>
        <td class="cellule-commune"><span class="nom-capteur">Capteur ${id}</span></td>
        <td class="cellule-commune">${s.moyenne.toFixed(3)} °C</td>
        <td class="cellule-commune">${s.stabilite.toFixed(3)} °C</td>
        <td class="cellule-commune">${(s.moyenne - tempConsigne).toFixed(3)} °C</td>
        <td class="cellule-commune aligne-centre"><span class="${estConforme ? "statut-conforme" : "statut-non-conforme"} texte-gras">${estConforme ? "OK" : "X"}</span></td>
      </tr>
    `;
  });

  html += `
        <tr class="ligne-globale ligne-separatrice texte-gras fond-synthese">
          <td class="cellule-commune">Synthèse de l'air (Xair)</td>
          <td colspan="4" class="cellule-commune">${Xair.toFixed(3)} °C (Écart global : ${(Xair - tempConsigne).toFixed(3)} °C)</td>
        </tr>
        <tr class="ligne-globale texte-gras fond-synthese">
          <td class="cellule-commune">Stabilité Maximale (SXM)</td>
          <td colspan="4" class="cellule-commune">${SXM.toFixed(3)} °C</td>
        </tr>
        <tr class="ligne-globale texte-gras fond-synthese">
          <td class="cellule-commune">Répétabilité (Sr) / Reproductibilité (SR)</td>
          <td colspan="4" class="cellule-commune">Sr : ${Sr.toFixed(3)} | SR : ${SR.toFixed(3)}</td>
        </tr>
        <tr class="ligne-emt texte-gras fond-synthese">
          <td class="cellule-commune">Spécification : Consigne & EMT</td>
          <td colspan="4" class="cellule-commune">Objectif : ${tempConsigne.toFixed(1)} °C | EMT : &plusmn; ${emt.toFixed(1)} °C</td>
        </tr>
        <tr class="ligne-globale texte-gras conclusion-globale-taille ${enceinteConforme ? "ligne-conforme" : "ligne-non-conforme"}">
          <td class="cellule-commune">Conclusion Enceinte (NF X 15-140)</td>
          <td colspan="4" class="cellule-commune aligne-centre texte-temps-statut">${enceinteConforme ? "ENCEINTE CONFORME" : "ENCEINTE NON CONFORME"}</td>
        </tr>
      </tbody>
    </table>
  `;

  conteneurTableau.innerHTML = html;
}

// ==========================================================
// 5. NOUVELLE METHODE NATIVE SANS CAPTURE D'ECRAN
// ==========================================================
function telechargerPDFDirect() {
  // Lance instantanément l'outil d'impression du système d'exploitation
  window.print();
}