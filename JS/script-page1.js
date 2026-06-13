let monGraphiqueInstance = null;
let estEnTrainDeGlisser = false;
let ligneDebutSelection = null;

let fichierActuelPourFiltrage = null;
let donneesGraphesEnMemoire = { labelsX: [], datasets: [] };
window.sondeEnCoursDeToucher = null;

let capteursExclusManuellement = [];

document.addEventListener("DOMContentLoaded", () => {
  const carteCible = document.getElementById("carte-cible");
  const reserveCible = document.getElementById("reserve-cible");

  // Initialisation des zones de dépôt (Drag & Drop)
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

  // Liaison des inputs de configuration
  const inputPeriode = document.getElementById("periode");
  const inputConsigne = document.getElementById("tdeconsigne");
  const inputEMT = document.getElementById("valeur");

  if (inputPeriode) {
    inputPeriode.addEventListener("input", () => {
      if (donneesGraphesEnMemoire.labelsX.length > 0) {
        genererLeGraphique(); 
      }
    });
  }

  if (inputConsigne) inputConsigne.addEventListener("input", mettreAJourSeuilsAutomatiques);
  if (inputEMT) inputEMT.addEventListener("input", mettreAJourSeuilsAutomatiques);

  const inputHeureDebut = document.getElementById("heureDebut");
  const inputHeureFin = document.getElementById("heureFin");
  if (inputHeureDebut) inputHeureDebut.addEventListener("input", synchroniserPlageHoraireSurGraphique);
  if (inputHeureFin) inputHeureFin.addEventListener("input", synchroniserPlageHoraireSurGraphique);
});

/**
 * Attache les écouteurs d'événements souris et tactiles sur un marqueur.
 * À appeler impérativement lors de la création DYNAMIQUE de chaque sonde.
 */
function configurerEvenementsMarqueur(marqueur) {
  if (!marqueur) return;

  marqueur.setAttribute("draggable", "true");

  // Drag & Drop Bureau
  marqueur.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", e.target.id);
    e.target.style.opacity = "0.5";
  });

  marqueur.addEventListener("dragend", (e) => {
    e.target.style.opacity = "1";
  });

  // Clic standard pour exclusion
  marqueur.addEventListener("click", () => {
    gererBasculeCapteur(marqueur.id);
  });

  // Support Tactile (Mobile / Tablette)
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
    const carteCible = document.getElementById("carte-cible");
    const reserveCible = document.getElementById("reserve-cible");

    if (carteCible && reserveCible) {
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
    }
    window.sondeEnCoursDeToucher = null;
  });
}

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

function synchroniserPlageHoraireSurGraphique() {
  if (!monGraphiqueInstance) return;

  let debut = document.getElementById("heureDebut")?.value.trim() || "";
  let fin = document.getElementById("heureFin")?.value.trim() || "";

  debut = debut.replace(/[Hh]/g, ":");
  fin = fin.replace(/[Hh]/g, ":");

  if (debut && debut.length === 2) debut += ":00:00";
  if (debut && debut.length === 5) debut += ":00";
  if (fin && fin.length === 2) fin += ":00:00";
  if (fin && fin.length === 5) fin += ":00";

  const labels = monGraphiqueInstance.data.labels;
  if (!labels || labels.length === 0) return;

  let indexMin = 0;
  let indexMax = labels.length - 1;

  if (debut) {
    const idx = labels.findIndex(l => l >= debut);
    if (idx !== -1) indexMin = idx;
  }

  if (fin) {
    const idx = labels.findLastIndex(l => l <= fin);
    if (idx !== -1) indexMax = idx;
  }

  if (indexMin > indexMax) {
    const temp = indexMin;
    indexMin = indexMax;
    indexMax = temp;
  }

  monGraphiqueInstance.zoomScale('x', { min: indexMin, max: indexMax }, 'default');
}

function gererBasculeCapteur(idCapteur) {
  const index = capteursExclusManuellement.indexOf(idCapteur);
  if (index > -1) {
    capteursExclusManuellement.splice(index, 1);
  } else {
    capteursExclusManuellement.push(idCapteur);
  }

  const marqueur = document.getElementById(idCapteur);
  if (marqueur) {
    if (capteursExclusManuellement.includes(idCapteur)) {
      marqueur.style.opacity = "0.3";
      marqueur.style.filter = "grayscale(100%)";
    } else {
      marqueur.style.opacity = "1";
      marqueur.style.filter = "none";
    }
  }

  const boutonControle = document.getElementById(`btn-exclure-${idCapteur}`);
  if (boutonControle) {
    if (capteursExclusManuellement.includes(idCapteur)) {
      boutonControle.style.backgroundColor = "#6c757d";
      boutonControle.textContent = `🔴 ${idCapteur} (Masqué)`;
    } else {
      boutonControle.style.backgroundColor = "#007BFF";
      boutonControle.textContent = `🟢 ${idCapteur} (Actif)`;
    }
  }

  if (donneesGraphesEnMemoire.labelsX.length > 0) {
    genererLeGraphique();
  }
}

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
  const reserve = document.getElementById("liste-sondes-disponibles") || document.getElementById("reserve-cible");
  const tousLesMarqueurs = document.querySelectorAll(".marqueur-draggable");
  if (reserve) {
    tousLesMarqueurs.forEach((marqueur) => {
      reserve.appendChild(marqueur);
      marqueur.style.position = "";
      marqueur.style.left = "";
      marqueur.style.top = "";
      marqueur.style.opacity = "1";
      marqueur.style.filter = "none";
    });
  }
  capteursExclusManuellement = [];
  const conteneurListe = document.getElementById("liste-capteurs-options");
  if (conteneurListe) conteneurListe.innerHTML = "";
  
  localStorage.removeItem("positionsSondes");
  localStorage.removeItem("capteursExclusManuellement");
}

function importerNouveauFichier(evenement) {
  const fichier = evenement.target.files[0];
  const txtNomFichier = document.getElementById("nom-fichier-choisi");
  const btnGenerer = document.getElementById("btn-generer-graphique");

  if (!fichier) return;
  fichierActuelPourFiltrage = fichier;

  if (txtNomFichier) txtNomFichier.textContent = `Fichier chargé : ${fichier.name}`;
  if (btnGenerer) btnGenerer.disabled = false;

  capteursExclusManuellement = [];
  chargerDonneesODS(fichier);
}

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
  synchroniserPlageHoraireSurGraphique();
}

function chargerDonneesODS(fichierDynamique = null) {
  let filtreDebut = document.getElementById("heureDebut")?.value.trim() || "";
  let filtreFin = document.getElementById("heureFin")?.value.trim() || "";

  filtreDebut = filtreDebut.replace(/[Hh]/g, ":");
  filtreFin = filtreFin.replace(/[Hh]/g, ":");

  if (filtreDebut.length === 5) filtreDebut += ":00";
  if (filtreFin.length === 5) filtreFin += ":00";

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
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const feuille = workbook.Sheets[workbook.SheetNames[0]];
      const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

      const donneesCapteurs = {};
      const tousLesHorodatages = new Set();
      let htmlLignes = "";

      for (let i = 1; i < donneesJson.length; i++) {
        const ligne = donneesJson[i];
        if (ligne && ligne[0] !== undefined && ligne[1] !== undefined && ligne[2] !== undefined) {
          const idCapteur = ligne[0].toString().trim();

          let tempsAffiche = "";
          let tempsBrutTexte = "";

          if (ligne[1] instanceof Date) {
            const hh = String(ligne[1].getUTCHours()).padStart(2, '0');
            const mm = String(ligne[1].getUTCMinutes()).padStart(2, '0');
            const ss = String(ligne[1].getUTCSeconds()).padStart(2, '0');
            tempsAffiche = `${hh}:${mm}:${ss}`;
            tempsBrutTexte = ligne[1].toISOString().replace("T", " ").replace("Z", "").substring(0, 19);
          } else if (typeof ligne[1] === "number" || !isNaN(ligne[1])) {
            const num = parseFloat(ligne[1]);
            const dateUt = new Date(Math.round((num - 25569) * 86400 * 1000));
            const hh = String(dateUt.getUTCHours()).padStart(2, '0');
            const mm = String(dateUt.getUTCMinutes()).padStart(2, '0');
            const ss = String(dateUt.getUTCSeconds()).padStart(2, '0');
            tempsAffiche = `${hh}:${mm}:${ss}`;
            const aaaa = dateUt.getUTCFullYear();
            const mmois = String(dateUt.getUTCMonth() + 1).padStart(2, '0');
            const jj = String(dateUt.getUTCDate()).padStart(2, '0');
            tempsBrutTexte = `${aaaa}-${mmois}-${jj} ${tempsAffiche}`;
          } else {
            let tempsBrut = ligne[1].toString().trim();
            if (tempsBrut.includes("T")) {
              tempsAffiche = tempsBrut.split("T")[1].replace("Z", "").substring(0, 8);
              tempsBrutTexte = tempsBrut.replace("T", " ").replace("Z", "");
            } else if (tempsBrut.includes(" ") && tempsBrut.indexOf(":") > 0) {
              tempsAffiche = tempsBrut.split(" ")[1].substring(0, 8);
              tempsBrutTexte = tempsBrut;
            } else {
              tempsAffiche = tempsBrut.substring(0, 8);
              tempsBrutTexte = tempsBrut;
            }
          }

          if (filtreDebut && tempsAffiche < filtreDebut) continue;
          if (filtreFin && tempsAffiche > filtreFin) continue;

          const valeurTemp = parseFloat(ligne[2]);
          const unite = ligne[3] || "°C";

          if (!donneesCapteurs[idCapteur]) donneesCapteurs[idCapteur] = {};
          donneesCapteurs[idCapteur][tempsAffiche] = valeurTemp;
          tousLesHorodatages.add(tempsAffiche);

          const couleurTemp = valeurTemp > 24 ? "#dc3545" : "#007BFF";

          htmlLignes += `
            <tr data-time="${tempsAffiche}" style="border-bottom: 1px solid #eee; user-select: none; cursor: pointer;">
              <td style="padding: 8px; font-weight: bold; color: #333;">${idCapteur}</td>
              <td style="padding: 8px;">${tempsBrutTexte}</td>
              <td style="padding: 8px; font-weight: bold; color: ${couleurTemp};">${valeurTemp.toFixed(2)}</td>
              <td style="padding: 8px; color: #888;">${unite}</td>
            </tr>
          `;
        }
      }

      const corpsTableau = document.getElementById("corpsTableauODS");
      if (corpsTableau) {
        corpsTableau.innerHTML = htmlLignes || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée valide.</td></tr>';
        activerSelectionSouris(corpsTableau);
      }

      const listelabelsX = Array.from(tousLesHorodatages).sort();
      const listeIdsCapteurs = Object.keys(donneesCapteurs);

      // Génération automatique des éléments pastilles de sondes dans l'onglet 2 si vides
      const conteneurSondes = document.getElementById("liste-sondes-disponibles");
      if (conteneurSondes && conteneurSondes.children.length === 0) {
        const couleursPastilles = [
          "#E6194B", "#3CB44B", "#FFE119", "#4363D8", "#F58231", 
          "#911EB4", "#42D4F4", "#F032E6", "#FABED4"
        ];

        listeIdsCapteurs.forEach((id, index) => {
          const numeroSonde = index + 1;
          if (numeroSonde <= 9) {
            const ligneSonde = document.createElement("div");
            ligneSonde.className = "ligne-sonde-item";
            ligneSonde.style.display = "flex";
            ligneSonde.style.alignItems = "center";
            ligneSonde.style.marginBottom = "10px";
            ligneSonde.style.gap = "12px";

            const divSonde = document.createElement("div");
            divSonde.className = "marqueur-draggable pastille-numero";
            divSonde.id = id;
            divSonde.textContent = numeroSonde;
            divSonde.style.backgroundColor = couleursPastilles[index % couleursPastilles.length];

            const textNom = document.createElement("span");
            textNom.className = "texte-nom-sonde";
            textNom.textContent = id;
            textNom.style.fontWeight = "bold";
            textNom.style.color = "#333";

            ligneSonde.appendChild(divSonde);
            ligneSonde.appendChild(textNom);
            conteneurSondes.appendChild(ligneSonde);
            configurerEvenementsMarqueur(divSonde);
          }
        });
      }

      const couleursCourbes = [
        { border: "#007BFF", bg: "rgba(0, 123, 255, 0.02)" },
        { border: "#28a745", bg: "rgba(40, 167, 69, 0.02)" },
        { border: "#dc3545", bg: "rgba(220, 53, 69, 0.02)" },
      ];

      const datasetsGraphique = listeIdsCapteurs.map((id, index) => {
        const dataPoints = listelabelsX.map((temps) => donneesCapteurs[id][temps] !== undefined ? donneesCapteurs[id][temps] : null);
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

      donneesGraphesEnMemoire = { labelsX: listelabelsX, datasets: datasetsGraphique };

      if (!document.getElementById("btn-generer-graphique") && document.getElementById("graphiqueTemperatures")) {
        genererLeGraphique();
      }
    })
    .catch((error) => console.error("Erreur critique d'analyse :", error));
}

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
        y: { title: { display: true, text: "Température (°C)" } },
        x: { title: { display: true, text: "Horodatage (UTC)" }, ticks: { maxTicksLimit: 12 } },
      },
      plugins: {
        legend: { 
          position: "top",
          onClick: function(e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const fullLabel = ci.data.datasets[index].label;
            
            const idCapteur = fullLabel.replace("Capteur ", "").trim();

            if (ci.isDatasetVisible(index)) {
              ci.hide(index);
              legendItem.hidden = true;
              if (!capteursExclusManuellement.includes(idCapteur)) {
                capteursExclusManuellement.push(idCapteur);
              }
            } else {
              ci.show(index);
              legendItem.hidden = false;
              capteursExclusManuellement = capteursExclusManuellement.filter(id => id !== idCapteur);
            }
            localStorage.setItem("capteursExclusManuellement", JSON.stringify(capteursExclusManuellement));
          }
        },
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

  capteursExclusManuellement.forEach(idExclu => {
    datasetsFournis.forEach((dataset, idx) => {
      const idNettoyed = dataset.label.replace("Capteur ", "").trim();
      if (idNettoyed === idExclu) {
        monGraphiqueInstance.hide(idx);
        if(monGraphiqueInstance.legend.legendItems[idx]) {
          monGraphiqueInstance.legend.legendItems[idx].hidden = true;
        }
      }
    });
  });
}

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

function activerSelectionSouris(conteneurTableau) {
  if (!conteneurTableau) return;

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
  }, { passive: true });

  conteneurTableau.addEventListener("touchmove", (e) => {
    if (!estEnTrainDeGlisser || !ligneDebutSelection) return;

    const touch = e.touches[0];
    const elementSousLeDoigt = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elementSousLeDoigt) return;

    const ligneActuelle = elementSousLeDoigt.closest("tr");
    if (!ligneActuelle || ligneActuelle.parentNode !== conteneurTableau) return;

    appliquerSelectionVisuelle(conteneurTableau, ligneDebutSelection, ligneActuelle);
  }, { passive: true });
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

function sauvegarderToutEtDiriger() {
  const corpsTableau = document.getElementById("corpsTableauODS");
  let pointsSelectionnes = [];

  if (corpsTableau) {
    const lignes = corpsTableau.querySelectorAll("tr");
    lignes.forEach((ligne) => {
      if (ligne.style.backgroundColor && ligne.style.backgroundColor !== "") {
        const t = ligne.getAttribute("data-time");
        if (t) pointsSelectionnes.push(t);
      }
    });
  }

  if (pointsSelectionnes.length > 0 && pointsSelectionnes.length < 31) {
    alert(`⚠️ Sélection insuffisante (${pointsSelectionnes.length} points sur 31) : Vous devez sélectionner au minimum 31 points de mesure dans le tableau pour valider le rapport.`);
    return; 
  }

  localStorage.removeItem("imageGraphiqueZoome");
  localStorage.removeItem("imageTableauSelection");

  let filtreDebut = document.getElementById("heureDebut")?.value.trim() || "";
  let filtreFin = document.getElementById("heureFin")?.value.trim() || "";
  
  filtreDebut = filtreDebut.replace(/[Hh]/g, ":");
  filtreFin = filtreFin.replace(/[Hh]/g, ":");

  if (filtreDebut.length === 5) filtreDebut += ":00";
  if (filtreFin.length === 5) filtreFin += ":00";

  if (pointsSelectionnes.length >= 31) {
    pointsSelectionnes.sort();
    filtreDebut = pointsSelectionnes[0];
    filtreFin = pointsSelectionnes[pointsSelectionnes.length - 1];
  } 
  else if (monGraphiqueInstance) {
    const xAxis = monGraphiqueInstance.scales.x;
    if (xAxis && xAxis.min !== undefined && xAxis.max !== undefined) {
      const labels = monGraphiqueInstance.data.labels;
      if (xAxis.min > 0 || xAxis.max < labels.length - 1) {
        const minIdx = Math.max(0, Math.floor(xAxis.min));
        const maxIdx = Math.min(labels.length - 1, Math.ceil(xAxis.max));
        const pointsVisibles = maxIdx - minIdx + 1;
        
        if (pointsVisibles < 31) {
          alert(`⚠️ Zone zoomée insuffisante (${pointsVisibles} points) : Vous devez sélectionner au minimum 31 points de mesure sur le graphique pour valider le rapport.`);
          return;
        }
        
        if (labels[minIdx] && labels[maxIdx]) {
          filtreDebut = labels[minIdx].substring(0, 8);
          filtreFin = labels[maxIdx].substring(0, 8);
        }
      }
    }
  }

  const inputHeureDebut = document.getElementById("heureDebut");
  const inputHeureFin = document.getElementById("heureFin");
  if (inputHeureDebut) inputHeureDebut.value = filtreDebut;
  if (inputHeureFin) inputHeureFin.value = filtreFin;

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
  }

  localStorage.setItem("periode", document.getElementById("periode")?.value || "");
  localStorage.setItem("userMessage", document.getElementById("userMessage")?.value || "");

  localStorage.setItem("capteursExclusManuellement", JSON.stringify(capteursExclusManuellement));

  const carteCible = document.getElementById("carte-cible");
  if (carteCible) {
    const donneesSondes = [];
    carteCible.querySelectorAll(".marqueur-draggable").forEach((sonde) => {
      // MODIFICATION : Sauvegarde complète des styles de pastille (couleur de fond et texte du numéro)
      donneesSondes.push({ 
        id: sonde.id, 
        left: sonde.style.left, 
        top: sonde.style.top,
        numero: sonde.textContent,
        couleurFond: window.getComputedStyle(sonde).backgroundColor || sonde.style.backgroundColor
      });
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
      const base64String = e.target.result.split(',')[1] || e.target.result;
      localStorage.setItem("fichierOdsBase64", base64String);
      window.location.href = "index-page2-rapport.html";
    };
    lecteurEnBase64.readAsDataURL(fichierActuelPourFiltrage);
  } else {
    window.location.href = "index-page2-rapport.html";
  }
}

function reinitialiserZoomGraphique() {
  if (monGraphiqueInstance && typeof monGraphiqueInstance.resetZoom === "function") {
    monGraphiqueInstance.resetZoom();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const conteneurAuth = document.getElementById("bloc-authentification");
  if (sessionStorage.getItem("estConnecte") === "true") {
    if (conteneurAuth) conteneurAuth.style.display = "none";
  }
});

const USER_CORRECT = "Auralyon";
const CODE_CORRECT = "Auralyon2026!";

function validerCode() {
  const userSaisi = document.getElementById("identifiantAcces").value.trim();
  const codeSaisi = document.getElementById("codeAcces").value;
  
  const conteneurAuth = document.getElementById("bloc-authentification");
  const erreur = document.getElementById("erreur-code");

  if (userSaisi === USER_CORRECT && codeSaisi === CODE_CORRECT) {
    sessionStorage.setItem("estConnecte", "true");
    if (erreur) erreur.style.display = "none";
    if (conteneurAuth) conteneurAuth.style.display = "none";
  } else {
    if (erreur) erreur.style.display = "block";
  }
}