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
    serp.x = 88; serp.z = 157; serp.angle = Math.PI / 2; serp.speed = 16;
    serp.group.position.set(88, 0, 157); serp.group.rotation.y = Math.PI / 2;
    hero.inCar = serp; hero.x = 88; hero.z = 157; hero.group.visible = false; PS.playerCar = serp;
    const traffic = PS.vehicles.filter(function (c) { return c.traffic; });
    traffic[0].x = 108; traffic[0].z = 154; traffic[0].group.position.set(108, 0, 154);
    traffic[1].x = 126; traffic[1].z = 160; traffic[1].group.position.set(126, 0, 160);
    PS.M.idx = 0; PS.M.active = true; PS.M.step = 1;
    PS.objectivePos = { x: 120, z: 128 };
    PS.HUD.setObjective('FIRST CRATE', 'Deliver the crate to the Neon Quay — 34m');
    PS.radio.idx = 1;
    PS.fixedCamera = { x: 74, y: 3.4, z: 146, lx: 96, ly: 1.4, lz: 158 };
  } else if (name === 'chase') {
    PS.setWeather('clear');
    const coupe = PS.vehicles.find(function (c) { return c.parked && c.kind === 'coupe'; }) || PS.vehicles[0];
    coupe.parked = false; coupe.x = 8; coupe.z = 0; coupe.angle = Math.PI / 2; coupe.speed = 19;
    coupe.group.position.set(8, 0, 0); coupe.group.rotation.y = Math.PI / 2;
    hero.inCar = coupe; hero.x = 8; hero.z = 0; hero.group.visible = false; PS.playerCar = coupe;
    const spots = [[-9, -3.2], [-11, 3.4], [-22, -3.4], [-25, 3.2]];
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
    PS.fixedCamera = { x: -14, y: 3.1, z: -10.5, lx: 10, ly: 1.2, lz: 1 };
  } else if (name === 'boat') {
    PS.setWeather('clear');
    const boat = PS.boat;
    boat.x = 224; boat.z = 58; boat.angle = 0.25; boat.speed = 8;
    boat.group.position.set(224, -0.15, 58); boat.group.rotation.y = 0.25;
    hero.inBoat = true; hero.x = 224; hero.z = 58; hero.group.visible = false;
    // pre-lay a wake trail at water level behind the boat
    const pos = boat.wake.geometry.attributes.position;
    for (let i = 0; i < 130; i++) {
      const t = i / 130;
      pos.setXYZ(i, 224 - Math.sin(0.25) * t * 34 + (Math.random() - 0.5) * 2.4, 0.18, 58 - Math.cos(0.25) * t * 34 + (Math.random() - 0.5) * 2.4);
    }
    pos.needsUpdate = true;
    PS.M.idx = 13; PS.M.active = true; PS.M.step = 1;
    PS.objectivePos = PS.PLACES.covePickup;
    PS.HUD.setObjective('NIGHT FERRY', 'Sail to the Smuggler\'s Cove pickup — 96m');
    PS.fixedCamera = { x: 207, y: 5.2, z: 84, lx: 228, ly: 1.2, lz: 40 };
  } else if (name === 'onfoot') {
    PS.setWeather('clear');
    hero.x = -52; hero.z = 130; hero.angle = Math.PI / 2; hero.group.visible = true;
    hero.group.position.set(-52, 0, 130); hero.group.rotation.y = Math.PI / 2;
    hero.gunMesh.visible = true; hero.aiming = true;
    if (PS.sableNPC) { PS.sableNPC.position.set(-48.6, 0, 128.4); PS.sableNPC.rotation.y = -Math.PI / 2; }
    PS.peds.forEach(function (p, i) {
      if (i < 4) { p.x = -58 + i * 3.4; p.z = 136 - (i % 2) * 5; p.group.position.set(p.x, 0, p.z); }
    });
    PS.objectivePos = { x: -40, z: 124 };
    PS.HUD.setObjective('CANNERY TITHE', 'Collect from the Cannery Row stalls — 12m');
    PS.showDialogue([['Sable Ivers', 'Three stalls owe the tithe, Marco. On foot, polite, firm. Bao Nine is just up the row if you need a meal first.']]);
    PS.fixedCamera = { x: -60, y: 2.6, z: 137, lx: -44, ly: 1.3, lz: 126 };
  }
  PS.HUD.refresh();
};
