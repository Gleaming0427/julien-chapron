// 3D scene of the hero: particle globe. The points follow a
// latitude/longitude grid with a constant step; those that fall on emerged land
// are bigger and brighter, the others form the dust of the oceans.
// Great-circle arcs light up from Toulouse.
// Loaded on demand (never if reduced motion), paused off screen.
import * as THREE from "three";

const DEG = Math.PI / 180;
const LAT_STEP = 1.35;

/* ---------- land outlines, in [latitude, longitude] ----------
   Deliberately coarse: at the size where the globe displays,
   only the silhouette of the masses matters. */

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

/** Ray casting in equirectangular projection. */
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
  if (lat < -63) return true; // Antarctica
  return LANDMASSES.some((outline) => inside(lat, lon, outline));
}

/** Direction of a latitude/longitude point, in degrees. */
function fromLatLon(lat: number, lon: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  );
}

/** Regular grid: the number of points per row follows the cosine of the
    latitude, otherwise they pile up at the poles. */
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

/** Assembly duration: each point takes this time to reach its place,
    and the starts are staggered over STAGGER. */
const FLY_IN = 1.5;
const STAGGER = 0.8;

/* ---------- la statue ----------

   Silhouette de la Vénus de Milo, dessinée à la main en coordonnées
   normalisées : hauteur 2 comme le diamètre du globe, largeur d'une statue.

   Elle est DESSINÉE et non scannée. Un vrai relevé 3D aurait posé une
   question de licence et pesé plusieurs méga-octets pour une scène qui dure
   trois secondes. Ce qu'il faut ici, c'est que la forme se reconnaisse d'un
   coup d'œil en points : la tête inclinée, les épaules larges, les DEUX bras
   brisés à des hauteurs différentes — c'est ce détail-là qui la nomme — la
   taille creusée, puis le drapé qui s'évase jusqu'au socle.

   Parcourue dans le sens horaire depuis le sommet du crâne. */
const VENUS: [number, number][] = [
  [0.02, 1.0], [0.1, 0.96], [0.13, 0.88], [0.12, 0.8], [0.08, 0.75],
  [0.05, 0.72], [0.07, 0.68],
  // épaule droite, puis le bras brisé haut
  [0.2, 0.64], [0.3, 0.58], [0.34, 0.5], [0.3, 0.44], [0.26, 0.4],
  // flanc droit et taille
  [0.24, 0.3], [0.22, 0.18], [0.24, 0.08],
  // hanche et drapé
  [0.3, 0.0], [0.34, -0.12], [0.32, -0.3], [0.34, -0.5], [0.36, -0.7],
  [0.38, -0.88], [0.36, -1.0],
  // socle
  [-0.34, -1.0],
  // remontée du drapé à gauche
  [-0.32, -0.86], [-0.3, -0.66], [-0.28, -0.46], [-0.26, -0.26],
  [-0.28, -0.08], [-0.26, 0.06], [-0.24, 0.18], [-0.26, 0.3],
  // bras gauche brisé plus bas et plus large
  [-0.3, 0.4], [-0.34, 0.46], [-0.36, 0.54], [-0.3, 0.6],
  // épaule gauche, cou, tête
  [-0.18, 0.66], [-0.08, 0.7], [-0.06, 0.74], [-0.09, 0.8],
  [-0.1, 0.88], [-0.06, 0.96],
];

/* ---------- le portrait ----------

   Plutôt qu'une silhouette dessinée, on échantillonne la PHOTO : les points
   se sèment là où l'image est claire, avec une densité proportionnelle à la
   luminance. Le résultat est donc le vrai visage, pas une approximation — et
   il se lit comme une taille-douce, ce qui va bien avec le propos.

   Si le chargement échoue, la silhouette de la Vénus ci-dessus reste en
   secours : l'ouverture ne doit jamais rester sans forme. */
async function echantillonnerPortrait(
  url: string,
  /** Écart voulu entre deux points voisins, en unités de scène. C'est lui qui
      commande le nombre de places, et non l'inverse : un nombre fixe donne une
      densité juste à une seule largeur d'écran et fausse à toutes les autres. */
  ecart: number,
): Promise<Float32Array | null> {
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    /* Résolution de travail = celle de la PHOTO, 160 px. Elle était lue sur
       une toile de 240 : un agrandissement, qui n'invente aucun détail et
       coûte deux fois plus de pixels à parcourir. */
    const n = Math.max(32, Math.min(image.naturalWidth, image.naturalHeight));
    const toile = document.createElement("canvas");
    toile.width = n;
    toile.height = n;
    const ctx = toile.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, n, n);
    const pixels = ctx.getImageData(0, 0, n, n).data;

    /* ---------- 1. masque et luminance ----------
       Un passage sur toute l'image plutôt qu'un tirage au hasard répété. Le
       tirage aléatoire laissait des paquets et des trous : la couverture
       n'était pas régulière, et c'est ce qui brouillait les traits. */
    const lum = new Float32Array(n * n);
    let mini = 1;
    let maxi = 0;
    let sujet = 0;
    for (let i = 0; i < n * n; i++) {
      const k = i * 4;
      const r = pixels[k]!;
      const v = pixels[k + 1]!;
      const bl = pixels[k + 2]!;
      // Le fond est un vert très saturé : il domine nettement les deux autres
      // canaux, ce qui suffit à l'écarter sans toucher au sujet.
      if (v > r * 1.25 && v > bl * 1.25) {
        lum[i] = -1;
        continue;
      }
      const l = (0.2126 * r + 0.7152 * v + 0.0722 * bl) / 255;
      lum[i] = l;
      if (l < mini) mini = l;
      if (l > maxi) maxi = l;
      sujet++;
    }
    if (sujet < n * n * 0.05) return null;

    /* ---------- 2. la trame, au pas du globe ----------
       LE VISAGE EST FAIT COMME LE GLOBE, et c'est tout le principe.

       Le globe est une grille régulière : un pas constant en latitude et en
       longitude, et AUCUN point supprimé. Chaque nœud est dessiné — blanc s'il
       tombe sur une terre, gris fin s'il tombe sur une mer. Ce n'est donc pas
       la densité qui dessine les continents, c'est la CLASSIFICATION. C'est ce
       qui leur donne des bords francs et cet aspect posé.

       Le portrait suit exactement la même règle, et au même pas : un nœud tous
       les LAT_STEP radians, comme sur la sphère, si bien que les deux formes
       ont littéralement le même grain. Les zones claires du visage prennent le
       blanc épais, les sombres le gris fin, et rien n'est retiré.

       Deux essais ont échoué avant d'arriver là, et pour la même raison de
       fond : ils ENLEVAIENT des points. Le semis pondéré par la luminance
       faisait des paquets et des trous ; la trame à coupe partielle laissait un
       champ de points épars sur le blouson, que l'œil lit comme du bruit. Le
       globe ne retire jamais rien — c'est précisément pour ça qu'il est net.

       Le réseau est HEXAGONAL : sur une trame carrée un point a quatre voisins
       à `pas` et quatre autres à `pas × 1,41`, donc deux écarts. Sur
       l'hexagonal les six voisins sont tous à `pas` exactement. */
    const ETENDUE = Math.max(0.001, maxi - mini);
    const pas = Math.max(1, (ecart / ECHELLE_PORTRAIT) * n);
    const hauteurRangee = pas * 0.86603;
    /* Le ton d'un nœud est la MOYENNE de sa cellule, et non la valeur du seul
       pixel sous lui. Lu au pixel, un nœud tombant sur une monture de lunettes
       sortait noir pendant que son voisin, à deux pixels de là, sortait clair :
       de l'aliasing pur. Moyenner sur la cellule, c'est réduire l'image à la
       résolution de la trame — la seule façon correcte de la sous-échantillonner. */
    const demiCellule = Math.max(1, Math.round(pas / 2));

    const places: { x: number; y: number; l: number; r: number; c: number }[] = [];
    for (let r = 0; ; r++) {
      const py = (r + 0.5) * hauteurRangee;
      if (py >= n) break;
      // Une rangée sur deux décalée d'un demi-pas : c'est ce qui fait l'hexagone.
      for (let px = (r % 2) * pas * 0.5 + pas * 0.5; px < n; px += pas) {
        let somme = 0;
        let vus = 0;
        let fond = 0;
        for (let dy = -demiCellule; dy <= demiCellule; dy++) {
          const yy = (py + dy) | 0;
          if (yy < 0 || yy >= n) continue;
          for (let dx = -demiCellule; dx <= demiCellule; dx++) {
            const xx = (px + dx) | 0;
            if (xx < 0 || xx >= n) continue;
            const v = lum[yy * n + xx]!;
            if (v < 0) fond++;
            else {
              somme += v;
              vus++;
            }
          }
        }
        // Un nœud dont la cellule est majoritairement du fond n'est pas sur le
        // sujet : sans ce test, la silhouette se frangeait d'une bordure floue.
        if (vus === 0 || fond > vus) continue;
        places.push({
          x: (px / n - 0.5) * ECHELLE_PORTRAIT,
          y: (0.5 - py / n) * ECHELLE_PORTRAIT,
          l: (somme / vus - mini) / ETENDUE,
          // Rang du nœud dans la trame : c'est lui qui indexe la matrice de
          // Bayer, donc ce qui rend le tramage ORDONNÉ plutôt qu'aléatoire.
          r,
          c: Math.round((px - (r % 2) * pas * 0.5 - pas * 0.5) / pas),
        });
      }
    }
    if (places.length < 200) return null;

    /* ---------- 3. tri par luminance : ce qui dessine ----------
       Les nuages ont des tailles et des couleurs différentes — terres en blanc
       épais, mers en gris fin. Rangés du plus clair au plus sombre, les nœuds
       les plus lumineux reviennent au nuage blanc et les autres au gris. Le
       partage se fait donc au rang, exactement dans la proportion terres/mers
       du globe : environ trois nœuds sur dix passent en blanc, ce qui tombe
       juste pour un visage éclairé de face.

       Le tri est TRAMÉ, et c'est indispensable. Trié sur la seule luminance, le
       partage est un seuil net : le front, uniformément la zone la plus
       éclairée, passait en blanc à 100 % et se figeait en pavé plein, comme une
       casquette. En secouant la clé de tri, quelques gris se mêlent aux hautes
       lumières et quelques blancs aux demi-teintes : la frontière devient un
       dégradé, ce qu'on attend d'une image en points.

       C'est ici, et nulle part ailleurs, que se joue le modelé du visage — d'où
       une amplitude mesurée. Trop forte, un nœud sur deux change de valeur sans
       rapport avec l'image et le visage part en confettis.

       Descendue de 0,30 à 0,17 pour les YEUX. Le désordre n'a aucun effet sur
       une large plage de même ton — une joue reste une joue — mais il efface ce
       qui ne fait que quelques nœuds : à 0,30, la moitié des nœuds d'un œil
       basculaient en blanc et l'œil disparaissait dans la peau. Un dégradé plus
       raide est le prix à payer, et il se paie sur les zones lisses, là où il
       ne se voit pas. */
    const AMPLITUDE_TRAME = 0.17;
    /* TRAMAGE ORDONNÉ, et non plus aléatoire. C'est ce qui corrige les ombres
       déchirées du portrait — les lunettes, la bouche, le creux du menton, qui
       sortaient en bandes horizontales hachées sur l'écran d'un téléphone.

       La cause : la clé de tri était secouée par un tirage au sort. Sur une
       trame dont les rangées sont horizontales, ces bascules au hasard
       s'alignent en stries — le hasard fait des paquets, et ici les paquets
       suivent les rangées. Sur un aplat on ne voit rien ; sur le bord d'une
       ombre, on voit le déchirement.

       La matrice de Bayer remplace le hasard par un motif : le décalage d'un
       nœud ne dépend que de sa position dans la trame, et les seize valeurs
       sont disposées de sorte que deux nœuds voisins en reçoivent d'éloignées.
       La frontière se résout alors en un damier fin au lieu de bandes. C'est le
       tramage des graveurs, fait pour exactement ce cas : rendre un dégradé
       avec deux encres, sans bruit. */
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const trame = (q: { r: number; c: number }): number =>
      (BAYER[(((q.r % 4) + 4) % 4) * 4 + (((q.c % 4) + 4) % 4)]! + 0.5) / 16 - 0.5;
    places.sort((a, b) => b.l + trame(b) * AMPLITUDE_TRAME - (a.l + trame(a) * AMPLITUDE_TRAME));

    const sorties = new Float32Array(places.length * 2);
    for (let i = 0; i < places.length; i++) {
      sorties[i * 2] = places[i]!.x;
      sorties[i * 2 + 1] = places[i]!.y;
    }
    return sorties;
  } catch {
    return null;
  }
}

/** Largeur du portrait en unités de scène. À 2, il tient exactement la place
    du globe qui lui succède — la forme change, l'encombrement non. C'est aussi
    ce qui lui donne le plus de définition : la trame gardant un écart constant
    À L'ÉCRAN, doubler la taille quadruple le nombre de points, donc le détail. */
const ECHELLE_PORTRAIT = 2.0;

/** Le point est-il dans la silhouette ? Lancer de rayon horizontal. */
function dansVenus(x: number, y: number): boolean {
  let dedans = false;
  for (let i = 0, j = VENUS.length - 1; i < VENUS.length; j = i++) {
    const [xi, yi] = VENUS[i]!;
    const [xj, yj] = VENUS[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

/* ---------- puis la taille ----------

   Onze ans de taille de pierre sur monuments historiques avant la
   reconversion : c'est ce que raconte l'ouverture. Les points ne forment plus
   directement le globe — ils dressent d'abord une STATUE, qui tient en place,
   puis se défait en sphère.

   Le globe est donc littéralement fait de la même matière que la statue : les
   mêmes points, déplacés. Onze ans de pierre qui deviennent sept ans de
   code. */

/** Temps pendant lequel la statue tient, une fois dressée. The face is the
    point of the opening: it is given the time to be looked at. */
const TENUE_BLOC = 3.5;
/** Durée de la taille : le bloc devient sphère. */
const TAILLE = 1.9;
/** Instant où le globe est entièrement dégagé. */
const FORME_FAITE = FLY_IN + STAGGER + TENUE_BLOC + TAILLE;

export interface Cloud {
  points: THREE.Points;
  start: Float32Array;
  /** Position sur le bloc de départ. */
  bloc: Float32Array;
  target: Float32Array;
  delay: Float32Array;
}

/** Cloud of points that arrives from very far away, each point sets off along
    its own direction, well beyond the frame, and converges towards the sphere. */
export function pointCloud(
  positions: THREE.Vector3[],
  color: number,
  size: number,
  opacity: number,
  /** Décale les tirages de la statue : deux nuages de même graine
      rempliraient exactement les mêmes places. */
  graine: number,
  /** LA TRANCHE de places tirées de la photo qui revient à ce nuage — pas le
      vivier entier : chacun reçoit la sienne, si bien qu'ils ne peuvent plus se
      superposer. Elle est plus COURTE que le nuage, et c'est voulu : les points
      qu'elle ne couvre pas restent hors champ pendant que le portrait tient.
      Vaut null si la photo n'a pas pu être lue. */
  portrait: Float32Array | null,
  /** Ce que la caméra montre, en unités de scène, au moment de l'ouverture.
      C'est ce qui dit à quelle hauteur lâcher les points et à quelle distance
      garer ceux qui attendent : en dur, les deux étaient justes sur un écran
      et faux sur tous les autres. */
  cadrage: { demiHauteur: number; rayon: number },
): Cloud {
  const count = positions.length;
  const target = new Float32Array(count * 3);
  const bloc = new Float32Array(count * 3);
  const start = new Float32Array(count * 3);
  const delay = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = positions[i]!;
    target[i * 3] = p.x;
    target[i * 3 + 1] = p.y;
    target[i * 3 + 2] = p.z;

    // Deterministic pseudo-random sequence: same arrival on every visit.
    const noise = (n: number): number => {
      const v = Math.sin(i * n) * 43758.5453;
      return v - Math.floor(v);
    };

    let vx = 0;
    let vy = 0;
    let profondeur = 0;
    /* Le point tombe-t-il sur le portrait, ou attend-il son tour ? */
    let aSaPlace = true;

    if (portrait && i * 2 < portrait.length) {
      // Une place de la tranche par point, dans l'ordre, sans réemploi.
      vx = portrait[i * 2]!;
      vy = portrait[i * 2 + 1]!;
      /* ÉPAISSEUR NULLE : le portrait est rigoureusement plat.

         Il en portait une, faible et purement aléatoire, pour ne pas paraître
         découpé dans du papier. Elle avait un coût invisible mais décisif : en
         projection perspective, la profondeur d'un point déplace sa position À
         L'ÉCRAN. Chiffré sur le bureau, où la caméra est à trois unités, un
         écart de ±0,07 décale un point du bord de ±3,9 px pour une trame qui
         en compte 4,7 — presque une case entière. La grille était régulière
         dans la scène et brouillée à l'affichage.

         Et cette épaisseur ne montre plus rien : la forme est figée et ne
         tourne pas, or un volume ne se lit que s'il tourne. On la retire, et la
         trame devient exacte là où on la regarde. */
      profondeur = SANS_GLOBE ? 0 : (noise(graine + 7.9) - 0.5) * 0.14;
    } else if (portrait) {
      /* Pas de place dans le portrait : le point attend en haut, hors champ,
         au-dessus de la place qu'il occupera sur le globe. Son bloc sera son
         point de départ, donc la première phase ne le déplace pas d'un pixel ;
         il ne tombe qu'avec la taille, et rejoint la sphère avec les autres.
         C'est ce qui allège le portrait sans rien retirer au globe. */
      aSaPlace = false;
      vx = p.x;
      vy = p.y;
      profondeur = p.z;
    } else {
      /* Secours : la silhouette dessinée, si la photo n'a pas pu être lue.
         Tirage au sort dans le rectangle englobant, rejeté tant qu'il tombe
         hors de la silhouette. Déterministe, donc la statue est la même à
         chaque visite — et indexé sur `graine`, pour que les deux nuages la
         remplissent SANS se superposer : à graine identique ils auraient
         produit la même suite, et les points se seraient empilés deux par deux
         au lieu de couvrir la surface. */
      for (let essai = 0; essai < 24; essai++) {
        vx = (noise(graine + essai * 3.71) - 0.5) * 0.8;
        vy = (noise(graine + 11.3 + essai * 5.17) - 0.5) * 2.05;
        if (dansVenus(vx, vy)) break;
      }
      const creux = Math.max(0, 1 - (vx / 0.38) ** 2);
      profondeur = Math.sqrt(creux) * 0.3 * (noise(graine + 7.9) - 0.5) * 2;
    }

    bloc[i * 3] = vx;
    bloc[i * 3 + 1] = vy;
    bloc[i * 3 + 2] = profondeur;

    /* D'OÙ le point arrive. Les deux populations n'arrivent PAS de la même
       façon, et c'est délibéré : seul le portrait tombe du ciel. */
    if (aSaPlace) {
      /* LA PLUIE, pour les points du portrait. Le point garde son abscisse et
         sa profondeur et ne se voit ajouter que de la hauteur : il tombe donc
         tout droit sur sa propre place, et le visage se compose colonne par
         colonne comme une pluie qui se fige.

         La chute se mesure sur l'axe Y DU GLOBE et non de l'écran. Les deux
         coïncident ici, et c'est vérifié plutôt que supposé : pendant toute
         cette phase `degage` vaut zéro, donc le lacet comme l'inclinaison sont
         annulés (voir la boucle de rendu) et la scène est droite, face à nous.

         Hauteurs étalées de 5,5 à 12 : il faut dépasser le haut du cadre, qui
         vaut environ 2 unités sur un grand écran et jusqu'à 5 sur un téléphone
         étroit, où la scène est petite et le canevas haut. Étalées, aussi, pour
         que les points ne descendent pas d'une même ligne. */
      /* La hauteur de lâcher se DÉDUIT du cadre : juste au-dessus du bord
         haut, plus un étalement pour que les points ne descendent pas d'une
         même ligne. En dur à 5,5–12, elle dépassait à peine le bord sur un
         téléphone étroit — où le cadre fait cinq unités de haut — et valait
         quatre fois la hauteur utile sur un grand écran, où les points
         arrivaient alors en traits, trop vite pour qu'on les voie tomber. */
      const chute = cadrage.demiHauteur + 0.8 + noise(78.233) * 3;
      start[i * 3] = vx;
      start[i * 3 + 1] = vy + chute;
      start[i * 3 + 2] = profondeur;
    } else {
      /* L'ESSAIM, pour les points qui ne font que le globe. Ils attendent hors
         champ dans une direction tirée au sort autour de leur place, comme
         avant la pluie, et convergent vers la sphère au moment de la taille :
         le globe se forme donc exactement comme il l'a toujours fait.

         Une chute leur irait mal, d'ailleurs. Elle n'a de sens que tant que la
         scène est droite ; à ce moment-là elle ne l'est plus — l'inclinaison et
         le lacet reviennent avec `degage`, et « le haut » du globe n'est plus
         le haut de l'écran.

         Le décalage est pris dans le plan XY DU GLOBE : le groupe tourne, si
         bien qu'il bascule en profondeur à mesure de la rotation. Les points
         peuvent donc frôler la caméra ; c'est sans conséquence puisque leur
         taille ne dépend pas de la distance (voir la matière plus bas). */
      /* HORS DU CADRE, et c'est le point entier de ce calcul. Ces points-là ne
         font que passer dans l'ancienne version : ils partaient de 4,5 à 11,5
         unités et fonçaient vers la sphère en une seconde et demie. Ils
         STATIONNENT désormais pendant toute la durée du portrait — et une
         distance de 4,5 unités tombe DANS le champ, qui en fait plus de cinq
         de haut sur un téléphone. D'où les points semés sur les côtés de
         l'écran et par-dessus le titre pendant que le visage se tient.
         On part donc du rayon réellement visible, avec une marge. */
      const angle = noise(12.9898) * Math.PI * 2;
      const away = cadrage.rayon * 1.15 + 1 + noise(78.233) * 4;
      start[i * 3] = p.x + Math.cos(angle) * away;
      start[i * 3 + 1] = p.y + Math.sin(angle) * away;
      start[i * 3 + 2] = p.z;
      // Son bloc EST son départ : la première phase ne le déplace pas d'un
      // pixel, il ne s'ébranle qu'avec la taille.
      bloc[i * 3] = start[i * 3]!;
      bloc[i * 3 + 1] = start[i * 3 + 1]!;
      bloc[i * 3 + 2] = start[i * 3 + 2]!;
    }
    delay[i] = noise(21.317) * STAGGER;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(start.slice(), 3));
  const material = new THREE.PointsMaterial({
    color,
    // Size in PIXELS, with no attenuation by distance. With attenuation,
    // a point passing near the camera becomes enormous — and that is what
    // happened during the arrival: the offset above is applied in the
    // globe's frame, which rotates, so that at the start angle (-1.6 rad)
    // it turns into a DEPTH offset and brings the points onto the
    // camera. Without attenuation the problem can no longer exist, whatever
    // the rotation, and the points stay thin from one end to the other.
    // On the globe itself the loss is negligible: the size difference
    // between front face and back face was only 1.21×.
    size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return { points: new THREE.Points(geometry, material), start, bloc, target, delay };
}

/** LA SCÈNE S'ARRÊTE SUR LE PORTRAIT.

    Le globe, ses continents, ses arcs de réseau, ses orbites et la sphère
    opaque qui lui donnait son volume : plus rien de tout cela n'apparaît. Les
    points volent jusqu'au visage et s'y arrêtent, définitivement, sans
    rotation ni possibilité d'en imprimer une.

    Le code du globe n'est PAS supprimé pour autant : il est court-circuité par
    cette seule constante. Il a coûté assez de mises au point — la trame du
    visage, la couleur de Toulouse, le cadrage — pour qu'on ne le jette pas ;
    remettre `false` ici le rallume entièrement. */
const SANS_GLOBE = true;

/** Avancement de la taille : 0 tant que le bloc tient, 1 une fois la sphère
    dégagée. Exporté parce que la sphère opaque et le trafic du réseau s'y
    accrochent — sans quoi ils apparaîtraient pendant que la pierre est encore
    brute. Bloqué à 0 sans globe : le portrait est l'état final, pas une étape. */
export function degagement(elapsed: number): number {
  if (SANS_GLOBE) return 0;
  const t = Math.min(1, Math.max(0, (elapsed - (FLY_IN + STAGGER + TENUE_BLOC)) / TAILLE));
  // Adouci aux deux bouts : le geste part et se pose, il ne file pas.
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Advances a cloud's assembly. Returns true while there is still movement. */
export function advance(cloud: Cloud, elapsed: number): boolean {
  const attribute = cloud.points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const position = attribute.array as Float32Array;
  let moving = false;

  /* La taille est COMMUNE à tous les points, sans décalage : le bloc se
     dégage d'un seul geste. Le décalage ne concerne que l'arrivée initiale,
     où les points tombent un à un. */
  const taille = degagement(elapsed);
  if (taille < 1) moving = true;

  for (let i = 0; i < cloud.delay.length; i++) {
    const t = Math.min(1, Math.max(0, (elapsed - cloud.delay[i]!) / FLY_IN));
    if (t < 1) moving = true;
    const eased = 1 - Math.pow(1 - t, 3);
    for (let axis = 0; axis < 3; axis++) {
      const k = i * 3 + axis;
      /* La cible de l'arrivée est la position COURANTE entre bloc et sphère.
         Tant que la pierre est brute, les points tombent sur le bloc ; une
         fois la taille lancée, ils suivent le dégagement. Une seule formule
         pour les deux temps, donc aucune couture entre eux. */
      const arrivee = cloud.bloc[k]! + (cloud.target[k]! - cloud.bloc[k]!) * taille;
      position[k] = cloud.start[k]! + (arrivee - cloud.start[k]!) * eased;
    }
  }
  attribute.needsUpdate = true;
  return moving;
}

/** Great-circle arc. It rises little: a network link hugs the
    surface, it does not go up like a bell. */
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

// The network nodes. Toulouse first: it is the only one highlighted.
const NODES: [number, number][] = [
  [43.6, 1.44], [40.7, -74], [51.5, -0.1], [35.7, 139.7], [-33.9, 151.2],
  [1.35, 103.8], [-23.5, -46.6], [52.5, 13.4], [45.5, -73.6], [25.2, 55.3],
  [-33.9, 18.4], [12.97, 77.6], [37.8, -122.4],
];

// The links of the mesh: hop-by-hop exchanges, not a
// beam starting from a single point, otherwise it looks like a firework burst.
const ROUTES: [number, number][] = [
  [0, 2], [0, 7], [0, 9], [2, 1], [1, 8], [1, 12], [12, 3], [3, 5],
  [5, 11], [11, 9], [5, 4], [10, 7], [6, 1], [4, 3], [2, 6],
];

/** Length of the packet, in number of points of the trace. */
const TRAIL = 20;

/** Satellite orbit: a ring whose color fades along the line
    (bright near the satellite, fading towards the background), and the satellite that turns. */
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
/** Angular length of the trail, on either side of the satellite. */
const ORBIT_TRAIL = 1.35;

/** `eclat` modulates the trail's intensity. All orbits at the same
    level would give a tangle; two levels create a depth,
    a few marked trajectories and others that only surface
    at times. */
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
  // The satellite is a child of the line: it turns in its tilted plane
  // and therefore follows the line exactly.
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
  /* Satellite non ajouté à son orbite : il posait un carré clair de plus sur
     chacune des quatre orbites. La ligne de l'orbite suffit à la dire. */
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

export async function initHero3D(): Promise<void> {
  const stage = document.querySelector<HTMLElement>(".hero-stage");
  if (!stage) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return; // WebGL unavailable: the page stays perfectly readable in 2D.
  }

  // The canvas covers the whole first screen, not only the globe's
  // slot: that is what allows the points to arrive from off-page. The globe
  // is then reframed by the camera onto the reserved slot (.hero-stage),
  // which remains the drag-sensitive area.
  const canvas = renderer.domElement;
  canvas.className = "hero-canvas";
  const layer = document.createElement("div");
  layer.className = "hero-canvas-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.appendChild(canvas);
  (stage.closest(".dark-zone") ?? stage).prepend(layer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  // Minimal setback so that the sphere (diameter 2) fits entirely in
  // the vertical field: 2 / (2 · tan(fov/2)) ≈ 2.6, plus a margin.
  camera.position.z = 3;

  // outer: tilt + mouse parallax · spin: continuous rotation.
  const outer = new THREE.Group();
  /* Inclinaison réglée sur la LATITUDE de Toulouse, et non plus sur 0,3 rad.

     Le lacet initial amenait déjà la ville au bon méridien — mesuré, elle
     tombait à 8 px du centre horizontal. Mais à 17° d'inclinaison pour une
     ville à 43,6° N, elle se retrouvait 141 px trop haut sur le disque, et
     c'est l'Afrique qui occupait le centre du regard.

     En inclinant de la latitude elle-même, le point visé arrive au centre. */
  const INCLINAISON = NODES[0]![0] * DEG;
  outer.rotation.x = INCLINAISON;
  const spin = new THREE.Group();
  outer.add(spin);
  scene.add(outer);

  const { land, sea } = buildPoints();

  // Opaque sphere just barely smaller: it hides the points of the back
  // face, which gives the globe its volume.
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.985, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x0d1117 }),
  );
  // The core hides nothing until the globe is formed.
  core.scale.setScalar(0.001);
  /* RIEN DU GLOBE N'ENTRE DANS LA SCÈNE quand elle s'arrête au portrait.

     Les mettre à l'opacité zéro ne suffisait pas : un objet transparent reste
     dessiné, et il suffit d'un arrondi, d'un mélange de couches ou d'une
     surface vue par la tranche pour qu'il laisse une trace — ces traits du
     globe qu'on voyait encore passer sur le visage. Ne pas les ajouter du
     tout, c'est la seule garantie qu'ils ne peuvent rien laisser. */
  if (!SANS_GLOBE) spin.add(core);

  /* La photo est lue AVANT de construire les nuages. Remplir les positions
     après coup aurait fait sauter les points d'une forme à l'autre en pleine
     arrivée ; et c'est une image locale de 3 Ko, donc l'attente ne se voit
     pas. Si elle échoue, `portrait` vaut null et la silhouette dessinée prend
     le relais sans que rien ne se remarque. */
  const base = document.querySelector<HTMLElement>(".hero-stage");
  const chemin =
    base?.closest("body")?.querySelector<HTMLImageElement>(".hero-portrait")?.src ??
    "/julien-chapron.webp";
  /* Le portrait ne prend PAS tous les points du globe, et le nombre qu'il en
     prend n'est pas un réglage : il se DÉDUIT du pas de la trame et de la
     surface du sujet — environ quatre mille, soit un point du globe sur cinq.

     Un point par point du globe, il en recevait vingt-deux mille sur la surface
     d'un visage : les places se touchaient et l'image se refermait en une masse
     pleine. Une part fixe du total ne réglait rien non plus, puisque la même
     quantité s'étale sur une scène de 225 px comme sur une de 600.

     Les points qui n'ont pas de place ne disparaissent pas pour autant : ils
     restent où ils sont nés, hors champ, et ne rejoignent la scène qu'au moment
     de la taille (voir pointCloud). La sphère finale garde donc exactement le
     même nombre de points qu'avant. */
  /* LE CADRE, tel que resize() va le régler, calculé ici avec la MÊME formule :
     le globe de diamètre 2 occupe 84 % du petit côté de la scène, donc une
     unité vaut `uniteEnPx` pixels, et le canevas — qui couvre tout l'écran —
     montre `vue / uniteEnPx` unités de part et d'autre du centre. Recopier la
     formule plutôt que la deviner est ce qui garantit que les départs, les
     attentes et les arrivées restent tous d'accord entre eux. */
  const cadre = (base ?? stage).getBoundingClientRect();
  const vue = layer.getBoundingClientRect();
  const uniteEnPx = Math.max(1, (Math.min(cadre.width, cadre.height) * 0.84) / 2);
  const demiHauteurVue = Math.max(1, vue.height) / 2 / uniteEnPx;
  const demiLargeurVue = Math.max(1, vue.width) / 2 / uniteEnPx;
  const cadrage = {
    demiHauteur: demiHauteurVue,
    rayon: Math.hypot(demiHauteurVue, demiLargeurVue),
  };

  /* L'écart entre deux points du portrait EST celui du globe : un pas de
     LAT_STEP degrés, soit la distance entre deux parallèles sur une sphère de
     rayon 1. Les deux formes ont ainsi rigoureusement le même grain, et le
     visage se lit comme se lisent les continents.

     Cet écart ne dépend pas de la taille de l'écran, et c'est juste : le globe
     non plus. Une grande scène montre les deux plus gros, une petite les montre
     plus petits, mais jamais plus ou moins serrés l'un que l'autre. */
  /* LE PAS DU VISAGE EST EXACTEMENT CELUI DU GLOBE. Un nœud tous les LAT_STEP
     radians, comme entre deux parallèles sur une sphère de rayon 1 : les points
     du visage sont donc espacés comme ceux des continents, ni plus ni moins, et
     ils se touchent exactement dans les mêmes conditions — c'est-à-dire jamais
     tant que l'écran est assez fin.

     Il a valu 1,7 fois plus fin, pour gagner en définition dans les yeux. C'était
     une erreur d'arbitrage : à ce pas-là le blanc se refermait en masse pleine,
     les points fusionnaient, et des points fusionnés se lisent comme des traits.
     Le visage y gagnait des détails qu'il perdait aussitôt dans la pâte.

     Le prix est connu et assumé : au pas du globe, le visage fait 42 nœuds de
     large, soit quatre par œil. Pour retrouver du détail SANS refermer la
     matière, il faut agrandir le portrait — pas resserrer sa trame. */
  /* LE PAS DU VISAGE EST EXACTEMENT CELUI DU GLOBE. Un nœud tous les LAT_STEP
     radians, comme entre deux parallèles sur une sphère de rayon 1 : les points
     du visage sont espacés comme ceux des continents, ni plus ni moins.

     Essayé une fois et demie plus fin — 127 points de large au lieu de 85, avec
     un écart de 2,64 px pour des points de 1,30, donc sans qu'aucun se touche.
     Écarté : à l'œil, le gros grain rend mieux. Ce qui se calcule bien ne se
     regarde pas toujours bien, et c'est le regard qui tranche. */
  const portrait = await echantillonnerPortrait(chemin, LAT_STEP * DEG);

  /* L'ordre des rangs compte : le vivier est trié du plus clair au plus
     sombre. Les TERRES — points blancs et épais — prennent donc la tête, et
     les MERS — gris fins — la suite. C'est ce qui donne au portrait ses deux
     valeurs : le visage éclairé en blanc franc, les cheveux et la veste en
     gris discret. Inversé, on obtenait un négatif illisible. */
  const placesTotal = portrait ? portrait.length / 2 : 0;
  /* LA PART DE BLANC EST MESURÉE SUR LA PHOTO, pas héritée du globe.

     Elle valait la proportion terres/mers — 31 % — parce que les deux nuages
     se partageaient le vivier au prorata de leur taille. Cette proportion
     décrit la géographie de la Terre ; elle n'a aucune raison de décrire un
     visage, et sur celui-ci elle tombait mal : le sommet du crâne, très
     éclairé, est la zone la plus claire de la photo et raflait à lui seul tout
     le blanc, laissant le visage en gris. On lisait un bonnet blanc sur une
     tête grise.

     Relevé sur l'image : 46 % du sujet est au-dessus de 0,50 de luminance,
     44 % au-dessus de 0,60, 40 % au-dessus de 0,70. Ce palier entre 0,60 et
     0,70 est la cassure nette entre la PEAU ÉCLAIRÉE — crâne, front, joues,
     nez — et tout le reste : lunettes, ombres, sweat. C'est là qu'il faut
     couper, et 42 % tombe au milieu du palier.

     Les points de terre qui n'obtiennent pas de place attendent hors champ
     comme les autres : le globe n'y perd rien. */
  const PART_BLANCHE = 0.42;
  const placesTerre = Math.min(land.length, Math.round(placesTotal * PART_BLANCHE));
  /* LA TAILLE DES POINTS EST DONNÉE EN PIXELS PHYSIQUES, pas en pixels CSS :
     three.js passe `size` directement à gl_PointSize, qui s'exprime dans le
     tampon de rendu. Écrite en dur, elle valait donc 1,3 px CSS sur un écran
     Retina et 2,6 sur un écran ordinaire — un facteur deux sur le poids visuel
     du dessin, selon la machine.

     Ce n'est pas une subtilité : c'est ce qui m'a fait croire, en réglant le
     portrait sur un aperçu non-Retina, que les points se touchaient, et
     revenir sur une trame plus fine qui, elle, allait très bien sur l'écran
     visé. En multipliant par le rapport de pixels, la taille devient constante
     À L'ŒIL partout. Les valeurs choisies redonnent exactement le rendu actuel
     d'un écran Retina, qui est celui sur lequel tout a été réglé. */
  const grain = Math.min(window.devicePixelRatio || 1, 2);
  const landCloud = pointCloud(
    land, 0xffffff, 1.3 * grain, 1, 63.7,
    portrait ? portrait.subarray(0, placesTerre * 2) : null,
    cadrage,
  );
  /* Le gris passe de 1,6 à 1,15 : nettement plus fin que le blanc, qui garde
     sa taille pleine. C'est ce qui sépare les deux valeurs autrement que par la
     couleur — le blanc fait une matière pleine, le gris une poussière. À taille
     presque égale, les deux se lisaient comme une seule masse, sur le visage
     comme sur le globe. */
  const seaCloud = pointCloud(
    sea, 0x8b949e, 0.575 * grain, 0.6, 12.9898,
    portrait ? portrait.subarray(placesTerre * 2) : null,
    cadrage,
  );
  spin.add(seaCloud.points, landCloud.points);

  /* LE VISAGE A DES POINTS PLUS GROS QUE LE GLOBE, et ce n'est pas un caprice :
     les deux formes n'ont pas le même nombre de points.

     Le globe en pose vingt-deux mille, le portrait quatre mille — cinq fois et
     demie moins, sur une surface comparable. À taille de point égale, la
     couverture tombe à 10 % de l'aire : les points ne se rejoignent jamais, et
     le visage se lit comme un contour creux au lieu d'une masse éclairée. C'est
     le « visage bizarre » signalé sur téléphone, et la mesure le confirme —
     écart de 3,96 px pour des points de 1,30.

     Le rapport des tailles suit celui des nombres : cinq fois et demie moins de
     points appelle une aire par point cinq fois et demie plus grande, donc un
     diamètre multiplié par sa racine, soit 2,35. Arrondi à deux, ce qui porte
     la couverture à 43 % — franc, sans empâter.

     La taille glisse de l'une à l'autre avec le dégagement, si bien que le
     passage du visage au globe amincit le grain en même temps qu'il change la
     forme : une seule transition, pas deux. */
  const TAILLE_VISAGE = 2;
  const matiereTerre = landCloud.points.material as THREE.PointsMaterial;
  const matiereMer = seaCloud.points.material as THREE.PointsMaterial;
  const grainTerre = 1.3 * grain;
  const grainMer = 0.575 * grain;

  /* Toulouse reprend un point à elle : c'est l'ancre du trait pointillé qui
     part de la pastille « disponible · Toulouse ». Un halo plus large et très
     transparent l'entoure — seul, un point de 0,02 se perd dans la semaille
     des points de terre, qui font la même taille. */
  const TOULOUSE = fromLatLon(NODES[0]![0], NODES[0]![1]);
  /* Une ancre qui ne dessine RIEN.

     Toulouse avait déjà son point orange : les arcs du réseau qui en partent
     s'y rejoignent et le forment. J'y ai ajouté une sphère, puis un halo
     autour — on en comptait trois pour une seule ville, à quelques pixels les
     uns des autres. Un repère qui se dédouble ne repère plus rien.

     Il ne reste donc que le point d'origine. Cet objet sert uniquement à
     projeter la position de la ville à l'écran pour y accrocher le libellé
     et la carte. Il DOIT rester enfant de `spin` : sorti du graphe, sa
     position monde ne subit plus la rotation et l'ancre part se poser hors
     du globe — c'est ce qui est arrivé au premier essai. */
  const villeAncre = new THREE.Object3D();
  villeAncre.position.copy(TOULOUSE);
  spin.add(villeAncre);

  /* Pas de halo autour. Un second disque orange, même très transparent, se
     lisait comme un DEUXIÈME point à côté du premier — avec les têtes de
     paquets qui passent par là, on en comptait trois pour une seule ville.
     Un repère qui se dédouble ne repère plus rien : il n'en reste qu'un. */

  const clouds = [seaCloud, landCloud];
  let assembling = true;

  // Four tilted satellite orbits, each with its own faded trail.
  // Radii bounded so that each orbit fits in the frame: the widest
  // one (diameter 2.4) stays under the visible height (~2.4).
  const orbits = [
    // The four originals, fully marked.
    satelliteOrbit(1.04, 0.35, 0.2, 0.22),
    satelliteOrbit(1.1, -0.5, -0.15, -0.17),
    satelliteOrbit(1.16, 0.85, 0.5, 0.12),
    satelliteOrbit(1.2, -0.75, 0.85, -0.09),
    // Four interleaved, more discreet: they densify the shell without
    // saturating it. Tilts and rotations chosen to cross the
    // first ones rather than double them. The speeds are deliberately
    // without a simple relation between them — otherwise the satellites end up
    // synchronizing and the motion becomes regular.
    satelliteOrbit(1.065, 1.15, -0.65, 0.15, 0.45),
    satelliteOrbit(1.125, -1.05, 0.95, -0.13, 0.4),
    satelliteOrbit(1.17, 0.6, -1.1, 0.19, 0.5),
    satelliteOrbit(1.195, -0.25, 1.35, -0.07, 0.38),
  ];
  if (!SANS_GLOBE) orbits.forEach((orbit) => spin.add(orbit.line));

  // Each link is doubled: a very discreet permanent trace, which draws
  // the topology, and a short luminous segment that travels it, the packet.
  const nodePoints = NODES.map(([lat, lon]) => fromLatLon(lat, lon));
  const links: Link[] = [];
  // The arcs' materials, kept so they can be revealed at the end. Created
  // inline and forgotten, they stayed at 0.35 from the very first frame: the
  // orange lines were therefore already drawn while the points
  // were still converging from outside the page.
  const arcs: THREE.LineBasicMaterial[] = [];

  ROUTES.forEach(([a, b], i) => {
    const steps = 180;
    const curve = arcCurve(nodePoints[a]!, nodePoints[b]!);
    const points = curve.getPoints(steps);

    const arc = new THREE.LineBasicMaterial({
      color: 0xff4d00,
      transparent: true,
      opacity: 0, // revealed at the end, once the globe is formed
    });
    arcs.push(arc);
    if (!SANS_GLOBE) spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), arc));

    const packet = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xff6b1f, transparent: true, opacity: 0 }),
    );
    packet.geometry.setDrawRange(0, 0);
    if (!SANS_GLOBE) spin.add(packet);

    links.push({
      packet,
      curve,
      steps: steps + 1,
      offset: (i * 0.37) % 1,
      speed: 0.14 + (i % 5) * 0.035,
      reverse: i % 2 === 1,
    });
  });

  /* Plus AUCUN point pour les autres villes du réseau. Leurs arcs restent
     tracés — c'est eux qui disent le maillage — mais leurs points
     encombraient le globe et disputaient la lecture à Toulouse, qui doit
     rester le seul repère. */

  // The head of each packet.
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
  /* Les têtes de paquets ne sont plus ajoutées à la scène : ce sont elles
     qui semaient les petits carrés clairs un peu partout sur le globe. Les
     segments lumineux qui parcourent les arcs, eux, restent. */

  const HALF_FOV_TAN = Math.tan((42 * DEG) / 2);
  let width = 0;
  let height = 0;
  /* La scène ancrée sur Toulouse.

     Ce qui relève de la mise en page est mesuré ICI, dans resize(), et jamais
     dans la boucle de rendu : le canvas et la scène défilent ensemble, donc
     leur écart RELATIF ne change qu'au redimensionnement. Lire des rectangles
     à chaque image aurait forcé un calcul de mise en page soixante fois par
     seconde, pour des valeurs constantes. */
  const ancre = stage.querySelector<HTMLElement>(".hero-ancre");
  const carte = stage.querySelector<HTMLElement>(".hero-carte");
  let cadreVue = { dx: 0, dy: 0, w: 1, h: 1 };
  /** Largeur de la carte et de la scène : sert à savoir de quel côté de la
      balise la carte tient encore. Mesuré au redimensionnement seulement. */
  let carteLargeur = 0;
  let scenLargeur = 1;

  const resize = (): void => {
    const view = layer.getBoundingClientRect();
    const slot = stage.getBoundingClientRect();
    if (view.width < 1 || view.height < 1 || slot.height < 1) return;

    carteLargeur = carte?.offsetWidth ?? 0;
    scenLargeur = slot.width;

    cadreVue = {
      dx: view.left - slot.left,
      dy: view.top - slot.top,
      w: view.width,
      h: view.height,
    };
    width = slot.width;
    height = slot.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(view.width, view.height);
    camera.aspect = view.width / view.height;

    /* Setback such that the sphere (diameter 2) occupies the height of its
       slot, while the canvas itself fills the whole screen. The globe occupies
       80% of the frame: large enough to fill the slot's height, small enough
       for the widest orbits to stay readable.

       SUR TÉLÉPHONE, IL SE MESURE SUR LA LARGEUR. `min(hauteur, largeur)` prend
       le petit côté de la scène : sur un écran large c'est la hauteur, et le
       réglage est juste. Sur un téléphone c'est la LARGEUR — la scène y est un
       bandeau posé au-dessus du titre, plus large que haut. Mesuré sur
       390 × 844 : scène de 350 × 398, donc un globe de 280 px seulement. Et
       surtout, libérer de la hauteur sous les boutons ne l'agrandissait pas
       d'un pixel, puisque ce n'est pas la hauteur qui le bride. C'est ce qui
       faisait paraître le globe et le portrait trop petits.

       On part donc de la largeur, à 96 %, mais plafonné par la hauteur
       disponible : sur un téléphone court, la largeur seule le ferait déborder
       de sa bande et mordre sur le titre. */
    const surTelephone = window.matchMedia("(max-width: 720px)").matches;
    const wanted = surTelephone
      ? Math.min(slot.width * 0.96, slot.height * 0.9)
      : Math.min(slot.height, slot.width) * 0.8;
    camera.position.z = view.height / (wanted * HALF_FOV_TAN);
    camera.updateProjectionMatrix();

    // Then we move the globe up from the canvas center to its slot's center.
    const worldPerPixel = (2 * camera.position.z * HALF_FOV_TAN) / view.height;
    const slotCenter = slot.top + slot.height / 2;
    const viewCenter = view.top + view.height / 2;
    outer.position.y = (viewCenter - slotCenter) * worldPerPixel;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  observer.observe(layer);

  // State of the manual rotation.
  let dragging = false;
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let yawVelocity = 0;
  let dragYaw = 0;
  let dragPitch = 0;

  // Manual rotation, with inertia. A swipe across the frame's width
  // does a half-turn; the tilt is bounded so as not to turn the
  // globe over. touch-action: pan-y (CSS) leaves vertical scrolling to the finger.
  stage.addEventListener("pointerdown", (event) => {
    /* Sans globe, aucune prise : il n'y a plus de sphère à tourner, et un
       portrait qu'on fait pivoter à la main ne montrerait que la tranche de
       son nuage. Le curseur `grab` est retiré côté CSS pour que rien ne le
       laisse croire. */
    if (SANS_GLOBE) return;
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
  // Europe faces the camera on load.
  /* Lacet qui amène Toulouse face à la caméra une fois le globe dégagé.
     Pendant la statue, la scène reste à zéro : à -1,6 rad, la Vénus aurait été
     vue de profil, c'est-à-dire réduite à une tranche. */
  const YAW_TOULOUSE = -1.6;
  /** Dérive lente du globe. Elle ne part qu'après la taille : la statue se
      tient immobile, le temps qu'on la regarde. */
  let derive = 0;
  // Réutilisés à chaque image plutôt que réalloués : la boucle tourne à 60 Hz.
  const positionVille = new THREE.Vector3();
  const projection = new THREE.Vector3();

  /* « Réduire le mouvement » ne réduisait rien ici : le globe continuait de
     tourner et les paquets de circuler. Le réglage existe notamment pour les
     troubles vestibulaires, et une sphère qui tourne sans fin est exactement
     ce qu'il vise. On garde donc la scène — la supprimer laisserait un grand
     vide — mais on la POSE : l'assemblage se joue (c'est une transition, pas
     une boucle), puis plus rien ne bouge tout seul. Le glisser reste actif :
     un mouvement que l'on provoque soi-même n'est pas concerné. */
  const MOUVEMENT_REDUIT = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  renderer.setAnimationLoop(() => {
    // No guard on document.hidden: this flag is true in
    // contexts where the page is nevertheless displayed (embedded panels,
    // previews), and the globe stayed frozen there. Being off screen (inView)
    // is enough to avoid computing anything for nothing, and the browser already slows
    // requestAnimationFrame down when the tab really goes to the background.
    if (!inView) return;
    const t = clock.getElapsedTime();

    // The points converge from outside to form the globe, then we
    // stop touching the geometries.
    if (assembling) {
      let moving = false;
      for (const cloud of clouds) {
        if (advance(cloud, t)) moving = true;
      }
      assembling = moving;
      /* La sphère opaque grandit avec le DÉGAGEMENT, plus avec l'arrivée des
         points. Accrochée à l'arrivée, elle se serait installée pendant que
         la pierre est encore brute : une boule noire au milieu du bloc, qui
         en aurait masqué la face arrière et tué la lecture du volume. Elle
         n'a de sens qu'une fois la sphère dégagée — c'est elle qui donne au
         globe son opacité. */
      core.scale.setScalar(Math.max(0.001, degagement(t)));
    }

    const degage = degagement(t);
    /* Le grain suit le dégagement : gros pour le visage, fin pour le globe.
       Écrit à chaque image plutôt qu'une fois, parce que la taille doit
       repasser par le gros grain quand on remonte — le dégagement, lui, sait
       revenir en arrière. */
    const ampleur = TAILLE_VISAGE + (1 - TAILLE_VISAGE) * degage;
    matiereTerre.size = grainTerre * ampleur;
    matiereMer.size = grainMer * ampleur;
    /* LE SIGNAL PART AU DÉBUT DE LA TAILLE, et non à sa fin.

       La ligne du hero — la disponibilité qui cède la place au code, voir
       initSousTitre — doit changer PENDANT que les points se transforment,
       puisque c'est le même geste : la forme devient globe, la phrase devient
       autre chose. Attendu sur `degage >= 1`, le signal partait à 5,2 s, soit
       après la transformation ; le sondage y ajoutait jusqu'à 0,4 s et le fondu
       0,6 s de plus, si bien que la phrase changeait à 6,2 s — une seconde
       pleine après que le globe se soit posé, donc sans rapport visible avec
       lui.

       Lancé dès que la taille s'amorce, le fondu s'achève vers 4 s, au milieu
       de la transformation. Le nom de l'attribut dit toujours « globe » : c'est
       bien le passage au globe qu'il annonce, simplement à son début. */
    /* SANS GLOBE, LE SIGNAL S'ACCROCHE À L'ARRIVÉE DU VISAGE. Il ne peut plus
       attendre le début d'une taille qui n'a pas lieu — il ne partirait jamais,
       et la ligne du hero resterait sur la disponibilité pour toujours. Le
       portrait est complet une fois le dernier point posé, soit FLY_IN plus
       l'étalement des départs. */
    if (SANS_GLOBE ? t >= FLY_IN + STAGGER : degage > 0) {
      document.documentElement.dataset.globe = "1";
    }

    if (!dragging) {
      // Inertia after release, then resumption of the slow rotation.
      dragYaw += yawVelocity;
      yawVelocity *= 0.94;
      // La dérive n'entre en jeu qu'une fois la taille finie.
      if (!MOUVEMENT_REDUIT && degage >= 1) derive += 0.0005;
    }
    /* De face pendant la statue, puis pivot vers Toulouse pendant la taille :
       le mouvement de rotation fait partie du passage d'une forme à l'autre,
       il n'est pas un réglage indépendant. */
    spin.rotation.y = YAW_TOULOUSE * degage + derive + dragYaw;

    // The traffic only starts once the globe is formed.
    // Mouvement réduit : l'horloge du trafic est figée sur une image
    // représentative — les liaisons restent dessinées, elles ne défilent plus.
    // Le réseau n'a rien à relier tant que le globe n'est pas dégagé : il
    // part de la fin de la taille, pas de l'arrivée des points.
    /* Sans globe, l'horloge du réseau ne démarre jamais : arcs, orbites,
       satellites et paquets restent à l'opacité zéro, qui est leur valeur de
       naissance. Rien à masquer, rien à détruire — ils ne sont simplement
       jamais réveillés. */
    const netTime = SANS_GLOBE ? -1 : MOUVEMENT_REDUIT ? 1.5 : t - FORME_FAITE;
    if (netTime > 0) {
      const headPos = heads.geometry.getAttribute("position") as THREE.BufferAttribute;
      (heads.material as THREE.PointsMaterial).opacity = Math.min(1, netTime);

      links.forEach((link, i) => {
        const phase = (netTime * link.speed + link.offset) % 1;
        const along = link.reverse ? 1 - phase : phase;
        const head = Math.round(along * (link.steps - 1));

        // Drawing window: the packet trails behind itself, on the side it
        // comes from.
        const first = link.reverse ? head : Math.max(0, head - TRAIL);
        const last = link.reverse ? Math.min(link.steps - 1, head + TRAIL) : head;
        link.packet.geometry.setDrawRange(first, last - first + 1);

        // It fades out as it arrives, so as not to bump into the node.
        (link.packet.material as THREE.LineBasicMaterial).opacity =
          0.75 * Math.min(1, phase * 8) * Math.min(1, (1 - phase) * 8);

        const tip = link.curve.getPoint(along);
        headPos.setXYZ(i, tip.x, tip.y, tip.z);
      });
      headPos.needsUpdate = true;
    }

    // The network arcs arrive last, and slowly: the globe forms
    // first, bare, then the links are drawn over it. Start
    // offset by a quarter of a second after formation, rise over ~1.1 s —
    // later and more composed than the orbits.
    const arcOn = Math.min(1, Math.max(0, netTime - 0.25) * 0.9);
    for (const arc of arcs) arc.opacity = 0.35 * arcOn;

    // Satellite orbits: the faded trail follows each satellite, which
    // travels its orbit. The whole thing only appears once the globe is formed.
    const orbitOn = Math.min(1, Math.max(0, netTime) * 2);
    for (const orbit of orbits) {
      orbit.angle += orbit.speed * 0.016;
      const colors = orbit.colors.array as Float32Array;
      for (let i = 0; i < orbit.count; i++) {
        const a = (i / orbit.count) * Math.PI * 2;
        const d = Math.abs(Math.atan2(Math.sin(a - orbit.angle), Math.cos(a - orbit.angle)));
        // Gradient: bright at the satellite (0xff6b1f), fading towards the background (0x0d1117).
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
      // Local coordinates: the line's rotation applies to the point.
      orbit.satPos.setXYZ(0, Math.cos(orbit.angle) * orbit.radius, 0, Math.sin(orbit.angle) * orbit.radius);
      orbit.satPos.needsUpdate = true;
    }

    /* L'inclinaison suit elle aussi la taille : une statue se tient droite,
       c'est le globe qui penche. */
    outer.rotation.x += (INCLINAISON * degage + dragPitch - outer.rotation.x) * 0.08;
    renderer.render(scene, camera);

    /* La scène ancrée sur Toulouse, APRÈS le rendu : les matrices monde sont
       alors à jour pour l'image courante, sans avoir à les recalculer. */
    if (ancre) {
      villeAncre.getWorldPosition(positionVille);
      // Le globe est centré sur l'origine et la caméra regarde vers -z : la
      // composante z du point dit donc s'il est face à nous (positive) ou
      // derrière (négative).
      const face = positionVille.z;

      projection.copy(positionVille).project(camera);
      const x = cadreVue.dx + (projection.x * 0.5 + 0.5) * cadreVue.w;
      const y = cadreVue.dy + (-projection.y * 0.5 + 0.5) * cadreVue.h;
      ancre.style.setProperty("--ville-x", `${x.toFixed(1)}px`);
      ancre.style.setProperty("--ville-y", `${y.toFixed(1)}px`);

      /* La carte passe à gauche dès qu'elle ne tient plus à droite. Sans ça
         elle sortait de l'écran quand le globe amenait Toulouse vers le bord
         — immédiat sur téléphone, où la scène est étroite. La marge de 10 px
         évite que la bascule ne se déclenche pile sur le bord, où elle
         ferait des allers-retours à chaque image. */
      const tientADroite = x + 26 + carteLargeur < scenLargeur - 10;
      const dejaAGauche = ancre.classList.contains("a-gauche");
      if (dejaAGauche === tientADroite) {
        ancre.classList.toggle("a-gauche", !tientADroite);
      }

      /* Et on la retient dans le cadre. La bascule seule DÉPLACE le
         débordement : passée à gauche, la carte sortait de six pixels par
         l'autre bord — mesuré sur téléphone, où elle fait presque la moitié
         de la largeur d'écran. Ce décalage la ramène, quel que soit le côté. */
      const bordGauche = tientADroite ? x + 26 : x - 26 - carteLargeur;
      let decalage = 0;
      if (bordGauche < 8) decalage = 8 - bordGauche;
      else if (bordGauche + carteLargeur > scenLargeur - 8) {
        decalage = scenLargeur - 8 - (bordGauche + carteLargeur);
      }
      ancre.style.setProperty("--carte-decalage", `${decalage.toFixed(1)}px`);

      /* Tout s'efface dès que la ville tourne vers l'arrière — annoncer
         « Toulouse » en désignant un point caché derrière le globe n'aurait
         aucun sens — et pendant qu'on fait tourner le globe à la main, où la
         carte suivrait le geste en fouettant l'écran. La scène attend aussi
         que le globe soit formé : pointer une ville sur une nuée de points en
         vol ne dit rien. La marge de 0,18 coupe avant le bord exact de la
         sphère, là où le point rase la surface et devient illisible. */
      const net = Math.min(1, Math.max(0, (face - 0.18) / 0.32));
      const op = dragging || assembling ? 0 : net;
      ancre.style.setProperty("--lien-op", op.toFixed(3));
    }
  });
}
