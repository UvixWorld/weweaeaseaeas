'use strict';

// ============================================================
//  POWER BOX
// ============================================================
class PowerBox {
  constructor(pos){
    this.pos = pos.clone(); this.alive = true;
    const geo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const mat = new THREE.MeshStandardMaterial({
      color:new THREE.Color(.7,.55,.15),
      emissive:new THREE.Color(.3,.2,.0),emissiveIntensity:.6,roughness:.5,metalness:.3
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(pos.x, .5, pos.z);
    this.mesh.rotation.y = rand(0, Math.PI*2);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.light = new THREE.PointLight(0xffcc00, 1.2, 4);
    this.light.position.set(pos.x, 1.2, pos.z); scene.add(this.light);
    // Cross symbol on top
    const cMat = new THREE.MeshStandardMaterial({color:new THREE.Color(.9,.6,.0),emissive:new THREE.Color(.6,.3,.0),emissiveIntensity:1});
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(.6,.1,.1), cMat); c1.position.y = .51;
    const c2 = c1.clone(); c2.rotation.y = Math.PI/2;
    this.mesh.add(c1, c2);
  }
  update(dt){
    if(!this.alive) return;
    this.mesh.rotation.y += dt * .5;
    this.light.intensity = 1 + .4 * Math.sin(Date.now() * .003);
  }
  destroy(){
    if(!this.alive) return; this.alive = false;
    spawnBurst(this.pos.clone().add(new THREE.Vector3(0,.6,0)), 0xffcc00, 18);
    scene.remove(this.mesh); scene.remove(this.light);
    for(let i=0;i<2;i++){
      const off = new THREE.Vector3(rand(-1.2,1.2), 0, rand(-1.2,1.2));
      powerCubeItems.push(new PowerCubeItem(this.pos.clone().add(off)));
    }
  }
}

// ============================================================
//  POWER CUBE ITEM
// ============================================================
class PowerCubeItem {
  constructor(pos){
    this.pos = pos.clone(); this.alive = true;
    const mat = new THREE.MeshStandardMaterial({
      color:new THREE.Color(.55,.15,1),emissive:new THREE.Color(.35,.05,.7),emissiveIntensity:1,roughness:.2,metalness:.4
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.4), mat);
    this.mesh.position.set(pos.x, .55, pos.z);
    scene.add(this.mesh);
    this.light = new THREE.PointLight(0xaa44ff, .9, 3.5);
    this.light.position.set(pos.x, .8, pos.z); scene.add(this.light);
  }
  update(dt){
    if(!this.alive) return;
    this.mesh.rotation.y += dt * 2;
    this.mesh.rotation.x += dt * 1.2;
    this.mesh.position.y = .5 + Math.sin(Date.now()*.004)*.18;
    this.light.position.y = this.mesh.position.y;
  }
  collect(){
    if(!this.alive) return;
    this.alive = false;
    scene.remove(this.mesh); scene.remove(this.light);
  }
}

// ============================================================
//  ENTITY BASE
// ============================================================
class Entity {
  constructor(charIdx, startPos, isPlayer=false){
    const c = CHARS[charIdx];
    this.charIdx    = charIdx;
    this.name       = c[0]; this.classIdx = c[1];
    this.rarity     = c[2]; this.color    = c[3];
    this.maxHp      = c[4]; this.hp       = c[4];
    // FIXED SPEED: multiply by 4.8 for world units/sec — comparable to Brawl Stars
    this.baseSpeed  = c[5] * 4.8;
    this.speed      = this.baseSpeed;
    this.baseDmg    = c[6]; this.dmg      = c[6];
    this.atkRange   = c[7]; this.atkSpd   = c[8];
    this.atkCfg     = ATKCONF[c[1]];
    this.isPlayer   = isPlayer; this.alive = true;
    this.pos        = startPos.clone();
    this.aimDir     = new THREE.Vector3(0,0,-1);
    this.atkTimer   = 0;
    this.superCharge = 0;
    this.cubes      = 0;
    this.invincTimer = 0;
    this.recentDmg  = 0;
    this.inBush     = false;
    this.statusEffects = {freeze:0,stun:0,invis:0,berserk:0,shield:0};

    // 3D mesh
    this.mesh = makeCharMesh(c[1], c[3]);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);

    // HP bar DOM element (visible above head)
    this.hpBarEl = document.createElement('div');
    this.hpBarEl.className = 'entity-hp-bar';
    this.hpBarEl.innerHTML = `
      <div class="ehp-name" id="ehpn_${charIdx}_${Date.now()}">${c[0]}</div>
      <div class="ehp-bg"><div class="ehp-fill" style="background:#44ee44;width:100%"></div></div>
    `;
    this.hpFillEl  = this.hpBarEl.querySelector('.ehp-fill');
    this.hpNameEl  = this.hpBarEl.querySelector('.ehp-name');
    if(isPlayer) this.hpBarEl.style.display = 'none'; // player uses HUD instead
    document.getElementById('screen-game').appendChild(this.hpBarEl);
  }

  collectCube(){
    if(this.cubes >= 11) return;
    this.cubes++;
    this.dmg    = this.baseDmg * (1 + this.cubes * .1);
    this.maxHp  = CHARS[this.charIdx][4] + this.cubes * 200;
    this.hp     = Math.min(this.hp + 280, this.maxHp);
    if(this.isPlayer){ updateHUD(); updateQuestProgress('cubes', 1); }
    spawnBurst(this.pos.clone().add(new THREE.Vector3(0,2,0)), 0xaa44ff, 8);
  }

  takeDamage(amount, fromEntity=null){
    if(!this.alive || this.invincTimer > 0 || this.statusEffects.shield > 0) return;
    const dmg = Math.round(amount);
    this.hp = Math.max(0, this.hp - dmg);
    this.recentDmg += dmg;
    this.invincTimer = .1;

    // Flash
    this.mesh.traverse(ch => {
      if(!ch.isMesh || ch.userData.isGlow) return;
      const orig = ch.userData.origMat = ch.userData.origMat || ch.material;
      ch.material = new THREE.MeshStandardMaterial({color:0xffffff,emissive:new THREE.Color(1,1,1)});
      setTimeout(() => { if(ch.userData.origMat) ch.material = ch.userData.origMat; }, 80);
    });

    if(this.isPlayer){ showDmgNum(this.pos, dmg, '#ff4444'); updateHUD(); }
    else              { showDmgNum(this.pos, dmg, '#ffdd44'); }

    if(this.hp <= 0) this.die(fromEntity);
  }

  die(killer=null){
    if(!this.alive) return;
    this.alive = false;

    // Drop cubes
    const dropCount = Math.min(this.cubes, 4);
    for(let i=0;i<dropCount;i++){
      const off = new THREE.Vector3(rand(-1.8,1.8), 0, rand(-1.8,1.8));
      powerCubeItems.push(new PowerCubeItem(this.pos.clone().add(off)));
    }

    spawnBurst(this.pos.clone().add(new THREE.Vector3(0,1,0)), this.color, 30);
    scene.remove(this.mesh);
    this.hpBarEl.remove();
    playersAlive--;

    if(killer){
      const killerName = killer.isPlayer ? 'Ты' : killer.name;
      addKillFeed(killerName, this.name);
      killer.superCharge = Math.min(100, killer.superCharge + 28);
      if(killer.isPlayer){ playerKills++; updateHUD(); updateQuestProgress('kills',1); }
      totalKills++;
    }

    if(this.isPlayer){
      gameOver = true;
      const rank = playersAlive + 1;
      setTimeout(() => showResults(rank, false), 1500);
    } else {
      checkWin();
    }
  }

  attack(){
    if(this.atkTimer > 0) return;
    if(this.statusEffects.stun > 0 || this.statusEffects.freeze > 0) return;
    const cfg = this.atkCfg;
    this.atkTimer = 1 / this.atkSpd;
    const origin = this.pos.clone().add(new THREE.Vector3(0,.8,0));

    if(cfg.type === 'lob'){
      spawnLob(this, origin, cfg);
    } else if(cfg.type === 'burst3'){
      for(let b=0;b<3;b++){
        setTimeout(() => {
          if(!this.alive) return;
          const d = new THREE.Vector3().copy(this.aimDir);
          const r = rot2D(d, (Math.random()-.5)*cfg.spread);
          d.x=r.x; d.z=r.z;
          spawnBullet(this, this.pos.clone().add(new THREE.Vector3(0,.8,0)), d, cfg);
        }, b * (cfg.burstDelay||.1) * 1000);
      }
    } else if(cfg.type === 'dual'){
      for(let i=0;i<2;i++){
        setTimeout(() => {
          if(!this.alive) return;
          const d = new THREE.Vector3().copy(this.aimDir);
          const r = rot2D(d, (Math.random()-.5)*cfg.spread);
          d.x=r.x; d.z=r.z;
          spawnBullet(this, this.pos.clone().add(new THREE.Vector3(0,.8,0)), d, cfg);
        }, i*80);
      }
    } else {
      const count = cfg.bullets;
      for(let i=0;i<count;i++){
        const a = count>1 ? (i/(count-1) - .5) * cfg.spread : 0;
        const d = new THREE.Vector3().copy(this.aimDir);
        const r = rot2D(d, a); d.x=r.x; d.z=r.z;
        spawnBullet(this, origin, d, cfg);
      }
    }

    this.superCharge = Math.min(100, this.superCharge + 7);
    if(this.isPlayer) updateHUD();
  }

  useSuper(){
    if(this.superCharge < 100) return;
    this.superCharge = 0;
    if(this.isPlayer) updateHUD();
    activateSuper(this);
  }

  updateHPBar(){
    if(!this.alive || this.isPlayer) return;
    const s = worldToScreen(this.pos.clone().add(new THREE.Vector3(0,2.4,0)), camera);
    if(!s.visible){
      this.hpBarEl.style.display = 'none';
      return;
    }
    this.hpBarEl.style.display = 'block';
    this.hpBarEl.style.left = s.x + 'px';
    this.hpBarEl.style.top  = s.y + 'px';
    const pct = Math.max(0, this.hp / this.maxHp * 100);
    this.hpFillEl.style.width = pct + '%';
    this.hpFillEl.style.background = pct > 50 ? '#44ee44' : pct > 25 ? '#ffaa00' : '#ff3333';
    // Adjust bar width based on distance
    const dx = this.pos.x-(playerEntity?playerEntity.pos.x:0);
    const dz = this.pos.z-(playerEntity?playerEntity.pos.z:0);
    const dist = Math.sqrt(dx*dx+dz*dz);
    const bw = clamp(70 - dist*1.5, 30, 70);
    this.hpBarEl.querySelector('.ehp-bg').style.width = bw+'px';
  }

  update(dt){
    if(!this.alive) return;
    this.atkTimer     = Math.max(0, this.atkTimer - dt);
    this.invincTimer  = Math.max(0, this.invincTimer - dt);
    this.recentDmg    = Math.max(0, this.recentDmg - 60*dt);
    for(const k in this.statusEffects) this.statusEffects[k] = Math.max(0, this.statusEffects[k]-dt);

    // Clamp to map bounds
    const b = getMapBounds();
    this.pos.x = clamp(this.pos.x, b.minX+.8, b.maxX-.8);
    this.pos.z = clamp(this.pos.z, b.minZ+.8, b.maxZ-.8);

    // Push out of obstacles
    for(const o of obstacleObjects){
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.y;
      const d  = Math.sqrt(dx*dx+dz*dz);
      const minD = o.radius + .75;
      if(d < minD && d > .01){
        this.pos.x += (dx/d)*(minD-d);
        this.pos.z += (dz/d)*(minD-d);
      }
    }

    this.mesh.position.copy(this.pos);

    // Glow pulse
    const glowMesh = this.mesh.children.find(c => c.userData.isGlow);
    if(glowMesh){
      glowMesh.material.opacity = .3 + this.cubes*.04 + .15*Math.sin(Date.now()*.004);
    }

    // Scale with cubes
    this.mesh.scale.setScalar(1 + this.cubes*.025);

    // Bush
    this.inBush = isInBush(this.pos.x, this.pos.z);
    if(!this.isPlayer){
      this.mesh.traverse(c => {
        if(!c.isMesh) return;
        c.material.transparent = this.inBush;
        c.material.opacity = this.inBush ? .45 : 1;
      });
    }

    // Auto collect cubes
    for(const cube of powerCubeItems){
      if(!cube.alive) continue;
      if(this.pos.distanceTo(cube.pos) < 1.6){ cube.collect(); this.collectCube(); }
    }

    // Auto collect/damage boxes (walk into)
    for(const box of powerBoxes){
      if(!box.alive) continue;
      if(this.pos.distanceTo(box.pos) < 1.2){ box.destroy(); this.superCharge=Math.min(100,this.superCharge+5); }
    }

    // Zone damage
    const dFromCenter = Math.sqrt((this.pos.x-zoneX)**2+(this.pos.z-zoneZ)**2);
    if(dFromCenter > zoneRadius){
      this._zoneDmgTimer = (this._zoneDmgTimer||0) + dt;
      if(this._zoneDmgTimer >= .5){ this._zoneDmgTimer=0; this.takeDamage(this.maxHp*.018); }
    } else { this._zoneDmgTimer = 0; }

    this.updateHPBar();
  }
}

// ============================================================
//  PLAYER
// ============================================================
class Player extends Entity {
  constructor(charIdx){
    super(charIdx, getRandomSpawnPos(), true);
  }
  update(dt){
    if(!this.alive) return;
    const spd = this.speed * (this.statusEffects.berserk>0?1.7:1);
    let dx=0, dz=0;
    if(keys['KeyW']||keys['ArrowUp'])    dz-=1;
    if(keys['KeyS']||keys['ArrowDown'])  dz+=1;
    if(keys['KeyA']||keys['ArrowLeft'])  dx-=1;
    if(keys['KeyD']||keys['ArrowRight']) dx+=1;
    if(dx||dz){ const l=Math.sqrt(dx*dx+dz*dz); dx/=l; dz/=l; }
    this.pos.x += dx*spd*dt;
    this.pos.z += dz*spd*dt;

    // Face aim
    if(Math.abs(aimPoint.x-this.pos.x)+Math.abs(aimPoint.z-this.pos.z) > .1){
      this.aimDir.set(aimPoint.x-this.pos.x, 0, aimPoint.z-this.pos.z).normalize();
      this.mesh.rotation.y = Math.atan2(this.aimDir.x, this.aimDir.z);
    }

    if(lmbDown) this.attack();
    super.update(dt);

    // Camera follow
    camera.position.x = lerp(camera.position.x, this.pos.x,    .09);
    camera.position.z = lerp(camera.position.z, this.pos.z+14,  .09);
    camera.lookAt(this.pos.x, 0, this.pos.z);

    // Zone vignette
    const d = Math.sqrt((this.pos.x-zoneX)**2+(this.pos.z-zoneZ)**2);
    document.getElementById('vignette').classList.toggle('danger', d > zoneRadius-.5);
  }
}

// ============================================================
//  BOT AI — improved: better targetting, cover use, retreat
// ============================================================
class Bot extends Entity {
  constructor(charIdx, pos){
    super(charIdx, pos, false);
    this.state            = 'ROAM';
    this.targetEnt        = null;
    this.roamTarget       = null;
    this.thinkTimer       = rand(.25, .55);
    this.strafeDir        = Math.random() < .5 ? 1 : -1;
    this.strafeTimer      = rand(1.2, 3);
    this.aggressionLevel  = rand(.35, 1.0);
    this.reactionDelay    = rand(.1, .38);
    this.reactionTimer    = 0;
    this.retreatTimer     = 0;
    this.coverTarget      = null;
    this.memory           = {}; // remembers last seen positions
  }

  think(){
    const myPow = this.cubes;
    let nearEnt=null, nearEntDist=Infinity;
    let nearBox=null, nearBoxDist=Infinity;
    let nearCube=null, nearCubeDist=Infinity;

    for(const e of allEntities){
      if(e===this||!e.alive) continue;
      // Skip entities fully hidden in bush (50% chance to detect)
      if(e.inBush && Math.random() < .5) continue;
      const d = this.pos.distanceTo(e.pos);
      if(d < nearEntDist){ nearEntDist=d; nearEnt=e; }
    }
    for(const b of powerBoxes){
      if(!b.alive) continue;
      const d = this.pos.distanceTo(b.pos);
      if(d < nearBoxDist){ nearBoxDist=d; nearBox=b; }
    }
    for(const c of powerCubeItems){
      if(!c.alive) continue;
      const d = this.pos.distanceTo(c.pos);
      if(d < nearCubeDist){ nearCubeDist=d; nearCube=c; }
    }

    // Zone priority
    const inZone = Math.sqrt((this.pos.x-zoneX)**2+(this.pos.z-zoneZ)**2) < zoneRadius-2;
    if(!inZone){
      this.state='ROAM';
      this.roamTarget = new THREE.Vector3(zoneX+rand(-4,4), 0, zoneZ+rand(-4,4));
      return;
    }

    // Health-based retreat
    if(this.hp < this.maxHp * .25){
      this.state = 'FLEE'; this.targetEnt = nearEnt; return;
    }

    // Flee from significantly stronger enemy
    if(nearEnt && nearEntDist < 12 && nearEnt.cubes > myPow+5 && this.hp < this.maxHp*.5){
      this.state = 'FLEE'; this.targetEnt = nearEnt; return;
    }

    // Engage if close enough and not too weak
    if(nearEnt && nearEntDist < this.atkRange*2.5+5){
      const powerDiff = myPow - nearEnt.cubes;
      if(powerDiff >= -3 * (1 - this.aggressionLevel)){
        if(!this.targetEnt||!this.targetEnt.alive||this.pos.distanceTo(this.targetEnt.pos)>nearEntDist+8){
          this.targetEnt = nearEnt;
        }
        this.state = 'ENGAGE'; return;
      }
    }

    // Collect floating cubes
    if(nearCube && nearCubeDist < 14){
      this.state = 'COLLECT'; this._collectTarget = nearCube; return;
    }

    // Collect power boxes
    if(nearBox && nearBoxDist < 18 && myPow < 7){
      this.state = 'COLLECT_BOX'; this.targetEnt = nearBox; return;
    }

    // Roam
    if(this.state !== 'ROAM' || !this.roamTarget || this.pos.distanceTo(this.roamTarget) < 2){
      this.state = 'ROAM';
      const a=rand(0,Math.PI*2), d=rand(3,(zoneRadius||20)*.8);
      this.roamTarget = new THREE.Vector3(zoneX+Math.cos(a)*d, 0, zoneZ+Math.sin(a)*d);
    }
  }

  moveToward(target, spd, dt, avoid=true){
    if(!target) return;
    let dir = new THREE.Vector3().subVectors(target, this.pos);
    dir.y = 0;
    if(dir.length() < .25) return;
    dir.normalize();
    if(avoid){
      let avoidVec = new THREE.Vector3();
      for(const o of obstacleObjects){
        const dx=this.pos.x-o.pos.x, dz=this.pos.z-o.pos.y;
        const d=Math.sqrt(dx*dx+dz*dz);
        if(d<o.radius+1.8&&d>.01) avoidVec.add(new THREE.Vector3(dx/d,0,dz/d).multiplyScalar((o.radius+1.8-d)*.9));
      }
      dir.add(avoidVec).normalize();
    }
    this.pos.addScaledVector(dir, spd*dt);
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }

  update(dt){
    if(!this.alive) return;
    this.thinkTimer -= dt;
    if(this.thinkTimer <= 0){ this.thinkTimer = rand(.3,.55); this.think(); }
    this.strafeTimer -= dt;
    if(this.strafeTimer <= 0){ this.strafeTimer=rand(1.5,3.5); this.strafeDir*=-1; }

    const spd = this.speed * (this.statusEffects.berserk>0?1.7:1) * .85;

    switch(this.state){
      case 'ROAM':
        if(this.roamTarget) this.moveToward(this.roamTarget, spd*.72, dt);
        break;

      case 'COLLECT':
        if(this._collectTarget && this._collectTarget.alive){
          this.moveToward(this._collectTarget.pos, spd*.9, dt);
        } else { this.state='ROAM'; }
        break;

      case 'COLLECT_BOX':
        if(this.targetEnt && this.targetEnt.alive){
          const d = this.pos.distanceTo(this.targetEnt.pos);
          if(d > this.atkRange+.5){
            this.moveToward(this.targetEnt.pos, spd*.88, dt);
          } else {
            const dir = new THREE.Vector3().subVectors(this.targetEnt.pos, this.pos).normalize();
            this.aimDir.copy(dir); this.mesh.rotation.y=Math.atan2(dir.x,dir.z);
            this.attack();
          }
        } else { this.state='ROAM'; }
        break;

      case 'ENGAGE':
        if(this.targetEnt && this.targetEnt.alive){
          const toEnt = new THREE.Vector3().subVectors(this.targetEnt.pos, this.pos);
          const dist  = toEnt.length(); toEnt.normalize();

          // Strafe + approach
          const strafe   = new THREE.Vector3(-toEnt.z,0,toEnt.x).multiplyScalar(this.strafeDir);
          const idealDist = this.atkRange * .8;
          const approach  = dist>idealDist ? toEnt.clone() : dist<idealDist*.4 ? toEnt.clone().negate() : new THREE.Vector3();
          const moveDir   = new THREE.Vector3().addVectors(approach, strafe.multiplyScalar(.55)).normalize();

          // Obstacle avoidance
          let avoid = new THREE.Vector3();
          for(const o of obstacleObjects){
            const dx=this.pos.x-o.pos.x, dz=this.pos.z-o.pos.y;
            const d2=Math.sqrt(dx*dx+dz*dz);
            if(d2<o.radius+1.8&&d2>.01) avoid.add(new THREE.Vector3(dx/d2,0,dz/d2).multiplyScalar(1.6));
          }
          moveDir.add(avoid).normalize();
          this.pos.addScaledVector(moveDir, spd*dt);

          this.aimDir.copy(toEnt);
          this.mesh.rotation.y = Math.atan2(toEnt.x, toEnt.z);

          this.reactionTimer -= dt;
          if(this.reactionTimer <= 0 && dist <= this.atkRange+1.5){
            this.reactionTimer = this.reactionDelay;
            this.attack();
          }
          if(this.superCharge >= 100 && Math.random() < .55) this.useSuper();
        } else { this.state='ROAM'; }
        break;

      case 'FLEE':
        if(this.targetEnt && this.targetEnt.alive){
          const away    = new THREE.Vector3().subVectors(this.pos, this.targetEnt.pos).normalize();
          const toCent  = new THREE.Vector3(zoneX-this.pos.x, 0, zoneZ-this.pos.z).normalize();
          const fleeDir = new THREE.Vector3().addVectors(away.multiplyScalar(.7), toCent.multiplyScalar(.3)).normalize();
          this.pos.addScaledVector(fleeDir, spd*1.1*dt);
          this.mesh.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);
        } else { this.state='ROAM'; }
        break;
    }
    super.update(dt);
  }
}

// ============================================================
//  SUPERS
// ============================================================
function activateSuper(ent){
  spawnBurst(ent.pos.clone().add(new THREE.Vector3(0,1,0)), 0xffffff, 14);
  const ci = ent.classIdx;
  const targets = () => ent.isPlayer ? botEntities : [playerEntity,...botEntities].filter(e=>e&&e.alive&&e!==ent);

  if(ci===0){ // Brawler CHARGE
    ent.statusEffects.shield = .4;
    const dir = new THREE.Vector3().copy(ent.aimDir);
    let steps=0;
    const iv = setInterval(()=>{
      if(!ent.alive||steps>14){clearInterval(iv);return;}
      steps++; ent.pos.addScaledVector(dir,.65);
      for(const t of targets()) if(ent.pos.distanceTo(t.pos)<2) t.takeDamage(ent.dmg*.7,ent);
    },28);
  }
  else if(ci===1){ // Sniper RAIL
    const dir = new THREE.Vector3().copy(ent.aimDir);
    for(let d=0;d<28;d+=.5){ spawnTrail(ent.pos.clone().addScaledVector(dir,d),ent.color); spawnTrail(ent.pos.clone().addScaledVector(dir,d),0xffffff); }
    for(const t of targets()){
      const toT=new THREE.Vector3().subVectors(t.pos,ent.pos);
      const proj=toT.dot(dir);
      if(proj>0&&proj<28){ const perp=toT.clone().addScaledVector(dir,-proj); if(perp.length()<1.5) t.takeDamage(ent.dmg*3,ent); }
    }
  }
  else if(ci===2){ // Thrower BIG BOMB
    const bigCfg = {...ent.atkCfg, aoe:5.5, fuseTime:1.0};
    spawnLob(ent, ent.pos.clone().add(new THREE.Vector3(0,1,0)), bigCfg);
  }
  else if(ci===3){ // Tank SHIELD
    ent.statusEffects.shield = 2.8;
    spawnBurst(ent.pos.clone().add(new THREE.Vector3(0,1,0)), 0x4488ff, 20);
  }
  else if(ci===4){ // Assassin TELEPORT
    let nearest=null, nearestD=Infinity;
    for(const t of targets()){ const d=ent.pos.distanceTo(t.pos); if(d<nearestD){nearestD=d;nearest=t;} }
    if(nearest){
      const behind = new THREE.Vector3().subVectors(ent.pos, nearest.pos).normalize();
      ent.pos.copy(nearest.pos).addScaledVector(behind, 1.5);
      nearest.takeDamage(ent.dmg*2, ent);
      spawnBurst(ent.pos.clone().add(new THREE.Vector3(0,1,0)), ent.color, 15);
    }
  }
  else if(ci===5){ // Healer HEAL
    ent.hp = Math.min(ent.maxHp, ent.hp + 2500);
    spawnBurst(ent.pos.clone().add(new THREE.Vector3(0,1.5,0)), 0x88ff88, 25);
    if(ent.isPlayer) updateHUD();
  }
  else if(ci===6){ // Mage NOVA
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
      spawnBullet(ent, ent.pos.clone().add(new THREE.Vector3(0,.8,0)), dir, {...ent.atkCfg,range:14,dmgMult:1.2,speed:16});
    }
  }
  else if(ci===7){ // Mech TURRET
    ent.statusEffects.turret=3;
    const iv=setInterval(()=>{
      if(!ent.alive||ent.statusEffects.turret<=0){clearInterval(iv);return;}
      ent.attack();
    },120);
    setTimeout(()=>clearInterval(iv),3000);
  }
  else if(ci===8){ // Beast BERSERK
    ent.statusEffects.berserk = 3;
    spawnBurst(ent.pos.clone().add(new THREE.Vector3(0,1,0)), ent.color, 18);
  }
  else { // Legend SUPERNOVA
    spawnBurst(ent.pos.clone().add(new THREE.Vector3(0,1,0)), ent.color, 40);
    for(const t of targets()){
      if(ent.pos.distanceTo(t.pos) < 9) t.takeDamage(ent.dmg*2.5, ent);
    }
  }
  if(ent.isPlayer) showAnnounce(CHARS[ent.charIdx][9].toUpperCase()+'!', ent.color, 1500);
}
