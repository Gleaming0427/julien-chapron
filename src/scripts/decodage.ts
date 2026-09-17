// Effet de décodage sur les libellés du bloc compétences : chaque caractère
// défile parmi des glyphes étrangers avant de se fixer, de gauche à droite.
// Les glyphes, eux, passent à l'orange le temps du brouillage. Déclenché à
// l'entrée du bloc dans l'écran, rejoué à chaque retour, puis relancé en
// boucle sur un petit ÉCHANTILLON de libellés : pendant qu'on lit le
// tableau, quelques compétences se brouillent de temps en temps en
// japonais avant de revenir au français.

/** Réservoir de glyphes. Des idéogrammes, dont l'œil ne tire aucun sens :
    c'est ce qui donne l'impression d'un texte encore chiffré. */
const GLYPHES =
  "日本語漢字仮名一二三四五六七八九十山川田中大小上下左右力刀月火水木金土空海風雷電気機能情報通信";

/** Durée du brouillage d'un caractère, en millisecondes. */
const BROUILLAGE = 480;
/** Décalage entre deux caractères voisins : c'est lui qui fait la vague. */
const PAS_CARACTERE = 40;
/** Décalage entre deux libellés : la table se décode de haut en bas. */
const PAS_LIBELLE = 100;

/* La relance périodique : un petit lot aléatoire se brouille de temps en
   temps, le reste de la table reste lisible. */
const TAILLE_LOT = 3;
const PERIODE_MIN = 2500;
const PERIODE_MAX = 4000;

const glyphe = (): string => GLYPHES[Math.floor(Math.random() * GLYPHES.length)]!;

/** Le libellé est injecté en HTML pour colorer les glyphes : les caractères
    français passent donc par cet échappement. */
const echapper = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Un caractère qui ne se brouille pas : les séparateurs et les espaces
    gardent la silhouette du mot lisible pendant tout l'effet. */
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

  // Les intitulés de famille puis les technologies, dans l'ordre du document :
  // la vague descend donc la table telle qu'on la lit.
  const cibles = Array.from(
    bloc.querySelectorAll<HTMLElement>(".skill-cat, .skill-items li"),
  );
  if (!cibles.length) return;

  const libelles: Libelle[] = cibles.map((el, i) => ({
    el,
    texte: el.textContent ?? "",
    depart: i * PAS_LIBELLE,
  }));

  /** Fige la largeur de chaque libellé du LOT sur son texte final. Sans ça,
      les idéogrammes — deux fois plus larges qu'une lettre latine — feraient
      enfler puis dégonfler toute la table à chaque image. */
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

  /** Remet tous les libellés en français et libère la mise en page —
      l'interruption d'un cycle ne laisse jamais de glyphe derrière elle. */
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

  /** Joue le brouillage → français sur un lot de libellés. */
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
            // Pas encore son tour : le caractère reste en français. La
            // vague de glyphes ne se voit ainsi que là où elle passe, de
            // gauche à droite — jamais tout le texte d'un coup.
            sortie += echapper(c);
          } else if (t < ouverture + BROUILLAGE) {
            // En cours de brouillage : un glyphe, à l'orange le temps de
            // l'effet. L'orange du site (#ff4d00) est éclairci : les
            // idéogrammes sont des tracés fins qui grisent à cette taille
            // sur fond noir — éclairci, l'œil y retrouve le même orange.
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
        // Terminé : on rend la main à la mise en page.
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

  // Relance en boucle tant que le bloc est à l'écran : un petit lot
  // aléatoire se brouille, revient au français, et le suivant est
  // programmé. L'entrée du bloc joue la table entière, comme avant.
  let dedans = false;
  let minuterie = 0;

  const programmer = (): void => {
    minuterie = window.setTimeout(() => {
      if (!dedans) return; // sorti de l'écran : la chaîne s'arrête
      if (document.hidden || cycle) {
        // Onglet en arrière ou cycle en cours : on repousse poliment.
        minuterie = window.setTimeout(programmer, 600);
        return;
      }
      const lot = [...libelles]
        .sort(() => Math.random() - 0.5)
        .slice(0, TAILLE_LOT)
        // Le lot rejoue la petite vague : chaque libellé part après le
        // précédent. Copies, pour ne pas écraser le départ d'entrée.
        .map((l, i) => ({ ...l, depart: i * PAS_LIBELLE }));
      jouer(lot);
      programmer();
    }, PERIODE_MIN + Math.random() * (PERIODE_MAX - PERIODE_MIN));
  };

  // Rejoué à chaque entrée du bloc dans l'écran, pas seulement la première :
  // en remontant la page on revoit l'effet, comme le reste du site.
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
