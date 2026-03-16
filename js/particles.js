'use strict';

let particleMeshes = [];

function spawnBurst(pos, color, count){
  const col = new THREE.Color(color);
  for(let i=0;i<count;i++){
    const geo = new THREE.BoxGeometry(.16,.16,.16);
    const mat = new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.3,roughness:.3});
    const m   = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    const spd=rand(3,10), a=rand(0,Math.PI*2), vy=rand(2,8);
    m.userData = {vx:Math.cos(a)*spd,vy,vz:Math.sin(a)*spd,life:rand(.4,.9),ml:rand(.4,.9)};
    m.userData.ml = m.userData.life;
    scene.add(m); particleMeshes.push(m);
  }
}

function spawnTrail(pos, color){
  const col = new THREE.Color(color);
  const geo = new THREE.SphereGeometry(.08, 4, 3);
  const mat = new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.7});
  const m   = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  m.userData = {vx:rand(-.15,.15),vy:rand(.1,.35),vz:rand(-.15,.15),life:.16,ml:.16};
  scene.add(m); particleMeshes.push(m);
}

function updateParticles(dt){
  for(let i=particleMeshes.length-1;i>=0;i--){
    const m = particleMeshes[i];
    const d = m.userData;
    d.life -= dt;
    if(d.life <= 0){ scene.remove(m); particleMeshes.splice(i,1); continue; }
    const t = d.life/d.ml;
    m.position.x += d.vx*dt;
    m.position.y += d.vy*dt;
    m.position.z += d.vz*dt;
    d.vy -= 12*dt;
    m.scale.setScalar(t);
    if(m.material.transparent) m.material.opacity = t*.8;
  }
}
