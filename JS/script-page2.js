let monGraphiqueInstance = null;

function formaterHeure(valeur) {
  if (!valeur) return "";
  let valStr = valeur.toString().trim().replace(",", ".");
  let num = Number(valStr);
  
  if (!isNaN(num) && !valStr.includes(":")) {
    let fractionDuJour = num % 1;
    let totalSecondes = Math.round(fractionDuJour * 24 * 3600);
    let heures = Math.floor(totalSecondes / 3600) % 24;
    let minutes = Math.floor((totalSecondes % 3600) / 60);
    let secondes = totalSecondes % 60;
    return String(heures).padStart(2, '0') + ":" + String(minutes).padStart(2, '0') + ":" + String(secondes).padStart(2, '0');
  }
  
  let tempsNet = valStr.includes("T") ? valStr.split("T")[1].replace("Z", "") : valStr;
  let match = tempsNet.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    let h = match[1].padStart(2, '0');
    let m = match[2].padStart(2, '0');
    let s = match[3] ? match[3].padStart(2, '0') : "00";
    return `${h}:${m}:${s}`;
  }
  
  return valStr.substring(0, 8);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Démarrage du script de rendu du rapport conforme NF X 15-140...");

  const btnPdf = document.getElementById("btn-telecharger-pdf");
  if (btnPdf) {
    btnPdf.disabled = false;
    btnPdf.style.opacity = "1";
    btnPdf.style.cursor = "pointer";
  }

  // Configuration de l'association entre les IDs du Rapport HTML et les clés de stockage
  const champs = {
    "report-username": "store_username",
    "report-userEntreprise": "store_userEntreprise",
    "report-userService": "store_userService",
    "report-userReference": "store_userReference",
    "report-userCaracteristique": "store_userCaracteristique", 
    "report-userLoc": "store_userLoc",
    "report-tdeconsigne": "store_tdeconsigne",
    "report-valeur": "store_valeur",
    "report-periode": "store_periode",
    "report-date-emission": "store_report-date-emission"        
  };

  for (let id in champs) {
   
    const elements = document.querySelectorAll(`[id="${id}"]`);
    
    if (elements.length > 0) {
      const valeurRecuperee = sessionStorage.getItem(champs[id]) || "Non renseigné";
      
      // On applique la marque (ou autre donnée) sur chaque zone trouvée
      elements.forEach(el => {
        el.textContent = valeurRecuperee;
      });
    }
  }

  const elNomSignature = document.getElementById("report-username-signature");
  if (elNomSignature) {
    elNomSignature.textContent = sessionStorage.getItem("store_username") || localStorage.getItem("username") || "";
  }

  // ── Synchronisation résolution des sondes (onglet 5, index 0) → page 4/9 ──
  const elResolution = document.getElementById("report-resolution-sonde");
  if (elResolution) {
    const stockCalculs = sessionStorage.getItem("store_valeurs_calculs_norme");
    if (stockCalculs) {
      try {
        const listeCalculs = JSON.parse(stockCalculs);
        const itemResolution = listeCalculs.find(item => item.index === 0);
        if (itemResolution && itemResolution.valeur && itemResolution.valeur !== "—") {
          elResolution.textContent = itemResolution.valeur;
        }
      } catch (e) {
        console.error("Erreur de lecture de la résolution des sondes :", e);
      }
    }
  }

  const elDebut = document.getElementById("report-filtreHeureDebut");
  const elFin = document.getElementById("report-filtreHeureFin");
  
  const heureDebutStockee = formaterHeure(sessionStorage.getItem("store_heureDebut") || localStorage.getItem("filtreHeureDebut"));
  const heureFinStockee = formaterHeure(sessionStorage.getItem("store_heureFin") || localStorage.getItem("filtreHeureFin"));

  if (elDebut) {
    elDebut.textContent = heureDebutStockee && heureDebutStockee !== "" ? heureDebutStockee : "Début de l'enregistrement";
  }
  if (elFin) {
    elFin.textContent = heureFinStockee && heureFinStockee !== "" ? heureFinStockee : "Fin de l'enregistrement";
  }

  const elMessage = document.getElementById("report-message");
  if (elMessage) {
    const messageStocke = sessionStorage.getItem("store_userMessage") || localStorage.getItem("userMessage");
    if (messageStocke) {
      elMessage.innerHTML = messageStocke.replace(/\n/g, "<br />");
    } else {
      elMessage.textContent = "Non renseigné";
    }
  }

  const carteRapport = document.getElementById("carte-rapport");
  const sondesStockees = localStorage.getItem("positionsSondes");

  if (carteRapport && sondesStockees) {
    try {
      const parentDorigine = carteRapport.parentNode;
      
      let conteneurGlobalMap = document.getElementById("conteneur-global-carto-rapport");
      if (!conteneurGlobalMap) {
        conteneurGlobalMap = document.createElement("div");
        conteneurGlobalMap.id = "conteneur-global-carto-rapport";
        conteneurGlobalMap.style.display = "flex";
        conteneurGlobalMap.style.alignItems = "flex-start";
        conteneurGlobalMap.style.justifyContent = "center";
        conteneurGlobalMap.style.gap = "30px";
        conteneurGlobalMap.style.margin = "20px auto";
        conteneurGlobalMap.style.width = "100%";
        
        parentDorigine.insertBefore(conteneurGlobalMap, carteRapport);
        conteneurGlobalMap.appendChild(carteRapport);
      }

      carteRapport.style.position = "relative";
      carteRapport.style.display = "inline-block";
      carteRapport.style.flexShrink = "0";

      const ancienneLegende = document.getElementById("legende-sondes-rapport");
      if (ancienneLegende) ancienneLegende.remove();

      const anciensRonds = carteRapport.querySelectorAll(".pastille-sonde-generee");
      anciensRonds.forEach(r => r.remove());

      const blocLegende = document.createElement("div");
      blocLegende.id = "legende-sondes-rapport";
      blocLegende.style.display = "flex";
      blocLegende.style.flexDirection = "column";
      blocLegende.style.gap = "10px";
      blocLegende.style.padding = "15px";
      blocLegende.style.border = "1px dashed #b3b3b3";
      blocLegende.style.borderRadius = "6px";
      blocLegende.style.backgroundColor = "#ffffff";
      blocLegende.style.minWidth = "220px";
      blocLegende.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
      blocLegende.style.flexShrink = "0";

      const titreLegende = document.createElement("h4");
      titreLegende.textContent = "Légende des sondes :";
      titreLegende.style.margin = "0 0 8px 0";
      titreLegende.style.fontSize = "14px";
      titreLegende.style.color = "#333";
      titreLegende.style.borderBottom = "1px solid #eee";
      titreLegende.style.paddingBottom = "5px";
      blocLegende.appendChild(titreLegende);

      JSON.parse(sondesStockees).forEach((sonde) => {
        const divSonde = document.createElement("div");
        divSonde.id = sonde.id;
        divSonde.className = "pastille-sonde-generee";
        divSonde.textContent = sonde.numero || "";
        
        divSonde.style.position = "absolute";
        divSonde.style.left = sonde.left;
        divSonde.style.top = sonde.top;
        divSonde.style.transform = "translate(-50%, -50%)";
        
        divSonde.style.width = "28px";
        divSonde.style.height = "28px";
        divSonde.style.borderRadius = "50%";
        divSonde.style.backgroundColor = sonde.couleurFond || "#007BFF";
        
        divSonde.style.color = "white";
        divSonde.style.fontWeight = "bold";
        divSonde.style.display = "flex";
        divSonde.style.alignItems = "center";
        divSonde.style.justifyContent = "center";
        divSonde.style.fontSize = "14px";
        
        divSonde.style.zIndex = "100";
        divSonde.style.webkitPrintColorAdjust = "exact";
        divSonde.style.printColorAdjust = "exact";
        
        carteRapport.appendChild(divSonde);

        const ligneLegende = document.createElement("div");
        ligneLegende.style.display = "flex";
        ligneLegende.style.alignItems = "center";
        ligneLegende.style.gap = "12px";

        const indicateurCouleur = document.createElement("div");
        indicateurCouleur.style.width = "18px";
        indicateurCouleur.style.height = "18px";
        indicateurCouleur.style.borderRadius = "50%";
        indicateurCouleur.style.backgroundColor = sonde.couleurFond || "#007BFF";
        indicateurCouleur.style.display = "flex";
        indicateurCouleur.style.alignItems = "center";
        indicateurCouleur.style.justifyContent = "center";
        indicateurCouleur.style.color = "white";
        indicateurCouleur.style.fontSize = "11px";
        indicateurCouleur.style.fontWeight = "bold";
        indicateurCouleur.style.webkitPrintColorAdjust = "exact";
        indicateurCouleur.style.printColorAdjust = "exact";
        indicateurCouleur.textContent = sonde.numero || "";

        const texteLegende = document.createElement("span");
        texteLegende.style.fontSize = "13px";
        texteLegende.style.color = "#444";
        texteLegende.style.fontFamily = "sans-serif";
        
        const nomCapteurNettoye = sonde.id ? sonde.id.replace("sonde-deplacee-", "") : "Inconnu";
        texteLegende.innerHTML = `<strong>Sonde ${sonde.numero} :</strong> ${nomCapteurNettoye}`;

        ligneLegende.appendChild(indicateurCouleur);
        ligneLegende.appendChild(texteLegende);
        blocLegende.appendChild(ligneLegende);
      });

      conteneurGlobalMap.appendChild(blocLegende);
    } catch (e) {
      console.error("Erreur d'injection des sondes et de la légende :", e);
    }
  }

  chargerDonneesODSRapport();
});

function chargerDonneesODSRapport() {
  const imageZoomee = localStorage.getItem("imageGraphiqueZoome") || localStorage.getItem("imageGraphique");
  
  // 🌟 CORRECTION : On cible TOUS les graphiques de la page 6 et de la page 8 sans conflit d'ID unique
  const tousLesGraphiques = document.querySelectorAll('[id="graphiqueTemperatures"], [id="graphiqueTemperaturesConformite"]');

  if (!imageZoomee) {
    console.warn("Attention : Aucun graphique trouvé dans le localStorage.");
    tousLesGraphiques.forEach(img => {
      img.alt = "Aucun graphique généré (Veuillez cliquer sur 'Générer le Graphique' en page 1)";
      img.style.border = "1px dashed #ccc";
    });
  } else {
    // On applique l'image Base64 sur chaque zone de graphique trouvée (Page 6 et Page 8)
    tousLesGraphiques.forEach(img => {
      img.src = imageZoomee;
      img.style.display = "block";
    });
  }

  const conteneurTableau = document.querySelector(".conteneur-tableau");
  if (!conteneurTableau) return;

  const filtreDebut = formaterHeure(localStorage.getItem("filtreHeureDebut") || "");
  const filtreFin = formaterHeure(localStorage.getItem("filtreHeureFin") || "");
  const fichierBase64 = localStorage.getItem("fichierOdsBase64");

  let exclusManuellement = [];
  try {
    const stock = localStorage.getItem("capteursExclusManuellement");
    if (stock) exclusManuellement = JSON.parse(stock);
  } catch (e) {
    console.error("Erreur de lecture des exclusions :", e);
  }

  let idsSondesSurLaCarte = [];
  const sondesStockees = localStorage.getItem("positionsSondes");
  if (sondesStockees) {
    try {
      idsSondesSurLaCarte = JSON.parse(sondesStockees).map(s => {
        return s.id ? s.id.replace("sonde-deplacee-", "").trim() : "";
      });
    } catch(e) {
      console.error("Erreur parsing positionsSondes", e);
    }
  }

  if (!fichierBase64) {
    conteneurTableau.innerHTML = `<p class="erreur-filtrage">Aucun fichier de relevés disponible. Veuillez importer un fichier en page 1.</p>`;
    return;
  }

  try {
    const chaineBinaire = atob(fichierBase64);
    const longueur = chaineBinaire.length;
    const buffer = new Uint8Array(longueur);
    
    for (let i = 0; i < longueur; i++) {
      buffer[i] = chaineBinaire.charCodeAt(i);
    }

    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const feuille = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(feuille, { header: 1 });

    const donneesCapteurs = {};

    for (let i = 1; i < json.length; i++) {
      const ligne = json[i];
      if (ligne && ligne[0] !== undefined && ligne[1] !== undefined && ligne[2] !== undefined) {
        const id = ligne[0].toString().trim();
        
        if (exclusManuellement.includes(id) || (idsSondesSurLaCarte.length > 0 && !idsSondesSurLaCarte.includes(id))) {
          continue; 
        }
        
        let tempsAffiche = "";
        if (ligne[1] instanceof Date) {
          const hh = String(ligne[1].getUTCHours()).padStart(2, '0');
          const mm = String(ligne[1].getUTCMinutes()).padStart(2, '0');
          const ss = String(ligne[1].getUTCSeconds()).padStart(2, '0');
          tempsAffiche = `${hh}:${mm}:${ss}`;
        } else {
          tempsAffiche = formaterHeure(ligne[1]);
        }

        if (filtreDebut && tempsAffiche < filtreDebut) continue;
        if (filtreFin && tempsAffiche > filtreFin) continue;

        let valeurTemp = parseFloat(ligne[2].toString().replace(",", "."));
        if (isNaN(valeurTemp)) continue;

        if (!donneesCapteurs[id]) donneesCapteurs[id] = [];
        donneesCapteurs[id].push(valeurTemp);
      }
    }

    const statsCapteurs = {};
    const tempConsigneValidation = parseFloat(localStorage.getItem("tdeconsigne")) || 5.0;

    let sommeDesMoyennesUtiles = 0;
    let nombreCapteursUtiles = 0;
    let toutesLesStabilitesUtiles = [];
    let sommeEcartTypeExpCarreUtiles = 0;
    let listeSondesUtiles = [];
    
    let toutesLesMoyennesUtiles = [];
    let tousLesEcartsConsigneUtiles = [];

    Object.keys(donneesCapteurs).forEach((id) => {
      const releves = donneesCapteurs[id];
      const n = releves.length;
      if (n === 0) return;

      const moyenne = releves.reduce((a, b) => a + b, 0) / n;
      const max = Math.max(...releves);
      const min = Math.min(...releves);
      const stabilite = max - min;
      const sommeCarresSomme = releves.reduce((acc, val) => acc + Math.pow(val - moyenne, 2), 0);
      const ecartTypeExp = n > 1 ? Math.sqrt(sommeCarresSomme / (n - 1)) : 0;

      statsCapteurs[id] = { moyenne, stabilite, ecartTypeExp, n, estAmbiance: false };

      if (Math.abs(moyenne - tempConsigneValidation) <= 7.0) {
        sommeDesMoyennesUtiles += moyenne;
        nombreCapteursUtiles++;
        toutesLesStabilitesUtiles.push(stabilite);
        sommeEcartTypeExpCarreUtiles += Math.pow(ecartTypeExp, 2);
        listeSondesUtiles.push({ moyenne, ecartTypeExp, n });
        
        toutesLesMoyennesUtiles.push(moyenne);
        tousLesEcartsConsigneUtiles.push(Math.abs(moyenne - tempConsigneValidation));
      } else {
        statsCapteurs[id].estAmbiance = true; 
      }
    });

    if (Object.keys(statsCapteurs).length === 0) {
      conteneurTableau.innerHTML = `<p class="erreur-filtrage">Aucune donnée trouvée pour la plage sélectionnée.</p>`;
      return;
    }

    let effectifCalcul = nombreCapteursUtiles > 0 ? nombreCapteursUtiles : Object.keys(statsCapteurs).length;
    let Xair = nombreCapteursUtiles > 0 ? (sommeDesMoyennesUtiles / nombreCapteursUtiles) : Object.values(statsCapteurs).reduce((a,b)=>a+b.moyenne,0)/effectifCalcul;
    let SXM = toutesLesStabilitesUtiles.length > 0 ? Math.max(...toutesLesStabilitesUtiles) : Math.max(...Object.values(statsCapteurs).map(s=>s.stabilite));
    
    let deltaHomogeneite = 0;
    let deltaConsigneMax = 0;
    let uHomog = 0;
    let uConsigne = 0;
    
    if (toutesLesMoyennesUtiles.length > 0) {
      deltaHomogeneite = Math.max(...toutesLesMoyennesUtiles) - Math.min(...toutesLesMoyennesUtiles);
      deltaConsigneMax = Math.max(...tousLesEcartsConsigneUtiles);
      uHomog = deltaHomogeneite / Math.sqrt(3);
      uConsigne = deltaConsigneMax / Math.sqrt(3);
    }

    let Sr = 0;
    if (nombreCapteursUtiles > 0) {
      Sr = Math.sqrt(sommeEcartTypeExpCarreUtiles / nombreCapteursUtiles);
    } else {
      let sommeTotalCarre = Object.values(statsCapteurs).reduce((acc, s) => acc + Math.pow(s.ecartTypeExp, 2), 0);
      Sr = Math.sqrt(sommeTotalCarre / effectifCalcul);
    }

    let nGenerique = listeSondesUtiles.length > 0 ? listeSondesUtiles[0].n : Object.values(statsCapteurs)[0].n;
    let sommeVarianceInter = 0;
    
    if (nombreCapteursUtiles > 0) {
      sommeVarianceInter = listeSondesUtiles.reduce((acc, s) => acc + Math.pow(s.moyenne - Xair, 2), 0);
    } else {
      sommeVarianceInter = Object.values(statsCapteurs).reduce((acc, s) => acc + Math.pow(s.moyenne - Xair, 2), 0);
    }
    
    let partieDroiteSR = effectifCalcul > 1 ? (1 / (effectifCalcul - 1)) * sommeVarianceInter : 0;
    let SR = Math.sqrt(Math.pow(Sr, 2) * (1 - 1 / nGenerique) + partieDroiteSR);

    creerTableauStatistiques(statsCapteurs, Xair, SXM, Sr, SR, deltaHomogeneite, deltaConsigneMax, uHomog, uConsigne);

  } catch (err) {
    console.error("Erreur d'analyse ODS en Page 2 :", err);
    conteneurTableau.innerHTML = `<p class="erreur-ods">Erreur lors de la génération des statistiques du rapport.</p>`;
  }
}

function creerTableauStatistiques(statsCapteurs, Xair, SXM, Sr, SR, deltaHomogeneite, deltaConsigneMax, uHomog, uConsigne) {
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

    if (!s.estAmbiance && !estConforme) {
      enceinteConforme = false;
    }

    html += `
      <tr class="${s.estAmbiance ? 'ligne-ambiance-brute' : ''}">
        <td class="cellule-commune"><span class="nom-capteur">Capteur ${id} ${s.estAmbiance ? '(Ambiance/Masqué)' : ''}</span></td>
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
          <td class="cellule-commune">Écart d'Homogénéité Maximal</td>
          <td colspan="4" class="cellule-commune">${deltaHomogeneite.toFixed(3)} °C</td>
        </tr>
        <tr class="ligne-globale texte-gras fond-synthese">
          <td class="cellule-commune">Incertitude d'Homogénéité</td>
          <td colspan="4" class="cellule-commune">${uHomog.toFixed(3)} °C</td>
        </tr>
        <tr class="ligne-globale texte-gras fond-synthese">
          <td class="cellule-commune">Écart de Consigne Maximal</td>
          <td colspan="4" class="cellule-commune">${deltaConsigneMax.toFixed(3)} °C</td>
        </tr>
        <tr class="ligne-globale texte-gras fond-synthese">
          <td class="cellule-commune">Incertitude d'Écart de Consigne</td>
          <td colspan="4" class="cellule-commune">${uConsigne.toFixed(3)} °C</td>
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

  const elConclusionTexte = document.getElementById("report-statut-conclusion-texte");
  if (elConclusionTexte) {
    if (enceinteConforme) {
      elConclusionTexte.textContent = "CONFORME aux spécifications de la norme NF X 15-140.";
      elConclusionTexte.style.color = "#375623";
      elConclusionTexte.style.fontWeight = "bold";
    } else {
      elConclusionTexte.textContent = "NON CONFORME aux spécifications de la norme NF X 15-140.";
      elConclusionTexte.style.color = "#c65911";
      elConclusionTexte.style.fontWeight = "bold";
    }
  }
}

// ── Lancement unique au chargement (couvre DOM prêt ou non) ─────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(genererTableauCalculsNormeAutomatique, 200));
} else {
  setTimeout(genererTableauCalculsNormeAutomatique, 200);
}

function genererTableauCalculsNormeAutomatique() {
  const conteneur = document.getElementById("conteneur-tableau-norme-sondes");
  if (!conteneur) return;

  // ── 1. Lecture des 6 valeurs saisies dans l'onglet 5 ────────────────────────
  // Index des txt-formule (ordre du HTML onglet 5) :
  //   0 → r       Résolution des sondes
  //   1 → u_ray   Influence des parois (N.A possible)
  //   2 → U       Incertitude élargie moyenne générale
  //   3 → GX_E    Homogénéité de l'équipement
  //   4 → Sr      Écart type de répétabilité
  //   5 → SR      Écart type de reproductibilité
  const stockCalculs = sessionStorage.getItem("store_valeurs_calculs_norme");
  let valeursOnglet5 = [];
  if (stockCalculs) {
    try { valeursOnglet5 = JSON.parse(stockCalculs); } catch (e) { console.error(e); }
  }

  function lireValeurOnglet5(idx) {
    const item = valeursOnglet5.find(i => i.index === idx);
    if (!item) return null;
    const v = parseFloat(item.valeur);
    return isNaN(v) ? null : v;
  }
  function lireTexteOnglet5(idx) {
    const item = valeursOnglet5.find(i => i.index === idx);
    return item ? item.valeur : "—";
  }

  const r_saisi    = lireValeurOnglet5(0);
  const uRay_saisi = lireValeurOnglet5(1);
  const U_saisi    = lireValeurOnglet5(2);
  const GXE_saisi  = lireValeurOnglet5(3);
  const Sr_saisi   = lireValeurOnglet5(4);
  const SR_saisi   = lireValeurOnglet5(5);

  const resolutionCapteur = (r_saisi !== null) ? r_saisi : 0.031;
  const uRay              = (uRay_saisi !== null) ? uRay_saisi : 0;

  // ── 2. Récupération des datasets du graphique ────────────────────────────────
  let datasetsActifs = [];
  const backup = sessionStorage.getItem("store_graphes_memoire");
  if (backup) {
    try {
      const parsed = JSON.parse(backup);
      if (parsed && parsed.datasets) datasetsActifs = parsed.datasets;
    } catch (e) { console.error("Erreur lecture store_graphes_memoire :", e); }
  }
  if ((!datasetsActifs || datasetsActifs.length === 0) && typeof monGraphiqueInstance !== "undefined" && monGraphiqueInstance && monGraphiqueInstance.data) {
    datasetsActifs = monGraphiqueInstance.data.datasets;
  }

  if (!datasetsActifs || datasetsActifs.length === 0) {
    conteneur.innerHTML = `<p style="color:#c00000;text-align:center;font-style:italic;font-size:11px;">
      [En attente] Aucune donnée de graphique trouvée. Veuillez générer le graphique en Page 1.
    </p>`;
    return;
  }

  // ── 3. Calculs par capteur ───────────────────────────────────────────────────
  const u_resolution = resolutionCapteur / (2 * Math.sqrt(3));

  let compteurLignes = 0;
  let lignesHTML = "";
  const moyennesParCapteur       = [];
  const ecartTypesParCapteur     = [];
  const incertElargiesParCapteur = [];

  datasetsActifs.forEach((dataset) => {
    const nomSonde = dataset.label ? dataset.label.trim() : "";
    if (!nomSonde || nomSonde.toLowerCase().includes("limite") || nomSonde.toLowerCase().includes("seuil") || nomSonde.toLowerCase().includes("consigne")) return;

    const valeurs = dataset.data
      .map(v => {
        if (v === undefined || v === null) return NaN;
        if (typeof v === "object" && v !== null && v.y !== undefined) return parseFloat(v.y);
        if (typeof v === "string") v = v.replace(",", ".");
        return parseFloat(v);
      })
      .filter(v => !isNaN(v));

    if (valeurs.length === 0) return;
    compteurLignes++;

    const somme       = valeurs.reduce((acc, val) => acc + val, 0);
    const moyenne     = somme / valeurs.length;
    const sommeCarres = valeurs.reduce((acc, val) => acc + Math.pow(val - moyenne, 2), 0);
    const ecartType   = Math.sqrt(sommeCarres / (valeurs.length - 1 || 1));

    // ucmesj = √(Sj² + u_ray² + u_résolution²)
    const u_combinee       = Math.sqrt(Math.pow(ecartType, 2) + Math.pow(uRay, 2) + Math.pow(u_resolution, 2));
    // Umj = k * √(Sj² + ucmesj²)  avec k=2
    const incertitudeElargie = 2 * Math.sqrt(Math.pow(ecartType, 2) + Math.pow(u_combinee, 2));

    moyennesParCapteur.push(moyenne);
    ecartTypesParCapteur.push(ecartType);
    incertElargiesParCapteur.push(incertitudeElargie);

    lignesHTML += `
      <tr style="background-color:${compteurLignes % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;text-align:left;color:#1F3864;">${nomSonde}</td>
        <td style="padding:8px;border:1px solid #ddd;">${moyenne.toFixed(3)}</td>
        <td style="padding:8px;border:1px solid #ddd;color:#444;">${ecartType.toFixed(3)}</td>
        <td style="padding:8px;border:1px solid #ddd;color:#666;">${u_resolution.toFixed(4)}</td>
        <td style="padding:8px;border:1px solid #ddd;color:#444;">${u_combinee.toFixed(3)}</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;color:#C00000;background-color:#FFF2CC;">
          &plusmn; ${incertitudeElargie.toFixed(3)}
        </td>
      </tr>
    `;
  });

  if (compteurLignes === 0) {
    lignesHTML = `<tr><td colspan="6" style="padding:12px;color:#888;font-style:italic;">Aucune sonde active trouvée.</td></tr>`;
  }

  // ── 4. Calculs globaux — valeur saisie onglet 5 prioritaire, sinon calculé ──
  // U — moyenne des Umj
  let U_affiche;
  if (U_saisi !== null) {
    U_affiche = U_saisi.toFixed(3);
  } else if (incertElargiesParCapteur.length > 0) {
    U_affiche = (incertElargiesParCapteur.reduce((a, b) => a + b, 0) / incertElargiesParCapteur.length).toFixed(3);
  } else { U_affiche = "—"; }

  // GX_E = max(Xmj + Umj) − min(Xmj − Umj)
  let GXE_affiche;
  if (GXE_saisi !== null) {
    GXE_affiche = GXE_saisi.toFixed(3);
  } else if (moyennesParCapteur.length > 0) {
    const GXE_calc = Math.max(...moyennesParCapteur.map((m, i) => m + incertElargiesParCapteur[i]))
                   - Math.min(...moyennesParCapteur.map((m, i) => m - incertElargiesParCapteur[i]));
    GXE_affiche = GXE_calc.toFixed(3);
  } else { GXE_affiche = "—"; }

  // Sr = √(1/N * Σ Sj²)
  let Sr_affiche;
  if (Sr_saisi !== null) {
    Sr_affiche = Sr_saisi.toFixed(3);
  } else if (ecartTypesParCapteur.length > 0) {
    Sr_affiche = Math.sqrt(ecartTypesParCapteur.reduce((acc, s) => acc + Math.pow(s, 2), 0) / ecartTypesParCapteur.length).toFixed(3);
  } else { Sr_affiche = "—"; }

  // SR = √(Sr² + 1/(N−1) * Σ(Xmj − Xair)²)
  let SR_affiche;
  if (SR_saisi !== null) {
    SR_affiche = SR_saisi.toFixed(3);
  } else if (ecartTypesParCapteur.length > 1 && moyennesParCapteur.length > 1) {
    const Sr_val  = Math.sqrt(ecartTypesParCapteur.reduce((acc, s) => acc + Math.pow(s, 2), 0) / ecartTypesParCapteur.length);
    const Xair    = moyennesParCapteur.reduce((a, b) => a + b, 0) / moyennesParCapteur.length;
    const partieInter = moyennesParCapteur.reduce((acc, m) => acc + Math.pow(m - Xair, 2), 0) / (moyennesParCapteur.length - 1);
    SR_affiche = Math.sqrt(Math.pow(Sr_val, 2) + partieInter).toFixed(3);
  } else { SR_affiche = "—"; }

  const uRay_texte   = lireTexteOnglet5(1);
  const uRay_affiche = (uRay_texte === "N.A" || uRay_texte === "—") ? "N.A" : uRay.toFixed(4);

  // ── 5. Construction du HTML — tableau par capteur + tableau global ───────────
  const cs  = "padding:8px;border:1px solid #ddd;";
  const th  = `${cs}background-color:#2F5597;color:white;`;
  const thF = `${cs}background-color:#1F3864;color:white;`;
  const rs  = "background-color:#EBF3FF;font-weight:bold;";

  conteneur.innerHTML = `
    <table class="table-rapport-brute" style="width:100%;border-collapse:collapse;margin-top:15px;font-size:11px;font-family:Arial,sans-serif;border:1px solid #ddd;">
      <thead>
        <tr>
          <th style="${th}text-align:left;">Identification Capteur</th>
          <th style="${th}text-align:center;">Xmj — Moyenne (°C)</th>
          <th style="${th}text-align:center;">Sj — Écart-type exp. (°C)</th>
          <th style="${th}text-align:center;">u_résolution (r=${resolutionCapteur}) (°C)</th>
          <th style="${th}text-align:center;">ucmesj — Incert. combinée (°C)</th>
          <th style="${thF}text-align:center;">Umj — Incert. élargie k=2 (°C)</th>
        </tr>
      </thead>
      <tbody>${lignesHTML}</tbody>
    </table>

    <table class="table-rapport-brute" style="width:100%;border-collapse:collapse;margin-top:18px;font-size:11px;font-family:Arial,sans-serif;border:1px solid #ddd;">
      <thead>
        <tr>
          <th style="${th}text-align:left;" colspan="2">Résultats globaux — Valeurs onglet 5 (ou calculées depuis les données)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color:#ffffff;">
          <td style="${cs}font-weight:500;">r — Résolution des sondes</td>
          <td style="${cs}text-align:center;font-weight:bold;color:#2F5597;">${resolutionCapteur}</td>
        </tr>
        <tr style="background-color:#f9f9f9;">
          <td style="${cs}font-weight:500;">u<sub>Δθ_ray</sub> — Influence des parois</td>
          <td style="${cs}text-align:center;font-weight:bold;color:#2F5597;">${uRay_affiche}</td>
        </tr>
        <tr style="${rs}">
          <td style="${cs}">U — Incertitude élargie associée à la moyenne générale (°C)</td>
          <td style="${cs}text-align:center;color:#C00000;background-color:#FFF2CC;">${U_affiche}</td>
        </tr>
        <tr style="${rs}">
          <td style="${cs}">GX<sub>E</sub> — Homogénéité de l'équipement (°C)</td>
          <td style="${cs}text-align:center;color:#C00000;background-color:#FFF2CC;">${GXE_affiche}</td>
        </tr>
        <tr style="${rs}">
          <td style="${cs}">S<sub>r</sub> — Écart type de répétabilité (°C)</td>
          <td style="${cs}text-align:center;color:#C00000;background-color:#FFF2CC;">${Sr_affiche}</td>
        </tr>
        <tr style="${rs}">
          <td style="${cs}">S<sub>R</sub> — Écart type de reproductibilité (°C)</td>
          <td style="${cs}text-align:center;color:#C00000;background-color:#FFF2CC;">${SR_affiche}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function telechargerPDFDirect() {
  window.print();
}