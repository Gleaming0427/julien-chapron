# Julien Chapron — Online CV

**https://gleaming0427.github.io/julien-chapron/**

Single-page CV site built with [Astro](https://astro.build), deployed on GitHub Pages.

## The page, top to bottom

- **Profile**: tagline that fades out on scroll
- **Journey**: 3D point cloud (torus), black then white, arriving on its own between the profile and the experiences
- **Experiences**: scroll-pinned card carousel
- **Skills**: hairline table with a Japanese decoding effect replaying on a few rows (left-to-right wave, in orange)
- **Projects**: full-height 4-column grid, orange icons, balanced copy, no links
- **Footer**: rounded orange sheet on a dotted dark background, "Contactez-moi" button
- **Dotted background**: dots fade in and out between blocks, then come back as the footer approaches
- **Responsive**: burger menu pinned to the top on phone, navbar on tablet and desktop, screen-adapted 3D donut

## Development

```sh
npm install
npm run dev    # http://localhost:4321/julien-chapron/
npm run build  # static build in dist/
```

Every push to `main` deploys automatically (GitHub Actions → GitHub Pages).

## CV content

All content lives in [src/data/cv.ts](src/data/cv.ts).
