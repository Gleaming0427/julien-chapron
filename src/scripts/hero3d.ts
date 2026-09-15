// Scène 3D du hero : nœud torique en fil de fer vert avec anneau orbital,
// rotation lente, flottement et parallaxe souris. Chargé à la demande
// (jamais si reduced motion), pause hors écran / onglet masqué.
import * as THREE from "three";

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
  camera.position.z = 6;

  // L'objet pivote lentement dans son groupe ; le parallaxe souris incline
  // l'objet lui-même, sans conflit d'axes.
  const group = new THREE.Group();
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.05, 0.3, 140, 18),
    new THREE.MeshBasicMaterial({
      color: 0x3fb950,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    }),
  );
  group.add(knot);
  scene.add(group);

  // Anneau orbital discret : seconde profondeur.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, 0.015, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0.14 }),
  );
  ring.rotation.x = Math.PI / 2.4;
  scene.add(ring);

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
    knot.scale.setScalar(rect.width < 360 ? 0.75 : 1);
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
    group.rotation.x += 0.002;
    group.rotation.y += 0.003;
    group.position.y = Math.sin(t * 0.6) * 0.08;
    ring.rotation.z += 0.0012;
    knot.rotation.x += (targetX - knot.rotation.x) * 0.05;
    knot.rotation.y += (targetY - knot.rotation.y) * 0.05;
    renderer.render(scene, camera);
  });
}
