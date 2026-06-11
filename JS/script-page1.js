// ==========================================================
// VARIABLES GLOBALES (PAGE 1)
// ==========================================================
let monGraphiqueInstance = null;
let estEnTrainDeGlisser = false;
let ligneDebutSelection = null;

// Variable de stockage temporaire pour le fichier sélectionné
let fichierActuelPourFiltrage = null;

// Variables pour mémoriser les données lues du fichier ODS sans générer le graphique immédiatement
let donneesGraphesEnMemoire = { labelsX: [], datasets: [] };

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
// GESTION DE L'IMPORTATION DU FICHIER LOCAL CHOSI
// ==========================================================
function importerNouveauFichier(evenement) {
  const fichier = evenement.target.files[0];
  const txtNomFichier = document.getElementById("nom-fichier-choisi");
  const btnGenerer = document.getElementById("btn-generer-graphique");

  if (!fichier) return;

  fichierActuelPourFiltrage = fichier;

  if (txtNomFichier)
    txtNomFichier.textContent = `Fichier chargé : ${fichier.name}`;
  if (btnGenerer) btnGenerer.disabled = false;

  chargerDonneesODS(fichier);
}

// ==========================================================
// ACTION DU BOUTON POUR INJECTER ET CRÉER LE GRAPHIQUE
// ==========================================================
function genererLeGraphique() {
  const zoneGeneration = document.querySelector(".zone-generation-graphique");
  if (!zoneGeneration) return;

  zoneGeneration.innerHTML = `
    <div class="conteneur-graphique-cadre" style="width: 100%; height: 450px; position: relative;">
      <canvas id="graphiqueTemperatures"></canvas>
    </div>
  `;

  genererGraphiqueTriCapteurs(
    donneesGraphesEnMemoire.labelsX,
    donneesGraphesEnMemoire.datasets,
  );
}

// ==========================================================
// 3. PARSING DU FICHIER LOCAL (OU FILTRAGE RE-DÉCLENCHÉ)
// ==========================================================
function chargerDonneesODS(fichierDynamique = null) {
  const filtreDebut = document.getElementById("heureDebut")?.value.trim() || "";
  const filtreFin = document.getElementById("heureFin")?.value.trim() || "";

  localStorage.setItem("filtreHeureDebut", filtreDebut);
  localStorage.setItem("filtreHeureFin", filtreFin);

  const fichierATraiter = fichierDynamique || fichierActuelPourFiltrage;

  if (!fichierATraiter) {
    console.warn("Aucun fichier n'a encore été importé par l'utilisateur.");
    return;
  }

  const promesseLecture = new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(fichierATraiter);
  });

  promesseLecture
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
            <tr style="border-bottom: 1px solid #eee; user-select: none; cursor: pointer;">
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
        corpsTableau.innerHTML =
          htmlLignes ||
          '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée valide.</td></tr>';
        activerSelectionSouris(corpsTableau);
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

      donneesGraphesEnMemoire = {
        labelsX: listeLabelsX,
        datasets: datasetsGraphique,
      };

      if (
        !document.getElementById("btn-generer-graphique") &&
        document.getElementById("graphiqueTemperatures")
      ) {
        genererGraphiqueTriCapteurs(listeLabelsX, datasetsGraphique);
      }
    })
    .catch((error) => {
      console.error("Erreur critique d'analyse :", error);
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
      scales: {
        y: {
          title: { display: true, text: "Température (°C)" },
          min: 0,
          max: 30,
        },
        x: {
          title: { display: true, text: "Horodatage (UTC)" },
          ticks: { maxTicksLimit: 12 },
        },
      },
      plugins: {
        legend: { position: "top" },
        annotation: {
          annotations: {
            ligneMin: {
              type: "line",
              yMin: 5,
              yMax: 5,
              borderColor: "rgb(220, 53, 69)",
              borderWidth: 2.5,
              borderDash: [5, 5],
              label: {
                display: true,
                content: "Seuil Min (5°C)",
                position: "start",
                backgroundColor: "rgba(220, 53, 69, 0.85)",
                color: "white",
                font: { size: 11, weight: "bold" },
              },
            },
            ligneMax: {
              type: "line",
              yMin: 8,
              yMax: 8,
              borderColor: "rgb(40, 167, 69)",
              borderWidth: 2.5,
              borderDash: [5, 5],
              label: {
                display: true,
                content: "Seuil Max (8°C)",
                position: "start",
                backgroundColor: "rgba(40, 167, 69, 0.85)",
                color: "white",
                font: { size: 11, weight: "bold" },
              },
            },
          },
        },
        zoom: {
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: "rgba(0, 123, 255, 0.2)",
              borderColor: "#007BFF",
              borderWidth: 1,
            },
            mode: "xy",
          },
        },
      },
    },
  });
}

// ==========================================================
// 4. SYSTEME DE SÉLECTION VISUELLE DU TABLEAU À LA SOURIS
// ==========================================================
function activerSelectionSouris(conteneurTableau) {
  if (!conteneurTableau) return;
  conteneurTableau.onmousedown = null;

  conteneurTableau.addEventListener("mousedown", (e) => {
    const ligneCible = e.target.closest("tr");
    if (!ligneCible) return;

    estEnTrainDeGlisser = true;
    ligneDebutSelection = ligneCible;

    const lignes = Array.from(conteneurTableau.querySelectorAll("tr"));
    lignes.forEach((l) => (l.style.backgroundColor = ""));
    ligneCible.style.backgroundColor = "rgba(0, 123, 255, 0.18)";
    e.preventDefault();
  });

  conteneurTableau.addEventListener("mouseover", (e) => {
    if (!estEnTrainDeGlisser || !ligneDebutSelection) return;
    const ligneActuelle = e.target.closest("tr");
    if (!ligneActuelle) return;

    const lignes = Array.from(conteneurTableau.querySelectorAll("tr"));
    const indexDebut = lignes.indexOf(ligneDebutSelection);
    const indexActuel = lignes.indexOf(ligneActuelle);

    const minIndex = Math.min(indexDebut, indexActuel);
    const maxIndex = Math.max(indexDebut, indexActuel);

    lignes.forEach((l, idx) => {
      l.style.backgroundColor =
        idx >= minIndex && idx <= maxIndex ? "rgba(0, 123, 255, 0.18)" : "";
    });
  });
}

window.addEventListener("mouseup", () => {
  if (estEnTrainDeGlisser) estEnTrainDeGlisser = false;
});

// ==========================================================
// 5. SAUVEGARDE ET REDIRECTION
// ==========================================================
function sauvegarderToutEtDiriger() {
  localStorage.removeItem("imageGraphiqueZoome");
  localStorage.removeItem("imageTableauSelection");

  localStorage.setItem(
    "username",
    document.getElementById("username")?.value || "",
  );
  localStorage.setItem(
    "userEntreprise",
    document.getElementById("userEntreprise")?.value || "",
  );
  localStorage.setItem(
    "userService",
    document.getElementById("userService")?.value || "",
  );
  localStorage.setItem(
    "userReference",
    document.getElementById("userReference")?.value || "",
  );
  localStorage.setItem(
    "userCaracteristique",
    document.getElementById("userCaracteristique")?.value || "",
  );
  localStorage.setItem(
    "userLoc",
    document.getElementById("userLoc")?.value || "",
  );
  localStorage.setItem(
    "tdeconsigne",
    document.getElementById("tdeconsigne")?.value || "",
  );
  localStorage.setItem(
    "valeur",
    document.getElementById("valeur")?.value || "",
  );
  localStorage.setItem(
    "periode",
    document.getElementById("periode")?.value || "",
  );
  localStorage.setItem(
    "userMessage",
    document.getElementById("userMessage")?.value || "",
  );

  const carteCible = document.getElementById("carte-cible");
  if (carteCible) {
    const donneesSondes = [];
    carteCible.querySelectorAll(".marqueur-draggable").forEach((sonde) => {
      donneesSondes.push({
        id: sonde.id,
        src: sonde.getAttribute("src"),
        left: sonde.style.left,
        top: sonde.style.top,
      });
    });
    localStorage.setItem("positionsSondes", JSON.stringify(donneesSondes));
  }

  const boutonGenererExiste =
    document.getElementById("btn-generer-graphique") !== null;
  const canvasOrigine = document.getElementById("graphiqueTemperatures");

  if (canvasOrigine && monGraphiqueInstance && !boutonGenererExiste) {
    const imageGenereeBase64 = monGraphiqueInstance.toBase64Image();
    localStorage.setItem("imageGraphiqueZoome", imageGenereeBase64);
  }

  const tableauODS = document
    .getElementById("corpsTableauODS")
    ?.closest("table");
  const ongletTableau = document.getElementById("onglet3");
  const corpsTableau = document.getElementById("corpsTableauODS");

  let unTableauEstSelectionne = false;
  if (corpsTableau) {
    const lignes = corpsTableau.querySelectorAll("tr");
    lignes.forEach((ligne) => {
      if (ligne.style.backgroundColor && ligne.style.backgroundColor !== "") {
        unTableauEstSelectionne = true;
      }
    });
  }

  if (tableauODS && ongletTableau && unTableauEstSelectionne) {
    const styleInitial = ongletTableau.style.display;
    ongletTableau.style.display = "block";

    // Forcer la synchronisation : on attend la fin de html2canvas avant de changer de page
    html2canvas(tableauODS, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    })
      .then((canvas) => {
        localStorage.setItem(
          "imageTableauSelection",
          canvas.toDataURL("image/png"),
        );
        ongletTableau.style.display = styleInitial;
        window.location.href = "index-page2-rapport.html";
      })
      .catch((err) => {
        console.error("Erreur html2canvas:", err);
        ongletTableau.style.display = styleInitial;
        window.location.href = "index-page2-rapport.html";
      });
  } else {
    localStorage.removeItem("imageTableauSelection");
    window.location.href = "index-page2-rapport.html";
  }
}
