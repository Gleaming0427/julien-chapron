// Petites améliorations UX : défilement fluide (Lenis), barre de progression,
// révélation des sections, tilt 3D des cartes, retour en haut, copie d'email.

import Lenis from "lenis";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface LenisInstance {
  scrollTo(target: number | HTMLElement, options?: { offset?: number; duration?: number }): void;
  raf(time: number): void;
}

declare global {
  interface Window {
    lenis?: LenisInstance;
  }
}

// Défilement fluide façon sites primés — désactivé si l'utilisateur préfère
// réduire les animations (accessibilité).
if (!reducedMotion) {
  const lenis = new Lenis({ duration: 1.1 });
  window.lenis = lenis;
  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Fond 3D du hero (Three.js) : chargé à la demande, jamais si reduced motion.
if (!reducedMotion) {
  import("./hero3d")
    .then((module) => module.initHero3D())
    .catch(() => {
      // WebGL indisponible : la page reste parfaitement lisible en 2D.
    });
}

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
  if (window.lenis) {
    window.lenis.scrollTo(0, { duration: 1.2 });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
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

// Tilt 3D subtil sur les cartes (clin d'œil aux sites primés à la 3D) —
// uniquement à la souris, jamais si reduced motion.
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (finePointer && !reducedMotion) {
  const tiltMax = 3;
  document.querySelectorAll<HTMLElement>(".card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        `perspective(900px) rotateX(${(-y * tiltMax).toFixed(2)}deg) ` +
        `rotateY(${(x * tiltMax).toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

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
