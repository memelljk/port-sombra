// tidecrowd.js — the pedestrians of Port Sombra: 44 walkers who stroll the
// road edges, flee gunfire and police chases, and can be robbed at gunpoint.
window.PS = window.PS || {};

PS.PED_SHIRTS = [0xb5493a, 0x3a6fb5, 0xd8b13e, 0x3fae6a, 0xd8dee6, 0x7a4fae, 0xe07b39, 0x2ec4b6, 0xc7517a, 0x8a93a0];
PS.peds = [];
PS.spawnPeds = function (scene, seed) {
  const rnd = PS.mulberry32(seed * 7 + 13);
  PS.peds = [];
  for (let i = 0; i < 44; i++) {
    const shirt = PS.PED_SHIRTS[i % PS.PED_SHIRTS.length];
    const group = PS.makeHumanoid({ shirt: shirt, skin: [0xc9976b, 0x8a5a3b, 0xe0b08a][i % 3] }); // pants derived from shirt
    const onV = rnd() > 0.5, road = (onV ? PS.VROADS : PS.HROADS)[Math.floor(rnd() * 9)];
    const along = -165 + rnd() * 330, side = rnd() > 0.5 ? 7.4 : -7.4;
    const ped = {
      group: group, x: onV ? road + side : along, z: onV ? along : road + side,
      angle: rnd() * 6.28, speed: 0, walkPhase: rnd() * 6, state: 'stroll', timer: 2 + rnd() * 5,
      axis: onV ? 'z' : 'x', dir: rnd() > 0.5 ? 1 : -1, road: road, side: side, robbed: false, robTimer: 0, health: 100
    };
    if (ped.x > 168) ped.x = 150;
    group.position.set(ped.x, 0, ped.z);
    scene.add(group); PS.peds.push(ped);
  }
  return PS.peds;
};
PS.updatePeds = function (dt) {
  const hero = PS.hero; if (!hero) return;
  const danger = PS.lastGunfire && (PS.time - PS.lastGunfire < 4);
  for (const p of PS.peds) {
    const dx = p.x - hero.x, dz = p.z - hero.z, distH = Math.hypot(dx, dz);
    if (p.state !== 'flee' && danger && distH < 26) { p.state = 'flee'; p.timer = 2.5; }
    if (p.state !== 'flee' && PS.wanted && PS.wanted.stars >= 3 && distH < 15) { p.state = 'flee'; p.timer = 2; }
    // robbery at gunpoint: hero aims from a few metres away
    if (!p.robbed && hero.aiming && !hero.inCar && distH > 1.2 && distH < 6.5) {
      p.state = 'held'; p.robTimer += dt;
      if (p.robTimer > 1.2) {
        p.robbed = true; p.state = 'flee'; p.timer = 3;
        const loot = 10 + Math.floor(Math.random() * 20);
        PS.addCash(loot); PS.commitCrime(1, p.x, p.z);
        PS.banner('ROBBED +$' + loot);
      }
    } else if (p.state === 'held') { p.state = 'stroll'; p.robTimer = 0; }
    let moving = false, spd = 0;
    if (p.state === 'flee') {
      p.timer -= dt; p.angle = Math.atan2(dx, dz); spd = 5.4; moving = true;
      if (p.timer <= 0) p.state = 'stroll';
    } else if (p.state === 'stroll') {
      p.timer -= dt; spd = 1.6; moving = true;
      if (p.timer <= 0) { p.timer = 3 + Math.random() * 5; if (Math.random() > 0.6) p.dir *= -1; }
      p.angle = p.axis === 'z' ? (p.dir > 0 ? 0 : Math.PI) : (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    if (moving) {
      let nx = p.x + Math.sin(p.angle) * spd * dt, nz = p.z + Math.cos(p.angle) * spd * dt;
      const fixed = PS.collide(nx, nz, 0.5); p.x = fixed[0]; p.z = fixed[1];
      p.x = Math.max(-182, Math.min(168, p.x)); p.z = Math.max(-182, Math.min(182, p.z));
    }
    PS.walkAnimate(p, dt, moving);
  }
};
PS.countPeds = function () { return PS.peds.length; };
