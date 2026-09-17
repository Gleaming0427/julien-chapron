import { PROFIL_SORTIE } from "./profilout";

// Driver of the parcours block's progression: --spec-form follows the rail
// position (three steps of two wheel gestures each). The 3D
// modules and the CSS read this variable to orchestrate the sequence.
/* ---------------------------------------------------------------------
   Choreography of the parcours block, expressed in shares of --spec-form.
   WARNING: global.css repeats TITRE_* and CARROUSEL_* as hard values (the CSS
   cannot import). If you touch these values, carry them over there —
   they are flagged by a comment that points back here.

   The intended rhythm, at the scroll speed imposed by ui.ts:
     points arrival  4.2 s
     then, 2 s later, the left-hand title
     then, 1 s later, the carousel.
   --------------------------------------------------------------------- */

/** Rail position (in screens, i.e. -railTop/vh) where --spec-form starts.
    Derived from the profile text's exit rather than copied: the two
    must stay glued together, otherwise we lock the wheel to show nothing
    (too late) or the two texts overlap (too early). */
export const SPEC_DEPART = PROFIL_SORTIE + 0.06;
/** Travel of --spec-form, in rail screens. */
export const SPEC_COURSE = 2.28;
/** Value of --spec-form from which the card carousel takes
    over. Before this point, everything is automatic; after it, the wheel rules. */
export const SPEC_CARROUSEL = 0.84;

/** Appearance window of the left-hand title (.spec-intro). */
export const TITRE_DEBUT = 0.62;
export const TITRE_FIN = 0.72;
/** Appearance window of the card carousel (.exp-carousel). */
export const CARROUSEL_DEBUT = 0.72;
export const CARROUSEL_FIN = 0.84;
/** Scroll speed, in screens per second, that ui.ts must hold for
    the intervals above to really be 2 s and 1 s. */
export const VITESSE = 0.228;

/** Rail position, in screens, matching a value of --spec-form.
    Exported because ui.ts targets these same markers: copied over there, they
    would have drifted at the first adjustment. */
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
    // Step 1 (particle explosion) holds 3 wheel gestures, steps
    // 2 and 3 hold 2 each: ~2.3 screens in total.
    const progress = Math.min(
      1,
      Math.max(0, (-railTop - vh * SPEC_DEPART) / (vh * SPEC_COURSE)),
    );
    section.style.setProperty("--spec-form", progress.toFixed(3));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
