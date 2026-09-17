// Contenu du CV, source : CV_Julien_Chapron_2026.pdf (sept. 2026)

export interface Experience {
  /** Ce que la mission a produit, en une phrase. C'est l'accroche du bloc :
      elle annonce un résultat, pas un intitulé de poste. Toujours adossée à
      un chiffre vérifiable, sinon elle sonne creux sur un CV de dev. */
  claim: string;
  /** Le chiffre marquant de la mission, affiché en capitales dans l'en-tête
      du bloc. Il complète l'accroche, il ne la répète pas. */
  metric: string;
  /** Le chiffre mis en avant dans l'en-tête de la fiche, et son unité. */
  stat: string;
  statUnit: string;
  /** L'unique phrase d'appui affichée sous l'accroche. Le site vend, le PDF
      documente : le détail reste dans `bullets`, qui n'est pas affiché ici. */
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

/** Icône d'étape du bloc projets, une par projet. */
export type IconeProjet = "serveur" | "chapeau" | "telephone" | "ia";

export interface PersonalProject {
  name: string;
  tagline: string;
  kind: string;
  description: string;
  stack: string;
  links: Link[];
  icon: IconeProjet;
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
  npm: "https://www.npmjs.com/~armored1486",
  npmLabel: "npmjs.com/~armored1486",
  availability: "Disponible immédiatement · Remote ou hybride Toulouse",
};

// « Toujours en équipe » reprend mot pour mot l'accroche du bloc parcours :
// les deux formulations doivent rester identiques, sinon le site se contredit
// d'un écran à l'autre.
// Volontairement sobre. « Sur ma dernière mission » plutôt que « chez
// Renault » : la mission passait par CELAD. « Des applications de supervision
// sur une flotte » plutôt que « la supervision de » : il a construit les
// outils, il ne pilotait pas la flotte. Et « environ » devant le chiffre,
// qui est un ordre de grandeur. Chaque phrase doit pouvoir être défendue
// telle quelle en entretien.
export const profile =
  "Sept ans à construire des applications web, toujours en équipe. Sur ma dernière mission : un portail de visualisation d'API suivi par 5 000 ingénieurs Renault, puis des applications de supervision sur une flotte d'environ 200 000 véhicules électriques. Mon métier, c'est surtout d'entrer dans du code existant et de le faire évoluer sans rien casser. À côté, j'aime publier mes propres projets, en lien avec ma veille technique.";

export const experiences: Experience[] = [
  {
    claim: "200 000 véhicules électriques sous supervision.",
    metric: "5 000 utilisateurs",
    stat: "200 000",
    statUnit: "véhicules",
    summary: "Quatre ans sur des outils internes pour les véhicules électriques, en équipes de 3 à 11 développeurs et sur plus de 20 dépôts.",
    title: "Développeur Full-Stack",
    company: "CELAD, mission Renault Ampere Software Technology",
    period: "2022 – 2026",
    context: "Automobile, véhicule électrique, outils internes : documentation d'API et supervision de flotte · Full remote",
    bullets: [
      "Portail de documentation de l'API véhicule, suivi par 5 000 ingénieurs Renault.",
      "Deux back-ends de flotte : configuration à distance et traitement des données remontées.",
      "Déploiements Docker / Kubernetes, intégration continue GitLab CI, tests Jest et Cypress.",
    ],
    stack: "React.js, Node.js, TypeScript, GraphQL, API REST, Jest, Cypress, Docker, Kubernetes, GCP, GitLab CI, Git, Linux",
  },
  {
    // Vue.js et non React : vérifié sur le catalogue en ligne, dont la racine
    // porte la clé interne __vue__ et les classes Vuetify (v-application,
    // v-navigation-drawer). Aucun marqueur React nulle part. La version —
    // Vue 2 / Vuetify 2 — correspond à l'époque de la mission, donc il ne
    // s'agit pas d'une réécriture postérieure. Ne pas « corriger » en React.
    // « Atmosphériques » plutôt qu'« environnementales » : c'est ce qu'AERIS
    // héberge réellement — aérosols, ozone, gaz à effet de serre, nuages,
    // qualité de l'air. Le mot est plus précis, donc plus crédible.
    // Le chiffre retenu est le nombre de centres fédérés (4), et non la
    // taille du catalogue : celle-ci a grossi depuis 2022, la revendiquer
    // aujourd'hui reviendrait à s'attribuer ce qui est arrivé après.
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
    // Ethics Group n'est pas un éditeur de logiciels : c'est un cabinet de
    // transformation des organisations et des territoires, spécialisé dans la
    // concertation publique (concertation CNDP Verkor, plan de gestion du
    // Canal du Midi, Réseau Express Vélo de Toulouse Métropole, missions
    // Airbus et Ariane Group). Les applications étaient l'outillage de ce
    // métier — c'est ce que dit désormais la fiche.
    // « Temps réel » a été retiré : le terme ne décrit rien. Ce qui compte
    // est l'effet observable, l'absence de rechargement.
    claim: "Outiller la consultation, du questionnaire au résultat.",
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
      "Réponses poussées au navigateur en WebSocket : les résultats évoluent sans rechargement.",
    ],
  },
];

export const skills: SkillGroup[] = [
  { category: "Langages", skills: ["TypeScript", "JavaScript", "Python", "PHP", "SQL"] },
  { category: "Front-end", skills: ["React.js", "React Native", "Vue.js (Vuex)", "Astro", "HTML / CSS"] },
  { category: "Back-end", skills: ["Node.js (Express)", "API REST", "GraphQL", "Laravel", "PostgreSQL", "MySQL"] },
  { category: "Cloud & infrastructure", skills: ["Docker", "Kubernetes", "GCP", "AWS Lambda", "DynamoDB", "SST", "Firebase", "Linux"] },
  { category: "Tests & CI/CD", skills: ["Jest", "Cypress", "Vitest", "GitLab CI", "GitHub Actions", "Git"] },
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
