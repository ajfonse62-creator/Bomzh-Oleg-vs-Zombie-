window.canvas = document.getElementById('game');
window.ctx = window.canvas.getContext('2d');
window.canvas.width = 640;
window.canvas.height = 400;

// --- 8-БИТНЫЙ ЗВУК И МУЗЫКА ---
const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
window.audioCtx = AudioCtxClass ? new AudioCtxClass() : null;
let musicStarted = false;

window.start8BitMusic = function() {
  if (!window.audioCtx || musicStarted) return;
  musicStarted = true;
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

  const riff1 = [82.4, 82.4, 164.8, 82.4, 82.4, 146.8, 82.4, 82.4, 130.8, 82.4, 82.4, 116.5, 82.4, 82.4, 123.5, 130.8];
  const riff2 = [110.0, 110.0, 220.0, 110.0, 110.0, 196.0, 110.0, 110.0, 174.6, 110.0, 110.0, 164.8, 146.8, 130.8, 123.5, 110.0];
  let step = 0;

  setInterval(() => {
    if (!window.gameRunning) return;
    const notes = (window.stage === 2) ? riff2 : riff1;
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(notes[step % notes.length], window.audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, window.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    osc.start();
    osc.stop(window.audioCtx.currentTime + 0.14);
    step++;
  }, 170);
};

window.play8Bit = function(type) {
  if (!window.audioCtx) return;
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
  const osc = window.audioCtx.createOscillator();
  const gain = window.audioCtx.createGain();
  osc.connect(gain);
  gain.connect(window.audioCtx.destination);
  const now = window.audioCtx.currentTime;

  if (type === 'shoot') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.start(now); osc.stop(now + 0.16);
  } else if (type === 'friendShoot') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'enemyShoot') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.14);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc.start(now); osc.stop(now + 0.14);
  } else if (type === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'kill') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
    osc.start(now); osc.stop(now + 0.28);
  } else if (type === 'dash') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } else if (type === 'heal') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(550, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'win') {
    osc.type = 'square';
    const winNotes = [261.6, 329.6, 392.0, 523.3, 659.3];
    winNotes.forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.11));
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.65);
    osc.start(now); osc.stop(now + 0.65);
  }
};

// --- ЗАГРУЗКА КАРТИНОК И ВЫРЕЗАНИЕ БЕЛОГО ФОНА ---
window.sprites = {};
function loadSprite(name, src, fallbackColor) {
  // Запасной цветной квадрат на случай, если картинка ещё грузится
  const fb = document.createElement('canvas');
  fb.width = 64; fb.height = 64;
  const fbx = fb.getContext('2d');
  fbx.fillStyle = fallbackColor;
  fbx.fillRect(16, 8, 32, 56);
  window.sprites[name] = fb;

  const img = new Image();
  img.src = src;
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    try {
      const imgData = cx.getImageData(0, 0, c.width, c.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238) {
          data[i + 3] = 0;
        }
      }
      cx.putImageData(imgData, 0, 0);
    } catch (e) {}
    window.sprites[name] = c;
  };
}

loadSprite('oleg', 'oleg.png', '#ff8800');
loadSprite('zombie', 'zombie.png', '#22aa22');
loadSprite('friend', 'friend.png', '#00aaff');
loadSprite('gun', 'gun.png', '#666666');
loadSprite('soldier', 'soldier.png', '#556622');

// Аптечка
const medkit = document.createElement('canvas');
medkit.width = 64; medkit.height = 64;
const mx = medkit.getContext('2d');
mx.fillStyle = '#fff'; mx.fillRect(14, 18, 36, 32);
mx.fillStyle = '#0c0'; mx.fillRect(28, 22, 8, 24); mx.fillRect(20, 30, 24, 8);
window.sprites['medkit'] = medkit;

// Вывеска Лаборатория Незнайки
window.signCanvas = document.createElement('canvas');
window.signCanvas.width = 256; window.signCanvas.height = 128;
const sx = window.signCanvas.getContext('2d');
sx.fillStyle = '#002288'; sx.fillRect(0, 0, 256, 128);
sx.strokeStyle = '#00ffff'; sx.lineWidth = 8; sx.strokeRect(4, 4, 248, 120);
sx.fillStyle = '#ffff00'; sx.font = 'bold 22px Courier New'; sx.textAlign = 'center';
sx.fillText('ЛАБОРАТОРИЯ', 128, 52);
sx.fillText('НЕЗНАЙКИ', 128, 88);

// Карта 20x10
const mapRows = [
  "11111111111111113331",
  "10000100000000000001",
  "10000200000000000001",
  "10000200000000000001",
  "10000100000000000001",
  "10000000000000000001",
  "10000100000000000001",
  "10000100000000000001",
  "10000100000000000001",
  "11111111111111111111"
];
window.levelMap = mapRows.map(r => r.split('').map(Number));
let player = { x: 7.5, y: 5.0, dir: 0, hp: 100, dashTimer: 0, walkBob: 0 };
window.stage = 1;
let enemies = [];
let projectiles = [];
let pickups = [];
let particles = [];
let gunRecoil = 0;
let screenShake = 0;
let damageFlash = 0;
let styleScore = 0;
let styleTimer = 0;
window.gameRunning = false;

const keys = {};

// Прямая привязка кнопки "НАЧАТЬ ИГРУ" при загрузке скрипта
const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.onclick = function() {
    const ov = document.getElementById('overlay');
    if (ov) ov.style.display = 'none';
    setupStage(1);
    window.gameRunning = true;
    if (window.start8BitMusic) window.start8BitMusic();
    if (window.canvas && window.canvas.requestPointerLock) {
      try { window.canvas.requestPointerLock(); } catch (e) {}
    }
    requestAnimationFrame(loop);
  };
}

function getStyleRank(score) {
  if (score >= 1500) return { rank: 'ULTRAKILL!', color: '#ff00ff' };
  if (score >= 1000) return { rank: 'S - САДИСТ', color: '#ff3333' };
  if (score >= 650)  return { rank: 'A - АНАРХИЯ', color: '#ff8800' };
  if (score >= 350)  return { rank: 'B - БЕЗУМИЕ', color: '#ffff00' };
  if (score >= 150)  return { rank: 'C - ХАОС', color: '#00ff00' };
  return { rank: 'D - РАЗРУШЕНИЕ', color: '#888888' };
}

function addParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      life: 20 + Math.random() * 15,
      color: color
    });
  }
}

function setupStage(s) {
  window.stage = s;
  document.getElementById('stageNum').innerText = window.stage;
  enemies = [];
  projectiles = [];

  if (window.stage === 1) {
    document.getElementById('mission').innerText = "ЭТАП 1: Отстреливайся от зомби вместе с Умным Другом!";
    player.x = 7.5; player.y = 5.0; player.dir = 0;
    enemies.push({ x: 6.8, y: 4.0, hp: 9999, maxHp: 9999, type: 'friend', cooldown: 0 });
    enemies.push({ x: 11.5, y: 3.5, hp: 50, maxHp: 50, type: 'zombie' });
    enemies.push({ x: 12.5, y: 6.0, hp: 50, maxHp: 50, type: 'zombie' });
    enemies.push({ x: 13.5, y: 4.5, hp: 50, maxHp: 50, type: 'zombie' });
    enemies.push({ x: 14.5, y: 7.0, hp: 50, maxHp: 50, type: 'zombie' });
  } else if (window.stage === 2) {
    document.getElementById('mission').innerText = "ЭТАП 2: Армия солдат заражена! Вы в здании — стреляйте через ОКНА!";
    player.x = 3.0; player.y = 3.0; player.dir = 0;
    enemies.push({ x: 2.5, y: 4.2, hp: 9999, maxHp: 9999, type: 'friend', cooldown: 0 });
    enemies.push({ x: 8.5, y: 2.2, hp: 75, maxHp: 75, type: 'soldier', cooldown: 80 });
    enemies.push({ x: 9.8, y: 4.2, hp: 75, maxHp: 75, type: 'soldier', cooldown: 110 });
    enemies.push({ x: 9.0, y: 5.5, hp: 75, maxHp: 75, type: 'soldier', cooldown: 140 });
    enemies.push({ x: 11.5, y: 3.0, hp: 75, maxHp: 75, type: 'soldier', cooldown: 95 });
  } else if (window.stage === 3) {
    document.getElementById('mission').innerText = "ЭТАП 3: Прорывайтесь к синей вывеске 'ЛАБОРАТОРИЯ НЕЗНАЙКИ'!";
    enemies.push({ x: 13.0, y: 3.0, hp: 60, maxHp: 60, type: 'zombie' });
    enemies.push({ x: 15.0, y: 5.0, hp: 60, maxHp: 60, type: 'zombie' });
    enemies.push({ x: 16.5, y: 2.5, hp: 80, maxHp: 80, type: 'soldier', cooldown: 70 });
    enemies.push({ x: 17.5, y: 1.8, hp: 9999, maxHp: 9999, type: 'oleg' });
  }
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') shoot();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && player.dashTimer <= 0 && window.gameRunning) {
    player.dashTimer = 12;
    styleScore += 25;
    styleTimer = 180;
    if (window.play8Bit) window.play8Bit('dash');
  }
});
window.addEventListener('keyup', e => keys[e.code] = false);

window.canvas.addEventListener('mousedown', () => {
  if (window.gameRunning) {
    if (window.canvas.requestPointerLock && document.pointerLockElement !== window.canvas) {
      try { window.canvas.requestPointerLock(); } catch (e) {}
    }
    shoot();
  }
});

window.addEventListener('mousemove', e => {
  if (document.pointerLockElement === window.canvas) {
    player.dir += e.movementX * 0.0032;
  }
});

function hasLineOfSight(x1, y1, x2, y2) {
  let dist = Math.hypot(x2 - x1, y2 - y1);
  let steps = Math.floor(dist * 4);
  for (let i = 1; i < steps; i++) {
    let tx = Math.floor(x1 + ((x2 - x1) * i) / steps);
    let ty = Math.floor(y1 + ((y2 - y1) * i) / steps);
    if (window.levelMap[ty] && window.levelMap[ty][tx] === 1) return false;
  }
  return true;
}

function shoot() {
  if (!window.gameRunning || gunRecoil > 0) return;
  gunRecoil = 14;
  screenShake = 6;
  if (window.play8Bit) window.play8Bit('shoot');

  let closest = null;
  let minDist = 18;
  enemies.forEach(en => {
    if (en.type === 'friend' || en.type === 'oleg' || en.hp <= 0) return;
    let dx = en.x - player.x;
    let dy = en.y - player.y;
    let dist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) - player.dir;
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;

    if (Math.abs(angle) < 0.22 && dist < minDist && hasLineOfSight(player.x, player.y, en.x, en.y)) {
      minDist = dist;
      closest = en;
    }
  });

  if (closest) {
    let dmg = player.dashTimer > 0 ? 45 : 30;
    closest.hp -= dmg;
    addParticles(closest.x, closest.y, '#00ff00', 10);

    if (closest.hp <= 0) {
      if (window.play8Bit) window.play8Bit('kill');
      styleScore += player.dashTimer > 0 ? 300 : 150;
      styleTimer = 240;
      addParticles(closest.x, closest.y, '#ff2200', 22);
      if (Math.random() < 0.5) pickups.push({ x: closest.x, y: closest.y, type: 'medkit' });
    } else {
      if (window.play8Bit) window.play8Bit('hit');
      styleScore += 40;
      styleTimer = 180;
    }
  }
}

function update() {
  let speed = player.dashTimer > 0 ? 0.17 : 0.065;
  if (player.dashTimer > 0) player.dashTimer--;
  if (screenShake > 0) screenShake--;
  if (damageFlash > 0) damageFlash--;
  if (gunRecoil > 0) gunRecoil--;

  if (styleTimer > 0) styleTimer--;
  else styleScore = Math.max(0, styleScore - 2);

  if (keys['KeyQ'] || keys['ArrowLeft']) player.dir -= 0.045;
  if (keys['KeyE'] || keys['ArrowRight']) player.dir += 0.045;

  let moveX = 0, moveY = 0;
  if (keys['KeyW'] || keys['ArrowUp']) { moveX += Math.cos(player.dir) * speed; moveY += Math.sin(player.dir) * speed; }
  if (keys['KeyS'] || keys['ArrowDown']) { moveX -= Math.cos(player.dir) * speed; moveY -= Math.sin(player.dir) * speed; }
  if (keys['KeyA']) { moveX += Math.sin(player.dir) * speed; moveY -= Math.cos(player.dir) * speed; }
  if (keys['KeyD']) { moveX -= Math.sin(player.dir) * speed; moveY += Math.cos(player.dir) * speed; }

  if (moveX !== 0 || moveY !== 0) player.walkBob += 0.25;

  if (window.levelMap[Math.floor(player.y)][Math.floor(player.x + moveX)] === 0) player.x += moveX;
  if (window.levelMap[Math.floor(player.y + moveY)][Math.floor(player.x)] === 0) player.y += moveY;

  pickups = pickups.filter(p => {
    if (Math.hypot(player.x - p.x, player.y - p.y) < 0.8) {
      player.hp = Math.min(100, player.hp + 30);
      if (window.play8Bit) window.play8Bit('heal');
      return false;
    }
    return true;
  });

  particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; });
  particles = particles.filter(pt => pt.life > 0);

  let activeEnemies = 0;
  enemies.forEach(en => {
    if (en.hp <= 0) return;

    if (en.type === 'friend') {
      let distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);
      if (distToPlayer > 2.2) {
        let nx = en.x + ((player.x - en.x) / distToPlayer) * 0.045;
        let ny = en.y + ((player.y - en.y) / distToPlayer) * 0.045;
        if (window.levelMap[Math.floor(ny)][Math.floor(nx)] === 0) { en.x = nx; en.y = ny; }
      }
      if (en.cooldown > 0) en.cooldown--;
      else {
        let target = enemies.find(t => (t.type === 'zombie' || t.type === 'soldier') && t.hp > 0 && Math.hypot(t.x - en.x, t.y - en.y) < 10 && hasLineOfSight(en.x, en.y, t.x, t.y));
        if (target) {
          en.cooldown = 55;
          let ang = Math.atan2(target.y - en.y, target.x - en.x);
          projectiles.push({ x: en.x, y: en.y, vx: Math.cos(ang) * 0.22, vy: Math.sin(ang) * 0.22, fromPlayer: true, color: '#00ffff' });
          if (window.play8Bit) window.play8Bit('friendShoot');
        }
      }
      return;
    }

    if (en.type === 'oleg') return;

    activeEnemies++;
    let dx = player.x - en.x;
    let dy = player.y - en.y;
    let dist = Math.hypot(dx, dy);

    let moveSpeed = en.type === 'zombie' ? 0.022 : 0.012;
    if (dist > (en.type === 'soldier' ? 4.5 : 1.1)) {
      let nx = en.x + (dx / dist) * moveSpeed;
      let ny = en.y + (dy / dist) * moveSpeed;
      if (window.levelMap[Math.floor(ny)][Math.floor(nx)] === 0) { en.x = nx; en.y = ny; }
    } else if (en.type === 'zombie') {
      player.hp -= 0.35;
      damageFlash = 4;
    }

    if (en.type === 'soldier') {
      if (en.cooldown > 0) en.cooldown--;
      else if (dist < 11 && hasLineOfSight(en.x, en.y, player.x, player.y)) {
        en.cooldown = 110;
        let ang = Math.atan2(dy, dx);
        projectiles.push({ x: en.x, y: en.y, vx: Math.cos(ang) * 0.14, vy: Math.sin(ang) * 0.14, fromPlayer: false, color: '#ff4400' });
        if (window.play8Bit) window.play8Bit('enemyShoot');
      }
    }
  });

  projectiles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    let tile = window.levelMap[Math.floor(p.y)] && window.levelMap[Math.floor(p.y)][Math.floor(p.x)];
    if (tile === 1) { p.dead = true; return; }

    if (p.fromPlayer) {
      enemies.forEach(en => {
        if ((en.type === 'zombie' || en.type === 'soldier') && en.hp > 0 && Math.hypot(en.x - p.x, en.y - p.y) < 0.6) {
          en.hp -= 20;
          p.dead = true;
          addParticles(en.x, en.y, '#00ffff', 6);

ov.innerHTML = <h1 style="color:#0f0">ВЫ НАШЛИ ЛАБОРАТОРИЮ НЕЗНАЙКИ!</h1> <p style="font-size:20px; max-width:650px; color:#fff;"> Твой <b>Умный Друг</b> зашёл в лабораторию и сварил лечебное зелье!<br><br> Все зомби, заражённые солдаты и <b>Бомж Олег</b> полностью вылечились! Победа!<br> Финальный рейтинг стиля: <b>${getStyleRank(styleScore).rank} (${styleScore})</b> </p> <button onclick="location.reload()">ИГРАТЬ ЕЩЁ РАЗ</button>;
}
}
function render() {
const c = window.ctx;
const w = window.canvas.width;
const h = window.canvas.height;
c.save();
if (screenShake > 0) {
c.translate((Math.random() - 0.5) * screenShake * 1.5, (Math.random() - 0.5) * screenShake * 1.5);
}
c.fillStyle = window.stage === 2 ? '#1a0a00' : '#120308';
c.fillRect(0, 0, w, h / 2);
c.fillStyle = '#242428';
c.fillRect(0, h / 2, w, h / 2);
const numRays = 160;
const fov = Math.PI / 3;
const zBuffer = new Array(numRays);
for (let i = 0; i < numRays; i++) {
let rayAngle = (player.dir - fov / 2) + (i / numRays) * fov;
let dist = 0;
let hit = 0;
let rx = Math.cos(rayAngle);
let ry = Math.sin(rayAngle);
while (hit === 0 && dist < 24) {
dist += 0.04;
let tx = Math.floor(player.x + rx * dist);
let ty = Math.floor(player.y + ry * dist);
if (tx < 0 || tx >= 20 || ty < 0 || ty >= 10) { hit = 1; break; }
if (window.levelMap[ty][tx] > 0) hit = window.levelMap[ty][tx];
}
dist *= Math.cos(rayAngle - player.dir);
zBuffer[i] = dist;
let wallHeight = Math.min(h, h / dist);
let shade = Math.max(25, 235 - dist * 13);
if (hit === 1) {
c.fillStyle = rgb(${shade}, ${shade * 0.22}, ${shade * 0.25});
c.fillRect(i * 4, (h - wallHeight) / 2, 4, wallHeight);
} else if (hit === 2) {
c.fillStyle = rgb(${shade}, ${shade * 0.22}, ${shade * 0.25});
c.fillRect(i * 4, (h - wallHeight) / 2, 4, wallHeight * 0.3);
c.fillRect(i * 4, (h + wallHeight) / 2 - wallHeight * 0.3, 4, wallHeight * 0.3);
c.fillStyle = 'rgba(0, 200, 255, 0.15)';
c.fillRect(i * 4, (h - wallHeight * 0.4) / 2, 4, wallHeight * 0.4);
} else if (hit === 3) {
c.fillStyle = '#0044dd';
c.fillRect(i * 4, (h - wallHeight) / 2, 4, wallHeight);
if (i % 12 === 0 && window.signCanvas) {
c.drawImage(window.signCanvas, i * 4 - 45, (h - wallHeight * 0.45) / 2, 110, wallHeight * 0.45);
}
}
}
let renderList = [];
enemies.forEach(en => { if (en.hp > 0) renderList.push({ ...en, isEnemy: true }); });
pickups.forEach(pk => renderList.push({ ...pk, isPickup: true }));
renderList.sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y));
renderList.forEach(obj => {
if (!window.sprites || !window.sprites[obj.type]) return;
let dx = obj.x - player.x;
let dy = obj.y - player.y;
let dist = Math.hypot(dx, dy);
let angle = Math.atan2(dy, dx) - player.dir;
while (angle < -Math.PI) angle += Math.PI * 2;
while (angle > Math.PI) angle -= Math.PI * 2;
if (Math.abs(angle) < fov / 1.35 && dist > 0.3) {
let screenX = (0.5 * (angle / (fov / 2)) + 0.5) * w;
let scale = obj.isPickup ? 0.5 : 1.15;
let size = Math.min(360, (h / dist) * scale);
let rayIdx = Math.floor(screenX / 4);
if (rayIdx >= 0 && rayIdx < numRays && zBuffer[rayIdx] > dist) {
let drawY = obj.isPickup ? (h / 2 + size * 0.3) : ((h - size) / 2 + 20);
c.drawImage(window.sprites[obj.type], screenX - size / 2, drawY, size, size);
if (obj.isEnemy && (obj.type === 'zombie' || obj.type === 'soldier')) {
let barW = size * 0.6;
c.fillStyle = '#400';
c.fillRect(screenX - barW / 2, drawY - 10, barW, 6);
c.fillStyle = '#0f0';
c.fillRect(screenX - barW / 2, drawY - 10, barW * (obj.hp / obj.maxHp), 6);
}
}
}
});
[...projectiles, ...particles].forEach(pt => {
let dx = pt.x - player.x;
let dy = pt.y - player.y;
let dist = Math.hypot(dx, dy);
let angle = Math.atan2(dy, dx) - player.dir;
while (angle < -Math.PI) angle += Math.PI * 2;
while (angle > Math.PI) angle -= Math.PI * 2;
if (Math.abs(angle) < fov / 1.4 && dist > 0.2) {
let screenX = (0.5 * (angle / (fov / 2)) + 0.5) * w;
let rayIdx = Math.floor(screenX / 4);
if (rayIdx >= 0 && rayIdx < numRays && zBuffer[rayIdx] > dist) {
let pSize = Math.max(4, 24 / dist);
c.fillStyle = pt.color;
c.fillRect(screenX - pSize / 2, h / 2, pSize, pSize);
}
}
});
if (window.sprites && window.sprites.gun) {
let bobX = Math.cos(player.walkBob) * 8;
let bobY = Math.abs(Math.sin(player.walkBob)) * 8;
let gunW = 185;
let gunH = 185;
c.drawImage(window.sprites.gun, w / 2 - gunW / 2 + bobX, h - gunH + 25 + bobY + gunRecoil * 4, gunW, gunH);
}
if (gunRecoil > 9) {
c.fillStyle = '#ffee00';
c.beginPath();
c.arc(w / 2, h - 155, 25, 0, Math.PI * 2);
c.fill();
}
if (damageFlash > 0) {
c.fillStyle = 'rgba(255, 0, 0, 0.35)';
c.fillRect(0, 0, w, h);
}
if (styleScore > 0) {
const st = getStyleRank(styleScore);
c.fillStyle = 'rgba(0, 0, 0, 0.7)';
c.fillRect(w - 210, 15, 195, 55);
c.strokeStyle = st.color;
c.lineWidth = 2;
c.strokeRect(w - 210, 15, 195, 55);
c.fillStyle = st.color;
c.font = 'bold 18px Courier New';
c.textAlign = 'right';
c.fillText(st.rank, w - 22, 38);
c.fillStyle = '#fff';
c.font = '14px Courier New';
c.fillText(ОЧКИ: ${styleScore}, w - 22, 58);
c.textAlign = 'left';
}
const radarX = w - 130;
const radarY = h - 155;
const cell = 6;
c.fillStyle = 'rgba(0, 15, 0, 0.8)';
c.fillRect(radarX - 4, radarY - 4, 20 * cell + 8, 10 * cell + 8);
for (let y = 0; y < 10; y++) {
for (let x = 0; x < 20; x++) {
if (window.levelMap[y][x] === 1) c.fillStyle = '#666';
else if (window.levelMap[y][x] === 2) c.fillStyle = '#0af';
else if (window.levelMap[y][x] === 3) c.fillStyle = '#ff0';
else continue;
c.fillRect(radarX + x * cell, radarY + y * cell, cell, cell);
}
}
enemies.forEach(en => {
if (en.hp <= 0) return;
c.fillStyle = en.type === 'friend' ? '#0ff' : (en.type === 'oleg' ? '#fa0' : '#f00');
c.fillRect(radarX + en.x * cell - 2, radarY + en.y * cell - 2, 4, 4);
});
c.fillStyle = '#0f0';
c.beginPath();
c.arc(radarX + player.x * cell, radarY + player.y * cell, 3, 0, Math.PI * 2);
c.fill();
c.restore();
}
function loop() {
if (!window.gameRunning) return;
update();
render();
requestAnimationFrame(loop);
}
