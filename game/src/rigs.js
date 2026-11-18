// rigs.js — vehicle and boat factory for Port Sombra: Neon Tide.
// Every car is TWO draw objects: one baked vertex-coloured shell (body,
// glass, wheels) and one additive lamp mesh (headlights, tail lights,
// headlight cones, police light bar). The patrol boat is built the same way.
window.PS = window.PS || {};

PS.CAR_KINDS = {
  coupe: { w: 1.9, l: 4.3, h: 0.62, cabin: 0.5, top: 34, accel: 15, grip: 2.6 },
  sedan: { w: 1.95, l: 4.7, h: 0.68, cabin: 0.55, top: 30, accel: 12, grip: 2.4 },
  serpentine: { w: 2.0, l: 4.6, h: 0.5, cabin: 0.42, top: 44, accel: 21, grip: 3.1 },
  truck: { w: 2.3, l: 6.4, h: 1.1, cabin: 0.9, top: 24, accel: 9, grip: 1.9 },
  interceptor: { w: 1.95, l: 4.8, h: 0.64, cabin: 0.52, top: 40, accel: 19, grip: 2.9 }
};
PS.CAR_COLORS = [0xc23b2e, 0x2e6fc2, 0xd8b13e, 0x3fae6a, 0xd8dee6, 0x7a4fae, 0x39424e, 0xe07b39, 0x2ec4b6, 0x8a93a0];

PS.makeCar = function (kind, x, z, angle, color) {
  const k = PS.CAR_KINDS[kind];
  const body = [], lamps = [];
  body.push(PS.boxItem(k.w, k.h, k.l, color, 0, 0.35 + k.h / 2, 0));
  body.push(PS.boxItem(k.w * 0.82, k.cabin, k.l * 0.46, 0x141e2a, 0, 0.35 + k.h + k.cabin / 2, -k.l * 0.04));
  body.push(PS.boxItem(k.w + 0.1, 0.22, k.l * 0.96, 0x1c222c, 0, 0.32, 0));
  if (kind === 'truck') body.push(PS.boxItem(2.2, 1.7, 3.4, 0xb9c2cc, 0, 1.55, -1.2));
  if (kind === 'serpentine') body.push(PS.boxItem(1.7, 0.16, 0.5, 0x10151c, 0, 1.02, -1.95));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    body.push(PS.bakeItem(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 9), 0x0c0f13, sx * (k.w / 2 - 0.05), 0.36, sz * (k.l / 2 - 0.85), 0, 0, Math.PI / 2));
  const shell = PS.bakedMesh(body);
  // lamps: head/tail boxes + two headlight cones (additive, fog off, faint)
  lamps.push(PS.boxItem(0.42, 0.16, 0.1, 0xffe9a8, -k.w / 2 + 0.3, 0.72, k.l / 2));
  lamps.push(PS.boxItem(0.42, 0.16, 0.1, 0xffe9a8, k.w / 2 - 0.3, 0.72, k.l / 2));
  lamps.push(PS.boxItem(0.42, 0.14, 0.1, 0xff3b30, -k.w / 2 + 0.3, 0.74, -k.l / 2));
  lamps.push(PS.boxItem(0.42, 0.14, 0.1, 0xff3b30, k.w / 2 - 0.3, 0.74, -k.l / 2));
  const coneGeo = new THREE.ConeGeometry(1.05, 7.5, 8, 1, true);
  lamps.push(PS.bakeItem(coneGeo, 0x554a22, -k.w / 2 + 0.3, 0.62, k.l / 2 + 3.6, 0, Math.PI / 2 + 0.12, 0));
  lamps.push(PS.bakeItem(coneGeo.clone(), 0x554a22, k.w / 2 - 0.3, 0.62, k.l / 2 + 3.6, 0, Math.PI / 2 + 0.12, 0));
  if (kind === 'interceptor') {
    lamps.push(PS.boxItem(1.2, 0.18, 0.5, 0xff3b30, -0.3, 1.32, -0.2));
    lamps.push(PS.boxItem(1.2, 0.18, 0.5, 0x2e6fc2, 0.3, 1.32, -0.2));
  }
  const lampMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.FrontSide });
  const lampMesh = new THREE.Mesh(PS.bakeMerge(lamps), lampMat);
  const group = new THREE.Group();
  group.add(shell); group.add(lampMesh);
  group.position.set(x, 0, z); group.rotation.y = angle;
  const car = {
    kind: kind, group: group, lampMesh: lampMesh, x: x, z: z, angle: angle, speed: 0,
    health: 100, color: color, driver: null, traffic: null, police: false, dead: false, smokeT: 0
  };
  group.userData.car = car;
  return car;
};

PS.makeBoat = function (x, z, angle) {
  const items = [], lamps = [];
  items.push(PS.boxItem(3.1, 1.1, 9.6, 0xd8dee6, 0, 0.15, 0));            // hull — bottom sits below the waterline
  items.push(PS.boxItem(2.7, 0.5, 9.0, 0xc23b2e, 0, 0.85, 0));             // deck stripe
  items.push(PS.boxItem(2.2, 1.3, 2.6, 0x22303e, 0, 1.6, 0.9));            // cabin
  items.push(PS.boxItem(0.18, 2.6, 0.18, 0x8a93a0, 0, 2.6, -1.4));         // mast
  items.push(PS.boxItem(1.1, 0.8, 1.4, 0x39424e, 0, 1.0, -3.9));           // stern gear
  lamps.push(PS.boxItem(0.3, 0.2, 0.12, 0x5effa1, -1.2, 1.15, 4.6));
  lamps.push(PS.boxItem(0.3, 0.2, 0.12, 0xff3b30, 1.2, 1.15, 4.6));
  lamps.push(PS.boxItem(0.24, 0.24, 0.24, 0xffe9a8, 0, 4.0, -1.4));
  const group = new THREE.Group();
  group.add(PS.bakedMesh(items));
  const lampMesh = new THREE.Mesh(PS.bakeMerge(lamps), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  group.add(lampMesh);
  group.position.set(x, -0.15, z); group.rotation.y = angle;
  // wake foam: one Points cloud, ring buffer, trailing at water level
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
  const wake = new THREE.Points(wgeo, new THREE.PointsMaterial({ color: 0xbfe9ff, size: 0.85, transparent: true, opacity: 0.75, depthWrite: false }));
  wake.frustumCulled = false;
  const boat = { group: group, wake: wake, wakeHead: 0, x: x, z: z, angle: angle, speed: 0, health: 100, boarded: false };
  group.userData.boat = boat;
  return boat;
};
// moored harbour boats (static dressing, counted as boats)
PS.makeMooredBoat = function (x, z, angle, color) {
  const items = [PS.boxItem(2.6, 0.9, 7.6, color, 0, 0.1, 0), PS.boxItem(1.8, 1.0, 2.0, 0x22303e, 0, 1.2, 0.4), PS.boxItem(0.14, 3.4, 0.14, 0x8a93a0, 0, 2.4, -0.8)];
  const g = new THREE.Group(); g.add(PS.bakedMesh(items));
  g.position.set(x, -0.2, z); g.rotation.y = angle;
  return g;
};

PS.vehicles = [];
PS.spawnVehicles = function (scene, seed) {
  const rnd = PS.mulberry32(seed * 3 + 5);
  PS.vehicles = [];
  const kinds = ['coupe', 'sedan', 'sedan', 'coupe', 'truck'];
  // 30 parked cars along road edges
  for (let i = 0; i < 30; i++) {
    const onV = rnd() > 0.5, road = (onV ? PS.VROADS : PS.HROADS)[1 + Math.floor(rnd() * 7)];
    const along = -165 + rnd() * 330, off = rnd() > 0.5 ? 3.4 : -3.4;
    const x = onV ? road + off : along, z = onV ? along : road + off;
    if (x > 168) continue;
    const car = PS.makeCar(kinds[i % kinds.length], x, z, onV ? (off > 0 ? 0 : Math.PI) : Math.PI / 2, PS.CAR_COLORS[i % PS.CAR_COLORS.length]);
    car.parked = true; scene.add(car.group); PS.vehicles.push(car);
  }
  // the cobalt Serpentine S, always parked in The Terraces (mission 3 target)
  const serp = PS.makeCar('serpentine', -76, -96, 0.4, 0x2456d8);
  serp.special = 'serpentine'; scene.add(serp.group); PS.vehicles.push(serp);
  // 18 traffic cars driving the grid
  for (let i = 0; i < 18; i++) {
    const onV = i % 2 === 0, road = (onV ? PS.VROADS : PS.HROADS)[1 + (i % 7)];
    const along = -160 + rnd() * 320, dir = rnd() > 0.5 ? 1 : -1, lane = 2.6;
    const x = onV ? road + lane * dir : along, z = onV ? along : road - lane * dir;
    const car = PS.makeCar(kinds[(i + 2) % kinds.length], x, z, onV ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), PS.CAR_COLORS[(i + 3) % PS.CAR_COLORS.length]);
    car.traffic = { axis: onV ? 'z' : 'x', dir: dir, road: road, speed: 9 + rnd() * 6, cruise: 9 + rnd() * 6 };
    car.angle = car.group.rotation.y;
    scene.add(car.group); PS.vehicles.push(car);
  }
  // the armored salt truck (mission 12), parked at the Container Yards
  const truck = PS.makeCar('truck', 96, -64, Math.PI / 2, 0xb9c2cc);
  truck.special = 'salttruck'; scene.add(truck.group); PS.vehicles.push(truck);
  return PS.vehicles;
};
PS.updateTraffic = function (dt) {
  for (const car of PS.vehicles) {
    if (!car.traffic || car.dead || car === PS.playerCar) continue;
    const t = car.traffic;
    let want = t.cruise;
    // brake for the hero or another car ahead
    const ahead = function (px, pz) {
      const dx = px - car.x, dz = pz - car.z;
      const fwd = t.axis === 'z' ? dz * t.dir : dx * t.dir;
      const lat = t.axis === 'z' ? Math.abs(dx) : Math.abs(dz);
      return fwd > 0 && fwd < 10 && lat < 2.4;
    };
    if (PS.hero && ahead(PS.hero.x, PS.hero.z)) want = 0;
    for (const o of PS.vehicles) { if (o !== car && !o.parked && ahead(o.x, o.z)) { want = 0; break; } }
    t.speed += Math.max(-22 * dt, Math.min(8 * dt, want - t.speed));
    const move = t.speed * dt * t.dir;
    if (t.axis === 'z') { car.z += move; if (car.z > 178) car.z = -178; if (car.z < -178) car.z = 178; }
    else { car.x += move; if (car.x > 168) car.x = -178; if (car.x < -178) car.x = 178; }
    car.group.position.set(car.x, 0, car.z);
  }
};
PS.countVehicles = function () { return PS.vehicles.length + (PS.policePool ? PS.policePool.length : 0); };
