// La sortie du bloc profil : dès que le texte est centré (rail épinglé),
// deux gestes de molette (0,65 écran) le font disparaître. Le nuage 3D du
// parcours (parcours3d.ts) prend le relais juste après : il arrive une fois
// la phrase partie, sur le bloc vidé.
/** Course de la sortie du texte du profil, en écrans de rail. Courte : c'est
    un simple fondu, et tout ce qu'il consomme retarde l'entrée du parcours.
    specform.ts cale le départ de sa mise en scène juste après. */
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
