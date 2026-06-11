// ==========================================================
// VARIABLES GLOBALES
// ==========================================================
let monGraphiqueInstance = null;

// ==========================================================
// 1. INITIALISATION AU CHARGEMENT DE LA PAGE DE SAISIE
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const marqueurs = document.querySelectorAll(".marqueur-draggable");
  const carteCible = document.getElementById("carte-cible");
  const reserveCible = document.getElementById("reserve-cible");

  // Activation du Drag & Drop sur toutes les images de sondes
  marqueurs.forEach((marqueur) => {
    marqueur.setAttribute("draggable", "true");

    marqueur.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", e.target.id);
      e.target.style.opacity = "0.5";
    });

    marqueur.addEventListener("dragend", (e) => {
      e.target.style.opacity = "1";
    });
  });

  // Zone de dépôt : Sur la carte
  if (carteCible) {
    carteCible.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    carteCible.addEventListener("drop", (e) => {
      e.preventDefault();
      const idElement = e.dataTransfer.getData("text/plain");
      const elementGlisse = document.getElementById(idElement);

      if (elementGlisse) {
        const limitesCarte = carteCible.getBoundingClientRect();
        const x = e.clientX - limitesCarte.left;
        const y = e.clientY - limitesCarte.top;

        const xPourcentage = (x / limitesCarte.width) * 100;
        const yPourcentage = (y / limitesCarte.height) * 100;

        carteCible.appendChild(elementGlisse);
        elementGlisse.style.position = "absolute";
        elementGlisse.style.left = xPourcentage + "%";
        elementGlisse.style.top = yPourcentage + "%";
        elementGlisse.style.margin = "0px";
      }
    });
  }

  // Zone de dépôt : Retour dans la réserve
  if (reserveCible) {
    reserveCible.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    reserveCible.addEventListener("drop", (e) => {
      e.preventDefault();
      const idElement = e.dataTransfer.getData("text/plain");
      const elementGlisse = document.getElementById(idElement);

      if (elementGlisse) {
        reserveCible.appendChild(elementGlisse);
        elementGlisse.style.position = "";
        elementGlisse.style.left = "";
        elementGlisse.style.top = "";
      }
    });
  }

  // Chargement automatique initial du tableur ODS si les éléments sont présents
  if (
    document.getElementById("corpsTableauODS") ||
    document.getElementById("graphiqueTemperatures")
  ) {
    // Si nous sommes sur la page rapport, le script d'initialisation du rapport prendra le relais.
    // Cette condition évite les doubles appels si les deux scripts sont chargés ensemble.
    if (!document.getElementById("report-username")) {
      chargerFichierODS();
    }
  }
});

// ==========================================================
// 2. FONCTIONS DE NAVIGATION ET REINITIALISATION
// ==========================================================
function changerOnglet(evenement, idOnglet) {
  const contenus = document.getElementsByClassName("contenu-onglet");
  for (let i = 0; i < contenus.length; i++) {
    contenus[i].style.display = "none";
  }

  const boutons = document.getElementsByClassName("onglet-btn");
  for (let i = 0; i < boutons.length; i++) {
    boutons[i].className = boutons[i].className.replace(" actif", "");
  }

  document.getElementById(idOnglet).style.display = "block";
  if (evenement) {
    evenement.currentTarget.className += " actif";
  }
}

function reinitialiserMarqueurs() {
  const reserve = document.getElementById("reserve-cible");
  const tousLesMarqueurs = document.querySelectorAll(".marqueur-draggable");
  if (reserve) {
    tousLesMarqueurs.forEach((marqueur) => {
      reserve.appendChild(marqueur);
      marqueur.style.position = "";
      marqueur.style.left = "";
      marqueur.style.top = "";
    });
  }
  localStorage.removeItem("positionsSondes");
}

// ==========================================================
// 3. CHARGEMENT ET PARSING DU FICHIER EXCEL/ODS (PAGE SAISIE)
// ==========================================================
function chargerFichierODS() {
  const cheminFichierODS = "Relevés.ods";
  console.log("Lecture du fichier :", cheminFichierODS);

  const filtreDebut = document.getElementById("heureDebut")?.value.trim() || "";
  const filtreFin = document.getElementById("heureFin")?.value.trim() || "";

  localStorage.setItem("filtreHeureDebut", filtreDebut);
  localStorage.setItem("filtreHeureFin", filtreFin);

  fetch(cheminFichierODS)
    .then((response) => {
      if (!response.ok) throw new Error(`Fichier introuvable.`);
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array" });
      const feuille = workbook.Sheets[workbook.SheetNames[0]];
      const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

      const donneesCapteurs = {};
      const tousLesHorodatages = new Set();
      let htmlLignes = "";

      for (let i = 1; i < donneesJson.length; i++) {
        const ligne = donneesJson[i];
        if (
          ligne &&
          ligne[0] !== undefined &&
          ligne[1] !== undefined &&
          ligne[2] !== undefined
        ) {
          const idCapteur = ligne[0].toString().trim();
          let tempsBrut = ligne[1].toString().trim();
          let tempsAffiche = tempsBrut.includes("T")
            ? tempsBrut.split("T")[1].replace("Z", "")
            : tempsBrut;

          if (filtreDebut && tempsAffiche < filtreDebut) continue;
          if (filtreFin && tempsAffiche > filtreFin) continue;

          const valeurTemp = parseFloat(ligne[2]);
          const unite = ligne[3] || "°C";

          if (!donneesCapteurs[idCapteur]) donneesCapteurs[idCapteur] = {};
          donneesCapteurs[idCapteur][tempsAffiche] = valeurTemp;
          tousLesHorodatages.add(tempsAffiche);

          const couleurTemp = valeurTemp > 24 ? "#dc3545" : "#007BFF";

          htmlLignes += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 8px; font-weight: bold; color: #333;">${idCapteur}</td>
                            <td style="padding: 8px;">${tempsBrut.replace("T", " ").replace("Z", "")}</td>
                            <td style="padding: 8px; font-weight: bold; color: ${couleurTemp};">${valeurTemp.toFixed(2)}</td>
                            <td style="padding: 8px; color: #888;">${unite}</td>
                        </tr>
                    `;
        }
      }

      const corpsTableau = document.getElementById("corpsTableauODS");
      if (corpsTableau) {
        corpsTableau.innerHTML = htmlLignes || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée ne correspond aux filtres.</td></tr>';
      }

      const poolLabelsX = Array.from(tousLesHorodatages);
      const listeLabelsX = poolLabelsX.sort();
      const listeIdsCapteurs = Object.keys(donneesCapteurs);

      const couleursCourbes = [
        { border: "#007BFF", bg: "rgba(0, 123, 255, 0.02)" },
        { border: "#28a745", bg: "rgba(40, 167, 69, 0.02)" },
        { border: "#dc3545", bg: "rgba(220, 53, 69, 0.02)" },
      ];

      const datasetsGraphique = listeIdsCapteurs.map((id, index) => {
        const dataPoints = listeLabelsX.map((temps) =>
          donneesCapteurs[id][temps] !== undefined
            ? donneesCapteurs[id][temps]
            : null,
        );
        const couleur = couleursCourbes[index % couleursCourbes.length];
        return {
          label: `Capteur ${id}`,
          data: dataPoints,
          borderColor: couleur.border,
          backgroundColor: couleur.bg,
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          spanGaps: true,
        };
      });

      genererGraphiqueTriCapteurs(listeLabelsX, datasetsGraphique);
    })
    .catch((error) => {
      console.error(error);
      const corpsTableau = document.getElementById("corpsTableauODS");
      if (corpsTableau) {
        corpsTableau.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #dc3545; padding: 20px;">⚠️ Fichier ODS manquant ou serveur local déconnecté.</td></tr>`;
      }
    });
}

function genererGraphiqueTriCapteurs(labelsX, datasetsFournis) {
  const canvas = document.getElementById("graphiqueTemperatures");
  if (!canvas) return;

  if (monGraphiqueInstance) monGraphiqueInstance.destroy();

  const ctx = canvas.getContext("2d");
  monGraphiqueInstance = new Chart(ctx, {
    type: "line",
    data: { labels: labelsX, datasets: datasetsFournis },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" } },
      scales: {
        y: { title: { display: true, text: "Température (°C)" } },
        x: {
          title: { display: true, text: "Horodatage (UTC)" },
          ticks: { maxTicksLimit: 12 },
        },
      },
    },
  });
}

// ==========================================================
// 4. SAUVEGARDE LOCALE ET REDIRECTION AUTOMATISÉE
// ==========================================================
function sauvegarderToutEtDiriger() {
  // Sauvegarde des inputs basiques
  localStorage.setItem("username", document.getElementById("username")?.value || "");
  localStorage.setItem("userEntreprise", document.getElementById("userEntreprise")?.value || "");
  localStorage.setItem("userService", document.getElementById("userService")?.value || "");
  localStorage.setItem("userReference", document.getElementById("userReference")?.value || "");
  localStorage.setItem("userCaracteristique", document.getElementById("userCaracteristique")?.value || "");
  localStorage.setItem("userLoc", document.getElementById("userLoc")?.value || "");

  localStorage.setItem("tdeconsigne", document.getElementById("tdeconsigne")?.value || "");
  localStorage.setItem("valeur", document.getElementById("valeur")?.value || "");
  localStorage.setItem("periode", document.getElementById("periode")?.value || "");
  localStorage.setItem("userMessage", document.getElementById("userMessage")?.value || "");

  // Sauvegarde des positions des sondes
  const carteCible = document.getElementById("carte-cible");
  if (carteCible) {
    const toutesLesSondes = carteCible.querySelectorAll(".marqueur-draggable");
    const donneesSondes = [];
    toutesLesSondes.forEach((sonde) => {
      donneesSondes.push({
        id: sonde.id,
        src: sonde.getAttribute("src"),
        left: sonde.style.left,
        top: sonde.style.top,
      });
    });
    localStorage.setItem("positionsSondes", JSON.stringify(donneesSondes));
  }

  // CAPTURE ÉCRAN AUTOMATIQUE DU TABLEAU SANS EFFORT UTILISATEUR
  const tableauODS = document.getElementById("corpsTableauODS")?.closest("table");
  const ongletTableau = document.getElementById("onglet3");

  if (tableauODS && ongletTableau) {
    // Étape cruciale : Conserver l'état initial de l'onglet
    const styleInitial = ongletTableau.style.display;
    
    // Forcer temporairement l'affichage pour que html2canvas puisse calculer les dimensions de l'élément
    ongletTableau.style.display = "block";

    html2canvas(tableauODS, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    }).then((canvas) => {
      const imageTableauCapturee = canvas.toDataURL("image/png");
      localStorage.setItem("imageTableauSelection", imageTableauCapturee);
      console.log("📸 Capture du tableau générée et sauvegardée automatiquement !");
      
      // Rétablir l'affichage d'origine
      ongletTableau.style.display = styleInitial;
      
      // Redirection immédiate après succès de la capture
      window.location.href = "index-page2-Rapport.html";
    }).catch((err) => {
      console.error("Erreur lors de la capture automatique :", err);
      ongletTableau.style.display = styleInitial;
      // Redirection quand même pour ne pas bloquer l'utilisateur
      window.location.href = "index-page2-Rapport.html";
    });
  } else {
    // Si aucun tableau n'est trouvé, on redirige normalement
    window.location.href = "index-page2-Rapport.html";
  }
}

// ==========================================================
// 5. INITIALISATION AU CHARGEMENT DE LA PAGE RAPPORT
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  // On vérifie d'abord si on est bien sur la page Rapport
  if (!document.getElementById("report-username")) return;

  // --- SECTION 1 : Identification de l'enceinte ---
  if (document.getElementById("report-username")) {
    document.getElementById("report-username").textContent =
      localStorage.getItem("username") || "Non renseigné";
  }
  if (document.getElementById("report-entreprise")) {
    document.getElementById("report-entreprise").textContent =
      localStorage.getItem("userEntreprise") || "Non renseigné";
  }
  if (document.getElementById("report-service")) {
    document.getElementById("report-service").textContent =
      localStorage.getItem("userService") || "Non renseigné";
  }
  if (document.getElementById("report-reference")) {
    document.getElementById("report-reference").textContent =
      localStorage.getItem("userReference") || "Non renseigné";
  }
  if (document.getElementById("report-userCaracteristique")) {
    document.getElementById("report-userCaracteristique").textContent =
      localStorage.getItem("userCaracteristique") || "Non renseigné";
  }
  if (document.getElementById("report-userLoc")) {
    document.getElementById("report-userLoc").textContent =
      localStorage.getItem("userLoc") || "Non renseigné";
  }

  // --- SECTION 2 : Paramètres de la cartographie ---
  if (document.getElementById("report-tdeconsigne")) {
    document.getElementById("report-tdeconsigne").textContent =
      localStorage.getItem("tdeconsigne") || "Non renseigné";
  }
  if (document.getElementById("report-valeur")) {
    document.getElementById("report-valeur").textContent =
      localStorage.getItem("valeur") || "Non renseigné";
  }
  if (document.getElementById("report-periode")) {
    document.getElementById("report-periode").textContent =
      localStorage.getItem("periode") || "Non renseigné";
  }

  // --- SECTION 3 : Mode Opératoire ---
  const reportMessage = document.getElementById("report-message");
  if (reportMessage) {
    reportMessage.textContent =
      localStorage.getItem("userMessage") || "Non renseigné";
  }

  // Repositionnement automatique des sondes sur le rapport HTML
  const carteRapport = document.getElementById("carte-rapport");
  const sondesStockees = localStorage.getItem("positionsSondes");

  if (carteRapport && sondesStockees) {
    try {
      const listeSondes = JSON.parse(sondesStockees);
      listeSondes.forEach((sondeData) => {
        const nouvelleSonde = document.createElement("img");
        nouvelleSonde.id = sondeData.id;
        nouvelleSonde.src = sondeData.src;
        nouvelleSonde.style.position = "absolute";
        nouvelleSonde.style.left = sondeData.left;
        nouvelleSonde.style.top = sondeData.top;
        nouvelleSonde.style.width = "24px";
        nouvelleSonde.style.height = "24px";
        nouvelleSonde.style.transform = "translate(-50%, -50%)";

        carteRapport.appendChild(nouvelleSonde);
      });
    } catch(e) {
      console.error("Erreur lors de la lecture des positions des sondes :", e);
    }
  }

  // Chargement automatique du graphique et tableau ODS
  const cheminFichierODS = "Relevés.ods";
  console.log("Tentative de chargement automatique du fichier :", cheminFichierODS);

  // Récupération des filtres horaires
  const filtreDebut = localStorage.getItem("filtreHeureDebut") || "";
  const filtreFin = localStorage.getItem("filtreHeureFin") || "";

  fetch(cheminFichierODS)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Impossible de trouver le fichier "${cheminFichierODS}".`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array" });
      const feuille = workbook.Sheets[workbook.SheetNames[0]];
      const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

      const donneesCapteurs = {};
      const tousLesHorodatages = new Set();
      let htmlLignes = "";

      for (let i = 1; i < donneesJson.length; i++) {
        const ligne = donneesJson[i];
        if (
          ligne &&
          ligne[0] !== undefined &&
          ligne[1] !== undefined &&
          ligne[2] !== undefined
        ) {
          const idCapteur = ligne[0].toString().trim();
          let tempsBrut = ligne[1].toString().trim();
          let tempsAffiche = tempsBrut.includes("T")
            ? tempsBrut.split("T")[1].replace("Z", "")
            : tempsBrut;

          // Application des filtres horaires
          if (filtreDebut && tempsAffiche < filtreDebut) continue;
          if (filtreFin && tempsAffiche > filtreFin) continue;

          const valeurTemp = parseFloat(ligne[2]);
          const unite = ligne[3] || "°C";

          if (!donneesCapteurs[idCapteur]) {
            donneesCapteurs[idCapteur] = {};
          }
          donneesCapteurs[idCapteur][tempsAffiche] = valeurTemp;
          tousLesHorodatages.add(tempsAffiche);

          const couleurTemp = valeurTemp > 24 ? "#dc3545" : "#007BFF";

          htmlLignes += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 8px; font-weight: bold; color: #333;">${idCapteur}</td>
                            <td style="padding: 8px;">${tempsBrut.replace("T", " ").replace("Z", "")}</td>
                            <td style="padding: 8px; font-weight: bold; color: ${couleurTemp};">${valeurTemp.toFixed(2)}</td>
                            <td style="padding: 8px; color: #888;">${unite}</td>
                        </tr>
                    `;
        }
      }

      // --- TRAITEMENT DU SUPPORT D'AFFICHAGE DU TABLEAU ---
      const corpsTableau = document.getElementById("corpsTableauODS");
      const imageSelectionnee = localStorage.getItem("imageTableauSelection");

      if (imageSelectionnee && corpsTableau) {
        const tableParent = corpsTableau.closest("table");
        if (tableParent) {
          const divConteneurImage = document.createElement("div");
          divConteneurImage.style.textAlign = "center";
          divConteneurImage.style.margin = "20px 0";
          divConteneurImage.innerHTML = `
            <p style="font-size: 13px; color: #555; font-style: italic; margin-bottom: 8px; font-weight: bold;">
              📸 Capture automatique des relevés thermiques filtrés :
            </p>
            <img src="${imageSelectionnee}" style="max-width: 100%; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);" alt="Extrait Tableau">
          `;
          tableParent.parentNode.replaceChild(divConteneurImage, tableParent);
        }
      } else if (corpsTableau) {
        corpsTableau.innerHTML =
          htmlLignes ||
          '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée valide trouvée pour la plage horaire sélectionnée.</td></tr>';
      }

      const listeLabelsX = Array.from(tousLesHorodatages).sort();
      const listeIdsCapteurs = Object.keys(donneesCapteurs);

      const couleursCourbes = [
        { border: "#007BFF", bg: "rgba(0, 123, 255, 0.02)" },
        { border: "#28a745", bg: "rgba(40, 167, 69, 0.02)" },
        { border: "#dc3545", bg: "rgba(220, 53, 69, 0.02)" },
      ];

      const datasetsGraphique = listeIdsCapteurs.map((id, index) => {
        const dataPoints = listeLabelsX.map((temps) =>
          donneesCapteurs[id][temps] !== undefined ? donneesCapteurs[id][temps] : null,
        );
        const couleur = couleursCourbes[index % couleursCourbes.length];

        return {
          label: `Capteur ${id}`,
          data: dataPoints,
          borderColor: couleur.border,
          backgroundColor: couleur.bg,
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          spanGaps: true,
        };
      });

      genererGraphiqueTriCapteurs(listeLabelsX, datasetsGraphique);
    })
    .catch((error) => {
      console.error("Erreur critique ODS :", error);
      const corpsTableau = document.getElementById("corpsTableauODS");
      if (corpsTableau) {
        corpsTableau.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #dc3545; font-weight: bold; padding: 25px;">
                            ⚠️ Erreur de chargement du fichier ODS.<br>
                            <span style="font-size: 12px; font-weight: normal; color: #666; display:block; margin-top: 10px;">
                                Assurez-vous d'utiliser l'extension <strong>Live Server</strong> sur VS Code.
                            </span>
                        </td>
                    </tr>`;
      }
    });
});

// ==========================================================
// 6. GÉNÉRATION ET TÉLÉCHARGEMENT DU PDF (PAGE RAPPORT)
// ==========================================================
function telechargerPDFDirect() {
  const fondEtoile = document.getElementById("fond-etoile");
  if (fondEtoile) fondEtoile.style.display = "none";

  const nom = localStorage.getItem("username") || "Non renseigné";
  const entreprise = localStorage.getItem("userEntreprise") || "Non renseigné";
  const service = localStorage.getItem("userService") || "Non renseigné";
  const reference = localStorage.getItem("userReference") || "Non renseigné";
  const caracteristique = localStorage.getItem("userCaracteristique") || "Non renseigné";
  const localisationSpecifiee = localStorage.getItem("userLoc") || "Non renseigné";

  const tdeconsigne = localStorage.getItem("tdeconsigne") || "Non renseigné";
  const valeur = localStorage.getItem("valeur") || "Non renseigné";
  const periode = localStorage.getItem("periode") || "Non renseigné";
  const message = localStorage.getItem("userMessage") || "Aucun message";

  const sondesStockees = localStorage.getItem("positionsSondes");
  const imageSelectionneePourPDF = localStorage.getItem("imageTableauSelection");

  const dateJour = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const elementImpression = document.createElement("div");
  elementImpression.style.fontFamily = "Arial, sans-serif";
  elementImpression.style.padding = "15px";
  elementImpression.style.background = "#FFFFFF";
  elementImpression.style.color = "#000000";

  const messageFormatePourPDF = message.replace(/\n/g, "<br>");

  let contenuHtml = `
        <div style="border-bottom: 2px solid #007bff; padding-bottom: 5px; margin-bottom: 15px;">
            <h1 style="font-size: 20px; color: #007bff; margin: 0; padding: 0;">Rapport Officiel d'Analyse</h1>
            <p style="font-size: 11px; color: #666; margin: 3px 0 0 0;">Généré le : ${dateJour}</p>
        </div>

        <h3 style="font-size: 14px; color: #007bff; margin-top: 10px; margin-bottom: 5px; border-bottom: 1px solid #ddd;">1. Identification de l'enceinte</h3>
        <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.4;">
            <p style="margin: 3px 0;"><strong>Équipement :</strong> ${nom}</p>
            <p style="margin: 3px 0;"><strong>N° de série :</strong> ${entreprise}</p>
            <p style="margin: 3px 0;"><strong>Localisation :</strong> ${service}</p>
            <p style="margin: 3px 0;"><strong>Normes de Réf :</strong> ${reference}</p>
            <p style="margin: 3px 0;"><strong>Caractéristique :</strong> ${caracteristique}</p>
            <p style="margin: 3px 0;"><strong>Localisation spécifiée :</strong> ${localisationSpecifiee}</p>
        </div>

        <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #ddd;">2. Paramètres de la cartographie</h3>
        <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.4;">
            <p style="margin: 3px 0;"><strong>Température ambiante :</strong> ${tdeconsigne}</p>
            <p style="margin: 3px 0;"><strong>Condition Désirée :</strong> ${valeur}</p>
            <p style="margin: 3px 0;"><strong>Type de sonde :</strong> ${periode}</p>
        </div>

        <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #ddd;">3. Mode Opératoire</h3>
        <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.4;">
            <div style="background: #f8f9fa; padding: 8px; border-left: 3px solid #007bff; font-family: monospace; color: #333; white-space: pre-line;">
                ${messageFormatePourPDF}
            </div>
        </div>

        <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 8px;">📍 Positionnement des sondes</h3>
        <div id="carte-pdf-temp" style="position: relative; width: 400px; height: 300px; border: 1px solid #ccc; margin-bottom: 15px; background: #fff; border-radius: 6px;">
            <img src="images/MAP frigo.png" style="width: 100%; height: 100%; object-fit: contain; display: block;" alt="Carte">
        </div>
    `;

  if (imageSelectionneePourPDF) {
    contenuHtml += `
        <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 8px;">📊 Extrait du Tableau de Données</h3>
        <div style="text-align: center; width: 100%; margin-bottom: 15px;">
           <img src="${imageSelectionneePourPDF}" style="width: 100%; max-height: 380px; object-fit: contain; border: 1px solid #eee;">
        </div>`;
  }

  const canvasOrigine = document.getElementById("graphiqueTemperatures");
  if (monGraphiqueInstance && canvasOrigine) {
    contenuHtml += `
            <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 8px;">📈 Graphique des Températures</h3>
            <div id="graphique-pdf-temp" style="width: 100%; text-align: center;"></div>
        `;
  }

  elementImpression.innerHTML = contenuHtml;

  const conteneurCarte = elementImpression.querySelector("#carte-pdf-temp");
  if (sondesStockees && conteneurCarte) {
    try {
      const listSondes = JSON.parse(sondesStockees);
      listSondes.forEach((sonde) => {
        const sondePdf = document.createElement("img");
        sondePdf.src = sonde.src;
        sondePdf.style.position = "absolute";
        sondePdf.style.left = sonde.left;
        sondePdf.style.top = sonde.top;
        sondePdf.style.width = "24px";
        sondePdf.style.height = "24px";
        sondePdf.style.transform = "translate(-50%, -50%)";
        conteneurCarte.appendChild(sondePdf); // Correction orthographique ici
      });
    } catch (e) {
      console.error("Erreur d'intégration des sondes sur la carte PDF :", e);
    }
  }

  if (monGraphiqueInstance && canvasOrigine) {
    const conteneurGraphiquePdf = elementImpression.querySelector("#graphique-pdf-temp");
    if (conteneurGraphiquePdf) {
      const imageGraphique = document.createElement("img");
      imageGraphique.src = canvasOrigine.toDataURL("image/png");
      imageGraphique.style.width = "100%";
      imageGraphique.style.maxHeight = "240px";
      imageGraphique.style.objectFit = "contain";
      conteneurGraphiquePdf.appendChild(imageGraphique);
    }
  }

  const options = {
    margin: [10, 15, 10, 15],
    filename: "rapport_final.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: "avoid-all" },
  };

  html2pdf()
    .set(options)
    .from(elementImpression)
    .save()
    .then(() => {
      if (fondEtoile) fondEtoile.style.display = "block";
    })
    .catch((err) => {
      console.error(err);
      if (fondEtoile) fondEtoile.style.display = "block";
    });
}