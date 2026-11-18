// shotpose.js — deterministic screenshot scenes for Port Sombra.
// Each scene POSES the live game (positions, cars, cruisers with light
// bars on, wanted stars, weather, HUD state) instead of simulating play:
// headless Chrome only composites frames on demand. ?shot=<name>&seed=11.
window.PS = window.PS || {};

PS.poseShot = function (name) {
  const hero = PS.hero;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  PS.state.mode = 'shot'; PS.shotMode = true;
  if (name === 'cover') {
    PS.setWeather('squall');
    const serp = PS.findSpecial('serpentine');
    serp.x = 88; serp.z = 156; serp.angle = Math.PI / 2; serp.speed = 16;
    serp.group.position.set(88, 0, 156); serp.group.rotation.y = Math.PI / 2;
    hero.inCar = serp; hero.x = 88; hero.z = 157; hero.group.visible = false; PS.playerCar = serp;
    const traffic = PS.vehicles.filter(function (c) { return c.traffic; });
    traffic[0].x = 74; traffic[0].z = 152.5; traffic[0].group.position.set(74, 0, 152.5);
    traffic[1].x = 64; traffic[1].z = 158; traffic[1].group.position.set(64, 0, 158);
    PS.M.idx = 0; PS.M.active = true; PS.M.step = 1;
    PS.objectivePos = { x: 120, z: 128 };
    PS.HUD.setObjective('FIRST CRATE', 'Deliver the crate to the Neon Quay — 34m');
    PS.radio.idx = 1;
    PS.fixedCamera = { x: 104, y: 4.0, z: 171, lx: 83, ly: 1.2, lz: 153.5 };
  } else if (name === 'chase') {
    PS.setWeather('clear');
    const coupe = PS.vehicles.find(function (c) { return c.parked && c.kind === 'coupe'; }) || PS.vehicles[0];
    coupe.parked = false; coupe.x = 8; coupe.z = 0; coupe.angle = Math.PI / 2; coupe.speed = 19;
    coupe.group.position.set(8, 0, 0); coupe.group.rotation.y = Math.PI / 2;
    hero.inCar = coupe; hero.x = 8; hero.z = 0; hero.group.visible = false; PS.playerCar = coupe;
    const spots = [[-4, -3.4], [-6.5, 3.2], [-14, -3.2], [-17, 3.4]];
    PS.policePool.forEach(function (car, i) {
      if (i > 3) { car.active = false; return; }
      car.active = true; car.dead = false;
      car.x = spots[i][0]; car.z = spots[i][1]; car.angle = Math.PI / 2; car.speed = 18;
      car.group.position.set(car.x, 0, car.z); car.group.rotation.y = Math.PI / 2;
      car.lampMesh.visible = true;
    });
    const off = PS.officers[0];
    off.active = true; off.group.visible = true; off.x = -2; off.z = 8.6; off.angle = Math.PI;
    off.group.position.set(-2, 0, 8.6);
    PS.setWanted(4);
    PS.HUD.setObjective('WANTED', 'Lose the police — break line of sight');
    PS.objectivePos = null;
    PS.fixedCamera = { x: -17, y: 2.9, z: -9.5, lx: 12, ly: 1.2, lz: 2 };
  } else if (name === 'boat') {
    PS.setWeather('clear');
    const boat = PS.boat;
    boat.x = 226; boat.z = -42; boat.angle = Math.PI; boat.speed = 8;
    boat.group.position.set(226, -0.15, -42); boat.group.rotation.y = Math.PI;
    hero.inBoat = true; hero.x = 226; hero.z = -42; hero.group.visible = false;
    // pre-lay a wake trail at water level behind the boat (astern = +z when heading north)
    const pos = boat.wake.geometry.attributes.position;
    for (let i = 0; i < 130; i++) {
      const t = i / 130;
      pos.setXYZ(i, 226 + (Math.random() - 0.5) * 2.4, 0.18, -42 + t * 34 + (Math.random() - 0.5) * 2.4);
    }
    pos.needsUpdate = true;
    PS.M.idx = 13; PS.M.active = true; PS.M.step = 1;
    PS.objectivePos = PS.PLACES.covePickup;
    PS.HUD.setObjective('NIGHT FERRY', 'Sail to the Smuggler\'s Cove pickup — 208m');
    PS.fixedCamera = { x: 210, y: 3.8, z: -6, lx: 230, ly: 1.2, lz: -50 };
  } else if (name === 'onfoot') {
    PS.setWeather('clear');
    hero.x = -52; hero.z = 124.5; hero.angle = 1.1; hero.group.visible = true;
    hero.group.position.set(-52, 0, 124.5); hero.group.rotation.y = 1.1;
    hero.gunMesh.visible = true; hero.aiming = true;
    if (PS.sableNPC) { PS.sableNPC.position.set(-49.8, 0, 125.8); PS.sableNPC.rotation.y = -2.0; }
    PS.peds.forEach(function (p, i) {
      const spots = [[-67, 125], [-44, 118], [-40, 127.5], [-64, 124.5]];
      if (i < 4) { p.x = spots[i][0]; p.z = spots[i][1]; p.group.position.set(p.x, 0, p.z); }
    });
    PS.objectivePos = { x: -40, z: 123 };
    PS.HUD.setObjective('CANNERY TITHE', 'Collect from the Cannery Row stalls — 12m');
    PS.showDialogue([['Sable Ivers', 'Three stalls owe the tithe, Marco. On foot, polite, firm. Bao Nine is just up the row if you need a meal first.']]);
    PS.fixedCamera = { x: -63, y: 2.7, z: 115.5, lx: -48, ly: 1.2, lz: 125.5 };
  }
  PS.HUD.refresh();
};
