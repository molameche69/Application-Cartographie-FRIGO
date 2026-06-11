// ==========================================================
// VARIABLES GLOBALES (PAGE 2)
// ==========================================================
let monGraphiqueInstance = null;

// ==========================================================
// 1. INITIALISATION AU CHARGEMENT DE LA PAGE
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Rapport chargé, initialisation des données...");

  // Récupération et affichage des textes sauvés dans le localStorage
  const champs = {
    "report-username": "username",
    "report-entreprise": "userEntreprise",
    "report-service": "userService",
    "report-reference": "userReference",
    "report-userCaracteristique": "userCaracteristique",
    "report-userLoc": "userLoc",
    "report-tdeconsigne": "tdeconsigne",
    "report-valeur": "valeur",
    "report-periode": "periode",
    "report-message": "userMessage"
  };

  for (let id in champs) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = localStorage.getItem(champs[id]) || "Non renseigné";
    }
  }

  // Re-génération des sondes sur la carte du rapport
  const carteRapport = document.getElementById("carte-rapport");
  const sondesStockees = localStorage.getItem("positionsSondes");

  if (carteRapport && sondesStockees) {
    try {
      JSON.parse(sondesStockees).forEach((sondeData) => {
        const nouvelleSonde = document.createElement("img");
        nouvelleSonde.src = sondeData.src;
        nouvelleSonde.style.position = "absolute";
        nouvelleSonde.style.left = sondeData.left;
        nouvelleSonde.style.top = sondeData.top;
        nouvelleSonde.style.width = "24px";
        nouvelleSonde.style.height = "24px";
        nouvelleSonde.style.transform = "translate(-50%, -50%)";
        carteRapport.appendChild(nouvelleSonde);
      });
    } catch (error) {
      console.error("Erreur lors du rendu des sondes :", error);
    }
  }

  // Chargement sécurisé du graphique
  try {
    chargerDonneesODSRapport();
  } catch (err) {
    console.error("Erreur critique au chargement du graphique :", err);
  }
});

// ==========================================================
// 2. RENDU DU GRAPHIQUE (IMAGE ZOOMÉE OU INTEGRALITÉ)
// ==========================================================
function chargerDonneesODSRapport() {
  const imageZoomee = localStorage.getItem("imageGraphicZoome") || localStorage.getItem("imageGraphiqueZoome");
  const canvasRapport = document.getElementById("graphiqueTemperatures");

  if (!canvasRapport) {
    console.warn("Le canvas 'graphiqueTemperatures' n'a pas été trouvé ou a déjà été remplacé.");
    return;
  }

  // Si on a une image zoomée provenant de la page 1, on l'affiche directement
  if (imageZoomee) {
    const conteneurParent = canvasRapport.parentNode;
    if (conteneurParent) {
      conteneurParent.innerHTML = `<img src="${imageZoomee}" style="width: 100%; height: 100%; object-fit: contain;" alt="Graphique Zone Sélectionnée" />`;
      console.log("Image zoomée affichée à la place du canvas.");
      return;
    }
  }

  // Sinon, on charge le fichier ODS global
  const filtreDebut = localStorage.getItem("filtreHeureDebut") || "";
  const filtreFin = localStorage.getItem("filtreHeureFin") || "";

  fetch("Relevés.ods")
    .then(res => {
      if (!res.ok) throw new Error("Fichier Relevés.ods introuvable sur le serveur");
      return res.arrayBuffer();
    })
    .then(buffer => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array" });
      const feuille = workbook.Sheets[workbook.SheetNames[0]];
      const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

      const donneesCapteurs = {};
      const tousLesHorodatages = new Set();

      for (let i = 1; i < donneesJson.length; i++) {
        const ligne = donneesJson[i];
        if (ligne && ligne[0] !== undefined && ligne[1] !== undefined) {
          const idCapteur = ligne[0].toString().trim();
          let tempsBrut = ligne[1].toString().trim();
          let tempsAffiche = tempsBrut.includes("T") ? tempsBrut.split("T")[1].replace("Z", "") : tempsBrut;

          if (filtreDebut && tempsAffiche < filtreDebut) continue;
          if (filtreFin && tempsAffiche > filtreFin) continue;

          if (!donneesCapteurs[idCapteur]) donneesCapteurs[idCapteur] = {};
          donneesCapteurs[idCapteur][tempsAffiche] = parseFloat(ligne[2]);
          tousLesHorodatages.add(tempsAffiche);
        }
      }

      const listeLabelsX = Array.from(tousLesHorodatages).sort();
      const datasetsGraphique = Object.keys(donneesCapteurs).map((id, index) => {
        const couleurs = ["#007BFF", "#28a745", "#dc3545", "#ffc107", "#6f42c1"];
        return {
          label: `Capteur ${id}`,
          data: listeLabelsX.map(t => donneesCapteurs[id][t] !== undefined ? donneesCapteurs[id][t] : null),
          borderColor: couleurs[index % couleurs.length],
          fill: false, 
          tension: 0.25, 
          pointRadius: 0, 
          spanGaps: true
        };
      });

      // Double vérification que le canvas est toujours là avant de créer Chart.js
      const canvasVerif = document.getElementById("graphiqueTemperatures");
      if (canvasVerif) {
        monGraphiqueInstance = new Chart(canvasVerif.getContext("2d"), {
          type: "line",
          data: { labels: listeLabelsX, datasets: datasetsGraphique },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              zoom: {
                zoom: {
                  drag: { enabled: true },
                  mode: 'x'
                }
              }
            }
          }
        });
        console.log("Graphique généré avec succès.");
      }
    })
    .catch(err => console.error("Erreur lors du traitement du fichier ODS :", err));
}

// ==========================================================
// 3. GENERATION DU PDF (CORRIGÉ POUR PAGE BLANCHE)
// ==========================================================
function telechargerPDFDirect() {
  console.log("Génération du PDF en cours...");
  
  const fondEtoile = document.getElementById("fond-etoile");
  if (fondEtoile) fondEtoile.style.display = "none";

  const elementImpression = document.getElementById("zone-impression-pdf");

  if (!elementImpression) {
    console.error("Zone d'impression introuvable");
    if (fondEtoile) fondEtoile.style.display = "block";
    return;
  }

  // 1. On crée un bloc de styles temporaires pour forcer html2pdf à nettoyer les sauts de page
  const styleImpression = document.createElement("style");
  styleImpression.innerHTML = `
    /* Supprime les marges parasites invisibles qui créent des pages blanches */
    .html2pdf__page-break {
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Neutralise les paddings trop grands sur le conteneur principal lors de la capture */
    #zone-impression-pdf {
      padding: 0px !important;
      margin: 0px !important;
    }
    /* Force la carte et le graphique à ne jamais déborder */
    .section-pdf {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `;
  document.head.appendChild(styleImpression);

  // 2. Configuration stricte de html2pdf
  const options = {
    margin: [15, 15, 15, 15], // Marges de sécurité A4 (Haut, Gauche, Bas, Droite)
    filename: "rapport_final.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    // On utilise uniquement le mode 'css' pour obéir sagement à ta div .saut-de-page
    pagebreak: { mode: 'css' }
  };

  // 3. Exécution de la capture
  html2pdf().set(options).from(elementImpression).save()
    .then(() => {
      console.log("PDF généré avec succès.");
      // Nettoyage : on retire le style temporaire et on remet le fond étoilé
      styleImpression.remove();
      if (fondEtoile) fondEtoile.style.display = "block";
    })
    .catch((err) => {
      console.error("Erreur d'exportation PDF :", err);
      styleImpression.remove();
      if (fondEtoile) fondEtoile.style.display = "block";
    });
}