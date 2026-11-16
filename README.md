# Page de présentation de Wanderer

Une seule page, en 10 langues, pour être trouvée sur Google par des joueurs de WoW Forever qui cherchent un besoin (cacher les noms, immersion, vente de la camelote...).

## Fichiers

```
site/
  config.json        adresse du site, liens (CurseForge, Wago, GitHub), version, vidéo, langues
  content/en.json    le texte de référence (anglais) : le plan de toutes les langues
  content/<langue>.json   fr, de, es, it, pt-br, ru, ko, zh-cn, zh-tw
  src/style.css      l'apparence
  src/video.js       la vidéo chargée seulement au clic
  assets/            logo, images ; SHOTS.md liste les captures à produire
  build.js           fabrique dist/
  check.js           vérifie dist/
  serve.js           montre dist/ sur http://localhost:8080
  dist/              le site prêt à mettre en ligne (refait à chaque build)
```

## Commandes

```
node build.js            fabrique dist/
node build.js --drafts   idem, avec un cadre à la place des captures manquantes
node check.js            vérifie : tirets longs, h1, titres, hreflang, JSON-LD, sitemap, fichiers
node check.js --links    vérifie aussi que les liens extérieurs répondent
node serve.js            aperçu local
```

## Mettre à jour

- Une nouvelle version de l'addon : changer `version` dans `config.json`, puis build.
- Un texte : modifier `content/en.json`, puis la même clé dans chaque langue. Une clé absente d'une langue reprend l'anglais, et le build le signale.
- GitHub : `links.github` dans `config.json`. Un lien vide n'affiche pas son bouton. Plus de Wago (CurseForge seulement).

## Mettre en ligne

1. Renseigner `siteUrl` dans `config.json` (par exemple `https://wanderer-addon.com`, sans `/` final), puis `node build.js` et `node check.js`.
2. Publier le **contenu** de `dist/` à la racine du domaine. Au choix, gratuit :
   - **Cloudflare Pages** ou **Netlify** : glisser le dossier `dist/` dans le tableau de bord (Netlify Drop), puis relier le nom de domaine.
   - **GitHub Pages** : pousser `dist/` sur une branche `gh-pages` (ou dans `docs/`) du dépôt.
3. Déclarer le site dans **Google Search Console** et y envoyer `https://<domaine>/sitemap.xml`.
4. Vérifier les données structurées avec le test des résultats enrichis de Google (Rich Results Test) sur `/en/`.

La racine `/` envoie vers `/en/` (version de référence, aussi `x-default`).

## Réglages ajoutés après l'audit

- **Version et date** : prises automatiquement dans la dernière étiquette de version de l'addon (`v0.35.0`...), celle que les plateformes ont reçue. Rien à écrire à la main.
- **Auteur** : `author.name` dans `config.json` (ou la variable d'environnement `AUTHOR_NAME`). Un pseudo, jamais un nom réel. Liens CurseForge et GitHub dans `author`.
- **Compteur de téléchargements CurseForge** : `downloads.enabled` (désactivé), `downloads.min` (500 par défaut, ou `SHOW_DOWNLOADS_MIN`). La clé de l'API officielle va dans la variable d'environnement `CURSEFORGE_API_KEY`, jamais dans un fichier. Au build, `fetch-downloads.js` demande le chiffre à l'API ; sans clé, en cas d'échec ou sous le seuil, rien ne s'affiche. Aucune valeur n'est gardée sur le disque : les conditions de l'API interdisent de stocker ses données.
- **Vérifications** : `node check-audit.js` (Open Graph, titres, descriptions, accessibilité, images, vidéo, robots, sitemap, contrastes, poids) en plus de `node check.js --links`.

## Extensions (refonte du 2026-11-08)

- Les 10 extensions ont leur page dans chaque langue : `/<langue>/<clé>/` (bags, auction, mail, quests, maps, training, outfits, professions, chat, bestiary ; liste `EXTENSIONS` dans `build.js`, à reporter dans les listes de `check.js` et `check-audit.js`).
- L'accueil montre la famille en grille de cartes (`t.<clé>` : alt, tagline, summary), puis Wanderer lui-même (`core` puis `sections`).
- Une extension pas encore sur CurseForge : sa clé dans `config.comingSoon`. Sa page existe, avec « Bientôt sur CurseForge » au lieu des boutons. À sa publication, retirer la clé de `comingSoon`, puis build.
- `config.unreleased` retire une extension du site entièrement.
- `config.removed` : les clés d'extensions retirées pour de bon (campfire, Wanderer Campfire Game arrêté le 2026-11-11). Le `.htaccess` renvoie leurs anciennes adresses `/<langue>/<clé>/` vers l'accueil de la langue (301). L'envoi SFTP ne supprime pas les anciens fichiers du serveur : la redirection passe avant eux.
- Une extension sans logo : `illustrations/make.js` dessine un emblème carré (`assets/bestiary.svg`) ; un `assets/<clé>.webp` fait par `make_extensions.js` le remplace dès qu'il existe.
- Textes : `content/extensions/<langue>.json` (`extensionPage`, `pages.<clé>` : meta, h1, lead, sections, faq). Vérifier une langue : `node validate-lang.js fr`.
- Emblèmes : `node make_extensions.js` (depuis `media/Logo`). Illustrations sans texte (valables pour les 10 langues) : `node illustrations/make.js` écrit `assets/<section>.svg`.
- Inventaire des fonctions qui a servi aux textes : `~/.voile-tools/catalog-2026-11-08/`.
