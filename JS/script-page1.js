// ==========================================
// SÉCURITÉ : On attend que le HTML soit 100% chargé
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Récupération des éléments dans le DOM
    const marqueurs = document.querySelectorAll('.marqueur-draggable');
    const carteCible = document.getElementById('carte-cible');
    const reserveCible = document.getElementById('reserve-cible');

    // Vérification de sécurité dans la console du navigateur
    console.log("Carte trouvée :", !!carteCible);
    console.log("Réserve trouvée :", !!reserveCible);
    console.log("Nombre de marqueurs trouvés :", marqueurs.length);

    // ==========================================
    // 2. GESTION DU DRAGSTART (ATTAQUER LA SONDE)
    // ==========================================
    marqueurs.forEach(marqueur => {
        // On s'assure que l'attributHTML est bien forcé
        marqueur.setAttribute('draggable', 'true');
        
        marqueur.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.id);
            // Optionnel : effet visuel pendant le glissement
            e.target.style.opacity = "0.5";
        });

        marqueur.addEventListener('dragend', (e) => {
            e.target.style.opacity = "1"; // On remet l'opacité normale
        });
    });

    // ==========================================
    // 3. GESTION DU DÉPÔT SUR LA CARTE (CUBE 3D)
    // ==========================================
    if (carteCible) {
        carteCible.addEventListener('dragover', (e) => {
            e.preventDefault(); // Indispensable pour autoriser le drop
        });

        carteCible.addEventListener('drop', (e) => {
            e.preventDefault();
            const idElement = e.dataTransfer.getData('text/plain');
            const elementGlisse = document.getElementById(idElement);

            if (elementGlisse) {
                const limitesCarte = carteCible.getBoundingClientRect();
                
                // Calcul de la position de la souris relative à la carte
                const x = e.clientX - limitesCarte.left;
                const y = e.clientY - limitesCarte.top;

                // Déplacement de l'élément HTML dans le conteneur carte
                carteCible.appendChild(elementGlisse);

                // Application immédiate des styles CSS de positionnement
                elementGlisse.style.position = 'absolute';
                elementGlisse.style.left = x + 'px';
                elementGlisse.style.top = y + 'px';
                elementGlisse.style.margin = '0px'; // Évite les décalages de marges
            }
        });
    }

    // ==========================================
    // 4. GESTION DU RETOUR DANS LA RÉSERVE
    // ==========================================
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
                
                // On nettoie les positions forcées pour qu'ils se remettent en grille
                elementGlisse.style.position = '';
                elementGlisse.style.left = '';
                elementGlisse.style.top = '';
            }
        });
    }
});

// ==========================================
// 5. FONCTIONS GLOBALES (ACCESSIBLES VIA LE HTML)
// ==========================================

// Bouton Réinitialiser les marqueurs
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
        console.log("Marqueurs réinitialisés dans la réserve.");
    }
}

// Gestion du changement d'onglet
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

// Bouton de validation final (Sauvegarde textuelle + mathématique)
function sauvegarderToutEtDiriger() {
    const nom = document.getElementById('username').value.trim();
    const message = document.getElementById('userMessage').value.trim();

    if (nom === '' || message === '') {
        alert('Veuillez remplir votre nom et votre message dans la Fiche technique.');
        return;
    }

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

document.addEventListener("DOMContentLoaded", () => {
    const marqueurs = document.querySelectorAll('.marqueur-draggable');
    const carteCible = document.getElementById('carte-cible');
    const reserveCible = document.getElementById('reserve-cible');

    // On force l'activation du Drag sur toutes les images de sondes
    marqueurs.forEach(marqueur => {
        marqueur.setAttribute('draggable', 'true');
        marqueur.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.id);
        });
    });

    // Gestion du dépôt sur la carte (Cube 3D)
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
                // Calcul précis de la position de la souris par rapport aux bords de la carte
                const x = e.clientX - limitesCarte.left;
                const y = e.clientY - limitesCarte.top;

                // On déplace l'image de la sonde à l'intérieur du conteneur de la carte
                carteCible.appendChild(elementGlisse);
                
                // On lui applique ses coordonnées en pourcentage pour garder le bon placement si l'écran change de taille
                const xPourcentage = (x / limitesCarte.width) * 100;
                const yPourcentage = (y / limitesCarte.height) * 100;

                elementGlisse.style.position = 'absolute';
                elementGlisse.style.left = xPourcentage + '%';
                elementGlisse.style.top = yPourcentage + '%';
                elementGlisse.style.margin = '0px';
            }
        });
    }

    // Gestion du retour dans la réserve
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
});

// Changement d'onglet
function changerOnglet(evenement, idOnglet) {
    const contenus = document.getElementsByClassName("contenu-onglet");
    for (let i = 0; i < contenus.length; i++) { contenus[i].style.display = "none"; }
    const boutons = document.getElementsByClassName("onglet-btn");
    for (let i = 0; i < boutons.length; i++) { boutons[i].className = boutons[i].className.replace(" actif", ""); }
    document.getElementById(idOnglet).style.display = "block";
    evenement.currentTarget.className += " actif";
}

// Réinitialisation
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

// 🛠️ ENREGISTREMENT ET REDIRECTION VERS LA PAGE RAPPORT
function sauvegarderToutEtDiriger() {
    const nom = document.getElementById('username').value.trim();
    const message = document.getElementById('userMessage').value.trim();

    if (nom === '' || message === '') {
        alert('Veuillez remplir votre nom et votre message sur la Fiche technique.');
        return;
    }

    localStorage.setItem('monNom', nom);
    localStorage.setItem('monMessage', message);

    const carteCible = document.getElementById('carte-cible');
    if (carteCible) {
        // On récupère uniquement les sondes qui ont été déposées sur la carte
        const toutesLesSondes = carteCible.querySelectorAll('.marqueur-draggable');
        const donneesSondes = [];

        toutesLesSondes.forEach(sonde => {
            donneesSondes.push({
                id: sonde.id,
                src: sonde.getAttribute('src'), // Sauvegarde le chemin de l'image (ex: images/Sondes/1.png)
                left: sonde.style.left,         // Sauvegarde sa coordonnée X en %
                top: sonde.style.top           // Sauvegarde sa coordonnée Y en %
            });
        });

        // On convertit le tableau en texte JSON pour le stocker dans le localStorage
        localStorage.setItem('positionsSondes', JSON.stringify(donneesSondes));
    }

    window.location.href = 'index-page2-Rapport.html';
}

let monGraphiqueInstance = null; 

document.addEventListener("DOMContentLoaded", () => {
    
    const cheminFichierODS = "Relevés - 10-06-2026 2213.ods"; 

    fetch(cheminFichierODS)
        .then(response => {
            if (!response.ok) throw new Error("Fichier .ods introuvable !");
            return response.arrayBuffer();
        })
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const feuille = workbook.Sheets[workbook.SheetNames[0]];
            const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

            // Objets pour stocker les données de nos 3 capteurs distincts
            const donneesCapteurs = {};
            const tousLesHorodatages = new Set(); // Pour synchroniser l'axe X (le temps)

            // On parcourt le tableau à partir de la ligne 1 (on saute les titres)
            for (let i = 1; i < donneesJson.length; i++) {
                const ligne = donneesJson[i];
                if (ligne && ligne[0] && ligne[1] && ligne[2] !== undefined) {
                    const idCapteur = ligne[0].toString().trim(); // Colonne A: S/N Capteur
                    const temps = ligne[1].toString().trim().split('T')[1]?.replace('Z', '') || ligne[1].toString(); // Colonne B: Heure
                    const valeurTemp = parseFloat(ligne[2]); // Colonne C: Valeur °C

                    // Si c'est la première fois qu'on croise ce capteur, on lui crée son espace
                    if (!donneesCapteurs[idCapteur]) {
                        donneesCapteurs[idCapteur] = {};
                    }

                    // On associe la température à cette heure précise pour ce capteur
                    donneesCapteurs[idCapteur][temps] = valeurTemp;
                    tousLesHorodatages.add(temps);
                }
            }

            // Trier les heures chronologiquement pour l'axe X
            const listeLabelsX = Array.from(tousLesHorodatages).sort();

            // Préparation des 3 datasets (courbes) pour Chart.js
            const listeIdsCapteurs = Object.keys(donneesCapteurs);
            
            // Couleurs personnalisées pour difféenser tes 3 capteurs (Style Dickson)
            const couleursCourbes = [
                { border: '#007BFF', bg: 'rgba(0, 123, 255, 0.05)' }, // Bleu
                { border: '#28a745', bg: 'rgba(40, 167, 69, 0.05)' },  // Vert
                { border: '#dc3545', bg: 'rgba(220, 53, 69, 0.05)' }   // Rouge
            ];

            const datasetsGraphique = listeIdsCapteurs.map((id, index) => {
                // Pour chaque heure de l'axe X, on récupère la température ou null si pas de donnée
                const dataPoints = listeLabelsX.map(temps => donneesCapteurs[id][temps] !== undefined ? donneesCapteurs[id][temps] : null);
                const couleur = couleursCourbes[index % couleursCourbes.length];

                return {
                    label: `Capteur ${id}`,
                    data: dataPoints,
                    borderColor: couleur.border,
                    backgroundColor: couleur.bg,
                    borderWidth: 2,
                    fill: false,        // Pas de gros remplissage opaque pour ne pas cacher les lignes du dessous
                    tension: 0.3,       // Courbe fluide et lissée comme sur ton image d'exemple
                    pointRadius: 0,     // Masque les ronds sur la ligne pour un effet épuré et pro
                    spanGaps: true      // Relie les points même s'il manque une mesure
                };
            });

            // Tracer le graphique final multi-courbes
            genererGraphiqueTriCapteurs(listeLabelsX, datasetsGraphique);
        })
        .catch(error => console.error("Erreur de traitement ODS :", error));
});

function genererGraphiqueTriCapteurs(labelsX, datasetsFournis) {
    const canvas = document.getElementById('graphiqueTemperatures');
    if (!canvas) return;

    if (monGraphiqueInstance) monGraphiqueInstance.destroy();

    const ctx = canvas.getContext('2d');

    monGraphiqueInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsX,
            datasets: datasetsFournis
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permet au graphique de bien prendre toute la place
            interaction: {
                mode: 'index',
                intersect: false // Affiche les valeurs des 3 capteurs en même temps au survol de la souris
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12, weight: 'bold' } }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Température (°C)', font: { weight: 'bold' } },
                    grid: { color: 'rgba(0, 0, 0, 0.08)' }
                },
                x: {
                    title: { display: true, text: 'Horodatage (UTC)', font: { weight: 'bold' } },
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 12 // Limite le nombre d'heures affichées en bas pour éviter que ça se chevauche
                    }
                }
            }
        }
    });
}