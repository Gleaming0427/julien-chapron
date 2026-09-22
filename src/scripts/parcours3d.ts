// The 3D form of the parcours block: clouds of points with the same care as
// the hero globe — a car, a satellite and a gear, one per card of the
// carousel. The subjects are not decorative: the car stands behind the four
// years at Renault, on the electric vehicles' API and on fleet supervision,
// and the others behind their own cards. Nothing is loaded: each shape is an
// outline drawn in code, see construireVoiture.
// The sequence between the profile block and the parcours block is entirely
// driven by --spec-form, that is, by the POSITION of the rail — no clock of
// its own in this module:
// 1. the black points enter FROM THE TOP RIGHT and settle onto the body
//    (up to 0.34); scrolling back up, they leave by the same path;
// 2. a black panel sweeps across the screen from the right, and each point
//    whitens at the precise moment the panel's edge passes it;
// 3. the car turns on its vertical axis, continuously.
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

/* THE VIEW IS FIXED. The car does not turn: it is posed, once, at the angle
   a press photograph would use — three quarters from the front, the eye a
   little above the roof line. Two angles set it and neither ever changes.
   Both are carried by `spin`, so they also apply to the start positions:
   poserLesDeparts() must compensate for them. */

/** How far above the car the eye sits, in radians. About twelve degrees:
    enough to read the roof and all four wheels, not so much that the profile
    flattens out. */
const TILT = 0.21;
/** Rotation on the vertical axis. At zero the car is dead side-on, the
    flattest view there is; this brings the nose round towards the viewer. */
const POSE = 0.62;

/** Point count on desktop; phones run at half (see initParcours3D). */
const COUNT_BASE = 2200;
/** Half-length of the car, plus the jitter given to the points. */
const RAYON_EXT = 0.99;
/** Half-height of the tallest form — the gear, tip to tip: what the vertical
    clamp has to keep in frame. */
const DEMI_HAUT = 0.65;
/** Phone: what is left between the car and the edge of the screen. */
const MARGE_TEL = 16;
const FOV = 42;
const HALF_FOV_TAN = Math.tan((FOV * Math.PI) / 180 / 2);

/** Deterministic pseudo-random sequence, as in hero3d. */
function graine(i: number, n: number): number {
  const v = Math.sin(i * n) * 43758.5453;
  return v - Math.floor(v);
}

/* ---------------------------------------------------------------------------
   The car.

   Drawn here rather than loaded. A glTF model costs 200 kB to 2 MB, plus its
   loader and a licence to check, and we would throw its triangles away:
   nothing of it is kept but the surface, as points. The outline below is the
   whole asset — the roof line from the nose to the tail, then the underside
   back the other way with a wheel arch cut into it at each axle.

   x runs along the length, y along the height, both in scene units.
   --------------------------------------------------------------------------- */

/* Proportions taken off the reference picture and checked against the real
   thing: 5.68 m long, 2.03 m wide, 1.79 m tall. The length spans 1.94 scene
   units, so the width lands at 0.69 and the height at 0.61 — the body reads
   WIDER THAN IT IS TALL from the front, which is the first thing a car does
   and the first thing my earlier attempt got wrong. */
const ESSIEU_Y = -0.14;
const ESSIEU_AV = -0.58;
const ESSIEU_AR = 0.62;
/** Half-width of the body at its widest. */
const DEMI_LARGE = 0.33;

/** One wheel arch, cut UPWARDS into the underside, from rear to front.
    Angular and not round: on this design the arches are flat-topped
    trapezoids, and a semicircle there softened the one shape that should
    not be soft. */
function arche(cx: number): [number, number][] {
  return [
    [cx + 0.23, ESSIEU_Y],
    [cx + 0.18, 0.08],
    [cx - 0.18, 0.08],
    [cx - 0.23, ESSIEU_Y],
  ];
}

/** Closed side profile. Straight segments only — the whole character of this
    body is that it has no curve anywhere: one long rising line from the nose
    to the top of the windscreen, a nearly flat roof, one sharp break down to
    the bed, then a flat bed rail to a vertical tail. */
const PROFIL: [number, number][] = [
  [-0.95, -0.14], // front bumper, bottom
  [-0.97, 0.015], // the nose: the front face is near vertical, barely raked
  [-0.44, 0.125], // cowl — end of the bonnet's straight run
  [-0.04, 0.305], // the apex, top of the windscreen
  [0.26, 0.285], // roof, rear: it barely falls away
  [0.4, 0.115], // the break, straight down onto the bed
  [0.97, 0.1], // bed rail, to the tail
  [0.95, -0.14], // tail, bottom
  ...arche(ESSIEU_AR),
  ...arche(ESSIEU_AV),
];

/** Cumulative perimeter of PROFIL — lets the outline be walked at even spacing. */
const PERIMETRE: number[] = (() => {
  const cum = [0];
  for (let i = 0; i < PROFIL.length; i++) {
    const [ax, ay] = PROFIL[i]!;
    const [bx, by] = PROFIL[(i + 1) % PROFIL.length]!;
    cum.push(cum[i]! + Math.hypot(bx - ax, by - ay));
  }
  return cum;
})();

/** Ray casting: is (x, y) inside the profile? */
function dansProfil(x: number, y: number): boolean {
  let dedans = false;
  for (let i = 0, j = PROFIL.length - 1; i < PROFIL.length; j = i++) {
    const [xi, yi] = PROFIL[i]!;
    const [xj, yj] = PROFIL[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/** Half-width of the body at (x, y): what gives the profile its volume. */
function demiLargeur(x: number, y: number): number {
  /* Nearly constant along the length: this body is a slab, and it only draws
     in at the very nose and the very tail. A generous taper made it a lozenge
     seen from above, which is what a sports car does and this does not. */
  const filant = 1 - 0.28 * Math.pow(Math.min(1, Math.abs(x) / 0.97), 5);
  /* Tumblehome: the cabin leans in above the shoulder line, so the roof is
     markedly narrower than the body. On this shape it is pronounced, and it is
     half of what makes the thing recognisable from three quarters. */
  const serre = y > 0.125 ? 1 - 0.45 * ((y - 0.125) / 0.18) : 1;
  return DEMI_LARGE * filant * serre;
}

/* ---------------------------------------------------------------------------
   Le satellite.

   Il accompagne la fiche AERIS — quatre ans de données atmosphériques, dont la
   source est justement en orbite. Dessiné en code comme la voiture, pour les
   mêmes raisons : rien à charger, rien à licencier.

   Ce qui le NOMME tient en trois choses, et le reste est du décor : deux
   grandes ailes plates couvertes de cellules, un corps compact au milieu, une
   antenne parabolique au-dessus. Le quadrillage des ailes fait l'essentiel du
   travail — c'est la seule chose qui ne ressemble à rien d'autre.
   --------------------------------------------------------------------------- */

/** Les ailes s'étendent de ±AILE_PRES à ±AILE_LOIN, sur AILE_HAUT de demi-hauteur. */
const AILE_PRES = 0.2;
const AILE_LOIN = 0.97;
const AILE_HAUT = 0.115;
/** Demi-dimensions du corps. */
const CORPS: [number, number, number] = [0.13, 0.17, 0.12];

/** Les ailes tiennent dans le plan XY, et ce n'est pas indifférent : sous
    Rx(TILT)·Ry(POSE), la normale de ce plan ressort à 0,80 en Z, donc on les
    voit largement. Posées à plat (plan XZ) elles seraient vues par la tranche —
    la normale n'y sort qu'à 0,21 — et deux grandes ailes réduites à deux traits
    ne disent plus rien du tout. */
function construireSatellite(count: number): [number, number, number][] {
  const points: [number, number, number][] = [];

  /* LES AILES. Une grille régulière, en trois éléments séparés par un joint :
     c'est le quadrillage qui se lit comme des cellules photovoltaïques, et il
     n'y a pas d'autre façon de le dire en points. Les colonnes du joint sont
     sautées plutôt que rapprochées — un panneau solaire est fait de morceaux
     distincts, et ce vide-là est ce qui le montre. */
  const COLONNES = 42;
  const RANGEES = 12;
  // Deux colonnes vides par joint, et non une : à une seule, le vide faisait
  // l'épaisseur d'un point et les trois éléments se lisaient comme un seul.
  const JOINTS = [13, 14, 27, 28];
  for (const cote of [-1, 1]) {
    for (let c = 0; c < COLONNES; c++) {
      if (JOINTS.includes(c)) continue;
      const fx = (c + 0.5) / COLONNES;
      const x = cote * (AILE_PRES + (AILE_LOIN - AILE_PRES) * fx);
      for (let r = 0; r < RANGEES; r++) {
        const y = -AILE_HAUT + ((r + 0.5) / RANGEES) * 2 * AILE_HAUT;
        points.push([x, y, 0]);
      }
    }
  }

  /* LE LONGERON de chaque aile : une ligne dense sur le bord haut et le bord
     bas. Sans lui la grille s'effiloche sur ses bords et l'aile n'a plus de
     contour — or c'est un objet manufacturé, il a des arêtes nettes. */
  const nLongeron = Math.round(count * 0.09);
  for (let k = 0; k < nLongeron; k++) {
    const f = (k + 0.5) / nLongeron;
    const cote = k % 2 === 0 ? -1 : 1;
    const x = cote * (AILE_PRES + (AILE_LOIN - AILE_PRES) * ((f * 2) % 1));
    points.push([x, f < 0.5 ? AILE_HAUT : -AILE_HAUT, 0]);
  }

  /* LE CORPS : une boîte. Ses douze arêtes d'abord, denses, puis un semis
     léger sur les faces — la même recette que la voiture, pour la même
     raison : ce sont les arêtes qui donnent le volume. */
  const [bx, by, bz] = CORPS;
  const COINS: [number, number, number][] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    COINS.push([sx * bx, sy * by, sz * bz]);
  }
  const ARETES: [number, number][] = [];
  for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      // Deux coins sont reliés s'ils ne diffèrent que sur UN axe.
      let differences = 0;
      for (let k = 0; k < 3; k++) if (COINS[a]![k] !== COINS[b]![k]) differences++;
      if (differences === 1) ARETES.push([a, b]);
    }
  }
  const nCorps = Math.round(count * 0.16);
  for (let k = 0; k < nCorps; k++) {
    const [a, b] = ARETES[k % ARETES.length]!;
    const t = graine(k, 2.3);
    points.push([
      COINS[a]![0] + (COINS[b]![0] - COINS[a]![0]) * t,
      COINS[a]![1] + (COINS[b]![1] - COINS[a]![1]) * t,
      COINS[a]![2] + (COINS[b]![2] - COINS[a]![2]) * t,
    ]);
  }
  const nFaces = Math.round(count * 0.035);
  for (let k = 0; k < nFaces; k++) {
    const u = graine(k, 5.1) * 2 - 1;
    const v = graine(k, 8.7) * 2 - 1;
    const face = k % 3;
    const signe = k % 2 === 0 ? 1 : -1;
    if (face === 0) points.push([signe * bx, u * by, v * bz]);
    else if (face === 1) points.push([u * bx, signe * by, v * bz]);
    else points.push([u * bx, v * by, signe * bz]);
  }

  /* L'ANTENNE PARABOLIQUE, en anneaux concentriques. Un disque plein se lirait
     comme une tache ; les anneaux disent la surface courbe, et c'est ainsi
     qu'on dessine une parabole depuis toujours. Elle est orientée vers le haut
     et vers nous — une antenne qui pointerait ailleurs se verrait par la
     tranche, et ne serait plus qu'un trait. */
  const CENTRE: [number, number, number] = [0.03, 0.39, 0.05];
  const RAYON_ANT = 0.17;
  /* Parabole VOLONTAIREMENT plate. À 0,34 le bord reculait de 0,03 sur un
     rayon de 0,15 : vue de biais, la coupelle se refermait en cône et se
     lisait comme un cornet. Plus ouverte, elle garde sa silhouette de disque,
     qui est ce à quoi on reconnaît une antenne. */
  const FOCALE = 0.6;
  // Axe de visée, normalisé, puis deux vecteurs qui tendent le plan du disque.
  const axe = [0.3, 0.62, 0.72];
  const nAxe = Math.hypot(axe[0]!, axe[1]!, axe[2]!);
  const d: [number, number, number] = [axe[0]! / nAxe, axe[1]! / nAxe, axe[2]! / nAxe];
  // u = d × Y, normalisé ; v = d × u. Orthogonaux par construction.
  let u: [number, number, number] = [d[2], 0, -d[0]];
  const nU = Math.hypot(u[0], u[1], u[2]);
  u = [u[0] / nU, u[1] / nU, u[2] / nU];
  const v: [number, number, number] = [
    d[1] * u[2] - d[2] * u[1],
    d[2] * u[0] - d[0] * u[2],
    d[0] * u[1] - d[1] * u[0],
  ];
  const nAntenne = Math.round(count * 0.17);
  const ANNEAUX = 6;
  /* Les points se répartissent sur les anneaux au PRORATA DE LEUR
     CIRCONFÉRENCE. À nombre égal par anneau, l'anneau du centre — vingt fois
     plus court que celui du bord — recevait autant de points que lui : le
     centre virait au pâté plein et on ne voyait plus de cercles du tout. */
  let sommeRayons = 0;
  for (let a = 1; a <= ANNEAUX; a++) sommeRayons += a;
  const parAnneau: number[] = [];
  for (let a = 1; a <= ANNEAUX; a++) {
    parAnneau.push(Math.round((nAntenne * a) / sommeRayons));
  }
  let anneau = 0;
  let restant = parAnneau[0]!;
  for (let k = 0; k < nAntenne; k++) {
    while (restant <= 0 && anneau < ANNEAUX - 1) {
      anneau++;
      restant = parAnneau[anneau]!;
    }
    restant--;
    const r = RAYON_ANT * ((anneau + 1) / ANNEAUX);
    const a = graine(k, 3.7) * Math.PI * 2;
    // Creux parabolique : le bord recule par rapport au centre.
    const creux = -(r * r) / (2 * FOCALE);
    points.push([
      CENTRE[0] + u[0] * r * Math.cos(a) + v[0] * r * Math.sin(a) + d[0] * creux,
      CENTRE[1] + u[1] * r * Math.cos(a) + v[1] * r * Math.sin(a) + d[1] * creux,
      CENTRE[2] + u[2] * r * Math.cos(a) + v[2] * r * Math.sin(a) + d[2] * creux,
    ]);
  }

  /* LE MÂT qui porte l'antenne, et une perche d'instrument sous le corps.
     Tout ce qui reste du budget passe ici : deux lignes, mais ce sont elles
     qui rattachent l'antenne au corps — sans mât, elle flotte. */
  for (let k = 0; points.length < count; k++) {
    const t = ((k * 0.61803) % 1 + 1) % 1; // suite équirépartie, sans paquets
    if (k % 3 === 2) {
      // La perche, vers le bas.
      points.push([0.02, -by - t * 0.16, 0.02]);
    } else {
      points.push([
        t * CENTRE[0],
        by + t * (CENTRE[1] - by),
        t * CENTRE[2],
      ]);
    }
  }

  return points;
}

/* ---------------------------------------------------------------------------
   L'engrenage.

   La troisième fiche est Ethics Group : trois ans à outiller la consultation
   publique — questionnaires, diagnostics — pour un cabinet dont le métier est
   la transformation des organisations. Un engrenage est l'objet qui dit cela,
   et il est dessiné en code comme la voiture et le satellite, pour les mêmes
   raisons : rien à charger, rien à licencier.

   IL EST VOLONTAIREMENT PAUVRE. La version d'avant portait des trous
   d'allègement, un moyeu en saillie, une rainure de clavette — tout ce qu'un
   vrai pignon a. Rendu en points, cela donnait une rosace : la couronne de
   trous formait des pétales qui noyaient les dents, et on ne lisait plus un
   engrenage mais un napperon. Un objet ne se reconnaît pas à la somme de ses
   détails ; il se reconnaît à ce qui n'appartient qu'à lui.

   Ici, cela tient en trois choses. LES DENTS, qui sont toute la signature.
   L'ÉPAISSEUR, donnée par le décalage entre les deux faces. LE TROU au centre,
   sans lequel une roue dentée est un soleil. Rien d'autre.

   Le disque tient dans le plan XY, comme les ailes du satellite : sous
   Rx(TILT)·Ry(POSE) sa normale ressort à 0,80 en Z. Posé autrement, on le
   verrait par la tranche, et un engrenage vu par la tranche n'est qu'un trait.
   --------------------------------------------------------------------------- */

/** Douze dents, franches. Au-delà d'une quinzaine, à la taille où la forme
    s'affiche, le creux entre deux dents devient plus étroit qu'un point et la
    couronne se referme en cercle lisse. */
const DENTS = 12;
const R_TETE = 0.62; // sommet des dents
const R_PIED = 0.47; // pied des dents
/** Part du pas occupée par le plat du sommet. À 0,5 les dents et les creux ont
    la même largeur, ce qui est le dessin le plus lisible qui soit. */
const PART_DENT = 0.48;
const DEMI_Z = 0.06; // demi-épaisseur du disque
const R_ALESAGE = 0.17; // le trou central

function construireEngrenage(count: number): [number, number, number][] {
  const points: [number, number, number][] = [];

  /* Le profil : un polygone fermé, quatre sommets par dent — pied, montée du
     flanc, plat du sommet, descente. Que des segments droits et des flancs
     radiaux, le même parti que la carrosserie, qui n'a de courbe nulle part.
     Pas de congé au pied des dents : à cette taille, un angle vif est ce que
     l'œil attend d'un dessin, pas un défaut de la pièce. */
  const COINS: [number, number][] = [];
  const PAS = (Math.PI * 2) / DENTS;
  for (let d = 0; d < DENTS; d++) {
    const a0 = d * PAS;
    const creux = ((1 - PART_DENT) * PAS) / 2;
    COINS.push([R_PIED * Math.cos(a0), R_PIED * Math.sin(a0)]);
    COINS.push([R_TETE * Math.cos(a0 + creux), R_TETE * Math.sin(a0 + creux)]);
    COINS.push([R_TETE * Math.cos(a0 + PAS - creux), R_TETE * Math.sin(a0 + PAS - creux)]);
    COINS.push([R_PIED * Math.cos(a0 + PAS), R_PIED * Math.sin(a0 + PAS)]);
  }

  /** Le contour parcouru à pas constant, exactement comme la voiture parcourt
      son profil : c'est ce qui donne une ligne, et non un semis. */
  const PERIM: number[] = (() => {
    const cum = [0];
    for (let i = 0; i < COINS.length; i++) {
      const [ax, ay] = COINS[i]!;
      const [bx, by] = COINS[(i + 1) % COINS.length]!;
      cum.push(cum[i]! + Math.hypot(bx - ax, by - ay));
    }
    return cum;
  })();
  const tour = PERIM[COINS.length]!;
  const surLeTour = (f: number): [number, number] => {
    const d = f * tour;
    let seg = 0;
    while (seg < COINS.length - 1 && PERIM[seg + 1]! < d) seg++;
    const [ax, ay] = COINS[seg]!;
    const [bx, by] = COINS[(seg + 1) % COINS.length]!;
    const long = PERIM[seg + 1]! - PERIM[seg]!;
    const t = long > 0 ? (d - PERIM[seg]!) / long : 0;
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };

  /* LA DENTURE, face avant. La ligne la plus forte du dessin : elle porte à
     elle seule toute la silhouette. */
  const nPres = Math.round(count * 0.4);
  for (let k = 0; k < nPres; k++) {
    const [x, y] = surLeTour((k + 0.5) / nPres);
    points.push([x, y, DEMI_Z]);
  }

  /* LA DENTURE, face arrière, plus maigre. Sous l'inclinaison elle dépasse de
     la première : ce décalage entre les deux lignes EST l'épaisseur du disque,
     et il n'y a pas d'autre façon de la montrer avec des points. */
  const nLoin = Math.round(count * 0.22);
  for (let k = 0; k < nLoin; k++) {
    const [x, y] = surLeTour((k + 0.5) / nLoin);
    points.push([x, y, -DEMI_Z]);
  }

  /* LES FLANCS DES DENTS, d'une face à l'autre, à chaque sommet du profil.
     Sans eux les deux dentures se lisent comme deux découpes de papier posées
     l'une derrière l'autre, et non comme une pièce épaisse. */
  const nFlancs = Math.round(count * 0.16);
  for (let k = 0; k < nFlancs; k++) {
    const [x, y] = COINS[k % COINS.length]!;
    const t = (Math.floor(k / COINS.length) + 0.5) / Math.ceil(nFlancs / COINS.length);
    points.push([x, y, -DEMI_Z + 2 * DEMI_Z * t]);
  }

  /* LE TROU, sur les deux faces. */
  const nTrou = Math.round(count * 0.1);
  for (let k = 0; k < nTrou; k++) {
    const a = ((k + 0.5) / nTrou) * Math.PI * 2 * 2; // deux tours : une face chacun
    points.push([
      R_ALESAGE * Math.cos(a),
      R_ALESAGE * Math.sin(a),
      k * 2 < nTrou ? DEMI_Z : -DEMI_Z,
    ]);
  }

  /* LE VOILE, entre le trou et le pied des dents. Une TRAME RÉGULIÈRE, et non
     des anneaux concentriques : en anneaux, le voile se lisait comme une cible
     — cinq cercles emboîtés qui tiraient l'œil au centre, alors que tout ce qui
     nomme la pièce est sur son bord.

     Volontairement clairsemé : c'est un fond, pas un sujet, et tout ce qu'on
     lui donne, on le retire aux dents. Son seul rôle est d'empêcher le trou de
     flotter au milieu d'une couronne vide. */
  const nVoile = Math.max(0, count - points.length);
  if (nVoile > 0) {
    const aire = Math.PI * (R_PIED * R_PIED - R_ALESAGE * R_ALESAGE);
    const pasVoile = Math.sqrt(aire / (nVoile * 0.866));
    const rangee = pasVoile * 0.86603;
    const places: [number, number][] = [];
    const lignes = Math.ceil(R_PIED / rangee);
    const colonnes = Math.ceil(R_PIED / pasVoile) + 1;
    for (let r = -lignes; r <= lignes; r++) {
      const y = r * rangee;
      for (let c = -colonnes; c <= colonnes; c++) {
        // Une rangée sur deux décalée d'un demi-pas : trame hexagonale.
        const x = (c + (r % 2 === 0 ? 0 : 0.5)) * pasVoile;
        const d = Math.hypot(x, y);
        if (d > R_ALESAGE + pasVoile * 0.5 && d < R_PIED - pasVoile * 0.5) places.push([x, y]);
      }
    }
    // Prélèvement régulier : au hasard, il ferait des amas.
    const saut = places.length / nVoile;
    for (let k = 0; k < nVoile && places.length > 0; k++) {
      const [x, y] = places[Math.min(places.length - 1, Math.floor(k * saut))]!;
      points.push([x, y, DEMI_Z]);
    }
  }

  return points;
}

/** Index in PROFIL, exclusive, past which the vertices are wheel arches and
    not folds of the body. The cross edges stop there: bars laid across an
    arch read as wheel-well liners, which is clutter at this size. */
const PLIS_CORPS = 8;

/** The car as a point cloud: a wireframe of its folds, then the wheels.

    This is drawn as EDGES, with only a thin haze of surface behind them. Two
    filled flanks came out as a blob the shape of a car; one filled flank plus
    scattered outline points was better but still a haze. What this body
    actually is, is a dozen flat panels meeting at hard creases — so the creases
    are the drawing, and everything else is support. */
function construireVoiture(count: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const tour = PERIMETRE[PROFIL.length]!;

  /** Walks the outline at a given fraction of its length. */
  const surLeContour = (f: number): [number, number] => {
    const d = f * tour;
    let seg = 0;
    while (seg < PROFIL.length - 1 && PERIMETRE[seg + 1]! < d) seg++;
    const [ax, ay] = PROFIL[seg]!;
    const [bx, by] = PROFIL[(seg + 1) % PROFIL.length]!;
    const long = PERIMETRE[seg + 1]! - PERIMETRE[seg]!;
    const t = long > 0 ? (d - PERIMETRE[seg]!) / long : 0;
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };

  /* THE NEAR CREASE: the whole outline, on the flank turned towards us. The
     strongest line in the picture, and rightly so — it is the one that carries
     the bonnet's straight run, the apex, and the break down onto the bed.
     Which flank is the near one is decided by POSE: the panel's normal comes
     out at +0.80 in Z under Rx(TILT)·Ry(POSE), so it is the +Z side.
     THIS DEPENDS ON THE POSE, and the pose is fixed for good; if POSE ever
     changed sign, these signs would have to follow. */
  const nPres = Math.round(count * 0.3);
  for (let k = 0; k < nPres; k++) {
    const [x, y] = surLeContour((k + 0.5) / nPres);
    points.push([x, y, demiLargeur(x, y)]);
  }

  /* THE FAR CREASE, thinner: at three quarters it shows above the roof line
     and past the tail, and that offset between the two lines is most of what
     says the thing has a width. */
  const nLoin = Math.round(count * 0.2);
  for (let k = 0; k < nLoin; k++) {
    const [x, y] = surLeContour((k + 0.5) / nLoin);
    points.push([x, y, -demiLargeur(x, y)]);
  }

  /* THE CROSS FOLDS, joining the two creases at each corner of the body: the
     front face, the foot and the top of the windscreen, the back of the roof,
     the break onto the bed, the tail. These are what turn two parallel
     outlines into a solid — without them the eye reads two flat cut-outs. */
  const nTraverse = Math.round(count * 0.14);
  for (let k = 0; k < nTraverse; k++) {
    const [x, y] = PROFIL[k % PLIS_CORPS]!;
    const w = demiLargeur(x, y);
    points.push([x, y, -w + 2 * w * ((Math.floor(k / PLIS_CORPS) + 0.5) / Math.ceil(nTraverse / PLIS_CORPS))]);
  }

  /* THE FLANK ITSELF, kept deliberately thin. It is there so the body does not
     read as see-through, not to be looked at: any denser and it swallows the
     creases, which is the mistake the first two attempts made. */
  const nFlanc = Math.round(count * 0.14);
  const vise = points.length + nFlanc;
  for (let essai = 0; points.length < vise && essai < nFlanc * 40; essai++) {
    const x = -0.99 + graine(essai, 1.7) * 1.98;
    const y = -0.16 + graine(essai, 5.3) * 0.48;
    if (!dansProfil(x, y)) continue;
    points.push([x, y, demiLargeur(x, y)]);
  }

  /* THE WHEELS — the near pair only, for the same reason the far flank is not
     drawn: on a solid car the far wheels sit behind the body, and points hide
     nothing, so drawing them only scattered noise across the middle of the
     silhouette. Everything left in the budget goes here, split between the two:
     the arches are cut deep into the underside, and a wheel that does not fill
     its arch leaves a hole where the eye expects the heaviest part of the car. */
  const RAYON_ROUE = 0.16;
  const BOUDIN = 0.055;
  const VOIE = 0.27;
  for (let k = 0; points.length < count; k++) {
    const u = graine(k, 3.1) * Math.PI * 2;
    const v = graine(k, 7.7) * Math.PI * 2;
    const rayon = RAYON_ROUE + BOUDIN * Math.cos(v);
    points.push([
      (k % 2 === 0 ? ESSIEU_AV : ESSIEU_AR) + rayon * Math.cos(u),
      ESSIEU_Y + rayon * Math.sin(u),
      VOIE + BOUDIN * Math.sin(v),
    ]);
  }

  return points;
}

export function initParcours3D(): void {
  /* NI SUR TÉLÉPHONE NI SUR TABLETTE : la scène ne se monte pas du tout.

     Sur téléphone, la raison est mesurée : la mise en page y est empilée, la
     fiche fait 350 × 530 et se pose à 188 px du haut, si bien qu'elle recouvre
     58 % du canvas — et le nuage étant centré, il tombe exactement dessous. On
     ne voit pas un point, à aucun moment de la séquence. On payait un contexte
     WebGL et un rendu à chaque image, sur l'appareil qui le supporte le moins
     bien, pour quelque chose d'invisible.

     Sur tablette, la même chose vient d'arriver : le bloc s'y empile désormais
     aussi, titre au-dessus et fiche sur toute la largeur (voir la requête
     tablette dans global.css). Une fiche large de 756 px sur un canvas de 805
     ne laisse plus rien dépasser du nuage.

     La condition retenue couvre les deux orientations : la largeur seule
     laisserait passer une tablette en paysage, qui fait 1024 px de large. Le
     pointeur grossier attrape tout ce qui se touche, quelle que soit la taille.

     Le volet sombre ne dépend pas de ce module (ui.ts écrit --volet-entree, et
     le fond prend le maximum des deux) : le bloc garde son fond, sa transition
     et son carrousel. Seul le décor disparaît. */
  if (window.matchMedia("(max-width: 1080px), (pointer: coarse)").matches) return;

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

  /* THREE FORMS, and the cloud passes from one to the next as the carousel
     advances. The car belongs to Renault, the satellite to AERIS — whose data
     comes from orbit — and the gear to Ethics Group, whose business is
     transformation. The three are built once, here; `cible` is only a blend
     of the two neighbours, recomputed when the blend moves. The same point
     keeps its rank in all three forms, so it travels in a straight line from
     its place in one to its place in the next: the most legible, most
     discreet transformation. */
  const voiture = construireVoiture(COUNT);
  const satellite = construireSatellite(COUNT);
  const engrenage = construireEngrenage(COUNT);
  const formeVoiture = new Float32Array(COUNT * 3);
  const formeSatellite = new Float32Array(COUNT * 3);
  const formeEngrenage = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    /* A slight jitter gives the surface its texture. Half what the donut
       carried: there it only roughened a tube, here it eats into an outline
       that has to stay recognisable — at 0.04 the roof line and the nose both
       went soft, and the panel joints of the satellite closed up. The SAME
       jitter for all three forms: drawn twice, it would add a parasitic
       displacement to every point during the transformation. */
    const jx = (graine(i, 9.1) - 0.5) * 0.02;
    const jy = (graine(i, 9.7) - 0.5) * 0.02;
    const jz = (graine(i, 11.3) - 0.5) * 0.02;
    const [vx, vy, vz] = voiture[i]!;
    formeVoiture[i * 3] = vx + jx;
    formeVoiture[i * 3 + 1] = vy + jy;
    formeVoiture[i * 3 + 2] = vz + jz;
    const [sx, sy, sz] = satellite[i]!;
    formeSatellite[i * 3] = sx + jx;
    formeSatellite[i * 3 + 1] = sy + jy;
    formeSatellite[i * 3 + 2] = sz + jz;
    const [ex, ey, ez] = engrenage[i]!;
    formeEngrenage[i * 3] = ex + jx;
    formeEngrenage[i * 3 + 1] = ey + jy;
    formeEngrenage[i * 3 + 2] = ez + jz;
    cible[i * 3] = formeVoiture[i * 3]!;
    cible[i * 3 + 1] = formeVoiture[i * 3 + 1]!;
    cible[i * 3 + 2] = formeVoiture[i * 3 + 2]!;

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

  /** Framing used at the last computation of the starts, to know when to
      redo it. It no longer carries the rotation: POSE never moves, so there is
      nothing there to have changed. */
  let departsPour = { z: 0, aspect: 0, x: 0, y: 0 };

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
    // `spin` applies Rx(TILT) then Ry(angle) — in that order, three.js's XYZ
    // Euler giving world = Rx · Ry · local. To get a wanted WORLD position,
    // the two must therefore be undone: first Rx, then Ry.
    // Undoing only the tilt is not enough even now that the pose is fixed:
    // POSE is a quarter of a turn's worth of rotation, and left in, it sent the
    // waiting cloud across the page instead of off its top right corner.
    const cT = Math.cos(TILT);
    const sT = Math.sin(TILT);
    const cA = Math.cos(POSE);
    const sA = Math.sin(POSE);
    for (let i = 0; i < COUNT; i++) {
      const wx = xMin + graine(i, 51.7) * 2.4;
      const wy = yMin + graine(i, 57.1) * 1.8;
      const wz = (graine(i, 61.3) - 0.5) * 1.2;
      // Rx(-TILT)
      const ay = cT * wy + sT * wz;
      const az = -sT * wy + cT * wz;
      // then Ry(-angle)
      relais[i * 3] = cA * wx - sA * az;
      relais[i * 3 + 1] = ay;
      relais[i * 3 + 2] = sA * wx + cA * az;
    }
    departsPour = { z: camera.position.z, aspect: camera.aspect, x: finaleX, y: finaleY };
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
    const limite = Math.max(0, demiHauteur - DEMI_HAUT - demiHauteur * 0.06);
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
  /** 0 = the car, 1 = the satellite, 2 = the gear. Smoothed, so the form
      reshapes instead of jumping when the card changes. */
  let melange = 0;
  let melangePrec = -1;

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
      /* The elapsed time is no longer read by anything — nothing in the scene
         advances by itself now that the pose is fixed. The stamp is still kept
         up to date, because the branch above resets it when the block leaves
         the screen and that reset has to have something to reset. */
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
        // never read again, and re-running this loop of 2200 sines and cosines
        // for the whole time the block is on screen produces a result nothing
        // uses. Back when the form turned, the advancing angle alone was enough
        // to re-trigger it on every single frame.
        avance < 1 &&
        (departsPour.z !== camera.position.z ||
          departsPour.aspect !== camera.aspect ||
          departsPour.x !== finaleX ||
          departsPour.y !== finaleY)
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
      /* WHICH FORM. The open card is written on <html> by ui.ts. The car
         holds the first — Renault — the satellite takes over on the second,
         AERIS, and the gear holds the third, Ethics Group: a firm whose
         business is transforming organisations, so a gear is the honest
         object there. The smoothing is deliberately slow: it is a
         transformation to watch happen, not a replacement. */
      const fiche = Number(sticky.ownerDocument.documentElement.dataset.fiche ?? "0");
      const viseMelange = Math.min(2, Math.max(0, fiche));
      melange += (viseMelange - melange) * 0.06;
      if (Math.abs(viseMelange - melange) < 0.0015) melange = viseMelange;

      if (melange !== melangePrec) {
        /* Two legs, one walk: 0 → 1 goes from the car to the satellite,
           1 → 2 from the satellite to the gear. The same linear blend on
           both legs, so the two morphs read as one continuous reshaping. */
        for (let k = 0; k < COUNT * 3; k++) {
          const depuis = melange <= 1 ? formeVoiture[k]! : formeSatellite[k]!;
          const vers = melange <= 1 ? formeSatellite[k]! : formeEngrenage[k]!;
          const part = melange <= 1 ? melange : melange - 1;
          cible[k] = depuis + (vers - depuis) * part;
        }
        melangePrec = melange;
        // Les positions découlent de `cible` : elles doivent être réécrites.
        avancePrec = -1;
      }

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
      const cosA = Math.cos(POSE);
      const sinA = Math.sin(POSE);
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
        // Position on screen. The turntable (Y) then the viewing angle (X);
        // rotation.z is 0. Y mixes X and Z, and X then mixes Y and Z: unlike
        // with the donut, the depth of a point now moves it sideways too.
        const rx = cosA * lx + sinA * lz;
        const rz = -sinA * lx + cosA * lz;
        const sx = 0.5 + (groupe.position.x + rx) / (2 * demiW);
        const sy = 0.5 - (groupe.position.y + cosT * ly - sinT * rz) / (2 * demiH);
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

      /* THE ATTITUDE IS FIXED, ENTIRELY. The car is posed at TILT and POSE and
         never moves again: the arrival of the points is the whole of the
         motion here, and once they have landed the shape holds still, like a
         car photographed on a stand.
         The donut it replaces did turn, and had to: it was a ring drawn at
         random, so only its grain appeared to move. Turning is not free for a
         car. Around Z it would tumble nose over tail; around Y it passes
         through a head-on view where a body three times longer than it is wide
         loses most of its silhouette. Held at three quarters, it reads at every
         moment.
         These three lines are written on every frame rather than once: `spin`
         is shared with the entry animation, and an attitude set only at start-up
         was the old bug — the X and Y angles used to be multiplied by a factor
         that rose from zero, so the form swung into place from a different
         orientation on every visit. */
      spin.rotation.x = TILT;
      spin.rotation.y = POSE;
      spin.rotation.z = 0;

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
