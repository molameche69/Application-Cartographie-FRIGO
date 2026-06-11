let monGraphiqueInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Démarrage du script de rendu du rapport...");

  // ==========================================================
  // 1. INJECTION DES CHAMPS TEXTES DEPUIS LE LOCALSTORAGE
  // ==========================================================
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
    "report-message": "userMessage",
  };

  for (let id in champs) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = localStorage.getItem(champs[id]) || "Non renseigné";
    }
  }

  // ==========================================================
  // 2. RESTITUTION CORRECTE DES SONDES SUR LA CARTE
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
        // Le transform assure que le centre du pointeur correspond au clic d'origine
        imgSonde.style.transform = "translate(-50%, -50%)";
        carteRapport.appendChild(imgSonde);
      });
    } catch (e) {
      console.error("Erreur d'injection des sondes :", e);
    }
  }

  chargerDonneesODSRapport();
});

// ==========================================================
// 3. TRAITEMENT DE L'IMAGE DU GRAPHIQUE ET CHARGEMENT ODS
// ==========================================================
function chargerDonneesODSRapport() {
  const imageZoomee = localStorage.getItem("imageGraphiqueZoome");
  const canvasRapport = document.getElementById("graphiqueTemperatures");

  // --- GESTION DU GRAPHIQUE ---
  if (!imageZoomee) {
    if (canvasRapport) {
      canvasRapport.classList.add("masque");
    }
    const imgExistante = document.querySelector(".graphique-image-zoom");
    if (imgExistante) {
      imgExistante.classList.add("masque");
    }
    console.log("Graphique masqué.");
  } else if (canvasRapport) {
    const wrapper = canvasRapport.closest(".wrapper-canvas");
    if (wrapper) {
      // Remplace intégralement le canvas par la balise image pour appliquer le CSS fluide
      wrapper.innerHTML = `<img src="${imageZoomee}" class="graphique-image-zoom graphique-rapport-img" alt="Graphique Sélectionné" style="width:100%; height:100%; display:block;" />`;
    }
  }

  // --- GESTION DE LA VISIBILITÉ DU TABLEAU ---
  let conteneurTableau = document.querySelector(".conteneur-tableau");

  if (!conteneurTableau) {
    console.warn(
      "Élément .conteneur-tableau introuvable. Création dynamique...",
    );
    const zoneImpression =
      document.getElementById("zone-impression-pdf") || document.body;
    conteneurTableau = document.createElement("div");
    conteneurTableau.className = "conteneur-tableau";
    zoneImpression.appendChild(conteneurTableau);
  }

  conteneurTableau.classList.remove("masque");
  conteneurTableau.classList.add("affiche-bloc");

  // --- EXTRACTION ET FILTRAGE DES DONNÉES DU FICHIER ODS ---
  const filtreDebut = localStorage.getItem("filtreHeureDebut") || "";
  const filtreFin = localStorage.getItem("filtreHeureFin") || "";

  console.log(
    `Filtres récupérés - Début: ${filtreDebut || "Aucun"}, Fin: ${filtreFin || "Aucun"}`,
  );

  fetch("Relevés.ods")
    .then((res) => {
      if (!res.ok) throw new Error("Fichier Relevés.ods introuvable.");
      return res.arrayBuffer();
    })
    .then((buffer) => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array" });
      const feuille = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(feuille, { header: 1 });

      console.log(`Lignes lues dans le fichier ODS : ${json.length}`);

      const donneesCapteurs = {};
      const tousLesHorodatages = new Set();

      for (let i = 1; i < json.length; i++) {
        const ligne = json[i];
        if (
          ligne &&
          ligne[0] !== undefined &&
          ligne[1] !== undefined &&
          ligne[2] !== undefined
        ) {
          const id = ligne[0].toString().trim();
          let tempsBrut = ligne[1].toString().trim();
          let tempsAffiche = tempsBrut.includes("T")
            ? tempsBrut.split("T")[1].replace("Z", "")
            : tempsBrut;

          if (filtreDebut && tempsAffiche < filtreDebut) continue;
          if (filtreFin && tempsAffiche > filtreFin) continue;

          if (!donneesCapteurs[id]) donneesCapteurs[id] = [];
          donneesCapteurs[id].push(parseFloat(ligne[2]));
          tousLesHorodatages.add(tempsAffiche);
        }
      }

      const nombreCapteurs = Object.keys(donneesCapteurs).length;
      console.log(`Nombre de capteurs après filtrage : ${nombreCapteurs}`);

      if (nombreCapteurs === 0) {
        conteneurTableau.innerHTML = `<p class="erreur-filtrage">Aucune donnée trouvée pour la plage horaire sélectionnée (${filtreDebut} - ${filtreFin}).</p>`;
        return;
      }

      // --- CALCULS STATISTIQUES CONFORMES À LA NORME ---
      const statsCapteurs = {};
      let sommeDesMoyennes = 0;
      let N = nombreCapteurs;

      Object.keys(donneesCapteurs).forEach((id) => {
        const releves = donneesCapteurs[id].filter((v) => !isNaN(v));
        const n = releves.length;

        if (n === 0) return;

        const max = Math.max(...releves);
        const min = Math.min(...releves);
        const moyenne = releves.reduce((a, b) => a + b, 0) / n;
        sommeDesMoyennes += moyenne;

        const stabilite = max - min;
        const sommeCarresSomme = releves.reduce(
          (acc, val) => acc + Math.pow(val - moyenne, 2),
          0,
        );
        const ecartTypeExp = n > 1 ? Math.sqrt(sommeCarresSomme / (n - 1)) : 0;

        statsCapteurs[id] = {
          moyenne: moyenne,
          stabilite: stabilite,
          ecartTypeExp: ecartTypeExp,
          n: n,
        };
      });

      const Xair = N > 0 ? sommeDesMoyennes / N : 0;
      const toutesLesStabilites = Object.values(statsCapteurs).map(
        (s) => s.stabilite,
      );
      const SXM =
        toutesLesStabilites.length > 0 ? Math.max(...toutesLesStabilites) : 0;
      const sommeEcartTypeExpCarre = Object.values(statsCapteurs).reduce(
        (acc, s) => acc + Math.pow(s.ecartTypeExp, 2),
        0,
      );
      const Sr = N > 0 ? Math.sqrt(sommeEcartTypeExpCarre / N) : 0;

      const premierId = Object.keys(statsCapteurs)[0];
      const nGenerique = premierId ? statsCapteurs[premierId].n : 1;
      const sommeVarianceInterCapteurs = Object.values(statsCapteurs).reduce(
        (acc, s) => acc + Math.pow(s.moyenne - Xair, 2),
        0,
      );
      const partieDroiteSR =
        N > 1 ? (1 / (N - 1)) * sommeVarianceInterCapteurs : 0;
      const SR = Math.sqrt(
        Math.pow(Sr, 2) * (1 - 1 / nGenerique) + partieDroiteSR,
      );

      creerTableauStatistiques(statsCapteurs, Xair, SXM, Sr, SR);
    })
    .catch((err) => {
      console.error("Erreur de traitement ODS :", err);
      conteneurTableau.innerHTML = `<p class="erreur-ods">Erreur lors de la lecture du fichier de relevés.</p>`;
    });
}

// ==========================================================
// 4. GÉNÉRATION DU TABLEAU DE SYNTHÈSE HTML
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
    const estConforme = ecartConsigne + s.stabilite / 2 <= emt;

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
        <tr class="ligne-globale texte-gras conclusion-globale-tailne ${enceinteConforme ? "ligne-conforme" : "ligne-non-conforme"}">
          <td class="cellule-commune">Conclusion Enceinte (NF X 15-140)</td>
          <td colspan="4" class="cellule-commune aligne-centre texte-couleur-statut">${enceinteConforme ? "ENCEINTE CONFORME" : "ENCEINTE NON CONFORME"}</td>
        </tr>
      </tbody>
    </table>
  `;

  conteneurTableau.innerHTML = html;
  console.log("Tableau des spécifications injecté avec succès !");
}

// ==========================================================
// 5. EXPORTATION PDF (html2pdf.js)
// ==========================================================
function telechargerPDFDirect() {
  const fondEtoile = document.getElementById("fond-etoile");
  if (fondEtoile) fondEtoile.classList.add("masque");

  const elementImpression = document.getElementById("zone-impression-pdf");
  if (!elementImpression) {
    if (fondEtoile) fondEtoile.classList.remove("masque");
    return;
  }

  const styleImpression = document.createElement("style");
  styleImpression.innerHTML = `
    .html2pdf__page-break { height: 0 !important; margin: 0 !important; padding: 0 !important; }
    #zone-impression-pdf { padding: 0px !important; margin: 0px !important; }
    body { margin: 0 !important; }
    .saut-de-page { page-break-before: always !important; break-before: page !important; height: 0 !important; }
  `;
  document.head.appendChild(styleImpression);

  const options = {
    margin: [10, 15, 10, 15],
    filename: "rapport_final.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: "css" },
  };

  html2pdf()
    .set(options)
    .from(elementImpression)
    .save()
    .then(() => {
      styleImpression.remove();
      if (fondEtoile) fondEtoile.classList.remove("masque");
    })
    .catch((err) => {
      console.error("Erreur PDF :", err);
      styleImpression.remove();
      if (fondEtoile) fondEtoile.classList.remove("masque");
    });
}
