// sombragen.js — seeded generation of Port Sombra (seed 11 by default).
// Six districts on a 40-unit road grid. Building and streetlight counts are
// STRUCTURAL: district quotas sum to exactly 252 buildings, and the lamp
// loops (8 vertical roads x 34 lamps x 2 sides + 8 horizontal roads x 34)
// sum to exactly 816 streetlights. Asserted by PS.assertCounts().
window.PS = window.PS || {};

PS.VROADS = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
PS.HROADS = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
PS.WATER_X = 172; // harbor water begins east of this line

PS.DISTRICTS = [
  { name: "Neon Quay", cols: [5, 6, 7], rows: [5, 6, 7], quota: 48, palette: [0x2b3f66, 0x3a2b55, 0x274b5a], hMin: 12, hMax: 34, neon: '#40e0ff' },
  { name: "Container Yards", cols: [5, 6, 7], rows: [0, 1, 2], quota: 36, palette: [0x4a3a28, 0x39424e, 0x503030], hMin: 7, hMax: 13, neon: '#ffb03e' },
  { name: "Cannery Row", cols: [0, 1, 2], rows: [5, 6, 7], quota: 44, palette: [0x54382a, 0x3f4a2e, 0x5a2e3a], hMin: 6, hMax: 14, neon: '#ff9e5e' },
  { name: "The Terraces", cols: [0, 1, 2], rows: [0, 1, 2], quota: 56, palette: [0x33415e, 0x2e4a4a, 0x463a5e], hMin: 18, hMax: 44, neon: '#c792ff' },
  { name: "Ferry Point", cols: [6, 7], rows: [3, 4], quota: 32, palette: [0x2e4a5e, 0x3a5a48, 0x51465e], hMin: 9, hMax: 20, neon: '#7df0ff' },
  { name: "Smuggler's Cove", cols: [3, 4], rows: [6, 7], quota: 36, palette: [0x3d4a2a, 0x4a3428, 0x2e4050], hMin: 5, hMax: 10, neon: '#5effa1' }
];
PS.SIGN_WORDS = ['NEON TIDE', 'BAO NINE', 'GULL PAWN', 'SALT & SONS', 'TIDEPOOL INK', 'HARROW ARMS', 'CLINIC', 'CHANDLERY', 'NOODLE 9', 'HOTEL BRINE', 'RUM ROW', 'FERRY', 'CUSTOMS', 'ICE HOUSE', 'VELVET EEL', 'DOCK 7', 'CANNERY', 'TERRACES'];

PS.generateCity = function (scene, seed) {
  const rnd = PS.mulberry32(seed);
  const colliders = [];
  const bodyItems = [], glowItems = [], poleItems = [], lampItems = [], roadItems = [], lineItems = [];
  let buildingCount = 0, lightCount = 0;
  const signSpots = [];

  // --- ground, roads, water ---
  const groundTex = PS.groundTexture('#232a33', '#9fb6c9'); groundTex.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshLambertMaterial({ map: groundTex, color: 0x8fa3b5 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(30, -0.05, 0); scene.add(ground);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x0a2436, emissive: 0x03141d });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(320, 560), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(PS.WATER_X + 160, -0.35, 0); scene.add(water);
  PS.waterMesh = water;
  for (const x of PS.VROADS) roadItems.push(PS.boxItem(10, 0.06, 344, 0x1a2027, x, 0.01, 0));
  for (const z of PS.HROADS) roadItems.push(PS.boxItem(344, 0.06, 10, 0x1a2027, 0, 0.012, z));
  for (const x of PS.VROADS) for (let i = 0; i < 16; i++) lineItems.push(PS.boxItem(0.35, 0.02, 6, 0xd8c95a, x, 0.05, -160 + i * 21));
  for (const z of PS.HROADS) for (let i = 0; i < 16; i++) lineItems.push(PS.boxItem(6, 0.02, 0.35, 0xd8c95a, -160 + i * 21, 0.05, z));
  scene.add(PS.bakedMesh(roadItems));
  scene.add(PS.bakedMesh(lineItems, { basic: true }));

  // --- streetlights: 8x34x2 + 8x34x1 = 816, structural ---
  const lampHeads = [];
  for (let r = 0; r < 8; r++) {
    const x = PS.VROADS[r];
    for (let i = 0; i < 34; i++) {
      const z = -165 + i * 10;
      for (const side of [-6.2, 6.2]) { poleItems.push(PS.boxItem(0.22, 5.4, 0.22, 0x39424e, x + side, 2.7, z)); lampHeads.push([x + side, 5.5, z]); lightCount++; }
    }
  }
  for (let r = 0; r < 8; r++) {
    const z = PS.HROADS[r];
    for (let i = 0; i < 34; i++) {
      const x = -165 + i * 10;
      poleItems.push(PS.boxItem(0.22, 5.4, 0.22, 0x39424e, x, 2.7, z + 6.2)); lampHeads.push([x, 5.5, z + 6.2]); lightCount++;
    }
  }
  for (const h of lampHeads) glowItems.push(PS.boxItem(0.9, 0.3, 0.9, 0xffca7a, h[0], h[1], h[2]));
  scene.add(PS.bakedMesh(poleItems));

  // --- buildings per district quota: total exactly 252 ---
  for (const d of PS.DISTRICTS) {
    const cells = [];
    for (const c of d.cols) for (const r of d.rows) cells.push([c, r]);
    const base = Math.floor(d.quota / cells.length), extra = d.quota % cells.length;
    cells.forEach(function (cell, ci) {
      const n = base + (ci < extra ? 1 : 0);
      const cx = -140 + cell[0] * 40, cz = -140 + cell[1] * 40;
      const offs = [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, 0], [-8, 0], [8, 0], [0, -8], [0, 8]];
      for (let i = 0; i < n; i++) {
        const o = offs[i % offs.length];
        const bx = cx + o[0] + (rnd() - 0.5) * 2.4, bz = cz + o[1] + (rnd() - 0.5) * 2.4;
        const w = 9 + rnd() * 5, dep = 9 + rnd() * 5, h = d.hMin + rnd() * (d.hMax - d.hMin);
        const col = d.palette[Math.floor(rnd() * d.palette.length)];
        bodyItems.push(PS.boxItem(w, h, dep, col, bx, h / 2, bz));
        bodyItems.push(PS.boxItem(w + 0.8, 0.7, dep + 0.8, 0x1c222c, bx, h + 0.35, bz));
        // emissive window band scaled by building size, front face
        const bands = Math.max(1, Math.floor(h / 7));
        for (let b = 0; b < bands; b++) glowItems.push(PS.boxItem(w * 0.82, 0.55, 0.2, rnd() > 0.4 ? 0xffd98a : 0x8fe8ff, bx, 3 + b * 6.5, bz + dep / 2 + 0.08));
        colliders.push({ x: bx, z: bz, hw: w / 2 + 0.4, hd: dep / 2 + 0.4 });
        if (buildingCount % 14 === 0) signSpots.push({ x: bx, z: bz, hd: dep / 2, word: PS.SIGN_WORDS[(buildingCount / 14) % PS.SIGN_WORDS.length], color: d.neon });
        buildingCount++;
      }
    });
  }

  // --- harbor dressing: containers, cranes, stalls, palms, pier, lighthouse ---
  const dressItems = [];
  const contCols = [0xb5493a, 0x3a6fb5, 0x3fae6a, 0xc7a23a, 0x7a4fae];
  for (let i = 0; i < 90; i++) {
    const cx = 52 + rnd() * 108, cz = -168 + rnd() * 104, lvl = Math.floor(rnd() * 3);
    dressItems.push(PS.boxItem(11, 2.6, 4.4, contCols[Math.floor(rnd() * contCols.length)], cx, 1.3 + lvl * 2.7, cz, rnd() > 0.5 ? 0 : Math.PI / 2));
  }
  for (const cx of [86, 118, 148]) for (const cz of [-148, -96]) { // crane legs + boom
    dressItems.push(PS.boxItem(1.2, 17, 1.2, 0x8a93a0, cx - 5, 8.5, cz - 4)); dressItems.push(PS.boxItem(1.2, 17, 1.2, 0x8a93a0, cx + 5, 8.5, cz - 4));
    dressItems.push(PS.boxItem(1.2, 17, 1.2, 0x8a93a0, cx - 5, 8.5, cz + 4)); dressItems.push(PS.boxItem(1.2, 17, 1.2, 0x8a93a0, cx + 5, 8.5, cz + 4));
    dressItems.push(PS.boxItem(26, 1.4, 2, 0xd8b13e, cx + 4, 17.4, cz)); dressItems.push(PS.boxItem(3, 3, 3, 0x39424e, cx - 6, 15.4, cz));
  }
  for (let i = 0; i < 12; i++) { // Cannery Row market stalls
    const sx = -158 + i * 13, sz = 128 + (i % 2) * 14;
    dressItems.push(PS.boxItem(5, 0.3, 3.4, 0x6e4a2f, sx, 1.05, sz));
    dressItems.push(PS.boxItem(5.6, 0.25, 4, i % 2 ? 0xc75146 : 0x3f8fae, sx, 2.6, sz));
    dressItems.push(PS.boxItem(0.25, 2.6, 0.25, 0x4a3a28, sx - 2.4, 1.3, sz - 1.6)); dressItems.push(PS.boxItem(0.25, 2.6, 0.25, 0x4a3a28, sx + 2.4, 1.3, sz + 1.6));
    colliders.push({ x: sx, z: sz, hw: 2.8, hd: 2 });
  }
  for (let i = 0; i < 26; i++) { // quay palms
    const px = -150 + i * 12.4, pz = 166;
    dressItems.push(PS.bakeItem(new THREE.CylinderGeometry(0.22, 0.34, 5.4, 5), 0x5a4632, px, 2.7, pz));
    for (let f = 0; f < 5; f++) dressItems.push(PS.bakeItem(new THREE.ConeGeometry(0.5, 4.6, 4), 0x2e7d4f, px + Math.cos(f * 1.26) * 1.7, 5.6, pz + Math.sin(f * 1.26) * 1.7, 0, 0, 1.15));
  }
  // Ferry Point pier (walkable deck toward the patrol boat)
  dressItems.push(PS.boxItem(56, 0.5, 9, 0x6e5638, 188, 0.25, 10));
  for (let i = 0; i < 8; i++) dressItems.push(PS.boxItem(0.5, 1.6, 0.5, 0x4a3a28, 164 + i * 7.4, -0.4, 6.2));
  // breakwater + lighthouse
  dressItems.push(PS.boxItem(10, 2.2, 250, 0x39424e, 238, 0.4, -40));
  const lhItems = [];
  for (let i = 0; i < 5; i++) lhItems.push(PS.bakeItem(new THREE.CylinderGeometry(2.6 - i * 0.22, 2.8 - i * 0.22, 3.4, 10), i % 2 ? 0xd8dee6 : 0xc23b2e, 238, 2.8 + i * 3.4, -152));
  lhItems.push(PS.bakeItem(new THREE.CylinderGeometry(1.7, 1.7, 1.6, 8), 0x222a33, 238, 20.6, -152));
  scene.add(PS.bakedMesh(lhItems));
  const lampBall = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }));
  lampBall.position.set(238, 20.6, -152); scene.add(lampBall); PS.lighthouseLamp = lampBall;
  scene.add(PS.bakedMesh(dressItems));
  scene.add(PS.bakedMesh(bodyItems)); // the 252 building shells themselves
  const glowMesh = PS.bakedMesh(glowItems, { basic: true });
  scene.add(glowMesh); PS.signGlowMesh = glowMesh;

  // neon signs: plane on the +z facade, normal pointing AWAY from the building (+z)
  signSpots.forEach(function (s, i) {
    const tex = PS.signTexture(s.word, s.color, '#0a1220');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
    sign.position.set(s.x, 5.6, s.z + s.hd + 0.22); // faces +z, outward from facade
    scene.add(sign);
  });
  // district name signs at district gateways, facing the road (outward +z)
  PS.DISTRICTS.forEach(function (d) {
    const cx = -140 + d.cols[1] * 40, cz = -140 + d.rows[d.rows.length - 1] * 40 + 21;
    const tex = PS.signTexture(d.name.toUpperCase(), d.neon, '#081018');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false }));
    sign.position.set(cx, 6.4, cz); scene.add(sign);
  });

  PS.city = { buildings: buildingCount, lights: lightCount, colliders: colliders, seed: seed };
  return PS.city;
};

PS.assertCounts = function () {
  return { buildings: PS.city ? PS.city.buildings : 0, lights: PS.city ? PS.city.lights : 0, ok: !!PS.city && PS.city.buildings === 252 && PS.city.lights === 816 };
};
// Circle-vs-AABB pushout against building colliders; returns corrected [x,z].
PS.collide = function (x, z, r) {
  const cols = PS.city.colliders;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i], dx = x - c.x, dz = z - c.z;
    const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
    if (px > 0 && pz > 0) { if (px < pz) x = c.x + (dx > 0 ? c.hw + r : -c.hw - r); else z = c.z + (dz > 0 ? c.hd + r : -c.hd - r); }
  }
  return [x, z];
};
PS.districtAt = function (x, z) {
  for (const d of PS.DISTRICTS) {
    const xs = d.cols.map(c => -140 + c * 40), zs = d.rows.map(r => -140 + r * 40);
    if (x >= Math.min.apply(null, xs) - 20 && x <= Math.max.apply(null, xs) + 20 && z >= Math.min.apply(null, zs) - 20 && z <= Math.max.apply(null, zs) + 20) return d.name;
  }
  return x > PS.WATER_X ? 'The Harbor' : 'Port Sombra';
};

// Interactable places — every marker sits on a road, quay apron or pier (open ground).
PS.PLACES = {
  sable: { name: 'Sable Ivers', x: 140, z: 2 },
  shops: [
    { id: 'arms', name: 'Harrow Arms', x: -40, z: 14, items: [{ label: 'Pistol ammo x24 — $40', cost: 40, fx: 'ammo' }, { label: 'Armor vest — $150', cost: 150, fx: 'armor' }] },
    { id: 'garage', name: "Sable's Garage", x: 84, z: 40, items: [{ label: 'Repair current car — $80', cost: 80, fx: 'repairCar' }] },
    { id: 'thread', name: 'Thread & Tide', x: 120, z: -14, items: [{ label: 'Tailored outfit (+25 max HP) — $200', cost: 200, fx: 'outfit' }] },
    { id: 'bao', name: 'Bao Nine', x: -14, z: 120, items: [{ label: 'Harbor meal (heal 50) — $25', cost: 25, fx: 'meal' }] },
    { id: 'pawn', name: 'Gull Pawn', x: 14, z: -120, items: [{ label: 'Sell loot (+$60)', cost: -60, fx: 'sell' }] },
    { id: 'clinic', name: 'St. Sombra Clinic', x: -120, z: 46, items: [{ label: 'Full treatment — $60', cost: 60, fx: 'fullheal' }] },
    { id: 'chandlery', name: 'Marina Chandlery', x: 152, z: 40, items: [{ label: 'Repair the patrol boat — $70', cost: 70, fx: 'repairBoat' }] },
    { id: 'ink', name: 'Tidepool Ink', x: 46, z: 160, items: [{ label: 'Tide ink (+rep rate) — $120', cost: 120, fx: 'ink' }] }
  ],
  safehouses: [
    { name: "Marco's Berth", x: 158, z: -2 }, { name: 'Cove Hut', x: 26, z: 120 },
    { name: 'Terraces Suite', x: -100, z: -40 }, { name: 'Cannery Loft', x: -140, z: 120 }
  ],
  boatDock: { x: 208, z: 10 },
  covePickup: { x: 232, z: 148 },
  lighthouse: { x: 238, z: -140 }
};
