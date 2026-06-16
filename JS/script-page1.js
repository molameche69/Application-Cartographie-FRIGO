let monGraphiqueInstance = null;
let estEnTrainDeGlisser = false;
let ligneDebutSelection = null;

let fichierActuelPourFiltrage = null;
let donneesGraphesEnMemoire = { labelsX: [], datasets: [] };
window.sondeEnCoursDeToucher = null;

let capteursExclusManuellement = [];

// ========================================================
// 💾 FONCTIONS DE SAUVEGARDE ET RESTAURATION ADAPTÉES
// ========================================================

function sauvegarderEtatGlobalPage1() {
  // Sauvegarde uniquement des entrées de texte et configurations
  const champs = [
    "username", "userEntreprise", "userService", "userReference", 
    "userCaracteristique", "userLoc", "userMessage", "tdeconsigne", 
    "valeur", "heureDebut", "heureFin", "periode"
  ];
  champs.forEach(id => {
    const el = document.getElementById(id);
    if (el) sessionStorage.setItem("store_" + id, el.value);
  });

  // Sauvegarde de l'emplacement des sondes (La Map et la Réserve)
  const listeSondes = document.getElementById("liste-sondes-disponibles");
  const carteCible = document.getElementById("carte-cible");
  if (listeSondes) sessionStorage.setItem("store_html_reserve", listeSondes.innerHTML);
  if (carteCible) sessionStorage.setItem("store_html_carte", carteCible.innerHTML);
}

function restaurerEtatGlobalPage1() {
  // 1. Restauration des inputs textuels
  const champs = [
    "username", "userEntreprise", "userService", "userReference", 
    "userCaracteristique", "userLoc", "userMessage", "tdeconsigne", 
    "valeur", "heureDebut", "heureFin", "periode"
  ];
  champs.forEach(id => {
    const val = sessionStorage.getItem("store_" + id);
    const el = document.getElementById(id);
    if (el && val !== null) el.value = val;
  });

  // 2. Restauration visuelle des sondes uniquement
  const listeSondes = document.getElementById("liste-sondes-disponibles");
  const carteCible = document.getElementById("carte-cible");
  const htmlReserve = sessionStorage.getItem("store_html_reserve");
  const htmlCarte = sessionStorage.getItem("store_html_carte");
  
  if (listeSondes && htmlReserve) listeSondes.innerHTML = htmlReserve;
  if (carteCible && htmlCarte) carteCible.innerHTML = htmlCarte;

  if (typeof mettreAJourSeuilsAutomatiques === "function") {
    mettreAJourSeuilsAutomatiques();
  }

  // 3. 🔄 RECONSTRUCTION DU TABLEAU DEPUIS LE FICHIER EN MÉMOIRE
  const fichierSauvegarde = localStorage.getItem("fichierOdsBase64") || sessionStorage.getItem("store_fichier_excel_base64");
  if (fichierSauvegarde && typeof XLSX !== "undefined") {
    try {
      const chaineBinaire = atob(fichierSauvegarde);
      const longueur = chaineBinaire.length;
      const buffer = new Uint8Array(longueur);
      for (let i = 0; i < longueur; i++) {
        buffer[i] = chaineBinaire.charCodeAt(i);
      }
      
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      fichierActuelPourFiltrage = workbook; // Restaure la variable globale de filtrage
      
      // Détection automatique de ta fonction d'affichage du tableau
      if (typeof afficherDonneesDansTableau === "function") {
        afficherDonneesDansTableau(workbook);
      } else if (typeof chargerDonneesODS === "function") {
        chargerDonneesODS(workbook);
      } else if (typeof tracerGraphiqueDepuisExcel === "function") {
        tracerGraphiqueDepuisExcel(workbook);
      }
    } catch (err) {
      console.error("Impossible de restaurer le tableau au retour arrière :", err);
    }
  }

  // Force le bouton à vérifier l'état du tableau après la restauration
  setTimeout(majEtatBoutonGenerer, 100);
}

window.addEventListener("pageshow", (event) => {
  restaurerEtatGlobalPage1();
});

document.addEventListener("DOMContentLoaded", () => {
  const carteCible = document.getElementById("carte-cible");
  const reserveCible = document.getElementById("reserve-cible") || document.getElementById("liste-sondes-disponibles");

  // Liaison propre et unique du bouton vert générer
  const btnGenererGraphique = document.getElementById("btn-generer-graphique");
  if (btnGenererGraphique) {
    btnGenererGraphique.addEventListener("click", () => {
      genererLeGraphique(); // Uniquement sur clic manuel
    });
  }

  // Écouteur automatique via MutationObserver sur le tableau
  const corpsTableau = document.getElementById("corpsTableauODS");
  if (corpsTableau) {
    const observateur = new MutationObserver(() => {
      majEtatBoutonGenerer();
    });
    observateur.observe(corpsTableau, { childList: true });
  }

  // On écoute les modifications sur les inputs pour sauvegarder les textes au fur et à mesure
  document.querySelectorAll("input, textarea").forEach(input => {
    input.addEventListener("input", sauvegarderEtatGlobalPage1);
  });

  // Liaison spécifique pour les changements d'inputs qui nécessitent des actions
  const inputPeriode = document.getElementById("periode");
  const inputConsigne = document.getElementById("tdeconsigne");
  const inputEMT = document.getElementById("valeur");

  if (inputPeriode) {
    inputPeriode.addEventListener("input", () => {
      localStorage.setItem("periode", inputPeriode.value);
      if (typeof donneesGraphesEnMemoire !== "undefined" && donneesGraphesEnMemoire.labelsX.length > 0) {
        genererLeGraphique(); 
      }
    });
  }
  if (inputConsigne) {
    inputConsigne.addEventListener("input", () => {
      localStorage.setItem("tdeconsigne", inputConsigne.value);
      if (typeof mettreAJourSeuilsAutomatiques === "function") mettreAJourSeuilsAutomatiques();
    });
  }
  if (inputEMT) {
    inputEMT.addEventListener("input", () => {
      localStorage.setItem("valeur", inputEMT.value);
      if (typeof mettreAJourSeuilsAutomatiques === "function") mettreAJourSeuilsAutomatiques();
    });
  }

  const inputHeureDebut = document.getElementById("heureDebut");
  const inputHeureFin = document.getElementById("heureFin");
  
  if (inputHeureDebut) {
    inputHeureDebut.addEventListener("input", () => {
      localStorage.setItem("filtreHeureDebut", inputHeureDebut.value);
      if (typeof synchroniserPlageHoraireSurGraphique === "function") synchroniserPlageHoraireSurGraphique();
    });
  }
  if (inputHeureFin) {
    inputHeureFin.addEventListener("input", () => {
      localStorage.setItem("filtreHeureFin", inputHeureFin.value);
      if (typeof synchroniserPlageHoraireSurGraphique === "function") synchroniserPlageHoraireSurGraphique();
    });
  }

  // Intercepte le chargement du fichier pour le stocker en mémoire locale pour le retour arrière
  const selecteurFichier = document.querySelector("input[type='file']");
  if (selecteurFichier) {
    selecteurFichier.addEventListener("change", (evenement) => {
      const fichier = evenement.target.files[0];
      if (!fichier) return;
      const lecteur = new FileReader();
      lecteur.onload = function(e) {
        try {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(e.target.result)));
          sessionStorage.setItem("store_fichier_excel_base64", base64);
          localStorage.setItem("fichierOdsBase64", base64);
        } catch (erreurEnregistrement) {
          console.warn("Fichier trop lourd pour le stockage de secours :", erreurEnregistrement);
        }
      };
      lecteur.readAsArrayBuffer(fichier);
    });
  }

  // Drag & Drop des sondes
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
        if (typeof sauvegarderEtatSondes === "function") sauvegarderEtatSondes();
        sauvegarderEtatGlobalPage1(); 
      }
    });
  }

  if (reserveCible) {
    reserveCible.addEventListener("dragover", (e) => e.preventDefault());
    reserveCible.addEventListener("drop", (e) => {
      e.preventDefault();
      const idElement = e.dataTransfer.getData("text/plain");
      const elementGlisse = document.getElementById(idElement);
      if (elementGlisse) {
        remettreDansReserve(elementGlisse, reserveCible);
        if (typeof sauvegarderEtatSondes === "function") sauvegarderEtatSondes();
        sauvegarderEtatGlobalPage1();
      }
    });
  }

  // Bouton tout recommencer
  const btnRecommencerTout = document.getElementById("btn-recommencer-tout");
  if (btnRecommencerTout) {
    btnRecommencerTout.addEventListener("click", () => {
      if (confirm("🔄 Tout réinitialiser ?")) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.reload();
      }
    });
  }

  // Bouton de remise à zéro de la plage horaire
  const btnRazOnglet3 = document.getElementById("btn-raz-onglet3");
  if (btnRazOnglet3) {
    btnRazOnglet3.addEventListener("click", () => {
      const iDebut = document.getElementById("heureDebut");
      const iFin = document.getElementById("heureFin");
      if (iDebut) iDebut.value = "";
      if (iFin) iFin.value = "";
      localStorage.removeItem("filtreHeureDebut");
      localStorage.removeItem("filtreHeureFin");
      if (typeof donneesGraphesEnMemoire !== "undefined" && donneesGraphesEnMemoire.labelsX.length > 0) {
        genererLeGraphique();
      }
    });
  }

  // Bouton Réinitialiser les marqueurs
  const btnReinitialiserMarqueurs = document.getElementById("btn-reinitialiser-marqueurs") || document.querySelector("button[onclick*='reinitialiserMarqueurs']");
  if (btnReinitialiserMarqueurs) {
    btnReinitialiserMarqueurs.removeAttribute("onclick");
    btnReinitialiserMarqueurs.addEventListener("click", () => {
      if (typeof reinitialiserMarqueurs === "function") reinitialiserMarqueurs();
      sauvegarderEtatGlobalPage1();
    });
  }
  
  // Sécurité au chargement
  majEtatBoutonGenerer();
});

function majEtatBoutonGenerer() {
  const btnGenererGraphique = document.getElementById("btn-generer-graphique");
  const corpsTableau = document.getElementById("corpsTableauODS");
  const lignesTableau = corpsTableau ? corpsTableau.querySelectorAll("tr") : [];

  // On ignore le tableau s'il contient uniquement la ligne de texte d'attente brute
  let tableauEstVraiementVide = false;
  if (lignesTableau.length === 0 || (lignesTableau.length === 1 && corpsTableau.textContent.includes("Aucune donnée chargée"))) {
    tableauEstVraiementVide = true;
  }

  if (btnGenererGraphique) {
    if (!tableauEstVraiementVide) {
      btnGenererGraphique.disabled = false;
      btnGenererGraphique.style.opacity = "1";
      btnGenererGraphique.style.cursor = "pointer";
      btnGenererGraphique.style.pointerEvents = "auto"; 
    } else {
      btnGenererGraphique.disabled = true;
      btnGenererGraphique.style.opacity = "0.5";
      btnGenererGraphique.style.cursor = "not-allowed";
      btnGenererGraphique.style.pointerEvents = "none"; 
    }
  }
}

function restaurerFormulaireEtDonnees() {
  const champs = ["username", "userEntreprise", "userService", "userReference", "userCaracteristique", "userLoc", "periode", "tdeconsigne", "valeur", "userMessage", "filtreHeureDebut", "filtreHeureFin"];
  champs.forEach(id => {
    const input = document.getElementById(id);
    const valeurSauvegardee = localStorage.getItem(id);
    if (input && valeurSauvegardee !== null) {
      input.value = valeurSauvegardee;
    }
  });

  const exclus = localStorage.getItem("capteursExclusManuellement");
  if (exclus) {
    capteursExclusManuellement = JSON.parse(exclus);
  }

  const fichierBase64 = localStorage.getItem("fichierOdsBase64");
  const nomFichier = localStorage.getItem("nomFichierCharge") || "Données mémorisées.ods";
  
  if (fichierBase64) {
    const byteCharacters = atob(fichierBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/vnd.oasis.opendocument.spreadsheet" });
    fichierActuelPourFiltrage = new File([blob], nomFichier, { type: "application/vnd.oasis.opendocument.spreadsheet" });

    const txtNomFichier = document.getElementById("nom-fichier-choisi");
    const btnGenerer = document.getElementById("btn-generer-graphique");
    if (txtNomFichier) txtNomFichier.textContent = `Fichier chargé : ${nomFichier}`;
    if (btnGenerer) textNomFichier = false;
    if (btnGenerer) btnGenerer.disabled = false;

    chargerDonneesODS(fichierActuelPourFiltrage);
  }
}

function sauvegarderEtatSondes() {
  const carteCible = document.getElementById("carte-cible");
  if (carteCible) {
    const donneesSondes = [];
    carteCible.querySelectorAll(".marqueur-draggable").forEach((sonde) => {
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
}

function recommencerTout() {
  if (!confirm("⚠️ Êtes-vous sûr de vouloir tout réinitialiser ? Toutes vos modifications et le fichier chargé seront effacés.")) {
    return;
  }

  localStorage.clear();

  fichierActuelPourFiltrage = null;
  donneesGraphesEnMemoire = { labelsX: [], datasets: [] };
  capteursExclusManuellement = [];

  const formulaire = document.getElementById("formulaire-carto");
  if (formulaire) formulaire.reset();

  const txtNomFichier = document.getElementById("nom-fichier-choisi");
  if (txtNomFichier) txtNomFichier.textContent = "Aucun fichier choisi";

  const btnGenerer = document.getElementById("btn-generer-graphique");
  if (btnGenerer) btnGenerer.disabled = true;

  const inputFichier = document.getElementById("selecteur-fichier");
  if (inputFichier) inputFichier.value = "";

  const corpsTableau = document.getElementById("corpsTableauODS");
  if (corpsTableau) corpsTableau.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée chargée.</td></tr>';

  if (monGraphiqueInstance) {
    monGraphiqueInstance.destroy();
    monGraphiqueInstance = null;
  }
  const zoneGeneration = document.querySelector(".zone-generation-graphique");
  if (zoneGeneration) zoneGeneration.innerHTML = "";

  reinitialiserMarqueurs();
  
  const boutonOnglet1 = document.querySelector(".onglet-btn");
  if (boutonOnglet1) {
    changerOnglet({ currentTarget: boutonOnglet1 }, 'onglet1');
  }
}

function configurerEvenementsMarqueur(marqueur) {
  if (!marqueur) return;

  marqueur.setAttribute("draggable", "true");

  marqueur.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", e.target.id);
    e.target.style.opacity = "0.5";
  });

  marqueur.addEventListener("dragend", (e) => {
    e.target.style.opacity = "1";
  });

  marqueur.addEventListener("click", () => {
    gererBasculeCapteur(marqueur.id);
  });

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
    const reserveCible = document.getElementById("liste-sondes-disponibles") || document.getElementById("reserve-cible");

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
      sauvegarderEtatSondes();
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
  const toutesLesLignes = reserve.querySelectorAll(".ligne-sonde-item");
  let insere = false;

  toutesLesLignes.forEach(ligne => {
    const nomSondeTexte = inline = ligne.querySelector(".texte-nom-sonde")?.textContent.trim();
    const idSondeNettoye = sonde.id.trim();

    if (nomSondeTexte === idSondeNettoye) {
      if (!ligne.querySelector(`#${CSS.escape(sonde.id)}`)) {
        ligne.insertBefore(sonde, ligne.firstChild);
      }
      insere = true;
    }
  });

  if (!insere) {
    const nouvelleLigne = document.createElement("div");
    nouvelleLigne.className = "ligne-sonde-item";
    nouvelleLigne.style.display = "flex";
    nouvelleLigne.style.alignItems = "center";
    nouvelleLigne.style.marginBottom = "10px";
    nouvelleLigne.style.gap = "12px";

    const textNom = document.createElement("span");
    textNom.className = "texte-nom-sonde";
    textNom.textContent = sonde.id;
    textNom.style.fontWeight = "bold";
    textNom.style.color = "#333";

    nouvelleLigne.appendChild(sonde);
    nouvelleLigne.appendChild(textNom);
    reserve.appendChild(nouvelleLigne);
  }

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
  
  localStorage.setItem("capteursExclusManuellement", JSON.stringify(capteursExclusManuellement));

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
  const carteCible = document.getElementById("carte-cible");
  const reserve = document.getElementById("liste-sondes-disponibles") || document.getElementById("reserve-cible");
  
  if (!reserve) return;

  if (carteCible) {
    const marqueursSurCarte = carteCible.querySelectorAll(".marqueur-draggable");
    marqueursSurCarte.forEach(m => m.remove());
  }

  reserve.innerHTML = "";
  
  localStorage.removeItem("positionsSondes");
  capteursExclusManuellement = [];
  localStorage.setItem("capteursExclusManuellement", JSON.stringify([]));

  if (donneesGraphesEnMemoire && donneesGraphesEnMemoire.datasets && donneesGraphesEnMemoire.datasets.length > 0) {
    reconstruireReserveDepuisMemoire();
  } else if (fichierActuelPourFiltrage) {
    chargerDonneesODS(fichierActuelPourFiltrage);
  }
}

function reconstruireReserveDepuisMemoire() {
  const reserve = document.getElementById("liste-sondes-disponibles") || document.getElementById("reserve-cible");
  if (!reserve) return;

  const couleursPastilles = ["#E6194B", "#3CB44B", "#FFE119", "#4363D8", "#F58231", "#911EB4", "#42D4F4", "#F032E6", "#FABED4"];

  donneesGraphesEnMemoire.datasets.forEach((dataset, index) => {
    const id = dataset.label.replace("Capteur ", "").trim();
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
      divSonde.style.width = "30px";
      divSonde.style.height = "30px";
      divSonde.style.flexShrink = "0";
      divSonde.style.display = "flex";
      divSonde.style.alignItems = "center";
      divSonde.style.justifyContent = "center";

      const textNom = document.createElement("span");
      textNom.className = "texte-nom-sonde";
      textNom.textContent = id;
      textNom.style.fontWeight = "bold";
      textNom.style.color = "#333";

      ligneSonde.appendChild(divSonde);
      ligneSonde.appendChild(textNom);
      reserve.appendChild(ligneSonde);

      configurerEvenementsMarqueur(divSonde);
    }
  });
}

function importerNouveauFichier(evenement) {
  const fichier = evenement.target.files[0];
  const txtNomFichier = document.getElementById("nom-fichier-choisi");
  const btnGenerer = document.getElementById("btn-generer-graphique");

  if (!fichier) return;
  fichierActuelPourFiltrage = fichier;
  localStorage.setItem("nomFichierCharge", fichier.name);

  if (txtNomFichier) txtNomFichier.textContent = `Fichier chargé : ${fichier.name}`;
  if (btnGenerer) btnGenerer.disabled = false;

  capteursExclusManuellement = [];
  localStorage.setItem("capteursExclusManuellement", JSON.stringify([]));
  
  const reserve = document.getElementById("liste-sondes-disponibles") || document.getElementById("reserve-cible");
  if (reserve) reserve.innerHTML = "";
  
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
      <div style="margin-top: 15px; width: 100%; text-align: center; display: flex; justify-content: center; gap: 15px;">
        <button id="btn-reset-zoom" type="button" class="btn btn-danger" style="background-color: red; color: white; font-weight: bold; padding: 12px 24px; font-size: 16px; border: none; cursor: pointer; border-radius: 4px;">
          Réinitialiser le Zoom
        </button>
        <button id="btn-supprimer-donnees" type="button" class="btn" style="background-color: red; color: white; font-weight: bold; padding: 12px 24px; font-size: 16px; border: none; cursor: pointer; border-radius: 4px;">
          Supprimer et Charger un autre
        </button>
      </div>
    </div>
  `;

  const btnResetZoom = document.getElementById("btn-reset-zoom");
  if (btnResetZoom) {
    btnResetZoom.addEventListener("click", () => {
      if (monGraphiqueInstance) monGraphiqueInstance.resetZoom();
    });
  }

  const btnSupprimer = document.getElementById("btn-supprimer-donnees");
  if (btnSupprimer) {
    btnSupprimer.addEventListener("click", supprimerGraphiqueEtTableau);
  }

  let labelsFiltres = donneesGraphesEnMemoire.labelsX;
  let datasetsFiltres = donneesGraphesEnMemoire.datasets;

  genererGraphiqueTriCapteurs(labelsFiltres, datasetsFiltres);
  synchroniserPlageHoraireSurGraphique();

  
 const btnGenerer = document.getElementById('btn-generer-graphique');
  if (btnGenerer) {
    btnGenerer.style.display = 'none'; // Le bouton disparaît proprement
  }
}


function supprimerGraphiqueEtTableau() {
  if (monGraphiqueInstance) {
    monGraphiqueInstance.destroy();
    monGraphiqueInstance = null;
  }

  const zoneGeneration = document.querySelector(".zone-generation-graphique");
  if (zoneGeneration) zoneGeneration.innerHTML = "";

  fichierActuelPourFiltrage = null;
  donneesGraphesEnMemoire = { labelsX: [], datasets: [] };
  
  localStorage.removeItem("fichierOdsBase64");
  localStorage.removeItem("nomFichierCharge");
  localStorage.removeItem("pointsSelectionnesTableau");

  const inputFichier = document.getElementById("selecteur-fichier");
  if (inputFichier) inputFichier.value = "";

  const txtNomFichier = document.getElementById("nom-fichier-choisi");
  if (txtNomFichier) txtNomFichier.textContent = "Aucun fichier choisi";

  const corpsTableau = document.getElementById("corpsTableauODS");
  if (corpsTableau) {
    corpsTableau.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Aucune donnée chargée.</td></tr>';
  }

  reinitialiserMarqueurs();

  // NETTOYÉ : Une seule déclaration pour btnGenerer ici
  const btnGenerer = document.getElementById("btn-generer-graphique");
  if (btnGenerer) {
    btnGenerer.disabled = false;       // On le réactive pour qu'il soit cliquable au prochain fichier
    btnGenerer.style.display = 'block'; // On le fait réapparaître !
  }
}

function chargerDonneesODS(fichierDynamique = null) {
  let filtreDebut = localStorage.getItem("filtreHeureDebut") || document.getElementById("heureDebut")?.value.trim() || "";
  let filtreFin = localStorage.getItem("filtreHeureFin") || document.getElementById("heureFin")?.value.trim() || "";

  filtreDebut = filtreDebut.replace(/[Hh]/g, ":");
  filtreFin = filtreFin.replace(/[Hh]/g, ":");

  if (filtreDebut.length === 5) filtreDebut += ":00";
  if (filtreFin.length === 5) filtreFin += ":00";

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

      const pointsSauvegardes = JSON.parse(localStorage.getItem("pointsSelectionnesTableau") || "[]");

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
          
          const styleSelection = pointsSauvegardes.includes(tempsAffiche) ? 'style="border-bottom: 1px solid #eee; user-select: none; cursor: pointer; background-color: rgba(0, 123, 255, 0.18);"' : 'style="border-bottom: 1px solid #eee; user-select: none; cursor: pointer;"';

          htmlLignes += `
            <tr data-time="${tempsAffiche}" ${styleSelection}>
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

      const reserve = document.getElementById("liste-sondes-disponibles") || document.getElementById("reserve-cible");
      const carteCible = document.getElementById("carte-cible");
      
      if (reserve && reserve.children.length === 0) {
        const positionsSauvegardees = JSON.parse(localStorage.getItem("positionsSondes") || "[]");
        const couleursPastilles = ["#E6194B", "#3CB44B", "#FFE119", "#4363D8", "#F58231", "#911EB4", "#42D4F4", "#F032E6", "#FABED4"];

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
            divSonde.style.width = "30px";
            divSonde.style.height = "30px";
            divSonde.style.flexShrink = "0";
            divSonde.style.display = "flex";
            divSonde.style.alignItems = "center";
            divSonde.style.justifyContent = "center";

            const textNom = document.createElement("span");
            textNom.className = "texte-nom-sonde";
            textNom.textContent = id;
            textNom.style.fontWeight = "bold";
            textNom.style.color = "#333";

            ligneSonde.appendChild(divSonde);
            ligneSonde.appendChild(textNom);

            const posSauvegardee = positionsSauvegardees.find(p => p.id === id);
            if (posSauvegardee && carteCible) {
              carteCible.appendChild(divSonde);
              divSonde.style.position = "absolute";
              divSonde.style.left = posSauvegardee.left;
              divSonde.style.top = posSauvegardee.top;
              divSonde.style.margin = "0px";
            } else {
              reserve.appendChild(ligneSonde);
            }

            if (capteursExclusManuellement.includes(id)) {
              divSonde.style.opacity = "0.3";
              divSonde.style.filter = "grayscale(100%)";
            }

            configurerEvenementsMarqueur(divSonde);
          }
        });
      }
      
      if (localStorage.getItem("fichierOdsBase64")) {
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

  const terminerSelectionEtSauvegarder = () => {
    estEnTrainDeGlisser = false;
    let pointsSelectionnes = [];
    const lignes = conteneurTableau.querySelectorAll("tr");
    lignes.forEach((ligne) => {
      if (ligne.style.backgroundColor && ligne.style.backgroundColor !== "") {
        const t = ligne.getAttribute("data-time");
        if (t) pointsSelectionnes.push(t);
      }
    });
    localStorage.setItem("pointsSelectionnesTableau", JSON.stringify(pointsSelectionnes));
  };

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

  window.addEventListener("mouseup", () => {
    if (estEnTrainDeGlisser) terminerSelectionEtSauvegarder();
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
    if (ligneActuelle) {
      appliquerSelectionVisuelle(conteneurTableau, ligneDebutSelection, ligneActuelle);
    }
  }, { passive: true });

  conteneurTableau.addEventListener("touchend", () => {
    if (estEnTrainDeGlisser) terminerSelectionEtSauvegarder();
  });
}

function appliquerSelectionVisuelle(conteneur, debut, fin) {
  const lignes = Array.from(conteneur.querySelectorAll("tr"));
  const idxDebut = lignes.indexOf(debut);
  const idxFin = lignes.indexOf(fin);

  const min = Math.min(idxDebut, idxFin);
  const max = Math.max(idxDebut, idxFin);

  lignes.forEach((l, i) => {
    if (i >= min && i <= max) {
      l.style.backgroundColor = "rgba(0, 123, 255, 0.18)";
    } else {
      l.style.backgroundColor = "";
    }
  });
}

function sauvegarderToutEtDiriger() {
  const formulaire = document.getElementById("formulaire-carto");
  if (formulaire && !formulaire.checkValidity()) {
    alert("⚠️ Formulaire incomplet : Veuillez remplir toutes les cases obligatoires (*) dans l'onglet 'Fiche technique' avant de valider le rapport.");
    
    const boutonOnglet1 = document.querySelector(".onglet-btn");
    if (boutonOnglet1) {
      changerOnglet({ currentTarget: boutonOnglet1 }, 'onglet1');
    }
    
    formulaire.reportValidity();
    return;
  }

  const carteCible = document.getElementById("carte-cible");
  const sondesSurLaCarte = carteCible ? carteCible.querySelectorAll(".marqueur-draggable") : [];
  
  if (sondesSurLaCarte.length === 0) {
    alert("⚠️ Cartographie incomplète : Veuillez placer au moins une sonde sur la carte (Onglet 2 - Cartographie) avant de valider le rapport.");
    
    const boutonsOnglets = document.querySelectorAll(".onglet-btn");
    if (boutonsOnglets && boutonsOnglets.length >= 2) {
      changerOnglet({ currentTarget: boutonsOnglets[1] }, 'onglet2');
    }
    return;
  }

  if (!monGraphiqueInstance) {
    alert("⚠️ Graphique manquant : Veuillez charger un fichier et générer le graphique (Onglet 3 - Tableau température) avant de valider le rapport.");
    
    const boutonsOnglets = document.querySelectorAll(".onglet-btn");
    if (boutonsOnglets && boutonsOnglets.length >= 3) {
      changerOnglet({ currentTarget: boutonsOnglets[2] }, 'onglet3');
    }
    return;
  }

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

  localStorage.removeItem("imageGraphiqueZoome");

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

  const inputHeureDebut = document.getElementById("heureDebut");
  const inputHeureFin = document.getElementById("heureFin");
  if (inputHeureDebut) inputHeureDebut.value = filtreDebut;
  if (inputHeureFin) inputHeureFin.value = filtreFin;

  localStorage.setItem("filtreHeureDebut", filtreDebut);
  localStorage.setItem("filtreHeureFin", filtreFin);
  localStorage.setItem("pointsSelectionnesTableau", JSON.stringify(pointsSelectionnes));

  // --- CAPTURE SÉCURISÉE DU CANVAS (PAGE 1) ---
  const canvasOrigine = document.getElementById("graphiqueTemperatures");
  if (canvasOrigine) {
    try {
      // Extraction synchrone directe de l'élément HTML5 Canvas
      const imageBase64 = canvasOrigine.toDataURL("image/png", 1.0);
      localStorage.setItem("imageGraphiqueZoome", imageBase64);
    } catch (e) {
      console.error("Échec de conversion directe du canvas :", e);
      // En cas d'échec, méthode alternative via l'instance Chart.js
      if (monGraphiqueInstance) {
        localStorage.setItem("imageGraphiqueZoome", monGraphiqueInstance.toBase64Image());
      }
    }
  }


  const procederRedirection = () => {
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
  };

 
  setTimeout(procederRedirection, 150);
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
const CODE_CORRECT = "Auralyon";

function validerCode() {
  const inputUser = document.getElementById("identifiantAcces");
  const inputCode = document.getElementById("codeAcces");
  const conteneurAuth = document.getElementById("bloc-authentification");
  const erreur = document.getElementById("erreur-code");

  if (!inputUser || !inputCode) {
    console.error("Les champs de connexion sont introuvables dans le HTML.");
    return;
  }

  const userSaisi = inputUser.value.trim();
  const codeSaisi = inputCode.value;

  if (userSaisi === USER_CORRECT && codeSaisi === CODE_CORRECT) {
    sessionStorage.setItem("estConnecte", "true");
    if (erreur) erreur.style.display = "none";
    if (conteneurAuth) conteneurAuth.style.display = "none";
  } else {
    if (erreur) erreur.style.display = "block";
  }
}

// AJOUT DE LA FONCTION MANQUANTE POUR ÉVITER LES CRASHS QUAND ON ÉCRIT
function verifierTouche(event) {
  // Si l'utilisateur appuie sur "Entrée", on valide le code automatiquement
  if (event.key === "Enter") {
    validerCode();
  }
}