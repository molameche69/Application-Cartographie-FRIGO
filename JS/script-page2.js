

let monGraphiqueInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    
    const cheminFichierODS = "Relevés - 10-06-2026 2213.ods";

    console.log("Tentative de chargement automatique du fichier :", cheminFichierODS);

    fetch(cheminFichierODS)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Impossible de trouver le fichier "${cheminFichierODS}". Vérifie son nom et son emplacement.`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const feuille = workbook.Sheets[workbook.SheetNames[0]];
            
           
            const donneesJson = XLSX.utils.sheet_to_json(feuille, { header: 1 });

            console.log("Fichier ODS lu avec succès ! Nombre de lignes détectées :", donneesJson.length);

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

                    // 1. Organisation des données pour le graphique multi-courbes
                    if (!donneesCapteurs[idCapteur]) {
                        donneesCapteurs[idCapteur] = {};
                    }
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
            if (corpsTableau) {
                corpsTableau.innerHTML = htmlLignes || '<tr><td colspan="4" style="text-align: center;">Aucune donnée valide trouvée.</td></tr>';
            }

           
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
            console.error("Erreur critique :", error);
           
            const corpsTableau = document.getElementById('corpsTableauODS');
            if (corpsTableau) {
                corpsTableau.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #dc3545; font-weight: bold; padding: 25px;">
                            ⚠️ Erreur : ${error.message}<br>
                            <span style="font-size: 12px; font-weight: normal; color: #666; display:block; margin-top: 10px;">
                                Conseil : Si l'adresse de ta page commence par "file:///", c'est normal que ça bloque. <br>
                                Tu dois lancer ton projet sur VS Code avec le bouton <strong>"Go Live"</strong> (extension Live Server).
                            </span>
                        </td>
                    </tr>`;
            }
        });
    
    
    if(document.getElementById('afficherNom')) {
        document.getElementById('afficherNom').textContent = localStorage.getItem('nomUtilisateur') || 'Inconnu';
    }
    if(document.getElementById('afficherMessage')) {
        document.getElementById('afficherMessage').textContent = localStorage.getItem('messageUtilisateur') || 'Aucun message';
    }
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
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12, weight: 'bold' } } }
            },
            scales: {
                y: { title: { display: true, text: 'Température (°C)', font: { weight: 'bold' } }, grid: { color: 'rgba(0, 0, 0, 0.06)' } },
                x: { title: { display: true, text: 'Horodatage (UTC)', font: { weight: 'bold' } }, grid: { display: false }, ticks: { maxTicksLimit: 12 } }
            }
        }
    });
}

function telechargerPDFDirect() {
    
    const fondEtoile = document.getElementById('fond-etoile');
    if (fondEtoile) fondEtoile.style.display = 'none';

    const nom = localStorage.getItem('monNom') || "s";
    const message = localStorage.getItem('monMessage') || "s";
    const sondesStockees = localStorage.getItem('positionsSondes');
    const dateJour = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

   
    const elementImpression = document.createElement('div');
    elementImpression.style.fontFamily = 'Arial, sans-serif';
    elementImpression.style.padding = '10px';
    elementImpression.style.background = '#FFFFFF';
    elementImpression.style.color = '#000000';
    elementImpression.style.margin = '0px';

    
    let contenuHtml = `
        <div style="border-bottom: 2px solid #007bff; padding-bottom: 5px; margin-bottom: 15px;">
            <h1 style="font-size: 20px; color: #007bff; margin: 0; padding: 0;">Rapport Officiel d'Analyse</h1>
            <p style="font-size: 11px; color: #666; margin: 3px 0 0 0;">Généré le : ${dateJour}</p>
        </div>

        <div style="margin-bottom: 15px; font-size: 13px;">
            <p style="margin: 3px 0;"><strong>Nom de l'utilisateur :</strong> ${nom}</p>
            <p style="margin: 3px 0;"><strong>Message transmis :</strong></p>
            <div style="background: #f8f9fa; padding: 8px; border-left: 3px solid #007bff; font-style: italic; margin-top: 3px; color: #333;">
                ${message.replace(/\n/g, '<br>')}
            </div>
        </div>

        <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 8px;">📍 Positionnement des sondes</h3>
        <div id="carte-pdf-temp" style="position: relative; width: 360px; height: 270px; border: 1px solid #ccc; margin-bottom: 15px; background: #fff; border-radius: 6px;">
            <img src="images/MAP frigo.png" style="width: 100%; height: 100%; object-fit: contain; display: block;">
        </div>
    `;

   
    const canvasOrigine = document.getElementById('graphiqueTemperatures');
    if (monGraphiqueInstance && canvasOrigine) {
        contenuHtml += `
            <h3 style="font-size: 14px; color: #007bff; margin-top: 15px; margin-bottom: 8px;">📈 Graphique des Températures</h3>
            <div id="graphique-pdf-temp" style="width: 100%; text-align: center;"></div>
        `;
    }

    elementImpression.innerHTML = contenuHtml;

    
    const conteneurCarte = elementImpression.querySelector('#carte-pdf-temp');
    if (sondesStockees && conteneurCarte) {
        const listSondes = JSON.parse(sondesStockees);
        listSondes.forEach(sonde => {
            const sondePdf = document.createElement('img');
            sondePdf.src = sonde.src;
            sondePdf.style.position = 'absolute';
            sondePdf.style.left = sonde.left;
            sondePdf.style.top = sonde.top;
            sondePdf.style.width = '30px'; 
            sondePdf.style.height = '30px';
            sondePdf.style.transform = 'translate(-50%, -50%)';
            conteneurCarte.appendChild(sondePdf);
        });
    } else {
       
        const positionsDemo = [
            {left: '58%', top: '42%'}, {left: '37%', top: '65%'}, {left: '42%', top: '23%'}
        ];
        positionsDemo.forEach(pos => {
            const pin = document.createElement('div');
            pin.style.position = 'absolute';
            pin.style.left = pos.left;
            pin.style.top = pos.top;
            pin.style.width = '10px';
            pin.style.height = '10px';
            pin.style.background = 'red';
            pin.style.borderRadius = '50%';
            pin.style.transform = 'translate(-50%, -50%)';
            conteneurCarte.appendChild(pin);
        });
    }

    
    if (monGraphiqueInstance && canvasOrigine) {
        const conteneurGraphiquePdf = elementImpression.querySelector('#graphique-pdf-temp');
        if (conteneurGraphiquePdf) {
            const imageGraphique = document.createElement('img');
            imageGraphique.src = canvasOrigine.toDataURL('image/png');
            imageGraphique.style.width = '100%';
            imageGraphique.style.maxHeight = '220px';
            imageGraphique.style.objectFit = 'contain';
            conteneurGraphiquePdf.appendChild(imageGraphique);
        }
    }


    const options = {
        margin:       [10, 15, 10, 15], 
        filename:     'rapport_final.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: 'avoid-all' } 
    };

   
    html2pdf().set(options).from(elementImpression).save().then(() => {
        if (fondEtoile) fondEtoile.style.display = 'block';
    }).catch(err => {
        console.error(err);
        if (fondEtoile) fondEtoile.style.display = 'block';
    });
}