// ============================================
// ЗАГРУЗКА
// ============================================
var loadingEl = document.getElementById('loading');
var loadingFill = document.getElementById('loading-fill');
var loadingPercent = document.getElementById('loading-percent');
var loadingStatus = document.getElementById('loading-status');
var loadSteps = ['Инициализация...', 'Земля...', 'Колоски...', 'Амбар...', 'Корова...', 'Иголка...', 'Готово!'];
function setLoad(p, s) {
  loadingFill.style.width = p + '%';
  loadingPercent.textContent = Math.floor(p) + '%';
  if (s) loadingStatus.textContent = s;
}

// ============================================
// СОСТОЯНИЕ
// ============================================
var state = {
  money: 0, hay: 0, milk: 0, totalHay: 0, totalMilkSold: 0,
  maxHay: 25, moveSpeed: 5.0, gatherCooldown: 0.8, lastGatherTime: 0,
  foundNeedle: false, speedLvl: 1, gatherLvl: 1, invLvl: 1, luckLvl: 1,
  hasFork: false, hasDynamite: false, hasVacuum: false,
  forkCooldown: 2.0, lastForkTime: 0,
  dynamiteCooldown: 8.0, lastDynamiteTime: 0,
  vacuumActive: false, vacuumTimer: 0,
  autoGatherLvl: 0, autoGatherTimer: 0,
  stamina: 10, staminaMax: 10, staminaRegen: 2.0, staminaDrain: 5.0
};

var PRICES = {
  speed: [20, 40, 80, 160, 320, 640, 1280],
  gather: [30, 60, 120, 240, 480, 960, 1920],
  inv: [50, 100, 200, 400, 800, 1600, 3200],
  luck: [100, 250, 600, 1500, 4000],
  fork: [500], dynamite: [1200], vacuum: [2500],
  autoGather: [150, 400, 1000, 2500, 6000]
};
var MILK_PRICE = 5;

// ============================================
// СЦЕНА
// ============================================
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x9dc4e8);
scene.fog = new THREE.Fog(0xb8d4e8, 45, 130);

var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

var VIEW_DISTANCE = 80;
var UPDATE_INTERVAL = 0.1;
var frustum = new THREE.Frustum();
var projScreenMatrix = new THREE.Matrix4();
var visibleObjects = [];

function updateVisibility() {
  camera.updateMatrixWorld();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);
  for (var i = 0; i < visibleObjects.length; i++) {
    var obj = visibleObjects[i];
    if (obj.userData && obj.userData.viewPosition) {
      obj.visible = player.position.distanceTo(obj.userData.viewPosition) < VIEW_DISTANCE;
    }
  }
}

var hemiLight = new THREE.HemisphereLight(0xcce0ff, 0x4a7a2a, 0.8);
scene.add(hemiLight);
var sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
sun.position.set(40, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);
scene.add(sun.target);

var colliders = [];
function addCollider(x, z, r) { colliders.push({ x: x, z: z, r: r }); }
var WORLD_BOUND = 38;

setLoad(5, loadSteps[0]);

// ЗЕМЛЯ
var ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
setLoad(10, loadSteps[1]);

// СТОГ СЕНА
var haystackGroup = new THREE.Group();
haystackGroup.position.set(0, 0, -15);
scene.add(haystackGroup);

var HAYSTACK_RADIUS = 3.0;
var HAYSTACK_HEIGHT = 5.2;

var stemMaterials = [], headMaterials = [], awnMaterials = [];
for (var m = 0; m < 8; m++) {
  var hue = 0.10 + Math.random() * 0.05;
  stemMaterials.push(new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.65, 0.38 + Math.random() * 0.08), roughness: 0.85 }));
  headMaterials.push(new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue + 0.005, 0.75, 0.52 + Math.random() * 0.1), roughness: 0.75 }));
  awnMaterials.push(new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue - 0.01, 0.55, 0.6), roughness: 0.85 }));
}

var stemGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.65, 5);
var grainGeo = new THREE.SphereGeometry(0.026, 5, 4);
var tipGeo = new THREE.ConeGeometry(0.014, 0.08, 4);
var awnGeo = new THREE.CylinderGeometry(0.003, 0.004, 0.18, 3);
var knotGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.035, 5);
var leafGeo = new THREE.ConeGeometry(0.014, 0.18, 3);

function addStalk(parentGroup, x, y, z, rotX, rotY, rotZ, scale) {
  var stemMat = stemMaterials[Math.floor(Math.random() * 8)];
  var headMat = headMaterials[Math.floor(Math.random() * 8)];
  var awnMat = awnMaterials[Math.floor(Math.random() * 8)];
  var stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.set(x, y, z);
  stem.rotation.set(rotX, rotY, rotZ);
  stem.scale.setScalar(scale);
  parentGroup.add(stem);
  var knot = new THREE.Mesh(knotGeo, headMat);
  knot.position.set(x, y - 0.1 * scale, z);
  knot.rotation.set(rotX, rotY, rotZ);
  knot.scale.setScalar(scale);
  parentGroup.add(knot);
  for (var i = 0; i < 7; i++) {
    var t = i / 6;
    var gy = y + (0.30 + t * 0.24) * scale;
    var ga = i * 2.3 + rotY;
    var grain = new THREE.Mesh(grainGeo, headMat);
    grain.position.set(x + Math.cos(ga) * 0.022 * scale, gy, z + Math.sin(ga) * 0.022 * scale);
    grain.scale.set(0.7 * scale, 1.6 * scale, 0.7 * scale);
    parentGroup.add(grain);
  }
  var tip = new THREE.Mesh(tipGeo, headMat);
  tip.position.set(x, y + 0.6 * scale, z);
  tip.scale.setScalar(scale);
  parentGroup.add(tip);
  for (var a = 0; a < 5; a++) {
    var aa = (a / 5) * Math.PI * 2 + rotY;
    var awn = new THREE.Mesh(awnGeo, awnMat);
    awn.position.set(x + Math.cos(aa) * 0.015 * scale, y + 0.62 * scale, z + Math.sin(aa) * 0.015 * scale);
    awn.rotation.set(-Math.sin(aa) * 0.35, rotY, Math.cos(aa) * 0.35);
    awn.scale.setScalar(scale);
    parentGroup.add(awn);
  }
  for (var L = 0; L < 2; L++) {
    var langle = Math.random() * Math.PI * 2;
    var leaf = new THREE.Mesh(leafGeo, stemMat);
    leaf.position.set(x + Math.cos(langle) * 0.03 * scale, y - (0.18 + L * 0.1) * scale, z + Math.sin(langle) * 0.03 * scale);
    leaf.rotation.set(rotX, rotY, Math.cos(langle) * 1.2);
    leaf.scale.set(scale, scale, scale * 0.3);
    parentGroup.add(leaf);
  }
}

function getConeRadius(hp) { return HAYSTACK_RADIUS * (1 - Math.pow(hp, 0.9) * 0.95); }

var coreMass = new THREE.Mesh(
  new THREE.ConeGeometry(HAYSTACK_RADIUS * 0.82, HAYSTACK_HEIGHT * 0.94, 16),
  new THREE.MeshStandardMaterial({ color: 0x9a7a28, roughness: 1 })
);
coreMass.position.y = HAYSTACK_HEIGHT * 0.47;
haystackGroup.add(coreMass);

setLoad(25, loadSteps[2]);

var layer1Stalks = [], layer2Stalks = [], layer3Stalks = [], skirtStalks = [];

for (var i1 = 0; i1 < 100; i1++) {
  var hp1 = Math.pow(Math.random(), 0.9);
  var ang1 = Math.random() * Math.PI * 2;
  var r1 = getConeRadius(hp1) * (0.5 + Math.random() * 0.3);
  addStalk(haystackGroup, Math.cos(ang1) * r1, hp1 * HAYSTACK_HEIGHT, Math.sin(ang1) * r1,
    (Math.random() - 0.5) * 0.8, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.8, 0.85 + Math.random() * 0.3);
}
haystackGroup.children.slice(-100).forEach(function(s) { if (s.isMesh) layer1Stalks.push(s); });
setLoad(35);

for (var i2 = 0; i2 < 130; i2++) {
  var hp2 = Math.pow(Math.random(), 0.9);
  var ang2 = Math.random() * Math.PI * 2;
  var r2 = getConeRadius(hp2) * (0.8 + Math.random() * 0.15);
  addStalk(haystackGroup, Math.cos(ang2) * r2, hp2 * HAYSTACK_HEIGHT, Math.sin(ang2) * r2,
    (Math.random() - 0.5) * 1.0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 1.0, 0.9 + Math.random() * 0.35);
}
haystackGroup.children.slice(-130).forEach(function(s) { if (s.isMesh) layer2Stalks.push(s); });
setLoad(45);

for (var i3 = 0; i3 < 160; i3++) {
  var hp3 = Math.pow(Math.random(), 0.9);
  var ang3 = Math.random() * Math.PI * 2;
  var r3 = getConeRadius(hp3) * (0.95 + Math.random() * 0.12);
  var outAngle = Math.atan2(Math.sin(ang3), Math.cos(ang3));
  addStalk(haystackGroup, Math.cos(ang3) * r3, hp3 * HAYSTACK_HEIGHT, Math.sin(ang3) * r3,
    (Math.random() - 0.5) * 0.6, outAngle + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.6, 0.95 + Math.random() * 0.4);
}
haystackGroup.children.slice(-160).forEach(function(s) { if (s.isMesh) layer3Stalks.push(s); });
setLoad(55);

for (var i4 = 0; i4 < 80; i4++) {
  var hp4 = 0.65 + Math.random() * 0.35;
  var ang4 = Math.random() * Math.PI * 2;
  var r4 = getConeRadius(hp4) * (0.85 + Math.random() * 0.15);
  addStalk(haystackGroup, Math.cos(ang4) * r4, hp4 * HAYSTACK_HEIGHT, Math.sin(ang4) * r4,
    (Math.random() - 0.5) * 0.4, ang4, -Math.cos(ang4) * 0.15, 0.8 + Math.random() * 0.3);
}
for (var tipI = 0; tipI < 20; tipI++) {
  var tang = Math.random() * Math.PI * 2;
  var tr = Math.random() * 0.12;
  addStalk(haystackGroup, Math.cos(tang) * tr, HAYSTACK_HEIGHT * (0.97 + Math.random() * 0.06), Math.sin(tang) * tr,
    (Math.random() - 0.5) * 0.5, tang, (Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.3);
}
for (var sk = 0; sk < 60; sk++) {
  var sang = (sk / 60) * Math.PI * 2 + Math.random() * 0.1;
  var sr = HAYSTACK_RADIUS * (0.98 + Math.random() * 0.1);
  addStalk(haystackGroup, Math.cos(sang) * sr, 0.1 + Math.random() * 0.2, Math.sin(sang) * sr,
    Math.PI - (Math.random() * 0.5 + 0.4), sang, (Math.random() - 0.5) * 0.6, 0.95 + Math.random() * 0.4);
}
haystackGroup.children.slice(-60).forEach(function(s) { if (s.isMesh) skirtStalks.push(s); });

function updateHaystackLOD() {
  var d = player.position.distanceTo(haystackGroup.position);
  var show1 = d < 40, show2 = d < 40, show3 = d < 25, showSkirt = d < 25;
  layer1Stalks.forEach(function(s) { s.visible = show1; });
  layer2Stalks.forEach(function(s) { s.visible = show2; });
  layer3Stalks.forEach(function(s) { s.visible = show3; });
  skirtStalks.forEach(function(s) { s.visible = showSkirt; });
}

addCollider(0, -15, HAYSTACK_RADIUS * 1.05);
setLoad(65, loadSteps[3]);

// ИГОЛКА
var needle = new THREE.Group();
var needleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6),
  new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.15 }));
needleBody.rotation.z = Math.PI / 2;
needle.add(needleBody);
var needleEye = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 }));
needleEye.position.x = 0.45;
needleEye.rotation.y = Math.PI / 2;
needle.add(needleEye);
needle.position.set((Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4);
needle.userData.isNeedle = true;
needle.visible = false;
haystackGroup.add(needle);

function relocateNeedle() {
  var a = Math.random() * Math.PI * 2;
  var r = Math.random() * HAYSTACK_RADIUS * 0.85;
  var h = 0.5 + Math.random() * (HAYSTACK_HEIGHT * 0.7);
  needle.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
  needle.rotation.set(Math.random(), Math.random() * Math.PI * 2, Math.random());
}

var needleRelocateTimer = 0;
var needleRelocateInterval = 30 + Math.random() * 30;
function updateNeedlePosition(dt) {
  if (state.foundNeedle) return;
  needleRelocateTimer += dt;
  if (needleRelocateTimer >= needleRelocateInterval) {
    needleRelocateTimer = 0;
    needleRelocateInterval = 30 + Math.random() * 30;
    relocateNeedle();
  }
}

// АМБАР
var barn = new THREE.Group();
barn.position.set(0, 0, 22);
scene.add(barn);
var redMat = new THREE.MeshStandardMaterial({ color: 0xa8241c, roughness: 0.85 });
var roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: 0.9 });
var BARN_W = 12, BARN_D = 10, BARN_H = 6.5, WALL_T = 0.4, doorW = 4.5;

var barnFloor = new THREE.Mesh(new THREE.BoxGeometry(BARN_W - WALL_T * 2, 0.15, BARN_D - WALL_T * 2),
  new THREE.MeshStandardMaterial({ color: 0x9a7858, roughness: 1 }));
barnFloor.position.set(0, 0.075, 0);
barnFloor.receiveShadow = true;
barn.add(barnFloor);

var backWall = new THREE.Mesh(new THREE.BoxGeometry(BARN_W, BARN_H, WALL_T), redMat);
backWall.position.set(0, BARN_H / 2, BARN_D / 2);
backWall.castShadow = true;
barn.add(backWall);

[-BARN_W / 2, BARN_W / 2].forEach(function(x) {
  var sw = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, BARN_H, BARN_D), redMat);
  sw.position.set(x, BARN_H / 2, 0);
  sw.castShadow = true;
  barn.add(sw);
});
var sideW = (BARN_W - doorW) / 2;
[-1, 1].forEach(function(sign) {
  var fp = new THREE.Mesh(new THREE.BoxGeometry(sideW, BARN_H, WALL_T), redMat);
  fp.position.set(sign * (doorW / 2 + sideW / 2), BARN_H / 2, -BARN_D / 2);
  fp.castShadow = true;
  barn.add(fp);
});
var lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, 1.8, WALL_T), redMat);
lintel.position.set(0, BARN_H - 0.9, -BARN_D / 2);
barn.add(lintel);

var roofGeo = new THREE.BoxGeometry(BARN_W + 1.2, 0.5, BARN_D * 0.65);
var roofL = new THREE.Mesh(roofGeo, roofMat);
roofL.position.set(0, BARN_H + 1.5, -BARN_D * 0.25);
roofL.rotation.x = -Math.PI / 6;
barn.add(roofL);
var roofR = new THREE.Mesh(roofGeo, roofMat);
roofR.position.set(0, BARN_H + 1.5, BARN_D * 0.25);
roofR.rotation.x = Math.PI / 6;
barn.add(roofR);

for (var bx = -BARN_W / 2 + 0.5; bx <= BARN_W / 2 - 0.5; bx += 1) addCollider(bx, 22 + BARN_D / 2, 0.55);
for (var bz = -BARN_D / 2 + 0.5; bz <= BARN_D / 2 - 0.5; bz += 1) {
  addCollider(-BARN_W / 2, 22 + bz, 0.55);
  addCollider(BARN_W / 2, 22 + bz, 0.55);
}
for (var fx = -BARN_W / 2 + 0.5; fx <= -doorW / 2 - 0.3; fx += 0.7) addCollider(fx, 22 - BARN_D / 2, 0.55);
for (var fx2 = doorW / 2 + 0.3; fx2 <= BARN_W / 2 - 0.5; fx2 += 0.7) addCollider(fx2, 22 - BARN_D / 2, 0.55);

setLoad(80, loadSteps[4]);

// КОРОВА
var cow = new THREE.Group();
cow.position.set(15, 0, 5);
cow.rotation.y = -Math.PI / 4;
scene.add(cow);
var cowBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.85 });
var cowPinkMat = new THREE.MeshStandardMaterial({ color: 0xe8a0a8, roughness: 0.8 });

var bodyCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 16), cowBodyMat);
bodyCyl.rotation.z = Math.PI / 2;
bodyCyl.position.set(0, 2.0, 0);
bodyCyl.castShadow = true;
cow.add(bodyCyl);
[0.8, -0.8].forEach(function(x) {
  var s = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 14), cowBodyMat);
  s.position.set(x, 2.0, 0);
  s.castShadow = true;
  cow.add(s);
});
var cowHead = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 14), cowBodyMat);
cowHead.position.set(2.5, 2.9, 0);
cowHead.castShadow = true;
cow.add(cowHead);
var cowSnout = new THREE.Mesh(
  new THREE.SphereGeometry(0.42, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.7), cowPinkMat);
cowSnout.position.set(3.15, 2.7, 0);
cowSnout.rotation.z = Math.PI / 2;
cow.add(cowSnout);
[0.28, -0.28].forEach(function(z) {
  var eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  eyeWhite.position.set(2.85, 3.1, z);
  cow.add(eyeWhite);
  var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1 }));
  pupil.position.set(2.98, 3.1, z + 0.02);
  cow.add(pupil);
});
[[1.0, 0.6], [1.0, -0.6], [-1.0, 0.6], [-1.0, -0.6]].forEach(function(p) {
  var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 10), cowBodyMat);
  leg.position.set(p[0], 1.0, p[1]);
  leg.castShadow = true;
  cow.add(leg);
  var hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a1f15 }));
  hoof.position.set(p[0], 0.11, p[1]);
  cow.add(hoof);
});
addCollider(15, 5, 2.0);
setLoad(90, loadSteps[5]);

// ДЕРЕВЬЯ
function makeTree(x, z) {
  var tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.userData.viewPosition = new THREE.Vector3(x, 0, z);
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 }));
  trunk.position.y = 1.75;
  trunk.castShadow = true;
  tree.add(trunk);
  for (var i = 0; i < 3; i++) {
    var leaf = new THREE.Mesh(new THREE.SphereGeometry(1.5 - i * 0.3, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3d5a2a, roughness: 1 }));
    leaf.position.y = 3.5 + i * 0.7;
    leaf.castShadow = true;
    tree.add(leaf);
  }
  visibleObjects.push(tree);
  return tree;
}
[[-25, -10], [-30, 15], [25, -15], [30, 10], [-15, 25], [20, 25]].forEach(function(p) {
  scene.add(makeTree(p[0], p[1]));
  addCollider(p[0], p[1], 0.7);
});

// ЗАБОР
var fenceMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
var fenceGeo = new THREE.BoxGeometry(0.25, 2, 0.25);
for (var fi = -40; fi <= 40; fi += 4) {
  [-40, 40].forEach(function(z) {
    var post = new THREE.Mesh(fenceGeo, fenceMat);
    post.position.set(fi, 1, z);
    scene.add(post);
  });
  [-40, 40].forEach(function(x) {
    var post = new THREE.Mesh(fenceGeo, fenceMat);
    post.position.set(x, 1, fi);
    scene.add(post);
  });
}

// ТЕКСТ-СПРАЙТ
function makeLabel(text) {
  var canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.font = 'Bold 44px Arial';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  var tex = new THREE.CanvasTexture(canvas);
  var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  var sprite = new THREE.Sprite(mat);
  sprite.scale.set(5, 1.2, 1);
  return sprite;
}

var stackLabel = makeLabel('🌾 СТОГ — клик');
stackLabel.position.set(0, HAYSTACK_HEIGHT + 1.2, 0);
haystackGroup.add(stackLabel);
var cowLabel = makeLabel('🐄 КОРОВА — [E]');
cowLabel.position.set(0, 4.8, 0);
cow.add(cowLabel);
var barnLabel = makeLabel('🏠 АМБАР — [E]');
barnLabel.position.set(0, BARN_H + 3.5, -BARN_D / 2);
barn.add(barnLabel);

// ============================================
// ИГРОК
// ============================================
var player = {
  position: new THREE.Vector3(0, 1.7, 15),
  yaw: 0, pitch: 0, radius: 0.4
};

// ============================================
// УПРАВЛЕНИЕ
// ============================================
var keys = { w: false, a: false, s: false, d: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false, shift: false };
var MOUSE_SENSITIVITY = 0.005;
var TOUCH_SENSITIVITY = 0.010;
var isLocked = false;
var shopOpen = false;

var lookArea = document.getElementById('lookArea');
var lookHint = document.getElementById('lookHint');
var touchLookActive = false;
var lastTouchX = 0, lastTouchY = 0;

function isUITarget(target) {
  var moveJoystick = document.getElementById('moveJoystick');
  var runBtn = document.getElementById('runBtn');
  var shootBtn = document.getElementById('shootBtn');
  return (moveJoystick && (target === moveJoystick || moveJoystick.contains(target))) ||
         target === runBtn || target === shootBtn;
}

lookArea.addEventListener('touchstart', function(e) {
  for (var i = 0; i < e.changedTouches.length; i++) {
    if (isUITarget(e.changedTouches[i].target)) return;
  }
  e.preventDefault();
  var touch = e.changedTouches[0];
  touchLookActive = true;
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
  if (lookHint) lookHint.style.display = 'none';
}, { passive: false });

lookArea.addEventListener('touchmove', function(e) {
  if (!touchLookActive) return;
  e.preventDefault();
  var touch = e.changedTouches[0];
  var dx = touch.clientX - lastTouchX;
  var dy = touch.clientY - lastTouchY;
  player.yaw -= dx * TOUCH_SENSITIVITY;
  player.pitch -= dy * TOUCH_SENSITIVITY;
  player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
  lastTouchX = touch.clientX;
  lastTouchY = touch.clientY;
}, { passive: false });

lookArea.addEventListener('touchend', function() { touchLookActive = false; });
lookArea.addEventListener('touchcancel', function() { touchLookActive = false; });

var canvasEl = renderer.domElement;
var pointerLocked = false;

canvasEl.addEventListener('click', function() {
  if (!pointerLocked && !touchLookActive && !shopOpen) {
    canvasEl.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', function() {
  pointerLocked = document.pointerLockElement === canvasEl;
  isLocked = pointerLocked;
  var ctp = document.getElementById('click-to-play');
  if (pointerLocked) {
    if (ctp) ctp.classList.remove('show');
  } else if (!state.foundNeedle && !shopOpen && !document.getElementById('moveJoystick').classList.contains('show')) {
    if (ctp) ctp.classList.add('show');
  }
});

document.addEventListener('mousemove', function(e) {
  if (!pointerLocked) return;
  player.yaw -= e.movementX * MOUSE_SENSITIVITY;
  player.pitch -= e.movementY * MOUSE_SENSITIVITY;
  player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
});

var moveJoystick = document.getElementById('moveJoystick');
var moveKnob = document.getElementById('moveKnob');
var moveActive = false;
var joystickInput = { x: 0, y: 0 };

function handleMoveStart(e) { e.preventDefault(); e.stopPropagation(); moveActive = true; }
function handleMoveMove(e) {
  if (!moveActive) return;
  e.preventDefault(); e.stopPropagation();
  var touch = e.touches ? e.touches[0] : e;
  var rect = moveJoystick.getBoundingClientRect();
  var cx = rect.left + rect.width / 2;
  var cy = rect.top + rect.height / 2;
  var dx = touch.clientX - cx;
  var dy = touch.clientY - cy;
  var maxDist = rect.width / 2 - 25;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
  moveKnob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  joystickInput.x = dx / maxDist;
  joystickInput.y = dy / maxDist;
}
function handleMoveEnd(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  moveActive = false;
  moveKnob.style.transform = 'translate(-50%, -50%)';
  joystickInput.x = 0;
  joystickInput.y = 0;
}
moveJoystick.addEventListener('touchstart', handleMoveStart, { passive: false });
moveJoystick.addEventListener('touchmove', handleMoveMove, { passive: false });
moveJoystick.addEventListener('touchend', handleMoveEnd, { passive: false });
moveJoystick.addEventListener('touchcancel', handleMoveEnd, { passive: false });
moveJoystick.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); moveActive = true; });
document.addEventListener('mousemove', function(e) { if (moveActive) handleMoveMove(e); });
document.addEventListener('mouseup', function() { if (moveActive) handleMoveEnd(); });

// КЛАВИАТУРА
document.addEventListener('keydown', function(e) {
  var key = (e.key && typeof e.key === 'string') ? e.key.toLowerCase() : '';
  if (!key) return;

  if (key === 'w' || key === 'ц') keys.w = true;
  if (key === 'a' || key === 'ф') keys.a = true;
  if (key === 's' || key === 'ы') keys.s = true;
  if (key === 'd' || key === 'в') keys.d = true;
  if (key === 'arrowup') keys.arrowup = true;
  if (key === 'arrowdown') keys.arrowdown = true;
  if (key === 'arrowleft') keys.arrowleft = true;
  if (key === 'arrowright') keys.arrowright = true;
  if (e.shiftKey) keys.shift = true;
  if (key === 'e' || key === 'у') { pressEButton(); }
  if (key === 'z' || key === 'я' || key === 'p') { e.preventDefault(); toggleShop(); }
});

document.addEventListener('keyup', function(e) {
  var key = (e.key && typeof e.key === 'string') ? e.key.toLowerCase() : '';
  if (!key) return;

  if (key === 'w' || key === 'ц') keys.w = false;
  if (key === 'a' || key === 'ф') keys.a = false;
  if (key === 's' || key === 'ы') keys.s = false;
  if (key === 'd' || key === 'в') keys.d = false;
  if (key === 'arrowup') keys.arrowup = false;
  if (key === 'arrowdown') keys.arrowdown = false;
  if (key === 'arrowleft') keys.arrowleft = false;
  if (key === 'arrowright') keys.arrowright = false;
  if (!e.shiftKey) keys.shift = false;
});

var runBtn = document.getElementById('runBtn');
var staminaFillMobile = document.getElementById('staminaFill-mobile');
var isRunningTouch = false;

function startRunTouch(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.stamina > 0.5) {
    isRunningTouch = true;
    runBtn.classList.add('active');
  }
}
function stopRunTouch(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  isRunningTouch = false;
  runBtn.classList.remove('active');
}
runBtn.addEventListener('touchstart', startRunTouch, { passive: false });
runBtn.addEventListener('touchend', stopRunTouch, { passive: false });
runBtn.addEventListener('touchcancel', stopRunTouch, { passive: false });
runBtn.addEventListener('mousedown', startRunTouch);
runBtn.addEventListener('mouseup', stopRunTouch);
runBtn.addEventListener('mouseleave', stopRunTouch);

var shootBtn = document.getElementById('shootBtn');

function pressEButton(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  shootBtn.classList.add('active');
  setTimeout(function() { shootBtn.classList.remove('active'); }, 120);
  interact();
}
shootBtn.addEventListener('touchstart', pressEButton, { passive: false });
shootBtn.addEventListener('mousedown', pressEButton);

var clickToPlay = document.getElementById('click-to-play');
clickToPlay.addEventListener('click', function() {
  canvasEl.requestPointerLock();
});

var isMouseDownGather = false;
canvasEl.addEventListener('mousedown', function(e) {
  if (!pointerLocked || e.button !== 0 || shopOpen) return;
  if (state.foundNeedle) return;
  isMouseDownGather = true;
  tryGatherHay();
});
document.addEventListener('mouseup', function() { isMouseDownGather = false; });

canvasEl.addEventListener('touchstart', function(e) {
  if (e.target !== canvasEl) return;
  if (shopOpen) return;
  if (state.foundNeedle) return;
  if (isNearHaystack()) tryGatherHay();
}, { passive: true });

function isNearHaystack() {
  var d = player.position.distanceTo(haystackGroup.position.clone().add(new THREE.Vector3(0, HAYSTACK_HEIGHT / 2, 0)));
  return d < HAYSTACK_RADIUS + 10;
}

function tryGatherHay() {
  var now = performance.now();
  if (now - state.lastGatherTime < state.gatherCooldown * 1000) return;
  var d = player.position.distanceTo(haystackGroup.position.clone().add(new THREE.Vector3(0, HAYSTACK_HEIGHT / 2, 0)));
  if (d > HAYSTACK_RADIUS + 10) { showHint('❌ Далеко от стога!'); return; }
  if (state.hay >= state.maxHay) { showHint('🎒 Инвентарь полон!'); return; }

  var hayPerGather = 1, toolUsed = '';
  if (state.vacuumActive) { hayPerGather = 8; toolUsed = 'vacuum'; spawnVacuumParticles(); }
  else if (state.hasFork && now - state.lastForkTime >= state.forkCooldown * 1000) {
    hayPerGather = 5; state.lastForkTime = now; toolUsed = 'fork'; spawnForkParticle();
  }
  else if (state.hasDynamite && now - state.lastDynamiteTime >= state.dynamiteCooldown * 1000) {
    hayPerGather = 15; state.lastDynamiteTime = now; toolUsed = 'dynamite'; spawnExplosion();
  }

  state.lastGatherTime = now;
  var actualHay = Math.min(hayPerGather, state.maxHay - state.hay);
  state.hay += actualHay;
  state.totalHay += actualHay;

  var luckBonus = (state.luckLvl - 1) * 0.0015 * actualHay;
  if (Math.random() < 0.003 + luckBonus) { findNeedle(); return; }

  if (toolUsed !== 'vacuum') spawnStalkParticle();
  var txt = '+' + actualHay + ' 🌾';
  if (toolUsed === 'fork') txt += ' 🗡️';
  if (toolUsed === 'dynamite') txt += ' 💥';
  if (toolUsed === 'vacuum') txt += ' 🌀';
  showPopup(txt, window.innerWidth / 2, window.innerHeight / 2 - 50);
  updateHUD();
  updateShopMenu();
}

function spawnForkParticle() { for (var i = 0; i < 5; i++) setTimeout(spawnStalkParticle, i * 50); }
function spawnExplosion() {
  for (var i = 0; i < 20; i++) {
    var part = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: [0xff6600, 0xffcc00, 0xff3300][i % 3] }));
    part.position.copy(haystackGroup.position);
    part.position.y += HAYSTACK_HEIGHT / 2;
    part.position.x += (Math.random() - 0.5) * 3;
    part.position.z += (Math.random() - 0.5) * 3;
    var vel = new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 12 + 5, (Math.random() - 0.5) * 15);
    scene.add(part);
    particles.push({ mesh: part, vel: vel, angVel: new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20), life: 2 });
  }
}
function spawnVacuumParticles() {
  for (var i = 0; i < 8; i++) {
    var stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.4, 4),
      new THREE.MeshBasicMaterial({ color: 0xe8c547 }));
    var dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    stalk.position.copy(camera.position).addScaledVector(dir, 3 + Math.random() * 5);
    stalk.position.x += (Math.random() - 0.5) * 4;
    stalk.position.z += (Math.random() - 0.5) * 4;
    var toPlayer = new THREE.Vector3().subVectors(camera.position, stalk.position).normalize();
    var vel = new THREE.Vector3(toPlayer.x * 10, 2, toPlayer.z * 10);
    scene.add(stalk);
    particles.push({ mesh: stalk, vel: vel, angVel: new THREE.Vector3(Math.random() * 15, Math.random() * 15, Math.random() * 15), life: 0.8 });
  }
}

function interact() {
  if (shopOpen || state.foundNeedle) return;
  var dCow = player.position.distanceTo(cow.position.clone().add(new THREE.Vector3(0, 2, 0)));
  if (dCow < 7) {
    if (state.hay > 0) {
      var milk = state.hay;
      state.milk += milk;
      state.hay = 0;
      showPopup('+' + milk + ' 🥛', window.innerWidth / 2, window.innerHeight / 2 - 50);
      showHint('🥛 Корова дала ' + milk + ' л молока!');
    } else showHint('❌ Нет сена');
    updateHUD(); updateShopMenu();
    return;
  }
  var dBarn = player.position.distanceTo(new THREE.Vector3(0, 0, 22));
  if (dBarn < 10) toggleShop();
}

function findNeedle() {
  state.foundNeedle = true;
  needle.visible = true;
  document.exitPointerLock();
  setTimeout(function() {
    document.getElementById('final-money').textContent = state.money;
    document.getElementById('final-milk').textContent = state.totalMilkSold;
    document.getElementById('final-hay').textContent = state.totalHay;
    document.getElementById('message').classList.add('show');
  }, 500);
}

function showPopup(text, x, y) {
  var p = document.createElement('div');
  p.className = 'popup';
  p.textContent = text;
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  document.getElementById('popups').appendChild(p);
  setTimeout(function() { p.remove(); }, 1300);
}

var hintTimeout;
function showHint(text) {
  var hint = document.getElementById('hint');
  hint.textContent = text;
  hint.classList.add('show');
  clearTimeout(hintTimeout);
  hintTimeout = setTimeout(function() { hint.classList.remove('show'); }, 2500);
}

var particles = [];
function spawnStalkParticle() {
  var stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xe8c547, roughness: 0.85 }));
  var dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  stalk.position.copy(camera.position).addScaledVector(dir, 1.5);
  var vel = new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4);
  var angVel = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  scene.add(stalk);
  particles.push({ mesh: stalk, vel: vel, angVel: angVel, life: 1.2 });
}
function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.life -= dt;
    p.vel.y -= 9.8 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += p.angVel.x * dt;
    p.mesh.rotation.y += p.angVel.y * dt;
    p.mesh.rotation.z += p.angVel.z * dt;
    if (p.life <= 0 || p.mesh.position.y < 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

var shopMenu = document.getElementById('shop-menu');

function toggleShop() {
  var d = player.position.distanceTo(new THREE.Vector3(0, 0, 22));
  if (!shopOpen && d > 12) { showHint('❌ Подойди к амбару 🏠'); return; }
  shopOpen = !shopOpen;
  if (shopOpen) {
    shopMenu.classList.add('open');
    document.exitPointerLock();
    updateShopMenu();
  } else {
    shopMenu.classList.remove('open');
    if (!state.foundNeedle) canvasEl.requestPointerLock();
  }
}

document.getElementById('shop-close').onclick = toggleShop;

function updateShopMenu() {
  document.getElementById('shop-money').textContent = state.money;
  document.getElementById('shop-milk').textContent = state.milk;
  document.getElementById('speedLvl').textContent = state.speedLvl;
  document.getElementById('gatherLvl').textContent = state.gatherLvl;
  document.getElementById('invLvl').textContent = state.invLvl;
  document.getElementById('luckLvl').textContent = state.luckLvl;

  var sp = PRICES.speed[state.speedLvl - 1];
  var gp = PRICES.gather[state.gatherLvl - 1];
  var ip = PRICES.inv[state.invLvl - 1];
  var lp = PRICES.luck[state.luckLvl - 1];

  document.getElementById('speedPrice').textContent = sp ? sp + '$' : 'MAX';
  document.getElementById('gatherPrice').textContent = gp ? gp + '$' : 'MAX';
  document.getElementById('invPrice').textContent = ip ? ip + '$' : 'MAX';
  document.getElementById('luckPrice').textContent = lp ? lp + '$' : 'MAX';

  document.getElementById('buySpeed').disabled = !sp || state.money < sp;
  document.getElementById('buyGather').disabled = !gp || state.money < gp;
  document.getElementById('buyInv').disabled = !ip || state.money < ip;
  document.getElementById('buyLuck').disabled = !lp || state.money < lp;

  document.getElementById('sellMilkCount').textContent = state.milk;
  document.getElementById('sellMilkPrice').textContent = (state.milk * MILK_PRICE) + '$';
  document.getElementById('sellMilk').disabled = state.milk === 0;

  document.getElementById('buyFork').textContent = state.hasFork ? '✓' : 'Купить';
  document.getElementById('buyFork').disabled = state.hasFork || state.money < PRICES.fork[0];
  document.getElementById('buyDynamite').textContent = state.hasDynamite ? '✓' : 'Купить';
  document.getElementById('buyDynamite').disabled = state.hasDynamite || state.money < PRICES.dynamite[0];
  document.getElementById('buyVacuum').textContent = state.hasVacuum ? '✓' : 'Купить';
  document.getElementById('buyVacuum').disabled = state.hasVacuum || state.money < PRICES.vacuum[0];

  document.getElementById('autoGatherLvl').textContent = state.autoGatherLvl;
  var agp = PRICES.autoGather[state.autoGatherLvl];
  document.getElementById('autoGatherPrice').textContent = agp ? agp + '$' : 'MAX';
  document.getElementById('buyAutoGather').disabled = !agp || state.money < agp;
}

document.getElementById('sellMilk').onclick = function() {
  if (state.milk === 0) return;
  var e = state.milk * MILK_PRICE;
  state.money += e;
  state.totalMilkSold += state.milk;
  showPopup('+' + e + '$', window.innerWidth / 2, window.innerHeight / 2);
  state.milk = 0;
  updateHUD(); updateShopMenu();
};
document.getElementById('buySpeed').onclick = function() {
  var p = PRICES.speed[state.speedLvl - 1];
  if (!p || state.money < p) return;
  state.money -= p; state.speedLvl++;
  state.moveSpeed = 5 + (state.speedLvl - 1) * 1.5;
  updateHUD(); updateShopMenu();
};
document.getElementById('buyGather').onclick = function() {
  var p = PRICES.gather[state.gatherLvl - 1];
  if (!p || state.money < p) return;
  state.money -= p; state.gatherLvl++;
  state.gatherCooldown = Math.max(0.1, 0.8 * Math.pow(0.7, state.gatherLvl - 1));
  updateHUD(); updateShopMenu();
};
document.getElementById('buyInv').onclick = function() {
  var p = PRICES.inv[state.invLvl - 1];
  if (!p || state.money < p) return;
  state.money -= p; state.invLvl++;
  state.maxHay = 25 + (state.invLvl - 1) * 15;
  updateHUD(); updateShopMenu();
};
document.getElementById('buyLuck').onclick = function() {
  var p = PRICES.luck[state.luckLvl - 1];
  if (!p || state.money < p) return;
  state.money -= p; state.luckLvl++;
  updateShopMenu();
};
document.getElementById('buyFork').onclick = function() {
  if (state.hasFork || state.money < PRICES.fork[0]) return;
  state.money -= PRICES.fork[0]; state.hasFork = true;
  showHint('🗡️ Вилы!');
  updateShopMenu();
};
document.getElementById('buyDynamite').onclick = function() {
  if (state.hasDynamite || state.money < PRICES.dynamite[0]) return;
  state.money -= PRICES.dynamite[0]; state.hasDynamite = true;
  showHint('💥 Динамит!');
  updateShopMenu();
};
document.getElementById('buyVacuum').onclick = function() {
  if (state.hasVacuum || state.money < PRICES.vacuum[0]) return;
  state.money -= PRICES.vacuum[0]; state.hasVacuum = true;
  showHint('🌀 Пылесос!');
  updateShopMenu();
};
document.getElementById('buyAutoGather').onclick = function() {
  var p = PRICES.autoGather[state.autoGatherLvl];
  if (!p || state.money < p) return;
  state.money -= p; state.autoGatherLvl++;
  showHint('⚙️ Автосбор ур.' + state.autoGatherLvl);
  updateShopMenu();
};

function updateHUD() {
  document.getElementById('money').textContent = state.money;
  document.getElementById('hay').textContent = state.hay;
  document.getElementById('maxHay').textContent = state.maxHay;
  document.getElementById('milk').textContent = state.milk;
  document.getElementById('speed').textContent = state.moveSpeed.toFixed(1);
}

function updateStaminaUI() {
  var p = (state.stamina / state.staminaMax) * 100;
  if (staminaFillMobile) {
    staminaFillMobile.style.width = p + '%';
    if (p < 20) staminaFillMobile.style.background = 'linear-gradient(90deg, #ff4444, #ff6b6b)';
    else if (p < 50) staminaFillMobile.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
    else staminaFillMobile.style.background = 'linear-gradient(90deg, #00FF88, #00CC66)';
  }
}

function resolveCollisions(newPos) {
  for (var i = 0; i < colliders.length; i++) {
    var c = colliders[i];
    var dx = newPos.x - c.x, dz = newPos.z - c.z;
    var distSq = dx * dx + dz * dz;
    var minDist = c.r + player.radius;
    if (distSq < minDist * minDist) {
      var dist = Math.sqrt(distSq) || 0.001;
      var overlap = minDist - dist;
      newPos.x += (dx / dist) * overlap;
      newPos.z += (dz / dist) * overlap;
    }
  }
  newPos.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, newPos.x));
  newPos.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, newPos.z));
  return newPos;
}

var clock = new THREE.Clock();
var moveTime = 0;
var visibilityTimer = 0;

function updatePlayer(dt) {
  if (shopOpen || state.foundNeedle) return;

  var inputX = joystickInput.x;
  var inputY = joystickInput.y;

  var pcX = 0, pcY = 0;
  if (keys.w || keys.arrowup) pcY -= 1;
  if (keys.s || keys.arrowdown) pcY += 1;
  if (keys.a || keys.arrowleft) pcX -= 1;
  if (keys.d || keys.arrowright) pcX += 1;

  inputX += pcX;
  inputY += pcY;

  var isMoving = Math.abs(inputX) > 0.01 || Math.abs(inputY) > 0.01;
  var isRunning = (keys.shift || isRunningTouch) && state.stamina > 0 && isMoving;

  if (isRunning) {
    state.stamina -= state.staminaDrain * dt;
    if (state.stamina < 0) state.stamina = 0;
  } else {
    state.stamina += state.staminaRegen * dt;
    if (state.stamina > state.staminaMax) state.stamina = state.staminaMax;
  }
  updateStaminaUI();

  if (isMoving) {
    var mag = Math.sqrt(inputX * inputX + inputY * inputY);
    if (mag > 1) { inputX /= mag; inputY /= mag; }

    var speedMult = isRunning ? 1.8 : 1;
    var speed = state.moveSpeed * speedMult * 0.5;

    var cos = Math.cos(player.yaw);
    var sin = Math.sin(player.yaw);

    var moveX = inputX * cos + inputY * sin;
    var moveZ = -inputX * sin + inputY * cos;

    var tryX = new THREE.Vector3(player.position.x + moveX * speed * dt, player.position.y, player.position.z);
    resolveCollisions(tryX);
    player.position.x = tryX.x;

    var tryZ = new THREE.Vector3(player.position.x, player.position.y, player.position.z + moveZ * speed * dt);
    resolveCollisions(tryZ);
    player.position.z = tryZ.z;

    moveTime += dt * speed;
  }

  var bob = isMoving ? Math.sin(moveTime * 2) * 0.05 : 0;
  camera.position.copy(player.position);
  camera.position.y += bob;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updateCooldownUI() {
  var now = performance.now();
  var el = now - state.lastGatherTime;
  var t = state.gatherCooldown * 1000;
  var cd = document.getElementById('cooldown');
  var cdf = document.getElementById('cooldown-fill');
  if (el < t) {
    cd.classList.add('show');
    cdf.style.width = (el / t) * 100 + '%';
  } else cd.classList.remove('show');
}

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.1);

  updatePlayer(dt);
  updateParticles(dt);
  updateCooldownUI();
  updateAutoGather(dt);
  updateVacuum(dt);
  updateAutoGatherPassive(dt);
  updateNeedlePosition(dt);

  visibilityTimer += dt;
  if (visibilityTimer >= UPDATE_INTERVAL) {
    visibilityTimer = 0;
    updateVisibility();
    updateHaystackLOD();
  }

  sun.position.set(player.position.x + 40, 60, player.position.z + 30);
  sun.target.position.set(player.position.x, 0, player.position.z);
  sun.target.updateMatrixWorld();

  renderer.render(scene, camera);
}

function updateAutoGather(dt) {
  if (!isMouseDownGather || shopOpen || state.foundNeedle) return;
  var d = player.position.distanceTo(haystackGroup.position.clone().add(new THREE.Vector3(0, HAYSTACK_HEIGHT / 2, 0)));
  if (d > HAYSTACK_RADIUS + 10) return;
  if (state.hay >= state.maxHay) return;
  tryGatherHay();
}

function updateAutoGatherPassive(dt) {
  if (state.autoGatherLvl === 0 || shopOpen || state.foundNeedle) return;
  var d = player.position.distanceTo(haystackGroup.position.clone().add(new THREE.Vector3(0, HAYSTACK_HEIGHT / 2, 0)));
  if (d > HAYSTACK_RADIUS + 10) return;
  if (state.hay >= state.maxHay) return;
  var interval = Math.max(0.5, 3.0 - (state.autoGatherLvl - 1) * 0.4);
  state.autoGatherTimer += dt;
  if (state.autoGatherTimer >= interval) {
    state.autoGatherTimer = 0;
    var a = Math.min(state.autoGatherLvl, state.maxHay - state.hay);
    state.hay += a;
    state.totalHay += a;
    if (Math.random() < 0.003 + (state.luckLvl - 1) * 0.0015 * a) { findNeedle(); return; }
    showPopup('+' + a + ' 🌾 ⚙️', window.innerWidth / 2, window.innerHeight / 2 - 80);
    updateHUD();
  }
}

function updateVacuum(dt) {
  if (!state.hasVacuum || shopOpen || state.foundNeedle) {
    state.vacuumActive = false;
    return;
  }
  var d = player.position.distanceTo(haystackGroup.position.clone().add(new THREE.Vector3(0, HAYSTACK_HEIGHT / 2, 0)));
  if (d > HAYSTACK_RADIUS + 15) { state.vacuumActive = false; return; }
  state.vacuumActive = isMouseDownGather;
}

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// АВТОЗАПУСК ИГРЫ (без логина!)
// ============================================
setLoad(100, loadSteps[6]);
setTimeout(function() {
  loadingEl.classList.add('done');
  document.getElementById('hud').classList.add('show');
  document.getElementById('pcHint').classList.add('show');
  
  // Определяем мобильное устройство
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouch) {
    document.getElementById('moveJoystick').classList.add('show');
    document.getElementById('runBtn').classList.add('show');
    document.getElementById('shootBtn').classList.add('show');
    document.getElementById('stamina-bar-mobile').classList.add('show');
  } else {
    document.getElementById('click-to-play').classList.add('show');
  }
  
  updateHUD();
  updateShopMenu();
  animate();
}, 800);
