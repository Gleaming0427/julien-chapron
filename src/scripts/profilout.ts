// The profile block's exit: as soon as the text is centered (rail pinned),
// two wheel gestures (0.65 screen) make it disappear. The parcours 3D
// cloud (parcours3d.ts) takes over just after: it arrives once the
// sentence has left, over the emptied block.
/** Travel of the profile text's exit, in rail screens. Short: it is
    a simple fade, and everything it consumes delays the parcours entrance.
    specform.ts sets the start of its staging just after. */
export const PROFIL_SORTIE = 0.32;

export function initProfilOut(): void {
  const rail = document.querySelector<HTMLElement>(".carousel-rail");
  if (!rail) return;

  const tick = (): void => {
    const vh = window.innerHeight;
    const railTop = rail.getBoundingClientRect().top;
    const profilOut = Math.min(1, Math.max(0, -railTop / vh / PROFIL_SORTIE));
    document.documentElement.style.setProperty("--profil-out", profilOut.toFixed(3));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
