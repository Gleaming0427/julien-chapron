# Julien Chapron — CV en ligne

**https://gleaming0427.github.io/julien-chapron/**

Site CV d'une page, construit avec [Astro](https://astro.build) et déployé sur GitHub Pages.

## La page, de haut en bas

- **Profil** : accroche qui disparaît au scroll
- **Parcours** : nuage de points 3D (tore), noir puis blanc, qui arrive tout seul entre le profil et les expériences
- **Expériences** : carrousel de fiches épinglé au scroll
- **Compétences** : tableau en liserés fins, avec un décodage japonais rejoué en boucle sur quelques lignes (vague de gauche à droite, en orange)
- **Projets** : grille 4 colonnes pleine hauteur, icônes orange, textes équilibrés, sans liens
- **Footer** : feuille orange arrondie sur fond noir tramé, bouton « Contactez-moi »
- **Trame de fond** : les petits points apparaissent et disparaissent en douceur entre les blocs, puis reviennent à l'approche du footer
- **Responsive** : menu burger fixé en haut sur téléphone, navbar sur tablette et ordinateur, donut 3D adapté à l'écran

## Développement

```sh
npm install
npm run dev    # http://localhost:4321/julien-chapron/
npm run build  # build statique dans dist/
```

Tout push sur `main` est déployé automatiquement (GitHub Actions → GitHub Pages).

## Contenu du CV

Tout le contenu est dans [src/data/cv.ts](src/data/cv.ts).
