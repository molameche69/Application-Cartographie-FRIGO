document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('fond-etoile');
    
    if (!canvas) {
        console.error("Le canvas avec l'ID 'fond-etoile' est introuvable dans le HTML.");
        return;
    }
    
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const nombreDePoints = 100;
    const points = [];

    for (let i = 0; i < nombreDePoints; i++) {
        points.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vitesseX: (Math.random() - 0.5) * 1,
            vitesseY: (Math.random() - 0.5) * 1,
            taille: Math.random() * 2 + 1
        });
    }

    function animer() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
            ctx.fill();

            p.x += p.vitesseX;
            p.y += p.vitesseY;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        });

        requestAnimationFrame(animer);
    }

    animer();
});