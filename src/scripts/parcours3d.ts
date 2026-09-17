// The 3D form of the parcours block: a donut of points, with the same
// care as the hero globe. The sequence between the profile block and the
// parcours block is entirely driven by --spec-form, that is, by the POSITION
// of the rail — no clock of its own in this module:
// 1. the black points enter FROM THE TOP RIGHT and line up on the torus
//    (up to 0.34); scrolling back up, they leave by the same path;
// 2. a black panel sweeps across the screen from the right, and each point
//    whitens at the precise moment the panel's edge passes it;
// 3. the donut spins around its axis, continuously.
// The block's grid, for its part, does not fade here: it stays full until
// the exit, and it is the skills block that erases its own (ui.ts).
// The automatic behaviour therefore does NOT come from here: it is ui.ts that
// scrolls the page all by itself over this stretch, and the smoothness comes
// from its acceleration curve. Everything replays backwards on the way up, with
// no state to reset since nothing is memoized.
// Permanent rendering: the layer covers the whole pinned area. Without WebGL,
// parcours-gl is not set and the CSS background stays opaque.
import * as THREE from "three";
import { SPEC_COURSE, SPEC_DEPART, TITRE_DEBUT, TITRE_FIN } from "./specform";

/* The steps, expressed in shares of --spec-form. They chain together without
   overlapping those of the CSS (title 0.43 → 0.715; carousel 0.715 →
   0.835): the points are formed and whitened before the title arrives. */
const FORME_FIN = 0.42;   // end of the points' arrival (4.2 s)
const NOIR_DEBUT = 0.42;  // the background switches during the wait before the title
const NOIR_FIN = 0.54;    // black background, white points

/* Attenuation of the points that fall BEHIND the title. The points rise to
   ~0.95 white, exactly the luminance of the text (#f3f1ec): left untouched, they
   hold the same visual place as the letters and the title becomes
   illegible (contrast 1.1:1).
   0.22: the text keeps 11.2:1 over the points, even where a letter falls
   right on a point. There the points drop to 1.6:1 over the background — hardly
   more than a grid, which is intended: under the title, they should only
   accompany it.
   This value no longer costs the donut anything since the attenuation is
   LOCAL: it only touches the points covered by the title, while
   the whole rim of the ring keeps its full presence (15.4:1 over the background).
   That is what allows going so low — as a global attenuation, 0.32 switched
   the entire donut off. */
const RETRAIT = 0.22;

/** Reading tilt of the donut, in radians. Flat, we would see a circle.
    Carried by `spin`, so it also applies to the start positions:
    poserLesDeparts() must compensate for it. */
const TILT = 0.95;

const COUNT = 2200;
const FOV = 42;
const HALF_FOV_TAN = Math.tan((FOV * Math.PI) / 180 / 2);

/** Deterministic pseudo-random sequence, as in hero3d. */
function graine(i: number, n: number): number {
  const v = Math.sin(i * n) * 43758.5453;
  return v - Math.floor(v);
}

/** A point on the surface of a donut (torus), brought back into the unit sphere. */
function surLeTore(i: number): [number, number, number] {
  const u = graine(i, 1.7) * Math.PI * 2;
  const v = graine(i, 5.3) * Math.PI * 2;
  const R = 0.6;
  const r = 0.27;
  return [
    (R + r * Math.cos(v)) * Math.cos(u),
    (R + r * Math.cos(v)) * Math.sin(u),
    r * Math.sin(v),
  ];
}

export function initParcours3D(): void {
  const section = document.querySelector<HTMLElement>(".section-exp");
  const intro = document.querySelector<HTMLElement>(".spec-intro");
  const sticky = section?.closest<HTMLElement>(".carousel-sticky");
  const rail = sticky?.closest<HTMLElement>(".carousel-rail");
  const item = section?.closest<HTMLElement>(".carousel-item");
  const itemSkills =
    document.querySelector<HTMLElement>(".section-skills")?.closest<HTMLElement>(".carousel-item") ?? null;
  if (!section || !intro || !sticky || !rail || !item) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return; // WebGL unavailable: the block reads very well without it.
  }
  // The block gives up its background to the panel below, which sweeps the
  // screen. Without WebGL the class is not set and the CSS keeps its opaque
  // background: the block is black right away, with no sweep, but perfectly readable.
  item.classList.add("parcours-gl");

  const canvas = renderer.domElement;
  canvas.className = "parcours-canvas";
  const layer = document.createElement("div");
  layer.className = "parcours-canvas-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.appendChild(canvas);
  // The layer is placed over the entire pinned area: the points are
  // visible from the profile block onward, not only on the parcours.
  sticky.prepend(layer);

  // The block's background is a black panel that SWEEPS in from the right, and
  // no longer a plane that fades in. It is a simple CSS element slid BEHIND the
  // 3D layer: the donut is therefore drawn over it. In WebGL it would have
  // taken an extra plane and handling its framing yourself; in CSS the
  // panel fills the screen by construction, at any aspect ratio.
  const volet = document.createElement("div");
  volet.className = "parcours-fond";
  volet.setAttribute("aria-hidden", "true");
  sticky.prepend(volet);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = 3;

  // groupe: the form's position (center then left) · spin: rotation.
  const groupe = new THREE.Group();
  const spin = new THREE.Group();
  groupe.add(spin);
  scene.add(groupe);

  const cible = new Float32Array(COUNT * 3);
  const relais = new Float32Array(COUNT * 3);
  const rangement = new Float32Array(COUNT);
  /* The flight of each point: a deviation from the straight line, plus an
     undulation. That is what makes the swarm — without them, 2200 perfectly
     straight and parallel trajectories, hence machine-like motion. */
  const ecart = new Float32Array(COUNT * 3);
  const onde = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  const teintes = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const [x, y, z] = surLeTore(i);
    // A slight jitter gives the surface its texture.
    const jx = (graine(i, 9.1) - 0.5) * 0.04;
    const jy = (graine(i, 9.7) - 0.5) * 0.04;
    const jz = (graine(i, 11.3) - 0.5) * 0.04;
    cible[i * 3] = x + jx;
    cible[i * 3 + 1] = y + jy;
    cible[i * 3 + 2] = z + jz;

    // Spreading of the starts, wide: it is what gives the arrival its
    // perceived duration. Tightened, the 2200 points settle almost together and
    // the arrival looks brutal even if it lasts a long time.
    rangement[i] = graine(i, 67.9) * 0.8;

    // Deviation direction: drawn uniformly on the sphere (hence the acos, without
    // which the directions would bunch up at the poles). The amplitude varies
    // a lot from one point to the next: some fly almost straight, others
    // take a wide detour. The depth drift is halved —
    // beyond that, the points pass in front of the camera instead of going around.
    const th = graine(i, 73.1) * Math.PI * 2;
    const ph = Math.acos(graine(i, 79.3) * 2 - 1);
    const amp = 0.6 + graine(i, 83.7) * 1.8;
    ecart[i * 3] = Math.sin(ph) * Math.cos(th) * amp;
    ecart[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * amp;
    ecart[i * 3 + 2] = Math.cos(ph) * amp * 0.5;
    onde[i] = 3 + graine(i, 89.1) * 5; // number of serpentines along the path
    phase[i] = graine(i, 97.3) * Math.PI * 2;

    // The points are black: the cloud reads like the site's dots
    // while it crosses the orange profile block.
    teintes[i * 3] = 0;
    teintes[i * 3 + 1] = 0;
    teintes[i * 3 + 2] = 0;
  }

  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute("position", new THREE.BufferAttribute(relais.slice(), 3));
  geometrie.setAttribute("color", new THREE.BufferAttribute(teintes, 3));
  const matiere = new THREE.PointsMaterial({
    size: 0.015,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const nuage = new THREE.Points(geometrie, matiere);
  // The cloud is moved point by point from the script, so the bounding
  // sphere that three.js computes ONLY ONCE — at creation, while
  // the points wait off-screen in the top right — no longer matches
  // anything afterwards. It kept being judged outside the camera's field and the object
  // was culled on every frame: rendering ran (1120 frames) without a
  // single draw call. So we disable this test, rather than recomputing
  // the sphere on every frame for 2200 points that all fit
  // on screen anyway.
  nuage.frustumCulled = false;
  spin.add(nuage);

  // The form is placed at its spot from the start: the title's column,
  // under the text. No sliding.
  let finaleX = 0;
  let finaleY = 0;
  /* Footprint of the title on screen, in fractions (0 = left/top edge). This is
     where — and only where — the cloud must fade. */
  let texteL = 0;
  let texteR = 0;
  let texteT = 0;
  let texteB = 0;

  /** The donut's own rotation, accumulated. Declared HERE, before
      poserLesDeparts() which reads it: further down, the initialization call
      touched it in its dead zone and the whole module failed to start. */
  let angle = 0;

  /** Framing used at the last computation of the starts, to know when to
      redo it. */
  let departsPour = { z: 0, aspect: 0, x: 0, y: 0, a: 0 };

  /** Places the waiting cloud OFF-SCREEN IN THE TOP RIGHT. The bounds are
      deduced from the camera's real field and the group's offset, never
      guessed: hard-coded, they would already be in frame on a wide screen,
      and you would see the points appear out of nowhere.
      Called on every resize — since nothing is memoized, going
      back returns the points exactly from where they came. */
  const poserLesDeparts = (): void => {
    const demiW = camera.position.z * HALF_FOV_TAN * camera.aspect;
    const demiH = camera.position.z * HALF_FOV_TAN;
    // The visible right edge is at demiW - groupe.position.x, since the
    // group is shifted to the left.
    const xMin = demiW - finaleX + 0.4;
    // The visible top edge is deduced from the group's vertical offset:
    // without it, a donut moved back up left its waiting points right in
    // frame.
    const yMin = demiH - finaleY + 0.4;
    // The points live in `spin`, which carries the fixed reading tilt.
    // Writing the wanted offset directly in that frame does not work: the
    // rotation crushes it. Measured, points supposed to start above the top
    // edge (1.43) ended up at 0.16 — that is, right in frame.
    // So we aim for a WORLD position and apply the INVERSE rotation.
    // `spin` applies Rx(TILT) then Rz(angle) — in that order, three.js's XYZ Euler
    // giving world = Rx · Rz · local. To get a wanted
    // WORLD position, the two must therefore be undone: first Rx, then Rz.
    // Undoing only the tilt was not enough: `angle` accumulates
    // while the donut turns, so that on the way back the waiting cloud
    // ended up rotated by as much and crossed the page. The
    // "sometimes" came from there — the position depended on the time spent on
    // block 2.
    const cT = Math.cos(TILT);
    const sT = Math.sin(TILT);
    const cA = Math.cos(angle);
    const sA = Math.sin(angle);
    for (let i = 0; i < COUNT; i++) {
      const wx = xMin + graine(i, 51.7) * 2.4;
      const wy = yMin + graine(i, 57.1) * 1.8;
      const wz = (graine(i, 61.3) - 0.5) * 1.2;
      // Rx(-TILT)
      const ay = cT * wy + sT * wz;
      const az = -sT * wy + cT * wz;
      // then Rz(-angle)
      relais[i * 3] = cA * wx + sA * ay;
      relais[i * 3 + 1] = -sA * wx + cA * ay;
      relais[i * 3 + 2] = az;
    }
    departsPour = { z: camera.position.z, aspect: camera.aspect, x: finaleX, y: finaleY, a: angle };
  };
  poserLesDeparts();
  (geometrie.getAttribute("position") as THREE.BufferAttribute).array.set(relais);

  const resize = (): void => {
    const vue = layer.getBoundingClientRect();
    const place = intro.getBoundingClientRect();
    if (vue.width < 1 || vue.height < 1 || place.height < 1) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(vue.width, vue.height);
    camera.aspect = vue.width / vue.height;

    // The form (diameter 2) occupies ~70% of the screen's smaller side:
    // on a phone it shrinks with the window, on desktop it keeps
    // its current scale (the smaller side there is the height).
    // 0,62 et non 0,7 : le donut frôlait le bas du cadre, sans marge pour
    // respirer.
    const voulu = Math.min(vue.height, vue.width) * 0.62;
    camera.position.z = vue.height / (voulu * HALF_FOV_TAN);
    camera.updateProjectionMatrix();

    const mondeParPixel = (2 * camera.position.z * HALF_FOV_TAN) / vue.height;
    // The title's column, vertically centered: the donut stays
    // behind the text, without going down.
    finaleX = (place.left + place.width / 2 - (vue.left + vue.width / 2)) * mondeParPixel;
    // Same logic vertically: on a phone the intro is at the top of the
    // block, the donut moves up behind it instead of staying centered.
    // Le donut se place volontairement PLUS BAS que le titre, pas centré sur
    // lui. `ecart` est le décalage qui le centrerait — l'axe Y de l'écran
    // descend, celui de la scène monte, d'où cet ordre des termes — et on
    // l'inverse sciemment pour obtenir le rendu retenu.
    // Ne pas « corriger » ce signe : il est délibéré, et sur grand écran il
    // ne change rien, l'intro y étant déjà centrée (l'écart vaut zéro).
    const ecart = (vue.top + vue.height / 2 - (place.top + place.height / 2)) * mondeParPixel;
    finaleY = -ecart;
    texteL = (place.left - vue.left) / vue.width;
    texteR = (place.right - vue.left) / vue.width;
    texteT = (place.top - vue.top) / vue.height;
    texteB = (place.bottom - vue.top) / vue.height;

    // The framing has just changed: so have the off-screen starts.
    groupe.position.x = finaleX;
    poserLesDeparts();
  };
  resize();
  const observateur = new ResizeObserver(resize);
  observateur.observe(sticky);
  // The title too: it is ITS width that sets the framing, and it changes
  // when the display font finishes loading. The pinned area, for its part,
  // is always 100vh — the observer alone therefore never saw anything.
  observateur.observe(intro);

  const position = geometrie.getAttribute("position") as THREE.BufferAttribute;
  const tableau = position.array as Float32Array;
  const couleurs = geometrie.getAttribute("color") as THREE.BufferAttribute;
  const couleursArr = couleurs.array as Float32Array;

  let tPrec = performance.now();

  const tick = (): void => {
    {
      const t = performance.now();
      const dt = Math.min(0.05, (t - tPrec) / 1000);
      tPrec = t;

      const vh = window.innerHeight;
      const railTop = rail.getBoundingClientRect().top;

      // A SINGLE clock for the whole sequence: the rail's position, read
      // with the formula from specform.ts. The two real-time ramps that
      // drove the arrival and the settling have been removed — they advanced
      // at their own pace while the title and the block fades
      // followed the scroll, and the max() of those curves broke its slope
      // where they crossed: that was the jump. The smoothness no longer comes
      // from a local easing but from the scroll itself, which ui.ts animates
      // with a curve softened at both ends.
      const spec = Math.min(
        1,
        Math.max(0, (-railTop - vh * SPEC_DEPART) / (vh * SPEC_COURSE)),
      );

      // Has the framing moved since the last computation of the starts? The
      // layout measurements settle after the first render, and a
      // waiting position computed on a provisional framing falls INSIDE the
      // frame instead of off-screen: on the way back, the points settled
      // right in the middle of the page. This catch-up makes the computation
      // self-correcting — it no longer depends on having measured at the right time.
      if (
        departsPour.z !== camera.position.z ||
        departsPour.aspect !== camera.aspect ||
        departsPour.x !== finaleX ||
        departsPour.y !== finaleY ||
        departsPour.a !== angle
      ) {
        poserLesDeparts();
      }

      // Step 1 — the points enter from the left and line up on the torus.
      const avance = Math.min(1, spec / FORME_FIN);
      for (let i = 0; i < COUNT; i++) {
        // The coefficients follow the spread: with a delay of up to
        // 0.8, it takes 2.0 and 1.2 for even the last point to
        // reach its place exactly at the end of the step.
        const b = Math.min(1, Math.max(0, (avance * 2 - rangement[i]!) / 1.2));
        const forme = b * b * (3 - 2 * b);
        // Curved and serpentine trajectory rather than straight. The bell
        // cancels out at both ends: the point leaves exactly from its waiting
        // spot and settles exactly on its own, the deviation only lives in
        // flight. The undulation is indexed on the PROGRESS and not on time,
        // so the flight is identical on the way out and on the way back, and nothing depends
        // on the speed at which one scrolls.
        const cloche = Math.sin(Math.PI * forme);
        const derive = cloche * (0.6 + 0.4 * Math.sin(forme * onde[i]! + phase[i]!));
        for (let axe = 0; axe < 3; axe++) {
          const k = i * 3 + axe;
          tableau[k] =
            relais[k]! + (cible[k]! - relais[k]!) * forme + ecart[k]! * derive;
        }
      }
      position.needsUpdate = true;

      // Step 2 — the background switches to black, the points whiten.
      const brut = Math.min(
        1,
        Math.max(0, (spec - NOIR_DEBUT) / (NOIR_FIN - NOIR_DEBUT)),
      );
      const noir = brut * brut * (3 - 2 * brut);

      // The background only drops back once the two dark blocks have gone, otherwise
      // the orange would show through between the parcours and the skills: during
      // this switch, the sum of their two opacities digs down to 0.48
      // (measured). Hence the saturation — 2.3 covers that dip with a little
      // margin. It used to be 3, which blackened the background clearly too early.
      // It is a product and not a max: two soft curves that
      // multiply stay soft, whereas a max changes branch and breaks.
      // The RISE of the panel depends only on the staging, hence on the
      // scroll position: instantaneous, stateless, impossible to
      // throw out of sync with the rest. It used to depend on --item-op, which comes from
      // a frame-by-frame easing; as soon as that easing lagged, the panel
      // stayed off-screen and the orange background reappeared on the block.
      // --item-op is now only used for the FALL: it alone knows when the
      // dark blocks have given way to the projects block, and a delay there is
      // harmless since nothing else depends on it at that moment.
      const itemOp = Number(item.style.getPropertyValue("--item-op") || "0");
      const skillsOp = Number(itemSkills?.style.getPropertyValue("--item-op") || "0");
      const relache = spec < 1 ? 1 : Math.min(1, (itemOp + skillsOp) * 2.3);
      // Share of the screen covered by the panel, counted from the right.
      const couverture = noir * relache;
      // Written on the RAIL, not on the panel: the property is inherited, so
      // the panel reads it as before, and the rail — which is what one glimpses
      // under the pinned panel when the iOS toolbar retracts — can take its
      // colour from it.
      rail.style.setProperty("--fond-bloc2", couverture.toFixed(4));

      // Each point whitens WHEN THE PANEL'S EDGE PASSES IT, not according to a
      // common schedule. With a panel, a global whitening would bring back the
      // defect already fixed: white points over the part still orange,
      // to the left of the edge. Here black and white arrive together, point
      // by point — it is the sweep itself that does the staggering, hence
      // dropping `rangement` for this step.
      // Position of a point on screen: rotation.y is 0 and rotation.x does not
      // touch the X axis, only the donut's own rotation (Z) counts.
      // The cloud's withdrawal under the title. COMPUTED BEFORE the color
      // loop, which uses it: declared after, it raised a
      // ReferenceError on every frame, and since requestAnimationFrame is
      // called back at the end of tick, the loop died from the first one — no
      // more panel, no more donut, the orange background reappeared.
      // The cloud fades as the title settles over it.
      // Driven by `spec`, like everything else: the same single clock, so
      // the withdrawal is exactly synchronous with the appearance of the letters.
      const brutRetrait = Math.min(
        1,
        Math.max(0, (spec - TITRE_DEBUT) / (TITRE_FIN - TITRE_DEBUT)),
      );
      // The withdrawal can never exceed the panel's coverage: otherwise the
      // two fall out of sync (the withdrawal follows `spec`, instantaneous; the
      // coverage follows --item-op, which lags) and the points end up
      // both still black and already attenuated — invisible.
      const efface =
        Math.min(couverture, brutRetrait * brutRetrait * (3 - 2 * brutRetrait));
      // The attenuation is LOCAL, not global. Lowering the opacity of the whole
      // cloud made the title readable but switched the donut off: at 0.32 its
      // contrast with the black background drops to 2.16:1. Only the points that
      // fall behind the title fade now; the rest of
      // the ring keeps its full presence.
      matiere.opacity = 1;

      const demiW = camera.position.z * HALF_FOV_TAN * camera.aspect;
      // Panel edge, as a fraction of the screen. Its travel goes well beyond
      // both sides (1.5 → -0.15), for two measured reasons. On the right: at
      // rest the points wait off-screen around sx ≈ 1.10, so an edge
      // starting at 1.125 already caught them in its gradient and they were
      // grey instead of black while crossing the orange. On the left:
      // the gradient is 0.2 wide, so an edge stopping at 0 left
      // the leftmost points capping at 59% white.
      const bord = 1.5 - couverture * 1.65;
      const demiH = camera.position.z * HALF_FOV_TAN;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosT = Math.cos(TILT);
      const sinT = Math.sin(TILT);
      /** Membership of a band [min, max], with a MARGIN fade. */
      const MARGE = 0.09;
      const bande = (v: number, min: number, max: number): number =>
        Math.min(1, Math.max(0, Math.min(v - min, max - v) / MARGE + 0.5));
      for (let i = 0; i < COUNT; i++) {
        const lx = tableau[i * 3]!;
        const ly = tableau[i * 3 + 1]!;
        const lz = tableau[i * 3 + 2]!;
        // Position on screen. Own rotation (Z) then tilt (X);
        // rotation.y is 0, and X does not touch the abscissa axis.
        const rx = cosA * lx - sinA * ly;
        const ry = sinA * lx + cosA * ly;
        const sx = 0.5 + (groupe.position.x + rx) / (2 * demiW);
        const sy = 0.5 - (groupe.position.y + cosT * ry - sinT * lz) / (2 * demiH);
        const b = Math.min(1, Math.max(0, 0.5 + (sx - bord) / 0.2));
        const masque = bande(sx, texteL, texteR) * bande(sy, texteT, texteB);
        const e =
          b * b * (3 - 2 * b) * (1 - efface * masque * (1 - RETRAIT));
        // Warm white of the dark blocks' text (#f3f1ec).
        couleursArr[i * 3] = e * 0.953;
        couleursArr[i * 3 + 1] = e * 0.945;
        couleursArr[i * 3 + 2] = e * 0.925;
      }
      couleurs.needsUpdate = true;

      // The form stays behind the title, vertically centered.
      groupe.position.x = finaleX;
      groupe.position.y = finaleY;

      // Once settled, the donut spins on its own — but AROUND ITS OWN AXIS.
      // It is drawn in the XY plane, so its axis of symmetry is Z: making
      // it rotate around Y presented it edge-on at every
      // half-turn (apparent area dropping to 33%), which made it
      // literally disappear. Around Z the silhouette can no longer close
      // up, and the rotation stays readable: the points are drawn at
      // random, the cloud has no symmetry of revolution.
      // THE ATTITUDE IS FIXED. It was so little fixed before that the donut
      // changed orientation on every visit: the X and Y angles were
      // multiplied by `pose`, so that at the moment the pose engaged
      // they swung from 0 to sin(performance.now() · …) — that is,
      // to a value that depends on how long the page has been
      // open. The donut formed flat then went off at an angle, with no
      // visible reason. No more swaying at all: it forms in the exact
      // attitude it will keep.
      spin.rotation.x = TILT;
      spin.rotation.y = 0;
      // Only the rotation on the donut's axis remains — the silhouette
      // therefore never moves, it is the grain of the cloud that we see turning. The
      // speed rises progressively: no break at the engagement.
      const pose = Math.min(1, Math.max(0, (noir - 0.6) / 0.4));
      angle += dt * 0.18 * pose;
      spin.rotation.z = angle;

      // No guard on document.hidden, neither here nor around the state.
      // This flag is true in contexts where the page is nevertheless fully
      // displayed (embedded panels, previews): using it there switched
      // the donut off completely, and froze the panel — hence the block's background.
      // The browser already slows requestAnimationFrame down by itself when
      // the tab really goes to the background; that is enough, and it is
      // what all the other modules of the site do.
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
