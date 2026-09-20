// The profile block's exit: the text holds, pinned and whole, for the length
// of the plateau below, then two wheel gestures make it disappear. The parcours 3D
// cloud (parcours3d.ts) takes over just after: it arrives once the
// sentence has left, over the emptied block.
/** Rail travel during which the text stays FULLY readable, pinned at the
    centre, before anything starts to happen. It used to be zero: the fade
    began on the very pixel the rail pinned, so the text was at full opacity
    for one instant and nothing more. By the time the interlude took over, at
    0.12 screen, it had already lost 38 % of itself — one nudge of the wheel,
    or a tenth of a flick, and the sentence was going away while you were
    still on the first line. */
export const PROFIL_PALIER = 0.6;
/** Course de la sortie du texte du profil, en écrans de rail, comptée APRÈS
    le palier.

    0,24 et non 0,32. Le bloc parcours commence son fondu d'entrée à 0,847
    écran de rail ; à 0,32 le texte du profil n'était éteint qu'à 0,92, donc
    il restait lisible — à ~10 % sur l'orange, ce qui se voit — pendant que le
    titre et la fiche du parcours étaient déjà là. Trois couches de texte se
    percutaient.

    0,24 l'éteint à 0,84, juste avant que le parcours ne commence à paraître :
    les deux se succèdent au lieu de se superposer, et le volet sombre se
    ferme dans cette même fenêtre (voir --volet-entree dans ui.ts). */
export const PROFIL_SORTIE = 0.24;

export function initProfilOut(): void {
  const rail = document.querySelector<HTMLElement>(".carousel-rail");
  if (!rail) return;

  const tick = (): void => {
    const vh = window.innerHeight;
    const railTop = rail.getBoundingClientRect().top;
    const profilOut = Math.min(
      1,
      Math.max(0, (-railTop / vh - PROFIL_PALIER) / PROFIL_SORTIE),
    );
    document.documentElement.style.setProperty("--profil-out", profilOut.toFixed(3));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
