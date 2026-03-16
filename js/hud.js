'use strict';

function updateHUD(){
  if(!playerEntity||!playerEntity.alive) return;
  const p = playerEntity;
  const pct = Math.max(0, p.hp/p.maxHp*100);
  const fill = document.getElementById('hp-fill');
  fill.style.width = pct+'%';
  fill.style.background = pct>55?'linear-gradient(90deg,#22cc44,#88ff44)':pct>28?'linear-gradient(90deg,#ff8800,#ffcc00)':'linear-gradient(90deg,#ff1100,#ff5500)';
  document.getElementById('hp-cur').textContent = Math.ceil(p.hp);
  document.getElementById('hp-max').textContent = p.maxHp;
  document.getElementById('players-left').textContent = playersAlive;

  // Cube dots
  const dotsEl = document.getElementById('cube-dots');
  dotsEl.innerHTML = '';
  for(let i=0;i<Math.min(p.cubes,10);i++){
    const dot = document.createElement('div');
    dot.className = 'cube-dot';
    dotsEl.appendChild(dot);
  }

  // Super bar
  const superFill = document.getElementById('super-fill');
  superFill.style.width = p.superCharge+'%';
  const superLabel = document.getElementById('super-label');
  if(p.superCharge >= 100){
    superLabel.textContent = CHARS[p.charIdx][9].toUpperCase();
    superFill.style.background = 'linear-gradient(90deg,#ff8c00,#ffdd00,#ffffaa)';
    superFill.style.animation = 'superReady .5s infinite alternate';
  } else {
    superLabel.textContent = Math.floor(p.superCharge)+'%';
    superFill.style.background = 'linear-gradient(90deg,#ff8c00,#ffdd00,#fff8aa)';
    superFill.style.animation = 'none';
  }
}

function updateZoneTimer(){
  const remaining = Math.max(0, ZONE_SHRINK_DUR - gameTime);
  const m = Math.floor(remaining/60), s = Math.floor(remaining%60);
  document.getElementById('zone-timer').textContent = m+':'+(s<10?'0':'')+s;
  if(playerEntity&&playerEntity.alive){
    const d = Math.sqrt((playerEntity.pos.x-zoneX)**2+(playerEntity.pos.z-zoneZ)**2);
    const warn = document.getElementById('zone-warning');
    if(d > zoneRadius-.5) warn.textContent = `⚠ ВНЕ ЗОНЫ`;
    else warn.textContent = '';
  }
}

function drawMinimap(){
  const canvas = document.getElementById('minimap');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2;
  const b = getMapBounds();
  const mapW = b.maxX-b.minX, mapH = b.maxZ-b.minZ;
  const scaleX = W/mapW, scaleZ = H/mapH;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(5,10,20,.85)'; ctx.fillRect(0,0,W,H);

  // Safe zone ring
  ctx.strokeStyle='rgba(80,180,255,.8)'; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.arc(cx+(zoneX-b.minX-(mapW/2))*scaleX, cy+(zoneZ-b.minZ-(mapH/2))*scaleZ, zoneRadius*scaleX, 0, Math.PI*2);
  ctx.stroke();

  // Obstacles
  for(const o of obstacleObjects){
    const mx=(o.pos.x-b.minX)*scaleX, mz=(o.pos.y-b.minZ)*scaleZ;
    ctx.fillStyle='rgba(80,90,100,.7)'; ctx.fillRect(mx-3,mz-3,6,6);
  }

  // Bush zones
  for(const bz of bushZones){
    const mx=(bz.pos.x-b.minX)*scaleX, mz=(bz.pos.y-b.minZ)*scaleZ;
    ctx.fillStyle='rgba(30,100,20,.5)'; ctx.beginPath();ctx.arc(mx,mz,3,0,Math.PI*2);ctx.fill();
  }

  // Power boxes
  for(const box of powerBoxes){
    if(!box.alive) continue;
    const mx=(box.pos.x-b.minX)*scaleX, mz=(box.pos.z-b.minZ)*scaleZ;
    ctx.fillStyle='#ffcc00'; ctx.fillRect(mx-2,mz-2,4,4);
  }

  // Power cubes
  for(const c of powerCubeItems){
    if(!c.alive) continue;
    const mx=(c.pos.x-b.minX)*scaleX, mz=(c.pos.z-b.minZ)*scaleZ;
    ctx.fillStyle='#aa44ff'; ctx.beginPath();ctx.arc(mx,mz,2,0,Math.PI*2);ctx.fill();
  }

  // Bots
  for(const bot of botEntities){
    if(!bot.alive) continue;
    const mx=(bot.pos.x-b.minX)*scaleX, mz=(bot.pos.z-b.minZ)*scaleZ;
    ctx.fillStyle='#'+bot.color.toString(16).padStart(6,'0');
    ctx.beginPath();ctx.arc(mx,mz,3.5,0,Math.PI*2);ctx.fill();
  }

  // Player
  if(playerEntity&&playerEntity.alive){
    const mx=(playerEntity.pos.x-b.minX)*scaleX, mz=(playerEntity.pos.z-b.minZ)*scaleZ;
    ctx.fillStyle='#fff'; ctx.beginPath();ctx.arc(mx,mz,5.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffcc00'; ctx.lineWidth=1.5; ctx.stroke();
  }

  // Border
  ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1.2; ctx.strokeRect(0,0,W,H);
}

function showDmgNum(worldPos, amount, color){
  const el = document.createElement('div');
  el.className = 'dmgnum';
  el.textContent = amount;
  el.style.color  = color||'#ffdd44';
  el.style.fontSize = amount>300?'1.1rem':'.82rem';
  const v = worldPos.clone().add(new THREE.Vector3(0,1.5,0));
  v.project(camera);
  el.style.left = ((v.x+1)/2*window.innerWidth)+'px';
  el.style.top  = ((-v.y+1)/2*window.innerHeight)+'px';
  document.getElementById('screen-game').appendChild(el);
  setTimeout(()=>el.remove(), 850);
}

function showAnnounce(text, color, duration){
  const el = document.getElementById('announce');
  el.textContent = text;
  el.style.color = '#'+new THREE.Color(color).getHexString();
  el.style.opacity = 1;
  el.style.transition='none';
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.style.transition='opacity 1s'; el.style.opacity=0; }, duration||1800);
}

function addKillFeed(killer, victim){
  const kf = document.getElementById('killfeed');
  const item = document.createElement('div');
  item.className = 'kf-item';
  item.innerHTML = `<span style="color:${killer==='Ты'?'#ffdd00':'#ff6644'}">${killer}</span> ☠ ${victim}`;
  kf.appendChild(item);
  setTimeout(()=>item.remove(), 3000);
}

// Trophy calculation based on placement
function calcTrophyChange(rank, totalPlayers){
  if(rank===1)  return +7;
  if(rank===2)  return +4;
  if(rank===3)  return +2;
  if(rank<=5)   return +1;
  if(rank<=7)   return -1;
  if(rank<=9)   return -3;
  return -5;
}

function updateQuestProgress(type, amount){
  if(!currentUser||!currentUser.quests) return;
  currentUser.quests.forEach(q => {
    if(q.done) return;
    if(type==='kills' && q.id==='q2') q.progress = Math.min(q.target, q.progress+amount);
    if(type==='cubes' && q.id==='q3') q.progress = Math.min(q.target, q.progress+amount);
  });
}
