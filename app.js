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
  if (pageName === 'map') {
    requestAnimationFrame(() => {
      resizeRenderer();
      if (mlMap) mlMap.resize();
    });
  }
}
$$('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$$('[data-nav="about"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); showPage('history'); setTimeout(() => $('#about')?.scrollIntoView({ behavior: 'smooth' }), 80);
}));
$$('[data-jump]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth' })));
$('#mobileMenu').addEventListener('click', () => $('#mainNav').classList.toggle('open'));

// --- Two-Stage MapTour Data (Stage 1: Three.js Model -> Stage 2: MapLibre 3D DEM Orthophoto) ---
const mapScales = {
  macro: {
    key: 'macro',
    mode: 'three',
    modelPath: './models/dajia-basin.glb',
    modelLabel: '大甲溪流域大模型',
    subtitle: '第一階段：透過 Blender 3D 流域模型，看見大茅埔與新社台地、谷關、八仙山的空間關係。',
    panelTag: 'MACRO MODEL / 01—04',
    panelHeading: '流域裡的四個地理座標',
    panelHint: '點選座標，認識大茅埔在整個大甲溪水系中的相對位置。',
    panelFootnote: '此階段呈現大甲溪中上游河階與山谷地形的相對關係。',
    cornerTitle: 'DAJIA RIVER BASIN',
    cornerSub: 'MACRO 3D TERRAIN MODEL',
    controlHint: 'DRAG TO ROTATE · SCROLL TO ZOOM',
    captionLeft: '<b>3D 模型視圖</b> 左鍵拖曳旋轉・滾輪縮放・點擊標記',
    captionRight: 'GLB / GLTF 2.0',
    label1: '地理與歷史定位',
    label2: '與大茅埔的空間關係',
    nextBtnText: '拉近視角：進入大茅埔細部導覽 →',
    nextTarget: 'micro',
    pois: [
      {
        id: 'damaopu', marker: 'POI_DAMAOPU', number: '01', title: '大茅埔', short: '扼守山區門戶的防禦型客庄',
        subtitle: '大甲溪中游北岸的河階聚落', kicker: 'ALLUVIAL TERRACE',
        culture: '大茅埔位於大甲溪中游河階地上，背倚雪山山脈西麓、面向溪流。清代因地處漢番交界最前線，由「28 股」客籍先民開鑿大茅埔圳環繞聚落，建構出具備防禦機能的集村。',
        local: '在整個大甲溪流域中，大茅埔正好卡在平緩河谷進入深山峽谷的咽喉處，既是早年開墾的邊界前哨，也是後來林業與中橫公路進入山區的必經門戶。',
        tags: ['河階聚落', '漢番邊界', '山城門戶'], demo: [-1.5, 0, -1.6]
      },
      {
        id: 'xinshe', marker: 'POI_XINSHE', number: '02', title: '新社台地', short: '隔溪對望的多層河階群',
        subtitle: '大甲溪南岸著名的階地地形區', kicker: 'RIVER TERRACE GROUP',
        culture: '與東勢大茅埔隔著大甲溪相望的新社台地，是台灣規模最完整的河階群之一。由於台地地勢高亢、缺乏天然地表水源，先民同樣依靠白冷圳等大型水利工程引大甲溪水灌溉。',
        local: '將大茅埔與對岸的新社台地放在同一張流域模型中對照，能清楚看見大甲溪兩岸先民如何順應高低起伏的河階地形，以水圳克服地形限制、發展農業聚落。',
        tags: ['新社河階群', '隔溪對望', '水利智慧'], demo: [-4.2, 0, 4.8]
      },
      {
        id: 'guguan', marker: 'POI_GUGUAN', number: '03', title: '谷關', short: '大甲溪上游峽谷與中橫咽喉',
        subtitle: '沿溪溯源而上的深山河谷聚落', kicker: 'UPSTREAM CANYON',
        culture: '谷關位於大甲溪中上游的深邃峽谷中，自古為泰雅族原住民的生活領域。1956 年東西橫貫公路（台 8 線）開鑿後，谷關成為中橫西段最重要的山區補給站與交通節點。',
        local: '大茅埔正位處從東勢平地通往谷關的必經路線上。無論是早期原漢族群的邊界互動，或是戰後中橫築路與觀光人潮往來，谷關與大茅埔始終處在同一條溪谷動線上。',
        tags: ['中橫公路', '上游峽谷', '族群邊界'], demo: [8.2, 0, -3.2]
      },
      {
        id: 'baxianshan', marker: 'POI_BAXIANSHAN', number: '04', title: '八仙山', short: '日治三大林場與山城林業命脈',
        subtitle: '孕育豐富檜木資源的崇山峻嶺', kicker: 'HISTORIC FORESTRY',
        culture: '八仙山位於大甲溪支流十文溪與佳保溪匯流處上方，擁有豐富的紅檜與扁柏原始林。1915 年起日本政府展開大規模官營伐木，使其與阿里山、太平山並列台灣三大林場。',
        local: '八仙山林場開發期間，大量林業技術人員、伐木工人與物資沿著大甲溪谷進出山區，打破了大茅埔清代以來封閉的「界外」性格，帶動了整個東勢山城的交通與經濟轉型。',
        tags: ['八仙山林場', '台灣三大林場', '山城開發'], demo: [9.6, 0, 1.4]
      }
    ]
  },
  micro: {
    key: 'micro',
    mode: 'maplibre',
    subtitle: '第二階段：切換至國土測繪正射影像與 3D 數位高程地圖，俯瞰大茅埔聚落街廓與水圳紋理。',
    panelTag: '3D ORTHOPHOTO / 01—05',
    panelHeading: '聚落裡的五個座標',
    panelHint: '點選地點飛往實景位置（按住滑鼠右鍵可傾斜旋轉 3D 山勢）。',
    panelFootnote: '目前為大茅埔（慶東里）測試點位，後續可依田野 GPS 座標微調。',
    cornerTitle: 'DÀ MǍO PǓ · 3D DEM',
    cornerSub: 'NLSC ORTHOPHOTO + TERRAIN',
    controlHint: 'LEFT DRAG: PAN · RIGHT DRAG: TILT/ROTATE',
    captionLeft: '<b>3D 高程正射地圖</b> 左鍵平移・右鍵傾斜旋轉 3D 視角・滾輪縮放',
    captionRight: 'NLSC PHOTO2 · AWS DEM',
    label1: '客家文化意義',
    label2: '在地人的生活意義',
    nextBtnText: '← 返回大甲溪流域 3D 模型',
    nextTarget: 'macro',
    // coords 為 [經度 lng, 緯度 lat]，目前預設於東勢大茅埔（慶東里）周邊供預覽效果
    pois: [
      {
        id: 'taixing', number: '01', title: '泰興宮', short: '聚落的精神心臟',
        subtitle: '聚落的空間座標與精神心臟', kicker: 'SPIRITUAL CENTER',
        culture: '泰興宮是大茅埔重要的信仰中心。建庄時以廟宇為中軸，逐步發展出左右對稱的伙房街廓；廟宇也成為聚落共同的空間原點。',
        local: '對庄民而言，廟埕像是全庄的大客廳。節慶、祭典與日常聊天都在此發生，讓不同家族的人們有共同相聚的地方。',
        tags: ['信仰中心', '28 股', '庄民生活'], coords: [120.8485, 24.2282]
      },
      {
        id: 'wubei', number: '02', title: '屋背山', short: '天然屏障與風水靠山',
        subtitle: '天然屏障與風水靠山', kicker: 'MOUNTAIN BACKDROP',
        culture: '客家聚落重視「背山面水」的選址觀念。聚落後方的山巒被視為祖山或靠山，象徵家族與庄頭有穩固依靠，也與藏風聚氣、庇佑子孫的觀念相連。',
        local: '過去山林提供柴薪與山產，也是隘勇巡防、戒備衝突的區域。如今山坡成為果樹栽培、散步與眺望聚落的生活背景。',
        tags: ['背山面水', '天然屏障', '果樹農業'], coords: [120.8516, 24.2302]
      },
      {
        id: 'dragon', number: '03', title: '龍神', short: '山林土地的守護神',
        subtitle: '山林土地的守護神', kicker: 'LAND & WATER DEITY',
        culture: '泰興宮後方的化胎設有龍神與龍神榕。客家人以山脈如龍的意象理解地脈，透過祭祀祈求水土平安、風調雨順。',
        local: '庄民稱龍神為「龍神伯公」。地方也流傳帶孩子前往契神明、祈求平安的生活記憶；龍神山水祭則是庄民共同感謝山水庇佑的年度活動。',
        tags: ['龍神信仰', '化胎', '山水祭'], coords: [120.8492, 24.2287]
      },
      {
        id: 'begong', number: '04', title: '伯公廟', short: '守護庄頭與水脈',
        subtitle: '守護庄頭與水脈', kicker: 'VILLAGE GUARDIANS',
        culture: '客家人稱土地公為「伯公」。大茅埔庄頭內外分布多座伯公廟，與五營將寮共同構成守護庄界、水源與農作的信仰網絡。',
        local: '伯公廟貼近日常生活。農民下田前、巡水員照看水路時，都可能向伯公祈求平安與順利；祂就像住在巷口、照看大家的長輩。',
        tags: ['伯公信仰', '五營', '庄頭守護'], coords: [120.8467, 24.2273]
      },
      {
        id: 'canal', number: '05', title: '洗衣圳', short: '護城河、灌溉與生活水道',
        subtitle: '護城河、灌溉與生活水道', kicker: 'THE CANAL & DAILY LIFE',
        culture: '大茅埔圳引水灌溉，也曾環繞聚落形成防禦性的水路，並流經家戶附近成為生活水道。它呈現客家先民因地制宜的水利與聚落營造智慧。',
        local: '過去婦女會帶著衣物到水圳旁的洗衫坑洗滌，一邊工作、一邊交換庄內消息。水圳不只是生活設施，也是人情往來與地方消息流動的場域。',
        tags: ['大茅埔圳', '洗衫坑', '生活記憶'], coords: [120.8475, 24.2289]
      }
    ]
  }
};

let currentScaleKey = 'macro';
let activePoiIndex = 0;
let markerObjects = new Map();
let modelRoot = null;
let isDemo = true;

// =========================================================================
// 1. THREE.JS 引擎（負責 PART 01 大甲溪流域 3D 模型）
// =========================================================================
const canvas = $('#terrainCanvas');
const viewer = $('#viewerFrame');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce5d8);
scene.fog = new THREE.Fog(0xdce5d8, 65, 190);
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

function getMacroDemoHeight(x, z) {
  const riverZ = -0.35 * x + 0.6 * Math.sin(x * 0.25);
  const distRiver = Math.abs(z - riverZ);
  const valley = Math.min(1.6, distRiver * 0.34);
  const guguanPeak = 3.2 * Math.exp(-Math.pow((x - 9.5) / 4.8, 2)) * Math.exp(-Math.pow((z + 3.5) / 5.2, 2));
  const northRidge = 1.4 * Math.exp(-Math.pow((z + 7.2) / 3.5, 2));
  const xinsheTerrace = z > 2.2 && x < 2 ? 0.55 : 0;
  return Math.max(0.05, valley + guguanPeak + northRidge + xinsheTerrace + 0.18 * Math.sin(x * 0.45) * Math.cos(z * 0.4));
}

function buildMacroDemoTerrain() {
  while (demoGroup.children.length) {
    const child = demoGroup.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
    demoGroup.remove(child);
  }
  const geometry = new THREE.PlaneGeometry(26, 21, 100, 84);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const low = new THREE.Color(0x799177), mid = new THREE.Color(0xa8b28b), high = new THREE.Color(0xc7be98);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const h = getMacroDemoHeight(x, z);
    positions.setY(i, h);
    const color = h < 1.05 ? low.clone().lerp(mid, Math.max(0, h / 1.05)) : mid.clone().lerp(high, Math.min(1, (h - 1.05) / 3.8));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  demoGroup.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

  const waterPts = [
    new THREE.Vector3(-12.5, getMacroDemoHeight(-12.5, 4.4) + 0.08, 4.4),
    new THREE.Vector3(-6, getMacroDemoHeight(-6, 1.8) + 0.08, 1.8),
    new THREE.Vector3(0, getMacroDemoHeight(0, 0.2) + 0.08, 0.2),
    new THREE.Vector3(6, getMacroDemoHeight(6, -1.7) + 0.08, -1.7),
    new THREE.Vector3(12.5, getMacroDemoHeight(12.5, -4.3) + 0.08, -4.3)
  ];
  demoGroup.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(waterPts), 100, 0.34, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x5d94a8, roughness: 0.25 })
  ));
  demoGroup.visible = true;
  clearPins();
  for (const poi of mapScales.macro.pois) {
    createPin(poi, new THREE.Vector3(poi.demo[0], getMacroDemoHeight(poi.demo[0], poi.demo[2]) + 0.12, poi.demo[2]));
  }
  isDemo = true;
  $('#demoNotice').textContent = 'DEMO TERRAIN · 大甲溪流域示意地形';
  $('#demoNotice').style.display = 'block';
}

function createPin(poi, position) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.poiId = poi.id;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0x9a694c, roughness: 0.75 }));
  stem.position.y = 0.3;
  stem.userData.poiId = poi.id;
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), new THREE.MeshStandardMaterial({ color: 0xc77c57, emissive: 0x5a2411, emissiveIntensity: 0.24, roughness: 0.38 }));
  bead.position.y = 0.65;
  bead.userData.poiId = poi.id;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: 0xf2e7cd }));
  ring.position.y = 0.65;
  ring.rotation.x = Math.PI / 2;
  ring.userData.poiId = poi.id;
  group.add(stem, bead, ring);
  group.traverse(obj => { if (obj.isMesh) clickablePins.push(obj); });
  scene.add(group);
  markerObjects.set(poi.id, group);
}

function clearPins() {
  for (const group of markerObjects.values()) {
    group.traverse(obj => { if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); } });
    scene.remove(group);
  }
  markerObjects.clear();
  clickablePins = [];
}

function clearLoadedModel() {
  if (modelRoot) {
    scene.remove(modelRoot);
    modelRoot = null;
  }
}

function fitCameraToObject(object) {
  if (!object) return;
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDim * 1.15;
  controls.target.copy(center);
  camera.position.set(center.x + distance * 0.82, center.y + distance * 0.72, center.z + distance * 0.95);
  camera.near = Math.max(0.01, maxDim / 1000);
  camera.far = maxDim * 30;
  camera.updateProjectionMatrix();
  controls.minDistance = maxDim * 0.22;
  controls.maxDistance = maxDim * 5;
  controls.update();
}

function loadGltfScene(gltfScene, label = '大甲溪流域大模型') {
  clearPins();
  clearLoadedModel();
  demoGroup.visible = false;
  modelRoot = gltfScene;
  scene.add(modelRoot);
  modelRoot.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(modelRoot);
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
    const poi = mapScales.macro.pois.find(item => item.marker === objectName);
    if (poi && !found.has(poi.id)) {
      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);
      found.set(poi.id, worldPosition.clone());
      object.visible = false;
    }
  });

  for (const poi of mapScales.macro.pois) {
    const pos = found.get(poi.id);
    if (pos) createPin(poi, pos);
  }
  isDemo = false;
  $('#demoNotice').style.display = 'none';
  $('#modelStatus').textContent = `${label}已載入 · ${found.size}/4 個定位點完成`;
  fitCameraToObject(modelRoot);
  if (currentScaleKey === 'macro') renderPoi(0);
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
    alert('模型載入失敗。請確認匯出格式為 glTF Binary（.glb）。');
  } finally {
    $('#viewerLoading').classList.add('hidden');
  }
}
$('#modelUpload').addEventListener('change', event => loadLocalGlb(event.target.files?.[0]));

// =========================================================================
// 2. MAPLIBRE GL JS 3D 地形引擎（負責 PART 02 大茅埔 3D 高程正射地圖）
// =========================================================================
let mlMap = null;
const mlMarkers = new Map();

function initMapLibre() {
  if (mlMap) {
    mlMap.resize();
    return;
  }
  mlMap = new maplibregl.Map({
    container: 'maplibreContainer',
    center: [120.8485, 24.2285], // 臺中東勢大茅埔（慶東里）
    zoom: 16.2,
    pitch: 56, // 預設 56 度俯瞰 3D 地形起伏
    bearing: 28,
    maxPitch: 75,
    style: {
      version: 8,
      sources: {
        // 內政部國土測繪中心（NLSC）臺灣通用正射影像
        nlscPhoto: {
          type: 'raster',
          tiles: ['https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© 內政部國土測繪中心'
        },
        // AWS 開源全球數位高程圖磚（Terrarium 格式）
        awsTerrain: {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          encoding: 'terrarium',
          tileSize: 256,
          maxzoom: 15
        }
      },
      layers: [
        { id: 'nlsc-photo-layer', type: 'raster', source: 'nlscPhoto' }
      ],
      terrain: {
        source: 'awsTerrain',
        exaggeration: 1.45 // 適度凸顯屋背山與河階的高低差
      }
    }
  });

  mlMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

  // 建立 5 個大茅埔座標標記
  mapScales.micro.pois.forEach((poi, idx) => {
    const el = document.createElement('div');
    el.className = 'ml-pin';
    el.innerHTML = `<div class="ml-pin-badge">${poi.number} ${escapeHtml(poi.title)}</div><div class="ml-pin-dot"></div>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      renderPoi(idx);
    });

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(poi.coords)
      .addTo(mlMap);

    mlMarkers.set(poi.id, { marker, el });
  });
}

// =========================================================================
// 3. 雙階段切換與導覽控制
// =========================================================================
async function switchScale(scaleKey) {
  currentScaleKey = scaleKey;
  const scaleData = mapScales[scaleKey];

  $$('.scale-tab').forEach(tab => {
    const isActive = tab.dataset.scale === scaleKey;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  $('#mapSubtitle').textContent = scaleData.subtitle;
  $('#panelScaleTag').textContent = scaleData.panelTag;
  $('#panelHeading').textContent = scaleData.panelHeading;
  $('#panelHint').textContent = scaleData.panelHint;
  $('#panelFootnote').textContent = scaleData.panelFootnote;
  $('#viewerCornerTitle').textContent = scaleData.cornerTitle;
  $('#viewerCornerSub').textContent = scaleData.cornerSub;
  $('#viewerControlHint').textContent = scaleData.controlHint;
  $('#viewerCaptionLeft').innerHTML = scaleData.captionLeft;
  $('#viewerCaptionRight').textContent = scaleData.captionRight;
  $('#detailLabel1').textContent = scaleData.label1;
  $('#detailLabel2').textContent = scaleData.label2;

  const nextBtn = $('#switchScaleBtn');
  nextBtn.textContent = scaleData.nextBtnText;
  nextBtn.classList.toggle('is-back', scaleKey === 'micro');

  // 重建左側清單
  $('#poiList').innerHTML = scaleData.pois.map(poi => `
    <button class="poi-button" data-poi="${poi.id}">
      <span class="poi-index">${poi.number}</span>
      <span class="poi-name">${escapeHtml(poi.title)}<small>${escapeHtml(poi.short)}</small></span>
      <span class="poi-arrow">↗</span>
    </button>
  `).join('');
  $$('.poi-button').forEach(button => {
    button.addEventListener('click', () => renderPoi(scaleData.pois.findIndex(p => p.id === button.dataset.poi)));
  });

  if (scaleData.mode === 'three') {
    // 切換至 PART 01：顯示 Three.js 畫布，隱藏 MapLibre
    $('#maplibreContainer').style.display = 'none';
    $('#terrainCanvas').style.display = 'block';
    $('#uploadGlbLabel').style.display = 'inline-block';
    resizeRenderer();

    if (!modelRoot) {
      $('#viewerLoading').classList.remove('hidden');
      buildMacroDemoTerrain();
      fitCameraToObject(demoGroup);
      try {
        const gltf = await gltfLoader.loadAsync(scaleData.modelPath);
        if (currentScaleKey === 'macro') loadGltfScene(gltf.scene, scaleData.modelLabel);
      } catch {
        $('#modelStatus').textContent = '尚未放入 dajia-basin.glb，顯示示意地形';
      } finally {
        $('#viewerLoading').classList.add('hidden');
      }
    } else {
      $('#demoNotice').style.display = 'none';
      $('#modelStatus').textContent = `${scaleData.modelLabel}已載入 · 4 個定位點完成`;
      fitCameraToObject(modelRoot);
    }
    renderPoi(0);
  } else {
    // 切換至 PART 02：隱藏 Three.js 畫布，顯示 MapLibre 3D 高程正射地圖
    $('#terrainCanvas').style.display = 'none';
    $('#uploadGlbLabel').style.display = 'none';
    $('#demoNotice').style.display = 'none';
    $('#viewerLoading').classList.add('hidden');
    $('#maplibreContainer').style.display = 'block';
    $('#modelStatus').textContent = '國土測繪正射影像 + 3D 高程圖磚已連線';

    initMapLibre();
    setTimeout(() => {
      mlMap.resize();
      renderPoi(0);
    }, 50);
  }
}

function renderPoi(index) {
  const scaleData = mapScales[currentScaleKey];
  const pois = scaleData.pois;
  const total = String(pois.length).padStart(2, '0');
  activePoiIndex = (index + pois.length) % pois.length;
  const poi = pois[activePoiIndex];

  $('#detailIndex').textContent = `PLACE ${poi.number} / ${total}`;
  $('#detailKicker').textContent = poi.kicker;
  $('#detailTitle').textContent = poi.title;
  $('#detailSubtitle').textContent = poi.subtitle;
  $('#detailCulture').textContent = poi.culture;
  $('#detailLocal').textContent = poi.local;
  $('#detailTags').innerHTML = poi.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  $('#detailCount').textContent = `${poi.number} — ${total}`;
  $$('.poi-button').forEach(button => button.classList.toggle('selected', button.dataset.poi === poi.id));

  if (scaleData.mode === 'three') {
    const marker = markerObjects.get(poi.id);
    if (marker) {
      const worldPos = new THREE.Vector3();
      marker.getWorldPosition(worldPos);
      controls.target.lerp(worldPos, 0.25);
      const offset = camera.position.clone().sub(controls.target);
      camera.position.copy(worldPos).add(offset.length() ? offset.normalize().multiplyScalar(Math.max(8, offset.length())) : new THREE.Vector3(8, 8, 10));
      controls.update();
    }
  } else if (mlMap) {
    mlMarkers.forEach((item, id) => {
      item.el.classList.toggle('active', id === poi.id);
    });
    mlMap.flyTo({
      center: poi.coords,
      zoom: 17.2,
      pitch: 58,
      duration: 1400,
      essential: true
    });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

$$('.scale-tab').forEach(tab => tab.addEventListener('click', () => {
  if (tab.dataset.scale !== currentScaleKey) switchScale(tab.dataset.scale);
}));
$('#switchScaleBtn').addEventListener('click', () => switchScale(mapScales[currentScaleKey].nextTarget));
$('#prevPoi').addEventListener('click', () => renderPoi(activePoiIndex - 1));
$('#nextPoi').addEventListener('click', () => renderPoi(activePoiIndex + 1));

$('#resetView').addEventListener('click', () => {
  if (currentScaleKey === 'macro') {
    fitCameraToObject(isDemo ? demoGroup : modelRoot);
  } else if (mlMap) {
    mlMap.flyTo({ center: [120.8485, 24.2285], zoom: 16.0, pitch: 55, bearing: 28, duration: 1200 });
  }
});

canvas.addEventListener('pointerdown', event => {
  if (currentScaleKey !== 'macro') return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickablePins, false);
  if (hits.length) {
    const poiId = hits[0].object.userData.poiId;
    const index = mapScales.macro.pois.findIndex(poi => poi.id === poiId);
    if (index >= 0) renderPoi(index);
  }
});

function resizeRenderer() {
  const width = Math.max(1, viewer.clientWidth);
  const height = Math.max(1, viewer.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
const resizeObserver = new ResizeObserver(() => {
  resizeRenderer();
  if (mlMap) mlMap.resize();
});
resizeObserver.observe(viewer);
window.addEventListener('resize', () => {
  resizeRenderer();
  if (mlMap) mlMap.resize();
});

function animate() {
  requestAnimationFrame(animate);
  if (currentScaleKey === 'macro') {
    controls.update();
    renderer.render(scene, camera);
  }
}

resizeRenderer();
animate();
switchScale('macro');