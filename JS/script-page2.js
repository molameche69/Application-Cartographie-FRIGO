// ==========================================================
// VARIABLES GLOBALES (PAGE 2)
// ==========================================================
let graphiqueRapportInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  // 1. Récupération et affichage des métadonnées de l'utilisateur
  chargerMetadataRapport();

  // 2. Reconstruction de la carte et positionnement des sondes
  reconstruireCarteSondes();

  // 3. Récupération du fichier ODS et reconstruction des données
  reconstruireDonneesEtGraphique();
});

// ==========================================================
// 1. CHARGEMENT DES METADONNÉES TEXTUELLES
// ==========================================================
function chargerMetadataRapport() {
  const champs = [
    "username", "userEntreprise", "userService", "userReference", 
    "userCaracteristique", "userLoc", "tdeconsigne", "valeur", 
    "periode", "userMessage", "filtreHeureDebut", "filtreHeureFin"
  ];

  champs.forEach(champ => {
    const valeurStockee = localStorage.getItem(champ);
    const elementHtml = document.getElementById(`rep-${champ}`) || document.getElementById(champ);
    
    if (elementHtml && valeurStockee) {
      if (elementHtml.tagName === "INPUT" || elementHtml.tagName === "TEXTAREA") {
        elementHtml.value = valeurStockee;
      } else {
        elementHtml.textContent = valeurStockee;
      }
    }
  });

  // Affichage de la date du jour du rapport
  const dateEl = document.getElementById("date-rapport");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("fr-FR");
  }
}

// ==========================================================
// 2. RECONSTRUCTION DE LA CARTE DES SONDES
// ==========================================================
function reconstruireCarteSondes() {
  const carteCible = document.getElementById("carte-cible-rapport");
  const positionsSondesStr = localStorage.getItem("positionsSondes");

  if (!carteCible || !positionsSondesStr) return;

  try {
    const sondes = JSON.parse(positionsSondesStr);
    sondes.forEach(sonde => {
      const imgSonde = document.createElement("img");
      imgSonde.src = sonde.src;
      imgSonde.id = sonde.id;
      imgSonde.className = "marqueur-draggable";
      imgSonde.style.position = "absolute";
      imgSonde.style.left = sonde.left;
      imgSonde.style.top = sonde.top;
      imgSonde.style.margin = "0px";
      imgSonde.style.width = "30px"; // Ajuste selon la taille de tes icônes
      
      carteCible.appendChild(imgSonde);
    });
  } catch (e) {
    console.error("Erreur lors de la reconstruction de la carte :", e);
  }
}

// ==========================================================
// 3. EXTRACTION DU BASE64 ET RECONSTRUCTION GRAPH/TABLEAU
// ==========================================================
function reconstruireDonneesEtGraphique() {
  const odsBase64 = localStorage.getItem("fichierOdsBase64");
  const imageZoomStockee = localStorage.getItem("imageGraphiqueZoome");
  
  // Si une image du graphique zoomé existe, on peut l'afficher directement à la place du canvas
  const conteneurGraph = document.getElementById("conteneur-graphique-rapport");
  if (imageZoomStockee && conteneurGraph) {
    conteneurGraph.innerHTML = `<img src="${imageZoomStockee}" style="max-width:100%; height:auto; display:block; margin:0 auto;" alt="Graphique de l'essai"/>`;
  }

  if (!odsBase64) {
    console.warn("Aucun fichier ODS trouvé en mémoire.");
    return;
  }

  try {
    // Conversion Base64 vers ArrayBuffer pour XLSX
    const binStr = atob(odsBase64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes.buffer, { type: "array", raw: true });
    const feuille = workbook.Sheets[workbook.SheetNames[0]];
    const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1, raw: true });

    let filtreDebut = localStorage.getItem("filtreHeureDebut") || "";
    let filtreFin = localStorage.getItem("filtreHeureFin") || "";
    const pasPeriode = parseInt(localStorage.getItem("periode")) || 1;

    let htmlLignes = "";
    let indexLigneValide = 0;

    for (let i = 1; i < donneesJson.length; i++) {
      const ligne = donneesJson[i];
      if (ligne && ligne[0] !== undefined && ligne[1] !== undefined && ligne[2] !== undefined) {
        const idCapteur = ligne[0].toString().trim();
        let tempsBrut = ligne[1].toString().trim();
        let tempsAffiche = "";

        // Même algorithme de décodage du temps que la Page 1
        let numExcel = parseFloat(tempsBrut);
        if (!isNaN(numExcel) && numExcel.toString() === tempsBrut) {
          let totalSecondes = Math.round((numExcel % 1) * 24 * 3600);
          let heures = Math.floor(totalSecondes / 3600);
          let minutes = Math.floor((totalSecondes % 3600) / 60);
          let secondes = totalSecondes % 60;
          tempsAffiche = String(heures).padStart(2, '0') + ":" + String(minutes).padStart(2, '0') + ":" + String(secondes).padStart(2, '0');
        } else {
          let match = tempsBrut.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
          if (match) {
            let h = match[1].padStart(2, '0');
            let m = match[2].padStart(2, '0');
            let s = match[3] ? match[3].padStart(2, '0') : "00";
            tempsAffiche = `${h}:${m}:${s}`;
          } else {
            tempsAffiche = tempsBrut.substring(0, 8);
          }
        }

        tempsAffiche = tempsAffiche.substring(0, 8);

        // Application des filtres horaires
        if (filtreDebut && tempsAffiche < filtreDebut) continue;
        if (filtreFin && tempsAffiche > filtreFin) continue;

        // Application de la périodicité (Pas de temps)
        if (indexLigneValide % pasPeriode !== 0) {
          indexLigneValide++;
          continue;
        }

        let valeurTemp = parseFloat(ligne[2].toString().replace(",", "."));
        const unite = ligne[3] || "°C";
        const couleurTemp = valeurTemp > 24 ? "#dc3545" : "#007BFF";

        htmlLignes += `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; font-weight: bold;">${idCapteur}</td>
            <td style="padding: 8px;">${tempsAffiche}</td>
            <td style="padding: 8px; font-weight: bold; color: ${couleurTemp};">${valeurTemp.toFixed(2)}</td>
            <td style="padding: 8px; color: #666;">${unite}</td>
          </tr>
        `;

        indexLigneValide++;
      }
    }

    const corpsTableauRapport = document.getElementById("corpsTableauRapport");
    if (corpsTableauRapport) {
      corpsTableauRapport.innerHTML = htmlLignes || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée filtrée.</td></tr>';
    }

  } catch (err) {
    console.error("Erreur globale lors de la reconstruction du rapport :", err);
  }
}

// ==========================================================
// 4. IMPRESSION / EXPORT EN PDF
// ==========================================================
function imprimerRapport() {
  window.print();
}