// Récupère les repos publics GitHub de Gleaming0427 et les écrit dans src/data/repos.json.
// Usage : npm run fetch-repos
// Le fichier est committé : le build ne dépend pas du réseau ni des quotas de l'API.
import { writeFile, mkdir } from 'node:fs/promises';

const USERNAME = 'Gleaming0427';
const API = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=100`;

// Descriptions locales pour les repos qui n'en ont pas (ou peu) sur GitHub.
const overrides = {
  'julien-chapron': 'Site CV en ligne — Astro + GitHub Pages, thème terminal interactif.',
  'shotokai-website':
    'Site vitrine du club de karaté Shotokaï de Lacroix-Falgarde — Astro, content collections Markdown.',
  'api-gateway':
    'Source de la librairie npm @armored1486/api-gateway-core : toolkit d’API gateway serverless.',
};

const res = await fetch(API, {
  headers: { 'User-Agent': 'julien-chapron-site', Accept: 'application/vnd.github+json' },
});
if (!res.ok) {
  throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
}
const repos = await res.json();

const data = repos
  .filter((repo) => !repo.fork)
  .map((repo) => ({
    name: repo.name,
    description: overrides[repo.name] ?? repo.description ?? '',
    language: repo.language ?? null,
    homepage: repo.homepage ?? null,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
    pushed_at: repo.pushed_at,
  }));

const target = new URL('../src/data/repos.json', import.meta.url);
await mkdir(new URL('.', target), { recursive: true });
await writeFile(target, JSON.stringify(data, null, 2) + '\n');
console.log(`${data.length} repos écrits dans src/data/repos.json`);
