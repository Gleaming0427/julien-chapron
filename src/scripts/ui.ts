// Small UX improvements: smooth scrolling (Lenis), progress bar,
// section reveal, 3D card tilt, back to top, email copy.

import Lenis from "lenis";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface LenisInstance {
  scrollTo(
    target: number | HTMLElement,
    options?: {
      offset?: number;
      duration?: number;
      immediate?: boolean;
      /** Makes the wheel inert for the duration of the journey. */
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

// On every reload, we start at the top of the page: the browser does not
// restore the scroll position.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

// Smooth scrolling, award-winning-site style (Lenis): only if the user
// has not asked to reduce motion.
if (!reducedMotion) {
  const lenis = new Lenis({ duration: 1.1 });
  window.lenis = lenis;
}

/* Shared entrance grid: clearly visible when the block enters the
   screen, it then fades out very gently with the scroll and has
   completely vanished once the block is in place. Reversible without state:
   position does everything, in both directions. */
const skillsBloc = document.querySelector<HTMLElement>(".section-skills");
const footerBloc = document.querySelector<HTMLElement>(".site-footer");
const projetsBloc = document.querySelector<HTMLElement>(".section-projets");

function alphaTrame(top: number, vh: number): number {
  // p: 0 = the block enters the screen, 1 = it has settled. The dots
  // hold full over the first third of the rise, then melt over
  // the rest of the journey.
  const p = Math.min(1, Math.max(0, (vh - top) / vh));
  return Math.min(1, Math.max(0, 1 - (p - 0.3) / 0.7));
}

function trames(): void {
  const vh = window.innerHeight;
  if (skillsBloc) {
    const top = skillsBloc.getBoundingClientRect().top;
    skillsBloc.style.setProperty("--trame-skills", alphaTrame(top, vh).toFixed(4));
  }
  // The dots ARRIVE in the projects block while the footer is
  // approached: nothing over the first half of the block, then they rise
  // from the middle and are full when the footer touches the screen — and
  // they stay, discreet, behind the orange sheet.
  if (footerBloc) {
    const top = footerBloc.getBoundingClientRect().top;
    const alpha = Math.min(1, Math.max(0, 3 - (2 * top) / vh)).toFixed(4);
    footerBloc.style.setProperty("--trame-footer", alpha);
    projetsBloc?.style.setProperty("--trame-projets", alpha);
  }
}

// The loop ALWAYS runs: the carousel fades and the effects
// depend on it — the "reduce motion" preference must not freeze
// the whole staging (the globe, the cloud, the blocks).
const loop = (time: number) => {
  window.lenis?.raf(time);
  /* Le fondu d'un bloc à l'autre rejoint sa cible à chaque image. 0,03 était
     calibré pour un rail de 5,8 écrans traversé par un autoscroll lent : il
     met ~1,7 s à converger, ce qui ajoutait son propre retard au trou décrit
     plus haut. Sur un rail deux fois plus court, parcouru à la molette, ce
     retard se voit. 0,10 converge en ~0,5 s : toujours un fondu, plus une
     traîne. */
  carouselCurrent += (carouselTarget - carouselCurrent) * 0.1;
  applyCarousel();
  trames();
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

// 3D and 2D backgrounds: loaded on demand, in every case — the
// system's "reduce motion" preference must not hide
// the globe or the cloud, otherwise everything looks dead.
{
  import("./hero3d")
    .then((module) => module.initHero3D())
    .catch(() => {
      // WebGL unavailable: the page remains perfectly readable in 2D.
    });
  // The 3D shape of the journey (torus knot in dots) + the --spec-form
  // progress driver.
  import("./specform")
    .then((module) => module.initSpecForm())
    .catch(() => {});
  // The exit from the profile block: the text fades out, then the 3D cloud of
  // the journey takes over on the emptied block.
  import("./profilout")
    .then((module) => module.initProfilOut())
    .catch(() => {});
  // Decoding of the skills block labels, on its entry into the screen.
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

// Smoothed carousel state: the target follows the scroll, the current
// position catches up to it slowly (the wheel can never scroll fast).
const carouselRail = document.querySelector<HTMLElement>(".carousel-rail");
const carouselTrack = document.querySelector<HTMLElement>(".carousel-track");
/* Part de la course du rail allouée au passage d'un bloc au suivant.

   CES POIDS SONT SOLIDAIRES DE LA SORTIE DU PROFIL (profilout.ts) : le texte
   du profil s'efface à 0,92 écran de rail (palier 0,6 + sortie 0,32), et le
   bloc parcours doit être arrivé AU PLUS TARD à ce moment-là. Sinon on ouvre
   un trou où plus rien n'est affiché.

   C'est exactement ce qui s'est produit : à 0,75 le parcours arrivait à 1,44
   écran pour un profil parti à 0,92, soit 0,52 écran — près d'un plein écran
   orange et vide. Le trou existait déjà avant, mais l'autoscroll le traversait
   en montrant l'animation 3D ; en supprimant l'autoscroll, on a découvert le
   vide sans le combler.

   0,25 place l'arrivée à 0,92 écran (0,5 + 0,25/1,5 × 2,5 de course) et amorce
   le fondu d'entrée dès 0,85, pendant que le profil finit de s'effacer : les
   deux blocs se croisent au lieu de se succéder. */
const POIDS = [0.25, 1.25];
const POIDS_TOTAL = POIDS.reduce((a, b) => a + b, 0);

/** Rail progress (0 → 1) converted into block position (0 → 4). */
function positionBloc(p: number): number {
  let reste = p * POIDS_TOTAL;
  for (let i = 0; i < POIDS.length; i++) {
    if (reste <= POIDS[i]) return i + reste / POIDS[i];
    reste -= POIDS[i];
  }
  return POIDS.length;
}

/* La fonction inverse (position de bloc → avancement du rail) servait à
   envoyer le scroll sur une fiche quand on cliquait un point. Les fiches ne
   vivant plus sur l'axe du scroll, elle n'a plus d'emploi. */

/** Position in the carousel, expressed in blocks: 0 = profile, 1 = journey… */
let carouselTarget = 0;
let carouselCurrent = 0;

function applyCarousel(): void {
  // Exposed for the 3D modules: the same truth as the block fades.
  (window as unknown as { __carouselCurrent?: number }).__carouselCurrent = carouselCurrent;
  const items = Array.from(document.querySelectorAll<HTMLElement>(".carousel-item"));
  items.forEach((item, i) => {
    const t = carouselTarget;
    const c = carouselCurrent;
    // The journey (i = 1) holds the whole card parade before giving way.
    const tenue = i === 1 ? 1.0 : 0.95;
    const fadeOut = Math.min(1, Math.max(0, 1 - (t - i - tenue) * 4));
    const arrivee = i;

    const fadeIn = Math.min(1, Math.max(0, 1 - (arrivee - c) * 6));
    item.style.setProperty("--item-op", Math.min(fadeOut, fadeIn).toFixed(3));
  });

  /* Le volet sombre se ferme AVEC l'arrivée du bloc parcours.

     Il ne pouvait pas : --fond-bloc2 est écrit par parcours3d, qui ne tourne
     que si --spec-form > 0, qui ne démarre que quand le bloc est déjà là.
     Dépendance circulaire — le volet arrivait donc toujours APRÈS, et le texte
     du profil, encore à ~10 % sur l'orange, restait parfaitement lisible sous
     le titre et la fiche du parcours. Trois couches de texte superposées.

     Ce second pilote ferme le volet au rythme du bloc. Le fond prend le
     maximum des deux (voir .carousel-rail) : les deux modules écrivent leur
     propre variable et ne se disputent jamais la même. */
  const blocParcours = items[1];
  if (blocParcours && carouselRail) {
    carouselRail.style.setProperty(
      "--volet-entree",
      Number(blocParcours.style.getPropertyValue("--item-op") || "0").toFixed(4),
    );
  }

  // The dot ring of the journey block arrives from the left on each
  // appearance of the block (class removed when the block hides).
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

  // Les fiches ne sont plus rejouées ici : elles ne dépendent plus du scroll.
}

// Section numbers (1-5): entrance from right to left on scroll,
// continuously in both directions.
const numSections = Array.from(document.querySelectorAll<HTMLElement>(".section"));

const header = document.querySelector<HTMLElement>(".site-header");

// --screen (one "screen" of content) equals the window minus the
// sticky header. Measured rather than hard-coded: the header grows when
// the navigation wraps on a small screen.
if (header) {
  const measureHeader = (): void => {
    document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
  };
  measureHeader();
  new ResizeObserver(measureHeader).observe(header);
}

/* The projects arrive from the side, one card out of two from the left, the
   other from the right, staggered. Everything else is in the CSS: this only
   says when. An observer rather than the scroll loop, because the whole
   thing is a transition the compositor plays on its own — nothing to drive
   frame by frame, which is what keeps it smooth on a phone.
   The class is taken away when the frame leaves, so the arrival plays again
   coming back up, like the skills block. A third of the frame in sight is
   enough: waiting for half of it, the first cards were already well into
   the screen when they set off. */
{
  const grille = document.querySelector<HTMLElement>(".projet-grille");
  if (grille) {
    // The hidden state is armed here, not in the stylesheet: if this module
    // never gets this far, the cards stay visible instead of disappearing
    // from the page.
    grille.classList.add("anime");
    // Commit that hidden state before arming the transition, otherwise the
    // four cards fade OUT on load, in full view, before anything can bring
    // them back. Reading a layout property is what forces the flush.
    void grille.offsetWidth;
    grille.classList.add("pret");
    new IntersectionObserver(
      (entrees) => {
        const part = entrees[0]?.intersectionRatio ?? 0;
        // Two thresholds rather than one. With a single one, the cards left
        // again as soon as the frame dropped below it — that is, while 150 px
        // of it were still on screen on the way down, so they slid away under
        // the reader's eyes. It arms at a third in sight and only disarms
        // once the frame is completely gone, ready to play again on the way
        // back up.
        if (part >= 0.3) grille.classList.add("entree");
        else if (part <= 0.01) grille.classList.remove("entree");
      },
      { threshold: [0, 0.3] },
    ).observe(grille);
  }
}

// The white sheet rises over the last screen of the dark part.
const darkZone = document.querySelector<HTMLElement>(".dark-zone");
const tearSheet = document.querySelector<HTMLElement>(".tear-sheet");
const tearWindow = document.querySelector<HTMLElement>(".tear");
const tearFilter = document.querySelector<HTMLElement>(".tear-filter");

/* L'interlude a été supprimé.

   Il partait au seuil du bloc profil : une impulsion de molette, et la page
   défilait seule sur 2,35 écrans pendant 9,7 s, molette verrouillée. Mesuré
   sur le site en ligne, et le verrou n'était même pas étanche — une tentative
   de reprise regagnait 980 px, si bien que la page et le visiteur tiraient le
   scroll chacun de leur côté.

   La mise en scène n'a pas disparu pour autant : elle se joue désormais à son
   propre rythme, déclenchée par l'arrivée du bloc (voir specform.ts). On garde
   le spectacle, sans le facturer en molette ni confisquer le contrôle. */

let ticking = false;

function onScroll(): void {
  const root = document.documentElement;
  const max = root.scrollHeight - root.clientHeight;
  // La barre de navigation ne vit qu'en haut de page.
  root.classList.toggle("defile", root.scrollTop > 40);

  const lu = max > 0 ? root.scrollTop / max : 0;
  progress.style.setProperty("--scroll-pct", lu.toFixed(4));
  if (progressPct) {
    // Three digits, padded with zeros: the width never moves.
    progressPct.textContent = `${String(Math.round(lu * 100)).padStart(3, "0")}%`;
  }

  // What background sits BEHIND the indicator? It is fixed at the middle of the
  // right edge: it is enough to look at what occupies that point. The light zone is
  // orange, except where the journey block's shutter covers it in black — hence
  // the second condition, without which the ink would turn black on black
  // throughout the journey and the skills.
  if (progress && zoneClaire) {
    const cadre = zoneClaire.getBoundingClientRect();
    const milieu = window.innerHeight / 2;
    const dansLaZoneClaire = cadre.top <= milieu && cadre.bottom >= milieu;
    // The panel's coverage is written on the rail (see parcours3d): that is
    // where it is read from, the panel itself only inherits it.
    const volet = Number(
      carouselRail?.style.getPropertyValue("--fond-bloc2") ||
        document.querySelector<HTMLElement>(".parcours-fond")?.style.getPropertyValue("--fond-bloc2") ||
        "0",
    );
    progress.classList.toggle("sur-clair", dansLaZoneClaire && volet < 0.5);
  }

  const vh = window.innerHeight;
  // Cat profil is already present before the scroll: no slide for
  // it (--slide stays at its default value, in place). Pinned
  // blocks are handled further down.

  // The carousel: cat profil is pinned at the center during the first
  // screen of the rail, then the target advances one block per screen of scroll.
  // The smoothing happens in the Lenis loop: whatever we do, the
  // horizontal scrolling stays gentle.
  if (carouselRail) {
    const railTop = carouselRail.getBoundingClientRect().top;
    // The useful course is deduced from the height of the rail: hard-coded,
    // it ended up no longer matching the CSS.
    const course = Math.max(1, carouselRail.offsetHeight - vh * 0.5);
    const p = Math.min(1, Math.max(0, (-railTop - vh * 0.5) / course));
    carouselTarget = positionBloc(p);
    // Approach fade, a fair balance: invisible in the bottom third of
    // the page, the text reveals itself during the middle third and is
    // fully readable on reaching the center.
    const approach = Math.min(1, Math.max(0, railTop / vh));
    document.documentElement.style.setProperty("--profil-op", Math.max(0, 1 - approach * 1.5).toFixed(3));

    /* Sortie du rail. Le bloc parcours n'avait AUCUNE sortie : son fondu vaut
       1 - (t - 2) × 4, or la cible plafonne à 2, donc il ne descendait jamais
       sous 1. Le panneau épinglé se décollait et remontait mécaniquement
       pendant que la section suivante poussait par le bas — les deux à
       l'écran, séparés par une arête franche, et la barre du carrousel
       échouée seule en haut au-dessus d'une bande vide.

       Le fondu suit la SORTIE du panneau, pas son décollage. Calé sur le
       décollage, il était terminé avant que le bloc ne commence à quitter
       l'écran : à 60 px après le décollage, le panneau était éteint alors
       qu'il occupait encore 840 px des 900 de haut, avec seulement 60 px de
       la section suivante en dessous — un écran plat.

       Le bas du rail, ramené à la hauteur d'écran, donne exactement la bonne
       courbe : 1 au décollage (le bas du rail touche le bas de l'écran), 0
       quand le rail se termine, donc quand la section suivante l'a
       entièrement remplacé. */
    const basDuRail = railTop + carouselRail.offsetHeight;
    carouselRail.style.setProperty(
      "--sortie-rail",
      Math.min(1, Math.max(0, basDuRail / vh)).toFixed(3),
    );

    if (reducedMotion) {
      carouselCurrent = carouselTarget;
      applyCarousel();
    }
  }

  // The effect starts when the center of the marquee is at the middle of the screen:
  // the marquee had the whole page to be read.
  const marquee = darkZone?.querySelector<HTMLElement>(".marquee") ?? null;
  const triggerPage = darkZone && marquee
    ? marquee.getBoundingClientRect().top + window.scrollY + marquee.offsetHeight / 2 - vh / 2
    : Infinity;
  const risen = darkZone ? root.scrollTop - triggerPage : Infinity;

  // At the trigger, the bottom of the dark zone is no longer at the bottom of
  // the screen: we measure its gap and lower the sheet by as much,
  // so that the torn edge starts right from the bottom of the screen.
  const darkBottom = darkZone ? darkZone.offsetTop + darkZone.offsetHeight : 0;
  const hang = darkZone && marquee ? Math.max(0, vh - (darkBottom - triggerPage)) : 0;

  if (tearSheet && tearWindow && tearFilter) {
    // The sheet fills its wrapper and grows from the wrapper's bottom edge,
    // which hangs below the tear window by the slack the CSS gives it. So
    // where the torn edge lands is: tear x wrapperHeight - overhang, counted
    // up from the bottom of the window.
    // Both terms are MEASURED, not assumed. They used to be hard-coded as
    // vh/2 and 2vh, which locked the CSS into a slack of exactly half a
    // screen — a slack so large that Safari iOS dropped the filter and the
    // torn edge came up perfectly straight.
    const fenetre = tearWindow.getBoundingClientRect();
    const calque = tearFilter.getBoundingClientRect();
    const debord = calque.bottom - fenetre.bottom;
    const hauteur = calque.height || 1;
    // The "hang" offset lowers the start so that the edge sets off from the
    // very bottom of the screen.
    // The sheet grows one pixel per pixel of scroll, on every screen. It was
    // slowed to 0.35 on touch so the sweep would last longer, and that made
    // it worse, not better: what the phone lacked was not time but frames.
    // Stretched over more of them, the same stutter simply had longer to be
    // seen, and a slow effect that jumps reads as a page that is struggling.
    // The cost is cut in the filter instead — see #ink-edge-fin.
    const scale = (risen - hang + debord) / hauteur;
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
/* The first pass is at the VERY END of the module, not here: see the comment
   that goes with it. */

/* ---------- carrousel d'expériences ----------
   Il était piloté au scroll : chaque fiche coûtait 0,65 écran, dont les deux
   tiers ne bougeaient pas. Mesuré sur le site en ligne : 11 pas de scroll sur
   17 sans le moindre changement à l'écran, puis une bascule brutale. Et les
   fiches se substituaient SUR PLACE, sans aucun déplacement — donc sans le
   moindre indice de direction.

   Un carrousel est une navigation LATÉRALE. La brancher sur l'axe vertical du
   scroll revient à demander au visiteur de déduire un sens de lecture d'un
   geste qui n'a pas le même axe. C'était la cause, pas le réglage.

   Il se pilote donc par un vrai geste : flèches, points, balayage au doigt,
   flèches du clavier. Et les fiches se déplacent, car c'est le déplacement —
   pas le fondu — qui dit où l'on va. */

const expSlides = Array.from(document.querySelectorAll<HTMLElement>(".exp-slides .experience"));
const expDots = Array.from(document.querySelectorAll<HTMLButtonElement>(".exp-dot"));
const expFleches = Array.from(document.querySelectorAll<HTMLButtonElement>(".exp-fleche"));
const expCompteur = document.querySelector<HTMLElement>(".exp-compteur-actuel");

let ficheActive = 0;

function montrerFiche(cible: number): void {
  if (expSlides.length < 2) return;
  const dernier = expSlides.length - 1;
  ficheActive = Math.min(dernier, Math.max(0, cible));

  expSlides.forEach((slide, i) => {
    const ecart = i - ficheActive;
    slide.classList.toggle("is-active", ecart === 0);
    // D'où arrive la fiche et par où elle repart : à gauche si on l'a passée,
    // à droite si elle est encore devant. Ce décalage EST le sens de lecture.
    slide.style.setProperty("--decalage", ecart === 0 ? "0px" : ecart < 0 ? "-90px" : "90px");
    slide.setAttribute("aria-hidden", ecart === 0 ? "false" : "true");
  });

  expDots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === ficheActive);
    dot.setAttribute("aria-selected", i === ficheActive ? "true" : "false");
    // Un seul point dans la tabulation : le groupe se parcourt aux flèches,
    // comme l'attend un role="tablist".
    dot.tabIndex = i === ficheActive ? 0 : -1;
    // --f allume LE point courant, et lui seul. --l remplit la ligne qui mène
    // jusqu'à lui : le chemin parcouru se lit, sans allumer plusieurs points.
    dot.style.setProperty("--f", i === ficheActive ? "1" : "0");
    dot.style.setProperty("--l", i <= ficheActive ? "1" : "0");
  });

  expFleches.forEach((f) => {
    const pas = Number(f.dataset.pas || "0");
    // Désactivée plutôt que masquée : on voit qu'on est au bout de la série
    // au lieu de voir un bouton disparaître.
    f.disabled = ficheActive + pas < 0 || ficheActive + pas > dernier;
  });

  if (expCompteur) expCompteur.textContent = String(ficheActive + 1);
}

if (expSlides.length > 1) {
  expFleches.forEach((f) => {
    f.addEventListener("click", () => montrerFiche(ficheActive + Number(f.dataset.pas || "0")));
  });
  expDots.forEach((dot, i) => dot.addEventListener("click", () => montrerFiche(i)));

  document.querySelector(".exp-carousel")?.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    const pas = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
    if (!pas) return;
    event.preventDefault();
    montrerFiche(ficheActive + pas);
    expDots[ficheActive]?.focus();
  });

  /* Balayage au doigt. Seuil en pixels ET tolérance verticale : sans la
     seconde, un défilement vertical un peu oblique changeait de fiche — soit
     exactement le défaut que cette refonte corrige. */
  const zone = document.querySelector<HTMLElement>(".exp-slides");
  let departX = 0;
  let departY = 0;
  zone?.addEventListener(
    "touchstart",
    (e) => {
      departX = e.changedTouches[0].clientX;
      departY = e.changedTouches[0].clientY;
    },
    { passive: true },
  );
  zone?.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - departX;
      const dy = e.changedTouches[0].clientY - departY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        montrerFiche(ficheActive + (dx < 0 ? 1 : -1));
      }
    },
    { passive: true },
  );

  montrerFiche(0);
}

// The burger: the menu lives on a class set on <html>, closed by a
// click on a link or the Escape key.
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

/* ---------- premier passage ----------
   Volontairement la DERNIÈRE instruction du module. Appelé juste après
   l'enregistrement de l'écouteur de scroll — sa place naturelle — il faisait
   tomber tout le script dès que le système demandait à réduire le mouvement :
   sur cette branche, onScroll() posait lui-même le carrousel, donc appelait
   applyExperiences(), qui lisait `expSlides`, une constante déclarée plus bas
   et donc encore indéfinie. Le script mourait là, emportant tout ce qui se
   mettait en place ensuite.

   Ce piège a disparu avec le pilotage au scroll des fiches, mais l'appel reste
   en dernier : il ne lit que la position du scroll et écrit la mise en scène,
   donc rien au-dessus n'a besoin qu'il arrive plus tôt. */
onScroll();
