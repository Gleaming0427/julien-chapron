// Fond 3D du hero : nœud torique en fil de fer vert, rotation lente et léger
// parallaxe à la souris. Chargé à la demande (jamais si reduced motion),
// pause quand le hero sort de l'écran ou que l'onglet est masqué.
import * as THREE from "three";

export function initHero3D(): void {
  const hero = document.querySelector<HTMLElement>(".hero");
  if (!hero) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return; // WebGL indisponible : la page reste parfaitement lisible en 2D.
  }

  const canvas = renderer.domElement;
  canvas.className = "hero-canvas";
  hero.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 6;

  // L'objet pivote lentement dans son groupe ; le parallaxe souris incline
  // l'objet lui-même, sans conflit d'axes.
  const group = new THREE.Group();
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.15, 0.32, 140, 18),
    new THREE.MeshBasicMaterial({
      color: 0x3fb950,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    }),
  );
  group.add(knot);
  scene.add(group);

  let width = 0;
  let height = 0;
  const resize = (): void => {
    const rect = hero.getBoundingClientRect();
    if (rect.width === width && rect.height === height) return;
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    // Sur petit écran, l'objet revient au centre, en retrait derrière le contenu.
    knot.position.x = rect.width < 700 ? 0 : 1.35;
    knot.scale.setScalar(rect.width < 700 ? 0.75 : 1);
  };
  resize();
  new ResizeObserver(resize).observe(hero);

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
  }).observe(hero);

  renderer.setAnimationLoop(() => {
    if (!inView || document.hidden) return;
    group.rotation.x += 0.002;
    group.rotation.y += 0.003;
    knot.rotation.x += (targetX - knot.rotation.x) * 0.05;
    knot.rotation.y += (targetY - knot.rotation.y) * 0.05;
    renderer.render(scene, camera);
  });
}
