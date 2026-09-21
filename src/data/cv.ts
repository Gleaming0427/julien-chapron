// CV content, source: CV_Julien_Chapron_2026.pdf (Sept. 2026)

export interface Experience {
  /** What the mission produced, in one sentence. This is the block's hook:
      it announces a result, not a job title. Always backed by a verifiable
      figure, otherwise it rings hollow on a developer's CV. */
  claim: string;
  /** The mission's standout figure, shown in capitals in the block's header.
      It complements the hook, it does not repeat it. */
  metric: string;
  /** The figure highlighted in the card's header, and its unit. */
  stat: string;
  statUnit: string;
  /** The single supporting sentence shown under the hook. The site sells, the
      PDF documents: the detail stays in `bullets`, which is not shown here. */
  summary: string;
  title: string;
  company: string;
  period: string;
  context: string;
  bullets: string[];
  stack?: string;
}

export interface Link {
  label: string;
  href: string;
}

/** Step icon for the projects block, one per project. */
export type IconeProjet = "serveur" | "chapeau" | "telephone" | "ia";

export interface PersonalProject {
  name: string;
  tagline: string;
  kind: string;
  description: string;
  stack: string;
  links: Link[];
  icon: IconeProjet;
  /** Page de détail interne, quand le projet en a une. Les cartes de
      l'accueil sont sinon des culs-de-sac : rien n'y est cliquable. */
  page?: string;
}

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface Education {
  title: string;
  detail: string;
}

export const identity = {
  name: "Julien Chapron",
  role: "Développeur Full-Stack",
  experience: "7 ans d'expérience",
  headline: "TypeScript · React · Node.js · API REST & GraphQL · Docker / Kubernetes",
  location: "Lacroix-Falgarde (31), Toulouse",
  phone: "07 67 75 77 80",
  phoneHref: "tel:+33767757780",
  email: "voyage7981@proton.me",
  github: "https://github.com/Gleaming0427",
  githubLabel: "github.com/Gleaming0427",
  linkedin: "https://www.linkedin.com/in/julien-chapron-6275a8269",
  npm: "https://www.npmjs.com/~armored1486",
  npmLabel: "npmjs.com/~armored1486",
  availability: "Disponible immédiatement · Remote ou hybride Toulouse",
};

// « Principalement en équipe » repeats word for word the tagline of the journey block:
// the two phrasings must stay identical, otherwise the site contradicts itself
// from one screen to the next.
// Deliberately understated. « Sur ma dernière mission » rather than « chez
// Renault »: the mission went through CELAD. « Des applications de supervision
// sur une flotte » rather than « la supervision de »: he built the tools, he
// was not the one piloting the fleet. And « environ » before the figure,
// which is an order of magnitude. Every sentence must be defensible
// as is in an interview.
export const profile =
  "Sept ans à construire des applications web, principalement en équipe. Sur ma dernière mission, j'ai contribué à un portail de documentation suivi par 5 000 ingénieurs Renault, puis à des applications de supervision sur une flotte d'environ 200 000 véhicules électriques. À côté, j'aime publier mes propres projets, en lien avec ma veille technique.";

export const experiences: Experience[] = [
  {
    // Reads on from the figure printed just above it, not as a line of its
    // own: « +100 000 véhicules » / « en supervision ». The two other claims
    // are whole sentences because nothing sits above them to continue.
    claim: "supervisés.",
    metric: "5 000 utilisateurs",
    stat: "200 000",
    statUnit: "véhicules",
    summary: "Quatre ans sur des outils internes pour les véhicules électriques, en équipes de 3 à 11 développeurs et sur plus de 20 dépôts.",
    title: "Développeur Full-Stack",
    company: "CELAD, mission Renault Ampere Software Technology",
    period: "2022 – 2026",
    context: "Automobile, véhicule électrique, outils internes : documentation d'API et supervision de flotte · Full remote",
    bullets: [
      "Portail de documentation suivi par 5 000 ingénieurs Renault.",
      "Deux back-ends de flotte : configuration à distance et traitement des données remontées.",
      "Déploiements Docker / Kubernetes, intégration continue GitLab CI, tests Jest et Cypress.",
    ],
    stack: "React.js, Node.js, TypeScript, GraphQL, API REST, Jest, Cypress, Docker, Kubernetes, GCP, GitLab CI, Git, Linux",
  },
  {
    // Vue.js and not React: verified on the online catalogue, whose root
    // carries the internal __vue__ key and the Vuetify classes (v-application,
    // v-navigation-drawer). No React marker anywhere. The version —
    // Vue 2 / Vuetify 2 — matches the period of the mission, so this is not a
    // later rewrite. Do not "correct" it to React.
    // « Atmosphériques » rather than « environnementales »: that is what AERIS
    // actually hosts — aerosols, ozone, greenhouse gases, clouds,
    // air quality. The word is more precise, therefore more credible.
    // The figure kept is the number of federated centres (4), and not the
    // size of the catalogue: it has grown since 2022, claiming it
    // today would mean taking credit for what happened afterwards.
    claim: "Rendre trouvables les données de l'atmosphère.",
    metric: "recherche publique",
    stat: "4",
    statUnit: "centres fédérés",
    summary: "Le catalogue du pôle AERIS, qui rassemble les données atmosphériques de quatre centres : satellite, sol, aéroporté et campagnes de mesure.",
    title: "Développeur Front-End",
    company: "CNRS, pôle de données AERIS",
    period: "2022",
    context: "Recherche publique, données atmosphériques · Toulouse",
    bullets: [
      "Évolutions de l'interface de recherche : facettes par paramètre, instrument, plateforme et emprise géographique.",
      "Composants Vue.js réutilisables pour le reste du catalogue.",
      "Intégration des jeux de données du pôle dans l'interface.",
    ],
  },
  {
    // Ethics Group is not a software vendor: it is a firm working on the
    // transformation of organisations and territories, specialising in
    // public consultation (CNDP Verkor consultation, Canal du Midi
    // management plan, Réseau Express Vélo of Toulouse Métropole, Airbus
    // and Ariane Group assignments). The applications were the tooling for
    // that business — that is what the card now says.
    // « En temps réel » is justified here: the sentence names the observable
    // effect, the answers arriving over WebSocket without a page reload.
    claim: "Outiller la consultation.",
    metric: "front et back",
    stat: "3",
    statUnit: "ans",
    summary: "Trois ans chez un cabinet de transformation des organisations et des territoires, sur ses applications de consultation et de diagnostic.",
    title: "Développeur Full-Stack",
    company: "Ethics Group",
    period: "2019 – 2021",
    context: "Conseil en transformation, applications de consultation et de diagnostic · Toulouse",
    bullets: [
      "Applications de questionnaires et de tests de personnalité, du front-end au back-end.",
      "Front-end Vue.js avec Vuex, back-end Laravel, bases MySQL conçues et intégrées.",
      "Réponses en temps réel grâce au WebSocket.",
    ],
  },
];

// What is really used, not what a CV usually says. Every entry is backed by a
// mission or a project above; the cloud tooling that only appears in personal
// projects (SST, AWS Lambda, DynamoDB, Firebase…) stays on those project
// cards, where it is honest. Ordered by real usage, most hours first —
// the old list read like a keyword dump.
// Vitest and PostgreSQL are the exceptions: listed past the first two of
// their row, the layout already shows them dimmed — known, but not where
// the real hours are.
export const skills: SkillGroup[] = [
  { category: "Langages", skills: ["TypeScript", "JavaScript", "PHP", "SQL", "Python"] },
  { category: "Front-end", skills: ["React.js", "Vue.js (Vuex)", "HTML / CSS", "React Native", "Astro"] },
  { category: "Back-end", skills: ["Node.js (Express)", "API REST", "GraphQL", "PostgreSQL", "Laravel", "MySQL"] },
  { category: "Cloud & infrastructure", skills: ["Docker", "Kubernetes", "GCP", "GitLab CI", "Git", "Linux"] },
  { category: "Tests", skills: ["Jest", "Cypress", "Vitest"] },
  { category: "Méthodes", skills: ["Agile / Scrum", "revues de code"] },
];

export const personalProjects: PersonalProject[] = [
  {
    name: "api-gateway-core",
    tagline: "librairie publiée sur npm",
    kind: "open source",
    icon: "serveur",
    description:
      "Toolkit d'API gateway serverless : limitation de débit token-bucket, validation de jetons JWT et erreurs typées, sans dépendance à un fournisseur cloud.",
    stack: "TypeScript, Node.js (ESM), Zod, jose, SST, AWS Lambda, DynamoDB, GitHub Actions",
    links: [
      { label: "@armored1486/api-gateway-core · MIT", href: "https://www.npmjs.com/package/@armored1486/api-gateway-core" },
      { label: "github.com/Gleaming0427/api-gateway", href: "https://github.com/Gleaming0427/api-gateway" },
    ],
  },
  {
    name: "cve-triage",
    tagline: "détection de vulnérabilités",
    kind: "open source",
    icon: "chapeau",
    description:
      "Trouve les CVE qui comptent vraiment dans votre code : recoupées contre OSV/GHSA, analysées par reachability, avec correctifs exacts.",
    stack: "Python, Mistral AI",
    links: [{ label: "github.com/Gleaming0427/cve-triage", href: "https://github.com/Gleaming0427/cve-triage" }],
    page: "/cve-triage/",
  },
  {
    name: "Pims Pocket",
    tagline: "application mobile d'argent de poche",
    kind: "projet personnel",
    icon: "telephone",
    description:
      "Double interface parent / enfant : architecture multi-rôles, authentification par code et PIN, synchronisation temps réel et règles de sécurité Firestore.",
    stack: "React Native (Expo Router), TypeScript, Zustand, Firebase, NativeWind",
    links: [
      { label: "Google Play", href: "https://play.google.com/store/apps/details?id=com.pimspocket.app" },
      { label: "github.com/Gleaming0427/pims-pocket", href: "https://github.com/Gleaming0427/pims-pocket" },
    ],
  },
  {
    name: "Lecture de plateau de jeu par vision IA",
    tagline: "preuve de concept",
    kind: "preuve de concept",
    icon: "ia",
    description:
      "Application full-stack lisant un plateau de jeu à partir d'une photo : numéro, couleur et jetons de chaque carte, extraits par un modèle de vision.",
    stack: "TypeScript, Node.js / Express, React / Vite, GPT-4o Vision",
    links: [],
  },
];

export const education: Education[] = [
  {
    title: "AWS Certified Solutions Architect Associate (SAA-C03)",
    detail: "en préparation, examen prévu au troisième trimestre 2026",
  },
  {
    title: "Titre professionnel Développeur Logiciel",
    detail: "Wild Code School, Toulouse, 2017 – 2018",
  },
];

export const languages = [
  { name: "Français", level: "langue maternelle" },
  { name: "Anglais", level: "B1 à l'écrit, A2 à l'oral" },
];

export const before =
  "11 ans de taille de pierre sur monuments historiques, jusqu'à la reconversion vers le développement en 2017.";
