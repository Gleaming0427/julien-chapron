// Scène 3D du hero : double hélice d'ADN en art de ligne (deux brins verts,
// barreaux cyan), rotation lente, flottement et parallaxe souris. Chargé à la
// demande (jamais si reduced motion), pause hors écran / onglet masqué.
import * as THREE from "three";

/** Courbe hélicoïdale : un brin d'ADN. */
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private height: number,
    private turns: number,
    private phase: number,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * this.turns * Math.PI * 2 + this.phase;
    return target.set(
      Math.cos(angle) * this.radius,
      (t - 0.5) * this.height,
      Math.sin(angle) * this.radius,
    );
  }
}

const RADIUS = 1.05;
const HEIGHT = 3.3;
const TURNS = 2.75;

function helixLine(phase: number): THREE.Line {
  const curve = new HelixCurve(RADIUS, HEIGHT, TURNS, phase);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(320));
  const material = new THREE.LineBasicMaterial({
    color: 0x3fb950,
    transparent: true,
    opacity: 0.55,
  });
  return new THREE.Line(geometry, material);
}

/** Barreaux reliant les deux brins, façon échelle d'ADN. */
function rungSegments(): THREE.LineSegments {
  const strandA = new HelixCurve(RADIUS, HEIGHT, TURNS, 0);
  const strandB = new HelixCurve(RADIUS, HEIGHT, TURNS, Math.PI);
  const vertices: number[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = strandA.getPoint(t);
    const b = strandB.getPoint(t);
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x58a6ff,
    transparent: true,
    opacity: 0.3,
  });
  return new THREE.LineSegments(geometry, material);
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

  const canvas = renderer.domElement;
  canvas.className = "hero-canvas";
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 5.2;

  // outer : inclinaison + parallaxe souris · spin : rotation continue + flottement.
  const outer = new THREE.Group();
  outer.rotation.x = 0.22;
  const spin = new THREE.Group();
  spin.add(helixLine(0), helixLine(Math.PI), rungSegments());
  outer.add(spin);
  scene.add(outer);

  let width = 0;
  let height = 0;
  const resize = (): void => {
    const rect = stage.getBoundingClientRect();
    if (rect.width === width && rect.height === height) return;
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    spin.scale.setScalar(rect.width < 360 ? 0.8 : 1.05);
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  // Parallaxe souris, desktop uniquement.
  let targetX = 0;
  let targetY = 0;
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      targetX = y * 0.25;
      targetY = x * 0.45;
    });
  }

  let inView = true;
  new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? false;
  }).observe(stage);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!inView || document.hidden) return;
    const t = clock.getElapsedTime();
    spin.rotation.y += 0.006;
    spin.position.y = Math.sin(t * 0.6) * 0.08;
    outer.rotation.x += (0.22 + targetX * 0.3 - outer.rotation.x) * 0.05;
    outer.rotation.z += (targetY * 0.25 - outer.rotation.z) * 0.05;
    renderer.render(scene, camera);
  });
}
