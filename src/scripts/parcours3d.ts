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
import {
  CARROUSEL_DEBUT,
  CARROUSEL_FIN,
  TITRE_DEBUT,
  TITRE_FIN,
  specCourant,
} from "./specform";

/* The steps, expressed in shares of --spec-form. They chain together without
   overlapping those of the CSS (title 0.43 → 0.715; carousel 0.715 →
   0.835): the points are formed and whitened before the title arrives. */
const FORME_FIN = 0.42; // fin de l'arrivée des points

/* Le blanchiment se joue PENDANT le vol, plus après lui.

   Il commençait à 0,42, c'est-à-dire une fois les points posés : ils volaient
   donc en sombre, ce qui les rendait parfaitement visibles tant que le fond
   restait orange. Mais le volet ferme désormais dès l'arrivée du bloc (voir
   --volet-entree dans ui.ts, qui règle la collision avec le texte du profil) :
   des points sombres traversaient un fond déjà noir, donc invisibles. On ne
   voyait le nuage qu'une fois construit ET blanchi — exactement ce qui a été
   signalé.

   Démarré à 0,04, le blanchiment couvre l'essentiel du vol : les points
   s'éclaircissent en chemin et on les voit se poser. */
const NOIR_DEBUT = 0.04;
const NOIR_FIN = 0.26;

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

/** Point count on desktop; phones run at half (see initParcours3D). */
const COUNT_BASE = 2200;
/** Outer radius of the torus (R + r), plus the jitter given to the points. */
const RAYON_EXT = 0.91;
/** Phone: what is left between the ring and the edge of the screen. */
const MARGE_TEL = 16;
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
  /* Sous 720 px, la scène ne se monte pas du tout.

     La mise en page y est empilée : la fiche fait 350 × 530 et se pose à
     188 px du haut, si bien qu'elle recouvre 58 % du canvas — et le nuage
     étant centré, il tombe exactement dessous. Mesuré : on ne voit pas un
     point, à aucun moment de la séquence. On payait donc un contexte WebGL et
     un rendu à chaque image, sur l'appareil qui le supporte le moins bien,
     pour quelque chose d'invisible.

     Le volet sombre ne dépend plus de ce module (ui.ts écrit --volet-entree,
     et le fond prend le maximum des deux) : le bloc garde donc son fond, sa
     transition et son carrousel. Seul le décor disparaît. */
  if (window.matchMedia("(max-width: 720px)").matches) return;

  const section = document.querySelector<HTMLElement>(".section-exp");
  const intro = document.querySelector<HTMLElement>(".spec-intro");
  const sticky = section?.closest<HTMLElement>(".carousel-sticky");
  const rail = sticky?.closest<HTMLElement>(".carousel-rail");
  const item = section?.closest<HTMLElement>(".carousel-item");
  const itemSkills =
    document.querySelector<HTMLElement>(".section-skills")?.closest<HTMLElement>(".carousel-item") ?? null;
  if (!section || !intro || !sticky || !rail || !item) return;

  /* Phone media query, read once and used by every mobile downgrade:
     antialias off, capped pixel ratio, half the points. The MediaQueryList
     re-evaluates itself — a getBoundingClientRect would cost a layout. */
  const etroit = window.matchMedia("(max-width: 720px)");

  let renderer: THREE.WebGLRenderer;
  try {
    /* Antialias off on phone: on iOS Safari it means MSAA x4, which can
       blow the tab's memory budget for a point cloud that does not need it. */
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !etroit.matches });
  } catch {
    return; // WebGL unavailable: the block reads very well without it.
  }
  /* Half the points on phone: the ring spans the whole width there, so the
     density reads the same at half the count, for half the memory and CPU. */
  const COUNT = etroit.matches ? COUNT_BASE / 2 : COUNT_BASE;
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

    /* Cap the drawing-buffer resolution: 2 on desktop, 1.5 on phone — iOS
       Safari's memory watchdog reloads tabs that over-allocate WebGL. */
    const dpr = Math.min(window.devicePixelRatio || 1, etroit.matches ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(vue.width, vue.height);
    camera.aspect = vue.width / vue.height;

    /* Size of the form, which is 2 units across.
       On a wide screen it takes ~62 % of the smaller side — there the smaller
       side is the height, and the donut lives behind the left-hand column
       with the cards beside it.
       On a phone it is measured off the WIDTH instead, so the ring runs from
       one edge to the other with a margin of 16 px. Sized off the smaller
       side, it was 244 px across for a 393 px screen: the ring covered 212 px,
       a little over half the width, lost in the middle of the panel. Going
       through the outer radius rather than the diameter is what puts the
       edge of the ring where it is wanted, and not the edge of the box
       around it. */
    const voulu = etroit.matches
      ? (vue.width - 2 * MARGE_TEL) / RAYON_EXT
      : Math.min(vue.height, vue.width) * 0.62;
    /* The grain of the cloud. Measured on the canvas itself rather than
       guessed: at 0.015 a point came out 1.5 px across on a phone, which is
       what made them hard to make out, and over a ring half as wide again
       the same 2200 points are spread thinner still — what one sees of a
       cloud is as much its density as the size of its grain. 0.023 puts a
       point at about 2.3 px, clearly there without turning into a disc.
       The wide screen keeps its fine grain. */
    matiere.size = etroit.matches ? 0.023 : 0.015;
    camera.position.z = vue.height / (voulu * HALF_FOV_TAN);
    camera.updateProjectionMatrix();

    const mondeParPixel = (2 * camera.position.z * HALF_FOV_TAN) / vue.height;
    // The title's column, vertically centered: the donut stays
    // behind the text, without going down.
    finaleX = (place.left + place.width / 2 - (vue.left + vue.width / 2)) * mondeParPixel;
    // Same logic vertically: on a phone the intro is at the top of the
    // block, the donut moves up behind it instead of staying centered.
    // The donut is deliberately placed LOWER than the title, not centered on
    // it. `ecart` is the offset that would center it — the screen's Y axis
    // points down, the scene's points up, hence this order of terms — and it
    // is deliberately reversed to get the chosen rendering.
    // Do not "fix" this sign: it is deliberate, and on a large screen it
    // changes nothing, the intro already being centered there (the offset is zero).
    const ecart = (vue.top + vue.height / 2 - (place.top + place.height / 2)) * mondeParPixel;
    finaleY = -ecart;
    /* Phone: dead centre of the panel, both ways. The block stacks there —
       title at the top, card below — and the donut has the screen to itself
       for as long as the card has not arrived; it fades out as soon as it
       does (see the loop). Hung off the title, it sat low and off to one
       side of a screen it was alone on. Centred and nearly edge to edge, it
       reads as the composition of that moment. The title, at the very top,
       is well clear of it: the ring is tilted, so it only covers about
       210 px of height around the middle. */
    if (etroit.matches) {
      finaleX = 0;
      finaleY = 0;
    }
    // …but only as far as the frame allows. On a phone the intro sits at the
    // very top of the block, so this offset sends the donut 300 px below the
    // middle of the screen: measured on a 390 x 715 window, a ring of 105 px
    // of radius centred at y = 659, hence cut off by 49 px at the bottom.
    // Clamping keeps the deliberate placement — the donut stays low, under
    // the carousel — while guaranteeing the whole silhouette is in frame.
    // On a wide screen the intro is already centred, this offset is zero and
    // the clamp never bites.
    const demiHauteur = camera.position.z * HALF_FOV_TAN;
    const limite = Math.max(0, demiHauteur - RAYON_EXT - demiHauteur * 0.06);
    finaleY = Math.max(-limite, Math.min(limite, finaleY));
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

  /* Is the layer on screen? hero3d has had this gate for a long time; this
     module never did, so it was rendering a full WebGL pass EVERY FRAME from
     load to unload — through the hero, the terminal, the torn edge, the
     skills, the footer — for a donut that is only ever visible along the
     rail. That is the cost that made the phone crawl, and three rounds of
     shrinking the ink filter never touched it.
     Not document.hidden, which reads true in contexts where the page is
     perfectly visible (embedded panels, previews) and froze the donut for
     good. Being off screen is the honest signal, and the state is derived
     from the scroll position alone, so skipped frames leave nothing behind:
     the first frame back recomputes everything. */
  let enVue = true;
  new IntersectionObserver((entrees) => {
    enVue = entrees[0]?.isIntersecting ?? false;
  }).observe(layer);

  let tPrec = performance.now();
  /** Le canvas a-t-il déjà été vidé depuis que la scène s'est retirée ? */
  let canvasEfface = false;
  /** Last value of `avance` written into the position buffer. */
  let avancePrec = -1;

  const tick = (): void => {
    /* Nothing to draw yet? Then draw nothing. Two cases: the layer is off
       screen, or the sequence has not started — before it, the 2200 points
       all sit in their waiting place off the top right corner, so a frame
       costs a full WebGL pass to show an empty canvas.
       The second case covers the torn edge exactly: the rail begins right
       under the dark zone, so its layer is already intersecting while the
       ink is still rising, and that is where the phone was being asked to
       filter and render at the same time. */
    if (!enVue || specCourant() <= 0) {
      /* La sortie de boucle laissait la DERNIÈRE image rendue collée sur le
         canvas. Tant que --spec-form décroissait avec le scroll, les points
         avaient le temps de repartir hors champ avant d'atteindre zéro, donc
         l'image gelée était vide et personne ne le voyait. Depuis que la
         scène se retire avec la présence du bloc, zéro arrive vite : le vol en
         cours restait figé, et l'on remontait sur le profil avec un nuage de
         points semé en travers du texte orange.

         On MASQUE le canvas, on ne l'efface pas. renderer.clear() le peignait
         en NOIR OPAQUE : le canvas fait toute la fenêtre, si bien que le bloc
         profil entier — fond orange et texte — disparaissait derrière un
         rectangle noir, du début du rail jusqu'à +0,87 écran. Le DOM restait
         pourtant parfaitement correct, ce qui rendait le défaut introuvable
         en lisant les styles : seuls les pixels le montraient.

         visibility ne peint rien du tout et se remet sans coût. */
      if (!canvasEfface) {
        canvas.style.visibility = "hidden";
        canvasEfface = true;
      }
      // Reset the clock: on the way back, dt must not carry the whole time
      // spent off screen.
      tPrec = performance.now();
      requestAnimationFrame(tick);
      return;
    }
    if (canvasEfface) {
      canvas.style.visibility = "";
      canvasEfface = false;
    }
    {
      const t = performance.now();
      const dt = Math.min(0.05, (t - tPrec) / 1000);
      tPrec = t;

      // UNE SEULE horloge pour toute la séquence. Elle vivait ici, recalculée
      // depuis la position du rail ; elle vient maintenant de specform.ts, qui
      // la mène au temps et non au scroll. Recopier la formule était déjà la
      // source d'une divergence à chaque réglage — la lire supprime le risque.
      const spec = specCourant();

      // Has the framing moved since the last computation of the starts? The
      // layout measurements settle after the first render, and a
      // waiting position computed on a provisional framing falls INSIDE the
      // frame instead of off-screen: on the way back, the points settled
      // right in the middle of the page. This catch-up makes the computation
      // self-correcting — it no longer depends on having measured at the right time.
      /* Étape 1 — les points entrent par le haut à droite et se rangent sur le
         tore.

         L'avancement n'est plus linéaire. Les points attendent HORS CADRE
         (sx ≈ 1,10), si bien qu'à progression constante ils passaient environ
         les deux tiers de leur vol en dehors de l'écran : mesuré, rien n'était
         encore visible à 65 % du trajet, et la formation ne s'apercevait que
         sur ses 220 dernières millisecondes. D'où l'impression d'un donut qui
         arrive déjà construit — allonger la durée totale n'y changeait rien,
         la part visible restant la même fraction.

         Cette courbe avale vite la course hors champ, puis freine sur la fin,
         la seule qu'on voit : les points se posent au lieu de surgir. */
      const volBrut = Math.min(1, spec / FORME_FIN);
      const avance = 1 - Math.pow(1 - volBrut, 3);
      if (
        // Only while a point is still in flight. Past that the starts are
        // never read again, and `angle` — which advances on every frame once
        // the donut spins — kept re-triggering this loop of 2200 sines and
        // cosines for the whole time the block was on screen, for a result
        // nothing used.
        avance < 1 &&
        (departsPour.z !== camera.position.z ||
          departsPour.aspect !== camera.aspect ||
          departsPour.x !== finaleX ||
          departsPour.y !== finaleY ||
          departsPour.a !== angle)
      ) {
        poserLesDeparts();
      }

      /* The donut's retreat on a phone. There, the card takes the whole
         panel: the donut has nowhere left to sit beside it, and since the
         block fades in AS A WHOLE — the 3D layer lives in the pinned area,
         under the items — it showed through the card while it arrived and
         crossed its text (measured on a 390 x 715 window: the ring runs
         from 1030 to 1290 px of a card that ends at 641, drawn over the
         last bullet and the poste/mission line).
         So it fades out exactly as the carousel settles, on the SAME
         landmarks as the CSS opacity of .exp-carousel. Nothing is
         memoized: scrolling back up brings the donut back with the rest.
         On a wide screen the cards sit in the right-hand column, the donut
         behind the left-hand one, and nothing is taken away from it. */
      const arrivee = Math.min(
        1,
        Math.max(0, (spec - CARROUSEL_DEBUT) / (CARROUSEL_FIN - CARROUSEL_DEBUT)),
      );
      layer.style.opacity = etroit.matches
        ? (1 - arrivee * arrivee * (3 - 2 * arrivee)).toFixed(3)
        : "1";

      // The flight depends on `avance` alone: once it stops moving, the 2200
      // points are on their target, and rewriting them then handing the
      // buffer back to the GPU changes nothing on screen. The rotation is
      // carried by the group, not by the positions.
      if (avance !== avancePrec) {
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
        avancePrec = avance;
      }

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
