// The projects card (Agent QA Kit): the effects of its control screen.
// Everything here is decoration over a card that is already complete in the
// HTML: the clock, the scroll ticks, the typed code block, the dial's roll
// and ring, the sight, the case file's autoplay and its scrambled titles.
// If this module never runs, nothing is missing — only still.

const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const telephone = window.matchMedia("(max-width: 720px)");
const pointeurFin = window.matchMedia("(hover: hover) and (pointer: fine)");

/** The scramble's glyphs: the signs of a terminal, not of a language — the
    skills block already speaks Japanese, this one speaks machine. Only signs
    about as wide as a lowercase letter: « # @ % & $ » are wider, and a title
    that grows while it scrambles wraps onto one more line. */
const GLYPHES = "01<>/+=*?!";
const glyphe = (): string => GLYPHES[Math.floor(Math.random() * GLYPHES.length)]!;
const echapper = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const deuxChiffres = (n: number): string => String(n).padStart(2, "0");

/** Scramble: the whole text turns to glyphs, then locks in from left to
    right. The real text stays in place under the veil (transparent, still
    read by assistive technologies), so nothing reflows. */
const PAS_CARACTERE = 16;
const DUREE_CARACTERE = 260;
const RAFRAICHISSEMENT = 45;
const brouillages = new WeakMap<HTMLElement, number>();

function brouiller(zone: HTMLElement | null): void {
  if (!zone || reduit) return;
  const fond = zone.querySelector<HTMLElement>(".qa-brouille-fond");
  const voile = zone.querySelector<HTMLElement>(".qa-brouille-voile");
  if (!fond || !voile) return;
  const texte = fond.textContent ?? "";
  const enCours = brouillages.get(zone);
  if (enCours) cancelAnimationFrame(enCours);

  const debut = performance.now();
  let dernier = -Infinity;
  // A title that holds on one line keeps to one line while it scrambles:
  // any excess width is cut at the right instead of breaking onto a second
  // line, which the veil would hide — and the end of the title with it.
  voile.style.whiteSpace = fond.getClientRects().length > 1 ? "normal" : "nowrap";
  zone.classList.add("brouille");

  const image = (t: number) => {
    const ecoule = t - debut;
    const fini = ecoule >= texte.length * PAS_CARACTERE + DUREE_CARACTERE;
    if (fini) {
      zone.classList.remove("brouille");
      voile.textContent = "";
      brouillages.delete(zone);
      return;
    }
    // The glyphs change every 45 ms, not every frame: at 60 per second they
    // only read as a flicker.
    if (t - dernier >= RAFRAICHISSEMENT) {
      dernier = t;
      let html = "";
      for (let i = 0; i < texte.length; i++) {
        const c = texte[i]!;
        html +=
          /\s/.test(c) || ecoule - i * PAS_CARACTERE >= DUREE_CARACTERE
            ? echapper(c)
            : `<b>${echapper(glyphe())}</b>`;
      }
      voile.innerHTML = html;
    }
    brouillages.set(zone, requestAnimationFrame(image));
  };
  brouillages.set(zone, requestAnimationFrame(image));
}

export function initProjets(): void {
  const carte = document.querySelector<HTMLElement>("[data-qa]");
  if (!carte) return;
  const langue = document.documentElement.lang === "en" ? "en-GB" : "fr-FR";

  const intro = carte.querySelector<HTMLElement>(".qa-intro");
  const mesures = carte.querySelector<HTMLElement>(".qa-mesures");
  const dossier = carte.querySelector<HTMLElement>(".qa-dossier");
  const bascule = carte.querySelector<HTMLButtonElement>(".qa-auto");

  /* ---------- autoplay and its pauses ----------
     Two things play by themselves: the dial (2 measures) and the case file
     (6 entries). Both run on a CSS bar whose end hands over to the next
     item; pausing is `animation-play-state`, so a pause keeps the progress.
     Off by default when the system asks for less motion; the toggle in the
     HUD turns it on or off for both. */
  let auto = !reduit;
  let mesuresVisibles = false;
  let dossierVisible = false;
  let survolMesures = false;
  let survolDossier = false;

  const majPause = (): void => {
    carte.classList.toggle("sans-auto", !auto);
    mesures?.classList.toggle("en-pause", !auto || !mesuresVisibles || survolMesures);
    // On a phone the case file is a plain list (see the CSS): nothing plays.
    dossier?.classList.toggle(
      "en-pause",
      !auto || !dossierVisible || survolDossier || telephone.matches,
    );
  };

  // Armed in the same task as the pauses: the bars never get a frame to
  // start running before the block is on screen.
  carte.classList.add("qa-anime");
  majPause();
  telephone.addEventListener("change", majPause);

  if (bascule) {
    bascule.hidden = false;
    bascule.setAttribute("aria-pressed", String(auto));
    bascule.addEventListener("click", () => {
      auto = !auto;
      bascule.setAttribute("aria-pressed", String(auto));
      majPause();
    });
  }

  const suspendre = (bloc: HTMLElement | null, regler: (v: boolean) => void): void => {
    if (!bloc) return;
    bloc.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") {
        regler(true);
        majPause();
      }
    });
    bloc.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") {
        regler(false);
        majPause();
      }
    });
    // A keyboard user reading a row must not see it change under them.
    bloc.addEventListener("focusin", () => {
      regler(true);
      majPause();
    });
    bloc.addEventListener("focusout", (e) => {
      if (!bloc.contains(e.relatedTarget as Node | null)) {
        regler(false);
        majPause();
      }
    });
  };
  suspendre(mesures, (v) => (survolMesures = v));
  suspendre(dossier, (v) => (survolDossier = v));

  /* ---------- clock ---------- */
  const horloge = carte.querySelector<HTMLElement>("[data-horloge]");
  if (horloge) {
    const format = new Intl.DateTimeFormat(langue, {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tic = () => {
      horloge.textContent = format.format(new Date());
    };
    tic();
    window.setInterval(tic, 1000);
  }

  /* ---------- HUD ticks: the crossing of the card ----------
     Empty when the card's top enters the screen, full when its bottom
     reaches the bottom of the screen. */
  const ticks = Array.from(carte.querySelectorAll<HTMLElement>(".qa-ticks i"));
  let allumes = -1;
  let demande = false;
  const majTicks = (): void => {
    demande = false;
    const r = carte.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / Math.max(1, r.height)));
    const n = Math.round(p * ticks.length);
    if (n === allumes) return;
    allumes = n;
    ticks.forEach((t, i) => t.classList.toggle("on", i < n));
  };
  const planifier = (): void => {
    if (demande) return;
    demande = true;
    requestAnimationFrame(majTicks);
  };
  window.addEventListener("scroll", planifier, { passive: true });
  window.addEventListener("resize", planifier);
  majTicks();

  /* ---------- the dial's counter ----------
     One band of digits per position, three turns of 0–9 stacked: a roll
     always goes up, through two full turns, and stops on its digit. */
  const odo = carte.querySelector<HTMLElement>("[data-odo]");
  let bandes: HTMLElement[] = [];
  let chiffres: number[] = [];

  const construireOdo = (texte: string): void => {
    if (!odo) return;
    odo.textContent = "";
    bandes = [];
    chiffres = [];
    for (const c of texte) {
      const col = document.createElement("span");
      col.className = "qa-odo-col";
      const bande = document.createElement("span");
      bande.className = "qa-odo-bande sans-transition";
      for (let tour = 0; tour < 3; tour++) {
        for (let d = 0; d < 10; d++) {
          const s = document.createElement("span");
          s.textContent = String(d);
          bande.append(s);
        }
      }
      const d = Number(c);
      bande.style.transform = `translateY(${-d}em)`;
      col.append(bande);
      odo.append(col);
      bandes.push(bande);
      chiffres.push(d);
    }
  };

  const rouler = (valeur: number, depuisZero: boolean): void => {
    if (!odo) return;
    const texte = String(valeur);
    if (bandes.length !== texte.length) construireOdo(texte);
    [...texte].forEach((c, k) => {
      const d = Number(c);
      const bande = bandes[k]!;
      if (reduit) {
        bande.style.transform = `translateY(${-d}em)`;
      } else {
        // Back to the starting digit, on the first turn, without a
        // transition; then the roll to the third turn.
        bande.classList.add("sans-transition");
        bande.style.transform = `translateY(${-(depuisZero ? 0 : chiffres[k]!)}em)`;
        void bande.offsetHeight;
        bande.classList.remove("sans-transition");
        bande.style.setProperty("--d", `${k * 140}ms`);
        bande.style.transform = `translateY(${-(20 + d)}em)`;
      }
      chiffres[k] = d;
    });
  };

  if (odo) construireOdo(odo.textContent?.trim() ?? "0");

  /* ---------- the measures: rows, ring, counter ---------- */
  const lignes = Array.from(carte.querySelectorAll<HTMLButtonElement>("button[data-mesure]"));
  const anneaux = Array.from(carte.querySelectorAll<SVGGElement>("[data-anneau]"));
  const cadranLabel = carte.querySelector<HTMLElement>("[data-cadran-label]");
  const cadranTotal = carte.querySelector<HTMLElement>("[data-cadran-total]");
  const cadranIndex = carte.querySelector<HTMLElement>("[data-cadran-index]");
  let mesureActive = 0;

  const choisirMesure = (i: number, depuisZero = false): void => {
    const ligne = lignes[i];
    if (!ligne) return;
    mesureActive = i;
    lignes.forEach((l, j) => {
      l.classList.toggle("is-active", j === i);
      l.setAttribute("aria-pressed", String(j === i));
    });
    anneaux.forEach((g, j) => {
      g.classList.toggle("is-active", j === i);
      g.classList.remove("remplit");
    });
    const anneau = anneaux[i];
    if (anneau) {
      // Commit the grey ring before lighting it, or the fill would not
      // replay when the same ring comes back.
      void anneau.getBoundingClientRect();
      anneau.classList.add("remplit");
    }
    if (cadranLabel) cadranLabel.textContent = ligne.dataset.label ?? "";
    if (cadranTotal) cadranTotal.textContent = `/${ligne.dataset.total ?? ""}`;
    if (cadranIndex) cadranIndex.textContent = deuxChiffres(i + 1);
    rouler(Number(ligne.dataset.valeur ?? 0), depuisZero);
  };

  lignes.forEach((ligne, j) => {
    ligne.addEventListener("click", () => {
      if (j !== mesureActive) choisirMesure(j);
    });
    ligne.querySelector(".qa-ligne-progres")?.addEventListener("animationend", () => {
      if (auto && j === mesureActive) choisirMesure((j + 1) % lignes.length);
    });
  });

  /* ---------- the sight over the dial ---------- */
  const cadran = carte.querySelector<HTMLElement>(".qa-cadran");
  const coordX = carte.querySelector<HTMLElement>("[data-coord-x]");
  const coordY = carte.querySelector<HTMLElement>("[data-coord-y]");
  if (cadran && pointeurFin.matches) {
    cadran.addEventListener("pointermove", (e) => {
      const r = cadran.getBoundingClientRect();
      const x = Math.max(0, Math.round(e.clientX - r.left));
      const y = Math.max(0, Math.round(e.clientY - r.top));
      cadran.style.setProperty("--vx", `${x}px`);
      cadran.style.setProperty("--vy", `${y}px`);
      if (coordX) coordX.textContent = String(x).padStart(3, "0");
      if (coordY) coordY.textContent = String(y).padStart(3, "0");
      cadran.classList.add("vise");
    });
    cadran.addEventListener("pointerleave", () => {
      cadran.classList.remove("vise");
      if (coordX) coordX.textContent = "000";
      if (coordY) coordY.textContent = "000";
    });
  }

  /* ---------- the case file ---------- */
  const etapes = Array.from(carte.querySelectorAll<HTMLElement>(".qa-etape"));
  let etapeActive = 0;

  const choisirEtape = (i: number): void => {
    if (i === etapeActive || !etapes[i]) return;
    etapeActive = i;
    etapes.forEach((el, j) => el.classList.toggle("is-active", j === i));
    brouiller(etapes[i]!.querySelector<HTMLElement>(".qa-brouille"));
  };

  etapes.forEach((etape, j) => {
    etape.querySelector(".qa-etape-barre")?.addEventListener("animationend", () => {
      if (auto && j === etapeActive) choisirEtape((j + 1) % etapes.length);
    });
    // The pointer picks an entry by passing over it; a tap does the same on
    // a touch tablet, where the case file still plays in columns.
    etape.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse" && !telephone.matches) choisirEtape(j);
    });
    etape.addEventListener("click", () => {
      if (!telephone.matches) choisirEtape(j);
    });
  });

  // On a phone nothing plays: each title scrambles once as it arrives.
  if (telephone.matches && !reduit) {
    const arrivee = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          brouiller(e.target.querySelector<HTMLElement>(".qa-brouille"));
          arrivee.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    etapes.forEach((el) => arrivee.observe(el));
  }

  /* ---------- entrances ----------
     Each block plays its entrance when it reaches the upper four fifths of
     the screen, and gets it back once it has fully left: the code block
     types itself again, the ring fills again, the counter rolls again. */
  const entrer = (bloc: HTMLElement): void => {
    if (bloc === intro) brouiller(bloc.querySelector<HTMLElement>(".qa-titre .qa-brouille"));
    if (bloc === mesures) choisirMesure(mesureActive, true);
    if (bloc === dossier && !telephone.matches) {
      brouiller(etapes[etapeActive]?.querySelector<HTMLElement>(".qa-brouille") ?? null);
    }
  };

  const blocs = [intro, mesures, dossier].filter((b): b is HTMLElement => b !== null);

  const entree = new IntersectionObserver(
    (entrees) => {
      for (const e of entrees) {
        const bloc = e.target as HTMLElement;
        if (!e.isIntersecting || bloc.classList.contains("en-vue")) continue;
        bloc.classList.add("en-vue");
        entrer(bloc);
      }
    },
    { rootMargin: "0px 0px -20% 0px" },
  );

  const presence = new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      const bloc = e.target as HTMLElement;
      if (bloc === mesures) mesuresVisibles = e.isIntersecting;
      if (bloc === dossier) dossierVisible = e.isIntersecting;
      if (!e.isIntersecting) bloc.classList.remove("en-vue");
    }
    majPause();
  });

  blocs.forEach((b) => {
    entree.observe(b);
    presence.observe(b);
  });
}
