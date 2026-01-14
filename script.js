const canvas = document.getElementById('pizzaCanvas');
const ctx = canvas.getContext('2d');
const slicesInput = document.getElementById('slices');
const sliceValueDisplay = document.getElementById('sliceValue');
const cutCountDisplay = document.getElementById('cutCount');
const typeButtons = document.querySelectorAll('.type-btn');
const cutter = document.getElementById('cutter');
const cutBtn = document.getElementById('cutBtn');

// Canvas hors écran pour générer la texture globale une seule fois
const textureCanvas = document.createElement('canvas');
const textureCtx = textureCanvas.getContext('2d');
let currentTextureType = '';

// Configuration
const types = {
    pizza: {
        generator: generatePizzaTexture,
        shadow: '#ff5e62',
        crumbColors: ['#d68a45', '#8b4513', '#b92b27'],
        crumbDensity: 1,
        crumbSize: 2
    },
    galette: {
        generator: generateGaletteTexture,
        shadow: '#d4af37',
        crumbColors: ['#d4af37', '#f5cba7', '#8b4513', '#ffd700'],
        crumbDensity: 3, // Un peu plus dense pour compenser la petite taille
        crumbSize: 1.2 // Beaucoup plus fin (était à 3)
    },
    tarte: {
        generator: generateTarteTexture,
        shadow: '#ff0040',
        crumbColors: ['#e59866', '#d35400', '#fef9e7'],
        crumbDensity: 1.2,
        crumbSize: 1.5
    }
};

let currentType = 'pizza';
let isCut = false;
let isAnimating = false;
let crumbs = [];

function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = containerWidth * dpr;
    canvas.height = containerWidth * dpr;
    
    textureCanvas.width = canvas.width;
    textureCanvas.height = canvas.height;
    
    ctx.scale(dpr, dpr);
    
    currentTextureType = ''; 
    draw();
}

function draw() {
    const slices = parseInt(slicesInput.value);
    const config = types[currentType];
    
    const size = canvas.width / (window.devicePixelRatio || 1);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 30;

    if (currentTextureType !== currentType) {
        textureCtx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
        textureCtx.save();
        textureCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        config.generator(textureCtx, centerX, centerY, radius);
        textureCtx.restore();
        currentTextureType = currentType;
    }

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.shadowColor = config.shadow;
    ctx.shadowBlur = 40;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.restore();

    drawCrumbs();

    const angleStep = (2 * Math.PI) / slices;
    const explosionOffset = isCut ? 25 : 0;

    for (let i = 0; i < slices; i++) {
        const startAngle = i * angleStep - Math.PI / 2;
        const endAngle = (i + 1) * angleStep - Math.PI / 2;
        const midAngle = startAngle + (endAngle - startAngle) / 2;

        const offsetX = Math.cos(midAngle) * explosionOffset;
        const offsetY = Math.sin(midAngle) * explosionOffset;

        ctx.save();
        
        if (isCut) {
            ctx.translate(offsetX, offsetY);
        }

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(textureCanvas, 0, 0, size, size);

        if (isCut) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.stroke();
        }

        ctx.restore();
    }

    if (!isCut) {
        drawCutGuides(centerX, centerY, radius, slices);
    }
}

function drawCrumbs() {
    crumbs.forEach(crumb => {
        ctx.save();
        ctx.translate(crumb.x, crumb.y);
        ctx.rotate(crumb.angle);
        ctx.fillStyle = crumb.color;
        
        if (currentType === 'galette') {
            ctx.beginPath();
            ctx.moveTo(0, -crumb.size);
            ctx.lineTo(crumb.size, crumb.size);
            ctx.lineTo(-crumb.size, crumb.size);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, crumb.size, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    });
}

function spawnCrumbs(x, y) {
    const config = types[currentType];
    const count = Math.floor(Math.random() * 3 * config.crumbDensity) + 1;
    
    for(let i=0; i<count; i++) {
        crumbs.push({
            x: x + (Math.random() - 0.5) * 15,
            y: y + (Math.random() - 0.5) * 15,
            size: (Math.random() * 1.5 + 0.5) * config.crumbSize,
            color: config.crumbColors[Math.floor(Math.random() * config.crumbColors.length)],
            angle: Math.random() * Math.PI * 2
        });
    }
}

function drawCutGuides(cx, cy, r, slices) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;

    const angleStep = (2 * Math.PI) / slices;
    const isEven = slices % 2 === 0;
    const cuts = isEven ? slices / 2 : slices;

    for (let i = 0; i < cuts; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        if (isEven) {
            const x1 = cx + Math.cos(angle) * (r + 10);
            const y1 = cy + Math.sin(angle) * (r + 10);
            const x2 = cx + Math.cos(angle + Math.PI) * (r + 10);
            const y2 = cy + Math.sin(angle + Math.PI) * (r + 10);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        } else {
            const x = cx + Math.cos(angle) * (r + 10);
            const y = cy + Math.sin(angle) * (r + 10);
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// --- GÉNÉRATEURS DE TEXTURE ---
function generatePizzaTexture(ctx, cx, cy, r) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = '#d68a45'; ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const wobble = Math.sin(angle * 10) * 5;
        const rad = r - 15 + wobble;
        ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
    }
    ctx.fillStyle = '#b92b27'; ctx.fill();
    ctx.fillStyle = '#ffecb3';
    for (let i = 0; i < 15; i++) {
        const fr = Math.random() * (r * 0.7);
        const fa = Math.random() * Math.PI * 2;
        const fx = cx + Math.cos(fa) * fr;
        const fy = cy + Math.sin(fa) * fr;
        const fSize = 30 + Math.random() * 40;
        ctx.beginPath(); ctx.arc(fx, fy, fSize, 0, Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(211, 84, 0, 0.3)';
    for (let i = 0; i < 50; i++) {
        const gx = cx + (Math.random() - 0.5) * 2 * (r - 20);
        const gy = cy + (Math.random() - 0.5) * 2 * (r - 20);
        if (Math.hypot(gx-cx, gy-cy) < r - 20) {
            ctx.beginPath(); ctx.arc(gx, gy, 2 + Math.random()*4, 0, Math.PI*2); ctx.fill();
        }
    }
    const pepCount = 18;
    for (let i = 0; i < pepCount; i++) {
        const pDist = Math.sqrt(Math.random()) * (r - 40);
        const pAng = Math.random() * Math.PI * 2;
        const px = cx + Math.cos(pAng) * pDist;
        const py = cy + Math.sin(pAng) * pDist;
        const pSize = r * 0.12;
        ctx.beginPath(); ctx.arc(px+2, py+2, pSize, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI*2); ctx.fillStyle = '#a93226'; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(px - pSize*0.3, py - pSize*0.3, pSize*0.5, 0, Math.PI*2); ctx.fill();
    }
    const basilCount = 8;
    for (let i = 0; i < basilCount; i++) {
        const bDist = Math.random() * (r - 50);
        const bAng = Math.random() * Math.PI * 2;
        const bx = cx + Math.cos(bAng) * bDist;
        const by = cy + Math.sin(bAng) * bDist;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.random() * Math.PI);
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI*2); ctx.fillStyle = '#2ecc71'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
}

function generateGaletteTexture(ctx, cx, cy, r) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#f5cba7'); grad.addColorStop(0.8, '#d35400'); grad.addColorStop(1, '#a04000');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<500; i++) {
        const x = cx + (Math.random()-0.5)*2*r;
        const y = cy + (Math.random()-0.5)*2*r;
        if (Math.hypot(x-cx, y-cy) < r) ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(120, 40, 0, 0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const curves = 24;
    for (let i = 0; i < curves; i++) {
        const angleStart = (i / curves) * Math.PI * 2;
        const angleEnd = angleStart + 0.5;
        const x1 = cx + Math.cos(angleStart) * 10; const y1 = cy + Math.sin(angleStart) * 10;
        const x2 = cx + Math.cos(angleEnd) * (r - 10); const y2 = cy + Math.sin(angleEnd) * (r - 10);
        const cpX = cx + Math.cos(angleStart + 0.2) * (r * 0.5); const cpY = cy + Math.sin(angleStart + 0.2) * (r * 0.5);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cpX, cpY, x2, y2); ctx.stroke();
    }
    const shine = ctx.createRadialGradient(cx-r*0.3, cy-r*0.3, 10, cx, cy, r);
    shine.addColorStop(0, 'rgba(255,255,255,0.3)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
}

function generateTarteTexture(ctx, cx, cy, r) {
    ctx.fillStyle = '#e59866'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fef9e7'; ctx.beginPath(); ctx.arc(cx, cy, r - 10, 0, Math.PI*2); ctx.fill();
    let currentR = 0; let angle = 0; const strawberrySize = 22;
    while (currentR < r - 20) {
        const x = cx + Math.cos(angle) * currentR; const y = cy + Math.sin(angle) * currentR;
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI/2);
        ctx.beginPath(); ctx.moveTo(0, -strawberrySize/2);
        ctx.bezierCurveTo(strawberrySize/2, -strawberrySize/2, strawberrySize/2, strawberrySize/2, 0, strawberrySize/2);
        ctx.bezierCurveTo(-strawberrySize/2, strawberrySize/2, -strawberrySize/2, -strawberrySize/2, 0, -strawberrySize/2);
        const fGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, strawberrySize/2);
        fGrad.addColorStop(0, '#e74c3c'); fGrad.addColorStop(1, '#922b21'); ctx.fillStyle = fGrad; ctx.fill();
        ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(3, 3, 1, 0, Math.PI*2); ctx.arc(-3, -2, 1, 0, Math.PI*2); ctx.arc(0, 6, 1, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        const circumference = 2 * Math.PI * currentR; const step = (strawberrySize * 1.1) / (circumference || 1);
        angle += Math.max(0.2, step); currentR += (strawberrySize * 0.8) * (step / (Math.PI*2)); if (currentR < strawberrySize) currentR += 0.5;
    }
    ctx.fillStyle = 'rgba(255, 200, 200, 0.15)'; ctx.beginPath(); ctx.arc(cx, cy, r - 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.beginPath(); ctx.ellipse(cx - r*0.4, cy - r*0.4, 30, 15, Math.PI/4, 0, Math.PI*2); ctx.fill();
}

// --- Animation & Events ---

function updateCutInfo() {
    const slices = parseInt(slicesInput.value);
    const isEven = slices % 2 === 0;
    const cuts = isEven ? slices / 2 : slices;
    
    sliceValueDisplay.textContent = slices;
    cutCountDisplay.textContent = cuts;
    
    if (isCut) {
        isCut = false;
        crumbs = [];
        cutBtn.textContent = "COUPER MAINTENANT";
        cutBtn.classList.remove('reset');
    }
    draw();
}

async function performCutAnimation() {
    if (isAnimating) return;
    
    if (isCut) {
        isCut = false;
        crumbs = [];
        cutBtn.textContent = "COUPER MAINTENANT";
        cutBtn.classList.remove('reset');
        draw();
        return;
    }

    isAnimating = true;
    const slices = parseInt(slicesInput.value);
    const isEven = slices % 2 === 0;
    const cuts = isEven ? slices / 2 : slices;
    const angleStep = (2 * Math.PI) / slices;
    
    const size = canvas.width / (window.devicePixelRatio || 1);

    cutter.classList.add('active');

    for (let i = 0; i < cuts; i++) {
        const angle = i * angleStep - Math.PI / 2;
        
        let startX, startY, endX, endY, duration;

        if (isEven) {
            startX = 50 + (Math.cos(angle) * 45);
            startY = 50 + (Math.sin(angle) * 45);
            endX = 50 + (Math.cos(angle + Math.PI) * 45);
            endY = 50 + (Math.sin(angle + Math.PI) * 45);
            duration = 400;
        } else {
            startX = 50;
            startY = 50;
            endX = 50 + (Math.cos(angle) * 45);
            endY = 50 + (Math.sin(angle) * 45);
            duration = 300;
        }

        const moveAngle = Math.atan2(endY - startY, endX - startX);
        const rotationDeg = moveAngle * (180 / Math.PI);
        
        cutter.style.transform = `translate(-50%, -50%) rotate(${rotationDeg}deg)`;

        cutter.style.transition = 'none';
        cutter.style.left = `${startX}%`;
        cutter.style.top = `${startY}%`;
        
        await new Promise(r => setTimeout(r, 50));

        cutter.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
        cutter.style.left = `${endX}%`;
        cutter.style.top = `${endY}%`;

        const startTime = Date.now();
        const crumbInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                clearInterval(crumbInterval);
                return;
            }
            const progress = elapsed / duration;
            const currentPctX = startX + (endX - startX) * progress;
            const currentPctY = startY + (endY - startY) * progress;
            const pixelX = (currentPctX / 100) * size;
            const pixelY = (currentPctY / 100) * size;
            
            spawnCrumbs(pixelX, pixelY);
            draw();
        }, 30);
        
        await new Promise(r => setTimeout(r, duration));
        clearInterval(crumbInterval);
    }

    cutter.classList.remove('active');
    isAnimating = false;
    isCut = true;
    
    cutBtn.textContent = "RÉINITIALISER";
    cutBtn.classList.add('reset');
    
    draw();
}

slicesInput.addEventListener('input', updateCutInfo);

typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        
        isCut = false;
        crumbs = [];
        cutBtn.textContent = "COUPER MAINTENANT";
        cutBtn.classList.remove('reset');
        
        draw();
    });
});

cutBtn.addEventListener('click', performCutAnimation);
window.addEventListener('resize', resizeCanvas);

// Init
updateCutInfo();
resizeCanvas();