// ==========================================================
// VARIABLES GLOBALES (PAGE 1)
// ==========================================================
let monGraphiqueInstance = null;
let estEnTrainDeGlisser = false;
let ligneDebutSelection = null;

// Variable de stockage temporaire pour le fichier sélectionné
let fichierActuelPourFiltrage = null;

// Variables pour mémoriser les données brutes lues du fichier ODS
let donneesGraphesEnMemoire = { labelsX: [], datasets: [] };

// Variable globale temporaire pour suivre la sonde déplacée au doigt sur mobile
window.sondeEnCoursDeToucher = null;

document.addEventListener("DOMContentLoaded", () => {
  const marqueurs = document.querySelectorAll(".marqueur-draggable");
  const carteCible = document.getElementById("carte-cible");
  const reserveCible = document.getElementById("reserve-cible");

  // ==========================================================
  // A. GESTION DES SOURIS (ORDINATEUR) - DRAG & DROP
  // ==========================================================
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

  if (carteCible) {
    carteCible.addEventListener("dragover", (e) => e.preventDefault());
    carteCible.addEventListener("drop", (e) => {
      e.preventDefault();
      const idElement = e.dataTransfer.getData("text/plain");
      const elementGlisse = document.getElementById(idElement);
      if (elementGlisse) {
        const limitesCarte = carteCible.getBoundingClientRect();
        const xPourcentage = ((e.clientX - limitesCarte.left) / limitesCarte.width) * 100;
        const yPourcentage = ((e.clientY - limitesCarte.top) / limitesCarte.height) * 100;
        placerSonde(elementGlisse, carteCible, xPourcentage, yPourcentage);
      }
    });
  }

  if (reserveCible) {
    reserveCible.addEventListener("dragover", (e) => e.preventDefault());
    reserveCible.addEventListener("drop", (e) => {
      e.preventDefault();
      const idElement = e.dataTransfer.getData("text/plain");
      const elementGlisse = document.getElementById(idElement);
      if (elementGlisse) remettreDansReserve(elementGlisse, reserveCible);
    });
  }

  // ==========================================================
  // B. GESTION DES ÉCRANS TACTILES (TÉLÉPHONE / TABLETTE)
  // ==========================================================
  marqueurs.forEach((marqueur) => {
    marqueur.addEventListener("touchstart", (e) => {
      window.sondeEnCoursDeToucher = e.target;
      e.target.style.opacity = "0.5";
    }, { passive: true });

    marqueur.addEventListener("touchmove", (e) => {
      if (!window.sondeEnCoursDeToucher) return;
      const touch = e.touches[0];
      const sonde = window.sondeEnCoursDeToucher;
      sonde.style.position = "fixed";
      sonde.style.left = touch.clientX + "px";
      sonde.style.top = touch.clientY + "px";
      sonde.style.transform = "translate(-50%, -50%)";
      sonde.style.zIndex = "1000";
    }, { passive: true });

    marqueur.addEventListener("touchend", (e) => {
      const sonde = window.sondeEnCoursDeToucher;
      if (!sonde) return;

      sonde.style.opacity = "1";
      sonde.style.position = "";
      sonde.style.left = "";
      sonde.style.top = "";
      sonde.style.transform = "";
      sonde.style.zIndex = "";

      const touch = e.changedTouches[0];
      const limitesCarte = carteCible.getBoundingClientRect();

      if (
        touch.clientX >= limitesCarte.left &&
        touch.clientX <= limitesCarte.right &&
        touch.clientY >= limitesCarte.top &&
        touch.clientY <= limitesCarte.bottom
      ) {
        const xPourcentage = ((touch.clientX - limitesCarte.left) / limitesCarte.width) * 100;
        const yPourcentage = ((touch.clientY - limitesCarte.top) / limitesCarte.height) * 100;
        placerSonde(sonde, carteCible, xPourcentage, yPourcentage);
      } else {
        remettreDansReserve(sonde, reserveCible);
      }
      window.sondeEnCoursDeToucher = null;
    });
  });

  // ==========================================================
  // ÉCOUTEURS DYNAMIQUES POUR LA PÉRIODICITÉ ET LES CALCULS AUTOMATIQUES
  // ==========================================================
  const inputPeriode = document.getElementById("periode");
  const inputConsigne = document.getElementById("tdeconsigne");
  const inputEMT = document.getElementById("valeur");
  const inputHeureDebut = document.getElementById("heureDebut");
  const inputHeureFin = document.getElementById("heureFin");

  if (inputPeriode) {
    inputPeriode.addEventListener("input", () => {
      if (donneesGraphesEnMemoire.labelsX.length > 0) {
        genererLeGraphique(); 
      }
    });
  }

  // Permet de rafraîchir dynamiquement le graphique et le tableau si l'utilisateur change les heures
  if (inputHeureDebut) inputHeureDebut.addEventListener("input", () => { if(fichierActuelPourFiltrage) chargerDonneesODS(); });
  if (inputHeureFin) inputHeureFin.addEventListener("input", () => { if(fichierActuelPourFiltrage) chargerDonneesODS(); });

  if (inputConsigne) inputConsigne.addEventListener("input", mettreAJourSeuilsAutomatiques);
  if (inputEMT) inputEMT.addEventListener("input", mettreAJourSeuilsAutomatiques);

  function placerSonde(sonde, carte, x, y) {
    carte.appendChild(sonde);
    sonde.style.position = "absolute";
    sonde.style.left = x + "%";
    sonde.style.top = y + "%";
    sonde.style.margin = "0px";
  }

  function remettreDansReserve(sonde, reserve) {
    reserve.appendChild(sonde);
    sonde.style.position = "";
    sonde.style.left = "";
    sonde.style.top = "";
  }
});

// ==========================================================
// FONCTION UTILITAIRE DE NORMALISATION DES HEURES SALSES (Ex: 15h30 -> 15:30:00)
// ==========================================================
function normaliserHeureSaisie(chaineSaisie) {
  let str = chaineSaisie.toString().trim().toLowerCase();
  if (!str) return "";
  
  // Remplacer les séparateurs courants (h, H, m, M, un espace) par des deux-points
  str = str.replace(/[hm\s]/g, ":");
  
  // Extraire les groupes de chiffres
  let parties = str.split(":").filter(p => p !== "");
  
  if (parties.length >= 2) {
    let h = parties[0].padStart(2, '0');
    let m = parties[1].padStart(2, '0');
    let s = parties[2] ? parties[2].padStart(2, '0') : "00";
    return `${h}:${m}:${s}`;
  }
  return "";
}

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
  if (evenement) evenement.currentTarget.className += " actif";
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

function importerNouveauFichier(evenement) {
  const fichier = evenement.target.files[0];
  const txtNomFichier = document.getElementById("nom-fichier-choisi");
  const btnGenerer = document.getElementById("btn-generer-graphique");

  if (!fichier) return;
  fichierActuelPourFiltrage = fichier;

  if (txtNomFichier) txtNomFichier.textContent = `Fichier chargé : ${fichier.name}`;
  if (btnGenerer) btnGenerer.disabled = false;

  chargerDonneesODS(fichier);
}

// ==========================================================
// ACTION DU BOUTON POUR INJECTER ET FILTRER SELON LA PERIODE
// ==========================================================
function genererLeGraphique() {
  const zoneGeneration = document.querySelector(".zone-generation-graphique");
  if (!zoneGeneration) return;

  zoneGeneration.innerHTML = `
    <div style="display: flex; flex-direction: column; width: 100%; align-items: center;">
      <div class="conteneur-graphique-cadre" style="width: 100%; height: 450px; position: relative;">
        <canvas id="graphiqueTemperatures"></canvas>
      </div>
      <div style="margin-top: 15px; width: 100%; text-align: center;">
        <button id="btn-reset-zoom" type="button" class="btn btn-danger" style="background-color: red; color: white; font-weight: bold; padding: 12px 24px; font-size: 16px; border: none; cursor: pointer;">
          Réinitialiser le Zoom
        </button>
      </div>
    </div>
  `;

  const btnResetZoom = document.getElementById("btn-reset-zoom");
  if (btnResetZoom) {
    btnResetZoom.addEventListener("click", reinitialiserZoomGraphique);
  }

  const pasPeriode = parseInt(document.getElementById("periode")?.value) || 1;
  let labelsFiltres = [];
  let datasetsFiltres = [];

  if (pasPeriode > 1) {
    labelsFiltres = donneesGraphesEnMemoire.labelsX.filter((_, idx) => idx % pasPeriode === 0);
    datasetsFiltres = donneesGraphesEnMemoire.datasets.map(dataset => {
      return {
        ...dataset,
        data: dataset.data.filter((_, idx) => idx % pasPeriode === 0)
      };
    });
  } else {
    labelsFiltres = donneesGraphesEnMemoire.labelsX;
    datasetsFiltres = donneesGraphesEnMemoire.datasets;
  }

  genererGraphiqueTriCapteurs(labelsFiltres, datasetsFiltres);
}

// ==========================================================
// 3. PARSING DU FICHIER LOCAL AVEC SELECTION HORAIRE ROBUSTE
// ==========================================================
function chargerDonneesODS(fichierDynamique = null) {
  let valeurSaisieDebut = document.getElementById("heureDebut")?.value.trim() || "";
  let valeurSaisieFin = document.getElementById("heureFin")?.value.trim() || "";

  // Transformation intelligente (ex: 15h30 -> 15:30:00)
  let filtreDebut = normaliserHeureSaisie(valeurSaisieDebut);
  let filtreFin = normaliserHeureSaisie(valeurSaisieFin);

  // Sauvegarde des versions normalisées pour la page 2
  localStorage.setItem("filtreHeureDebut", filtreDebut);
  localStorage.setItem("filtreHeureFin", filtreFin);

  const fichierATraiter = fichierDynamique || fichierActuelPourFiltrage;
  if (!fichierATraiter) return;

  const promesseLecture = new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(fichierATraiter);
  });

  promesseLecture
    .then((buffer) => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array", raw: true });
      const feuille = workbook.Sheets[workbook.SheetNames[0]];
      const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1, raw: true });

      const donneesCapteurs = {};
      const tousLesHorodatages = new Set();
      let htmlLignes = "";

      for (let i = 1; i < donneesJson.length; i++) {
        const ligne = donneesJson[i];
        if (ligne && ligne[0] !== undefined && ligne[1] !== undefined && ligne[2] !== undefined) {
          const idCapteur = ligne[0].toString().trim();
          let tempsBrut = ligne[1].toString().trim();
          let tempsAffiche = "";

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

          // Filtrage strict : ignorer la ligne si elle est hors limites
          if (filtreDebut && tempsAffiche < filtreDebut) continue;
          if (filtreFin && tempsAffiche > filtreFin) continue;

          let valeurTemp = parseFloat(ligne[2].toString().replace(",", "."));
          const unite = ligne[3] || "°C";

          if (!donneesCapteurs[idCapteur]) donneesCapteurs[idCapteur] = {};
          donneesCapteurs[idCapteur][tempsAffiche] = valeurTemp;
          tousLesHorodatages.add(tempsAffiche);

          const couleurTemp = valeurTemp > 24 ? "#dc3545" : "#007BFF";

          htmlLignes += `
            <tr style="border-bottom: 1px solid #eee; user-select: none; cursor: pointer;">
              <td style="padding: 8px; font-weight: bold; color: #333;">${idCapteur}</td>
              <td style="padding: 8px;">${tempsAffiche}</td>
              <td style="padding: 8px; font-weight: bold; color: ${couleurTemp};">${valeurTemp.toFixed(2)}</td>
              <td style="padding: 8px; color: #888;">${unite}</td>
            </tr>
          `;
        }
      }

      const corpsTableau = document.getElementById("corpsTableauODS");
      if (corpsTableau) {
        corpsTableau.innerHTML = htmlLignes || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée valide pour cette plage horaire.</td></tr>';
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
        const dataPoints = listeLabelsX.map((temps) => donneesCapteurs[id][temps] !== undefined ? donneesCapteurs[id][temps] : null);
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

      donneesGraphesEnMemoire = { labelsX: listeLabelsX, datasets: datasetsGraphique };

      // Génération automatique du graphique rafraîchi
      genererLeGraphique();
    })
    .catch((error) => console.error("Erreur critique d'analyse :", error));
}

// ==========================================================
// CONFIGURATION INITIALE ET RENDU CHART.JS
// ==========================================================
function genererGraphiqueTriCapteurs(labelsX, datasetsFournis) {
  const canvas = document.getElementById("graphiqueTemperatures");
  if (!canvas) return;

  if (monGraphiqueInstance) monGraphiqueInstance.destroy();

  const consigne = parseFloat(document.getElementById("tdeconsigne")?.value);
  const emt = parseFloat(document.getElementById("valeur")?.value);

  let valeurMinInitiale = 5.0;
  let valeurMaxInitiale = 8.0;

  if (!isNaN(consigne) && !isNaN(emt)) {
    valeurMinInitiale = consigne - emt;
    valeurMaxInitiale = consigne + emt;
  }

  const ctx = canvas.getContext("2d");
  monGraphiqueInstance = new Chart(ctx, {
    type: "line",
    data: { labels: labelsX, datasets: datasetsFournis },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: { title: { display: true, text: "Température (°C)" }, min: 0, max: 30 },
        x: { title: { display: true, text: "Horodatage (UTC)" }, ticks: { maxTicksLimit: 12 } },
      },
      plugins: {
        legend: { position: "top" },
        annotation: {
          annotations: {
            ligneMin: {
              type: "line", yMin: valeurMinInitiale, yMax: valeurMinInitiale, borderColor: "rgb(220, 53, 69)", borderWidth: 2.5, borderDash: [5, 5],
              label: { display: true, content: `Seuil Min (${valeurMinInitiale.toFixed(1)}°C)`, position: "start", backgroundColor: "rgba(220, 53, 69, 0.85)", color: "white", font: { size: 11, weight: "bold" } }
            },
            ligneMax: {
              type: "line", yMin: valeurMaxInitiale, yMax: valeurMaxInitiale, borderColor: "rgb(40, 167, 69)", borderWidth: 2.5, borderDash: [5, 5],
              label: { display: true, content: `Seuil Max (${valeurMaxInitiale.toFixed(1)}°C)`, position: "start", backgroundColor: "rgba(40, 167, 69, 0.85)", color: "white", font: { size: 11, weight: "bold" } }
            },
          }
        },
        zoom: {
          zoom: {
            drag: { enabled: true, backgroundColor: "rgba(0, 123, 255, 0.2)", borderColor: "#007BFF", borderWidth: 1 },
            pinch: { enabled: true },
            mode: "xy",
            onZoom: function({ chart }) {
              const minIndex = chart.scales.x.min;
              const maxIndex = chart.scales.x.max;
              const pointsVisibles = Math.round(maxIndex - minIndex + 1);
              
              if (pointsVisibles < 31) {
                alert(`⚠️ Attention : La zone sélectionnée sur le graphique contient moins de 31 points (${pointsVisibles} points actuellement).`);
              }
            }
          },
          pan: { enabled: true, mode: "xy" }
        },
      },
    },
  });
}

// ==========================================================
// RENDU EN DIRECT LOGIQUE : CALCUL DES SEUILS VIA CONSIGNE ET EMT
// ==========================================================
function mettreAJourSeuilsAutomatiques() {
  if (!monGraphiqueInstance) return;

  const consigne = parseFloat(document.getElementById("tdeconsigne")?.value);
  const emt = parseFloat(document.getElementById("valeur")?.value);

  if (isNaN(consigne) || isNaN(emt)) return;

  const calculMin = consigne - emt;
  const calculMax = consigne + emt;
  const annotations = monGraphiqueInstance.options.plugins.annotation.annotations;

  if (annotations.ligneMin) {
    annotations.ligneMin.yMin = calculMin;
    annotations.ligneMin.yMax = calculMin;
    annotations.ligneMin.label.content = `Seuil Min (${calculMin.toFixed(1)}°C)`;
  }

  if (annotations.ligneMax) {
    annotations.ligneMax.yMin = calculMax;
    annotations.ligneMax.yMax = calculMax;
    annotations.ligneMax.label.content = `Seuil Max (${calculMax.toFixed(1)}°C)`;
  }

  monGraphiqueInstance.update();
}

// ==========================================================
// 4. SYSTEME DE SÉLECTION VISUELLE DU TABLEAU (SOURIS & TACTILE MOBILE)
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

    appliquerSelectionVisuelle(conteneurTableau, ligneDebutSelection, ligneActuelle);
  });

  conteneurTableau.addEventListener("touchstart", (e) => {
    const ligneCible = e.target.closest("tr");
    if (!ligneCible) return;

    estEnTrainDeGlisser = true;
    ligneDebutSelection = ligneCible;

    const lignes = Array.from(conteneurTableau.querySelectorAll("tr"));
    lignes.forEach((l) => (l.style.backgroundColor = ""));
    ligneCible.style.backgroundColor = "rgba(0, 123, 255, 0.18)";
    e.preventDefault(); 
  }, { passive: false });

  conteneurTableau.addEventListener("touchmove", (e) => {
    if (!estEnTrainDeGlisser || !ligneDebutSelection) return;

    const touch = e.touches[0];
    const elementSousLeDoigt = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elementSousLeDoigt) return;

    const ligneActuelle = elementSousLeDoigt.closest("tr");
    if (!ligneActuelle || ligneActuelle.parentNode !== conteneurTableau) return;

    appliquerSelectionVisuelle(conteneurTableau, ligneDebutSelection, ligneActuelle);
    e.preventDefault();
  }, { passive: false });
}

function appliquerSelectionVisuelle(conteneur, ligneDebut, ligneFin) {
  const lignes = Array.from(conteneur.querySelectorAll("tr"));
  const indexDebut = lignes.indexOf(ligneDebut);
  const indexActuel = lignes.indexOf(ligneFin);
  const minIndex = Math.min(indexDebut, indexActuel);
  const maxIndex = Math.max(indexDebut, indexActuel);

  lignes.forEach((l, idx) => {
    l.style.backgroundColor = idx >= minIndex && idx <= maxIndex ? "rgba(0, 123, 255, 0.18)" : "";
  });
}

window.addEventListener("mouseup", () => { estEnTrainDeGlisser = false; });
window.addEventListener("touchend", () => { estEnTrainDeGlisser = false; });

// ==========================================================
// 5. SAUVEGARDE ET REDIRECTION SECURISÉE AVEC CONVERSION EN BASE64
// ==========================================================
function sauvegarderToutEtDiriger() {
  const corpsTableau = document.getElementById("corpsTableauODS");
  let pointsSelectionnes = 0;

  if (corpsTableau) {
    const lignes = corpsTableau.querySelectorAll("tr");
    lignes.forEach((ligne) => {
      if (ligne.style.backgroundColor && ligne.style.backgroundColor !== "") {
        pointsSelectionnes++;
      }
    });
  }

  if (pointsSelectionnes > 0 && pointsSelectionnes < 31) {
    alert(`⚠️ Sélection insuffisante (${pointsSelectionnes} points sur 31) : Vous devez sélectionner au minimum 31 points de mesure dans le tableau pour valider le rapport.`);
    return; 
  }

  localStorage.removeItem("imageGraphiqueZoome");
  localStorage.removeItem("imageTableauSelection");

  let filtreDebut = normaliserHeureSaisie(document.getElementById("heureDebut")?.value || "");
  let filtreFin = normaliserHeureSaisie(document.getElementById("heureFin")?.value || "");

  localStorage.setItem("filtreHeureDebut", filtreDebut);
  localStorage.setItem("filtreHeureFin", filtreFin);
  localStorage.setItem("username", document.getElementById("username")?.value || "");
  localStorage.setItem("userEntreprise", document.getElementById("userEntreprise")?.value || "");
  localStorage.setItem("userService", document.getElementById("userService")?.value || "");
  localStorage.setItem("userReference", document.getElementById("userReference")?.value || "");
  localStorage.setItem("userCaracteristique", document.getElementById("userCaracteristique")?.value || "");
  localStorage.setItem("userLoc", document.getElementById("userLoc")?.value || "");
  
  const inputConsigneElement = document.getElementById("tdeconsigne");
  const inputEmtElement = document.getElementById("valeur");
  const consigne = parseFloat(inputConsigneElement?.value);
  const emt = parseFloat(inputEmtElement?.value);

  localStorage.setItem("tdeconsigne", inputConsigneElement?.value || "");
  localStorage.setItem("valeur", inputEmtElement?.value || "");
  
  if (!isNaN(consigne) && !isNaN(emt)) {
    localStorage.setItem("seuilMaxManuel", (consigne + emt).toString());
    localStorage.setItem("seuilMinManuel", (consigne - emt).toString());
  } else {
    localStorage.setItem("seuilMaxManuel", "");
    localStorage.setItem("seuilMinManuel", "");
  }
  
  localStorage.setItem("periode", document.getElementById("periode")?.value || "");
  localStorage.setItem("userMessage", document.getElementById("userMessage")?.value || "");

  const carteCible = document.getElementById("carte-cible");
  if (carteCible) {
    const donneesSondes = [];
    carteCible.querySelectorAll(".marqueur-draggable").forEach((sonde) => {
      donneesSondes.push({ id: sonde.id, src: sonde.getAttribute("src"), left: sonde.style.left, top: sonde.style.top });
    });
    localStorage.setItem("positionsSondes", JSON.stringify(donneesSondes));
  }

  const canvasOrigine = document.getElementById("graphiqueTemperatures");
  if (canvasOrigine && monGraphiqueInstance) {
    try {
      localStorage.setItem("imageGraphiqueZoome", monGraphiqueInstance.toBase64Image());
    } catch (e) {
      console.error("Échec de conversion du canvas :", e);
    }
  }

  if (fichierActuelPourFiltrage) {
    const lecteurEnBase64 = new FileReader();
    lecteurEnBase64.onload = function(e) {
      try {
        const base64String = e.target.result.split(',')[1] || e.target.result;
        localStorage.setItem("fichierOdsBase64", base64String);
      } catch (err) {
        console.error("Erreur lors du stockage du fichier en Base64 :", err);
      }
      window.location.href = "index-page2-rapport.html";
    };
    lecteurEnBase64.readAsDataURL(fichierActuelPourFiltrage);
  } else {
    window.location.href = "index-page2-rapport.html";
  }
}

// ==========================================================
// FONCTION REINITIALISER LE ZOOM ACTIVE
// ==========================================================
function reinitialiserZoomGraphique() {
  if (monGraphiqueInstance && typeof monGraphiqueInstance.resetZoom === "function") {
    monGraphiqueInstance.resetZoom();
  } else {
    console.warn("Le plugin de zoom Chart.js n'est pas encore actif.");
  }
}