'use strict';

// ============================================================
//  BULLET
// ============================================================
class Bullet {
  constructor(owner, pos, dir, cfg){
    this.owner      = owner; this.alive = true;
    this.fromPlayer = owner.isPlayer;
    this.pos        = pos.clone(); this.dir = dir.clone().normalize();
    this.speed      = cfg.speed;
    this.dmg        = owner.dmg * (cfg.dmgMult||1);
    this.range      = owner.atkRange * (cfg.rangeMult||1);
    this.pierce     = cfg.pierce||false;
    this.bounce     = cfg.bounce||0;
    this.bounces    = 0;
    this.healOnHit  = cfg.healOnHit||0;
    this.travelDist = 0;
    this.trailTimer = 0;

    const col = new THREE.Color(owner.color);
    const geo = new THREE.SphereGeometry(cfg.size||.14, 6, 5);
    const mat = new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.8,roughness:.1,metalness:.3});
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  update(dt){
    if(!this.alive) return;
    const mv = this.speed * dt;
    this.pos.addScaledVector(this.dir, mv);
    this.travelDist += mv;
    this.mesh.position.copy(this.pos);

    this.trailTimer -= dt;
    if(this.trailTimer <= 0){ this.trailTimer=.03; spawnTrail(this.pos.clone(), this.owner.color); }

    if(this.travelDist >= this.range || this.pos.y < -.5){ this.destroy(); return; }

    // Map bounds
    const b = getMapBounds();
    if(this.pos.x < b.minX||this.pos.x > b.maxX||this.pos.z < b.minZ||this.pos.z > b.maxZ){
      this.destroy(); return;
    }

    // Obstacle bounce/stop
    for(const o of obstacleObjects){
      const dx=this.pos.x-o.pos.x, dz=this.pos.z-o.pos.y;
      if(dx*dx+dz*dz < (o.radius+.25)**2){
        if(this.bounces < this.bounce){
          this.bounces++;
          const n=new THREE.Vector3(dx,0,dz).normalize();
          this.dir.reflect(n);
          this.pos.addScaledVector(this.dir,.3);
        } else { this.destroy(); return; }
      }
    }

    // Hit player
    if(!this.fromPlayer && playerEntity && playerEntity.alive){
      if(this.pos.distanceTo(playerEntity.pos) < .85){
        playerEntity.takeDamage(this.dmg, this.owner);
        if(this.healOnHit > 0) this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp+this.healOnHit);
        if(!this.pierce){ this.destroy(); return; }
      }
    }

    // Hit bots
    for(const t of botEntities){
      if(!t.alive) continue;
      if(t === this.owner) continue;
      if(this.pos.distanceTo(t.pos) < .85*(1+t.cubes*.025)){
        t.takeDamage(this.dmg * (this.fromPlayer?1:.55), this.owner);
        if(this.healOnHit > 0 && this.fromPlayer) this.owner.hp=Math.min(this.owner.maxHp,this.owner.hp+this.healOnHit);
        if(!this.pierce){ this.destroy(); return; }
      }
    }
  }

  destroy(){
    if(!this.alive) return;
    this.alive = false;
    scene.remove(this.mesh);
  }
}

// ============================================================
//  LOB PROJECTILE
// ============================================================
class LobProjectile {
  constructor(owner, startPos, cfg){
    this.owner      = owner; this.alive = true;
    this.fromPlayer = owner.isPlayer;
    this.startPos   = startPos.clone();
    this.aoe        = cfg.aoe||2.5;
    this.dmg        = owner.dmg;
    this.fuseTime   = cfg.fuseTime||1.5;
    this.timer      = 0;

    // Target position
    const d = new THREE.Vector3(owner.aimDir.x, 0, owner.aimDir.z);
    this.targetPos = startPos.clone().addScaledVector(d, cfg.range||12);

    const col = new THREE.Color(owner.color);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(.28, 7, 6),
      new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.8})
    );
    this.mesh.position.copy(startPos);
    scene.add(this.mesh);

    // Target indicator ring
    this.ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(this.aoe-.1, this.aoe+.1, 24),
      new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide})
    );
    this.ringMesh.rotation.x = -Math.PI/2;
    this.ringMesh.position.set(this.targetPos.x, .03, this.targetPos.z);
    scene.add(this.ringMesh);
  }

  update(dt){
    if(!this.alive) return;
    this.timer += dt;
    const t = this.timer / this.fuseTime;
    this.mesh.position.x = lerp(this.startPos.x, this.targetPos.x, t);
    this.mesh.position.z = lerp(this.startPos.z, this.targetPos.z, t);
    this.mesh.position.y = 4 * Math.sin(t * Math.PI);
    this.mesh.rotation.y += dt*5;
    // Pulse ring
    this.ringMesh.material.opacity = .35 + .25*Math.sin(Date.now()*.01);
    if(this.timer >= this.fuseTime) this.explode();
  }

  explode(){
    if(!this.alive) return;
    this.alive = false;
    scene.remove(this.mesh); scene.remove(this.ringMesh);
    spawnBurst(new THREE.Vector3(this.targetPos.x,.5,this.targetPos.z), this.owner.color, 22);

    const all = [playerEntity,...botEntities];
    for(const t of all){
      if(!t||!t.alive||t===this.owner) continue;
      if(this.pos && this.targetPos && t.pos.distanceTo(this.targetPos) < this.aoe){
        t.takeDamage(this.dmg, this.owner);
        showDmgNum(t.pos, Math.round(this.dmg), this.fromPlayer?'#ffdd44':'#ff4444');
      }
    }
  }
}

function spawnBullet(owner, pos, dir, cfg){
  projectiles.push(new Bullet(owner, pos, dir, cfg));
}
function spawnLob(owner, pos, cfg){
  projectiles.push(new LobProjectile(owner, pos, cfg));
}
