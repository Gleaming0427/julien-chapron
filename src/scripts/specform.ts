import { PROFIL_SORTIE } from "./profilout";

// Pilote de la progression du bloc parcours : --spec-form suit la position
// du rail (trois étapes de deux gestes de molette chacune). Les modules
// 3D et le CSS lisent cette variable pour orchestrer la séquence.
/* ---------------------------------------------------------------------
   Chorégraphie du bloc parcours, exprimée en parts de --spec-form.
   ATTENTION : global.css reprend TITRE_* et CARROUSEL_* en dur (le CSS ne
   peut pas importer). Si tu touches à ces valeurs, reporte-les là-bas —
   elles sont signalées par un commentaire qui renvoie ici.

   Le rythme visé, à la vitesse de défilement imposée par ui.ts :
     arrivée des points  4,2 s
     puis, 2 s plus tard, le titre de gauche
     puis, 1 s plus tard, le carrousel.
   --------------------------------------------------------------------- */

/** Position du rail (en écrans, soit -railTop/vh) où --spec-form démarre.
    Dérivé de la sortie du texte du profil plutôt que recopié : les deux
    doivent rester collés, sinon on verrouille la molette pour ne rien
    montrer (trop tard) ou les deux textes se chevauchent (trop tôt). */
export const SPEC_DEPART = PROFIL_SORTIE + 0.06;
/** Course de --spec-form, en écrans de rail. */
export const SPEC_COURSE = 2.28;
/** Valeur de --spec-form à partir de laquelle le carrousel des fiches prend
    la main. Avant ce point, tout est automatique ; après, c'est la molette. */
export const SPEC_CARROUSEL = 0.84;

/** Fenêtre d'apparition du titre de gauche (.spec-intro). */
export const TITRE_DEBUT = 0.62;
export const TITRE_FIN = 0.72;
/** Fenêtre d'apparition du carrousel de fiches (.exp-carousel). */
export const CARROUSEL_DEBUT = 0.72;
export const CARROUSEL_FIN = 0.84;
/** Vitesse de défilement, en écrans par seconde, que ui.ts doit tenir pour
    que les intervalles ci-dessus fassent bien 2 s et 1 s. */
export const VITESSE = 0.228;

/** Position de rail, en écrans, correspondant à une valeur de --spec-form.
    Exportée parce que ui.ts vise ces mêmes repères : recopiés là-bas, ils
    auraient dérivé au premier réglage. */
export function railPourSpec(valeur: number): number {
  return SPEC_DEPART + valeur * SPEC_COURSE;
}

export function initSpecForm(): void {
  const section = document.querySelector<HTMLElement>(".section-exp");
  const rail = section?.closest<HTMLElement>(".carousel-rail");
  if (!section || !rail) return;

  const tick = (): void => {
    const vh = window.innerHeight;
    const railTop = rail.getBoundingClientRect().top;
    // L'étape 1 (explosion de particules) tient 3 gestes de molette, les
    // étapes 2 et 3 en tiennent 2 chacune : ~2,3 écrans au total.
    const progress = Math.min(
      1,
      Math.max(0, (-railTop - vh * SPEC_DEPART) / (vh * SPEC_COURSE)),
    );
    section.style.setProperty("--spec-form", progress.toFixed(3));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
