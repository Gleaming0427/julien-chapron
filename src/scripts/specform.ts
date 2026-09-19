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

/** Durée de la chorégraphie complète, en secondes. */
export const SPEC_DUREE = 3.4;

/** Part de --spec-form à partir de laquelle le carrousel est en place. */
export const SPEC_CARROUSEL = 0.84;

/** Fenêtre d'apparition du titre de gauche (.spec-intro). */
export const TITRE_DEBUT = 0.62;
export const TITRE_FIN = 0.72;
/** Fenêtre d'apparition du carrousel (.exp-carousel). */
export const CARROUSEL_DEBUT = 0.72;
export const CARROUSEL_FIN = 0.84;

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
      // Adouci aux deux bouts : la scène démarre et se pose au lieu de filer
      // à vitesse constante.
      ecrire(p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    } else if (presence < 0.05 && debut !== null) {
      // Bloc entièrement reparti : la séquence se réarme et rejouera au retour,
      // comme les autres blocs de la page.
      debut = null;
      ecrire(0);
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
