// Small UX improvements: smooth scrolling (Lenis), progress bar,
// section reveal, 3D card tilt, back to top, email copy.

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
  // The carousel slides toward its target on every frame: whatever the
  // wheel does, the movement stays slow and gentle, impossible to speed up.
  carouselCurrent += (carouselTarget - carouselCurrent) * 0.03;
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
// Share of the rail's course allotted to each transition from one block to
// the next, in screens of scroll. Splitting equally meant making block 1,
// which only has a fade to play, pay the same price as block 2, which has to
// fit the parade of the three experience cards.
// The rail now holds only two blocks: the profile and the journey. The
// following ones are normal sections again, reached by scrolling
// the page. These two weights place the journey's arrival at 2.0 rail
// screens — just before the cards start scrolling, at 2.295.
const POIDS = [0.75, 1.25];
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

/** The inverse: a block position rendered as rail progress. */
function railPour(bloc: number): number {
  let acc = 0;
  for (let i = 0; i < POIDS.length; i++) {
    if (bloc <= i + 1) return (acc + Math.max(0, bloc - i) * POIDS[i]) / POIDS_TOTAL;
    acc += POIDS[i];
  }
  return 1;
}

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

  applyExperiences();
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

/* ---------- the profile → journey interlude plays itself ----------
   Past the threshold, the page unwinds on its own until the journey block
   has fully arrived: the text settles without any need to scroll. At the exact
   end of that run, the card carousel takes over and the
   wheel has the hand again.

   We animate the SCROLL position, not the internal state. The scroll is
   already the single source on which the 3D background, the block fades and the
   carousel depend: by driving it, the three stay in agreement with each other,
   whereas forcing the state would have made them diverge from the real position. */
/* A single wheel impulse is enough to launch everything: we read the profile,
   we push once, and both the donut and the journey title arrive on their own.
   The parcours3d threshold (0.65 screen) is crossed DURING this automatic
   travel, so the donut triggers itself along the way —
   the two thresholds no longer have to be lined up with each other. */
/** Écran tactile : pas de souris, donc pas de molette à verrouiller. */
const TACTILE = window.matchMedia("(pointer: coarse)").matches;

const SEUIL_INTERLUDE = 0.12; // ~90 px: a deliberate push, not a brush
// Réarmement à 0,10 : dès qu'on est revenu au-dessus du point de
// déclenchement, l'interlude peut rejouer. À 0,02 il fallait retomber à 2 %
// d'écran du tout début du rail — un retour partiel, le geste normal, le
// laissait désarmé et redescendre ne déclenchait plus rien. La bande entre
// 0,10 et 0,12 suffit à éviter tout va-et-vient : une fois parti, le
// défilement saute à 2,6 écrans, très loin du seuil.
const REARMEMENT = 0.1;      // one must really be back at the top of the rail
let interludeJoue = false;
let interludeEnCours = false;

function interlude(railTop: number, vh: number): void {
  const lenis = window.lenis;
  if (!lenis || interludeEnCours) return;

  const sortie = -railTop / vh;
  if (sortie < REARMEMENT) interludeJoue = false;
  if (interludeJoue || sortie < SEUIL_INTERLUDE) return;

  // End of the run: the point where the card carousel takes over.
  // It is --spec-form that orchestrates the inside of the block (the left title
  // only appears at 0.715, the carousel at 0.84) — aiming for carouselTarget = 1,
  // as I used to, stopped at 2.01 screens while the title is only
  // readable at 2.63: there was inevitably wheel left to give.
  const cible = railTop + window.scrollY + railPourSpec(SPEC_CARROUSEL) * vh;
  // If the wheel has already passed this point, do not pull the page back.
  if (window.scrollY >= cible - 2) return;

  // Duration indexed on the real distance: the sequence keeps the same apparent
  // speed whatever the height of the rail. Hard-coded, it started
  // racing as soon as the rail was made longer.
  const distanceEcrans = (cible - window.scrollY) / vh;
  // The duration is no longer a free setting: the choreography imposes
  // the speed. The intended intervals between the arrival of the donut, the title and
  // the carousel are set in shares of --spec-form; for them to really last
  // 2 s and 1 s, the scroll must hold VITESSE screens per second.
  // Au tactile, la séquence est écourtée : neuf secondes pendant lesquelles
  // le doigt ne répond pas ne se lisent pas comme une mise en scène, mais
  // comme une page figée.
  // Au tactile la séquence était plafonnée à 4,5 s, pour une course qui en
  // demande une douzaine : les points du donut arrivaient deux fois et demie
  // trop vite, en un jet qu'on ne lit pas. Le plafond visait une page qui ne
  // répond plus, mais le verrou est déjà levé au doigt (lock ci-dessous) —
  // on peut donc laisser la scène prendre son temps sans rien bloquer.
  const duree = TACTILE
    ? Math.min(8, Math.max(2.4, distanceEcrans / VITESSE))
    : Math.max(2.4, distanceEcrans / VITESSE);

  interludeJoue = true;
  interludeEnCours = true;
  lenis.scrollTo(cible, {
    duration: duree,
    // Le verrou n'a de sens qu'à la molette. Au doigt, il transforme chaque
    // geste ignoré en soupçon de bug : on laisse donc la main reprendre le
    // dessus dès qu'on touche l'écran, et la séquence se joue seule si on
    // ne touche à rien.
    lock: !TACTILE,
    // Smoothed start and arrival: the page sets off and settles instead of
    // racing at constant speed.
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
    // Without Lenis (reduced motion), window.lenis does not exist and the interlude
    // does not play: the wheel keeps the hand from start to finish.
    interlude(railTop, vh);
    // Approach fade, a fair balance: invisible in the bottom third of
    // the page, the text reveals itself during the middle third and is
    // fully readable on reaching the center.
    const approach = Math.min(1, Math.max(0, railTop / vh));
    document.documentElement.style.setProperty("--profil-op", Math.max(0, 1 - approach * 1.5).toFixed(3));
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

// Experience carousel, driven by the scroll. The position of the cards
// is smoothed: it slowly catches up to the target — when the carousel
// appears we are on card 1, and the wheel never jumps a card.
let fichePosition = 0;

// Experience carousel, driven by the scroll. Block 2 occupies a
// quarter of the rail's course; we fit the passing of the three cards there.
// The cards go down: the outgoing one leaves through the bottom, the next
// arrives from the top.
const expSlides = Array.from(document.querySelectorAll<HTMLElement>(".exp-slides .experience"));
const expDots = Array.from(document.querySelectorAll<HTMLButtonElement>(".exp-dot"));

/** Continuous position in the experience carousel (0 → n-1). */
function applyExperiences(): void {
  if (expSlides.length < 2) return;
  const dernier = expSlides.length - 1;

  // The cards stay on the FIRST one as long as the carousel is not
  // fully visible (--spec-form < 0.84). Then each card advances
  // by about two wheel gestures (0.5 screen). The position is smoothed:
  // the carousel always starts at step 1, never at step 2.
  const section = document.querySelector<HTMLElement>(".section-exp");
  const spec = Number(section?.style.getPropertyValue("--spec-form") || "0");
  const railTop = carouselRail.getBoundingClientRect().top;
  const vh = window.innerHeight;
  let cibleFiches = 0;
  if (spec >= SPEC_CARROUSEL) {
    // The cards start EXACTLY where the interlude hands back, no
    // further. This point was hard-coded (2.78) and never followed the
    // shifts of the interlude's end: 0.485 screen of dead course
    // remained, where one scrolled with nothing moving — 1.5 gestures
    // wasted before the first card. Tied to the shared value, it can no
    // longer drift. Then, exactly two wheel gestures per card.
    const depart = railPourSpec(SPEC_CARROUSEL);
    cibleFiches = Math.min(dernier, Math.max(0, (-railTop / vh - depart) / 0.65));
  }
  fichePosition += (cibleFiches - fichePosition) * 0.12;
  const prog = fichePosition;

  // Stepped curve: the card stays still over the two thirds of its
  // scroll portion, and flips over the middle third. Without this, it
  // slides constantly and one never stops on the one that is sharp.
  const indice = Math.floor(prog);
  const reste = prog - indice;
  const DEBUT = 0.34; // share of the course where the card does not move yet
  const FIN = 0.66;   // share where the next one is already settled
  const brut = Math.min(1, Math.max(0, (reste - DEBUT) / (FIN - DEBUT)));
  const bascule = brut * brut * (3 - 2 * brut); // easing at both ends
  const posee = Math.min(dernier, indice + bascule);

  expSlides.forEach((slide, i) => {
    const loin = Math.abs(posee - i);
    // The cards do not move: they substitute for one another
    // in place, through focus alone. A slide, even a slight one,
    // made the whole column move at each wheel notch.
    slide.style.opacity = Math.max(0, 1 - loin * 1.9).toFixed(3);
    // Only the current card stays clickable and readable.
    slide.style.visibility = loin < 0.5 ? "visible" : "hidden";
  });

  const actif = Math.round(posee);
  expDots.forEach((dot, i) => {
    // Fill of the dot and its finish line, continuously. The first
    // dot is full from the start: we are already on it. The following ones
    // fill during the travel that leads there, hence the offset of 1.
    const part = Math.min(1, Math.max(0, posee - i + 1));
    dot.style.setProperty("--f", part.toFixed(4));
    dot.classList.toggle("is-active", i === actif);
    dot.setAttribute("aria-selected", i === actif ? "true" : "false");
  });
}

// Clicking a dot scrolls the page to the corresponding position:
// without this, the scroll would overwrite the choice on the next frame.
if (expSlides.length > 1 && carouselRail) {
  const dernier = expSlides.length - 1;
  expDots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      const vh = window.innerHeight;
      const railDoc = carouselRail.getBoundingClientRect().top + window.scrollY;
      // Same course as in onScroll: hard-coded, it stopped
      // matching as soon as the rail's height was touched.
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

/* ---------- first pass ----------
   Deliberately the LAST statement of the module. Called right after the
   scroll listener was registered — its natural place — it took the whole
   script down as soon as the system asks to reduce motion: on that branch
   onScroll() settles the carousel itself, hence applyExperiences(), which
   reads `expSlides` — a constant declared further down, so still undefined
   at that moment. The script died there, and with it everything set up
   after: the parcours block stayed on its orange background from end to
   end, the experience dots did nothing and the burger no longer opened.
   Nothing above needs this call to happen earlier: it only reads the scroll
   position and writes the staging. */
onScroll();
