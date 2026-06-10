// ==========================================================
// 1. CHARGEMENT ET RECONSTRUCTION DE LA CARTE AU CHARGEMENT
// ==========================================================
window.onload = function() {
    const nomStocke = localStorage.getItem('monNom');
    const messageStocke = localStorage.getItem('monMessage');
    const sondesStockees = localStorage.getItem('positionsSondes'); // Récupère le tableau des positions

    if (nomStocke && messageStocke) {
        document.getElementById('afficherNom').innerText = nomStocke;
        document.getElementById('afficherMessage').innerText = messageStocke;
        
        // Reconstruction des sondes sur la page rapport
        if (sondesStockees) {
            const listeSondes = JSON.parse(sondesStockees);
            const carteRapport = document.getElementById('carte-rapport');

            listeSondes.forEach(sonde => {
                const nouvelleSonde = document.createElement('img');
                nouvelleSonde.src = sonde.src;
                nouvelleSonde.style.position = 'absolute';
                nouvelleSonde.style.left = sonde.left;
                nouvelleSonde.style.top = sonde.top;
                nouvelleSonde.style.width = '35px';  // Ajuste la taille des sondes sur le rapport si besoin
                nouvelleSonde.style.height = '35px';
                nouvelleSonde.style.transform = 'translate(-50%, -50%)';
                
                carteRapport.appendChild(nouvelleSonde);
            });
        }
    } else {
        document.getElementById('afficherNom').innerText = "Aucune donnée";
        document.getElementById('afficherMessage').innerText = "Aucune donnée";
    }
};

// ==========================================================
// 2. GÉNÉRATION DU PDF VIA LA ZONE CACHÉE
// ==========================================================
function telechargerPDFDirect() {
    const fondEtoile = document.getElementById('fond-etoile');
    if (fondEtoile) fondEtoile.style.display = 'none';

    const nom = localStorage.getItem('monNom') || "Aucun nom";
    const message = localStorage.getItem('monMessage') || "Aucun message";
    const sondesStockees = localStorage.getItem('positionsSondes');
    const dateJour = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Injection des textes
    document.getElementById('pdf-nom').innerText = nom;
    document.getElementById('pdf-date').innerText = dateJour;
    document.getElementById('pdf-message').innerHTML = message.replace(/\n/g, '<br>');

    // Injection de la carte reconstruite dans le PDF (si pas déjà fait)
    let pdfBody = document.querySelector('.pdf-body');
    let cartePdfExistante = document.getElementById('pdf-carte-reconstruite');
    
    if (pdfBody && !cartePdfExistante) {
        const conteneurCartePdf = document.createElement('div');
        conteneurCartePdf.id = "pdf-carte-reconstruite";
        conteneurCartePdf.style.position = "relative";
        conteneurCartePdf.style.marginTop = "20px";
        conteneurCartePdf.style.width = "100%";
        conteneurCartePdf.style.maxWidth = "500px";
        
        // Image de fond pour le PDF
        conteneurCartePdf.innerHTML = `<img src="images/MAP frigo.png" style="width: 100%; height: auto; display: block;">`;
        
        // On remet les sondes à l'intérieur de la carte du PDF
        if (sondesStockees) {
            const listeSondes = JSON.parse(sondesStockees);
            listeSondes.forEach(sonde => {
                const sondePdf = document.createElement('img');
                sondePdf.src = sonde.src;
                sondePdf.style.position = 'absolute';
                sondePdf.style.left = sonde.left;
                sondePdf.style.top = sonde.top;
                sondePdf.style.width = '30px';
                sondePdf.style.height = '30px';
                sondePdf.style.transform = 'translate(-50%, -50%)';
                conteneurCartePdf.appendChild(sondePdf);
            });
        }
        
        pdfBody.appendChild(conteneurCartePdf);
    }

    const elementHTML = document.querySelector('.pdf-box');

    const options = {
        margin:       15,
        filename:     'rapport_final.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(options).from(elementHTML).save().then(() => {
        if (fondEtoile) fondEtoile.style.display = 'block';
    }).catch(err => {
        console.error(err);
        if (fondEtoile) fondEtoile.style.display = 'block';
    });
}

// ==========================================================
// CHARGEMENT ET RECONSTRUCTION GRAPHIQUE SUR LA PAGE RAPPORT
// ==========================================================
window.onload = function() {
    const nomStocke = localStorage.getItem('monNom');
    const messageStocke = localStorage.getItem('monMessage');
    const sondesStockees = localStorage.getItem('positionsSondes'); // Récupère le texte JSON des positions

    if (nomStocke && messageStocke) {
        document.getElementById('afficherNom').innerText = nomStocke;
        document.getElementById('afficherMessage').innerText = messageStocke;
        
        // Reconstruction des sondes sur la carte du rapport
        if (sondesStockees) {
            const listeSondes = JSON.parse(sondesStockees); // Reconvertit le texte en tableau JavaScript
            const carteRapport = document.getElementById('carte-rapport');

            listeSondes.forEach(sonde => {
                const nouvelleSonde = document.createElement('img');
                nouvelleSonde.src = sonde.src;
                nouvelleSonde.style.position = 'absolute';
                nouvelleSonde.style.left = sonde.left;
                nouvelleSonde.style.top = sonde.top;
                nouvelleSonde.style.width = '40px';  // Applique la taille exacte de la pastille
                nouvelleSonde.style.height = '40px';
                nouvelleSonde.style.transform = 'translate(-50%, -50%)'; // Centre la pastille sur ses coordonnées
                
                carteRapport.appendChild(nouvelleSonde);
            });
        }
    } else {
        document.getElementById('afficherNom').innerText = "Aucune donnée";
        document.getElementById('afficherMessage').innerText = "Aucune donnée";
    }
};

// ==========================================================
// GÉNÉRATION DU PDF (AVEC INTEGRATION DE LA CARTOGRAPHIE)
// ==========================================================
function telechargerPDFDirect() {
    const fondEtoile = document.getElementById('fond-etoile');
    if (fondEtoile) fondEtoile.style.display = 'none';

    const nom = localStorage.getItem('monNom') || "Aucun nom";
    const message = localStorage.getItem('monMessage') || "Aucun message";
    const sondesStockees = localStorage.getItem('positionsSondes');
    const dateJour = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Injection des textes dans le bloc PDF caché
    document.getElementById('pdf-nom').innerText = nom;
    document.getElementById('pdf-date').innerText = dateJour;
    document.getElementById('pdf-message').innerHTML = message.replace(/\n/g, '<br>');

    // Création et injection de la carte dans la boîte PDF
    let pdfBody = document.querySelector('.pdf-body');
    let cartePdfExistante = document.getElementById('pdf-carte-reconstruite');
    
    if (pdfBody && !cartePdfExistante) {
        const conteneurCartePdf = document.createElement('div');
        conteneurCartePdf.id = "pdf-carte-reconstruite";
        conteneurCartePdf.style.position = "relative";
        conteneurCartePdf.style.marginTop = "25px";
        conteneurCartePdf.style.width = "450px";  // Légèrement plus petit pour bien rentrer dans la page A4 du PDF
        conteneurCartePdf.style.height = "337px";
        conteneurCartePdf.style.border = "1px solid #ccc";
        
        // Image de fond du cube pour le PDF
        conteneurCartePdf.innerHTML = `<img src="images/MAP frigo.png" style="width: 100%; height: 100%; object-fit: contain;">`;
        
        // Ajout des sondes aux mêmes coordonnées à l'intérieur du PDF
        if (sondesStockees) {
            const listeSondes = JSON.parse(sondesStockees);
            listeSondes.forEach(sonde => {
                const sondePdf = document.createElement('img');
                sondePdf.src = sonde.src;
                sondePdf.style.position = 'absolute';
                sondePdf.style.left = sonde.left;
                sondePdf.style.top = sonde.top;
                sondePdf.style.width = '30px'; // Légèrement plus petit pour correspondre à la taille réduite de la carte PDF
                sondePdf.style.height = '30px';
                sondePdf.style.transform = 'translate(-50%, -50%)';
                conteneurCartePdf.appendChild(sondePdf);
            });
        }
        
        pdfBody.appendChild(conteneurCartePdf);
    }

    const elementHTML = document.querySelector('.pdf-box');

    const options = {
        margin:       15,
        filename:     'rapport_final.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(options).from(elementHTML).save().then(() => {
        if (fondEtoile) fondEtoile.style.display = 'block';
    }).catch(err => {
        console.error(err);
        if (fondEtoile) fondEtoile.style.display = 'block';
    });
}