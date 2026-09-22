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

  /* On a touch screen the labels wrap tightly. The glyphs come from the
     system's Japanese font, whose advance width and line box are BOTH
     larger than the Latin font's: at full size a glyph re-wraps the row
     and grows the line, and the whole table jumps on every cycle. Shrunk
     to about half, the kana fit inside the slot of the French character
     they replace — no wider, no taller — and the effect keeps its orange
     spark without moving a single line. */
  const TAILLE_GLYPHE = window.matchMedia("(max-width: 720px), (pointer: coarse)").matches
    ? "0.55em"
    : "1em";

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

  /** Freezes the width of each label of the BATCH on its final text. Without
      this, the glyphs — wider than a Latin letter — would make the whole
      block swell then deflate on every frame. The display is only touched
      for non-block elements: turning a block (the family headings) into an
      inline-block would seat it on the text baseline and shift the row. */
  const figerLesLargeurs = (lot: Libelle[]): void => {
    for (const l of lot) {
      l.el.style.minWidth = "";
      const largeur = l.el.getBoundingClientRect().width;
      l.el.style.minWidth = `${Math.ceil(largeur)}px`;
      if (getComputedStyle(l.el).display !== "block") {
        l.el.style.display = "inline-block";
      }
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
            // Sized and lined to fit the French character's slot: line-height 1
            // keeps the line box on the Latin font's metrics.
            sortie += `<span style="color:#ff7133;font-size:${TAILLE_GLYPHE};line-height:1">${glyphe()}</span>`;
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

  /* Periodic relaunch: ACTIVE.

     The entrance decode stays, and replays on every return of the block to
     the screen. What is back on is the loop that re-scrambles a batch of
     labels every 2.5 to 4 s while the table is being read: the effect keeps
     going randomly in this block instead of stopping after the entrance.

     It had been cut for legibility — measured on the live site, 37 % of the
     samples had at least one label in katakana while the visitor scans the
     table for a skill. Set this constant back to false to restore that
     calmer behaviour. */
  const RELANCE_PERIODIQUE: boolean = true;

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
        if (RELANCE_PERIODIQUE) programmer();
      }
      dedans = visible;
    },
    { threshold: 0.35 },
  ).observe(bloc);
}

/* ---------- the hero's line, once the globe is formed ----------

   The availability line gives way to what the globe is made of: the code.
   hero3d writes html[data-globe] when the sphere is fully formed; the line
   then CROSSFADES into "Je crée des backends en Node" and alternates the
   whole phrase through the skills, scrambled in the block-4 way. Two
   rules: the availability → code transition is a fade, not a scramble —
   it is a change of subject, not a spelling; and the line is frozen at
   the width of its longest phrase, with the text centred inside — the
   alternations change the words, never the layout. */

/* Les phrases qui défilent sous le nom. Quatre règles les gouvernent.

   LA PRÉPOSITION SUIT LA NATURE DE L'OUTIL, et c'est ce qui manquait : on écrit
   EN TypeScript ou EN SQL — ce sont des langues, on écrit dedans — mais AVEC
   React, Node ou Cypress, qui sont des outils dont on se sert. « Des interfaces
   en React » n'est pas du français de métier, et un recruteur technique
   l'entend au premier coup d'œil. Quand la technologie nomme la chose elle-même
   — « des API REST », « des interfaces React » —, l'apposition suffit et vaut
   mieux que n'importe quelle préposition. Et l'on publie SUR npm, qui est un
   lieu.

   UN VERBE DIFFÉRENT À CHAQUE FOIS. Répété, il transforme la ligne en liste de
   technologies déguisée en phrase : dès la deuxième on ne lit plus que le
   dernier mot.

   LE GESTE, PAS LA CATÉGORIE. Concevoir, modéliser, déployer, tester, publier
   sont des actes, et chacun est vérifiable dans le CV. « Des backends » ne dit
   rien que tout le monde ne puisse écrire.

   UNE LONGUEUR RESSERRÉE, sous 36 caractères. La ligne est figée à la largeur
   de la PLUS LONGUE d'entre elles, les autres venant se centrer dedans (voir
   caler) : une phrase qui dépasse élargit la boîte pour toutes.

   DU FRANÇAIS DE MÉTIER, PAS DU FRANGLAIS. « Je type mon code en TypeScript »
   sonnait faux et l'était : typer un code n'existe pas en français, et taper
   son code veut dire le saisir au clavier. Une ligne qui rate le vocabulaire
   du métier dit au lecteur qu'on l'imite plutôt qu'on l'exerce — juste sous
   le nom, en première page, c'est cher payé.

   LE NIVEAU, PAS SEULEMENT L'OUTIL. Une suite de « j'utilise X » se lit comme
   un inventaire de débutant. « Je fais évoluer du code existant » dit le
   métier tel qu'il se pratique à sept ans d'expérience, et c'est la phrase
   du bloc profil, mot pour mot. */
const SOUS_TITRES = [
  "Je conçois des API REST et GraphQL",
  "Je fais évoluer du code existant",
  "J'écris mes backends en Node.js",
  "Je construis des interfaces React",
  "Je travaille en TypeScript",
  "Je modélise les données en SQL",
  "Je déploie avec Docker et Kubernetes",
  "Je teste avec Jest et Cypress",
  "Je développe en React Native",
  "Je publie en open source",
];
/** How long each phrase holds before the next scramble. */
const TENUE_SOUS_TITRE = 6000;
/** Duration of the crossfade between the availability line and the code. */
const FONDU = 600;

export function initSousTitre(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const el = document.querySelector<HTMLElement>(".hero-sub");
  if (!el) return;

  /* The glyphs' font (the system's Japanese face) is wider AND taller than
     the Latin: at three quarters the kana stay readable while their extra
     width spills past the frozen box — visible, never moving. */
  const TAILLE_GLYPHE = "0.75em";

  let animation = 0;
  let etat = 0;

  /** Scrambles the line into the given text; calls `fin` once settled. */
  const jouer = (texte: string, fin: () => void): void => {
    cancelAnimationFrame(animation);
    const debut = performance.now();

    const image = (): void => {
      const t = performance.now() - debut;
      let sortie = "";
      let enCours = false;
      for (let i = 0; i < texte.length; i++) {
        const c = texte[i]!;
        if (fixe(c)) {
          sortie += echapper(c);
          continue;
        }
        const ouverture = i * PAS_CARACTERE;
        if (t < ouverture) {
          // Not its turn yet: the character stays as is.
          sortie += echapper(c);
        } else if (t < ouverture + BROUILLAGE) {
          sortie += `<span style="color:#ff7133;font-size:${TAILLE_GLYPHE};line-height:1">${glyphe()}</span>`;
          enCours = true;
        } else {
          sortie += echapper(c);
        }
      }
      el.innerHTML = sortie;
      if (enCours) {
        animation = requestAnimationFrame(image);
      } else {
        el.textContent = texte;
        fin();
      }
    };

    image();
  };

  const alterner = (): void => {
    etat = (etat + 1) % SOUS_TITRES.length;
    jouer(SOUS_TITRES[etat]!, () => {
      window.setTimeout(alterner, TENUE_SOUS_TITRE);
    });
  };

  /** The availability line gives way to the code: a crossfade, not a
      scramble. The entrance animation has long finished by then — its fill
      would hold opacity 1 over the transition, so it is released first. */
  /* PLUS DE FONDU CROISÉ. La ligne s'ouvrait sur la disponibilité puis cédait
     la place au code ; cette mention a été retirée, la ligne porte donc les
     phrases dès le départ et il n'y a plus rien à remplacer.

     Ce qui reste indispensable, c'est le GEL DES DIMENSIONS ci-dessous : sans
     lui la ligne saute d'une phrase à l'autre. Il se fait sous le couvert de
     l'opacité zéro, pour que le calage ne se voie jamais. */
  const caler = (): void => {
    el.style.animation = "none";
    el.style.opacity = "0";
    window.setTimeout(() => {
      // Freeze the line at its longest phrase, centred: measured while the
      // line is invisible, so the settling never shows.
      el.style.display = "inline-block";
      el.style.whiteSpace = "nowrap";
      let large = 0;
      for (const s of SOUS_TITRES) {
        el.textContent = s;
        large = Math.max(large, el.getBoundingClientRect().width);
      }
      /* MAIS SEULEMENT SI ELLE TIENT. Mesuré sur un écran de 265 px : la plus
         longue phrase demandait 311 px, et `nowrap` la figeait à cette largeur —
         elle sortait donc de l'écran des deux côtés. Le gel de la largeur sert à
         empêcher la ligne de sauter d'une phrase à l'autre ; il ne doit pas se
         payer d'un débordement.

         Trop étroit, on rend le retour à la ligne et on fige la HAUTEUR à la
         place : la phrase passe sur deux lignes, et comme la hauteur ne bouge
         plus, rien ne saute davantage qu'avant. C'est le même remède appliqué à
         l'autre axe. */
      const place = (el.parentElement?.getBoundingClientRect().width ?? large) - 2;
      if (large <= place) {
        el.style.width = `${Math.ceil(large)}px`;
      } else {
        el.style.whiteSpace = "normal";
        el.style.width = "100%";
        let haut = 0;
        for (const s of SOUS_TITRES) {
          el.textContent = s;
          haut = Math.max(haut, el.getBoundingClientRect().height);
        }
        el.style.minHeight = `${Math.ceil(haut)}px`;
      }
      el.textContent = SOUS_TITRES[0]!;
      el.style.textAlign = "center";
      el.style.opacity = "1";
      window.setTimeout(alterner, TENUE_SOUS_TITRE);
    }, FONDU);
  };

  /* LES POLICES D'ABORD. Le calage mesure la largeur des phrases : mesurée
     avant que la police d'affichage ne soit chargée, elle vaut celle de la
     police de repli, et la ligne se fige à une largeur qui n'est pas la sienne.
     L'attente ne se voit pas — la ligne est déjà à l'écran avec sa première
     phrase, écrite dans le HTML. */
  if (document.fonts && document.fonts.status !== "loaded") {
    void document.fonts.ready.then(caler);
  } else {
    caler();
  }

  /* Le guet du signal `html[data-globe]` a disparu avec le fondu croisé : il
     ne servait qu'à savoir QUAND remplacer la disponibilité par le code. La
     ligne n'a plus à attendre quoi que ce soit de la scène 3D. */
}
