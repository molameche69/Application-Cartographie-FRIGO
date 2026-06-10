// ==========================================================
// VARIABLES GLOBALES
// ==========================================================
let monGraphiqueInstance = null;

// ==========================================================
// 1. INITIALISATION AU CHARGEMENT DE LA PAGE
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    const marqueurs = document.querySelectorAll('.marqueur-draggable');
    const carteCible = document.getElementById('carte-cible');
    const reserveCible = document.getElementById('reserve-cible');

    // Activation du Drag & Drop sur toutes les images de sondes
    marqueurs.forEach(marqueur => {
        marqueur.setAttribute('draggable', 'true');
        
        marqueur.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.id);
            e.target.style.opacity = "0.5"; // Effet visuel au glissement
        });

        marqueur.addEventListener('dragend', (e) => {
            e.target.style.opacity = "1"; // Retour à la normale
        });
    });

    // Zone de dépôt : Sur la carte (calcul en pourcentage pour le responsive)
    if (carteCible) {
        carteCible.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
        });

        carteCible.addEventListener('drop', (e) => {
            e.preventDefault();
            const idElement = e.dataTransfer.getData('text/plain');
            const elementGlisse = document.getElementById(idElement);

            if (elementGlisse) {
                const limitesCarte = carteCible.getBoundingClientRect();
                const x = e.clientX - limitesCarte.left;
                const y = e.clientY - limitesCarte.top;

                // Conversion en % pour s'adapter à toutes les tailles d'écrans
                const xPourcentage = (x / limitesCarte.width) * 100;
                const yPourcentage = (y / limitesCarte.height) * 100;

                carteCible.appendChild(elementGlisse);
                elementGlisse.style.position = 'absolute';
                elementGlisse.style.left = xPourcentage + '%';
                elementGlisse.style.top = yPourcentage + '%';
                elementGlisse.style.margin = '0px';
            }
        });
    }

    // Zone de dépôt : Retour dans la réserve initiale
    if (reserveCible) {
        reserveCible.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
        });

        reserveCible.addEventListener('drop', (e) => {
            e.preventDefault();
            const idElement = e.dataTransfer.getData('text/plain');
            const elementGlisse = document.getElementById(idElement);

            if (elementGlisse) {
                reserveCible.appendChild(elementGlisse);
                elementGlisse.style.position = '';
                elementGlisse.style.left = '';
                elementGlisse.style.top = '';
            }
        });
    }

    // Chargement automatique du tableur ODS
    chargerFichierODS();
});

// ==========================================================
// 2. FONCTIONS DE NAVIGATION ET REINITIALISATION
// ==========================================================

// Changement d'onglet fluide
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
    evenement.currentTarget.className += " actif";
}

// Réinitialisation globale des sondes dans la réserve
function reinitialiserMarqueurs() {
    const reserve = document.getElementById('reserve-cible');
    const tousLesMarqueurs = document.querySelectorAll('.marqueur-draggable');
    if (reserve) {
        tousLesMarqueurs.forEach(marqueur => {
            reserve.appendChild(marqueur);
            marqueur.style.position = '';
            marqueur.style.left = '';
            marqueur.style.top = '';
        });
    }
}

// ==========================================================
// 3. CHARGEMENT ET PARSING DU FICHIER EXCEL/ODS
// ==========================================================
function chargerFichierODS() {
    const cheminFichierODS = "Relevés - 10-06-2026 2213.ods";
    console.log("Lecture du fichier :", cheminFichierODS);

    fetch(cheminFichierODS)
        .then(response => {
            if (!response.ok) throw new Error(`Fichier introuvable.`);
            return response.arrayBuffer();
        })
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const feuille = workbook.Sheets[workbook.SheetNames[0]];
            const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

            const donneesCapteurs = {};
            const tousLesHorodatages = new Set();
            let htmlLignes = "";

            for (let i = 1; i < donneesJson.length; i++) {
                const ligne = donneesJson[i];
                if (ligne && ligne[0] !== undefined && ligne[1] !== undefined && ligne[2] !== undefined) {
                    const idCapteur = ligne[0].toString().trim();
                    let tempsBrut = ligne[1].toString().trim();
                    let tempsAffiche = tempsBrut.includes('T') ? tempsBrut.split('T')[1].replace('Z', '') : tempsBrut;
                    const valeurTemp = parseFloat(ligne[2]);
                    const unite = ligne[3] || '°C';

                    if (!donneesCapteurs[idCapteur]) donneesCapteurs[idCapteur] = {};
                    donneesCapteurs[idCapteur][tempsAffiche] = valeurTemp;
                    tousLesHorodatages.add(tempsAffiche);

                    const couleurTemp = valeurTemp > 24 ? '#dc3545' : '#007BFF';
                    
                    htmlLignes += `
                        <tr>
                            <td style="font-weight: bold; color: #333;">${idCapteur}</td>
                            <td>${tempsBrut.replace('T', ' ').replace('Z', '')}</td>
                            <td style="font-weight: bold; color: ${couleurTemp};">${valeurTemp.toFixed(2)}</td>
                            <td style="color: #888;">${unite}</td>
                        </tr>
                    `;
                }
            }

            const corpsTableau = document.getElementById('corpsTableauODS');
            if (corpsTableau) corpsTableau.innerHTML = htmlLignes;

            const listeLabelsX = Array.from(tousLesHorodatages).sort();
            const listeIdsCapteurs = Object.keys(donneesCapteurs);
            
            const couleursCourbes = [
                { border: '#007BFF', bg: 'rgba(0, 123, 255, 0.02)' }, 
                { border: '#28a745', bg: 'rgba(40, 167, 69, 0.02)' },  
                { border: '#dc3545', bg: 'rgba(220, 53, 69, 0.02)' }   
            ];

            const datasetsGraphique = listeIdsCapteurs.map((id, index) => {
                const dataPoints = listeLabelsX.map(temps => donneesCapteurs[id][temps] !== undefined ? donneesCapteurs[id][temps] : null);
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
                    spanGaps: true
                };
            });

            genererGraphiqueTriCapteurs(listeLabelsX, datasetsGraphique);
        })
        .catch(error => {
            console.error(error);
            const corpsTableau = document.getElementById('corpsTableauODS');
            if (corpsTableau) {
                corpsTableau.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #dc3545;">⚠️ Fichier ODS manquant ou non lancé en "Go Live".</td></tr>`;
            }
        });
}

function genererGraphiqueTriCapteurs(labelsX, datasetsFournis) {
    const canvas = document.getElementById('graphiqueTemperatures');
    if (!canvas) return;

    if (monGraphiqueInstance) monGraphiqueInstance.destroy();

    const ctx = canvas.getContext('2d');
    monGraphiqueInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labelsX, datasets: datasetsFournis },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { title: { display: true, text: 'Température (°C)' } },
                x: { title: { display: true, text: 'Horodatage (UTC)' }, ticks: { maxTicksLimit: 12 } }
            }
        }
    });
}

// ==========================================================
// 4. SAUVEGARDE LOCALE ET REDIRECTION
// ==========================================================
function sauvegarderToutEtDiriger() {
    const nom = document.getElementById('username').value.trim();
    const message = document.getElementById('userMessage').value.trim();

    if (nom === '' || message === '') {
        alert('Veuillez remplir votre nom et votre message sur la Fiche technique.');
        return;
    }

    // Cohérence des noms de clés avec la page de rapport
    localStorage.setItem('monNom', nom);
    localStorage.setItem('monMessage', message);

    const carteCible = document.getElementById('carte-cible');
    if (carteCible) {
        const toutesLesSondes = carteCible.querySelectorAll('.marqueur-draggable');
        const donneesSondes = [];

        toutesLesSondes.forEach(sonde => {
            donneesSondes.push({
                id: sonde.id,
                src: sonde.getAttribute('src'), 
                left: sonde.style.left,        
                top: sonde.style.top           
            });
        });

        localStorage.setItem('positionsSondes', JSON.stringify(donneesSondes));
    }

    window.location.href = 'index-page2-Rapport.html';
}