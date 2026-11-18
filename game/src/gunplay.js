// gunplay.js — pistol combat for Port Sombra: mouse aim, tracers, reload,
// melee, thugs who shoot back, and damage to people and cars.
window.PS = window.PS || {};

PS.gun = { ammo: 12, mag: 12, reserve: 60, reloading: 0, cooldown: 0 };
PS.tracers = [];
PS.thugs = [];

PS.initCombat = function (scene) {
  PS.combatScene = scene; PS.tracers = []; PS.thugs = [];
};
function tracer(scene, x1, y1, z1, x2, y2, z2, color) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x1, y1, z1, x2, y2, z2]), 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.95, fog: false }));
  scene.add(line); PS.tracers.push({ line: line, life: 0.07 });
}
PS.updateTracers = function (dt) {
  for (let i = PS.tracers.length - 1; i >= 0; i--) {
    const t = PS.tracers[i]; t.life -= dt;
    if (t.life <= 0) { PS.combatScene.remove(t.line); t.line.geometry.dispose(); PS.tracers.splice(i, 1); }
  }
  for (const th of PS.thugs) if (th.flash) { th.flash.life -= dt; if (th.flash.life <= 0) { th.group.children.forEach(function () {}); th.flash = null; } }
};
function hitFlash(obj) { obj.flash = { life: 0.1 }; }

PS.heroShoot = function () {
  const hero = PS.hero, gun = PS.gun;
  if (!hero || hero.inCar || hero.inBoat || gun.cooldown > 0 || gun.reloading > 0) return;
  if (gun.ammo <= 0) { PS.startReload(); return; }
  gun.ammo--; gun.cooldown = 0.16; PS.lastGunfire = PS.time;
  PS.audio && PS.audio.sfx('shot');
  const dir = PS.aimDirection(); // from the orbit camera through the crosshair
  const ox = hero.x, oy = 1.45, oz = hero.z;
  let bestT = 60, best = null;
  const test = function (obj, x, z, r, h) {
    const dx = x - ox, dz = z - oz, t = dx * dir.x + dz * dir.z;
    if (t < 0.5 || t > bestT) return;
    const px = ox + dir.x * t, pz = oz + dir.z * t;
    if (Math.hypot(px - x, pz - z) < r) { bestT = t; best = { obj: obj, h: h }; }
  };
  for (const th of PS.thugs) if (!th.dead) test(th, th.x, th.z, 0.75, 34);
  for (const o of PS.officers) if (o.active) test(o, o.x, o.z, 0.75, 34);
  for (const p of PS.peds) test(p, p.x, p.z, 0.7, 100);
  for (const c of PS.vehicles) if (!c.dead) test(c, c.x, c.z, 2.0, 16);
  for (const c of PS.policePool) if (c.active && !c.dead) test(c, c.x, c.z, 2.0, 16);
  tracer(PS.combatScene, ox, oy, oz, ox + dir.x * bestT, oy + dir.y * bestT, oz + dir.z * bestT, 0xffe9a8);
  if (best) {
    const o = best.obj;
    if (o.health !== undefined) { o.health -= best.h; hitFlash(o); }
    if (o === hero) return;
    if (o.health !== undefined && o.health <= 0 && !o.dead) {
      if (o.group && PS.thugs.indexOf(o) >= 0 || PS.officers.indexOf(o) >= 0) { o.dead = true; o.active = false; o.group.rotation.x = Math.PI / 2; o.group.position.y = 0.3; PS.addRep(4); PS.commitCrime(2, o.x, o.z); }
      else if (o.group && o.group.userData.car) { o.dead = true; PS.commitCrime(1, o.x, o.z); }
      else { o.state = 'flee'; o.timer = 4; PS.commitCrime(2, o.x, o.z); PS.damageHero(0); PS.banner('CIVILIAN DOWN — HEAT UP'); }
    } else if (best.h > 0) PS.commitCrime(1, hero.x, hero.z);
  } else PS.commitCrime(1, hero.x, hero.z);
  PS.HUD.refresh();
};
PS.startReload = function () {
  const gun = PS.gun;
  if (gun.reloading > 0 || gun.ammo === gun.mag || gun.reserve <= 0) return;
  gun.reloading = 1.1; PS.audio && PS.audio.sfx('reload');
};
PS.updateGun = function (dt) {
  const gun = PS.gun;
  gun.cooldown = Math.max(0, gun.cooldown - dt);
  if (gun.reloading > 0) {
    gun.reloading -= dt;
    if (gun.reloading <= 0) { const take = Math.min(gun.mag - gun.ammo, gun.reserve); gun.ammo += take; gun.reserve -= take; PS.HUD.refresh(); }
  }
};
PS.melee = function () {
  const hero = PS.hero; if (!hero || hero.inCar || hero.inBoat) return;
  PS.audio && PS.audio.sfx('swing');
  for (const th of PS.thugs) if (!th.dead && Math.hypot(th.x - hero.x, th.z - hero.z) < 2.3) {
    th.health -= 45; PS.commitCrime(1, th.x, th.z);
    if (th.health <= 0) { th.dead = true; th.group.rotation.x = Math.PI / 2; th.group.position.y = 0.3; PS.addRep(4); }
  }
  for (const p of PS.peds) if (Math.hypot(p.x - hero.x, p.z - hero.z) < 2.1) { p.state = 'flee'; p.timer = 3; PS.commitCrime(1, p.x, p.z); }
};
PS.spawnThug = function (x, z) {
  const g = PS.makeHumanoid({ shirt: 0x5a1f1f, pants: 0x1c1c22, skin: 0x8a5a3b, hat: 0x5a1f1f });
  g.position.set(x, 0, z); PS.combatScene.add(g);
  const th = { group: g, x: x, z: z, angle: 0, walkPhase: 0, health: 60, dead: false, shootT: 1 + Math.random() * 1.4 };
  PS.thugs.push(th); return th;
};
PS.enemyShoot = function (shooter, target) {
  const tx = target.inCar ? target.inCar.x : target.x, tz = target.inCar ? target.inCar.z : target.z;
  tracer(PS.combatScene, shooter.x, 1.4, shooter.z, tx, 1.1, tz, 0xff6a5e);
  PS.audio && PS.audio.sfx('shot');
  PS.lastGunfire = PS.time;
  if (Math.random() > 0.42) {
    if (target.inCar) { target.inCar.health -= 4; PS.damageHero(2); }
    else PS.damageHero(6 + Math.random() * 5);
  }
};
PS.updateThugs = function (dt) {
  const hero = PS.hero; if (!hero) return;
  for (const th of PS.thugs) {
    if (th.dead) continue;
    const dx = hero.x - th.x, dz = hero.z - th.z, dist = Math.hypot(dx, dz);
    th.angle = Math.atan2(dx, dz);
    if (dist > 13) { th.x += Math.sin(th.angle) * 3.1 * dt; th.z += Math.cos(th.angle) * 3.1 * dt; PS.walkAnimate(th, dt, true); }
    else {
      PS.walkAnimate(th, dt, false);
      th.shootT -= dt;
      if (th.shootT <= 0 && dist < 30) { th.shootT = 1 + Math.random() * 1.1; PS.enemyShoot(th, hero); }
    }
    th.group.position.set(th.x, th.group.position.y, th.z); th.group.rotation.y = th.angle;
  }
};
PS.clearThugs = function () {
  for (const th of PS.thugs) PS.combatScene.remove(th.group);
  PS.thugs = [];
};
