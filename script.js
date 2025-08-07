const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const levelInfo = document.getElementById("levelInfo");
const message = document.getElementById("message");
const controlModeSelect = document.getElementById("controlMode");
const touchControlsDiv = document.getElementById('touchControls');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');
const popupVictory = document.getElementById('popupVictory');
const victoryTotal = document.getElementById('victoryTotal');
const restartBtn = document.getElementById('restartBtn');
const victoryCount = document.getElementById('victoryCount');

// Paramètres
const GRAVITY = 0.85;
const JUMP_POWER = -14;
const MOVE_ACC = 1.05;
const MOVE_DEC = 0.87;
const MAX_SPEED = 7.5;
const BALL_INIT_X = 70;
const BALL_INIT_Y = 0;

let keys = {};
let controlMode = controlModeSelect.value;
let victory = 0;

// Détection mobile
function isMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth < 900;
}
if (isMobile()) {
    touchControlsDiv.style.display = 'flex';
}

// Plateformes : plus de sol continu, parcours obligatoire
const levels = [
    // Niveau 1 : simple escalier
    {
        platforms: [
            { x: 50,  y: 480, width: 110, height: 15 },
            { x: 200, y: 420, width: 100, height: 15 },
            { x: 340, y: 360, width: 120, height: 15 },
            { x: 530, y: 300, width: 110, height: 15 },
            { x: 700, y: 240, width: 110, height: 15 }
        ],
        holes: [
            { x: 0, y: 540, width: 900 }
        ],
        obstacles: []
    },
    // Niveau 2 : plateformes espacées, saut obligatoire
    {
        platforms: [
            { x: 80,  y: 460, width: 90, height: 13 },
            { x: 250, y: 400, width: 80, height: 13 },
            { x: 400, y: 350, width: 80, height: 12 },
            { x: 560, y: 300, width: 80, height: 13 },
            { x: 700, y: 240, width: 110, height: 13 }
        ],
        holes: [
            { x: 0, y: 540, width: 900 }
        ],
        obstacles: [
            { x: 330, y: 397, radius: 9 }
        ]
    },
    // Niveau 3 : plateformes petites, obstacles, piège ajusté (plus facile, obstacles plus petits)
    {
        platforms: [
            { x: 75,  y: 480, width: 55, height: 10 },
            { x: 160, y: 420, width: 60, height: 10 },
            { x: 300, y: 370, width: 70, height: 10 },
            { x: 490, y: 320, width: 60, height: 10 },
            { x: 650, y: 270, width: 80, height: 11 },
            { x: 780, y: 220, width: 70, height: 11 }
        ],
        holes: [
            { x: 0, y: 540, width: 900 }
        ],
        obstacles: [
            { x: 335, y: 367, radius: 8 },
            { x: 420, y: 345, radius: 9 }
        ]
    },
    // Niveau 4 : plateformes très espacées, plusieurs obstacles
    {
        platforms: [
            { x: 70,  y: 470, width: 50, height: 9 },
            { x: 200, y: 410, width: 50, height: 9 },
            { x: 370, y: 350, width: 50, height: 9 },
            { x: 540, y: 290, width: 55, height: 9 },
            { x: 700, y: 240, width: 60, height: 10 }
        ],
        holes: [
            { x: 0, y: 540, width: 900 }
        ],
        obstacles: [
            { x: 250, y: 405, radius: 9 },
            { x: 420, y: 345, radius: 8 },
            { x: 600, y: 285, radius: 10 }
        ]
    },
    // Niveau 5 : plateformes minuscules, pièges et récompense
    {
        platforms: [
            { x: 60,  y: 480, width: 38, height: 8 },
            { x: 170, y: 420, width: 36, height: 8 },
            { x: 290, y: 370, width: 38, height: 8 },
            { x: 430, y: 320, width: 36, height: 8 },
            { x: 570, y: 270, width: 38, height: 8 },
            { x: 730, y: 220, width: 40, height: 8 },
            { x: 850, y: 180, width: 30, height: 8 }
        ],
        holes: [
            { x: 0, y: 540, width: 900 }
        ],
        obstacles: [
            { x: 220, y: 414, radius: 7 },
            { x: 360, y: 365, radius: 8 },
            { x: 510, y: 312, radius: 8 },
            { x: 665, y: 265, radius: 7 },
            { x: 810, y: 213, radius: 7 }
        ],
        reward: { x: 865, y: 155 }
    }
];

let currentLevel = 0;
let lastLevel = levels.length - 1;
let isLevelComplete = false;
let showWinAnim = false;
let respawnBlink = 0;

const boule = {
    x: BALL_INIT_X,
    y: BALL_INIT_Y,
    radius: 14, // Boule du joueur plus petite !
    color: "#d01b1b",
    dx: 0,
    dy: 0,
    grounded: false,
    jumpAnim: 0
};

// ----------- INPUT -----------
// Supporte ZQSD (fr), WASD (en), AQSD (bépo)
function isLeftPressed() {
    return keys["KeyQ"] || keys["KeyA"] || keys["ArrowLeft"];
}
function isRightPressed() {
    return keys["KeyD"] || keys["KeyE"] || keys["ArrowRight"];
}
function isJumpPressed() {
    return keys["KeyZ"] || keys["KeyW"] || keys["KeyComma"] || keys["Space"] || keys["ArrowUp"];
}

document.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    // Saut accepté sur Z/W/,/Espace/FlècheHaut selon config
    if (!isLevelComplete && boule.grounded && (
        (controlMode === "zqsd" && isJumpPressed()) ||
        (controlMode === "arrows" && (e.code === "ArrowUp" || e.code === "Space"))
    )) {
        boule.dy = JUMP_POWER;
        boule.grounded = false;
        boule.jumpAnim = 7;
    }
    if (e.code === "KeyN") nextLevel();
});
document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
});

// Contrôles tactiles
if (leftBtn && rightBtn && jumpBtn) {
    leftBtn.addEventListener('touchstart', e => { keys['ArrowLeft'] = true; e.preventDefault(); });
    leftBtn.addEventListener('touchend', e => { keys['ArrowLeft'] = false; e.preventDefault(); });
    rightBtn.addEventListener('touchstart', e => { keys['ArrowRight'] = true; e.preventDefault(); });
    rightBtn.addEventListener('touchend', e => { keys['ArrowRight'] = false; e.preventDefault(); });
    jumpBtn.addEventListener('touchstart', e => { keys['Space'] = true; e.preventDefault(); });
    jumpBtn.addEventListener('touchend', e => { keys['Space'] = false; e.preventDefault(); });
}

// Sélecteur de contrôle
controlModeSelect.addEventListener("change", (e) => {
    controlMode = e.target.value;
    resetPlayer();
    message.textContent = '';
});

// Bouton suivant
nextLevelBtn.addEventListener("click", () => {
    if (isLevelComplete) nextLevel();
});

// Pop-up victoire
if (restartBtn) {
    restartBtn.addEventListener("click", () => {
        popupVictory.classList.add("hidden");
        restartGame();
    });
}

// ----------- LOGIQUE -----------

function resetPlayer() {
    boule.x = BALL_INIT_X;
    boule.y = BALL_INIT_Y;
    boule.dx = 0;
    boule.dy = 0;
    boule.grounded = false;
    boule.jumpAnim = 0;
    respawnBlink = 14;
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > lastLevel) {
        victory++;
        updateVictoryUI();
        showVictoryPopup();
        return;
    }
    isLevelComplete = false;
    showWinAnim = false;
    resetPlayer();
    nextLevelBtn.disabled = true;
}

function restartGame() {
    currentLevel = 0;
    isLevelComplete = false;
    showWinAnim = false;
    resetPlayer();
    nextLevelBtn.disabled = true;
    message.textContent = "Atteins la droite pour passer !";
    updateVictoryUI();
}

// ----------- COLLISIONS -----------

function checkCollision(boule, platform) {
    let closestX = Math.max(platform.x, Math.min(boule.x, platform.x + platform.width));
    let closestY = Math.max(platform.y, Math.min(boule.y, platform.y + platform.height));
    let distX = boule.x - closestX;
    let distY = boule.y - closestY;
    let distance = Math.sqrt(distX * distX + distY * distY);
    return distance < boule.radius;
}
function checkFallenInHole(boule, hole) {
    return (
        boule.y + boule.radius >= hole.y &&
        boule.x > hole.x &&
        boule.x < hole.x + hole.width
    );
}
function checkObstacleCollision(boule, obs) {
    let dx = boule.x - obs.x;
    let dy = boule.y - obs.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    return dist < (boule.radius + obs.radius - 1);
}

// ----------- AFFICHAGE -----------

function drawBoule() {
    if (respawnBlink && respawnBlink % 4 < 2) return;
    ctx.save();
    ctx.translate(boule.x, boule.y);
    let squash = 1, stretch = 1;
    if (boule.jumpAnim > 0) { squash = 1.15; stretch = 0.82; }
    ctx.scale(squash, stretch);
    ctx.beginPath();
    ctx.arc(0, 0, boule.radius, 0, Math.PI * 2);
    ctx.fillStyle = boule.color;
    ctx.shadowColor = "#a00";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.closePath();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(boule.x, boule.y + boule.radius + 5, boule.radius * 0.95, boule.radius * 0.36, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#283";
    ctx.fill();
    ctx.restore();
}
function drawPlatforms() {
    ctx.save();
    let plats = levels[currentLevel].platforms;
    plats.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = "#355aad";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.rect(p.x, p.y, p.width, p.height);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    });
    ctx.restore();
}
function drawHoles() {
    ctx.save();
    let holes = levels[currentLevel].holes;
    holes.forEach(h => {
        ctx.beginPath();
        ctx.rect(h.x, h.y, h.width, 22);
        ctx.fillStyle = "#111";
        ctx.globalAlpha = 0.80;
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;
    });
    ctx.restore();
}
function drawObstacles() {
    ctx.save();
    let obs = levels[currentLevel].obstacles;
    obs.forEach(o => {
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffeb3b";
        ctx.strokeStyle = "#aa0";
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#e30";
        ctx.fill();
        ctx.closePath();
    });
    ctx.restore();
}
function drawReward() {
    let reward = levels[currentLevel].reward;
    if (!reward) return;
    ctx.save();
    ctx.font = "38px Arial";
    ctx.globalAlpha = 1;
    ctx.fillText("🍭", reward.x, reward.y);
    ctx.restore();
}
function drawWinAnim() {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.font = "bold 47px Arial";
    ctx.fillStyle = "#ffe400";
    ctx.fillText("Niveau réussi !", canvas.width/2 - 170, canvas.height/2 - 10);
    ctx.restore();
}

// ----------- JEU -----------

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let left = false, right = false;
    if (isMobile()) {
        left = keys["ArrowLeft"];
        right = keys["ArrowRight"];
    } else if (controlMode === "zqsd") {
        left = isLeftPressed();
        right = isRightPressed();
    } else if (controlMode === "arrows") {
        left = keys["ArrowLeft"];
        right = keys["ArrowRight"];
    }
    if (!isLevelComplete) {
        if (left) boule.dx -= MOVE_ACC;
        if (right) boule.dx += MOVE_ACC;
    }
    boule.dx = Math.max(Math.min(boule.dx, MAX_SPEED), -MAX_SPEED);
    if ((!left && !right) || isLevelComplete) boule.dx *= MOVE_DEC;
    if (Math.abs(boule.dx) < 0.1) boule.dx = 0;

    boule.x += boule.dx;
    boule.dy += GRAVITY;
    boule.y += boule.dy;
    boule.grounded = false;

    let plats = levels[currentLevel].platforms;
    for (const platform of plats) {
        if (checkCollision(boule, platform)) {
            if (boule.dy > 0 && boule.y - boule.radius < platform.y) {
                boule.y = platform.y - boule.radius;
                boule.dy = 0;
                boule.grounded = true;
                boule.jumpAnim = 0;
            } else if (boule.dy < 0 && boule.y + boule.radius > platform.y + platform.height) {
                boule.y = platform.y + platform.height + boule.radius;
                boule.dy = 0;
            }
        }
    }

    if (boule.jumpAnim > 0) boule.jumpAnim--;
    if (respawnBlink > 0) respawnBlink--;

    let obs = levels[currentLevel].obstacles;
    for (const o of obs) {
        if (checkObstacleCollision(boule, o)) {
            resetPlayer();
            break;
        }
    }

    let holes = levels[currentLevel].holes;
    for (const h of holes) {
        if (checkFallenInHole(boule, h)) {
            resetPlayer();
            break;
        }
    }

    if (boule.y - boule.radius > canvas.height + 50) {
        resetPlayer();
    }

    // Victoire niveau 5 = atteindre la sucette (reward)
    let win = false;
    if (currentLevel === lastLevel && levels[lastLevel].reward) {
        let reward = levels[lastLevel].reward;
        let dx = boule.x - reward.x;
        let dy = boule.y - reward.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < boule.radius + 30) win = true;
    } else if (boule.x + boule.radius >= canvas.width - 22) {
        win = true;
    }

    if (!isLevelComplete && win) {
        isLevelComplete = true;
        showWinAnim = true;
        nextLevelBtn.disabled = false;
        message.textContent = currentLevel === lastLevel ? "🍭 Clique sur 'Suivant' pour terminer !" : "Bravo ! Clique sur 'Suivant' ou appuie sur N";
        setTimeout(() => { showWinAnim = false; }, 1500);
    }

    if (boule.x - boule.radius < 0) boule.x = boule.radius;
    if (boule.x + boule.radius > canvas.width) boule.x = canvas.width - boule.radius;

    drawPlatforms();
    drawHoles();
    drawObstacles();
    drawBoule();
    drawReward();

    if (showWinAnim) drawWinAnim();

    levelInfo.textContent = `Niveau ${currentLevel + 1} / ${levels.length}`;
    if (!isLevelComplete) {
        message.textContent = "Atteins la droite pour passer !";
        nextLevelBtn.disabled = true;
    }

    requestAnimationFrame(update);
}

function showVictoryPopup() {
    if (popupVictory) {
        popupVictory.classList.remove("hidden");
        victoryTotal.textContent = victory;
    }
}

function updateVictoryUI() {
    if (victoryCount) {
        victoryCount.textContent = "🍭 x" + victory;
    }
    if (victoryTotal) {
        victoryTotal.textContent = victory;
    }
}

resetPlayer();
update();
updateVictoryUI();
