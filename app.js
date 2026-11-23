import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// --- Page navigation ---
function showPage(pageName) {
  $$('.page').forEach(page => page.classList.toggle('active', page.id === `page-${pageName}`));
  $$('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === pageName));
  $('#mainNav').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pageName === 'map') requestAnimationFrame(resizeRenderer);
}
$$('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$$('[data-nav="about"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); showPage('history'); setTimeout(() => $('#about')?.scrollIntoView({ behavior: 'smooth' }), 80);
}));
$$('[data-jump]').forEach(button => button.addEventListener('click', () => $( `#${button.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth' })));
$('#mobileMenu').addEventListener('click', () => $('#mainNav').classList.toggle('open'));

// --- MapTour content. Position data is deliberately NOT geographic here. ---
const pois = [
  {
    id: 'taixing', marker: 'POI_TAIXING', number: '01', title: '泰興宮', subtitle: '聚落的空間座標與精神心臟', kicker: 'SPIRITUAL CENTER',
    culture: '依專題文案，泰興宮是大茅埔重要的信仰中心。建庄時以廟宇為中軸，逐步發展出左右對稱的伙房街廓；廟宇也成為聚落共同的空間原點。',
    local: '對庄民而言，廟埕像是全庄的大客廳。節慶、祭典與日常聊天都在此發生，讓不同家族的人們有共同相聚的地方。',
    tags: ['信仰中心', '28 股', '庄民生活'], demo: [-3.6, 0, 1.8]
  },
  {
    id: 'wubei', marker: 'POI_WUBEI', number: '02', title: '屋背山', subtitle: '天然屏障與風水靠山', kicker: 'MOUNTAIN BACKDROP',
    culture: '客家聚落重視「背山面水」的選址觀念。聚落後方的山巒被視為祖山或靠山，象徵家族與庄頭有穩固依靠，也與藏風聚氣、庇佑子孫的觀念相連。',
    local: '過去山林提供柴薪與山產，也是隘勇巡防、戒備衝突的區域。如今山坡成為果樹栽培、散步與眺望聚落的生活背景。',
    tags: ['背山面水', '天然屏障', '果樹農業'], demo: [1.8, 0, -5.0]
  },
  {
    id: 'dragon', marker: 'POI_DRAGON', number: '03', title: '龍神', subtitle: '山林土地的守護神', kicker: 'LAND & WATER DEITY',
    culture: '專題文案指出，泰興宮後方的化胎設有龍神與龍神榕。客家人以山脈如龍的意象理解地脈，透過祭祀祈求水土平安、風調雨順。',
    local: '庄民稱龍神為「龍神伯公」。地方也流傳帶孩子前往契神明、祈求平安的生活記憶；龍神山水祭則是庄民共同感謝山水庇佑的年度活動。',
    tags: ['龍神信仰', '化胎', '山水祭'], demo: [-.6, 0, -2.9]
  },
  {
    id: 'begong', marker: 'POI_BEGONG', number: '04', title: '伯公廟', subtitle: '守護庄頭與水脈', kicker: 'VILLAGE GUARDIANS',
    culture: '客家人稱土地公為「伯公」。專題文案提到，大茅埔庄頭內外分布多座伯公廟，與五營將寮共同構成守護庄界、水源與農作的信仰網絡。',
    local: '伯公廟貼近日常生活。農民下田前、巡水員照看水路時，都可能向伯公祈求平安與順利；祂就像住在巷口、照看大家的長輩。',
    tags: ['伯公信仰', '五營', '庄頭守護'], demo: [4.1, 0, 2.5]
  },
  {
    id: 'canal', marker: 'POI_CANAL', number: '05', title: '洗衣圳', subtitle: '護城河、灌溉與生活水道', kicker: 'THE CANAL & DAILY LIFE',
    culture: '大茅埔圳引水灌溉，也曾環繞聚落形成防禦性的水路，並流經家戶附近成為生活水道。它呈現客家先民因地制宜的水利與聚落營造智慧。',
    local: '過去婦女會帶著衣物到水圳旁的洗衫坑洗滌，一邊工作、一邊交換庄內消息。水圳不只是生活設施，也是人情往來與地方消息流動的場域。',
    tags: ['大茅埔圳', '洗衫坑', '生活記憶'], demo: [-4.2, 0, 4.2]
  }
];
let activePoiIndex = 0;
let markerObjects = new Map();
let modelRoot = null;
let isDemo = true;

// --- Three.js scene ---
const canvas = $('#terrainCanvas');
const viewer = $('#viewerFrame');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce5d8);
scene.fog = new THREE.Fog(0xdce5d8, 30, 72);
const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 2000);
camera.position.set(20, 18, 24);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 8;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xf5f5e7, 0x70826c, 2.0));
const sun = new THREE.DirectionalLight(0xfff0d5, 2.15);
sun.position.set(-12, 24, 12);
scene.add(sun);
const fillLight = new THREE.DirectionalLight(0xdde8fa, 0.7);
fillLight.position.set(15, 8, -15);
scene.add(fillLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let clickablePins = [];
const demoGroup = new THREE.Group();
scene.add(demoGroup);

function terrainHeight(x, z) {
  const ridgeA = 2.3 * Math.exp(-Math.pow((z + 5.5) / 4.7, 2)) * Math.cos((x + 3) * 0.18);
  const ridgeB = 1.1 * Math.exp(-Math.pow((x - 7) / 5.8, 2)) * Math.cos(z * 0.24);
  const rolling = 0.34 * Math.sin(x * 0.42) * Math.cos(z * 0.31) + 0.22 * Math.sin((x + z) * 0.23);
  return Math.max(-0.1, ridgeA + ridgeB + rolling + 0.25);
}
function buildDemoTerrain() {
  const width = 26, depth = 21, segX = 100, segZ = 84;
  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const low = new THREE.Color(0x82977a), mid = new THREE.Color(0xa8b28b), high = new THREE.Color(0xd0c59e);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const h = terrainHeight(x, z);
    positions.setY(i, h);
    const color = h < 1.05 ? low.clone().lerp(mid, Math.max(0, h / 1.05)) : mid.clone().lerp(high, Math.min(1, (h - 1.05) / 2.5));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  demoGroup.add(terrain);

  // Canal is an illustrative route only; its exact course will be replaced by field-mapped data.
  const canalPoints = [
    new THREE.Vector3(-12, terrainHeight(-12, 6) + .12, 6),
    new THREE.Vector3(-8, terrainHeight(-8, 4.6) + .12, 4.6),
    new THREE.Vector3(-4, terrainHeight(-4, 3.9) + .12, 3.9),
    new THREE.Vector3(0, terrainHeight(0, 3.1) + .12, 3.1),
    new THREE.Vector3(4, terrainHeight(4, 2.1) + .12, 2.1),
    new THREE.Vector3(8, terrainHeight(8, .3) + .12, .3),
    new THREE.Vector3(12, terrainHeight(12, -1.2) + .12, -1.2)
  ];
  const curve = new THREE.CatmullRomCurve3(canalPoints);
  const water = new THREE.Mesh(new THREE.TubeGeometry(curve, 100, .105, 8, false), new THREE.MeshStandardMaterial({ color: 0x6c9eae, roughness: .28, metalness: .08 }));
  demoGroup.add(water);

  // Soft map-like contour lines to make the demo terrain legible.
  for (let level = .75; level <= 2.75; level += .5) {
    const pts = [];
    for (let x = -12.5; x <= 12.5; x += .35) {
      const z = -6.8 + (level - 1.1) * 2.6 + Math.sin(x * .22 + level) * 1.0;
      pts.push(new THREE.Vector3(x, terrainHeight(x, z) + .025, z));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xe5e4ca, transparent: true, opacity: .4 }));
    demoGroup.add(line);
  }

  const base = new THREE.Mesh(new THREE.BoxGeometry(26.2, .35, 21.2), new THREE.MeshStandardMaterial({ color: 0xb2b79d, roughness: 1 }));
  base.position.y = -0.42;
  demoGroup.add(base);

  for (const poi of pois) {
    const pos = new THREE.Vector3(poi.demo[0], terrainHeight(poi.demo[0], poi.demo[2]) + .12, poi.demo[2]);
    createPin(poi, pos);
  }
  isDemo = true;
  $('#demoNotice').style.display = 'block';
  $('#modelStatus').textContent = '示意地形已載入';
}

function createPin(poi, position) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.poiId = poi.id;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, .55, 8), new THREE.MeshStandardMaterial({ color: 0x9a694c, roughness: .75 }));
  stem.position.y = .3;
  stem.userData.poiId = poi.id;
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.19, 18, 14), new THREE.MeshStandardMaterial({ color: 0xc77c57, emissive: 0x5a2411, emissiveIntensity: .24, roughness: .38 }));
  bead.position.y = .65;
  bead.userData.poiId = poi.id;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.24, .025, 6, 24), new THREE.MeshBasicMaterial({ color: 0xf2e7cd }));
  ring.position.y = .65;
  ring.rotation.x = Math.PI / 2;
  ring.userData.poiId = poi.id;
  group.add(stem, bead, ring);
  group.traverse(obj => { if (obj.isMesh) clickablePins.push(obj); });
  scene.add(group);
  markerObjects.set(poi.id, group);
  return group;
}

function clearPins() {
  for (const group of markerObjects.values()) {
    group.traverse(obj => { if (obj.isMesh) { obj.geometry.dispose(); if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); } });
    scene.remove(group);
  }
  markerObjects.clear();
  clickablePins = [];
}
function clearLoadedModel() {
  if (modelRoot) {
    scene.remove(modelRoot);
    modelRoot.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(m => { if (m) { if (m.map) m.map.dispose(); m.dispose(); } });
      }
    });
    modelRoot = null;
  }
}
function resetDemo() {
  clearPins(); clearLoadedModel();
  demoGroup.visible = true;
  for (const poi of pois) {
    const pos = new THREE.Vector3(poi.demo[0], terrainHeight(poi.demo[0], poi.demo[2]) + .12, poi.demo[2]);
    createPin(poi, pos);
  }
  isDemo = true;
  $('#demoNotice').style.display = 'block';
  $('#modelStatus').textContent = '示意地形已載入';
  fitCameraToObject(demoGroup);
  renderPoi(0);
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDim * 1.15;
  controls.target.copy(center);
  camera.position.set(center.x + distance * .82, center.y + distance * .72, center.z + distance * .95);
  camera.near = Math.max(.01, maxDim / 1000);
  camera.far = maxDim * 30;
  camera.updateProjectionMatrix();
  controls.minDistance = maxDim * .22;
  controls.maxDistance = maxDim * 5;
  controls.update();
}

function loadGltfScene(gltfScene, label = '自訂模型') {
  clearPins(); clearLoadedModel();
  demoGroup.visible = false;
  modelRoot = gltfScene;
  scene.add(modelRoot);
  modelRoot.updateMatrixWorld(true);

  // Normalize model size and center it so GIS world coordinates do not dominate WebGL precision.
  let bounds = new THREE.Box3().setFromObject(modelRoot);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const scale = 28 / maxDim;
  modelRoot.scale.multiplyScalar(scale);
  modelRoot.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  modelRoot.updateMatrixWorld(true);

  const found = new Map();
  modelRoot.traverse(object => {
    const objectName = (object.name || '').trim().toUpperCase();
    const poi = pois.find(item => item.marker === objectName);
    if (poi && !found.has(poi.id)) {
      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);
      found.set(poi.id, worldPosition.clone());
      // Hide the locator mesh itself; the website draws a consistent marker above it.
      object.visible = false;
    }
  });

  for (const poi of pois) {
    const pos = found.get(poi.id);
    if (pos) createPin(poi, pos);
  }
  isDemo = false;
  $('#demoNotice').style.display = 'none';
  const missing = pois.filter(poi => !found.has(poi.id));
  if (missing.length) {
    $('#modelStatus').textContent = `${label}已載入 · ${found.size}/5 個定位點`;
    $('#demoNotice').textContent = `尚缺 ${missing.map(p => p.title).join('、')} 的 Blender 定位物件；請依操作指南建立 POI_*`; 
    $('#demoNotice').style.display = 'block';
  } else {
    $('#modelStatus').textContent = `${label}已載入 · 5 個定位點完成`;
  }
  fitCameraToObject(modelRoot);
  renderPoi(activePoiIndex);
}

const gltfLoader = new GLTFLoader();
async function loadLocalGlb(file) {
  if (!file) return;
  $('#modelStatus').textContent = '正在載入模型…';
  $('#viewerLoading').classList.remove('hidden');
  try {
    const buffer = await file.arrayBuffer();
    const gltf = await gltfLoader.parseAsync(buffer, '');
    loadGltfScene(gltf.scene, file.name);
  } catch (error) {
    console.error('GLB load failed:', error);
    $('#modelStatus').textContent = '模型載入失敗，請確認是有效的 .glb 檔';
    alert('模型載入失敗。請確認匯出格式為 glTF Binary（.glb），並且模型未損毀。');
  } finally {
    $('#viewerLoading').classList.add('hidden');
  }
}
$('#modelUpload').addEventListener('change', event => loadLocalGlb(event.target.files?.[0]));

// Try loading the named file automatically. If it is absent, keep the interactive demo terrain.
async function tryLoadPackagedModel() {
  try {
    const gltf = await gltfLoader.loadAsync('./models/damaopu-terrain.glb');
    loadGltfScene(gltf.scene, '大茅埔地形模型');
  } catch {
    // No project GLB yet: a clearly-labelled demo terrain is used instead.
    $('#modelStatus').textContent = '尚未放入正式 GLB，顯示示意地形';
  } finally {
    $('#viewerLoading').classList.add('hidden');
  }
}

function renderPoi(index) {
  activePoiIndex = (index + pois.length) % pois.length;
  const poi = pois[activePoiIndex];
  $('#detailIndex').textContent = `PLACE ${poi.number} / 05`;
  $('#detailKicker').textContent = poi.kicker;
  $('#detailTitle').textContent = poi.title;
  $('#detailSubtitle').textContent = poi.subtitle;
  $('#detailCulture').textContent = poi.culture;
  $('#detailLocal').textContent = poi.local;
  $('#detailTags').innerHTML = poi.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  $('#detailCount').textContent = `${poi.number} — 05`;
  $$('.poi-button').forEach(button => button.classList.toggle('selected', button.dataset.poi === poi.id));
  const marker = markerObjects.get(poi.id);
  if (marker) {
    const worldPos = new THREE.Vector3(); marker.getWorldPosition(worldPos);
    controls.target.lerp(worldPos, .25);
    const offset = camera.position.clone().sub(controls.target);
    camera.position.copy(worldPos).add(offset.length() ? offset.normalize().multiplyScalar(Math.max(8, offset.length())) : new THREE.Vector3(8, 8, 10));
    controls.update();
  }
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
$$('.poi-button').forEach(button => button.addEventListener('click', () => renderPoi(pois.findIndex(poi => poi.id === button.dataset.poi))));
$('#prevPoi').addEventListener('click', () => renderPoi(activePoiIndex - 1));
$('#nextPoi').addEventListener('click', () => renderPoi(activePoiIndex + 1));
$('#resetView').addEventListener('click', () => fitCameraToObject(isDemo ? demoGroup : modelRoot));

canvas.addEventListener('pointerdown', event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickablePins, false);
  if (hits.length) {
    const poiId = hits[0].object.userData.poiId;
    const index = pois.findIndex(poi => poi.id === poiId);
    if (index >= 0) renderPoi(index);
  }
});

function resizeRenderer() {
  const width = Math.max(1, viewer.clientWidth);
  const height = Math.max(1, viewer.clientHeight - 85);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(viewer);
window.addEventListener('resize', resizeRenderer);
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

buildDemoTerrain();
fitCameraToObject(demoGroup);
renderPoi(0);
resizeRenderer();
animate();
tryLoadPackagedModel();
