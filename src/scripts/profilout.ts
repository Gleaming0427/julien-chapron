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
/** Travel of the profile text's exit, in rail screens, counted AFTER the
    plateau. Short: it is a simple fade, and everything it consumes delays
    the parcours entrance. specform.ts sets the start of its staging just
    after. */
export const PROFIL_SORTIE = 0.32;

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
