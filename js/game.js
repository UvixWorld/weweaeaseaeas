'use strict';

// ============================================================
//  GAME GLOBALS
// ============================================================
let scene, camera, renderer, animId;
let playerEntity = null;
let botEntities  = [];
let allEntities  = [];
let projectiles  = [];
let powerBoxes   = [];
let powerCubeItems = [];

let gameOver = false;
let totalKills = 0, playerKills = 0;
let playersAlive = 10;
let gameTime = 0;
let zoneRadius = ZONE_START, zoneX = 0, zoneZ = 0;

const keys = {};
let lmbDown = false;
let mouseNDC = new THREE.Vector2();
let aimPoint = new THREE.Vector3();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const raycaster   = new THREE.Raycaster();
const clock       = new THREE.Clock();

// ============================================================
//  INIT SCENE
// ============================================================
function initScene(){
  scene    = new THREE.Scene();
  scene.background = new THREE.Color(.04,.06,.10);
  scene.fog = new THREE.FogExp2(0x030810, .018);

  const W = window.innerWidth, H = window.innerHeight;
  camera = new THREE.PerspectiveCamera(55, W/H, .1, 250);
  camera.position.set(0, 20, 14);
  camera.lookAt(0, 0, 0);

  const canvas = document.getElementById('gameCanvas');
  canvas.width  = W;
  canvas.height = H;

  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled    = true;
  renderer.shadowMap.type       = THREE.PCFSoftShadowMap;
  renderer.toneMapping          = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure  = 1.2;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================================
//  INPUT
// ============================================================
function setupInput(){
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if(e.code==='Space'){ e.preventDefault(); playerEntity&&playerEntity.useSuper(); }
  });
  document.addEventListener('keyup', e => keys[e.code] = false);
  document.addEventListener('mousemove', e => {
    mouseNDC.x = (e.clientX/window.innerWidth)*2-1;
    mouseNDC.y = -(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouseNDC, camera);
    raycaster.ray.intersectPlane(groundPlane, aimPoint);
  });
  document.addEventListener('mousedown', e => {
    if(e.button===0) lmbDown=true;
    if(e.button===2){ e.preventDefault(); playerEntity&&playerEntity.useSuper(); }
  });
  document.addEventListener('mouseup', e => { if(e.button===0) lmbDown=false; });
  document.addEventListener('contextmenu', e => e.preventDefault());
}

// ============================================================
//  SPAWN BOTS
// ============================================================
function spawnBots(){
  botEntities = [];
  const usedIdx = new Set([selectedChar]);
  for(let i=0;i<9;i++){
    let ci;
    let tries=0;
    do { ci=Math.floor(Math.random()*CHARS.length); tries++; }
    while(usedIdx.has(ci) && usedIdx.size<CHARS.length && tries<50);
    usedIdx.add(ci);
    botEntities.push(new Bot(ci, getRandomSpawnPos()));
  }
}

// ============================================================
//  CHECK WIN
// ============================================================
function checkWin(){
  if(!playerEntity||!playerEntity.alive) return;
  const aliveOthers = botEntities.filter(e=>e.alive);
  if(aliveOthers.length === 0){
    gameOver = true;
    setTimeout(()=>showResults(1, true), 1500);
  }
}

// ============================================================
//  SHOW RESULTS
// ============================================================
function showResults(rank, isWin){
  document.getElementById('screen-results').style.display = 'flex';
  const banner = document.getElementById('res-banner');
  banner.className = 'results-rank-banner' + (isWin?' win':'');
  document.getElementById('res-place').textContent = rank===1?'1 🏆':rank;

  // Trophy change
  const trophyChange = calcTrophyChange(rank, 10);
  if(currentUser){
    addTrophies(trophyChange);
    // Quest: top 1
    if(rank===1&&currentUser.quests){
      currentUser.quests.forEach(q=>{ if(q.id==='q1') q.progress=Math.min(q.target,q.progress+1); });
    }
    saveCurrentUser();
  }

  document.getElementById('res-trophies').textContent =
    (trophyChange>=0?'+':'') + trophyChange + ' 🏆';

  document.getElementById('res-stats').innerHTML = `
    <div class="rstat-row"><span class="rstat-label">Место</span><span class="rstat-val">#${rank} из 10</span></div>
    <div class="rstat-row"><span class="rstat-label">Убийства</span><span class="rstat-val">${playerKills}</span></div>
    <div class="rstat-row"><span class="rstat-label">Кубы силы</span><span class="rstat-val">${playerEntity?playerEntity.cubes:0}</span></div>
    <div class="rstat-row"><span class="rstat-label">Трофеи</span><span class="rstat-val">${currentUser?currentUser.trophies:0} 🏆</span></div>
  `;

  // Results canvas
  const canvas = document.getElementById('res-canvas');
  if(canvas&&window.THREE){
    const W=160,H=200;
    canvas.width=W;canvas.height=H;
    const s=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(42,W/H,.1,50);
    cam.position.set(0,2.5,5);cam.lookAt(0,1,0);
    const rend=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    rend.setSize(W,H);rend.toneMapping=THREE.ACESFilmicToneMapping;rend.toneMappingExposure=1.3;
    s.add(new THREE.AmbientLight(0x334466,.9));
    const fl=new THREE.DirectionalLight(0xffeedd,1.8);fl.position.set(3,6,5);s.add(fl);
    const c=CHARS[selectedChar];
    const m=makeCharMesh(c[1],c[3]);m.scale.setScalar(1.4);s.add(m);
    let rf; function loop(){rf=requestAnimationFrame(loop);m.rotation.y+=.015;rend.render(s,cam);}
    loop();
    setTimeout(()=>cancelAnimationFrame(rf),8000);
  }
}

// ============================================================
//  MAIN LOOP
// ============================================================
function animate(){
  animId = requestAnimationFrame(animate);
  if(gameOver) return;
  const dt = Math.min(clock.getDelta(), .05);
  gameTime += dt;

  // Shrink zone
  const shrinkT = clamp(gameTime / ZONE_SHRINK_DUR, 0, 1);
  zoneRadius    = lerp(ZONE_START, ZONE_END, shrinkT);
  // Update zone ring
  scene.traverse(o => {
    if(o.userData.isZone && o.isMesh){
      o.geometry.dispose();
      o.geometry = new THREE.RingGeometry(Math.max(.5,zoneRadius-.12), zoneRadius+.22, 64);
    }
  });

  if(playerEntity&&playerEntity.alive) playerEntity.update(dt);
  for(const b of botEntities) if(b.alive) b.update(dt);

  allEntities = [playerEntity, ...botEntities];

  for(let i=projectiles.length-1;i>=0;i--){
    if(projectiles[i].alive) projectiles[i].update(dt);
    else projectiles.splice(i,1);
  }

  for(const b of powerBoxes)      b.update(dt);
  for(let i=powerCubeItems.length-1;i>=0;i--){
    if(powerCubeItems[i].alive) powerCubeItems[i].update(dt);
    else powerCubeItems.splice(i,1);
  }

  updateParticles(dt);
  updateHUD();
  updateZoneTimer();
  drawMinimap();
  renderer.render(scene, camera);
}

// ============================================================
//  START GAME
// ============================================================
function startGame(){
  if(animId) cancelAnimationFrame(animId);
  if(menuAnimId) cancelAnimationFrame(menuAnimId);
  if(mmAnimId) cancelAnimationFrame(mmAnimId);
  if(renderer) renderer.dispose();

  // Clear old DOM HP bars
  document.querySelectorAll('.entity-hp-bar').forEach(e=>e.remove());
  document.querySelectorAll('.dmgnum').forEach(e=>e.remove());

  document.getElementById('screen-game').style.display   = 'block';
  document.getElementById('hud').style.display           = 'block';
  document.getElementById('screen-results').style.display= 'none';
  document.getElementById('screen-menu').style.display   = 'none';
  document.getElementById('screen-matchmaking').style.display = 'none';

  // Reset
  projectiles=[]; powerBoxes=[]; powerCubeItems=[]; particleMeshes=[];
  obstacleObjects=[]; bushZones=[]; gameOver=false;
  gameTime=0; totalKills=0; playerKills=0; playersAlive=10;
  zoneRadius=ZONE_START;

  // Pick random map
  currentMapIdx = Math.floor(Math.random()*MAPS.length);

  initScene();
  createArena();
  setupInput();

  const c = CHARS[selectedChar];
  document.getElementById('hud-portrait').textContent = CICONS[c[1]];
  document.getElementById('hud-pname').textContent    = currentUser ? currentUser.name : 'Игрок';

  playerEntity = new Player(selectedChar);
  spawnBots();
  allEntities  = [playerEntity, ...botEntities];

  clock.start();
  animate();
  showAnnounce('ШОУДАУН!', 0xffffff, 2200);
}

// ============================================================
//  RESTART / BACK
// ============================================================
function restartGame(){
  document.getElementById('screen-results').style.display = 'none';
  document.querySelectorAll('.entity-hp-bar').forEach(e=>e.remove());
  document.querySelectorAll('.dmgnum').forEach(e=>e.remove());
  startGame();
}

function backMenu(){
  if(animId) cancelAnimationFrame(animId);
  document.getElementById('screen-results').style.display = 'none';
  document.getElementById('screen-game').style.display    = 'none';
  document.getElementById('hud').style.display            = 'none';
  document.querySelectorAll('.entity-hp-bar').forEach(e=>e.remove());
  document.getElementById('screen-menu').style.display    = 'flex';
  updateTopbar();
  // Restart menu preview
  if(menuScene) menuScene.clear();
  initMenuCanvas();
}

// CSS animation for super ready state
const superStyle = document.createElement('style');
superStyle.textContent = `
@keyframes superReady {
  from { filter: brightness(1); }
  to   { filter: brightness(1.5) saturate(1.5); }
}`;
document.head.appendChild(superStyle);
