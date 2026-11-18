// saga.js — the sixteen-mission campaign of Port Sombra: Neon Tide, plus
// repeatable smuggling runs and checkpoint races. One data-driven step
// engine drives every job: goto / timed / enterCar / fight / hold / lose /
// collect / race / boat legs, with dialogue from fixer Sable Ivers.
window.PS = window.PS || {};

const SABLE = 'Sable Ivers', MARCO = 'Marco Venn';
PS.MISSIONS = [
  { title: 'FIRST CRATE', pay: 150, lines: [[SABLE, 'Marco. One crate, Cannery Row, still warm from the boat. Walk it to the Neon Quay before the tide turns.'], [MARCO, 'On it. Keep the coffee hot.']], steps: [
    { kind: 'goto', x: -100, z: 128, label: 'Pick up the crate in Cannery Row' },
    { kind: 'goto', x: 120, z: 128, label: 'Deliver the crate to the Neon Quay' }] },
  { title: 'FERRY BY NINE', pay: 120, lines: [[SABLE, 'A passenger at the Terraces needs Ferry Point before the nine boat. Clock is already running.']], steps: [
    { kind: 'timed', x: 150, z: 16, time: 80, label: 'Reach Ferry Point before the ferry leaves' }] },
  { title: 'COBALT SERPENT', pay: 200, lines: [[SABLE, 'A cobalt Serpentine S sleeps in The Terraces. The Yards chop dock pays well for blue snakes.']], steps: [
    { kind: 'enterCar', special: 'serpentine', label: 'Steal the cobalt Serpentine S in The Terraces' },
    { kind: 'goto', x: 100, z: -56, label: 'Deliver the Serpentine to the chop dock', requireSpecial: 'serpentine' }] },
  { title: 'YARD DOGS', pay: 180, lines: [[SABLE, 'Rival crew squatting in my Container Yards. Four of them. Persuade them.']], steps: [
    { kind: 'goto', x: 80, z: -100, label: 'Go to the Container Yards' },
    { kind: 'fight', x: 80, z: -100, count: 4, label: 'Clear the Yard Dogs (0/4)' }] },
  { title: 'LIGHTHOUSE CACHE', pay: 220, lines: [[SABLE, 'A cache washes up at the Cove. Hold the point a full minute, then lose the law.']], steps: [
    { kind: 'hold', x: 0, z: 158, time: 60, label: 'Hold the Cove cache point' },
    { kind: 'lose', label: 'Lose the police' }] },
  { title: 'CANNERY TITHE', pay: 130, lines: [[SABLE, 'Three stalls owe the tithe. On foot, polite, firm.']], steps: [
    { kind: 'collect', points: [[-152, 128], [-100, 144], [-58, 128]], foot: true, label: 'Collect from the Cannery Row stalls' }] },
  { title: 'THREE DROPS, ONE NIGHT', pay: 200, lines: [[SABLE, 'Three drops, one night, no names. The clock does not care about traffic.']], steps: [
    { kind: 'collect', points: [[40, 44], [-120, -76], [120, 84]], time: 170, label: 'Make all three drops' }] },
  { title: "HARBOR MASTER'S RIDE", pay: 240, lines: [[SABLE, 'The Harbor Master flaunts a police interceptor at the depot. Bring it to my garage.']], steps: [
    { kind: 'enterCar', special: 'police', label: 'Steal the interceptor at the depot (south edge)' },
    { kind: 'goto', x: 84, z: 40, label: "Deliver it to Sable's Garage", requireSpecial: 'police' }] },
  { title: 'CRANE TOP COVER', pay: 230, lines: [[SABLE, 'Gunmen on my cranes think rent is optional. Three of them. It is not.']], steps: [
    { kind: 'goto', x: 118, z: -96, label: 'Reach the crane row in the Container Yards' },
    { kind: 'fight', x: 118, z: -96, count: 3, label: 'Clear the crane gunmen (0/3)' }] },
  { title: 'THE BLACK LEDGER', pay: 260, lines: [[SABLE, 'My ledger sleeps at the Cove Hut. Carry it to me — and Marco, you will be carrying three stars too.']], steps: [
    { kind: 'goto', x: 26, z: 120, label: 'Pick up the Black Ledger at the Cove Hut', setStars: 3 },
    { kind: 'goto', x: 140, z: 6, label: 'Bring the ledger to Sable at Ferry Point' }] },
  { title: 'BREAKWATER RUN', pay: 280, lines: [[SABLE, 'Checkpoints on the coast road are strangling my trade. Smash through and light the breakwater.']], steps: [
    { kind: 'collect', points: [[160, 44], [160, -36], [160, -106]], label: 'Smash through the coast checkpoints' },
    { kind: 'goto', x: 214, z: -132, label: 'Reach the breakwater lighthouse' }] },
  { title: 'SALT TRUCK', pay: 300, lines: [[SABLE, 'The armored salt truck in the Yards is full of everybody else\'s money. The Neon Quay vault wants it.']], steps: [
    { kind: 'enterCar', special: 'salttruck', label: 'Take the armored salt truck in the Container Yards' },
    { kind: 'goto', x: 140, z: 150, label: 'Drive the salt truck to the Neon Quay vault', requireSpecial: 'salttruck' }] },
  { title: 'REGATTA OF KNIVES', pay: 300, lines: [[SABLE, 'The harbor crews race at night for bragging rights. Win it and we own the bragging.']], steps: [
    { kind: 'collect', points: [[80, 84], [156, 84], [156, -76], [80, -116], [4, -36]], time: 130, label: 'Win the Regatta of Knives checkpoints' }] },
  { title: 'NIGHT FERRY', pay: 320, lines: [[SABLE, 'The patrol boat at my pier. Sail her to the Cove pickup buoy and bring her home. Mind the breakwater.']], steps: [
    { kind: 'boardBoat', label: 'Board the patrol boat at Ferry Point pier' },
    { kind: 'boatTo', x: 232, z: 148, label: 'Sail to the Smuggler\'s Cove pickup' },
    { kind: 'boatTo', x: 216, z: 16, label: 'Bring the boat back to Ferry Point' }] },
  { title: 'TERRACES BLACKOUT', pay: 340, lines: [[SABLE, 'Cut three substation boxes in The Terraces. Dark streets, quiet money. The law will not love it.']], steps: [
    { kind: 'collect', points: [[-140, -140], [-60, -100], [-100, -60]], foot: true, setStars: 2, label: 'Cut the substation power boxes' }] },
  { title: 'NEON TIDE', pay: 600, lines: [[SABLE, 'Last job, Marco. The vault cash, five stars, and the city limits. Run the tide out.'], [MARCO, 'If I make it, I name the boat after you.']], steps: [
    { kind: 'goto', x: 140, z: 150, label: 'Take the vault cash at the Neon Quay', setStars: 5 },
    { kind: 'goto', x: -178, z: 0, label: 'Escape past the city limits' }] }
];

PS.M = { idx: 0, step: 0, active: false, side: null, timer: null, holdLeft: 0, collectIdx: 0, spawned: false, complete: false };
PS.currentStep = function () {
  const job = PS.M.side || PS.MISSIONS[PS.M.idx];
  return job ? job.steps[PS.M.step] : null;
};
PS.jobTitle = function () { return PS.M.side ? PS.M.side.title : (PS.MISSIONS[PS.M.idx] ? PS.MISSIONS[PS.M.idx].title : 'FREE ROAM'); };

PS.beginJob = function (job, isSide) {
  PS.M.side = isSide ? job : null; PS.M.step = 0; PS.M.active = true; PS.M.spawned = false; PS.M.collectIdx = 0;
  const st = PS.currentStep();
  PS.M.timer = st && st.time ? st.time : null;
  if (st && st.setStars) PS.setWanted(st.setStars);
  PS.refreshObjective();
};
PS.startMission = function (idx) {
  const m = PS.MISSIONS[idx]; if (!m) return;
  PS.showDialogue(m.lines, function () { PS.beginJob(m, false); PS.banner(m.title); });
};
PS.refreshObjective = function () {
  const st = PS.currentStep(), hero = PS.hero;
  if (!PS.M.active || !st) {
    PS.objectivePos = null;
    PS.HUD.setObjective(PS.M.complete ? 'CAMPAIGN COMPLETE' : 'FREE ROAM', PS.M.complete ? 'Smuggling runs and races pay at Sable\'s booth.' : 'Talk to Sable at Ferry Point for work.');
    PS.objectivePos = PS.PLACES.sable; return;
  }
  let pos = null;
  if (st.kind === 'collect') { const p = st.points[PS.M.collectIdx]; pos = { x: p[0], z: p[1] }; }
  else if (st.x !== undefined) pos = { x: st.x, z: st.z };
  else if (st.kind === 'enterCar') { const c = PS.findSpecial(st.special); if (c) pos = { x: c.x, z: c.z }; }
  else if (st.kind === 'boardBoat') pos = PS.PLACES.boatDock;
  else if (st.kind === 'fight') pos = { x: st.x, z: st.z };
  PS.objectivePos = pos;
  const dist = pos && hero ? Math.round(Math.hypot(pos.x - hero.x, pos.z - hero.z)) : 0;
  let text = st.label + (pos ? ' — ' + dist + 'm' : '');
  if (PS.M.timer !== null) text += ' — ' + Math.ceil(PS.M.timer) + 's';
  if (st.kind === 'hold') text += ' — ' + Math.ceil(PS.M.holdLeft || st.time) + 's';
  PS.HUD.setObjective(PS.jobTitle(), text);
};
PS.findSpecial = function (special) {
  if (special === 'police') { for (const c of PS.policePool) if (!c.dead) return c; return null; }
  for (const c of PS.vehicles) if (c.special === special) return c;
  return null;
};
PS.completeJob = function () {
  const job = PS.M.side || PS.MISSIONS[PS.M.idx];
  PS.addCash(job.pay); PS.addRep(20);
  PS.banner('JOB DONE +$' + job.pay);
  PS.audio && PS.audio.sfx('cash');
  PS.M.active = false; PS.M.side = null; PS.objectivePos = null;
  if (!PS.M.side && job === PS.MISSIONS[PS.M.idx]) {
    PS.M.idx++;
    if (PS.M.idx >= PS.MISSIONS.length) { PS.M.complete = true; PS.banner('NEON TIDE — CAMPAIGN COMPLETE', 4200); }
  }
  PS.saveGame(); PS.refreshObjective();
};
PS.failStep = function (why) {
  PS.banner(why + ' — TRY AGAIN');
  const job = PS.M.side || PS.MISSIONS[PS.M.idx];
  PS.M.step = 0; PS.M.collectIdx = 0; PS.M.spawned = false;
  const st = PS.currentStep(); PS.M.timer = st && st.time ? st.time : null;
  PS.clearThugs(); PS.refreshObjective();
};
PS.advanceStep = function () {
  const job = PS.M.side || PS.MISSIONS[PS.M.idx];
  PS.M.step++; PS.M.spawned = false; PS.M.collectIdx = 0;
  if (PS.M.step >= job.steps.length) { PS.completeJob(); return; }
  const st = PS.currentStep();
  PS.M.timer = st && st.time ? st.time : null;
  if (st && st.setStars) PS.setWanted(st.setStars);
  if (st && st.kind === 'hold') PS.M.holdLeft = st.time;
  PS.banner('OBJECTIVE UPDATED');
  PS.refreshObjective();
};

PS.updateMissions = function (dt) {
  if (!PS.M.active || PS.dialogue) { return; }
  const st = PS.currentStep(), hero = PS.hero; if (!st || !hero) return;
  if (PS.M.timer !== null && st.kind !== 'hold') {
    PS.M.timer -= dt;
    if (PS.M.timer <= 0) { PS.failStep('OUT OF TIME'); return; }
    if (Math.floor(PS.M.timer * 2) !== Math.floor((PS.M.timer + dt) * 2)) PS.refreshObjective();
  }
  const at = function (x, z, r) { return Math.hypot(hero.x - x, hero.z - z) < r; };
  if (st.kind === 'goto' || st.kind === 'timed') {
    if (st.requireSpecial) { const c = PS.findSpecial(st.requireSpecial); if (!hero.inCar || hero.inCar !== c) { PS.refreshObjective(); return; } }
    if (at(st.x, st.z, 5)) PS.advanceStep();
  } else if (st.kind === 'enterCar') {
    const c = PS.findSpecial(st.special);
    if (c) { PS.objectivePos = { x: c.x, z: c.z }; if (hero.inCar === c) PS.advanceStep(); }
  } else if (st.kind === 'fight') {
    if (!PS.M.spawned) {
      PS.M.spawned = true;
      for (let i = 0; i < st.count; i++) PS.spawnThug(st.x + (i - 1.5) * 5, st.z + (i % 2) * 6 - 3);
    }
    const alive = PS.thugs.filter(function (t) { return !t.dead; }).length;
    PS.HUD.setObjective(PS.jobTitle(), st.label.replace(/\(\d+\/\d+\)/, '(' + (st.count - alive) + '/' + st.count + ')'));
    PS.objectivePos = { x: st.x, z: st.z };
    if (alive === 0) { PS.clearThugs(); PS.advanceStep(); }
  } else if (st.kind === 'hold') {
    if (PS.M.holdLeft === 0 || PS.M.holdLeft === undefined) PS.M.holdLeft = st.time;
    if (at(st.x, st.z, 9)) {
      PS.M.holdLeft -= dt;
      if (!PS.M.spawned && PS.M.holdLeft < st.time - 18) { PS.M.spawned = true; PS.spawnThug(st.x + 10, st.z); PS.spawnThug(st.x - 9, st.z + 6); }
      if (Math.floor(PS.M.holdLeft * 2) !== Math.floor((PS.M.holdLeft + dt) * 2)) PS.refreshObjective();
      if (PS.M.holdLeft <= 0) { PS.setWanted(3); PS.advanceStep(); }
    }
  } else if (st.kind === 'lose') {
    PS.HUD.setObjective(PS.jobTitle(), 'Lose the police — break line of sight');
    PS.objectivePos = null;
    if (PS.wanted.stars === 0) PS.advanceStep();
  } else if (st.kind === 'collect') {
    const p = st.points[PS.M.collectIdx];
    PS.objectivePos = { x: p[0], z: p[1] };
    if (st.foot && hero.inCar) { PS.HUD.setObjective(PS.jobTitle(), st.label + ' — on foot'); return; }
    if (at(p[0], p[1], 4)) {
      PS.M.collectIdx++; PS.audio && PS.audio.sfx('cash');
      if (PS.M.collectIdx >= st.points.length) PS.advanceStep(); else PS.refreshObjective();
    }
  } else if (st.kind === 'boardBoat') {
    PS.objectivePos = PS.PLACES.boatDock;
    if (hero.inBoat) PS.advanceStep();
  } else if (st.kind === 'boatTo') {
    PS.objectivePos = { x: st.x, z: st.z };
    if (hero.inBoat && PS.boat && Math.hypot(PS.boat.x - st.x, PS.boat.z - st.z) < 11) PS.advanceStep();
  }
};

// repeatable earners, offered by Sable after the campaign is under way
PS.startSmuggleRun = function () {
  const rnd = Math.random;
  const pickups = [[-100, 128], [80, -100], [-140, -60], [60, 120], [0, 158]];
  const drops = [[120, 128], [140, 6], [-120, 46], [100, -56], [-40, -140]];
  const p = pickups[Math.floor(rnd() * pickups.length)], d = drops[Math.floor(rnd() * drops.length)];
  PS.beginJob({ title: 'SMUGGLING RUN', pay: 60 + Math.floor(rnd() * 50), steps: [
    { kind: 'goto', x: p[0], z: p[1], label: 'Pick up the contraband' },
    { kind: 'goto', x: d[0], z: d[1], label: 'Make the drop' }] }, true);
  PS.banner('SMUGGLING RUN');
};
PS.startRace = function () {
  PS.beginJob({ title: 'HARBOR RACE', pay: 90, steps: [
    { kind: 'collect', points: [[80, 84], [156, 0], [80, -76], [0, 0]], time: 95, label: 'Harbor Race checkpoints' }] }, true);
  PS.banner('HARBOR RACE');
};
PS.talkToSable = function () {
  if (PS.M.active) { PS.showDialogue([[SABLE, 'Finish the job in hand first, Marco. The tide does not wait.']]); return; }
  if (PS.M.complete) {
    PS.showDialogue([[SABLE, 'The port is yours now. Runs and races still pay, if your hands itch.']], function () { Math.random() > 0.5 ? PS.startSmuggleRun() : PS.startRace(); });
    return;
  }
  if (PS.M.idx === 0 && !PS.M.everStarted) { PS.M.everStarted = true; PS.startMission(0); return; }
  PS.showDialogue([[SABLE, 'Work, or extra money? Work first — the port respects a finished job.']], function () {
    if (Math.random() > 0.72) PS.startSmuggleRun(); else PS.startMission(PS.M.idx);
  });
};
