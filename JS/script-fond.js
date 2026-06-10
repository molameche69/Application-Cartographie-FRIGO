document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('fond-etoile');
    
    if (!canvas) {
        console.error("Le canvas avec l'ID 'fond-etoile' est introuvable dans le HTML.");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const nombreDePoints = 120; // Nombre de points blancs
    let points = [];

    // FONCTION MAGIQUE : Calcule la taille ET replace les points si l'écran s'agrandit
    function genererPoints() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        points = []; // On vide l'ancien tableau
        for (let i = 0; i < nombreDePoints; i++) {
            points.push({
                x: Math.random() * canvas.width,  // Réparti sur la VRAIE nouvelle largeur
                y: Math.random() * canvas.height, // Réparti sur la VRAIE nouvelle hauteur
                vitesseX: (Math.random() - 0.5) * 1,
                vitesseY: (Math.random() - 0.5) * 1,
                taille: Math.random() * 2 + 1
            });
        }
    }

    // On génère les points au premier chargement
    genererPoints();

    // Si l'utilisateur zoome ou dézoome, on regénère TOUT instantanément pour occuper tout l'espace
    window.addEventListener('resize', genererPoints);

    // Boucle d'animation
    function animer() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
            ctx.fill();

            // Déplacement
            p.x += p.vitesseX;
            p.y += p.vitesseY;

            // Gestion des bords de l'écran (si un point sort, il revient de l'autre côté)
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        });

        requestAnimationFrame(animer);
    }

    animer();
});