// bakekit.js — geometry baking helpers for Port Sombra: Neon Tide.
// Static scenery and vehicle shells are baked into single vertex-coloured
// meshes so the whole port renders in a few hundred draw calls. Also holds
// the seeded PRNG and the canvas-texture painter used for neon signs.
window.PS = window.PS || {};

PS.mulberry32 = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// One bake item: a box (or any BufferGeometry) placed and tinted.
PS.bakeItem = function (geo, color, x, y, z, ry, rx, rz) {
  return { geo: geo, color: new THREE.Color(color), x: x || 0, y: y || 0, z: z || 0, ry: ry || 0, rx: rx || 0, rz: rz || 0 };
};
PS.boxItem = function (w, h, d, color, x, y, z, ry) {
  return PS.bakeItem(new THREE.BoxGeometry(w, h, d), color, x, y, z, ry || 0);
};

// Merge bake items into ONE BufferGeometry with per-vertex colours.
PS.bakeMerge = function (items) {
  let total = 0;
  const prepared = [];
  const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (const it of items) {
    const g = it.geo.index ? it.geo.toNonIndexed() : it.geo;
    e.set(it.rx, it.ry, it.rz); q.setFromEuler(e); p.set(it.x, it.y, it.z);
    m.compose(p, q, s); g.applyMatrix4(m);
    prepared.push({ g: g, color: it.color });
    total += g.attributes.position.count;
  }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0, u = 0;
  for (const pr of prepared) {
    const pa = pr.g.attributes.position, na = pr.g.attributes.normal, ua = pr.g.attributes.uv;
    pos.set(pa.array, o * 3); nor.set(na.array, o * 3);
    if (ua) uv.set(ua.array, o * 2);
    for (let i = 0; i < pa.count; i++) { col[(o + i) * 3] = pr.color.r; col[(o + i) * 3 + 1] = pr.color.g; col[(o + i) * 3 + 2] = pr.color.b; }
    o += pa.count; u += pa.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
};
PS.bakedMesh = function (items, opts) {
  opts = opts || {};
  const mat = opts.basic
    ? new THREE.MeshBasicMaterial({ vertexColors: true, fog: opts.fog !== false })
    : new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x11131c });
  const mesh = new THREE.Mesh(PS.bakeMerge(items), mat);
  mesh.matrixAutoUpdate = false;
  return mesh;
};

// Canvas-painted neon sign texture (text glow on dark glass).
PS.signTexture = function (text, fg, bg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
  g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = fg; g.shadowBlur = 14; g.fillStyle = fg;
  g.fillText(text, 128, 34); g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
};
// Wet asphalt / quay ground texture, painted once.
PS.groundTexture = function (base, fleck) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  const rnd = PS.mulberry32(7);
  for (let i = 0; i < 380; i++) { g.fillStyle = fleck; g.globalAlpha = 0.05 + rnd() * 0.12; g.fillRect(rnd() * 128, rnd() * 128, 2, 2); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
