// Scène 3D du hero : globe de particules. Les points suivent une grille
// latitude/longitude à pas constant ; ceux qui tombent sur une terre émergée
// sont plus gros et lumineux, les autres forment la poussière des océans.
// Des arcs de grand cercle s'allument depuis Toulouse.
// Chargé à la demande (jamais si reduced motion), en pause hors écran.
import * as THREE from "three";

const DEG = Math.PI / 180;
const LAT_STEP = 1.35;

/* ---------- contours des terres, en [latitude, longitude] ----------
   Tracés volontairement grossiers : à la taille où le globe s'affiche,
   seule la silhouette des masses compte. */

type Outline = [number, number][];

const AFRICA: Outline = [
  [36, -6], [37, 10], [33, 22], [31, 32], [28, 34], [15, 40], [11, 51], [2, 46],
  [-5, 39], [-16, 40], [-25, 35], [-34, 26], [-34, 18], [-23, 14], [-12, 13],
  [-6, 12], [0, 9], [4, 9], [5, -1], [5, -9], [10, -14], [15, -17], [21, -17],
  [28, -13], [33, -9],
];

const ARABIA: Outline = [
  [30, 34], [31, 48], [29, 50], [25, 57], [22, 59], [17, 55], [13, 44], [16, 42],
  [21, 39], [28, 35],
];

const EURASIA: Outline = [
  [36, -6], [43, -9], [47, -2], [51, 1], [55, 8], [58, 11], [64, 13], [70, 22],
  [71, 28], [67, 41], [69, 60], [72, 75], [76, 95], [73, 115], [72, 130],
  [70, 160], [66, 180], [60, 165], [55, 160], [59, 150], [52, 141], [43, 132],
  [35, 128], [31, 122], [22, 114], [10, 107], [8, 100], [16, 95], [21, 90],
  [16, 81], [8, 77], [20, 73], [23, 68], [25, 60], [27, 56], [30, 49], [37, 45],
  [41, 41], [41, 30], [40, 26], [37, 23], [41, 20], [45, 14], [42, 15], [40, 18],
  [38, 16], [41, 13], [44, 10], [43, 5], [39, 0], [37, -2],
];

const NORTH_AMERICA: Outline = [
  [71, -156], [70, -141], [69, -128], [68, -110], [67, -95], [63, -90],
  [60, -94], [57, -92], [55, -82], [51, -79], [55, -77], [58, -68], [60, -64],
  [54, -57], [47, -53], [45, -60], [42, -70], [35, -76], [30, -81], [25, -80],
  [29, -89], [26, -97], [21, -97], [18, -94], [21, -87], [18, -88], [15, -92],
  [20, -105], [23, -110], [28, -114], [32, -117], [40, -124], [48, -124],
  [55, -133], [59, -140], [60, -148], [59, -153], [56, -160], [58, -162],
  [63, -166], [65, -168],
];

const SOUTH_AMERICA: Outline = [
  [12, -72], [11, -64], [6, -58], [4, -52], [-1, -48], [-5, -36], [-13, -38],
  [-23, -42], [-28, -48], [-34, -54], [-38, -58], [-42, -63], [-47, -66],
  [-52, -69], [-55, -68], [-53, -73], [-46, -75], [-40, -74], [-33, -72],
  [-23, -70], [-18, -71], [-12, -77], [-5, -81], [0, -80], [6, -77], [9, -79],
];

const AUSTRALIA: Outline = [
  [-11, 131], [-12, 137], [-15, 136], [-17, 140], [-11, 142], [-15, 145],
  [-20, 149], [-25, 153], [-32, 153], [-38, 150], [-38, 145], [-35, 139],
  [-32, 134], [-32, 128], [-34, 122], [-35, 117], [-31, 115], [-25, 113],
  [-21, 115], [-18, 122], [-14, 127],
];

const GREENLAND: Outline = [
  [83, -35], [78, -20], [70, -22], [62, -42], [66, -53], [76, -60], [81, -60],
];

const MADAGASCAR: Outline = [[-12, 49], [-15, 50], [-25, 47], [-25, 44], [-16, 44]];

const JAPAN: Outline = [
  [45, 142], [43, 145], [35, 140], [34, 135], [31, 130], [34, 129], [37, 137],
  [41, 140],
];

const BRITAIN: Outline = [[58, -5], [57, -2], [53, 0], [51, 1], [50, -5], [54, -5], [55, -6]];
const IRELAND: Outline = [[55, -8], [52, -6], [51, -10], [54, -10]];

const NEW_ZEALAND: Outline = [
  [-35, 173], [-37, 178], [-41, 175], [-46, 170], [-47, 167], [-41, 172], [-38, 174],
];

const SUMATRA: Outline = [[5, 95], [2, 100], [-5, 104], [-6, 105], [-2, 101], [3, 97]];
const BORNEO: Outline = [[7, 117], [4, 119], [-3, 116], [-4, 111], [1, 109]];
const NEW_GUINEA: Outline = [
  [-1, 131], [-3, 141], [-9, 147], [-10, 150], [-8, 138], [-4, 133],
];

const LANDMASSES: Outline[] = [
  AFRICA, ARABIA, EURASIA, NORTH_AMERICA, SOUTH_AMERICA, AUSTRALIA, GREENLAND,
  MADAGASCAR, JAPAN, BRITAIN, IRELAND, NEW_ZEALAND, SUMATRA, BORNEO, NEW_GUINEA,
];

/** Lancer de rayon en projection équirectangulaire. */
function inside(lat: number, lon: number, outline: Outline): boolean {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [latI, lonI] = outline[i]!;
    const [latJ, lonJ] = outline[j]!;
    if (
      lonI > lon !== lonJ > lon &&
      lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI) + latI
    ) {
      hit = !hit;
    }
  }
  return hit;
}

function isLand(lat: number, lon: number): boolean {
  if (lat < -63) return true; // Antarctique
  return LANDMASSES.some((outline) => inside(lat, lon, outline));
}

/** Direction d'un point de latitude/longitude, en degrés. */
function fromLatLon(lat: number, lon: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );
}

/** Grille régulière : le nombre de points par rangée suit le cosinus de la
    latitude, sinon ils s'entassent aux pôles. */
export function buildPoints(): { land: THREE.Vector3[]; sea: THREE.Vector3[] } {
  const land: THREE.Vector3[] = [];
  const sea: THREE.Vector3[] = [];

  for (let lat = -88; lat <= 88; lat += LAT_STEP) {
    const count = Math.max(6, Math.round((360 / LAT_STEP) * Math.cos(lat * DEG)));
    for (let i = 0; i < count; i++) {
      const lon = -180 + (360 * i) / count;
      (isLand(lat, lon) ? land : sea).push(fromLatLon(lat, lon));
    }
  }
  return { land, sea };
}

/** Durée d'assemblage : chaque point met ce temps à rejoindre sa place,
    et les départs sont échelonnés sur STAGGER. */
const FLY_IN = 1.5;
const STAGGER = 0.8;

export interface Cloud {
  points: THREE.Points;
  start: Float32Array;
  target: Float32Array;
  delay: Float32Array;
}

/** Nuage de points qui arrive de très loin, chaque point part le long de
    sa propre direction, bien au-delà du cadre, et converge vers la sphère. */
export function pointCloud(
  positions: THREE.Vector3[],
  color: number,
  size: number,
  opacity: number,
): Cloud {
  const count = positions.length;
  const target = new Float32Array(count * 3);
  const start = new Float32Array(count * 3);
  const delay = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = positions[i]!;
    target[i * 3] = p.x;
    target[i * 3 + 1] = p.y;
    target[i * 3 + 2] = p.z;

    // Suite pseudo-aléatoire déterministe : même arrivée à chaque visite.
    const noise = (n: number): number => {
      const v = Math.sin(i * n) * 43758.5453;
      return v - Math.floor(v);
    };
    // Écart dans le plan XY du GLOBE — et non de l'écran, contrairement à ce
    // que disait ce commentaire : le groupe tourne, donc cet écart bascule en
    // profondeur au fil de la rotation. Les points peuvent ainsi frôler la
    // caméra ; c'est sans conséquence depuis que la taille ne dépend plus de
    // la distance (voir le matériau plus bas).
    const angle = noise(12.9898) * Math.PI * 2;
    const away = 4.5 + noise(78.233) * 7;
    start[i * 3] = p.x + Math.cos(angle) * away;
    start[i * 3 + 1] = p.y + Math.sin(angle) * away;
    start[i * 3 + 2] = p.z;
    delay[i] = noise(21.317) * STAGGER;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(start.slice(), 3));
  const material = new THREE.PointsMaterial({
    color,
    // Taille en PIXELS, sans atténuation par la distance. Avec l'atténuation,
    // un point qui passe près de la caméra devient énorme — et c'est ce qui
    // arrivait pendant l'arrivée : le décalage ci-dessus est appliqué dans le
    // repère du globe, qui tourne, si bien qu'à l'angle de départ (−1,6 rad)
    // il se transforme en décalage de PROFONDEUR et amène les points sur la
    // caméra. Sans atténuation le problème ne peut plus exister, quelle que
    // soit la rotation, et les points restent fins d'un bout à l'autre.
    // Sur le globe lui-même la perte est négligeable : l'écart de taille
    // entre face avant et face arrière n'était que de 1,21×.
    size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return { points: new THREE.Points(geometry, material), start, target, delay };
}

/** Avance l'assemblage d'un nuage. Renvoie true tant qu'il reste à bouger. */
export function advance(cloud: Cloud, elapsed: number): boolean {
  const attribute = cloud.points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const position = attribute.array as Float32Array;
  let moving = false;

  for (let i = 0; i < cloud.delay.length; i++) {
    const t = Math.min(1, Math.max(0, (elapsed - cloud.delay[i]!) / FLY_IN));
    if (t < 1) moving = true;
    const eased = 1 - Math.pow(1 - t, 3);
    for (let axis = 0; axis < 3; axis++) {
      const k = i * 3 + axis;
      position[k] = cloud.start[k]! + (cloud.target[k]! - cloud.start[k]!) * eased;
    }
  }
  attribute.needsUpdate = true;
  return moving;
}

/** Arc de grand cercle. Il s'élève peu : une liaison réseau longe la
    surface, elle ne part pas en cloche. */
function arcCurve(from: THREE.Vector3, to: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const lift = 1 + from.distanceTo(to) * 0.16;
  const control = from.clone().add(to).normalize().multiplyScalar(lift);
  return new THREE.QuadraticBezierCurve3(from.clone(), control, to.clone());
}

interface Link {
  packet: THREE.Line;
  curve: THREE.QuadraticBezierCurve3;
  steps: number;
  offset: number;
  speed: number;
  reverse: boolean;
}

// Les nœuds du réseau. Toulouse en premier : c'est le seul mis en avant.
const NODES: [number, number][] = [
  [43.6, 1.44], [40.7, -74], [51.5, -0.1], [35.7, 139.7], [-33.9, 151.2],
  [1.35, 103.8], [-23.5, -46.6], [52.5, 13.4], [45.5, -73.6], [25.2, 55.3],
  [-33.9, 18.4], [12.97, 77.6], [37.8, -122.4],
];

// Les liaisons du maillage : des échanges de proche en proche, pas un
// faisceau partant d'un point unique, sinon ça fait gerbe d'artifice.
const ROUTES: [number, number][] = [
  [0, 2], [0, 7], [0, 9], [2, 1], [1, 8], [1, 12], [12, 3], [3, 5],
  [5, 11], [11, 9], [5, 4], [10, 7], [6, 1], [4, 3], [2, 6],
];

/** Longueur du paquet, en nombre de points du tracé. */
const TRAIL = 20;

/** Orbite satellite : anneau dont la couleur se dégrade le long du trait
    (vif près du satellite, fondu vers le fond), et le satellite qui tourne. */
interface SatelliteOrbit {
  line: THREE.LineLoop;
  colors: THREE.BufferAttribute;
  sat: THREE.Points;
  satPos: THREE.BufferAttribute;
  count: number;
  radius: number;
  angle: number;
  speed: number;
}

const ORBIT_SEGMENTS = 180;
/** Longueur angulaire de la traînée, de part et d'autre du satellite. */
const ORBIT_TRAIL = 1.35;

/** `eclat` module l'intensité de la traînée. Toutes les orbites au même
    niveau donneraient un enchevêtrement ; deux niveaux créent une profondeur,
    quelques trajectoires marquées et d'autres qui n'affleurent que par
    moments. */
function satelliteOrbit(
  radius: number,
  tilt: number,
  spin: number,
  speed: number,
  eclat = 1,
): SatelliteOrbit {
  const positions: number[] = [];
  for (let i = 0; i < ORBIT_SEGMENTS; i++) {
    const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(ORBIT_SEGMENTS * 3), 3));
  const line = new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 }),
  );
  line.rotation.x = tilt;
  line.rotation.z = spin;
  line.material.userData.eclat = eclat;
  // Le satellite est enfant de la ligne : il tourne dans son plan incliné
  // et suit donc exactement le trait.
  const sat = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(3), 3),
    ),
    new THREE.PointsMaterial({
      color: 0xffd9c4,
      size: 5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  sat.material.userData.eclat = eclat;
  line.add(sat);
  return {
    line,
    colors: geometry.getAttribute("color") as THREE.BufferAttribute,
    sat,
    satPos: sat.geometry.getAttribute("position") as THREE.BufferAttribute,
    count: ORBIT_SEGMENTS,
    radius,
    angle: 0,
    speed,
  };
}

export function initHero3D(): void {
  const stage = document.querySelector<HTMLElement>(".hero-stage");
  if (!stage) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return; // WebGL indisponible : la page reste parfaitement lisible en 2D.
  }

  // Le canvas couvre tout le premier écran, pas seulement l'emplacement du
  // globe : c'est ce qui permet aux points d'arriver de hors page. Le globe
  // est ensuite recadré par la caméra sur l'emplacement réservé (.hero-stage),
  // qui reste la zone sensible au glissement.
  const canvas = renderer.domElement;
  canvas.className = "hero-canvas";
  const layer = document.createElement("div");
  layer.className = "hero-canvas-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.appendChild(canvas);
  (stage.closest(".dark-zone") ?? stage).prepend(layer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  // Recul minimal pour que la sphère (diamètre 2) tienne entièrement dans
  // le champ vertical : 2 / (2 · tan(fov/2)) ≈ 2,6, plus une marge.
  camera.position.z = 3;

  // outer : inclinaison + parallaxe souris · spin : rotation continue.
  const outer = new THREE.Group();
  outer.rotation.x = 0.3;
  const spin = new THREE.Group();
  outer.add(spin);
  scene.add(outer);

  const { land, sea } = buildPoints();

  // Sphère opaque à peine plus petite : elle masque les points de la face
  // arrière, ce qui donne au globe son volume.
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.985, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x0d1117 }),
  );
  // Le noyau ne masque rien tant que le globe n'est pas formé.
  core.scale.setScalar(0.001);
  spin.add(core);

  const seaCloud = pointCloud(sea, 0x8b949e, 1.6, 0.6);
  const landCloud = pointCloud(land, 0xffffff, 2.6, 1);
  spin.add(seaCloud.points, landCloud.points);

  // Toulouse n'a plus de point propre : les liaisons en partent toujours,
  // mais sans pastille orange au milieu du semis.
  const clouds = [seaCloud, landCloud];
  let assembling = true;

  // Quatre orbites satellites inclinées, chacune avec sa traînée dégradée.
  // Rayons bornés pour que chaque orbite tienne dans le cadre : la plus
  // large (diamètre 2,4) reste sous la hauteur visible (~2,4).
  const orbits = [
    // Les quatre d'origine, pleinement marquées.
    satelliteOrbit(1.04, 0.35, 0.2, 0.22),
    satelliteOrbit(1.1, -0.5, -0.15, -0.17),
    satelliteOrbit(1.16, 0.85, 0.5, 0.12),
    satelliteOrbit(1.2, -0.75, 0.85, -0.09),
    // Quatre intercalées, plus discrètes : elles densifient la coque sans
    // la saturer. Inclinaisons et rotations choisies pour croiser les
    // premières plutôt que les doubler. Les vitesses sont volontairement
    // sans rapport simple entre elles — sinon les satellites finissent par
    // se synchroniser et le mouvement devient régulier.
    satelliteOrbit(1.065, 1.15, -0.65, 0.15, 0.45),
    satelliteOrbit(1.125, -1.05, 0.95, -0.13, 0.4),
    satelliteOrbit(1.17, 0.6, -1.1, 0.19, 0.5),
    satelliteOrbit(1.195, -0.25, 1.35, -0.07, 0.38),
  ];
  orbits.forEach((orbit) => spin.add(orbit.line));

  // Chaque liaison est doublée : un tracé permanent très discret, qui dessine
  // la topologie, et un court segment lumineux qui la parcourt, le paquet.
  const nodePoints = NODES.map(([lat, lon]) => fromLatLon(lat, lon));
  const links: Link[] = [];
  // Les matériaux des arcs, gardés pour pouvoir les révéler à la fin. Créés
  // en ligne et oubliés, ils restaient à 0,35 dès la première image : les
  // traits orange étaient donc déjà dessinés pendant que les points
  // convergeaient encore depuis l'extérieur de la page.
  const arcs: THREE.LineBasicMaterial[] = [];

  ROUTES.forEach(([a, b], i) => {
    const steps = 180;
    const curve = arcCurve(nodePoints[a]!, nodePoints[b]!);
    const points = curve.getPoints(steps);

    const arc = new THREE.LineBasicMaterial({
      color: 0xff4d00,
      transparent: true,
      opacity: 0, // révélé à la fin, une fois le globe formé
    });
    arcs.push(arc);
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), arc));

    const packet = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xff6b1f, transparent: true, opacity: 0 }),
    );
    packet.geometry.setDrawRange(0, 0);
    spin.add(packet);

    links.push({
      packet,
      curve,
      steps: steps + 1,
      offset: (i * 0.37) % 1,
      speed: 0.14 + (i % 5) * 0.035,
      reverse: i % 2 === 1,
    });
  });

  // Les nœuds du réseau, en pointillé vert discret.
  const cities = pointCloud(nodePoints.slice(1), 0xff4d00, 3, 0.7);
  spin.add(cities.points);
  clouds.push(cities);

  // La tête de chaque paquet.
  const heads = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(ROUTES.length * 3), 3),
    ),
    new THREE.PointsMaterial({
      color: 0xffd9c4,
      size: 4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  spin.add(heads);

  const HALF_FOV_TAN = Math.tan((42 * DEG) / 2);
  let width = 0;
  let height = 0;
  const resize = (): void => {
    const view = layer.getBoundingClientRect();
    const slot = stage.getBoundingClientRect();
    if (view.width < 1 || view.height < 1 || slot.height < 1) return;
    width = slot.width;
    height = slot.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(view.width, view.height);
    camera.aspect = view.width / view.height;

    // Recul tel que la sphère (diamètre 2) occupe la hauteur de son
    // emplacement, alors que le canvas, lui, fait tout l'écran.
    // Le globe occupe 84 % du cadre : il reste la place pour que les
    // orbites les plus larges tiennent entièrement dans la fenêtre.
    const wanted = Math.min(slot.height, slot.width) * 0.84;
    camera.position.z = view.height / (wanted * HALF_FOV_TAN);
    camera.updateProjectionMatrix();

    // Puis on remonte le globe du centre du canvas vers celui de sa place.
    const worldPerPixel = (2 * camera.position.z * HALF_FOV_TAN) / view.height;
    const slotCenter = slot.top + slot.height / 2;
    const viewCenter = view.top + view.height / 2;
    outer.position.y = (viewCenter - slotCenter) * worldPerPixel;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  observer.observe(layer);

  // État de la rotation à la main.
  let dragging = false;
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let yawVelocity = 0;
  let dragYaw = 0;
  let dragPitch = 0;

  // Rotation à la main, avec inertie. Un balayage de la largeur du cadre
  // fait un demi-tour ; l'inclinaison est bornée pour ne pas retourner le
  // globe. touch-action: pan-y (CSS) laisse le défilement vertical au doigt.
  stage.addEventListener("pointerdown", (event) => {
    dragging = true;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    yawVelocity = 0;
    stage.setPointerCapture(pointerId);
    stage.classList.add("dragging");
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    yawVelocity = (dx / Math.max(1, width)) * Math.PI;
    dragYaw += yawVelocity;
    dragPitch = Math.min(0.9, Math.max(-0.9, dragPitch + (dy / Math.max(1, height)) * 1.6));
  });

  const endDrag = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
    stage.classList.remove("dragging");
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  let inView = true;
  new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? false;
  }).observe(stage);

  const clock = new THREE.Clock();
  // L'Europe fait face à la caméra au chargement.
  let autoYaw = -1.6;

  renderer.setAnimationLoop(() => {
    // Pas de garde sur document.hidden : ce drapeau est vrai dans des
    // contextes où la page est pourtant affichée (panneaux intégrés,
    // aperçus), et le globe y restait figé. La sortie d'écran (inView)
    // suffit à ne rien calculer pour rien, et le navigateur ralentit déjà
    // requestAnimationFrame quand l'onglet passe vraiment au second plan.
    if (!inView) return;
    const t = clock.getElapsedTime();

    // Les points convergent de l'extérieur pour former le globe, puis on
    // arrête de toucher aux géométries.
    if (assembling) {
      let moving = false;
      for (const cloud of clouds) {
        if (advance(cloud, t)) moving = true;
      }
      assembling = moving;
      // Le noyau grandit avec eux : il ne masque la face arrière qu'une
      // fois la sphère en place.
      const formed = Math.min(1, t / (FLY_IN + STAGGER));
      core.scale.setScalar(Math.max(0.001, formed));
    }

    if (!dragging) {
      // Inertie après le relâchement, puis reprise de la rotation lente.
      dragYaw += yawVelocity;
      yawVelocity *= 0.94;
      autoYaw += 0.0005;
    }
    spin.rotation.y = autoYaw + dragYaw;

    // Le trafic ne démarre qu'une fois le globe formé.
    const netTime = t - (FLY_IN + STAGGER);
    if (netTime > 0) {
      const headPos = heads.geometry.getAttribute("position") as THREE.BufferAttribute;
      (heads.material as THREE.PointsMaterial).opacity = Math.min(1, netTime);

      links.forEach((link, i) => {
        const phase = (netTime * link.speed + link.offset) % 1;
        const along = link.reverse ? 1 - phase : phase;
        const head = Math.round(along * (link.steps - 1));

        // Fenêtre de tracé : le paquet traîne derrière lui, du côté d'où
        // il vient.
        const first = link.reverse ? head : Math.max(0, head - TRAIL);
        const last = link.reverse ? Math.min(link.steps - 1, head + TRAIL) : head;
        link.packet.geometry.setDrawRange(first, last - first + 1);

        // Il s'estompe en arrivant, pour ne pas buter sur le nœud.
        (link.packet.material as THREE.LineBasicMaterial).opacity =
          0.75 * Math.min(1, phase * 8) * Math.min(1, (1 - phase) * 8);

        const tip = link.curve.getPoint(along);
        headPos.setXYZ(i, tip.x, tip.y, tip.z);
      });
      headPos.needsUpdate = true;
    }

    // Les arcs du réseau arrivent en dernier, et lentement : le globe se
    // forme d'abord, nu, puis les liaisons se tracent par-dessus. Départ
    // décalé d'un quart de seconde après la formation, montée en ~1,1 s —
    // plus tard et plus posé que les orbites.
    const arcOn = Math.min(1, Math.max(0, netTime - 0.25) * 0.9);
    for (const arc of arcs) arc.opacity = 0.35 * arcOn;

    // Orbites satellites : la traînée dégradée suit chaque satellite, qui
    // parcourt son orbite. L'ensemble n'apparaît qu'une fois le globe formé.
    const orbitOn = Math.min(1, Math.max(0, netTime) * 2);
    for (const orbit of orbits) {
      orbit.angle += orbit.speed * 0.016;
      const colors = orbit.colors.array as Float32Array;
      for (let i = 0; i < orbit.count; i++) {
        const a = (i / orbit.count) * Math.PI * 2;
        const d = Math.abs(Math.atan2(Math.sin(a - orbit.angle), Math.cos(a - orbit.angle)));
        // Dégradé : vif au satellite (0xff6b1f), fondu vers le fond (0x0d1117).
        const f = Math.max(0, 1 - d / ORBIT_TRAIL);
        const s = f * f;
        colors[i * 3] = 0.051 + 0.949 * s;
        colors[i * 3 + 1] = 0.0667 + 0.353 * s;
        colors[i * 3 + 2] = 0.0902 + 0.0314 * s;
      }
      orbit.colors.needsUpdate = true;
      const eclat = orbit.line.material.userData.eclat as number;
      (orbit.line.material as THREE.LineBasicMaterial).opacity = 0.9 * orbitOn * eclat;
      (orbit.sat.material as THREE.PointsMaterial).opacity = orbitOn * eclat;
      // Coordonnées locales : la rotation de la ligne s'applique au point.
      orbit.satPos.setXYZ(0, Math.cos(orbit.angle) * orbit.radius, 0, Math.sin(orbit.angle) * orbit.radius);
      orbit.satPos.needsUpdate = true;
    }

    outer.rotation.x += (0.3 + dragPitch - outer.rotation.x) * 0.08;
    renderer.render(scene, camera);
  });
}
