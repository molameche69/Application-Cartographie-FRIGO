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

  const elDebut = document.getElementById("report-filtreHeureDebut");
  const elFin = document.getElementById("report-filtreHeureFin");
  
  const heureDebutStockee = formaterHeure(localStorage.getItem("filtreHeureDebut"));
  const heureFinStockee = formaterHeure(localStorage.getItem("filtreHeureFin"));

  if (elDebut) {
    elDebut.textContent = heureDebutStockee && heureDebutStockee !== "" ? heureDebutStockee : "Début de l'enregistrement";
  }
  if (elFin) {
    elFin.textContent = heureFinStockee && heureFinStockee !== "" ? heureFinStockee : "Fin de l'enregistrement";
  }

  const elMessage = document.getElementById("report-message");
  if (elMessage) {
    const messageStocke = localStorage.getItem("userMessage");
    if (messageStocke) {
      elMessage.innerHTML = messageStocke.replace(/\n/g, "<br />");
    } else {
      elMessage.textContent = "Non renseigné";
    }
  }

  // RECONSTRUCTION DES PASTILLES ET GÉNÉRATION DE LA LÉGENDE DES SONDES
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
  const imageZoomee = localStorage.getItem("imageGraphiqueZoome");
  const imgRapport = document.getElementById("graphiqueTemperatures");

  if (!imageZoomee) {
    if (imgRapport) imgRapport.style.display = "none";
  } else if (imgRapport) {
    // Modification directe du src de la balise <img> du HTML
    imgRapport.src = imageZoomee;
    imgRapport.style.display = "block";
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
        
        if (exclusManuellement.includes(id)) {
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

    creerTableauStatistiques(statsCapteurs, Xair, SXM, Sr, SR);

  } catch (err) {
    console.error("Erreur d'analyse ODS en Page 2 :", err);
    conteneurTableau.innerHTML = `<p class="erreur-ods">Erreur lors de la génération des statistiques du rapport.</p>`;
  }
}

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

function telechargerPDFDirect() {
  window.print();
}