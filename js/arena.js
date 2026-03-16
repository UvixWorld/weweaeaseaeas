'use strict';

// ============================================================
//  ARENA — Brawl Stars style tiled maps
// ============================================================

let obstacleObjects = [];
let bushZones       = [];

// Map layouts — 0=empty, 1=wall, 2=bush, 3=crate_spawn
const MAP_TILES_SIZE = 1.8; // world units per tile
const MAPS = [
  { name:'Лесные лилии', theme:'forest',
    layout: [
      [0,0,1,1,0,0,0,0,1,1,0,0],
      [0,0,0,1,0,2,2,0,1,0,0,0],
      [1,0,0,0,2,0,0,2,0,0,0,1],
      [1,0,2,0,0,0,0,0,0,2,0,1],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,2,0,0,1,0,0,1,0,0,2,0],
      [0,2,0,0,1,0,0,1,0,0,2,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [1,0,2,0,0,0,0,0,0,2,0,1],
      [1,0,0,0,2,0,0,2,0,0,0,1],
      [0,0,0,1,0,2,2,0,1,0,0,0],
      [0,0,1,1,0,0,0,0,1,1,0,0],
    ]
  },
  { name:'Пустынный шторм', theme:'desert',
    layout: [
      [0,0,0,1,0,0,0,0,1,0,0,0],
      [0,1,0,0,2,0,0,2,0,0,1,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [1,0,0,2,0,0,0,0,2,0,0,1],
      [0,2,1,0,0,0,0,0,0,1,2,0],
      [0,0,1,0,0,0,0,0,0,1,0,0],
      [0,0,1,0,0,0,0,0,0,1,0,0],
      [0,2,1,0,0,0,0,0,0,1,2,0],
      [1,0,0,2,0,0,0,0,2,0,0,1],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,1,0,0,2,0,0,2,0,0,1,0],
      [0,0,0,1,0,0,0,0,1,0,0,0],
    ]
  },
  { name:'Ядерная зима', theme:'snow',
    layout: [
      [1,0,0,0,1,0,0,1,0,0,0,1],
      [0,0,2,0,0,0,0,0,0,2,0,0],
      [0,2,0,1,0,0,0,0,1,0,2,0],
      [0,0,1,0,2,0,0,2,0,1,0,0],
      [1,0,0,2,0,1,1,0,2,0,0,1],
      [0,0,0,0,1,0,0,1,0,0,0,0],
      [0,0,0,0,1,0,0,1,0,0,0,0],
      [1,0,0,2,0,1,1,0,2,0,0,1],
      [0,0,1,0,2,0,0,2,0,1,0,0],
      [0,2,0,1,0,0,0,0,1,0,2,0],
      [0,0,2,0,0,0,0,0,0,2,0,0],
      [1,0,0,0,1,0,0,1,0,0,0,1],
    ]
  }
];

let currentMapIdx = 0;

function createArena(){
  obstacleObjects = [];
  bushZones       = [];

  const map = MAPS[currentMapIdx];
  const rows = map.layout.length;
  const cols = map.layout[0].length;
  const mapW = cols * MAP_TILES_SIZE;
  const mapH = rows * MAP_TILES_SIZE;
  const offX = -mapW / 2;
  const offZ = -mapH / 2;

  // Ground
  const groundGeo = new THREE.PlaneGeometry(mapW + 8, mapH + 8);
  const groundCol = map.theme==='forest' ? new THREE.Color(.07,.12,.06)
    : map.theme==='desert' ? new THREE.Color(.16,.12,.07)
    : new THREE.Color(.10,.12,.18);
  const groundMat = new THREE.MeshStandardMaterial({color:groundCol, roughness:.95, metalness:0});
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid lines (Brawl Stars style)
  for(let r=0;r<=rows;r++){
    const z = offZ + r * MAP_TILES_SIZE;
    const lineMat = new THREE.MeshBasicMaterial({color:new THREE.Color(.0,.0,.0), transparent:true, opacity:.08, depthWrite:false});
    const line = new THREE.Mesh(new THREE.PlaneGeometry(mapW,.04), lineMat);
    line.rotation.x=-Math.PI/2; line.position.set(0,.005,z); scene.add(line);
  }
  for(let c=0;c<=cols;c++){
    const x = offX + c * MAP_TILES_SIZE;
    const lineMat = new THREE.MeshBasicMaterial({color:new THREE.Color(.0,.0,.0), transparent:true, opacity:.08, depthWrite:false});
    const line = new THREE.Mesh(new THREE.PlaneGeometry(.04,mapH), lineMat);
    line.rotation.x=-Math.PI/2; line.position.set(x,.005,0); scene.add(line);
  }

  // Place tiles
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const tile = map.layout[r][c];
      const wx = offX + c * MAP_TILES_SIZE + MAP_TILES_SIZE/2;
      const wz = offZ + r * MAP_TILES_SIZE + MAP_TILES_SIZE/2;
      if(tile === 1) placeWall(wx, wz, map.theme);
      else if(tile === 2) placeBush(wx, wz, map.theme);
    }
  }

  // Extra decorations
  addDecorations(map.theme, offX, offZ, mapW, mapH);

  // Power boxes — scattered on empty tiles
  addPowerBoxes(map, offX, offZ);

  // Boundary fence
  addBoundaryFence(mapW, mapH);

  // Zone circle
  const zoneMesh = new THREE.Mesh(
    new THREE.RingGeometry(zoneRadius-.1, zoneRadius+.25, 64),
    new THREE.MeshBasicMaterial({color:new THREE.Color(.3,.6,1), transparent:true, opacity:.7, depthWrite:false, side:THREE.DoubleSide})
  );
  zoneMesh.rotation.x = -Math.PI/2; zoneMesh.position.y = .03;
  zoneMesh.userData.isZone = true;
  scene.add(zoneMesh);

  // Lighting
  const hemi = new THREE.HemisphereLight(
    map.theme==='forest' ? 0x2a4422 : map.theme==='desert' ? 0x4a3a22 : 0x2a3a55,
    0x050805, .8
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(
    map.theme==='snow' ? 0xddeeff : 0xffeedd, 1.6
  );
  sun.position.set(12, 30, 18);
  sun.castShadow = true;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -55;
  sun.shadow.camera.right = sun.shadow.camera.top = 55;
  sun.shadow.camera.far = 120;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.001;
  scene.add(sun);

  scene.add(new THREE.AmbientLight(0x0a1208, .7));

  // Atmosphere point lights
  const atmoLights = map.theme==='forest'
    ? [[0x224422,20,0],[0x114411,-20,0]]
    : map.theme==='desert'
    ? [[0x441100,20,0],[0x332200,-20,0]]
    : [[0x113366,20,0],[0x001122,-20,0]];
  atmoLights.forEach(([c,x,z]) => {
    const pl = new THREE.PointLight(c, .7, 40); pl.position.set(x, 4, z); scene.add(pl);
  });
}

function placeWall(x, z, theme){
  const h = rand(2.5, 4.2);
  let wallColor;
  if(theme==='forest')      wallColor = new THREE.Color(.22,.28,.15);
  else if(theme==='desert') wallColor = new THREE.Color(.42,.32,.18);
  else                      wallColor = new THREE.Color(.28,.33,.42);

  const mat = new THREE.MeshStandardMaterial({color:wallColor, roughness:.85, metalness:.12});

  // Brawl Stars style: tiled block cluster
  const baseH = h * .4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(MAP_TILES_SIZE*.9, baseH, MAP_TILES_SIZE*.9), mat);
  base.position.set(x, baseH/2, z);
  base.castShadow = base.receiveShadow = true;
  scene.add(base);

  // Top detail
  const topMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(wallColor).multiplyScalar(.7), roughness:.9, metalness:.1
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(MAP_TILES_SIZE*.85, h*.7, MAP_TILES_SIZE*.85), topMat);
  top.position.set(x, baseH + h*.35, z);
  top.castShadow = true;
  scene.add(top);

  const radius = MAP_TILES_SIZE * .52;
  obstacleObjects.push({pos: new THREE.Vector2(x, z), radius});
}

function placeBush(x, z, theme){
  const r = MAP_TILES_SIZE * .48;
  let bushColor;
  if(theme==='forest')      bushColor = new THREE.Color(.12,.38,.08);
  else if(theme==='desert') bushColor = new THREE.Color(.28,.22,.05);
  else                      bushColor = new THREE.Color(.18,.28,.35);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(r, 16),
    new THREE.MeshStandardMaterial({color:bushColor, roughness:.95, metalness:0})
  );
  disc.rotation.x = -Math.PI/2; disc.position.set(x, .04, z);
  scene.add(disc);

  // Bush stalks
  for(let j=0;j<5;j++){
    const a = rand(0, Math.PI*2), d = rand(0, r*.8);
    const h = rand(.5, 1.0);
    const stalk = new THREE.Mesh(
      new THREE.BoxGeometry(rand(.2,.4), h, rand(.2,.4)),
      new THREE.MeshStandardMaterial({color:new THREE.Color(bushColor).multiplyScalar(1.3), roughness:.95})
    );
    stalk.position.set(x + Math.cos(a)*d, h/2+.04, z + Math.sin(a)*d);
    stalk.rotation.y = rand(0, Math.PI*2);
    scene.add(stalk);
  }
  bushZones.push({pos: new THREE.Vector2(x, z), radius: r});
}

function addDecorations(theme, offX, offZ, mapW, mapH){
  // Scattered rocks / props
  const propCount = 8;
  for(let i=0;i<propCount;i++){
    const px = offX + rand(1, mapW-1);
    const pz = offZ + rand(1, mapH-1);
    if(isNearObstacle(px, pz, 1.5)) continue;

    if(theme==='forest'){
      // Tree stump
      const stumpH = rand(.3,.6);
      const stump = new THREE.Mesh(
        new THREE.CylinderGeometry(rand(.15,.3), rand(.2,.35), stumpH, 7),
        new THREE.MeshStandardMaterial({color:new THREE.Color(.35,.22,.12), roughness:.9})
      );
      stump.position.set(px, stumpH/2, pz);
      scene.add(stump);
    } else if(theme==='desert'){
      // Rock
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rand(.2,.45), 0),
        new THREE.MeshStandardMaterial({color:new THREE.Color(.55,.45,.28), roughness:.85})
      );
      rock.position.set(px, rand(.1,.3), pz);
      rock.rotation.y = rand(0, Math.PI*2);
      scene.add(rock);
    } else {
      // Snow pile
      const pile = new THREE.Mesh(
        new THREE.SphereGeometry(rand(.2,.4), 8, 6),
        new THREE.MeshStandardMaterial({color:new THREE.Color(.88,.92,.96), roughness:.5})
      );
      pile.scale.y = .4; pile.position.set(px, .08, pz);
      scene.add(pile);
    }
  }
}

function addPowerBoxes(map, offX, offZ){
  const rows = map.layout.length;
  const cols = map.layout[0].length;
  let count = 0;
  for(let r=0;r<rows&&count<18;r++){
    for(let c=0;c<cols&&count<18;c++){
      if(map.layout[r][c] !== 0) continue;
      if(Math.random() > .35) continue;
      const wx = offX + c*MAP_TILES_SIZE + MAP_TILES_SIZE/2;
      const wz = offZ + r*MAP_TILES_SIZE + MAP_TILES_SIZE/2;
      if(!isNearObstacle(wx, wz, 1.0)){
        powerBoxes.push(new PowerBox(new THREE.Vector3(wx, 0, wz)));
        count++;
      }
    }
  }
}

function addBoundaryFence(mapW, mapH){
  const fenceColor = new THREE.Color(.12,.16,.22);
  const fenceMat   = new THREE.MeshStandardMaterial({color:fenceColor, roughness:.8, metalness:.3});
  const postH = 1.5;
  const hw = mapW/2, hh = mapH/2;

  // 4 walls
  [[0, hh+.15, mapW+.6, .3],[-hw-.15, 0, .3, mapH+.6],
   [0,-hh-.15, mapW+.6, .3],[ hw+.15, 0, .3, mapH+.6]].forEach(([x,z,w,d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, postH, d), fenceMat);
    wall.position.set(x, postH/2, z);
    scene.add(wall);
  });

  // Glow strip on boundary
  const glowMat = new THREE.MeshBasicMaterial({color:0x2244aa, transparent:true, opacity:.4, depthWrite:false, side:THREE.DoubleSide});
  const glowTop = new THREE.Mesh(new THREE.PlaneGeometry(mapW+.6, .12), glowMat);
  glowTop.rotation.x=-Math.PI/2;
  [[0,hh+.15],[0,-hh-.15]].forEach(([x,z]) => {
    const g=glowTop.clone();g.position.set(x,postH+.01,z);scene.add(g);
  });
}

function isNearObstacle(x, z, minDist){
  for(const o of obstacleObjects){
    if(Math.sqrt((x-o.pos.x)**2+(z-o.pos.y)**2) < o.radius + minDist) return true;
  }
  return false;
}

function isInBush(x, z){
  for(const b of bushZones){
    if(Math.sqrt((x-b.pos.x)**2+(z-b.pos.y)**2) < b.radius) return true;
  }
  return false;
}

function getMapBounds(){
  const map = MAPS[currentMapIdx];
  const rows = map.layout.length;
  const cols = map.layout[0].length;
  return {
    minX: -(cols*MAP_TILES_SIZE)/2,
    maxX:  (cols*MAP_TILES_SIZE)/2,
    minZ: -(rows*MAP_TILES_SIZE)/2,
    maxZ:  (rows*MAP_TILES_SIZE)/2,
  };
}

function getRandomSpawnPos(){
  const bounds = getMapBounds();
  let x, z, attempts=0;
  do {
    x = rand(bounds.minX+2, bounds.maxX-2);
    z = rand(bounds.minZ+2, bounds.maxZ-2);
    attempts++;
  } while(isNearObstacle(x, z, 1.5) && attempts < 30);
  return new THREE.Vector3(x, 0, z);
}
