# Captures à produire

Dépose chaque fichier ici, dans `site/assets/`, avec exactement ce nom (l'extension est libre : `.webp` conseillé, sinon `.jpg`, `.png`, `.avif` ou `.gif`). Relance `node build.js` : l'image apparaît toute seule dans les 10 langues, avec son texte alternatif traduit. Tant qu'un fichier manque, sa place est simplement absente de la page (`node build.js --drafts` montre un cadre à la place, pour voir la mise en page).

Format conseillé : 16:9, 1600 × 900 px, interface du jeu en anglais ou sans texte lisible si possible (la même image sert aux 10 langues), poids sous 200 Ko (WebP qualité 80). Un GIF peut vite peser plusieurs Mo : préfère une courte vidéo coupée en WebP animé, ou une image fixe.

| Fichier | Section | Ce qu'on doit voir |
|---|---|---|
| `names-hidden-revealed` | Cacher les noms | Une ville animée (Hurlevent, Orgrimmar) avec **aucun nom** au-dessus des têtes, puis la souris passe sur un personnage et **son étiquette apparaît** au-dessus de sa tête. Idéal en WebP animé de 3 ou 4 s ; sinon une image fixe avec l'étiquette visible et la foule sans noms autour. |
| `label-npc` | Étiquette de survol | Gros plan sur l'étiquette au-dessus d'un **donneur de quête** : portrait rond, niveau coloré, rôle, objectifs de quête (3/8) et petite barre de vie. |
| `quest-scene` | Quêtes en scènes | Une **quête en scène** : interface effacée, caméra rapprochée du PNJ, panneau en bas avec le texte et les récompenses. |
| `options-styles` | Options et styles | La **fenêtre d'options** (Échap, Options, AddOns, Wanderer) sur la page des styles prédéfinis, avec l'aperçu en direct de l'étiquette. |

Déjà en place : `logo.svg` (logo et icône d'onglet), `og-image.jpg` (aperçu lors d'un partage, tiré de la miniature YouTube), `video-poster.jpg` (image de la vidéo avant le clic), `apple-touch-icon.png`.


## Illustrations dessinées (refonte 2026-11-08)

Les sections sans capture ont une illustration SVG sans texte : `frames`, `items`, `travel`, `group`, `characters` (faites par `illustrations/make.js`). Une vraie capture du même nom en `.webp` passe devant (l'ordre de recherche met le WebP en premier). Captures utiles à remplacer : les cadres d'unité « Ink lines » (`frames`), une infobulle d'objet avec la ligne verte (`items`), un vol avec la ligne de progression (`travel`), la roue des marqueurs (`group`), la fenêtre des personnages (`characters`).
