const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 400;

// --- 8-БИТНЫЙ СИНТЕЗАТОР ЗВУКОВ И МУЗЫКИ ЛОКАЦИИ ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let musicPlaying = false;

function start8BitMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const notes = [82.4, 82.4, 164.8, 82.4, 82.4, 146.8, 82.4, 82.4, 130.8, 82.4, 82.4, 116.5, 82.4, 82.4, 123.5, 130.8];
  let step = 0;

  setInterval(() => {
    if (!gameRunning) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(notes[step % notes.length], audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
    step++;
  }, 180);
}

function play8Bit(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'shoot') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.start(now); osc.stop(now + 0.16);
  } else if (type === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
    osc.start(now); osc.stop(now + 0.18);
  } else if (type === 'dash') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } else if (type === 'win') {
    osc.type = 'square';
    const winNotes = [261.6, 329.6, 392.0, 523.3, 659.3];
    winNotes.forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.12));
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.65);
    osc.start(now); osc.stop(now + 0.65);
  }
}

// --- ЗАГРУЗКА РИСУНКОВ И УДАЛЕНИЕ БЕЛОГО ФОНА ---
const sprites = {};
function loadTransparentSprite(name, src) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const imgData = cx.getImageData(0, 0, c.width, c.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
        data[i + 3] = 0;
      }
    }
    cx.putImageData(imgData, 0, 0);
    sprites[name] = c;
  };
}

loadTransparentSprite('oleg', 'oleg.png');
loadTransparentSprite('zombie', 'zombie.png');
loadTransparentSprite('friend', 'friend.png');
loadTransparentSprite('gun', 'gun.png');
loadTransparentSprite('soldier', 'soldier.png');

// --- ВЫВЕСКА "ЛАБОРАТОРИЯ НЕЗНАЙКИ" ---
const signCanvas = document.createElement('canvas');
signCanvas.width = 256; signCanvas.height = 128;
const sCtx = signCanvas.getContext('2d');
sCtx.fillStyle = '#0033aa'; sCtx.fillRect(0, 0, 256, 128);
sCtx.strokeStyle = '#00ffff'; sCtx.lineWidth = 8; sCtx.strokeRect(4, 4, 248, 120);
sCtx.fillStyle = '#ffff00'; sCtx.font = 'bold 22px Courier New'; sCtx.textAlign = 'center';
sCtx.fillText('ЛАБОРАТОРИЯ', 128, 52);
sCtx.fillText('НЕЗНАЙКИ', 128, 88);

// --- КАРТА УРОВНЯ (16x8) ---
// 1 = стена, 2 = окно (можно стрелять сквозь), 3 = вывеска ЛАБОРАТОРИЯ НЕЗНАЙКИ
const map = [,
 ,
 ,
 ,
 ,
 ,
 ,
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];
let player = { x: 2.5, y: 2.5, dir: 0, hp: 100, dashTimer: 0 };
let stage = 1;
let enemies = [];
let gunRecoil = 0;
let gameRunning = false;

function setupStage(s) {
  stage = s;
  document.getElementById('stageNum').innerText = stage;
  enemies = [];

  if (stage === 1) {
    document.getElementById('mission').innerText = "ЭТАП 1: Отстреливайся от зомби вместе с Умным Другом и ищите лабораторию!";
    enemies.push({ x: 2.2, y: 4.5, hp: 9999, type: 'friend' });
    enemies.push({ x: 5.5, y: 2.5, hp: 40, type: 'zombie' });
    enemies.push({ x: 6.2, y: 5.0, hp: 40, type: 'zombie' });
    enemies.push({ x: 7.0, y: 3.5, hp: 40, type: 'zombie' });
  } else if (stage === 2) {
    document.getElementById('mission').innerText = "ЭТАП 2: Армия солдат тоже заражена! Отступай в здание (слева) и стреляй через ОКНО!";
    player.x = 3.2; player.y = 2.0;
    enemies.push({ x: 2.0, y: 2.0, hp: 9999, type: 'friend' });
    enemies.push({ x: 9.5, y: 2.2, hp: 60, type: 'soldier' });
    enemies.push({ x: 10.5, y: 3.8, hp: 60, type: 'soldier' });
    enemies.push({ x: 9.8, y: 5.2, hp: 60, type: 'soldier' });
  } else if (stage === 3) {
    document.getElementById('mission').innerText = "ЭТАП 3: Выходи из здания, отстреливай зомби и беги к вывеске 'ЛАБОРАТОРИЯ НЕЗНАЙКИ'!";
    enemies.push({ x: 11.5, y: 3.0, hp: 50, type: 'zombie' });
    enemies.push({ x: 12.8, y: 4.8, hp: 50, type: 'zombie' });
    enemies.push({ x: 13.8, y: 2.2, hp: 9999, type: 'oleg' });
  }
}

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  setupStage(1);
  gameRunning = true;
  start8BitMusic();
  canvas.requestPointerLock();
  requestAnimationFrame(loop);
});

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') shoot();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && player.dashTimer <= 0 && gameRunning) {
    player.dashTimer = 10;
    play8Bit('dash');
  }
});
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousedown', () => { if (gameRunning) { canvas.requestPointerLock(); shoot(); } });
window.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas) player.dir += e.movementX * 0.003;
});

function shoot() {
  if (!gameRunning || gunRecoil > 0) return;
  gunRecoil = 12;
  play8Bit('shoot');

  let closest = null;
  let minDist = 16;
  enemies.forEach(en => {
    if (en.type === 'friend' || en.type === 'oleg' || en.hp <= 0) return;
    let dx = en.x - player.x;
    let dy = en.y - player.y;
    let dist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) - player.dir;
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    if (Math.abs(angle) < 0.16 && dist < minDist) {
      minDist = dist;
      closest = en;
    }
  });

  if (closest) {
    closest.hp -= 25;
    play8Bit('hit');
  }
}

function update() {
  let speed = player.dashTimer > 0 ? 0.16 : 0.06;
  if (player.dashTimer > 0) player.dashTimer--;

  if (keys['KeyQ'] || keys['ArrowLeft']) player.dir -= 0.04;
  if (keys['KeyE'] || keys['ArrowRight']) player.dir += 0.04;

  let moveX = 0, moveY = 0;
  if (keys['KeyW'] || keys['ArrowUp']) { moveX += Math.cos(player.dir) * speed; moveY += Math.sin(player.dir) * speed; }
  if (keys['KeyS'] || keys['ArrowDown']) { moveX -= Math.cos(player.dir) * speed; moveY -= Math.sin(player.dir) * speed; }
  if (keys['KeyA']) { moveX += Math.sin(player.dir) * speed; moveY -= Math.cos(player.dir) * speed; }
  if (keys['KeyD']) { moveX -= Math.sin(player.dir) * speed; moveY += Math.cos(player.dir) * speed; }

  if (map[Math.floor(player.y)][Math.floor(player.x + moveX)] === 0) player.x += moveX;
  if (map[Math.floor(player.y + moveY)][Math.floor(player.x)] === 0) player.y += moveY;

  if (gunRecoil > 0) gunRecoil--;

  let activeEnemies = 0;
  enemies.forEach(en => {
    if (en.type === 'friend' || en.type === 'oleg' || en.hp <= 0) return;
    activeEnemies++;
    let dx = player.x - en.x;
    let dy = player.y - en.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 1.2) {
      let nx = en.x + (dx / dist) * 0.015;
      let ny = en.y + (dy / dist) * 0.015;
      if (map[Math.floor(ny)][Math.floor(nx)] === 0) { en.x = nx; en.y = ny; }
    } else {
      player.hp -= 0.25;
      if (player.hp <= 0) {
        gameRunning = false;
        document.exitPointerLock();
        const ov = document.getElementById('overlay');
        ov.style.display = 'flex';
        ov.innerHTML = `<h1>ТЕБЯ СЪЕЛИ!</h1><button onclick="location.reload()">ПОПРОБОВАТЬ СНОВА</button>`;
      }
    }
  });

  document.getElementById('hp').innerText = Math.max(0, Math.floor(player.hp));
  document.getElementById('enemiesLeft').innerText = activeEnemies;

  if (stage === 1 && activeEnemies === 0) setupStage(2);
  if (stage === 2 && activeEnemies === 0) setupStage(3);

  if (stage === 3 && player.x > 13.0 && player.y < 3.0) {
    gameRunning = false;
    play8Bit('win');
    document.exitPointerLock();
    const ov = document.getElementById('overlay');
    ov.style.display = 'flex';
    ov.innerHTML = `
      <h1 style="color:#0f0">ВЫ НАШЛИ ЛАБОРАТОРИЮ НЕЗНАЙКИ!</h1>
      <p style="font-size:22px; max-width:650px; color:#fff;">
        Твой <b>Умный Друг</b> зашёл в лабораторию и сварил лечебное зелье!<br><br>
        Все зомби, заражённые солдаты и <b>Бомж Олег</b> полностью вылечились! Победа!
      </p>
      <button onclick="location.reload()">ИГРАТЬ ЕЩЁ РАЗ</button>
    `;
  }
}

function render() {
  ctx.fillStyle = '#150505'; ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = '#262626'; ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  const numRays = 160;
  const fov = Math.PI / 3;
  const zBuffer = new Array(numRays);

  for (let i = 0; i < numRays; i++) {
    let rayAngle = (player.dir - fov / 2) + (i / numRays) * fov;
    let dist = 0;
    let hit = 0;
    let rx = Math.cos(rayAngle);
    let ry = Math.sin(rayAngle);

    while (hit === 0 && dist < 20) {
      dist += 0.04;
      let tx = Math.floor(player.x + rx * dist);
      let ty = Math.floor(player.y + ry * dist);
      if (tx < 0 || tx >= 16 || ty < 0 || ty >= 8) { hit = 1; break; }
      if (map[ty][tx] > 0) hit = map[ty][tx];
    }

    dist *= Math.cos(rayAngle - player.dir);
    zBuffer[i] = dist;
    let wallHeight = Math.min(canvas.height, canvas.height / dist);
    let shade = Math.max(30, 230 - dist * 16);

    if (hit === 1) {
      ctx.fillStyle = `rgb(${shade}, ${shade * 0.25}, ${shade * 0.25})`;
      ctx.fillRect(i * 4, (canvas.height - wallHeight) / 2, 4, wallHeight);
    } else if (hit === 2) {
      ctx.fillStyle = `rgb(${shade}, ${shade * 0.25}, ${shade * 0.25})`;
      ctx.fillRect(i * 4, (canvas.height - wallHeight) / 2, 4, wallHeight * 0.32);
      ctx.fillRect(i * 4, (canvas.height + wallHeight) / 2 - wallHeight * 0.32, 4, wallHeight * 0.32);
    } else if (hit === 3) {
      ctx.fillStyle = '#0044cc';
      ctx.fillRect(i * 4, (canvas.height - wallHeight) / 2, 4, wallHeight);
      if (i % 10 === 0) {
        ctx.drawImage(signCanvas, i * 4 - 40, (canvas.height - wallHeight * 0.4) / 2, 100, wallHeight * 0.4);
      }
    }
  }

  enemies.sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y));
  enemies.forEach(en => {
    if (en.hp <= 0 || !sprites[en.type]) return;
    let dx = en.x - player.x;
    let dy = en.y - player.y;
    let dist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) - player.dir;
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;

    if (Math.abs(angle) < fov / 1.4 && dist > 0.3) {
      let screenX = (0.5 * (angle / (fov / 2)) + 0.5) * canvas.width;
      let size = Math.min(360, (canvas.height / dist) * 1.15);
      let rayIdx = Math.floor(screenX / 4);
      if (rayIdx >= 0 && rayIdx < numRays && zBuffer[rayIdx] > dist) {
        ctx.drawImage(sprites[en.type], screenX - size / 2, (canvas.height - size) / 2 + 20, size, size);
      }
    }
  });

  if (sprites.gun) {
    let gunW = 180;
    let gunH = 180;
    ctx.drawImage(sprites.gun, canvas.width / 2 - gunW / 2, canvas.height - gunH + 20 + gunRecoil * 4, gunW, gunH);
  }

  if (gunRecoil > 8) {
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 155, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop() {
  if (!gameRunning) return;
  update();
  render();
  requestAnimationFrame(loop);
}
