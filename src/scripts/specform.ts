/* Progression de la mise en scène du bloc parcours (--spec-form).

   AVANT : la variable suivait la position du scroll, et ui.ts verrouillait la
   molette pendant 9,7 s pour que la séquence se joue à la bonne vitesse. Le
   visiteur payait 2,3 écrans de molette pour une mise en scène, et reprenait
   la main en cours de route sans comprendre pourquoi. Mesuré : une impulsion
   de 120 px déclenchait un trajet automatique de 2 111 px.

   MAINTENANT : la séquence a son propre temps. Elle démarre quand le bloc
   arrive réellement à l'écran, se joue seule, et ne bloque rien — on peut
   continuer à scroller pendant. Le scroll ne sert plus qu'à scroller.

   AVERTISSEMENT : global.css recopie TITRE_* et CARROUSEL_* en dur (le CSS ne
   peut pas importer). Si ces valeurs changent, les reporter là-bas — elles y
   sont signalées par un commentaire qui renvoie ici. */

const MOUVEMENT_REDUIT = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Durée de la chorégraphie complète, en secondes.

    4,0 et non 2,6. Le nuage de points se forme sur les 42 premiers pour cent
    de --spec-form (FORME_FIN dans parcours3d). À 2,6 s, cette formation
    tenait dans 640 ms — et comme le bloc atteint sa pleine opacité avant
    qu'elle ne commence, le donut semblait arriver déjà construit. Ici elle
    dure environ 1,4 s : on voit les points se poser. */
export const SPEC_DUREE = 4.0;

/* Les trois étapes se CHEVAUCHENT désormais, au lieu de se succéder.

   En 0,62 / 0,72 / 0,84, elles étaient calibrées pour une séquence d'une
   dizaine de secondes traversée par l'autoscroll : le titre n'arrivait qu'aux
   deux tiers, le carrousel plus tard encore. Rejouées en 2,6 s sans autoscroll,
   ces mêmes parts laissaient environ 2,4 s pendant lesquelles le profil était
   déjà parti et rien n'était encore là — un écran orange et vide, c'est le
   défaut qui a été signalé.

   Le nuage de points est un décor ; le titre et les fiches sont le propos. Ils
   arrivent donc PENDANT que les points se forment, et non après. */

/** Fenêtre d'apparition du titre de gauche (.spec-intro). */
export const TITRE_DEBUT = 0.1;
export const TITRE_FIN = 0.26;
/** Fenêtre d'apparition du carrousel (.exp-carousel). */
export const CARROUSEL_DEBUT = 0.22;
export const CARROUSEL_FIN = 0.4;

let valeur = 0;

/** Valeur courante, lue par parcours3d : une seule horloge pour toute la
    séquence. Recalculée là-bas, elle divergeait au premier réglage. */
export function specCourant(): number {
  return valeur;
}

export function initSpecForm(): void {
  const section = document.querySelector<HTMLElement>(".section-exp");
  if (!section) return;
  const bloc = section.closest<HTMLElement>(".carousel-item");

  const ecrire = (v: number): void => {
    valeur = v;
    section.style.setProperty("--spec-form", v.toFixed(3));
  };
  ecrire(0);

  // Mouvement réduit : la scène est posée d'emblée, pas jouée.
  if (MOUVEMENT_REDUIT) {
    ecrire(1);
    return;
  }

  let debut: number | null = null;
  let avance = 0;

  const tick = (t: number): void => {
    /* Le déclencheur est l'arrivée VISUELLE du bloc, pas sa position dans le
       document : le panneau est épinglé et techniquement « à l'écran » dès le
       début du rail, alors que le texte du profil y est encore lisible. On lit
       donc l'opacité que ui.ts écrit sur le bloc — la même vérité que les
       fondus, donc rien à resynchroniser. */
    const presence = Number(bloc?.style.getPropertyValue("--item-op") || "0");

    if (presence > 0.6) {
      if (debut === null) debut = t;
      const p = Math.min(1, (t - debut) / (SPEC_DUREE * 1000));
      /* Adouci aux deux bouts, mais en QUADRATIQUE et non plus en cubique.
         La cubique laissait --spec-form sous 0,05 pendant les 500 premières
         millisecondes : les points ne bougeaient pas, puis rattrapaient d'un
         coup. On ne voyait donc jamais la formation, seulement son résultat.
         La quadratique décolle assez tôt pour que le premier point parte
         tout de suite, tout en gardant une arrivée qui se pose. */
      avance = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    } else if (presence < 0.05) {
      // Bloc entièrement reparti : la séquence se réarme et rejouera au retour,
      // comme les autres blocs de la page.
      debut = null;
      avance = 0;
    }

    /* Une horloge ne sait pas reculer — et c'est ce qui cassait le RETOUR vers
       le bloc profil. L'avance restait à 1 tant que la présence n'était pas
       retombée sous 0,05, si bien que le nuage de points et son volet noir
       tenaient à pleine puissance PAR-DESSUS le texte du profil qui revenait,
       avant de disparaître d'un coup.

       Le retrait rattache la scène à la présence du bloc : elle se rabat en
       même temps qu'il s'efface, dans les deux sens. À l'aller, l'horloge ne
       démarre qu'au-delà de 0,6, donc le retrait vaut déjà 1 et ne change
       rien. */
    const retrait = Math.min(1, presence / 0.6);
    ecrire(avance * retrait);

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
