// marco.js — humanoid factory and the hero, Marco Venn.
// Each person is ONE baked vertex-coloured mesh (legs, torso, arms, head).
// The legs always get a pants colour: when a palette omits one it is
// derived from the torso colour, so no material ever sees an undefined
// colour (a hard rule from an earlier build's console warning).
window.PS = window.PS || {};

PS.makeHumanoid = function (palette) {
  const shirt = palette.shirt;
  const pants = palette.pants !== undefined ? palette.pants : new THREE.Color(shirt).multiplyScalar(0.45).getHex();
  const skin = palette.skin !== undefined ? palette.skin : 0xc9976b;
  const items = [];
  items.push(PS.boxItem(0.34, 0.78, 0.24, pants, -0.13, 0.39, 0));   // legs (pants always defined)
  items.push(PS.boxItem(0.34, 0.78, 0.24, pants, 0.13, 0.39, 0));
  items.push(PS.boxItem(0.62, 0.72, 0.3, shirt, 0, 1.14, 0));        // torso
  items.push(PS.boxItem(0.2, 0.66, 0.2, shirt, -0.42, 1.12, 0));     // arms
  items.push(PS.boxItem(0.2, 0.66, 0.2, shirt, 0.42, 1.12, 0));
  items.push(PS.boxItem(0.17, 0.17, 0.17, skin, -0.42, 0.72, 0));    // hands
  items.push(PS.boxItem(0.17, 0.17, 0.17, skin, 0.42, 0.72, 0));
  items.push(PS.boxItem(0.4, 0.44, 0.4, skin, 0, 1.74, 0));          // head
  if (palette.hat !== undefined) items.push(PS.boxItem(0.46, 0.14, 0.46, palette.hat, 0, 2.0, 0));
  if (palette.vest !== undefined) items.push(PS.boxItem(0.66, 0.5, 0.34, palette.vest, 0, 1.2, 0));
  const mesh = PS.bakedMesh(items);
  const group = new THREE.Group();
  group.add(mesh);
  return group;
};

PS.createHero = function (scene, x, z) {
  const group = PS.makeHumanoid({ shirt: 0x1f6f8b, pants: 0x23262e, skin: 0xc9976b, hat: 0x10151c });
  group.position.set(x, 0, z);
  scene.add(group);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.42), new THREE.MeshLambertMaterial({ color: 0x14181f }));
  gun.position.set(0.42, 0.95, 0.3); gun.visible = false; group.add(gun);
  PS.hero = {
    group: group, gunMesh: gun, x: x, z: z, angle: 0, speed: 0, walkPhase: 0,
    health: 100, maxHealth: 100, armor: 0, inCar: null, inBoat: false, aiming: false, dead: false
  };
  return PS.hero;
};
// Shared locomotion for hero, peds, thugs and officers: bob + face heading.
PS.walkAnimate = function (obj, dt, moving) {
  if (moving) {
    obj.walkPhase += dt * 9;
    obj.group.position.y = Math.abs(Math.sin(obj.walkPhase)) * 0.07;
    obj.group.rotation.z = Math.sin(obj.walkPhase) * 0.045;
  } else {
    obj.group.position.y = 0; obj.group.rotation.z = 0;
  }
  obj.group.position.x = obj.x; obj.group.position.z = obj.z;
  obj.group.rotation.y = obj.angle;
};
