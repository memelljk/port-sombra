// lawtide.js — the wanted system and the Port Sombra police: heat, stars,
// interceptor chases that ram, foot officers at high stars, the BUSTED
// meter, and heat decay when the hero breaks line of sight.
window.PS = window.PS || {};

PS.wanted = { stars: 0, heat: 0, quietTime: 0, busted: 0, active: false };
PS.policePool = [];
PS.officers = [];

PS.initPolice = function (scene) {
  PS.policePool = []; PS.officers = [];
  for (let i = 0; i < 6; i++) {
    const car = PS.makeCar('interceptor', 30 + i * 6, -172, 0, 0xd8dee6);
    car.police = true; car.active = false; car.group.visible = true;
    scene.add(car.group); PS.policePool.push(car);
  }
  for (let i = 0; i < 4; i++) {
    const g = PS.makeHumanoid({ shirt: 0x1d2f4a, pants: 0x141a26, skin: 0xc9976b, vest: 0x0e1420, hat: 0x1d2f4a });
    g.visible = false; scene.add(g);
    PS.officers.push({ group: g, x: 0, z: 0, angle: 0, walkPhase: 0, active: false, health: 60, shootT: 0 });
  }
};
PS.commitCrime = function (points, x, z) {
  // a crime only heats the hero when someone could report it
  let witnessed = PS.wanted.stars > 0;
  if (!witnessed && PS.peds) for (const p of PS.peds) { if (Math.hypot(p.x - x, p.z - z) < 30) { witnessed = true; break; } }
  if (!witnessed && PS.policePool) for (const c of PS.policePool) { if (c.active && Math.hypot(c.x - x, c.z - z) < 55) { witnessed = true; break; } }
  if (!witnessed) return;
  PS.wanted.heat += points; PS.wanted.quietTime = 0;
  const target = Math.min(5, Math.floor(PS.wanted.heat / 2));
  if (target > PS.wanted.stars) { PS.wanted.stars = target; PS.banner('WANTED ' + target + ' STAR' + (target > 1 ? 'S' : '')); }
  PS.wanted.active = PS.wanted.stars > 0;
};
PS.setWanted = function (stars) {
  PS.wanted.stars = Math.max(0, Math.min(5, stars));
  PS.wanted.heat = PS.wanted.stars * 2; PS.wanted.active = PS.wanted.stars > 0;
};
PS.clearWanted = function () { PS.setWanted(0); PS.wanted.busted = 0; };

function spawnNear(car, hero) {
  const a = Math.random() * Math.PI * 2, d = 62 + Math.random() * 22;
  let x = hero.x + Math.sin(a) * d, z = hero.z + Math.cos(a) * d;
  // snap to the nearest road line so cruisers arrive on streets
  const snap = function (v) { return Math.round((v + 160) / 40) * 40 - 160; };
  if (Math.abs(x) < 170) x = snap(x); z = Math.max(-175, Math.min(175, z));
  car.x = x; car.z = z; car.speed = 0; car.active = true; car.dead = false; car.health = 100;
  car.group.visible = true; car.group.position.set(x, 0, z);
}
PS.updatePolice = function (dt) {
  const hero = PS.hero, w = PS.wanted;
  if (!hero) return;
  const wantActive = w.stars === 0 ? 0 : Math.min(6, w.stars + 1);
  let activeCount = 0;
  for (const car of PS.policePool) if (car.active && !car.dead) activeCount++;
  for (const car of PS.policePool) {
    if (!car.active && activeCount < wantActive && !hero.dead) { spawnNear(car, hero); activeCount++; }
    if (car.active && w.stars === 0) { car.active = false; car.group.position.set(30 + PS.policePool.indexOf(car) * 6, 0, -172); car.x = car.group.position.x; car.z = -172; }
    if (!car.active || car.dead) continue;
    // chase steering toward the hero (or his vehicle)
    const tx = hero.inCar ? hero.inCar.x : hero.x, tz = hero.inCar ? hero.inCar.z : hero.z;
    const dx = tx - car.x, dz = tz - car.z, dist = Math.hypot(dx, dz);
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const top = PS.CAR_KINDS.interceptor.top * (dist > 30 ? 1 : 0.82);
    car.speed += Math.max(-26 * dt, Math.min(PS.CAR_KINDS.interceptor.accel * dt, top - car.speed));
    let nx = car.x + Math.sin(car.angle) * car.speed * dt, nz = car.z + Math.cos(car.angle) * car.speed * dt;
    const fixed = PS.collide(nx, nz, 1.3);
    if (fixed[0] !== nx || fixed[1] !== nz) car.speed *= 0.55;
    car.x = Math.max(-182, Math.min(168, fixed[0])); car.z = Math.max(-182, Math.min(182, fixed[1]));
    car.group.position.set(car.x, 0, car.z); car.group.rotation.y = car.angle;
    // ram: shove and damage the hero's ride
    const victim = hero.inCar;
    if (victim && Math.hypot(victim.x - car.x, victim.z - car.z) < 3.4 && Math.abs(car.speed) > 6) {
      victim.health -= 7; victim.speed *= 0.8; PS.shake = Math.min(0.5, (PS.shake || 0) + 0.22);
    }
    car.lampMesh.visible = Math.floor(PS.time * 5) % 2 === 0 || w.stars >= 3;
  }
  // foot officers at 4+ stars
  const wantOfficers = w.stars >= 4 ? 2 : 0;
  PS.officers.forEach(function (o, i) {
    if (i < wantOfficers && !o.active && !hero.inCar) {
      o.active = true; o.group.visible = true; o.health = 60;
      o.x = hero.x + (i === 0 ? 14 : -14); o.z = hero.z + 10;
    }
    if (w.stars < 4 || hero.inCar) { o.active = false; o.group.visible = false; }
    if (!o.active) return;
    const dx = hero.x - o.x, dz = hero.z - o.z, dist = Math.hypot(dx, dz);
    o.angle = Math.atan2(dx, dz);
    if (dist > 9) { o.x += Math.sin(o.angle) * 3.4 * dt; o.z += Math.cos(o.angle) * 3.4 * dt; PS.walkAnimate(o, dt, true); }
    else { PS.walkAnimate(o, dt, false); o.shootT -= dt; if (o.shootT <= 0) { o.shootT = 0.9; PS.enemyShoot(o, hero); } }
    o.group.position.set(o.x, o.group.position.y, o.z); o.group.rotation.y = o.angle;
  });
  // BUSTED meter + heat decay
  let closePolice = false;
  for (const car of PS.policePool) if (car.active && Math.hypot(car.x - hero.x, car.z - hero.z) < 9) closePolice = true;
  for (const o of PS.officers) if (o.active && Math.hypot(o.x - hero.x, o.z - hero.z) < 6) closePolice = true;
  const heroSpeed = hero.inCar ? Math.abs(hero.inCar.speed) : Math.abs(hero.speed);
  if (w.stars > 0 && closePolice && heroSpeed < 2.2) {
    w.busted += dt * 0.34;
    if (w.busted >= 1) { PS.die('busted'); w.busted = 0; }
  } else w.busted = Math.max(0, w.busted - dt * 0.5);
  if (w.stars > 0) {
    const anyNear = PS.policePool.some(function (c) { return c.active && Math.hypot(c.x - hero.x, c.z - hero.z) < 48; });
    if (!anyNear) { w.quietTime += dt; if (w.quietTime > 16) { PS.setWanted(w.stars - 1); w.quietTime = 0; if (w.stars === 0) PS.banner('YOU LOST THEM'); } }
    else w.quietTime = 0;
  }
};
