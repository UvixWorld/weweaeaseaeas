'use strict';

// ============================================================
//  MENU — 3D preview + tabs + overlays
// ============================================================
let menuScene, menuCamera, menuRenderer, menuCharMesh=null;
let menuAnimId;
let selectedChar = 0;
let menuFilterClass = -1;

function initMenuLayout(){
  // Rebuild DOM properly — inject grid layout
  const menu = document.getElementById('screen-menu');
  // Layout the main section between topbar and bottombar
  const center = menu.querySelector('.center-preview');
  const left   = menu.querySelector('.left-sidebar');
  const right  = menu.querySelector('.right-sidebar');
  if(center && left && right){
    // Wrap in grid container if not already
    if(!menu.querySelector('.menu-main-layout')){
      const wrap = document.createElement('div');
      wrap.className = 'menu-main-layout';
      wrap.style.cssText = 'display:grid;grid-template-columns:90px 1fr 90px;flex:1;min-height:0;position:relative;z-index:5';
      left.parentNode.insertBefore(wrap, left);
      wrap.appendChild(left);
      wrap.appendChild(center);
      wrap.appendChild(right);
    }
  }
  if(currentUser) selectedChar = currentUser.selectedChar || 0;
  initMenuCanvas();
  buildBrawlerGrid();
  buildQuests();
  buildRanking();
  updateTopbar();
  updateXPBar();
}

function updateTopbar(){
  if(!currentUser) return;
  document.getElementById('topbar-name').textContent     = currentUser.name;
  document.getElementById('topbar-trophies').textContent = currentUser.trophies||0;
  document.getElementById('cur-gems').textContent        = currentUser.gems||0;
  document.getElementById('cur-coins').textContent       = currentUser.coins||0;
  updateXPBar();
}

function updateXPBar(){
  if(!currentUser) return;
  const xp = currentUser.xp||0, xpMax = currentUser.xpMax||1000;
  document.getElementById('xp-cur').textContent = xp;
  document.getElementById('xp-max').textContent = xpMax;
  document.getElementById('xp-fill').style.width = Math.min(100,xp/xpMax*100)+'%';
}

// ===== MENU CANVAS =====
function initMenuCanvas(){
  const canvas = document.getElementById('menu-canvas');
  if(!canvas) return;
  const W = canvas.offsetWidth||280, H = canvas.offsetHeight||360;
  canvas.width = W; canvas.height = H;

  menuScene    = new THREE.Scene();
  menuCamera   = new THREE.PerspectiveCamera(42, W/H, .1, 50);
  menuCamera.position.set(0, 2.8, 5.5);
  menuCamera.lookAt(0,1,0);

  menuRenderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  menuRenderer.setSize(W, H);
  menuRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  menuRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  menuRenderer.toneMappingExposure = 1.3;

  menuScene.add(new THREE.AmbientLight(0x334466, .9));
  const fl = new THREE.DirectionalLight(0xffeedd, 1.8); fl.position.set(3,6,5); menuScene.add(fl);
  const bl = new THREE.PointLight(0x4466ff, 1.2, 20);   bl.position.set(-4,3,-3); menuScene.add(bl);
  const rl = new THREE.PointLight(0xff6600, .8, 15);    rl.position.set(4,1,2);  menuScene.add(rl);

  updateMenuChar(selectedChar);
  if(menuAnimId) cancelAnimationFrame(menuAnimId);
  animateMenu();
}

function updateMenuChar(idx){
  selectedChar = idx;
  if(currentUser) currentUser.selectedChar = idx;
  if(menuCharMesh) menuScene.remove(menuCharMesh);
  const c = CHARS[idx];
  menuCharMesh = makeCharMesh(c[1], c[3]);
  menuCharMesh.scale.setScalar(1.6);
  menuScene.add(menuCharMesh);

  const col = '#' + c[3].toString(16).padStart(6,'0');
  if(document.getElementById('prev-name')){
    document.getElementById('prev-name').textContent = c[0];
    document.getElementById('prev-name').style.color = col;
    document.getElementById('prev-power').textContent = 11;
  }
  // Update brawler detail panel
  updateBrawlerDetail(idx);
}

function animateMenu(){
  menuAnimId = requestAnimationFrame(animateMenu);
  if(menuCharMesh) menuCharMesh.rotation.y += .012;
  if(menuRenderer) menuRenderer.render(menuScene, menuCamera);
}

// ===== BRAWLER OVERLAY =====
function openBrawlers(){
  document.getElementById('overlay-brawlers').style.display = 'flex';
  buildBrawlerGrid();
}
function openTab(name){
  if(name==='brawlers') openBrawlers();
  else if(name==='quests'){ document.getElementById('overlay-quests').style.display='flex'; buildQuests(); }
  else if(name==='ranking'){ document.getElementById('overlay-ranking').style.display='flex'; buildRanking(); }
  else if(name==='shop') alert('Магазин скоро откроется!');
}
function closeOverlay(id){ document.getElementById(id).style.display='none'; }

function buildBrawlerGrid(){
  // Tabs
  const tabEl = document.getElementById('brawler-tabs');
  if(!tabEl) return;
  let th = `<button class="bclass-tab on" onclick="filterBrawlers(-1)">ВСЕ</button>`;
  CLASSES.forEach((c,i) => { th += `<button class="bclass-tab" onclick="filterBrawlers(${i})">${CICONS[i]} ${c}</button>`; });
  tabEl.innerHTML = th;
  renderBrawlerGrid(-1);
}

function filterBrawlers(ci){
  menuFilterClass = ci;
  document.querySelectorAll('.bclass-tab').forEach((t,i) =>
    t.classList.toggle('on', (ci===-1&&i===0)||(i===ci+1)));
  renderBrawlerGrid(ci);
}

function renderBrawlerGrid(ci){
  const grid = document.getElementById('brawler-grid');
  if(!grid) return;
  let h = '';
  CHARS.forEach((c,i) => {
    if(ci !== -1 && c[1] !== ci) return;
    const col = '#'+c[3].toString(16).padStart(6,'0');
    h += `<div class="bcard${i===selectedChar?' sel':''}" id="bcard${i}" onclick="pickBrawler(${i})">
      <div class="bcard-emoji">${CICONS[c[1]]}</div>
      <div class="bcard-name" style="color:${col}">${c[0]}</div>
      <div class="bcard-class">${CLASSES[c[1]]}</div>
      <div class="bcard-trophies">🏆 0</div>
      <div class="bcard-rarity-stripe" style="background:${RCOLS[c[2]]}"></div>
    </div>`;
  });
  grid.innerHTML = h;
}

function pickBrawler(i){
  selectedChar = i;
  document.querySelectorAll('.bcard').forEach(e => e.classList.remove('sel'));
  const el = document.getElementById('bcard'+i);
  if(el){ el.classList.add('sel'); el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  updateBrawlerDetail(i);
  updateMenuChar(i);
}

function updateBrawlerDetail(idx){
  const detail = document.getElementById('brawler-detail');
  if(!detail) return;
  const c = CHARS[idx];
  const col = '#'+c[3].toString(16).padStart(6,'0');
  const hp = c[4], sp = c[5], dm = c[6], rn = c[7];

  detail.innerHTML = `
    <div class="bd-stats">
      <div class="bd-name" style="color:${col}">${c[0]}</div>
      <div class="bd-class-badge" style="background:${RCOLS[c[2]]}22;color:${RCOLS[c[2]]}">
        ${CICONS[c[1]]} ${CLASSES[c[1]]} &nbsp;·&nbsp; ${RARITIES[c[2]]}
      </div>
      <div class="bd-super-box">
        <div class="bd-super-name">⚡ ${c[9]}</div>
        <div class="bd-super-desc">${c[10]}</div>
      </div>
      ${statBar('HP',hp,12000,'#44ee44')}
      ${statBar('Скорость',sp,6,'#44aaff')}
      ${statBar('Урон',dm,900,'#ff5533')}
      ${statBar('Дальность',rn,26,'#ffaa00')}
    </div>
    <button class="bd-select-btn" onclick="pickBrawler(${idx});closeOverlay('overlay-brawlers')">✔ ВЫБРАТЬ</button>
  `;
}

function statBar(label, val, max, color){
  const pct = Math.min(100, val/max*100);
  return `<div class="bd-stat">
    <div class="bd-stat-label">${label}</div>
    <div class="bd-stat-bar"><div class="bd-stat-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="bd-stat-val">${typeof val==='number'&&val%1!==0?val.toFixed(1):val}</div>
  </div>`;
}

// ===== QUESTS =====
function buildQuests(){
  const list = document.getElementById('quest-list');
  if(!list || !currentUser) return;
  const quests = currentUser.quests || [];
  list.innerHTML = quests.map(q => `
    <div class="quest-item">
      <div class="quest-icon">${q.rewardType==='trophy'?'🏆':q.rewardType==='coins'?'🪙':'💎'}</div>
      <div class="quest-info">
        <div class="quest-title">${q.title}</div>
        <div class="quest-progress">${q.desc} — ${Math.min(q.progress,q.target)}/${q.target}</div>
        <div class="quest-prog-bar"><div class="quest-prog-fill" style="width:${Math.min(100,q.progress/q.target*100)}%"></div></div>
      </div>
      <div class="quest-reward">+${q.reward} ${q.rewardType==='trophy'?'🏆':q.rewardType==='coins'?'🪙':'💎'}</div>
    </div>
  `).join('');
}

// ===== RANKING =====
async function buildRanking(){
  const list = document.getElementById('ranking-list');
  if(!list) return;
  list.innerHTML = '<div style="text-align:center;padding:1rem;color:#556">Загрузка...</div>';
  let players = [];
  try {
    const r = await fetch('http://n1.delonix.one:8004/api/leaderboard');
    players = await r.json();
  } catch(e) {
    // Fallback: show only current user
    if(currentUser) players = [{username:currentUser.name, trophies:currentUser.trophies||0}];
  }
  if(!players.length){
    list.innerHTML='<div style="text-align:center;padding:1rem;color:#556">Нет данных</div>';return;
  }
  list.innerHTML = players.slice(0,50).map((p,i) => {
    const pos=i+1,cls=pos===1?'gold':pos===2?'silver':pos===3?'bronze':'';
    const medal=pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':'';
    const isMe=currentUser&&(p.username||p.name)===currentUser.name;
    return `<div class="rank-item" style="${isMe?'border-color:rgba(255,200,0,.4);background:rgba(255,200,0,.05)':''}">
      <div class="rank-pos ${cls}">${medal||pos}</div>
      <div class="rank-name" style="${isMe?'color:#ffdd44':''}">${p.username||p.name}${isMe?' (Ты)':''}</div>
      <div class="rank-trophies">🏆 ${p.trophies||0}</div>
    </div>`;
  }).join('');
}

// ===== MENU PREVIEW BUTTON =====
document.addEventListener('DOMContentLoaded', () => {
  const selBtn = document.getElementById('btn-select-brawler');
  if(selBtn) selBtn.onclick = openBrawlers;
});

function updateMenuPreview(){
  if(document.getElementById('screen-menu').style.display !== 'none') initMenuLayout();
}
