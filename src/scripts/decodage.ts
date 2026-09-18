// Decoding effect on the labels of the skills block: each character
// cycles through foreign glyphs before locking in, from left to right.
// The glyphs turn orange for the duration of the scramble. Triggered on
// the block's entry into the screen, replayed on every return, then relaunched
// in a loop on a small SAMPLE of labels: while one reads the
// table, a few skills scramble from time to time in
// Japanese before returning to French.

/** Glyph reservoir: KANA, not kanji. The ideograms this list used to hold
    are common to Japanese and Chinese, and therefore read as Chinese. The
    katakana — the script reserved for words from abroad, hence for
    technical vocabulary — leave no ambiguity, and their angular strokes
    suit the block's register. A few hiragana mix in to break the
    regularity. */
const GLYPHES =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンあかさたなはまやらわをんきしちにひみりゐゑ";

/** Duration of the scramble of one character, in milliseconds. */
const BROUILLAGE = 480;
/** Offset between two neighbouring characters: it is what makes the wave. */
const PAS_CARACTERE = 40;
/** Offset between two labels: the table decodes from top to bottom. */
const PAS_LIBELLE = 100;

/* The periodic relaunch: a small random batch scrambles from time to
   time, the rest of the table stays readable. */
const TAILLE_LOT = 3;
const PERIODE_MIN = 2500;
const PERIODE_MAX = 4000;

const glyphe = (): string => GLYPHES[Math.floor(Math.random() * GLYPHES.length)]!;

/** The label is injected as HTML to color the glyphs: the French
    characters therefore go through this escaping. */
const echapper = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A character that does not scramble: separators and spaces
    keep the silhouette of the word readable throughout the effect. */
const fixe = (c: string): boolean => /[\s·.,/()+&—-]/.test(c);

interface Libelle {
  el: HTMLElement;
  texte: string;
  depart: number;
}

export function initDecodage(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const bloc = document.querySelector<HTMLElement>(".section-skills");
  if (!bloc) return;

  // The family headings then the technologies, in document order:
  // the wave therefore descends the table as one reads it.
  const cibles = Array.from(
    bloc.querySelectorAll<HTMLElement>(".skill-cat, .skill-items li"),
  );
  if (!cibles.length) return;

  const libelles: Libelle[] = cibles.map((el, i) => ({
    el,
    texte: el.textContent ?? "",
    depart: i * PAS_LIBELLE,
  }));

  /** Freezes the width of each label of the BATCH on its final text. Without this,
      the ideograms — twice as wide as a Latin letter — would make
      the whole table swell then deflate on every frame. */
  const figerLesLargeurs = (lot: Libelle[]): void => {
    for (const l of lot) {
      l.el.style.minWidth = "";
      const largeur = l.el.getBoundingClientRect().width;
      l.el.style.minWidth = `${Math.ceil(largeur)}px`;
      l.el.style.display = "inline-block";
      l.el.style.whiteSpace = "nowrap";
    }
  };

  let animation = 0;
  let cycle = false;

  /** Puts all the labels back in French and releases the layout —
      interrupting a cycle never leaves a glyph behind it. */
  const restaurer = (): void => {
    cancelAnimationFrame(animation);
    cycle = false;
    for (const l of libelles) {
      l.el.textContent = l.texte;
      l.el.style.minWidth = "";
      l.el.style.display = "";
      l.el.style.whiteSpace = "";
    }
  };

  /** Plays the scramble → French on a batch of labels. */
  const jouer = (lot: Libelle[]): void => {
    restaurer();
    cycle = true;
    figerLesLargeurs(lot);
    const debut = performance.now();

    const image = (): void => {
      const t = performance.now() - debut;
      let enCours = false;

      for (const l of lot) {
        let sortie = "";
        for (let i = 0; i < l.texte.length; i++) {
          const c = l.texte[i]!;
          if (fixe(c)) {
            sortie += echapper(c);
            continue;
          }
          const ouverture = l.depart + i * PAS_CARACTERE;
          if (t < ouverture) {
            // Not its turn yet: the character stays in French. The
            // wave of glyphs is thus only seen where it passes, from
            // left to right — never the whole text at once.
            sortie += echapper(c);
          } else if (t < ouverture + BROUILLAGE) {
            // Currently scrambling: a glyph, in orange for the time of
            // the effect. The site's orange (#ff4d00) is lightened: the
            // ideograms are fine strokes that grey out at this size
            // on a black background — lightened, the eye finds the same orange there.
            sortie += `<span style="color:#ff7133">${glyphe()}</span>`;
            enCours = true;
          } else {
            sortie += echapper(c);
          }
        }
        l.el.innerHTML = sortie;
      }

      if (enCours) {
        animation = requestAnimationFrame(image);
      } else {
        // Done: we hand back control to the layout.
        cycle = false;
        for (const l of lot) {
          l.el.textContent = l.texte;
          l.el.style.minWidth = "";
          l.el.style.display = "";
          l.el.style.whiteSpace = "";
        }
      }
    };

    image();
  };

  // Relaunches in a loop as long as the block is on screen: a small random
  // batch scrambles, returns to French, and the next one is
  // scheduled. The block's entry plays the whole table, as before.
  let dedans = false;
  let minuterie = 0;

  const programmer = (): void => {
    minuterie = window.setTimeout(() => {
      if (!dedans) return; // out of the screen: the chain stops
      if (document.hidden || cycle) {
        // Tab in the background or cycle in progress: we politely postpone it.
        minuterie = window.setTimeout(programmer, 600);
        return;
      }
      const lot = [...libelles]
        .sort(() => Math.random() - 0.5)
        .slice(0, TAILLE_LOT)
        // The batch replays the small wave: each label starts after the
        // previous one. Copies, so as not to overwrite the entrance start.
        .map((l, i) => ({ ...l, depart: i * PAS_LIBELLE }));
      jouer(lot);
      programmer();
    }, PERIODE_MIN + Math.random() * (PERIODE_MAX - PERIODE_MIN));
  };

  // Replayed on every entry of the block into the screen, not just the first:
  // scrolling back up shows the effect again, like the rest of the site.
  new IntersectionObserver(
    (entrees) => {
      const visible = entrees[0]?.isIntersecting ?? false;
      if (visible && !dedans) {
        window.clearTimeout(minuterie);
        jouer(libelles);
        programmer();
      }
      dedans = visible;
    },
    { threshold: 0.35 },
  ).observe(bloc);
}
