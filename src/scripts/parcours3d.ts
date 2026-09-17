// La forme 3D du bloc parcours : un donut de points, du même soin que le
// globe du hero. La séquence entre le bloc profil et le bloc parcours est
// entièrement pilotée par --spec-form, c'est-à-dire par la POSITION du rail
// — aucune horloge propre à ce module :
// 1. les points noirs entrent PAR LE HAUT À DROITE et se rangent sur le tore
//    (jusqu'à 0,34) ; en remontant, ils y repartent par le même chemin ;
// 2. un volet noir balaie l'écran depuis la droite, et chaque point
//    blanchit au moment précis où l'arête du volet le dépasse ;
// 3. le donut tourne autour de son axe, en continu.
// La trame du bloc, elle, ne s'efface pas ici : elle reste pleine jusqu'à
// la sortie, et c'est le bloc compétences qui efface la sienne (ui.ts).
// Le caractère automatique ne vient donc PAS d'ici : c'est ui.ts qui fait
// défiler la page toute seule sur cette portion, et la douceur vient de sa
// courbe d'accélération. Tout se rejoue à l'envers en remontant, sans état
// à remettre à zéro puisque rien n'est mémorisé.
// Rendu permanent : le calque couvre toute la zone épinglée. Sans WebGL,
// parcours-gl n'est pas posé et le fond CSS reste opaque.
import * as THREE from "three";
import { SPEC_COURSE, SPEC_DEPART, TITRE_DEBUT, TITRE_FIN } from "./specform";

/* Les étapes, exprimées en part de --spec-form. Elles s'enchaînent sans se
   chevaucher avec celles du CSS (titre 0,43 → 0,715 ; carrousel 0,715 →
   0,835) : les points sont formés et blanchis avant que le titre n'arrive. */
const FORME_FIN = 0.42;   // fin de l'arrivée des points (4,2 s)
const NOIR_DEBUT = 0.42;  // le fond bascule pendant l'attente avant le titre
const NOIR_FIN = 0.54;    // fond noir, points blancs

/* Atténuation des points qui tombent DERRIÈRE le titre. Les points montent à
   ~0,95 de blanc, exactement la luminance du texte (#f3f1ec) : intacts, ils
   tiennent la même place visuelle que les lettres et le titre devient
   illisible (contraste 1,1:1).
   0,22 : le texte garde 11,2:1 sur les points, même là où une lettre tombe
   pile sur un point. Les points y descendent à 1,6:1 sur le fond — à peine
   plus qu'une trame, ce qui est voulu : sous le titre, ils ne doivent plus
   qu'accompagner.
   Cette valeur ne coûte plus rien au donut depuis que l'atténuation est
   LOCALE : elle ne touche que les points couverts par le titre, tandis que
   tout le pourtour de l'anneau garde sa pleine présence (15,4:1 sur le fond).
   C'est ce qui permet d'aller si bas — en atténuation globale, 0,32 éteignait
   le donut entier. */
const RETRAIT = 0.22;

/** Inclinaison de lecture du donut, en radians. À plat on verrait un cercle.
    Portée par `spin`, donc elle s'applique aussi aux positions de départ :
    poserLesDeparts() doit la compenser. */
const TILT = 0.95;

const COUNT = 2200;
const FOV = 42;
const HALF_FOV_TAN = Math.tan((FOV * Math.PI) / 180 / 2);

/** Suite pseudo-aléatoire déterministe, comme dans hero3d. */
function graine(i: number, n: number): number {
  const v = Math.sin(i * n) * 43758.5453;
  return v - Math.floor(v);
}

/** Un point sur la surface d'un donut (tore), ramené dans la sphère unité. */
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
    return; // WebGL indisponible : le bloc se lit très bien sans.
  }
  // Le bloc cède son fond au volet ci-dessous, qui balaie l'écran. Sans
  // WebGL la classe n'est pas posée et le CSS garde son fond opaque : le
  // bloc reste noir d'emblée, sans balayage, mais parfaitement lisible.
  item.classList.add("parcours-gl");

  const canvas = renderer.domElement;
  canvas.className = "parcours-canvas";
  const layer = document.createElement("div");
  layer.className = "parcours-canvas-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.appendChild(canvas);
  // Le calque est posé sur la zone épinglée entière : les points sont
  // visibles dès le bloc profil, pas seulement sur le parcours.
  sticky.prepend(layer);

  // Le fond du bloc est un volet noir qui BALAIE depuis la droite, et non
  // plus un plan qui se fond. C'est un simple élément CSS glissé DERRIÈRE le
  // calque 3D : le donut est donc dessiné par-dessus lui. En WebGL il aurait
  // fallu un plan supplémentaire et gérer soi-même son cadrage ; en CSS le
  // volet occupe l'écran par construction, à tout ratio.
  const volet = document.createElement("div");
  volet.className = "parcours-fond";
  volet.setAttribute("aria-hidden", "true");
  sticky.prepend(volet);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = 3;

  // groupe : la position de la forme (centre puis gauche) · spin : rotation.
  const groupe = new THREE.Group();
  const spin = new THREE.Group();
  groupe.add(spin);
  scene.add(groupe);

  const cible = new Float32Array(COUNT * 3);
  const relais = new Float32Array(COUNT * 3);
  const rangement = new Float32Array(COUNT);
  /* Le vol de chaque point : un écart par rapport à la ligne droite, plus une
     ondulation. C'est ce qui fait la nuée — sans eux, 2200 trajectoires
     parfaitement rectilignes et parallèles, donc un mouvement de machine. */
  const ecart = new Float32Array(COUNT * 3);
  const onde = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  const teintes = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const [x, y, z] = surLeTore(i);
    // Un léger jitter donne sa matière à la surface.
    const jx = (graine(i, 9.1) - 0.5) * 0.04;
    const jy = (graine(i, 9.7) - 0.5) * 0.04;
    const jz = (graine(i, 11.3) - 0.5) * 0.04;
    cible[i * 3] = x + jx;
    cible[i * 3 + 1] = y + jy;
    cible[i * 3 + 2] = z + jz;

    // Étalement des départs, large : c'est lui qui donne à l'arrivée sa
    // durée perçue. Resserré, les 2200 points se posent presque ensemble et
    // l'arrivée paraît brutale même si elle dure longtemps.
    rangement[i] = graine(i, 67.9) * 0.8;

    // Direction d'écart : tirée uniformément sur la sphère (d'où l'acos, sans
    // lequel les directions se tasseraient aux pôles). L'amplitude varie
    // beaucoup d'un point à l'autre : certains filent presque droit, d'autres
    // font un large détour. La dérive en profondeur est réduite de moitié —
    // au-delà, les points passent devant la caméra au lieu de contourner.
    const th = graine(i, 73.1) * Math.PI * 2;
    const ph = Math.acos(graine(i, 79.3) * 2 - 1);
    const amp = 0.6 + graine(i, 83.7) * 1.8;
    ecart[i * 3] = Math.sin(ph) * Math.cos(th) * amp;
    ecart[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * amp;
    ecart[i * 3 + 2] = Math.cos(ph) * amp * 0.5;
    onde[i] = 3 + graine(i, 89.1) * 5; // nombre de serpentements sur le trajet
    phase[i] = graine(i, 97.3) * Math.PI * 2;

    // Les points sont noirs : le nuage se lit comme les points du site
    // pendant sa traversée du bloc profil orange.
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
  // Le nuage est déplacé point par point depuis le script, donc la sphère
  // englobante que three.js calcule UNE SEULE FOIS — à la création, alors que
  // les points attendent hors champ en haut à droite — ne correspond plus à
  // rien ensuite. Elle restait jugée hors du champ de la caméra et l'objet
  // était écarté à chaque image : le rendu tournait (1120 images) sans un
  // seul appel de dessin. On désactive donc ce test, plutôt que de recalculer
  // la sphère à chaque image pour 2200 points qui tiennent de toute façon
  // tous à l'écran.
  nuage.frustumCulled = false;
  spin.add(nuage);

  // La forme est posée à sa place dès le départ : la colonne du titre,
  // sous le texte. Pas de glissement.
  let finaleX = 0;
  let finaleY = 0;
  /* Emprise du titre à l'écran, en fractions (0 = bord gauche/haut). C'est
     là — et seulement là — que le nuage doit s'effacer. */
  let texteL = 0;
  let texteR = 0;
  let texteT = 0;
  let texteB = 0;

  /** Rotation propre du donut, accumulée. Déclarée ICI, avant
      poserLesDeparts() qui la lit : plus bas, l'appel d'initialisation la
      touchait dans sa zone morte et le module entier échouait à démarrer. */
  let angle = 0;

  /** Cadrage utilisé au dernier calcul des départs, pour savoir quand le
      refaire. */
  let departsPour = { z: 0, aspect: 0, x: 0, y: 0, a: 0 };

  /** Place le nuage d'attente HORS CHAMP EN HAUT À DROITE. Les bornes sont
      déduites du champ réel de la caméra et du décalage du groupe, jamais
      devinées : en dur, elles seraient déjà dans l'image sur un écran large,
      et on verrait les points apparaître au milieu de rien.
      Appelée à chaque redimensionnement — comme rien n'est mémorisé, revenir
      en arrière renvoie les points exactement d'où ils sont venus. */
  const poserLesDeparts = (): void => {
    const demiW = camera.position.z * HALF_FOV_TAN * camera.aspect;
    const demiH = camera.position.z * HALF_FOV_TAN;
    // Le bord droit visible se trouve à demiW - groupe.position.x, puisque le
    // groupe est décalé vers la gauche.
    const xMin = demiW - finaleX + 0.4;
    // Le bord haut visible se déduit du décalage vertical du groupe :
    // sans lui, un donut remonté laissait ses points d'attente en plein
    // cadre.
    const yMin = demiH - finaleY + 0.4;
    // Les points vivent dans `spin`, qui porte l'inclinaison fixe de lecture.
    // Écrire directement le décalage voulu dans ce repère ne marche pas : la
    // rotation l'écrase. Mesuré, des points censés démarrer au-dessus du bord
    // haut (1,43) se retrouvaient à 0,16 — c'est-à-dire en plein cadre.
    // On vise donc une position MONDE et on applique la rotation INVERSE.
    // `spin` applique Rx(TILT) puis Rz(angle) — dans cet ordre, Euler XYZ de
    // three.js donnant monde = Rx · Rz · local. Pour obtenir une position
    // MONDE voulue, il faut donc défaire les deux : d'abord Rx, puis Rz.
    // Ne défaire que l'inclinaison ne suffisait pas : `angle` s'accumule
    // pendant que le donut tourne, si bien qu'au retour en arrière le nuage
    // d'attente se retrouvait pivoté d'autant et traversait la page. Le
    // « parfois » venait de là — la position dépendait du temps passé sur le
    // bloc 2.
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
      // puis Rz(-angle)
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

    // La forme (diamètre 2) occupe ~70 % du plus petit côté de l'écran :
    // sur téléphone elle rapetisse avec la fenêtre, sur bureau elle garde
    // son échelle actuelle (le plus petit côté y est la hauteur).
    const voulu = Math.min(vue.height, vue.width) * 0.7;
    camera.position.z = vue.height / (voulu * HALF_FOV_TAN);
    camera.updateProjectionMatrix();

    const mondeParPixel = (2 * camera.position.z * HALF_FOV_TAN) / vue.height;
    // La colonne du titre, verticalement centrée : le donut reste
    // derrière le texte, sans descendre.
    finaleX = (place.left + place.width / 2 - (vue.left + vue.width / 2)) * mondeParPixel;
    // Même logique verticalement : sur téléphone l'intro est en haut du
    // bloc, le donut monte derrière elle au lieu de rester au centre.
    finaleY = (place.top + place.height / 2 - (vue.top + vue.height / 2)) * mondeParPixel;
    texteL = (place.left - vue.left) / vue.width;
    texteR = (place.right - vue.left) / vue.width;
    texteT = (place.top - vue.top) / vue.height;
    texteB = (place.bottom - vue.top) / vue.height;

    // Le cadrage vient de changer : les départs hors champ aussi.
    groupe.position.x = finaleX;
    poserLesDeparts();
  };
  resize();
  const observateur = new ResizeObserver(resize);
  observateur.observe(sticky);
  // Le titre aussi : c'est SA largeur qui fixe le cadrage, et elle change
  // quand la police d'affichage finit de charger. La zone épinglée, elle,
  // fait toujours 100vh — l'observer seule ne voyait donc jamais rien.
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

      // UNE SEULE horloge pour toute la séquence : la position du rail, lue
      // avec la formule de specform.ts. Les deux rampes en temps réel qui
      // pilotaient l'arrivée et la pose ont été supprimées — elles avançaient
      // à leur propre rythme pendant que le titre et les fondus de blocs
      // suivaient le défilement, et le max() de ces courbes cassait de pente
      // là où elles se croisaient : c'était ça, le saut. La douceur ne vient
      // plus d'un lissage local mais du défilement lui-même, que ui.ts anime
      // avec une courbe adoucie aux deux bouts.
      const spec = Math.min(
        1,
        Math.max(0, (-railTop - vh * SPEC_DEPART) / (vh * SPEC_COURSE)),
      );

      // Le cadrage a-t-il bougé depuis le dernier calcul des départs ? Les
      // mesures de mise en page se stabilisent après le premier rendu, et une
      // position d'attente calculée sur un cadrage provisoire tombe DANS le
      // cadre au lieu d'être hors champ : au retour en arrière, les points se
      // reposaient en plein milieu de la page. Ce rattrapage rend le calcul
      // auto-correcteur — il ne dépend plus d'avoir mesuré au bon moment.
      if (
        departsPour.z !== camera.position.z ||
        departsPour.aspect !== camera.aspect ||
        departsPour.x !== finaleX ||
        departsPour.y !== finaleY ||
        departsPour.a !== angle
      ) {
        poserLesDeparts();
      }

      // Étape 1 — les points entrent par la gauche et se rangent sur le tore.
      const avance = Math.min(1, spec / FORME_FIN);
      for (let i = 0; i < COUNT; i++) {
        // Les coefficients suivent l'étalement : avec un retard pouvant aller
        // jusqu'à 0,8, il faut 2,0 et 1,2 pour que même le dernier point
        // atteigne exactement sa place à la fin de l'étape.
        const b = Math.min(1, Math.max(0, (avance * 2 - rangement[i]!) / 1.2));
        const forme = b * b * (3 - 2 * b);
        // Trajectoire courbe et serpentante plutôt que rectiligne. La cloche
        // s'annule aux deux bouts : le point part exactement de sa place
        // d'attente et se pose exactement sur la sienne, l'écart ne vit qu'en
        // vol. L'ondulation est indexée sur l'AVANCEMENT et non sur le temps,
        // donc le vol est identique à l'aller et au retour, et rien ne dépend
        // de la vitesse à laquelle on fait défiler.
        const cloche = Math.sin(Math.PI * forme);
        const derive = cloche * (0.6 + 0.4 * Math.sin(forme * onde[i]! + phase[i]!));
        for (let axe = 0; axe < 3; axe++) {
          const k = i * 3 + axe;
          tableau[k] =
            relais[k]! + (cible[k]! - relais[k]!) * forme + ecart[k]! * derive;
        }
      }
      position.needsUpdate = true;

      // Étape 2 — le fond bascule au noir, les points blanchissent.
      const brut = Math.min(
        1,
        Math.max(0, (spec - NOIR_DEBUT) / (NOIR_FIN - NOIR_DEBUT)),
      );
      const noir = brut * brut * (3 - 2 * brut);

      // Le fond ne retombe qu'une fois les deux blocs sombres partis, sinon
      // l'orange percerait entre le parcours et les compétences : pendant
      // cette bascule, la somme de leurs deux opacités creuse jusqu'à 0,48
      // (mesuré). D'où la saturation — 2,3 couvre ce creux avec un peu de
      // marge. Elle était à 3, ce qui noircissait le fond nettement trop tôt.
      // C'est un produit et non un max : deux courbes douces qui se
      // multiplient restent douces, là où un max change de branche et casse.
      // La MONTÉE du volet ne dépend que de la mise en scène, donc de la
      // position de défilement : instantanée, sans mémoire, impossible à
      // désaccorder du reste. Elle dépendait de --item-op, qui vient d'un
      // lissage image par image ; dès que ce lissage traînait, le volet
      // restait hors champ et le fond orange reparaissait sur le bloc.
      // --item-op ne sert plus qu'à la DESCENTE : lui seul sait quand les
      // blocs sombres ont cédé la place au bloc projets, et un retard y est
      // sans conséquence puisque rien d'autre n'en dépend à ce moment-là.
      const itemOp = Number(item.style.getPropertyValue("--item-op") || "0");
      const skillsOp = Number(itemSkills?.style.getPropertyValue("--item-op") || "0");
      const relache = spec < 1 ? 1 : Math.min(1, (itemOp + skillsOp) * 2.3);
      // Part de l'écran recouverte par le volet, comptée depuis la droite.
      const couverture = noir * relache;
      volet.style.setProperty("--fond-bloc2", couverture.toFixed(4));

      // Chaque point blanchit QUAND L'ARÊTE DU VOLET LE DÉPASSE, pas selon un
      // horaire commun. Avec un volet, un blanchiment global redonnerait le
      // défaut déjà corrigé : des points blancs sur la partie encore orange,
      // à gauche de l'arête. Ici le noir et le blanc arrivent ensemble, point
      // par point — c'est le balayage lui-même qui fait l'échelonnement, d'où
      // l'abandon de `rangement` pour cette étape.
      // Position d'un point à l'écran : rotation.y vaut 0 et rotation.x ne
      // touche pas à l'axe X, seule la rotation propre du donut (Z) compte.
      // Le retrait du nuage sous le titre. CALCULÉ AVANT la boucle de
      // couleurs, qui l'utilise : déclaré après, il levait un
      // ReferenceError à chaque image, et comme requestAnimationFrame est
      // rappelé en fin de tick, la boucle mourait dès la première — plus
      // de volet, plus de donut, le fond orange reparaissait.
      // Le nuage s'efface à mesure que le titre s'installe au-dessus de lui.
      // Piloté par `spec`, comme tout le reste : la même horloge unique, donc
      // le retrait est exactement synchrone avec l'apparition des lettres.
      const brutRetrait = Math.min(
        1,
        Math.max(0, (spec - TITRE_DEBUT) / (TITRE_FIN - TITRE_DEBUT)),
      );
      // Le retrait ne peut jamais dépasser la couverture du volet : sinon les
      // deux se désaccordent (le retrait suit `spec`, instantané ; la
      // couverture suit --item-op, qui traîne) et les points se retrouvent à
      // la fois encore noirs et déjà atténués — invisibles.
      const efface =
        Math.min(couverture, brutRetrait * brutRetrait * (3 - 2 * brutRetrait));
      // L'atténuation est LOCALE, pas globale. Baisser l'opacité de tout le
      // nuage rendait le titre lisible mais éteignait le donut : à 0,32 son
      // contraste avec le fond noir tombe à 2,16:1. Seuls les points qui
      // tombent derrière le titre s'effacent maintenant ; le reste de
      // l'anneau garde toute sa présence.
      matiere.opacity = 1;

      const demiW = camera.position.z * HALF_FOV_TAN * camera.aspect;
      // Arête du volet, en fraction d'écran. Sa course déborde largement des
      // deux côtés (1,5 → −0,15), pour deux raisons mesurées. À droite : au
      // repos les points attendent hors champ vers sx ≈ 1,10, donc une arête
      // partant de 1,125 les prenait déjà dans son dégradé et ils étaient
      // gris au lieu de noirs pendant la traversée de l'orange. À gauche :
      // le dégradé fait 0,2 de large, donc une arête s'arrêtant à 0 laissait
      // les points d'extrême gauche plafonner à 59 % de blanc.
      const bord = 1.5 - couverture * 1.65;
      const demiH = camera.position.z * HALF_FOV_TAN;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosT = Math.cos(TILT);
      const sinT = Math.sin(TILT);
      /** Appartenance à une bande [min, max], avec un fondu de MARGE. */
      const MARGE = 0.09;
      const bande = (v: number, min: number, max: number): number =>
        Math.min(1, Math.max(0, Math.min(v - min, max - v) / MARGE + 0.5));
      for (let i = 0; i < COUNT; i++) {
        const lx = tableau[i * 3]!;
        const ly = tableau[i * 3 + 1]!;
        const lz = tableau[i * 3 + 2]!;
        // Position à l'écran. Rotation propre (Z) puis inclinaison (X) ;
        // rotation.y vaut 0, et X ne touche pas à l'axe des abscisses.
        const rx = cosA * lx - sinA * ly;
        const ry = sinA * lx + cosA * ly;
        const sx = 0.5 + (groupe.position.x + rx) / (2 * demiW);
        const sy = 0.5 - (groupe.position.y + cosT * ry - sinT * lz) / (2 * demiH);
        const b = Math.min(1, Math.max(0, 0.5 + (sx - bord) / 0.2));
        const masque = bande(sx, texteL, texteR) * bande(sy, texteT, texteB);
        const e =
          b * b * (3 - 2 * b) * (1 - efface * masque * (1 - RETRAIT));
        // Blanc chaud du texte des blocs sombres (#f3f1ec).
        couleursArr[i * 3] = e * 0.953;
        couleursArr[i * 3 + 1] = e * 0.945;
        couleursArr[i * 3 + 2] = e * 0.925;
      }
      couleurs.needsUpdate = true;

      // La forme reste derrière le titre, centrée verticalement.
      groupe.position.x = finaleX;
      groupe.position.y = finaleY;

      // Une fois posé, le donut tourne seul — mais AUTOUR DE SON PROPRE AXE.
      // Il est dessiné dans le plan XY, son axe de symétrie est donc Z : le
      // faire tourner autour de Y le présentait par la tranche à chaque
      // demi-tour (aire apparente tombant à 33 %), ce qui le faisait
      // littéralement disparaître. Autour de Z la silhouette ne peut plus se
      // refermer, et la rotation reste lisible : les points sont tirés au
      // hasard, le nuage n'a aucune symétrie de révolution.
      // L'ASSIETTE EST FIXE. Elle l'était si peu auparavant que le donut
      // changeait d'orientation à chaque visite : les angles X et Y étaient
      // multipliés par `pose`, si bien qu'au moment où la pose s'enclenchait
      // ils basculaient de 0 vers sin(performance.now() · …) — c'est-à-dire
      // vers une valeur qui dépend de depuis combien de temps la page est
      // ouverte. Le donut se formait à plat puis partait en biais, sans
      // raison visible. Plus aucun balancement : il se forme dans l'assiette
      // exacte qu'il gardera.
      spin.rotation.x = TILT;
      spin.rotation.y = 0;
      // Seule la rotation sur l'axe du donut demeure — la silhouette ne
      // bouge donc jamais, c'est le grain du nuage qu'on voit tourner. La
      // vitesse monte progressivement : aucune rupture à l'enclenchement.
      const pose = Math.min(1, Math.max(0, (noir - 0.6) / 0.4));
      angle += dt * 0.18 * pose;
      spin.rotation.z = angle;

      // Aucun garde-fou sur document.hidden, ni ici ni autour de l'état.
      // Ce drapeau est vrai dans des contextes où la page est pourtant bien
      // affichée (panneaux intégrés, aperçus) : s'en servir y éteignait
      // complètement le donut, et gelait le volet — donc le fond du bloc.
      // Le navigateur ralentit déjà requestAnimationFrame de lui-même quand
      // l'onglet passe réellement en arrière-plan ; c'est suffisant, et c'est
      // ce que font tous les autres modules du site.
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
