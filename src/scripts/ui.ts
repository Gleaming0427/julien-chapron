// Petites améliorations UX : barre de progression du scroll, révélation des
// sections au défilement, bouton retour en haut et copie d'email en un clic.

const progress = document.getElementById("scroll-progress") as HTMLDivElement;
const toTop = document.getElementById("to-top") as HTMLButtonElement;

let ticking = false;

function onScroll(): void {
  const root = document.documentElement;
  const max = root.scrollHeight - root.clientHeight;
  progress.style.width = `${max > 0 ? (root.scrollTop / max) * 100 : 0}%`;
  toTop.classList.toggle("visible", root.scrollTop > 600);
}

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
    }
  },
  { passive: true },
);
onScroll();

toTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Révélation des sections au scroll.
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.06 },
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Copie vers le presse-papiers (boutons [data-copy]).
document.addEventListener("click", async (event) => {
  const target = (event.target as HTMLElement).closest("[data-copy]") as HTMLElement | null;
  if (!target) return;
  const value = target.getAttribute("data-copy");
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    const previous = target.textContent ?? "";
    target.textContent = "copié ✓";
    window.setTimeout(() => {
      target.textContent = previous;
    }, 1500);
  } catch {
    // Presse-papiers indisponible (http://, permissions…) : on ne fait rien.
  }
});
