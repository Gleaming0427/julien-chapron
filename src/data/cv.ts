// Contenu du CV — source : CV_Julien_Chapron_2026.pdf (sept. 2026)

export interface Experience {
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

export interface PersonalProject {
  name: string;
  tagline: string;
  kind: string;
  description: string;
  stack: string;
  links: Link[];
}

export interface App {
  name: string;
  emoji: string;
  type: string;
  status: string;
  description: string;
  stack: string;
  links: Link[];
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

export const profile =
  "Développeur full-stack depuis 7 ans, principalement sur des applications web internes : TypeScript, React et Node.js, en API REST et GraphQL, avec conteneurisation Docker / Kubernetes et intégration continue. Quatre ans chez Renault sur des outils internes destinés aux ingénieurs : documentation de l'API des véhicules électriques et supervision de flotte, dans des équipes de 1 à 11 développeurs. Depuis 2026, je développe et publie mes propres projets en TypeScript et Node.js, dont une librairie serverless publiée sur npm. Certification AWS Solutions Architect Associate (SAA-C03) en préparation, examen prévu au troisième trimestre 2026.";

export const experiences: Experience[] = [
  {
    title: "Développeur Full-Stack",
    company: "CELAD, mission Renault Ampere Software Technology",
    period: "2022 – 2026",
    context: "Automobile, véhicule électrique — outils internes : documentation d'API et supervision de flotte · Full remote",
    bullets: [
      "Portail de documentation de l'API du véhicule, utilisé par 5 000 ingénieurs Renault : développement front-end React.js et back-end Node.js / TypeScript, en API REST et GraphQL. Équipe de 3 à 11 développeurs, interventions sur 11 dépôts.",
      "Deux applications back-end de gestion de flotte, de 100 000 à 200 000 véhicules électriques : envoi de configurations à distance aux véhicules, récupération et traitement des données remontées. Équipe de 1 à 3 développeurs, puis seul sur ce périmètre de 2025 à 2026, sur 7 à 8 dépôts.",
      "Tests unitaires et tests d'intégration (Jest, Cypress), participation aux revues de code.",
      "Déploiements Docker / Kubernetes et pipelines d'intégration continue GitLab CI.",
      "Sur GCP : ajout de bases de données et de Cloud Functions dans une architecture existante, et diagnostic d'incidents en production lors d'une migration interne d'architecture.",
    ],
    stack: "React.js, Node.js, TypeScript, GraphQL, API REST, Jest, Cypress, Docker, Kubernetes, GCP, GitLab CI, Git, Linux",
  },
  {
    title: "Développeur Front-End",
    company: "CNRS, Laboratoire AERIS",
    period: "2022",
    context: "Recherche publique, données environnementales · Toulouse",
    bullets: [
      "Évolution de l'interface du catalogue de données environnementales : développement de composants React.js et intégration de données.",
    ],
  },
  {
    title: "Développeur Full-Stack",
    company: "Ethics Group",
    period: "2018 – 2021",
    context: "Édition logicielle, sondages et tests de personnalité · Toulouse",
    bullets: [
      "Applications web de sondages et de tests de personnalité : front-end Vue.js (Vuex), back-end Laravel (PHP), fonctionnalités temps réel en WebSocket, conception et intégration de bases MySQL.",
    ],
  },
];

export const skills: SkillGroup[] = [
  { category: "Langages", skills: ["TypeScript", "JavaScript (ES2024)", "Python", "PHP", "SQL"] },
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
    description:
      "Toolkit d'API gateway serverless : limitation de débit token-bucket avec store enfichable, validation de jetons JWT RS256, validation de schémas typée et erreurs typées. Logique sans dépendance à un fournisseur cloud, couverte par des tests, avec intégration continue et déploiement multi-région. 15 versions publiées entre mai et juin 2026.",
    stack: "TypeScript, Node.js (ESM), Zod, jose, SST, AWS Lambda, DynamoDB, GitHub Actions",
    links: [
      { label: "@armored1486/api-gateway-core · MIT", href: "https://www.npmjs.com/package/@armored1486/api-gateway-core" },
      { label: "github.com/Gleaming0427/api-gateway", href: "https://github.com/Gleaming0427/api-gateway" },
    ],
  },
  {
    name: "cve-agent",
    tagline: "détection de vulnérabilités exploitables",
    kind: "open source",
    description:
      "Agent qui identifie, dans une base de code, les CVE réellement atteignables : analyse AST de reachability et triage assisté par IA.",
    stack: "Python, Mistral AI",
    links: [{ label: "github.com/Gleaming0427/cve-agent", href: "https://github.com/Gleaming0427/cve-agent" }],
  },
  {
    name: "L'Atelier CoQuest",
    tagline: "plateforme SaaS de formation au recrutement",
    kind: "projet personnel",
    description:
      "Plateforme développée de bout en bout : architecture full-stack, temps réel multi-clients (SSE), authentification JWT et double facteur TOTP, chiffrement et conformité RGPD, base de données relationnelle et gestion multi-rôles.",
    stack: "React 19 / Vite, Node.js / Express 5, PostgreSQL, SSE, JWT + 2FA TOTP",
    links: [],
  },
  {
    name: "Pims Pocket",
    tagline: "application mobile de gestion d'argent de poche",
    kind: "projet personnel",
    description:
      "Double interface parent / enfant : architecture multi-rôles avec règles de sécurité Firestore, authentification enfant par code et PIN, synchronisation temps réel et migration de données idempotente en production.",
    stack: "React Native (Expo Router), TypeScript, Zustand, Firebase, NativeWind",
    links: [],
  },
  {
    name: "Studio CoQuest",
    tagline: "lecture de plateau de jeu par vision IA",
    kind: "preuve de concept",
    description:
      "Application full-stack lisant un plateau de jeu physique à partir d'une photo : identification du numéro, de la couleur et des jetons de chaque carte, via extraction structurée par modèle de vision.",
    stack: "TypeScript, Node.js / Express, React / Vite, GPT-4o Vision",
    links: [],
  },
  {
    name: "Site vitrine CoQuest",
    tagline: "coquest.fr",
    kind: "site en ligne",
    description:
      "Site en génération statique : content collections Markdown et Zod, design system CSS, SEO technique, build optimisé (WebP, Brotli) et déploiement GitLab CI vers VPS.",
    stack: "Astro, JavaScript ES2024, CSS, Node.js, GitLab CI",
    links: [{ label: "coquest.fr", href: "https://coquest.fr" }],
  },
];

export const apps: App[] = [
  {
    name: "L'Atelier CoQuest",
    emoji: "🎓",
    type: "Application web · SaaS",
    status: "projet personnel",
    description:
      "Plateforme de formation au recrutement : temps réel multi-clients (SSE), authentification JWT + 2FA TOTP, chiffrement et conformité RGPD, gestion multi-rôles.",
    stack: "React 19 · Node.js / Express 5 · PostgreSQL",
    links: [],
  },
  {
    name: "Pims Pocket",
    emoji: "💰",
    type: "Application mobile",
    status: "projet personnel",
    description:
      "Gestion d'argent de poche à double interface parent / enfant : sécurité Firestore multi-rôles, code + PIN enfant, synchronisation temps réel.",
    stack: "React Native (Expo Router) · TypeScript · Firebase",
    links: [],
  },
  {
    name: "Studio CoQuest",
    emoji: "🎲",
    type: "Preuve de concept · vision IA",
    status: "POC",
    description:
      "Lecture d'un plateau de jeu physique à partir d'une photo : identification du numéro, de la couleur et des jetons de chaque carte.",
    stack: "TypeScript · Node.js / Express · GPT-4o Vision",
    links: [],
  },
  {
    name: "Site vitrine CoQuest",
    emoji: "🌐",
    type: "Site web statique",
    status: "en ligne",
    description:
      "Site en génération statique avec Astro : content collections, SEO technique, build optimisé (WebP, Brotli), déploiement GitLab CI.",
    stack: "Astro · JavaScript ES2024 · CSS",
    links: [{ label: "coquest.fr", href: "https://coquest.fr" }],
  },
  {
    name: "api-gateway-core",
    emoji: "🔌",
    type: "Librairie npm",
    status: "open source · MIT",
    description:
      "Toolkit d'API gateway serverless : rate limiting token-bucket, validation JWT RS256, schémas typés. 15 versions publiées en mai–juin 2026.",
    stack: "TypeScript · SST · AWS Lambda · DynamoDB",
    links: [
      { label: "npm", href: "https://www.npmjs.com/package/@armored1486/api-gateway-core" },
      { label: "GitHub", href: "https://github.com/Gleaming0427/api-gateway" },
    ],
  },
  {
    name: "cve-agent",
    emoji: "🛡️",
    type: "Agent IA · CLI",
    status: "open source",
    description:
      "Identifie dans une base de code les CVE réellement atteignables : analyse AST de reachability et triage assisté par IA.",
    stack: "Python · Mistral AI",
    links: [{ label: "GitHub", href: "https://github.com/Gleaming0427/cve-agent" }],
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
  { name: "Anglais", level: "B2 à l'écrit, A2-B1 à l'oral" },
];

export const before =
  "11 ans de taille de pierre sur monuments historiques, jusqu'à la reconversion vers le développement en 2017.";
