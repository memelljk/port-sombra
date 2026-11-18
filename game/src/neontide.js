// neontide.js — boot, game loop and player control for Port Sombra:
// Neon Tide. States: title / play / pause / shop / map / dead / shot.
// Dynamic weather cycle: clear -> squall -> fog bank -> clear, driving
// rain density, fog density and neon sign glow, shown on the HUD.
window.PS = window.PS || {};

PS.time = 0; PS.state.mode = 'title'; PS.shake = 0; PS.lastGunfire = -99;
PS.gameMinutes = 21 * 60;
PS.clockText = function () {
  const m = Math.floor(PS.gameMinutes) % (24 * 60);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
PS.heroAngleRad = function () {
  const h = PS.hero; if (!h) return 0;
  return h.inCar ? h.inCar.angle : (h.inBoat ? PS.boat.angle : h.angle);
};

// ---------------- weather ----------------
PS.WEATHERS = {
  clear: { label: '☀ CLEAR', rain: 0, fog: 0.0038, glow: 0.85, sky: 0x0a1626 },
  squall: { label: '☂ SQUALL', rain: 1, fog: 0.0075, glow: 1.35, sky: 0x081120 },
  fogbank: { label: '≋ FOG BANK', rain: 0.15, fog: 0.016, glow: 1.1, sky: 0x0c1826 }
};
PS.weather = { name: 'clear', label: '☀ CLEAR', rain: 0, fog: 0.0038, t: 0, lock: 0 };
PS.setWeather = function (name) {
  const w = PS.WEATHERS[name]; if (!w) return;
  PS.weather.name = name; PS.weather.label = w.label;
  PS.weather.rain = w.rain; PS.weather.fog = w.fog; PS.weather.lock = 9999;
  if (PS.scene) { PS.scene.fog.density = w.fog; PS.scene.background = new THREE.Color(w.sky); }
  if (PS.signGlowMesh) PS.signGlowMesh.material.color.setScalar(w.glow);
  PS.HUD && PS.HUD.refresh();
};
PS.updateWeather = function (dt) {
  const w = PS.weather;
  if (w.lock > 0) { w.lock -= dt; return; }
  w.t += dt;
  const order = ['clear', 'squall', 'fogbank'];
  const dur = { clear: 42, squall: 34, fogbank: 28 }[w.name];
  if (w.t > dur) {
    w.t = 0;
    const next = order[(order.indexOf(w.name) + 1) % order.length];
    const target = PS.WEATHERS[next];
    w.name = next; w.label = target.label;
  }
  const target = PS.WEATHERS[w.name];
  w.rain += (target.rain - w.rain) * Math.min(1, dt * 0.7);
  w.fog += (target.fog - w.fog) * Math.min(1, dt * 0.7);
  if (PS.scene) PS.scene.fog.density = w.fog;
  if (PS.signGlowMesh) PS.signGlowMesh.material.color.setScalar(0.85 + w.rain * 0.5);
};

// ---------------- boot ----------------
PS.boot = function () {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || 11) || 11;
  PS.seed = seed;
  const scene = new THREE.Scene();
  PS.scene = scene;
  scene.background = new THREE.Color(0x0a1626);
  scene.fog = new THREE.FogExp2(0x0a1626, 0.0038);
  PS.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900);
  PS.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('view'), antialias: true });
  PS.renderer.setSize(innerWidth, innerHeight);
  PS.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x1a2432, 0.95));
  scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
  const moon = new THREE.DirectionalLight(0xcfe4ff, 0.75);
  moon.position.set(-80, 140, -60); scene.add(moon);

  PS.generateCity(scene, seed);
  PS.spawnVehicles(scene, seed);
  PS.createHero(scene, 146, 24);
  PS.spawnPeds(scene, seed);
  PS.initPolice(scene);
  PS.initCombat(scene);
  // the patrol boat at Ferry Point pier + five moored harbour boats
  PS.boat = PS.makeBoat(219, 10, -Math.PI / 2);
  scene.add(PS.boat.group); scene.add(PS.boat.wake);
  PS.boats = [PS.boat];
  const moored = [[192, 62, 0.3], [198, -52, -0.2], [206, 122, 0.5], [190, -118, 0.1], [246, 66, -0.4]];
  for (const mpos of moored) { const b = PS.makeMooredBoat(mpos[0], mpos[1], mpos[2], 0x3a6fb5); scene.add(b); PS.boats.push({ x: mpos[0], z: mpos[1], moored: true }); }
  // Sable's NPC at her Ferry Point booth
  PS.sableNPC = PS.makeHumanoid({ shirt: 0x8a2b5e, pants: 0x1c1c26, skin: 0x8a5a3b, hat: 0x8a2b5e });
  PS.sableNPC.position.set(PS.PLACES.sable.x, 0, PS.PLACES.sable.z); scene.add(PS.sableNPC);
  PS.buildMarkers(scene);
  PS.buildParticles(scene);
  PS.bindInput();
  // title / continue
  const save = PS.loadSave();
  if (save) document.getElementById('continue').classList.remove('hidden');
  document.getElementById('newgame').onclick = function () { PS.audio.unlock(); PS.startGame(null); };
  document.getElementById('continue').onclick = function () { PS.audio.unlock(); PS.startGame(save); };
  document.getElementById('respawn').onclick = function () { PS.respawn(); };
  const shot = params.get('shot');
  if (shot) PS.poseShot(shot);
  PS.HUD.refresh();
  PS.lastT = performance.now();
  requestAnimationFrame(PS.loop);
};

PS.buildMarkers = function (scene) {
  const mk = function (color) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.15, 26), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.14; g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 8, 1, true), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    beam.position.y = 3.5; g.add(beam);
    scene.add(g); return g;
  };
  PS.markers = { shops: [], safe: [], sable: mk(0xff4fa3), objective: mk(0xffd23e) };
  for (const s of PS.PLACES.shops) { const m = mk(0x5effa1); m.position.set(s.x, 0, s.z); PS.markers.shops.push(m); }
  for (const s of PS.PLACES.safehouses) { const m = mk(0x7df0ff); m.position.set(s.x, 0, s.z); PS.markers.safe.push(m); }
  PS.markers.sable.position.set(PS.PLACES.sable.x, 0, PS.PLACES.sable.z);
};
PS.buildParticles = function (scene) {
  // rain: one Points cloud recycled around the camera
  const rn = 1300, rpos = new Float32Array(rn * 3);
  for (let i = 0; i < rn; i++) { rpos[i * 3] = (Math.random() - 0.5) * 130; rpos[i * 3 + 1] = Math.random() * 42; rpos[i * 3 + 2] = (Math.random() - 0.5) * 130; }
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  PS.rain = new THREE.Points(rgeo, new THREE.PointsMaterial({ color: 0x9fc8e8, size: 0.32, transparent: true, opacity: 0.0 }));
  PS.rain.frustumCulled = false; scene.add(PS.rain);
  // smoke: emitters start BELOW ground so nothing piles up at the origin
  const sn = 220, spos = new Float32Array(sn * 3);
  for (let i = 0; i < sn; i++) { spos[i * 3] = 0; spos[i * 3 + 1] = -60; spos[i * 3 + 2] = 0; }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  PS.smoke = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0x555f6a, size: 1.6, transparent: true, opacity: 0.55 }));
  PS.smoke.frustumCulled = false; PS.smokeHead = 0; scene.add(PS.smoke);
};
PS.emitSmoke = function (x, y, z) {
  const pos = PS.smoke.geometry.attributes.position;
  pos.setXYZ(PS.smokeHead, x + (Math.random() - 0.5), y, z + (Math.random() - 0.5));
  PS.smokeHead = (PS.smokeHead + 1) % 220;
  pos.needsUpdate = true;
};
PS.updateParticles = function (dt) {
  const cam = PS.camera;
  const rp = PS.rain.geometry.attributes.position;
  const rainAmt = PS.weather.rain;
  PS.rain.material.opacity = rainAmt * 0.75;
  PS.rain.visible = rainAmt > 0.03;
  if (PS.rain.visible) {
    for (let i = 0; i < rp.count; i++) {
      let y = rp.getY(i) - dt * 46;
      if (y < 0) { y = 40; rp.setX(i, cam.position.x + (Math.random() - 0.5) * 130); rp.setZ(i, cam.position.z + (Math.random() - 0.5) * 130); }
      rp.setY(i, y);
    }
    rp.needsUpdate = true;
  }
  const sp = PS.smoke.geometry.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); if (y > -50) sp.setY(i, y + dt * 2.6); }
  sp.needsUpdate = true;
  // water shimmer + lighthouse pulse
  if (PS.waterMesh) PS.waterMesh.position.y = 0.12 + Math.sin(PS.time * 0.8) * 0.03;
  if (PS.lighthouseLamp) PS.lighthouseLamp.material.color.setScalar(0.75 + Math.sin(PS.time * 2.2) * 0.25);
  // boat wake fade-in points drift astern
  if (PS.boat && PS.boat.speed > 2.5 && PS.hero.inBoat) {
    const pos = PS.boat.wake.geometry.attributes.position;
    const bx = PS.boat.x - Math.sin(PS.boat.angle) * 5.4, bz = PS.boat.z - Math.cos(PS.boat.angle) * 5.4;
    pos.setXYZ(PS.boat.wakeHead, bx + (Math.random() - 0.5) * 1.8, 0.2, bz + (Math.random() - 0.5) * 1.8);
    PS.boat.wakeHead = (PS.boat.wakeHead + 1) % 240; pos.needsUpdate = true;
  }
};

// ---------------- game state ----------------
PS.startGame = function (save) {
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  PS.state.mode = 'play'; PS.state.started = true;
  if (save) {
    PS.state.cash = save.cash; PS.state.rep = save.rep; PS.state.ink = !!save.ink; PS.state.outfit = !!save.outfit;
    PS.M.idx = save.mission || 0; PS.hero.maxHealth = save.maxHealth || 100;
    PS.hero.x = save.x; PS.hero.z = save.z; PS.hero.group.position.set(save.x, 0, save.z);
    if (PS.M.idx >= PS.MISSIONS.length) PS.M.complete = true;
  }
  PS.refreshObjective();
  PS.banner(save ? 'WELCOME BACK, MARCO' : 'PORT SOMBRA — FIND SABLE AT FERRY POINT');
  PS.HUD.refresh();
};
PS.die = function (kind) {
  const hero = PS.hero; if (!hero || hero.dead) return;
  hero.dead = true; PS.state.mode = 'dead';
  const fee = kind === 'busted' ? 120 : 75;
  PS.state.deathFee = fee;
  document.getElementById('deadtitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('deadtext').textContent = kind === 'busted'
    ? 'The law takes $' + fee + ' and your evening. The clinic patches what pride cannot.'
    : 'You wake under clinic lights. Treatment costs $' + fee + '.';
  document.getElementById('dead').classList.remove('hidden');
  PS.clearWanted();
};
PS.respawn = function () {
  const hero = PS.hero;
  PS.addCash(-(PS.state.deathFee || 75));
  hero.dead = false; hero.health = hero.maxHealth; hero.armor = 0;
  hero.inCar = null; hero.inBoat = false; hero.group.visible = true;
  hero.x = -120; hero.z = 52; hero.group.position.set(-120, 0, 52);
  if (PS.playerCar) PS.playerCar = null;
  document.getElementById('dead').classList.add('hidden');
  PS.state.mode = 'play'; PS.HUD.refresh();
};

// ---------------- input ----------------
PS.keys = {};
PS.cam = { yaw: 2.4, pitch: 0.34, dist: 9.5 };
PS.bindInput = function () {
  addEventListener('keydown', function (ev) {
    PS.audio.unlock();
    if (ev.code === 'Space') ev.preventDefault();
    PS.keys[ev.code] = true;
    if (PS.state.mode === 'play' || PS.state.mode === 'shot') {
      if (ev.code === 'KeyE') PS.interact();
      if (ev.code === 'KeyF') PS.melee();
      if (ev.code === 'KeyR') { if (PS.hero.inCar) PS.cycleRadio(); else PS.startReload(); }
      if (ev.code === 'KeyM') PS.banner(PS.audio.toggleMute() ? 'MUTED' : 'SOUND ON');
      if (ev.code === 'KeyP') { PS.state.mode = 'map'; document.getElementById('bigmap').classList.remove('hidden'); PS.HUD.drawBigMap(); }
      if (ev.code === 'Escape' && PS.state.mode === 'play') { PS.state.mode = 'pause'; document.getElementById('pause').classList.remove('hidden'); document.getElementById('pausestats').textContent = 'Cash $' + PS.state.cash + ' · ' + PS.rankName() + ' · Jobs done: ' + PS.M.idx + '/16'; }
    } else if (PS.state.mode === 'shop') {
      if (ev.code === 'KeyE' || ev.code === 'Escape') PS.closeShop();
    } else if (PS.state.mode === 'map') {
      if (ev.code === 'KeyP' || ev.code === 'Escape') { PS.state.mode = 'play'; document.getElementById('bigmap').classList.add('hidden'); }
    } else if (PS.state.mode === 'pause') {
      if (ev.code === 'Escape') { PS.state.mode = 'play'; document.getElementById('pause').classList.add('hidden'); }
    }
  });
  addEventListener('keyup', function (ev) { PS.keys[ev.code] = false; });
  let dragging = false, lx = 0, ly = 0;
  const cv = document.getElementById('view');
  cv.addEventListener('mousedown', function (ev) {
    PS.audio.unlock();
    if (ev.button === 0) { dragging = true; lx = ev.clientX; ly = ev.clientY; if (PS.state.mode === 'play' && !PS.hero.inCar && !PS.hero.inBoat) PS.heroShoot(); }
    if (ev.button === 2) PS.hero.aiming = true;
  });
  addEventListener('mouseup', function (ev) { if (ev.button === 0) dragging = false; if (ev.button === 2) PS.hero.aiming = false; });
  addEventListener('mousemove', function (ev) {
    if (!dragging) return;
    PS.cam.yaw -= (ev.clientX - lx) * 0.005; PS.cam.pitch = Math.max(0.05, Math.min(1.1, PS.cam.pitch + (ev.clientY - ly) * 0.004));
    lx = ev.clientX; ly = ev.clientY;
  });
  cv.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  addEventListener('resize', function () {
    PS.camera.aspect = innerWidth / innerHeight; PS.camera.updateProjectionMatrix();
    PS.renderer.setSize(innerWidth, innerHeight);
  });
};
PS.aimDirection = function () {
  const v = new THREE.Vector3();
  PS.camera.getWorldDirection(v);
  return { x: v.x, y: v.y, z: v.z };
};

// ---------------- interactions ----------------
PS.interact = function () {
  const hero = PS.hero;
  if (PS.dialogue) { PS.advanceDialogue(); return; }
  if (PS.state.mode !== 'play') return;
  if (hero.inBoat) {
    if (Math.hypot(hero.x - PS.PLACES.boatDock.x, hero.z - PS.PLACES.boatDock.z) < 16) {
      hero.inBoat = false; PS.boat.boarded = false; hero.group.visible = true;
      hero.x = 204; hero.z = 10; hero.group.position.set(204, 0, 10);
      PS.audio.sfx('splash'); PS.banner('BACK ON THE PIER');
    } else PS.banner('TOO FAR FROM THE PIER TO STEP OFF');
    return;
  }
  if (hero.inCar) {
    const car = hero.inCar; hero.inCar = null; PS.playerCar = null; PS.lastCar = car;
    hero.group.visible = true;
    hero.x = car.x + Math.cos(car.angle) * 2.4; hero.z = car.z - Math.sin(car.angle) * 2.4;
    hero.group.position.set(hero.x, 0, hero.z);
    PS.audio.sfx('door'); return;
  }
  // board the boat from the pier
  if (PS.boat && Math.hypot(hero.x - PS.boat.x, hero.z - PS.boat.z) < 8) {
    hero.inBoat = true; PS.boat.boarded = true; hero.group.visible = false;
    hero.x = PS.boat.x; hero.z = PS.boat.z; PS.audio.sfx('splash'); PS.banner('ABOARD THE PATROL BOAT — W/S THROTTLE, A/D RUDDER');
    return;
  }
  // enter a car
  let best = null, bd = 3.6;
  const consider = function (car) { if (car.dead) return; const d = Math.hypot(hero.x - car.x, hero.z - car.z); if (d < bd) { bd = d; best = car; } };
  PS.vehicles.forEach(consider); PS.policePool.forEach(consider);
  if (best) {
    hero.inCar = best; PS.playerCar = best; hero.group.visible = false;
    hero.x = best.x; hero.z = best.z;
    if (best.traffic) { best.traffic = null; PS.commitCrime(1, best.x, best.z); PS.banner('DRAGGED OUT — IT\'S YOURS NOW'); }
    else if (best.police) { PS.commitCrime(2, best.x, best.z); if (PS.wanted.stars < 2) PS.setWanted(2); }
    else if (best.parked) PS.commitCrime(1, best.x, best.z);
    PS.audio.sfx('door'); PS.HUD.refresh(); return;
  }
  for (const s of PS.PLACES.shops) if (Math.hypot(hero.x - s.x, hero.z - s.z) < 3.6) { PS.openShop(s); return; }
  for (const s of PS.PLACES.safehouses) if (Math.hypot(hero.x - s.x, hero.z - s.z) < 3.6) { PS.useSafehouse(s); return; }
  if (Math.hypot(hero.x - PS.PLACES.sable.x, hero.z - PS.PLACES.sable.z) < 3.8) { PS.talkToSable(); return; }
};
PS.promptText = function () {
  const hero = PS.hero; if (!hero || PS.state.mode !== 'play') return '';
  if (PS.dialogue) return '';
  if (hero.inBoat) return 'E — step onto the pier (near Ferry Point)';
  if (hero.inCar) return 'E — exit · Space — handbrake · R — radio';
  if (PS.boat && Math.hypot(hero.x - PS.boat.x, hero.z - PS.boat.z) < 8) return 'E — board the patrol boat';
  for (const c of PS.vehicles) if (!c.dead && Math.hypot(hero.x - c.x, hero.z - c.z) < 3.6) return 'E — steal the ' + c.kind;
  for (const c of PS.policePool) if (!c.dead && Math.hypot(hero.x - c.x, hero.z - c.z) < 3.6) return 'E — steal the interceptor';
  for (const s of PS.PLACES.shops) if (Math.hypot(hero.x - s.x, hero.z - s.z) < 3.6) return 'E — ' + s.name;
  for (const s of PS.PLACES.safehouses) if (Math.hypot(hero.x - s.x, hero.z - s.z) < 3.6) return 'E — rest at ' + s.name + ' (save, heal, -1 star)';
  if (Math.hypot(hero.x - PS.PLACES.sable.x, hero.z - PS.PLACES.sable.z) < 3.8) return 'E — talk to Sable Ivers';
  return '';
};

// ---------------- per-frame updates ----------------
PS.updateHero = function (dt) {
  const hero = PS.hero, k = PS.keys;
  if (hero.inBoat) { PS.updateBoat(dt); hero.x = PS.boat.x; hero.z = PS.boat.z; return; }
  if (hero.inCar) { PS.updateCar(dt, hero.inCar); hero.x = hero.inCar.x; hero.z = hero.inCar.z; return; }
  let mx = 0, mz = 0;
  const fwd = { x: Math.sin(PS.cam.yaw), z: Math.cos(PS.cam.yaw) };
  if (k.KeyW || k.ArrowUp) { mx += fwd.x; mz += fwd.z; }
  if (k.KeyS || k.ArrowDown) { mx -= fwd.x; mz -= fwd.z; }
  if (k.KeyA || k.ArrowLeft) { mx += fwd.z; mz -= fwd.x; }
  if (k.KeyD || k.ArrowRight) { mx -= fwd.z; mz += fwd.x; }
  const len = Math.hypot(mx, mz);
  const run = (k.ShiftLeft || k.ShiftRight) ? 8.4 : 5.2;
  if (len > 0.01) {
    mx /= len; mz /= len;
    hero.angle = Math.atan2(mx, mz);
    const wading = hero.x > PS.WATER_X && !(hero.z > 4 && hero.z < 16);
    const spd = run * (wading ? 0.45 : 1);
    let nx = hero.x + mx * spd * dt, nz = hero.z + mz * spd * dt;
    const fixed = PS.collide(nx, nz, 0.6);
    hero.x = Math.max(-186, Math.min(248, fixed[0])); hero.z = Math.max(-186, Math.min(186, fixed[1]));
    hero.speed = spd; PS.walkAnimate(hero, dt, true);
  } else { hero.speed = 0; PS.walkAnimate(hero, dt, false); }
  hero.gunMesh.visible = hero.aiming;
  hero.group.position.set(hero.x, hero.group.position.y, hero.z);
  hero.group.rotation.y = hero.angle;
};
PS.updateCar = function (dt, car) {
  const k = PS.keys, spec = PS.CAR_KINDS[car.kind];
  const throttle = (k.KeyW || k.ArrowUp) ? 1 : (k.KeyS || k.ArrowDown) ? -0.55 : 0;
  car.speed += throttle * spec.accel * dt * (car.speed * throttle < 0 ? 2.2 : 1);
  car.speed -= car.speed * 0.55 * dt;
  if (!throttle) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 3.2 * dt);
  car.speed = Math.max(-13, Math.min(spec.top, car.speed));
  const steer = ((k.KeyA || k.ArrowLeft) ? 1 : 0) - ((k.KeyD || k.ArrowRight) ? 1 : 0);
  const drift = (k.Space) ? 1.9 : 1;
  if (Math.abs(car.speed) > 0.4) car.angle += steer * dt * (spec.grip / drift) * Math.min(1, Math.abs(car.speed) / 9) * Math.sign(car.speed);
  let nx = car.x + Math.sin(car.angle) * car.speed * dt, nz = car.z + Math.cos(car.angle) * car.speed * dt;
  const fixed = PS.collide(nx, nz, 1.7);
  if (fixed[0] !== nx || fixed[1] !== nz) { if (Math.abs(car.speed) > 9) { car.health -= 6; PS.shake = 0.3; PS.commitCrime(1, car.x, car.z); } car.speed *= -0.25; }
  car.x = Math.max(-186, Math.min(170, fixed[0])); car.z = Math.max(-186, Math.min(186, fixed[1]));
  // run-over peds flee / fall
  for (const p of PS.peds) {
    if (Math.abs(car.speed) > 5 && Math.hypot(p.x - car.x, p.z - car.z) < 2.1) {
      p.state = 'flee'; p.timer = 3.5; p.x += Math.sin(car.angle) * 2.5; p.z += Math.cos(car.angle) * 2.5;
      PS.commitCrime(1, p.x, p.z); car.health -= 2;
    }
  }
  car.group.position.set(car.x, 0, car.z); car.group.rotation.y = car.angle;
  if (car.health < 55 && Math.random() > 0.5) PS.emitSmoke(car.x, 1.2, car.z);
  if (car.health <= 0 && !car.dead) { car.dead = true; PS.banner('WRECKED'); if (PS.hero.inCar === car) { PS.damageHero(18); PS.interact(); } }
};
PS.updateBoat = function (dt) {
  const boat = PS.boat, k = PS.keys;
  const throttle = (k.KeyW) ? 1 : (k.KeyS) ? -0.5 : 0;
  boat.speed += throttle * 5.2 * dt;
  boat.speed -= boat.speed * 0.5 * dt;
  boat.speed = Math.max(-5, Math.min(13.5, boat.speed));
  const rudder = ((k.KeyA) ? 1 : 0) - ((k.KeyD) ? 1 : 0);
  if (Math.abs(boat.speed) > 0.3) boat.angle += rudder * dt * 0.75 * Math.sign(boat.speed);
  let nx = boat.x + Math.sin(boat.angle) * boat.speed * dt, nz = boat.z + Math.cos(boat.angle) * boat.speed * dt;
  if (nx < 178) { nx = 178; boat.speed *= 0.4; if (Math.abs(boat.speed) > 4) boat.health -= 4; }
  boat.x = Math.min(302, nx); boat.z = Math.max(-182, Math.min(182, nz));
  boat.group.position.set(boat.x, -0.15 + Math.sin(PS.time * 1.7) * 0.07, boat.z);
  boat.group.rotation.y = boat.angle;
  boat.group.rotation.z = Math.sin(PS.time * 1.3) * 0.02 + rudder * -0.03;
  if (boat.health < 55 && Math.random() > 0.6) PS.emitSmoke(boat.x, 1.6, boat.z);
};
PS.updateCamera = function (dt) {
  const hero = PS.hero;
  if (PS.fixedCamera) {
    const f = PS.fixedCamera;
    PS.camera.position.set(f.x, f.y, f.z);
    PS.camera.lookAt(f.lx, f.ly, f.lz);
    return;
  }
  const target = hero.inCar ? hero.inCar : (hero.inBoat ? PS.boat : hero);
  const tx = target.x, tz = target.z;
  if (hero.inCar || hero.inBoat) {
    const wantYaw = target.angle + Math.PI;
    let diff = wantYaw - PS.cam.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    PS.cam.yaw += diff * Math.min(1, dt * 2.6);
    PS.cam.dist += ((hero.inCar ? 10.5 : 13) - PS.cam.dist) * dt * 3;
  } else PS.cam.dist += (9.5 - PS.cam.dist) * dt * 3;
  const cx = tx - Math.sin(PS.cam.yaw) * Math.cos(PS.cam.pitch) * PS.cam.dist;
  const cz = tz - Math.cos(PS.cam.yaw) * Math.cos(PS.cam.pitch) * PS.cam.dist;
  const cy = 1.6 + Math.sin(PS.cam.pitch) * PS.cam.dist;
  PS.shake = Math.max(0, (PS.shake || 0) - dt * 1.4);
  const shx = (Math.random() - 0.5) * PS.shake, shy = (Math.random() - 0.5) * PS.shake;
  PS.camera.position.set(cx + shx, Math.max(0.7, cy) + shy, cz);
  PS.camera.lookAt(tx, 1.5, tz);
};

PS.loop = function (now) {
  requestAnimationFrame(PS.loop);
  let dt = (now - PS.lastT) / 1000; PS.lastT = now;
  dt = Math.max(0.001, Math.min(0.05, dt)); // clamp both ways
  const mode = PS.state.mode;
  if (mode === 'play' || mode === 'shot') {
    PS.time += dt; PS.gameMinutes += dt * 11;
    PS.updateWeather(dt);
    if (mode === 'play') {
      PS.updateHero(dt);
      PS.updateTraffic(dt);
      PS.updatePeds(dt);
      PS.updatePolice(dt);
      PS.updateThugs(dt);
      PS.updateGun(dt);
      PS.updateTracers(dt);
      PS.updateMissions(dt);
    }
    PS.updateParticles(dt);
    const speed01 = PS.hero.inCar ? Math.abs(PS.hero.inCar.speed) / 40 : (PS.hero.inBoat ? Math.abs(PS.boat.speed) / 13 : 0);
    PS.audio.setEngine(speed01, PS.hero.inBoat);
    document.getElementById('prompt').textContent = PS.promptText();
    if (PS.objectivePos) { PS.markers.objective.position.set(PS.objectivePos.x, 0, PS.objectivePos.z); PS.markers.objective.visible = true; }
    else PS.markers.objective.visible = false;
    const pulse = 1 + Math.sin(PS.time * 3.4) * 0.1;
    PS.markers.objective.scale.set(pulse, 1, pulse);
    PS.HUD.update(); // every frame: the minimap must never sit blank in a capture
  }
  PS.updateCamera(dt);
  PS.renderer.render(PS.scene, PS.camera);
  PS.drawCalls = PS.renderer.info.render.calls;
  let objs = 0; PS.scene.traverse(function (o) { if (o.visible) objs++; });
  PS.drawObjects = objs;
};

// verification surface for tests and the CDP probe
PS.assertAll = function () {
  return {
    missions: PS.MISSIONS.length, shops: PS.PLACES.shops.length, safehouses: PS.PLACES.safehouses.length,
    stations: PS.STATIONS.length, districts: PS.DISTRICTS.length,
    buildings: PS.city.buildings, lights: PS.city.lights,
    vehicles: PS.countVehicles(), peds: PS.countPeds(), boats: PS.boats.length,
    drawCalls: PS.drawCalls || 0, drawObjects: PS.drawObjects || 0,
    countsOk: PS.assertCounts().ok
  };
};
PS.probe = {
  state: function () {
    return {
      mode: PS.state.mode, x: PS.hero.x, z: PS.hero.z, inCar: !!PS.hero.inCar, inBoat: !!PS.hero.inBoat,
      wanted: PS.wanted.stars, cash: PS.state.cash, missionIdx: PS.M.idx, missionActive: PS.M.active,
      dialogue: !!PS.dialogue, shopOpen: PS.state.mode === 'shop', station: PS.STATIONS[PS.radio.idx].name,
      boatX: PS.boat.x, boatZ: PS.boat.z, weather: PS.weather.name
    };
  },
  start: function () { PS.startGame(null); },
  teleport: function (x, z) { PS.hero.x = x; PS.hero.z = z; PS.hero.group.position.set(x, 0, z); }
};
document.addEventListener('DOMContentLoaded', PS.boot);
