// hudveil.js — HUD, minimap, city map, dialogue, banners, shop menus,
// safehouse/save handling and the cash/rep/health economy of Port Sombra.
window.PS = window.PS || {};

PS.state = { cash: 120, rep: 0, ink: false, outfit: false, started: false };
PS.RANKS = [[0, 'RUNNER'], [60, 'COURIER'], [160, 'FIXER'], [320, 'SMUGGLER'], [560, 'TIDE KING']];
PS.rankName = function () { let n = 'RUNNER'; for (const r of PS.RANKS) if (PS.state.rep >= r[0]) n = r[1]; return n; };
PS.addCash = function (n) { PS.state.cash = Math.max(0, PS.state.cash + n); PS.audio && PS.audio.sfx('cash'); PS.HUD.refresh(); };
PS.addRep = function (n) { PS.state.rep += n * (PS.state.ink ? 1.5 : 1); PS.HUD.refresh(); };
PS.damageHero = function (n) {
  const hero = PS.hero; if (!hero || hero.dead) return;
  if (hero.armor > 0) { const absorbed = Math.min(hero.armor, n * 0.6); hero.armor -= absorbed; n -= absorbed; }
  hero.health -= n; PS.shake = Math.min(0.4, (PS.shake || 0) + 0.08);
  if (hero.health <= 0) PS.die('wasted');
  PS.HUD.refresh();
};
PS.healHero = function (n) { const hero = PS.hero; hero.health = Math.min(hero.maxHealth, hero.health + n); PS.HUD.refresh(); };

const el = function (id) { return document.getElementById(id); };
PS.HUD = {
  objective: { title: '', text: '' },
  refresh: function () {
    if (!PS.hero) return;
    el('cash').textContent = String(PS.state.cash);
    el('rank').textContent = PS.rankName() + ' · REP ' + Math.floor(PS.state.rep);
    el('hp').style.width = Math.max(0, PS.hero.health / PS.hero.maxHealth * 100) + '%';
    el('busted').style.width = (PS.wanted ? PS.wanted.busted * 100 : 0) + '%';
    const stars = PS.wanted ? PS.wanted.stars : 0;
    el('stars').innerHTML = '★★★★★'.slice(0, stars) + '<span class="off">' + '★★★★★'.slice(0, 5 - stars) + '</span>';
    el('ammo').textContent = PS.hero.inCar ? '' : 'AMMO ' + PS.gun.ammo + ' / ' + PS.gun.reserve;
    el('radiobox').textContent = (PS.hero.inCar || PS.hero.inBoat) ? '♪ ' + PS.STATIONS[PS.radio.idx].name : '';
    el('weather').textContent = PS.weather ? PS.weather.label : '';
    el('clock').textContent = PS.clockText ? PS.clockText() : '21:00';
  },
  setObjective: function (title, text) {
    this.objective = { title: title, text: text };
    el('objtitle').textContent = title; el('objtext').textContent = text;
  },
  update: function () {
    const v = PS.hero && PS.hero.inCar ? Math.abs(PS.hero.inCar.speed) * 3.6 : (PS.hero && PS.hero.inBoat ? Math.abs(PS.boat.speed) * 3.6 : 0);
    el('speed').textContent = String(Math.round(v));
    this.refreshMinimap();
  },
  refreshMinimap: function () {
    const cv = el('minimap'); if (!cv || !PS.hero) return;
    const g = cv.getContext('2d'), hero = PS.hero;
    const cx = cv.width / 2, cy = cv.height / 2, scale = 0.85, range = 105;
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#0a1826'; g.fillRect(0, 0, cv.width, cv.height);
    const px = function (x) { return cx + (x - hero.x) * scale; }, pz = function (z) { return cy + (z - hero.z) * scale; };
    g.fillStyle = '#0d3247'; g.fillRect(px(PS.WATER_X), 0, cv.width, cv.height); // harbor water east
    g.strokeStyle = 'rgba(160,190,215,0.5)'; g.lineWidth = 2;
    for (const x of PS.VROADS) { g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), cv.height); g.stroke(); }
    for (const z of PS.HROADS) { g.beginPath(); g.moveTo(0, pz(z)); g.lineTo(cv.width, pz(z)); g.stroke(); }
    const dot = function (x, z, color, r) { const dx = x - hero.x, dz = z - hero.z; if (Math.hypot(dx, dz) > range) return; g.fillStyle = color; g.beginPath(); g.arc(px(x), pz(z), r, 0, 6.29); g.fill(); };
    for (const s of PS.PLACES.shops) dot(s.x, s.z, '#5effa1', 2.5);
    for (const s of PS.PLACES.safehouses) dot(s.x, s.z, '#7df0ff', 2.5);
    for (const c of PS.vehicles) if (!c.dead) dot(c.x, c.z, '#d8dee6', 2);
    if (PS.boat) dot(PS.boat.x, PS.boat.z, '#40e0ff', 3);
    for (const c of PS.policePool) if (c.active) dot(c.x, c.z, Math.floor(PS.time * 3) % 2 ? '#ff3b30' : '#2e6fc2', 3);
    if (PS.objectivePos) dot(PS.objectivePos.x, PS.objectivePos.z, '#ffd23e', 4);
    // hero arrow
    g.save(); g.translate(cx, cy); g.rotate(0);
    g.fillStyle = '#ffffff'; g.beginPath();
    const a = PS.heroAngleRad ? PS.heroAngleRad() : 0;
    g.moveTo(Math.sin(a) * 7, -Math.cos(a) * 7); g.lineTo(-5, 5); g.lineTo(5, 5); g.closePath(); g.fill(); g.restore();
  },
  drawBigMap: function () {
    const cv = el('mapcanvas'); if (!cv) return;
    const g = cv.getContext('2d'), W = cv.width;
    const mx = function (x) { return (x + 200) / 460 * W; }, mz = function (z) { return (z + 200) / 400 * W; };
    g.fillStyle = '#0a1826'; g.fillRect(0, 0, W, W);
    g.fillStyle = '#0d3247'; g.fillRect(mx(PS.WATER_X), 0, W, W);
    g.strokeStyle = 'rgba(160,190,215,0.55)';
    for (const x of PS.VROADS) { g.beginPath(); g.moveTo(mx(x), 0); g.lineTo(mx(x), W); g.stroke(); }
    for (const z of PS.HROADS) { g.beginPath(); g.moveTo(0, mz(z)); g.lineTo(W, mz(z)); g.stroke(); }
    g.fillStyle = '#bfe9ff'; g.font = 'bold 15px sans-serif';
    for (const d of PS.DISTRICTS) {
      const cx = -140 + d.cols[1] * 40, cz = -140 + d.rows[1] * 40;
      g.fillText(d.name, mx(cx) - 40, mz(cz));
    }
    const dot = function (x, z, color, r) { g.fillStyle = color; g.beginPath(); g.arc(mx(x), mz(z), r, 0, 6.29); g.fill(); };
    for (const s of PS.PLACES.shops) dot(s.x, s.z, '#5effa1', 4);
    for (const s of PS.PLACES.safehouses) dot(s.x, s.z, '#7df0ff', 4);
    if (PS.objectivePos) dot(PS.objectivePos.x, PS.objectivePos.z, '#ffd23e', 6);
    if (PS.hero) dot(PS.hero.x, PS.hero.z, '#ffffff', 5);
  }
};

PS.banner = function (text, ms) {
  const b = el('banner'); if (!b) return;
  b.textContent = text; b.classList.remove('hidden');
  clearTimeout(PS.bannerT); PS.bannerT = setTimeout(function () { b.classList.add('hidden'); }, ms || 2400);
};
PS.showDialogue = function (lines, onDone) {
  PS.dialogue = { lines: lines, idx: 0, onDone: onDone || null };
  PS.renderDialogue();
};
PS.renderDialogue = function () {
  const d = PS.dialogue, box = el('dialogue');
  if (!d || d.idx >= d.lines.length) { box.classList.add('hidden'); PS.dialogue = null; if (d && d.onDone) d.onDone(); return; }
  box.classList.remove('hidden');
  el('dlgname').textContent = d.lines[d.idx][0];
  el('dlgtext').textContent = d.lines[d.idx][1];
};
PS.advanceDialogue = function () { if (PS.dialogue) { PS.dialogue.idx++; PS.renderDialogue(); } };

// --- shops & safehouses ---
PS.openShop = function (shop) {
  PS.state.mode = 'shop'; PS.currentShop = shop;
  el('shopname').textContent = shop.name;
  const box = el('shopitems'); box.innerHTML = '';
  for (const item of shop.items) {
    const b = document.createElement('button');
    b.className = 'shopitem'; b.textContent = item.label;
    b.onclick = function () { PS.buyItem(item); };
    box.appendChild(b);
  }
  el('shopmenu').classList.remove('hidden');
};
PS.closeShop = function () { el('shopmenu').classList.add('hidden'); if (PS.state.mode === 'shop') PS.state.mode = 'play'; };
PS.buyItem = function (item) {
  const hero = PS.hero;
  if (item.cost > 0 && PS.state.cash < item.cost) { PS.banner('NOT ENOUGH CASH'); return; }
  PS.addCash(-item.cost);
  if (item.fx === 'ammo') { PS.gun.reserve += 24; }
  else if (item.fx === 'armor') { hero.armor = 100; }
  else if (item.fx === 'repairCar') { if (hero.inCar) hero.inCar.health = 100; else if (PS.lastCar) PS.lastCar.health = 100; }
  else if (item.fx === 'outfit') { if (!PS.state.outfit) { PS.state.outfit = true; hero.maxHealth += 25; hero.health += 25; } }
  else if (item.fx === 'meal') PS.healHero(50);
  else if (item.fx === 'sell') { /* cash already added by negative cost */ }
  else if (item.fx === 'fullheal') { hero.health = hero.maxHealth; }
  else if (item.fx === 'repairBoat') { if (PS.boat) PS.boat.health = 100; }
  else if (item.fx === 'ink') { PS.state.ink = true; }
  PS.banner('BOUGHT — ' + PS.currentShop.name);
  PS.HUD.refresh(); PS.saveGame();
};
PS.useSafehouse = function (sh) {
  PS.healHero(PS.hero.maxHealth);
  if (PS.wanted.stars > 0) PS.setWanted(PS.wanted.stars - 1);
  PS.saveGame();
  PS.banner('SAVED AT ' + sh.name.toUpperCase());
};
PS.saveGame = function () {
  try {
    localStorage.setItem('portsombra-save', JSON.stringify({
      cash: PS.state.cash, rep: PS.state.rep, ink: PS.state.ink, outfit: PS.state.outfit,
      mission: PS.M ? PS.M.idx : 0, x: PS.hero.x, z: PS.hero.z, maxHealth: PS.hero.maxHealth
    }));
  } catch (err) { /* storage may be unavailable; the game plays on */ }
};
PS.loadSave = function () {
  try { const s = localStorage.getItem('portsombra-save'); return s ? JSON.parse(s) : null; } catch (err) { return null; }
};
