// Petites améliorations UX : défilement fluide (Lenis), barre de progression,
// révélation des sections, tilt 3D des cartes, retour en haut, copie d'email.

import Lenis from "lenis";
import { SPEC_CARROUSEL, VITESSE, railPourSpec } from "./specform";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface LenisInstance {
  scrollTo(
    target: number | HTMLElement,
    options?: {
      offset?: number;
      duration?: number;
      immediate?: boolean;
      /** Rend la molette inopérante pendant le trajet. */
      lock?: boolean;
      easing?: (t: number) => number;
      onComplete?: () => void;
    },
  ): void;
  raf(time: number): void;
}

declare global {
  interface Window {
    lenis?: LenisInstance;
  }
}

// À chaque rechargement, on repart en haut de la page : le navigateur ne
// restaure pas la position de défilement.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

// Défilement fluide façon sites primés (Lenis) : uniquement si l'utilisateur
// n'a pas demandé à réduire les animations.
if (!reducedMotion) {
  const lenis = new Lenis({ duration: 1.1 });
  window.lenis = lenis;
}

/* Trame d'entrée partagée : bien visible quand le bloc entre dans
   l'écran, elle s'efface ensuite tout doucement avec le scroll et a
   totalement disparu quand le bloc est en place. Réversible sans état :
   la position fait tout, dans les deux sens. */
const skillsBloc = document.querySelector<HTMLElement>(".section-skills");
const footerBloc = document.querySelector<HTMLElement>(".site-footer");
const projetsBloc = document.querySelector<HTMLElement>(".section-projets");

function alphaTrame(top: number, vh: number): number {
  // p : 0 = le bloc entre dans l'écran, 1 = il est posé. Les points
  // tiennent pleins sur le premier tiers de la montée, puis fondent sur
  // le reste du trajet.
  const p = Math.min(1, Math.max(0, (vh - top) / vh));
  return Math.min(1, Math.max(0, 1 - (p - 0.3) / 0.7));
}

function trames(): void {
  const vh = window.innerHeight;
  if (skillsBloc) {
    const top = skillsBloc.getBoundingClientRect().top;
    skillsBloc.style.setProperty("--trame-skills", alphaTrame(top, vh).toFixed(4));
  }
  // Les points ARRIVENT dans le bloc projets pendant qu'on approche du
  // footer : rien sur la première moitié du bloc, puis ils montent à
  // partir du milieu et sont pleins quand le footer touche l'écran — et
  // ils restent, discrets, derrière la feuille orange.
  if (footerBloc) {
    const top = footerBloc.getBoundingClientRect().top;
    const alpha = Math.min(1, Math.max(0, 3 - (2 * top) / vh)).toFixed(4);
    footerBloc.style.setProperty("--trame-footer", alpha);
    projetsBloc?.style.setProperty("--trame-projets", alpha);
  }
}

// La boucle tourne TOUJOURS : les fondus du carrousel et les effets en
// dépendent — la préférence « réduire les animations » ne doit pas geler
// toute la mise en scène (le globe, le nuage, les blocs).
const loop = (time: number) => {
  window.lenis?.raf(time);
  // Le carrousel glisse vers sa cible à chaque image : quoi que fasse
  // la molette, le mouvement reste lent et doux, impossible d'aller vite.
  carouselCurrent += (carouselTarget - carouselCurrent) * 0.03;
  applyCarousel();
  trames();
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// Fonds 3D et 2D : chargés à la demande, dans tous les cas — la
// préférence « réduire les animations » du système ne doit pas cacher
// le globe ni le nuage, sinon tout semble mort.
{
  import("./hero3d")
    .then((module) => module.initHero3D())
    .catch(() => {
      // WebGL indisponible : la page reste parfaitement lisible en 2D.
    });
  // La forme 3D du parcours (nœud torique en points) + le pilote de
  // progression --spec-form.
  import("./specform")
    .then((module) => module.initSpecForm())
    .catch(() => {});
  // La sortie du bloc profil : le texte s'efface, puis le nuage 3D du
  // parcours prend le relais sur le bloc vidé.
  import("./profilout")
    .then((module) => module.initProfilOut())
    .catch(() => {});
  // Décodage des libellés du bloc compétences, à son entrée à l'écran.
  import("./decodage")
    .then((module) => module.initDecodage())
    .catch(() => {});
  import("./parcours3d")
    .then((module) => module.initParcours3D())
    .catch(() => {});
}

const progress = document.getElementById("scroll-progress") as HTMLDivElement;
const progressPct = progress?.querySelector<HTMLElement>(".pct") ?? null;
const zoneClaire = document.querySelector<HTMLElement>(".light-zone");

// État lissé du carrousel : la cible suit le scroll, la position courante
// la rattrape lentement (la molette ne peut jamais faire défiler vite).
const carouselRail = document.querySelector<HTMLElement>(".carousel-rail");
const carouselTrack = document.querySelector<HTMLElement>(".carousel-track");
// Part de la course du rail allouée à chaque passage d'un bloc au suivant,
// en écrans de scroll. Répartir à parts égales revenait à faire payer au
// bloc 1, qui n'a qu'un fondu à jouer, le même prix qu'au bloc 2, qui doit
// loger le défilé des trois fiches d'expérience.
// Le rail ne contient plus que deux blocs : le profil et le parcours. Les
// suivants sont redevenus des sections normales, qu'on atteint en faisant
// défiler la page. Ces deux poids placent l'arrivée du parcours à 2,0 écrans
// de rail — juste avant que les fiches ne commencent à défiler, à 2,295.
const POIDS = [0.75, 1.25];
const POIDS_TOTAL = POIDS.reduce((a, b) => a + b, 0);

/** Avancement du rail (0 → 1) converti en position de bloc (0 → 4). */
function positionBloc(p: number): number {
  let reste = p * POIDS_TOTAL;
  for (let i = 0; i < POIDS.length; i++) {
    if (reste <= POIDS[i]) return i + reste / POIDS[i];
    reste -= POIDS[i];
  }
  return POIDS.length;
}

/** L'inverse : une position de bloc rendue en avancement du rail. */
function railPour(bloc: number): number {
  let acc = 0;
  for (let i = 0; i < POIDS.length; i++) {
    if (bloc <= i + 1) return (acc + Math.max(0, bloc - i) * POIDS[i]) / POIDS_TOTAL;
    acc += POIDS[i];
  }
  return 1;
}

/** Position dans le carrousel, exprimée en blocs : 0 = profil, 1 = parcours… */
let carouselTarget = 0;
let carouselCurrent = 0;

function applyCarousel(): void {
  // Exposé pour les modules 3D : la même vérité que les fondus des blocs.
  (window as unknown as { __carouselCurrent?: number }).__carouselCurrent = carouselCurrent;
  const items = Array.from(document.querySelectorAll<HTMLElement>(".carousel-item"));
  items.forEach((item, i) => {
    const t = carouselTarget;
    const c = carouselCurrent;
    // Le parcours (i = 1) tient tout le défilé des fiches avant de céder.
    const tenue = i === 1 ? 1.0 : 0.95;
    const fadeOut = Math.min(1, Math.max(0, 1 - (t - i - tenue) * 4));
    const arrivee = i;

    const fadeIn = Math.min(1, Math.max(0, 1 - (arrivee - c) * 6));
    item.style.setProperty("--item-op", Math.min(fadeOut, fadeIn).toFixed(3));
  });

  // L'anneau de points du bloc parcours arrive de la gauche à chaque
  // apparition du bloc (classe retirée quand le bloc se cache).
  const specForm = document.querySelector<HTMLElement>(".spec-form");
  if (specForm) {
    const formItem = specForm.closest<HTMLElement>(".carousel-item");
    const formOp = Number(formItem?.style.getPropertyValue("--item-op") || "0");
    if (formOp < 0.1) {
      specForm.classList.remove("is-forming");
    } else {
      specForm.classList.add("is-forming");
    }
  }

  applyExperiences();
}

// Numéros de section (1-5) : entrée de la droite vers la gauche au scroll,
// en continu dans les deux sens.
const numSections = Array.from(document.querySelectorAll<HTMLElement>(".section"));

const header = document.querySelector<HTMLElement>(".site-header");

// --screen (un « écran » de contenu) vaut la fenêtre moins le header
// collant. Mesuré plutôt que codé en dur : le header grandit quand la
// navigation passe à la ligne sur petit écran.
if (header) {
  const measureHeader = (): void => {
    document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
  };
  measureHeader();
  new ResizeObserver(measureHeader).observe(header);
}

// La feuille blanche monte sur le dernier écran de la partie sombre.
const darkZone = document.querySelector<HTMLElement>(".dark-zone");
const tearSheet = document.querySelector<HTMLElement>(".tear-sheet");

/* ---------- l'interlude profil → parcours se joue tout seul ----------
   Passé le seuil, la page se déroule d'elle-même jusqu'à l'arrivée complète
   du bloc parcours : le texte se pose sans qu'on ait à scroller. Au terme
   exact de cette course, le carrousel des fiches prend le relais et la
   molette retrouve la main.

   On anime la position de DÉFILEMENT, pas l'état interne. Le défilement est
   déjà la source unique dont dépendent le fond 3D, les fondus de blocs et le
   carrousel : en le pilotant lui, les trois restent d'accord entre eux, alors
   que forcer l'état les aurait fait diverger de la position réelle. */
/* Une simple impulsion de molette suffit à tout lancer : on lit le profil,
   on pousse une fois, et le donut comme le titre du parcours arrivent seuls.
   Le seuil de parcours3d (0,65 écran) est franchi PENDANT ce trajet
   automatique, donc le donut se déclenche de lui-même en cours de route —
   les deux seuils n'ont plus à être calés l'un sur l'autre. */
const SEUIL_INTERLUDE = 0.12; // ~90 px : une poussée voulue, pas un frôlement
const REARMEMENT = 0.02;      // il faut vraiment être revenu en haut du rail
let interludeJoue = false;
let interludeEnCours = false;

function interlude(railTop: number, vh: number): void {
  const lenis = window.lenis;
  if (!lenis || interludeEnCours) return;

  const sortie = -railTop / vh;
  if (sortie < REARMEMENT) interludeJoue = false;
  if (interludeJoue || sortie < SEUIL_INTERLUDE) return;

  // Terme de la course : le point où le carrousel des fiches prend la main.
  // C'est --spec-form qui orchestre l'intérieur du bloc (le titre de gauche
  // n'apparaît qu'à 0,715, le carrousel à 0,84) — viser carouselTarget = 1,
  // comme je le faisais, s'arrêtait à 2,01 écrans alors que le titre n'est
  // lisible qu'à 2,63 : il restait forcément de la molette à donner.
  const cible = railTop + window.scrollY + railPourSpec(SPEC_CARROUSEL) * vh;
  // Si la molette a déjà dépassé ce point, ne pas tirer la page en arrière.
  if (window.scrollY >= cible - 2) return;

  // Durée indexée sur la distance réelle : la séquence garde la même vitesse
  // apparente quelle que soit la hauteur du rail. En dur, elle se mettait à
  // filer dès qu'on rallongeait le rail.
  const distanceEcrans = (cible - window.scrollY) / vh;
  // La durée n'est plus un réglage libre : c'est la chorégraphie qui impose
  // la vitesse. Les intervalles voulus entre l'arrivée du donut, le titre et
  // le carrousel sont fixés en parts de --spec-form ; pour qu'ils durent
  // vraiment 2 s et 1 s, le défilement doit tenir VITESSE écrans par seconde.
  const duree = Math.max(2.4, distanceEcrans / VITESSE);

  interludeJoue = true;
  interludeEnCours = true;
  lenis.scrollTo(cible, {
    duration: duree,
    lock: true,
    // Départ et arrivée adoucis : la page s'ébranle et se pose au lieu de
    // filer à vitesse constante.
    easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    onComplete: () => {
      interludeEnCours = false;
    },
  });
}

let ticking = false;

function onScroll(): void {
  const root = document.documentElement;
  const max = root.scrollHeight - root.clientHeight;
  const lu = max > 0 ? root.scrollTop / max : 0;
  progress.style.setProperty("--scroll-pct", lu.toFixed(4));
  if (progressPct) {
    // Trois chiffres, complétés par des zéros : la largeur ne bouge jamais.
    progressPct.textContent = `${String(Math.round(lu * 100)).padStart(3, "0")}%`;
  }

  // Quel fond se trouve DERRIÈRE l'indicateur ? Il est fixe au milieu du bord
  // droit : il suffit de regarder ce qui occupe ce point. La zone claire est
  // orange, sauf là où le volet du bloc parcours la recouvre de noir — d'où
  // la seconde condition, sans laquelle l'encre passerait au noir sur noir
  // pendant tout le parcours et les compétences.
  if (progress && zoneClaire) {
    const cadre = zoneClaire.getBoundingClientRect();
    const milieu = window.innerHeight / 2;
    const dansLaZoneClaire = cadre.top <= milieu && cadre.bottom >= milieu;
    const volet = Number(
      document.querySelector<HTMLElement>(".parcours-fond")?.style.getPropertyValue("--fond-bloc2") ||
        "0",
    );
    progress.classList.toggle("sur-clair", dansLaZoneClaire && volet < 0.5);
  }

  const vh = window.innerHeight;
  // Cat profil est déjà présent avant le scroll : aucun glissement pour
  // lui (--slide reste à sa valeur par défaut, en place). Les blocs
  // épinglés sont gérés plus bas.

  // Le carrousel : cat profil est épinglé au centre pendant le premier
  // écran du rail, puis la cible avance d'un bloc par écran de scroll.
  // Le lissage se fait dans la boucle Lenis : quoi qu'on fasse, le
  // défilement horizontal reste doux.
  if (carouselRail) {
    const railTop = carouselRail.getBoundingClientRect().top;
    // La course utile se déduit de la hauteur du rail : en la codant en dur,
    // elle finissait par ne plus correspondre au CSS.
    const course = Math.max(1, carouselRail.offsetHeight - vh * 0.5);
    const p = Math.min(1, Math.max(0, (-railTop - vh * 0.5) / course));
    carouselTarget = positionBloc(p);
    // Sans Lenis (reduced motion), window.lenis n'existe pas et l'interlude
    // ne se joue pas : la molette garde la main d'un bout à l'autre.
    interlude(railTop, vh);
    // Fondu d'approche, juste équilibre : invisible dans le tiers bas de
    // la page, le texte se révèle pendant le tiers du milieu et est
    // pleinement lisible en arrivant au centre.
    const approach = Math.min(1, Math.max(0, railTop / vh));
    document.documentElement.style.setProperty("--profil-op", Math.max(0, 1 - approach * 1.5).toFixed(3));
    if (reducedMotion) {
      carouselCurrent = carouselTarget;
      applyCarousel();
    }
  }

  // L'effet démarre quand le centre du bandeau est au milieu de l'écran :
  // le bandeau a eu toute la page pour se faire lire.
  const marquee = darkZone?.querySelector<HTMLElement>(".marquee") ?? null;
  const triggerPage = darkZone && marquee
    ? marquee.getBoundingClientRect().top + window.scrollY + marquee.offsetHeight / 2 - vh / 2
    : Infinity;
  const risen = darkZone ? root.scrollTop - triggerPage : Infinity;

  // Au déclenchement, le pied de la zone sombre n'est plus au bas de
  // l'écran : on mesure son écart et on descend la feuille d'autant,
  // pour que le bord déchiré parte pile du bas de l'écran.
  const darkBottom = darkZone ? darkZone.offsetTop + darkZone.offsetHeight : 0;
  const hang = darkZone && marquee ? Math.max(0, vh - (darkBottom - triggerPage)) : 0;

  if (tearSheet) {
    // La feuille est ancrée vh/2 sous la fenêtre (inset -50vh du CSS) et
    // grandit deux fois plus vite que le scroll ; le décalage « hang »
    // la descend pour que son bord parte exactement du bas de l'écran.
    const scale = (vh / 2 - hang + risen) / (vh * 2);
    tearSheet.style.setProperty("--tear", Math.min(1, Math.max(0, scale)).toFixed(4));
  }
}

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
    }
  },
  { passive: true },
);
onScroll();

// Carrousel des expériences, piloté par le scroll. La position des fiches
// est lissée : elle rattrape lentement la cible — à l'apparition du
// carrousel on est sur la fiche 1, et la molette ne saute jamais de fiche.
let fichePosition = 0;

// Carrousel des expériences, piloté par le scroll. Le bloc 2 occupe un
// quart de la course du rail ; on y loge le passage des trois fiches.
// Les fiches descendent : la sortante s'en va par le bas, la suivante
// arrive par le haut.
const expSlides = Array.from(document.querySelectorAll<HTMLElement>(".exp-slides .experience"));
const expDots = Array.from(document.querySelectorAll<HTMLButtonElement>(".exp-dot"));

/** Position continue dans le carrousel des expériences (0 → n-1). */
function applyExperiences(): void {
  if (expSlides.length < 2) return;
  const dernier = expSlides.length - 1;

  // Les fiches restent sur la PREMIÈRE tant que le carrousel n'est pas
  // pleinement visible (--spec-form < 0,84). Ensuite, chaque carte avance
  // d'environ deux gestes de molette (0,5 écran). La position est lissée :
  // le carrousel commence toujours à l'étape 1, jamais à la 2.
  const section = document.querySelector<HTMLElement>(".section-exp");
  const spec = Number(section?.style.getPropertyValue("--spec-form") || "0");
  const railTop = carouselRail.getBoundingClientRect().top;
  const vh = window.innerHeight;
  let cibleFiches = 0;
  if (spec >= SPEC_CARROUSEL) {
    // Les fiches démarrent PILE là où l'interlude rend la main, pas plus
    // loin. Ce point était écrit en dur (2,78) et n'a jamais suivi les
    // déplacements de la fin d'interlude : il restait 0,485 écran de course
    // morte où l'on scrollait sans que rien ne bouge, soit 1,5 geste gaspillé
    // avant la première carte. Calé sur la valeur partagée, il ne peut plus
    // dériver. Ensuite, exactement deux gestes de molette par carte.
    const depart = railPourSpec(SPEC_CARROUSEL);
    cibleFiches = Math.min(dernier, Math.max(0, (-railTop / vh - depart) / 0.65));
  }
  fichePosition += (cibleFiches - fichePosition) * 0.12;
  const prog = fichePosition;

  // Courbe à paliers : la fiche reste immobile sur les deux tiers de sa
  // portion de scroll, et bascule sur le tiers du milieu. Sans ça, elle
  // glisse en permanence et on ne s'arrête jamais sur celle qui est nette.
  const indice = Math.floor(prog);
  const reste = prog - indice;
  const DEBUT = 0.34; // part de course où la fiche ne bouge pas encore
  const FIN = 0.66;   // part où la suivante est déjà posée
  const brut = Math.min(1, Math.max(0, (reste - DEBUT) / (FIN - DEBUT)));
  const bascule = brut * brut * (3 - 2 * brut); // adoucissement aux deux bouts
  const posee = Math.min(dernier, indice + bascule);

  expSlides.forEach((slide, i) => {
    const loin = Math.abs(posee - i);
    // Les fiches ne se déplacent pas : elles se substituent l'une à l'autre
    // sur place, par la seule mise au point. Un glissement, même léger,
    // faisait bouger la colonne entière à chaque cran de molette.
    slide.style.opacity = Math.max(0, 1 - loin * 1.9).toFixed(3);
    // La fiche courante seule reste cliquable et lisible.
    slide.style.visibility = loin < 0.5 ? "visible" : "hidden";
  });

  const actif = Math.round(posee);
  expDots.forEach((dot, i) => {
    // Remplissage du point et de son trait d'arrivée, en continu. Le premier
    // point est plein d'entrée de jeu : on est déjà dessus. Les suivants se
    // remplissent pendant le trajet qui y mène, d'où le décalage de 1.
    const part = Math.min(1, Math.max(0, posee - i + 1));
    dot.style.setProperty("--f", part.toFixed(4));
    dot.classList.toggle("is-active", i === actif);
    dot.setAttribute("aria-selected", i === actif ? "true" : "false");
  });
}

// Cliquer une puce fait défiler la page jusqu'à la position correspondante :
// sans ça, le scroll écraserait le choix à l'image suivante.
if (expSlides.length > 1 && carouselRail) {
  const dernier = expSlides.length - 1;
  expDots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      const vh = window.innerHeight;
      const railDoc = carouselRail.getBoundingClientRect().top + window.scrollY;
      // Même course que dans onScroll : codée en dur, elle cessait de
      // correspondre dès qu'on touchait à la hauteur du rail.
      const course = Math.max(1, carouselRail.offsetHeight - vh * 0.5);
      const cible = railDoc + vh * 0.5 + railPour(1 + (i / dernier) * 0.68) * course;
      const lenis = window.lenis;
      if (lenis) lenis.scrollTo(cible);
      else window.scrollTo({ top: cible, behavior: "smooth" });
    });
  });

  document.querySelector(".exp-dots")?.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    const pas = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
    if (!pas) return;
    event.preventDefault();
    const actuel = expDots.findIndex((d) => d.classList.contains("is-active"));
    const suivant = Math.min(dernier, Math.max(0, actuel + pas));
    expDots[suivant]?.click();
    expDots[suivant]?.focus();
  });
}

// Le burger : le menu vit sur une classe posée sur <html>, fermé par un
// clic sur un lien ou la touche Échap.
const burger = document.querySelector<HTMLButtonElement>(".burger");
const voile = document.querySelector<HTMLElement>(".menu-voile");

if (burger && voile) {
  const ouvrir = (ouvert: boolean): void => {
    document.documentElement.classList.toggle("menu-ouvert", ouvert);
    burger.setAttribute("aria-expanded", ouvert ? "true" : "false");
    voile.setAttribute("aria-hidden", ouvert ? "false" : "true");
  };
  burger.addEventListener("click", () => {
    ouvrir(!document.documentElement.classList.contains("menu-ouvert"));
  });
  voile.querySelectorAll("a").forEach((lien) => {
    lien.addEventListener("click", () => ouvrir(false));
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ouvrir(false);
  });
}
