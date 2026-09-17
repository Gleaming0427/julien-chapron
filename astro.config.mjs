// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Domaine personnalisé : le site vit désormais à la RACINE, plus dans un
  // sous-dossier de github.io. `base` doit donc valoir '/', sinon toutes les
  // ressources continueraient d'être cherchées sous /julien-chapron/.
  // `site` alimente le sitemap et les URL canoniques des pages.
  site: 'https://julien-chapron.com',
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always',
  },
});
