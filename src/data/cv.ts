// CV content, source: CV_Julien_Chapron_2026.pdf (Sept. 2026)
// Bilingual: every string lives here, under `fr` and `en`. The page and the
// components pick their locale with Astro.currentLocale, the scripts read
// document.documentElement.lang — one source of truth for both.

export type Locale = "fr" | "en";

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
  description: string;
  details: { title: string; text: string }[];
  status: string;
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

export interface Textes {
  /** The scrolling band's three key figures. */
  bandeauStats: [string, string, string];
  /** The hero title: "Hello, je suis " + the orange name, then the role. */
  heroOverlinePre: string;
  rolePre: string;
  roleEm: string;
  roleFin: string;
  /** The hero's rotating line: the markup writes entry 0 before the script
      takes over, so the two must stay the same array. */
  sousTitres: string[];
  boutonCV: string;
  boutonContact: string;
  carteDispo: string;
  parcoursEyebrow: string;
  parcoursTitre: string;
  parcoursTitreFin: string;
  parcoursLead: string;
  labelContexte: string;
  labelLivre: string;
  labelPoste: string;
  labelMission: string;
  labelPeriode: string;
  flechePrec: string;
  flecheSuiv: string;
  choisirExperience: string;
  competencesEyebrow: string;
  competencesTitre: string;
  competencesTitreFin: string;
  competencesLead: string;
  projetsEyebrow: string;
  projetsTitre: string;
  projetsTitreFin: string;
  projetsLead: string;
  voirProjet: string;
  footerTitre: string;
  footerTexte: string;
  footerStatExp: string;
  footerStatExpValeur: string;
  footerStatApps: string;
  footerContact: string;
  footerAilleurs: string;
  commandeProfil: string;
  commandeExperience: string;
  commandeCompetences: string;
  commandeProjets: string;
  metaTitre: string;
  metaDescription: string;
}

export interface Donnees {
  identity: {
    name: string;
    role: string;
    experience: string;
    headline: string;
    location: string;
    phone: string;
    phoneHref: string;
    email: string;
    github: string;
    githubLabel: string;
    npm: string;
    npmLabel: string;
    linkedin: string;
    availability: string;
  };
  profile: string;
  experiences: Experience[];
  skills: SkillGroup[];
  personalProjects: PersonalProject[];
  education: Education[];
  languages: { name: string; level: string }[];
  before: string;
  ui: Textes;
}

/* ------------------------------------------------------------------ FR ---- */

const fr: Donnees = {
  identity: {
    name: "Julien Chapron",
    role: "Développeur Full-Stack",
    experience: "7 ans d'expérience",
    headline: "TypeScript · React · Node.js · API REST & GraphQL · Docker / Kubernetes",
    location: "Lacroix-Falgarde (31), Toulouse",
    phone: "07 67 75 77 80",
    phoneHref: "tel:+33767757780",
    email: "julienchapron.perso@gmail.com",
    github: "https://github.com/Gleaming0427",
    githubLabel: "github.com/Gleaming0427",
    npm: "https://www.npmjs.com/~armored1486",
    npmLabel: "npmjs.com/~armored1486",
    linkedin: "https://www.linkedin.com/in/julien-chapron",
    availability: "Disponible immédiatement · Remote ou hybride Toulouse",
  },

  // « Principalement en équipe » repeats word for word the tagline of the journey block:
  // the two phrasings must stay identical, otherwise the site contradicts itself
  // from one screen to the next.
  // Deliberately understated. « Sur ma dernière mission » rather than « chez
  // Renault »: the mission went through CELAD. « Des applications de supervision
  // sur une flotte » rather than « la supervision de »: he built the tools, he
  // was not the one piloting the fleet. And « environ » before the figure,
  // which is an order of magnitude. Every sentence must be defensible
  // as is in an interview.
  profile:
    "Sept ans à construire des applications web, principalement en équipe. Sur ma dernière mission, j'ai contribué à un portail de documentation suivi par 5 000 ingénieurs Renault, puis à des applications de supervision sur une flotte d'environ 200 000 véhicules électriques. À côté, j'aime publier mes propres projets, en lien avec ma veille technique.",

  experiences: [
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
        "Contribution au front-end et au back-end de deux applications de supervision de flotte : configuration à distance et traitement des données remontées (React, Node.js, GCP).",
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
      period: "2021 – 2022",
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
  ],

  // What is really used, not what a CV usually says. Ordered by real usage,
  // most hours first —
  // the old list read like a keyword dump.
  // Vitest and PostgreSQL are the exceptions: listed past the first two of
  // their row, the layout already shows them dimmed — known, but not where
  // the real hours are.
  skills: [
    { category: "Langages", skills: ["TypeScript", "JavaScript", "PHP", "SQL", "Python"] },
    { category: "Front-end", skills: ["React.js", "Vue.js (Vuex)", "HTML / CSS", "React Native", "Astro"] },
    { category: "Back-end", skills: ["Node.js (Express)", "API REST", "GraphQL", "PostgreSQL", "Laravel", "MySQL"] },
    { category: "Cloud & infrastructure", skills: ["Docker", "Kubernetes", "GCP", "GitLab CI", "Git", "Linux"] },
    { category: "Tests", skills: ["Jest", "Cypress", "Vitest"] },
    { category: "Méthodes", skills: ["Agile / Scrum", "revues de code"] },
  ],

  personalProjects: [
    {
      name: "Agent QA Kit",
      tagline: "Projet open source · 2026",
      icon: "ia",
      description:
        "Une étape QA indépendante pour prouver qu'une fonctionnalité développée par une IA fonctionne à l'écran. Les tests sont écrits avant le code, validés par une personne, puis rejoués par un agent sans droit d'écriture.",
      details: [
        { title: "Tester avant de coder", text: "Un agent traduit chaque critère en tests Vitest et Playwright. Les nouveaux tests doivent d'abord échouer pour la bonne raison, avant que la fonctionnalité soit développée." },
        { title: "Faire valider les attentes", text: "Une personne relit les tests et leurs échecs, puis les approuve. Le ticket, les tests et les premiers rapports sont figés pour détecter toute modification ultérieure." },
        { title: "Vérifier indépendamment", text: "Un agent sans droit d'écriture exécute les tests. Un script confronte son verdict aux rapports, rejette les tests absents ou ignorés et relance la suite complète, y compris les parcours desktop et mobile." },
        { title: "Mesurer la fiabilité", text: "16 tickets, des bugs injectés et des tests cachés servent à mesurer les agents. La campagne propre détecte 86 bugs sur 87 en 48 essais." },
      ],
      status: "Expérimental : évalué sur une boutique de démonstration, pas encore sur des tickets de projets réels.",
      stack: "Claude Code · TypeScript · Playwright · Vitest · GitHub Actions",
      links: [
        { label: "Découvrir le projet", href: "/agent-qa-kit/" },
        { label: "Code source ↗", href: "https://github.com/Gleaming0427/agent-qa-kit" },
      ],
    },
  ],

  education: [
    {
      title: "Titre professionnel Développeur Logiciel",
      detail: "Wild Code School, Toulouse, 2018 – 2019",
    },
  ],

  languages: [
    { name: "Français", level: "langue maternelle" },
    { name: "Anglais", level: "B1 à l'écrit, A2 à l'oral" },
  ],

  before:
    "11 ans de taille de pierre sur monuments historiques, jusqu'à la reconversion vers le développement en 2017.",

  ui: {
    bandeauStats: ["+7 ans d'exp", "+15 apps en production", "+35 dépôts de production"],
    heroOverlinePre: "Hello, je suis ",
    rolePre: "Développeur ",
    roleFin: " et IA enthousiaste",
    roleEm: "full-stack",
    sousTitres: [
      "Je conçois des API REST et GraphQL",
      "Je fais évoluer du code existant",
      "J'écris mes backends en Node.js",
      "Je construis des interfaces React",
      "Je travaille en TypeScript",
      "Je modélise des bases relationnelles",
      "Je déploie avec Docker et Kubernetes",
      "Je teste avec Jest et Cypress",
      "Je développe en React Native",
      "Je publie en open source",
    ],
    boutonCV: "Télécharger mon CV",
    boutonContact: "Contactez-moi",
    carteDispo: "disponible maintenant",
    parcoursEyebrow: "parcours",
    parcoursTitre: "Sept ans en production.",
    parcoursTitreFin: "Toujours en équipe.",
    parcoursLead: "Trois missions, de la recherche publique à la voiture électrique connectée.",
    labelContexte: "Le contexte",
    labelLivre: "Ce que j'ai livré",
    labelPoste: "Poste",
    labelMission: "Mission",
    labelPeriode: "Période",
    flechePrec: "Expérience précédente",
    flecheSuiv: "Expérience suivante",
    choisirExperience: "Choisir une expérience",
    competencesEyebrow: "compétences",
    competencesTitre: "Ce que j'utilise.",
    competencesTitreFin: "Par ordre d'heures passées.",
    competencesLead: "Sur chaque ligne, les deux premières sont celles où j'ai le plus d'expérience.",
    projetsEyebrow: "projets",
    projetsTitre: "Projets personnels.",
    projetsTitreFin: "Un projet IA en détail.",
    projetsLead: "Comment vérifier le comportement réel d'une application quand son code est écrit par des agents IA ?",
    voirProjet: "Voir le code sur GitHub",
    footerTitre: "Disponible pour votre équipe.",
    footerTexte: "Dites-moi ce que vous construisez, on regarde ensemble ce que j'y apporte.",
    footerStatExp: "expérience",
    footerStatExpValeur: "7 ans",
    footerStatApps: "apps en production",
    footerContact: "contact",
    footerAilleurs: "ailleurs",
    commandeProfil: "cat profil.md",
    commandeExperience: "experience --all",
    commandeCompetences: "cat competences.md",
    commandeProjets: "ls ~/projets-personnels",
    metaTitre: "Julien Chapron · Développeur Full-Stack à Toulouse",
    metaDescription: "Développeur full-stack TypeScript, React et Node.js — sept ans en production, remote ou hybride depuis Toulouse. Parcours, projets et contact.",
  },
};

/* ------------------------------------------------------------------ EN ---- */

const en: Donnees = {
  identity: {
    name: "Julien Chapron",
    role: "Full-Stack Developer",
    experience: "7 years of experience",
    headline: "TypeScript · React · Node.js · API REST & GraphQL · Docker / Kubernetes",
    location: "Lacroix-Falgarde (31), Toulouse",
    phone: "07 67 75 77 80",
    phoneHref: "tel:+33767757780",
    email: "julienchapron.perso@gmail.com",
    github: "https://github.com/Gleaming0427",
    githubLabel: "github.com/Gleaming0427",
    npm: "https://www.npmjs.com/~armored1486",
    npmLabel: "npmjs.com/~armored1486",
    linkedin: "https://www.linkedin.com/in/julien-chapron",
    availability: "Available immediately · Remote or hybrid, Toulouse",
  },

  profile:
    "Seven years building web applications, mostly as part of a team. On my last mission I contributed to a documentation portal followed by 5,000 Renault engineers, then to fleet-supervision applications for about 200,000 electric vehicles. Alongside, I like shipping my own projects, tied to my tech watch.",

  experiences: [
    {
      claim: "under supervision.",
      metric: "5,000 users",
      stat: "200,000",
      statUnit: "vehicles",
      summary: "Four years on internal tools for electric vehicles, in teams of 3 to 11 developers across more than 20 repositories.",
      title: "Full-Stack Developer",
      company: "CELAD, Renault Ampere Software Technology mission",
      period: "2022 – 2026",
      context: "Automotive, electric vehicles, internal tools: API documentation and fleet supervision · Fully remote",
      bullets: [
        "Documentation portal followed by 5,000 Renault engineers.",
        "Contributed to the front end and back end of two fleet supervision applications: remote configuration and processing of returned data (React, Node.js, GCP).",
        "Docker / Kubernetes deployments, GitLab CI continuous integration, Jest and Cypress tests.",
      ],
      stack: "React.js, Node.js, TypeScript, GraphQL, API REST, Jest, Cypress, Docker, Kubernetes, GCP, GitLab CI, Git, Linux",
    },
    {
      claim: "Making atmospheric data findable.",
      metric: "public research",
      stat: "4",
      statUnit: "federated centres",
      summary: "The AERIS data-pole catalogue, bringing together atmospheric data from four centres: satellite, ground, airborne and measurement campaigns.",
      title: "Front-End Developer",
      company: "CNRS, AERIS data pole",
      period: "2021 – 2022",
      context: "Public research, atmospheric data · Toulouse",
      bullets: [
        "Search interface evolutions: facets by parameter, instrument, platform and geographic coverage.",
        "Reusable Vue.js components for the rest of the catalogue.",
        "Integration of the pole's datasets into the interface.",
      ],
    },
    {
      claim: "Tooling public consultation.",
      metric: "front and back",
      stat: "3",
      statUnit: "years",
      summary: "Three years at a consultancy specialising in the transformation of organisations and territories, on its consultation and diagnosis applications.",
      title: "Full-Stack Developer",
      company: "Ethics Group",
      period: "2019 – 2021",
      context: "Change consulting, consultation and diagnosis applications · Toulouse",
      bullets: [
        "Questionnaire and personality-test applications, front-end to back-end.",
        "Vue.js front-end with Vuex, Laravel back-end, MySQL databases designed and integrated.",
        "Real-time answers over WebSocket.",
      ],
    },
  ],

  skills: [
    { category: "Languages", skills: ["TypeScript", "JavaScript", "PHP", "SQL", "Python"] },
    { category: "Front-end", skills: ["React.js", "Vue.js (Vuex)", "HTML / CSS", "React Native", "Astro"] },
    { category: "Back-end", skills: ["Node.js (Express)", "API REST", "GraphQL", "PostgreSQL", "Laravel", "MySQL"] },
    { category: "Cloud & infrastructure", skills: ["Docker", "Kubernetes", "GCP", "GitLab CI", "Git", "Linux"] },
    { category: "Testing", skills: ["Jest", "Cypress", "Vitest"] },
    { category: "Practices", skills: ["Agile / Scrum", "code reviews"] },
  ],

  personalProjects: [
    {
      name: "Agent QA Kit",
      tagline: "Open-source project · 2026",
      icon: "ia",
      description:
        "An independent QA stage that proves an AI-built feature works on screen. Tests are written before the code, approved by a person, then rerun by an agent with no write access.",
      details: [
        { title: "Test before coding", text: "An agent turns each criterion into Vitest and Playwright tests. New tests must first fail for the right reason, before the feature is implemented." },
        { title: "Review the expectations", text: "A person reviews the tests and their initial failures, then approves them. The ticket, tests and first reports are frozen so later changes can be detected." },
        { title: "Verify independently", text: "A read-only agent runs the tests. A script checks its verdict against the reports, rejects missing or skipped tests, and reruns the full suite, including desktop and mobile journeys." },
        { title: "Measure reliability", text: "16 tickets, injected bugs and hidden tests measure the agents. The clean campaign detects 86 of 87 bugs across 48 trials." },
      ],
      status: "Experimental: evaluated on a demo shop, not yet on real project tickets.",
      stack: "Claude Code · TypeScript · Playwright · Vitest · GitHub Actions",
      links: [
        { label: "Explore the project", href: "/agent-qa-kit/" },
        { label: "Source code ↗", href: "https://github.com/Gleaming0427/agent-qa-kit" },
      ],
    },
  ],

  education: [
    {
      title: "Professional certificate, Software Developer",
      detail: "Wild Code School, Toulouse, 2018 – 2019",
    },
  ],

  languages: [
    { name: "French", level: "native speaker" },
    { name: "English", level: "B1 written, A2 spoken" },
  ],

  before:
    "Eleven years carving stone on listed monuments, until the switch to software development in 2017.",

  ui: {
    bandeauStats: ["+7 yrs exp", "+15 apps in production", "+35 production repos"],
    heroOverlinePre: "Hello, I'm ",
    rolePre: "Full-stack ",
    roleFin: " and an AI enthusiast",
    roleEm: "developer",
    sousTitres: [
      "I design REST and GraphQL APIs",
      "I evolve existing code",
      "I write my backends in Node.js",
      "I build React interfaces",
      "I work in TypeScript",
      "I model relational databases",
      "I deploy with Docker and Kubernetes",
      "I test with Jest and Cypress",
      "I develop in React Native",
      "I publish open source",
    ],
    boutonCV: "Download my CV",
    boutonContact: "Get in touch",
    carteDispo: "available now",
    parcoursEyebrow: "journey",
    parcoursTitre: "Seven years in production.",
    parcoursTitreFin: "Always in a team.",
    parcoursLead: "Three missions, from public research to the connected electric car.",
    labelContexte: "The context",
    labelLivre: "What I shipped",
    labelPoste: "Role",
    labelMission: "Mission",
    labelPeriode: "Period",
    flechePrec: "Previous experience",
    flecheSuiv: "Next experience",
    choisirExperience: "Choose an experience",
    competencesEyebrow: "skills",
    competencesTitre: "What I actually use.",
    competencesTitreFin: "By hours spent.",
    competencesLead: "On each row, the first two are where I have the most experience.",
    projetsEyebrow: "projects",
    projetsTitre: "Personal projects.",
    projetsTitreFin: "One AI project in depth.",
    projetsLead: "How can you verify what an app really does when AI agents write its code?",
    voirProjet: "View the code on GitHub",
    footerTitre: "Available for your team.",
    footerTexte: "Tell me what you are building, and let's look together at what I can bring.",
    footerStatExp: "experience",
    footerStatExpValeur: "7 years",
    footerStatApps: "apps in production",
    footerContact: "contact",
    footerAilleurs: "elsewhere",
    commandeProfil: "cat profile.md",
    commandeExperience: "experience --all",
    commandeCompetences: "cat skills.md",
    commandeProjets: "ls ~/personal-projects",
    metaTitre: "Julien Chapron · Full-Stack Developer in Toulouse",
    metaDescription: "Full-stack TypeScript, React and Node.js developer — seven years in production, remote or hybrid from Toulouse. Journey, projects and contact.",
  },
};

export const cv: Record<Locale, Donnees> = { fr, en };

// Convenience exports for the Astro side, kept for the components that used
// to import them directly.
export const identity = fr.identity;
export const profile = fr.profile;
export const experiences = fr.experiences;
export const skills = fr.skills;
export const personalProjects = fr.personalProjects;
export const education = fr.education;
export const languages = fr.languages;
export const before = fr.before;
