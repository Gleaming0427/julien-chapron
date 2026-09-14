# julien-chapron

Site CV en ligne : **https://gleaming0427.github.io/julien-chapron/**

Construit avec [Astro](https://astro.build) (statique), thème « terminal » sombre, déployé sur GitHub Pages.

## Pages

- `/` — CV complet (profil, expériences, compétences, projets personnels, formation) avec un mini-terminal interactif dans le hero : tapez `help`
- `/projets` — repositories GitHub + projets personnels
- `/apps` — galerie des applications & outils

Le CV est aussi téléchargeable en PDF (`public/CV_Julien_Chapron.pdf`) et la page s'imprime proprement (Ctrl/Cmd + P).

## Développement

```sh
npm install
npm run dev        # http://localhost:4321/julien-chapron/
npm run build      # build statique dans dist/
```

## Déploiement

Tout push sur `main` déclenche le workflow `.github/workflows/deploy.yml` (GitHub Actions → GitHub Pages). Rien d'autre à faire.

## Mettre à jour le contenu

- **CV** : modifier [src/data/cv.ts](src/data/cv.ts) (tout le contenu est typé)
- **Repos GitHub** : `npm run fetch-repos` puis commit — régénère `src/data/repos.json` depuis l'API GitHub

## Licence

Voir [LICENSE](LICENSE).
