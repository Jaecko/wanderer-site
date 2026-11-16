// Builds the Wanderer page in every language: one folder per language in dist/.
// Usage: node build.js            the pages to publish
//        node build.js --drafts   the same, with a frame where each missing screenshot will go
//
// content/en.json is the reference: every other language follows its plan, and
// any text missing in a language falls back to the English one (the build says so).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const DRAFTS = process.argv.includes('--drafts');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const SITE = config.siteUrl.replace(/\/+$/, '');
const { execFileSync } = require('child_process');

// The released version and its date: the addon's last version tag (the one the
// platforms got), never a number written by hand. Without the addon's git
// folder at hand: the version line of its .toc, then config.json.
function Release() {
	const gitDir = process.env.WANDERER_GIT || config.addonGit;
	try {
		const tag = execFileSync('git', ['--git-dir=' + gitDir, 'describe', '--tags', '--abbrev=0'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		const date = execFileSync('git', ['--git-dir=' + gitDir, 'log', '-1', '--format=%cs', tag], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		if (/^v?\d+\.\d+\.\d+$/.test(tag)) return { version: tag.replace(/^v/, ''), date };
	} catch (e) { /* no git: the next source */ }
	try {
		const toc = fs.readFileSync(process.env.WANDERER_TOC || config.addonToc, 'utf8');
		const found = toc.match(/^## Version:\s*([\d.]+)/m);
		if (found) return { version: found[1], date: new Date().toISOString().slice(0, 10) };
	} catch (e) { /* no .toc: config.json */ }
	warn('version: no tag and no .toc found, config.json used');
	return { version: config.version, date: new Date().toISOString().slice(0, 10) };
}
const RELEASE = Release();

// A fingerprint in the address of the style and the script: a new version is
// always fetched again, the old one kept in cache never shows.
const crypto = require('crypto');
const stamp = (file) => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'src', file))).digest('hex').slice(0, 10);
const STYLE = '/style.css?v=' + stamp('style.css');
const SCRIPT = '/video.js?v=' + stamp('video.js');

// The author, a setting (AUTHOR_NAME), a nickname, never a real name.
const AUTHOR = {
	name: process.env.AUTHOR_NAME || config.author.name,
	curseforge: config.author.curseforge,
	github: config.author.github,
};

// The CurseForge download count (off until a key is given): asked to the
// official API at build time, shown only when high enough; nothing kept.
function Downloads() {
	const settings = config.downloads || {};
	if (!settings.enabled || !process.env.CURSEFORGE_API_KEY) return null;
	try {
		const out = execFileSync(process.execPath, [path.join(ROOT, 'fetch-downloads.js')], { encoding: 'utf8', timeout: 15000, env: process.env });
		const count = JSON.parse(out || '{}').count;
		const least = Number(process.env.SHOW_DOWNLOADS_MIN || settings.min || 500);
		if (Number.isFinite(count) && count >= least) return count;
	} catch (e) { /* the counter stays hidden: the build goes on */ }
	return null;
}
const DOWNLOADS = Downloads();
const IMAGE_TYPES = ['webp', 'avif', 'jpg', 'jpeg', 'png', 'gif', 'svg'];

const warnings = [];
const warn = (message) => warnings.push(message);

// ---------- content ----------

// A language: its page (content/<slug>.json) and its extensions' pages (content/extensions/<slug>.json).
function load(slug) {
	const text = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', slug + '.json'), 'utf8'));
	const more = path.join(ROOT, 'content', 'extensions', slug + '.json');
	if (fs.existsSync(more)) Object.assign(text, JSON.parse(fs.readFileSync(more, 'utf8')));
	return text;
}

// The extensions: each has its own page in every language (/<language>/<key>/).
const EXTENSIONS = [
	['bags', 'Wanderer Bags'], ['auction', 'Wanderer Auction'], ['mail', 'Wanderer Mail'],
	['quests', 'Wanderer Quests'], ['maps', 'Wanderer Maps'], ['training', 'Wanderer Training'],
	['outfits', 'Wanderer Outfits'], ['professions', 'Wanderer Professions'], ['chat', 'Wanderer Chat'], ['bestiary', 'Wanderer Bestiary'],
].map(([key, name]) => ({ key, name, places: [[key + 'Curseforge', 'CurseForge']], github: key + 'Github',
	soon: (config.comingSoon || []).includes(key) })) // (not on CurseForge yet: its page says so, no download button)
	.filter((ext) => !(config.unreleased || []).includes(ext.key)); // (an extension left out entirely: no page, no card)

// Fills what a language lacks with the English text, keeping its own plan.
function withFallback(value, reference, where) {
	if (value === undefined || value === null || value === '') {
		warn(where + ': missing, English used');
		return reference;
	}
	if (Array.isArray(reference)) {
		if (!Array.isArray(value)) return reference;
		if (value.length !== reference.length) warn(where + ': ' + value.length + ' items instead of ' + reference.length);
		return reference.map((item, i) => withFallback(value[i], item, where + '[' + i + ']'));
	}
	if (typeof reference === 'object') {
		const out = {};
		for (const key of Object.keys(reference)) out[key] = withFallback(value[key], reference[key], where + '.' + key);
		return out;
	}
	return value;
}

// Typography: no-break spaces where a line must never break.
//   every language: a number and its word ("10 languages", "Version 0.34.0"),
//   the names "WoW Forever", "World of Warcraft", "Total RP 3", and the last
//   word of a sentence never left alone on its line;
//   French: before : ; ? ! % and inside the quotes.
const NO_BREAK = String.fromCharCode(0xa0);
const KEEP = new Set(['lang', 'hreflang', 'ogLocale', 'file', 'id']);
const NAMES = ['World of Warcraft Forever', 'World of Warcraft', 'WoW Forever', 'Total RP 3'];
function typeset(text, lang) {
	let t = text;
	for (const name of NAMES) t = t.split(name).join(name.split(' ').join(NO_BREAK));
	t = t.replace(/(\d) (?=\p{L})/gu, '$1' + NO_BREAK).replace(/(\p{L}) (?=\d|\{version\})/gu, '$1' + NO_BREAK);
	if (lang.startsWith('fr')) {
		t = t.replace(/ ([:;?!%»])/g, NO_BREAK + '$1').replace(/« /g, '«' + NO_BREAK);
	}
	// The last word joins the one before (short ones only: a long one may need the room).
	t = t.replace(/ (\S{1,12})$/u, NO_BREAK + '$1');
	return t;
}
function typography(value, lang, key) {
	if (typeof value === 'string') return KEEP.has(key) ? value : typeset(value, lang);
	if (Array.isArray(value)) return value.map((v) => typography(v, lang));
	if (value && typeof value === 'object') {
		const out = {};
		for (const k of Object.keys(value)) out[k] = typography(value[k], lang, k);
		return out;
	}
	return value;
}

const reference = load(config.defaultLanguage);
const pages = config.languages.map((slug) => {
	const text = slug === config.defaultLanguage ? reference : withFallback(load(slug), reference, slug);
	return { slug, text: typography(text, text.lang) };
});

// ---------- helpers ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pageUrl = (slug, sub) => SITE + '/' + slug + '/' + (sub ? sub + '/' : '');
const pagePath = (slug, sub) => '/' + slug + '/' + (sub ? sub + '/' : '');
const plain = (text) => String(text).split(NO_BREAK).join(' '); // machines read plain spaces
const asset = (file) => '/assets/' + file;

function findImage(base) {
	for (const type of IMAGE_TYPES) {
		const file = base + '.' + type;
		if (fs.existsSync(path.join(ROOT, 'assets', file))) return file;
	}
	return null;
}

// Width and height of a PNG, GIF, JPEG or WebP, so the page never jumps while loading.
function imageSize(file) {
	const b = fs.readFileSync(path.join(ROOT, 'assets', file));
	if (file.endsWith('.svg')) {
		const box = b.toString('utf8').match(/viewBox="0 0 (\d+) (\d+)"/);
		return box ? [Number(box[1]), Number(box[2])] : null;
	}
	if (b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
	if (b.toString('ascii', 0, 3) === 'GIF') return [b.readUInt16LE(6), b.readUInt16LE(8)];
	if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
		const kind = b.toString('ascii', 12, 16);
		if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
		if (kind === 'VP8L') {
			const bits = b.readUInt32LE(21);
			return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
		}
		return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
	}
	if (b[0] === 0xff && b[1] === 0xd8) {
		let i = 2;
		while (i < b.length) {
			const marker = b[i + 1];
			const length = b.readUInt16BE(i + 2);
			if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
			i += 2 + length;
		}
	}
	return null;
}

function figure(image, t) {
	if (!image) return '';
	const file = findImage(image.file);
	if (!file) {
		if (!DRAFTS) return '';
		return `<figure class="shot shot-missing"><div class="shot-frame" role="img" aria-label="${esc(image.alt)}"><span>${esc(t.ui.screenshotSoon)}<br><code>assets/${esc(image.file)}.webp</code></span></div></figure>`;
	}
	const size = imageSize(file);
	const dims = size ? ` width="${size[0]}" height="${size[1]}"` : '';
	return `<figure class="shot reveal"><div class="frame"><img src="${asset(file)}" alt="${esc(image.alt)}"${dims} loading="lazy" decoding="async"></div></figure>`;
}

const fill = (s) => String(s).replace('{version}', RELEASE.version);

// ---------- structured data ----------

// An extension, as a free application built on Wanderer (one node, the same in every language).
function extensionApp(page, ext) {
	const t = page.text;
	const x = t.pages[ext.key];
	const links = ext.soon ? [] : ext.places.map(([key]) => config.links[key]).filter(Boolean);
	return {
		'@type': 'SoftwareApplication',
		'@id': SITE + '/#' + ext.key,
		name: ext.name,
		description: plain(x.lead),
		url: pageUrl(page.slug, ext.key),
		applicationCategory: 'GameApplication',
		applicationSubCategory: 'World of Warcraft addon',
		operatingSystem: 'Windows, macOS',
		softwareRequirements: 'World of Warcraft Forever, Wanderer',
		isBasedOn: { '@id': SITE + '/#wanderer' },
		inLanguage: pages.map((p) => p.text.hreflang),
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: ext.soon ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock', url: links[0] || pageUrl(page.slug, ext.key) },
		downloadUrl: links[0],
		author: { '@id': SITE + '/#author' },
		image: findImage(ext.key) ? SITE + asset(findImage(ext.key)) : undefined,
		featureList: x.sections.map((section) => plain(section.h2)),
		sameAs: links.concat(!ext.soon && config.links[ext.github] ? [config.links[ext.github]] : []),
	};
}

// An extension's page: what it is, in the site's words, its questions, the way back.
function extensionData(page, ext) {
	const t = page.text;
	const x = t.pages[ext.key];
	const url = pageUrl(page.slug, ext.key);
	const graph = [
		{ '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'Wanderer', inLanguage: pages.map((p) => p.text.hreflang), publisher: { '@id': SITE + '/#author' } },
		{ '@type': 'Person', '@id': SITE + '/#author', name: AUTHOR.name, url: AUTHOR.curseforge, sameAs: [AUTHOR.curseforge, AUTHOR.github].filter(Boolean) },
		{
			'@type': 'WebPage',
			'@id': url + '#webpage',
			url,
			name: plain(x.meta.title),
			description: plain(x.meta.description),
			inLanguage: t.hreflang,
			isPartOf: { '@id': SITE + '/#website' },
			about: { '@id': SITE + '/#' + ext.key },
			mainEntity: { '@id': SITE + '/#' + ext.key },
			breadcrumb: { '@id': url + '#breadcrumb' },
			hasPart: { '@id': url + '#faq' },
			dateModified: new Date().toISOString().slice(0, 10),
		},
		{
			'@type': 'BreadcrumbList',
			'@id': url + '#breadcrumb',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Wanderer', item: pageUrl(page.slug) },
				{ '@type': 'ListItem', position: 2, name: ext.name, item: url },
			],
		},
		{ '@type': 'SoftwareApplication', '@id': SITE + '/#wanderer', name: 'Wanderer', url: pageUrl(page.slug), applicationCategory: 'GameApplication', operatingSystem: 'Windows, macOS',
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', url: config.links.curseforge } },
		extensionApp(page, ext),
		{
			'@type': 'FAQPage',
			'@id': url + '#faq',
			inLanguage: t.hreflang,
			isPartOf: { '@id': url + '#webpage' },
			mainEntity: x.faq.map((item) => ({ '@type': 'Question', name: plain(item.q), acceptedAnswer: { '@type': 'Answer', text: plain(item.a) } })),
		},
	];
	const data = { '@context': 'https://schema.org', '@graph': graph };
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function structuredData(page) {
	const t = page.text;
	const url = pageUrl(page.slug);
	const plain = (text) => String(text).split(NO_BREAK).join(' '); // machines read plain spaces
	const ids = {
		site: SITE + '/#website',
		app: SITE + '/#wanderer', // one addon, the same in every language
		author: SITE + '/#author',
		page: url + '#webpage',
		faq: url + '#faq',
		video: url + '#trailer',
	};
	const screenshots = t.sections
		.filter((section) => section.image && findImage(section.image.file))
		.map((section) => ({ '@type': 'ImageObject', url: SITE + asset(findImage(section.image.file)), caption: plain(section.image.alt) }));
	const graph = [
		{
			'@type': 'WebSite',
			'@id': ids.site,
			url: SITE + '/',
			name: 'Wanderer',
			inLanguage: pages.map((p) => p.text.hreflang),
			publisher: { '@id': ids.author },
		},
		{
			'@type': 'Person',
			'@id': ids.author,
			name: AUTHOR.name,
			url: AUTHOR.curseforge,
			sameAs: [AUTHOR.curseforge, AUTHOR.github].filter(Boolean),
		},
		{
			'@type': 'WebPage',
			'@id': ids.page,
			url,
			name: plain(t.meta.title),
			description: plain(t.meta.description),
			inLanguage: t.hreflang,
			isPartOf: { '@id': ids.site },
			about: { '@id': ids.app },
			mainEntity: { '@id': ids.app },
			primaryImageOfPage: { '@type': 'ImageObject', url: SITE + asset('og-image.jpg'), width: 1280, height: 720 },
			video: { '@id': ids.video },
			hasPart: { '@id': ids.faq },
			dateModified: new Date().toISOString().slice(0, 10),
		},
		{
			'@type': 'SoftwareApplication',
			'@id': ids.app,
			name: 'Wanderer',
			alternateName: 'Wanderer addon',
			description: plain(t.hero.lead),
			url,
			applicationCategory: 'GameApplication',
			applicationSubCategory: 'World of Warcraft addon',
			operatingSystem: 'Windows, macOS',
			softwareRequirements: 'World of Warcraft Forever',
			softwareVersion: RELEASE.version,
			dateModified: RELEASE.date,
			inLanguage: pages.map((p) => p.text.hreflang),
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: config.links.curseforge },
			downloadUrl: config.links.curseforge,
			installUrl: config.links.curseforge,
			author: { '@id': ids.author },
			publisher: { '@id': ids.author },
			image: SITE + asset('og-image.jpg'),
			screenshot: screenshots,
			featureList: t.sections.map((section) => plain(section.h2)),
			sameAs: [config.links.curseforge, config.links.github].filter(Boolean),
			subjectOf: { '@id': ids.video },
		},
		{
			'@type': 'FAQPage',
			'@id': ids.faq,
			inLanguage: t.hreflang,
			isPartOf: { '@id': ids.page },
			mainEntity: t.faq.items.map((item) => ({
				'@type': 'Question',
				name: plain(item.q),
				acceptedAnswer: { '@type': 'Answer', text: plain(item.a) },
			})),
		},
		{
			'@type': 'VideoObject',
			'@id': ids.video,
			name: plain(t.ui.videoTitle),
			description: plain(t.ui.videoDescription),
			thumbnailUrl: [SITE + asset('video-poster.jpg'), 'https://i.ytimg.com/vi/' + config.video.id + '/maxresdefault.jpg'],
			uploadDate: config.video.uploadDate,
			duration: config.video.duration,
			embedUrl: 'https://www.youtube-nocookie.com/embed/' + config.video.id,
			contentUrl: 'https://www.youtube.com/watch?v=' + config.video.id,
			about: { '@id': ids.app },
		},
		...EXTENSIONS.map((ext) => extensionApp(page, ext)),
	];
	graph[2].mentions = EXTENSIONS.map((ext) => ({ '@id': SITE + '/#' + ext.key }));
	// "<" escaped so no text can ever close the script tag.
	const data = { '@context': 'https://schema.org', '@graph': graph };
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

// ---------- page ----------

function downloadButtons(t, place) {
	const sites = [
		['curseforge', 'CurseForge'],
		['githubRelease', 'GitHub'],
	];
	return sites
		.filter(([key]) => config.links[key])
		.map(([key, name], i) => `<a class="button${i === 0 ? ' button-main' : ''}" href="${esc(config.links[key])}" rel="noopener" data-place="${place}">${esc(t.ui.downloadOn)} <strong>${name}</strong></a>`)
		.join('\n\t\t\t');
}

// A few plain facts, easy to quote: the game, the price, the languages, the
// companion addon, the last update (from the release), where to get it.
function facts(t) {
	const f = t.facts;
	const date = new Intl.DateTimeFormat(t.hreflang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
		.format(new Date(RELEASE.date + 'T12:00:00Z'));
	const platforms = [['curseforge', 'CurseForge'], ['githubRelease', 'GitHub']]
		.filter(([key]) => config.links[key])
		.map(([key, name]) => `<a href="${esc(config.links[key])}" rel="noopener">${name}</a>`)
		.join(', ');
	const rows = [
		[f.game, '<span lang="en">World of Warcraft Forever</span>'],
		[f.price, esc(f.priceValue)],
		[f.languages, esc(f.languagesValue.replace('{count}', pages.length))],
		[f.compatibility, '<span lang="en">' + esc(f.compatibilityValue) + '</span>'],
		[f.updated, esc(fill(f.updatedValue).replace('{date}', date))],
		[f.platforms, platforms],
	];
	if (DOWNLOADS !== null) {
		const count = new Intl.NumberFormat(t.hreflang, { notation: 'compact', maximumFractionDigits: 1 }).format(DOWNLOADS);
		rows.push([f.downloads, esc(f.downloadsValue.replace('{count}', count))]);
	}
	return `
	<section class="facts reveal" aria-labelledby="facts-title">
		<h2 id="facts-title" class="visually-hidden">${esc(f.heading)}</h2>
		<dl>
			${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`).join('\n\t\t\t')}
		</dl>
	</section>`;
}

function languageLinks(current, sub) {
	return pages
		.map((p) => {
			const here = p.slug === current.slug;
			return `<li><a href="${pagePath(p.slug, sub)}" hreflang="${p.text.hreflang}" lang="${p.text.hreflang}"${here ? ' aria-current="page"' : ''}>${esc(p.text.nativeName)}</a></li>`;
		})
		.join('');
}

// What every page has in its head: title, description, canonical, its languages, sharing cards.
function headTags(page, sub, title, description) {
	const t = page.text;
	const url = pageUrl(page.slug, sub);
	const alternates = pages
		.map((p) => `<link rel="alternate" hreflang="${p.text.hreflang}" href="${pageUrl(p.slug, sub)}">`)
		.concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(config.defaultLanguage, sub)}">`)
		.join('\n');
	const ogAlternates = pages
		.filter((p) => p.slug !== page.slug)
		.map((p) => `<meta property="og:locale:alternate" content="${p.text.ogLocale}">`)
		.join('\n');
	return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${url}">
${alternates}
<meta name="theme-color" content="#070b14">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/assets/logo-64.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/Cinzel-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wanderer">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og-image.jpg">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="720">
<meta property="og:image:alt" content="${esc(t.ui.videoTitle)}">
<meta property="og:locale" content="${t.ogLocale}">
${ogAlternates}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/assets/og-image.jpg">
<meta name="twitter:image:alt" content="${esc(t.ui.videoTitle)}">`;
}

// The site's pages: Wanderer, each extension, the questions of the page shown.
function menuLinks(page, sub, full) {
	const t = page.text;
	// The extensions by their own word (Bags, Auction): Wanderer is beside them, in the brand.
	const link = ([key, name, short]) => `<li><a href="${pagePath(page.slug, key)}" lang="en" title="${name}"${key === sub ? ' aria-current="page"' : ''}>${short}</a></li>`;
	const items = [link([null, 'Wanderer', 'Wanderer'])];
	if (full) items.push(...EXTENSIONS.map((ext) => link([ext.key, ext.name, ext.name.replace('Wanderer ', '')])));
	else items.push(`<li><a href="${pagePath(page.slug)}#family"${sub ? ' aria-current="true"' : ''}>${esc(t.ui.family)}</a></li>`);
	items.push(`<li><a href="${pagePath(page.slug, sub)}#faq">${esc(t.ui.faq)}</a></li>`);
	return items.join('');
}

function masthead(page, sub) {
	const t = page.text;
	return `<header class="masthead">
	<a class="brand" href="/${page.slug}/" lang="en"><img src="/assets/logo.webp" alt="" width="34" height="34"><span>Wanderer</span></a>
	<nav class="sitenav" aria-label="${esc(t.ui.nav)}"><ul>${menuLinks(page, sub)}</ul></nav>
	<div class="masthead-end">
		<details class="langmenu sitemenu">
			<summary aria-label="${esc(t.ui.nav)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 7h16M4 12h16M4 17h16"/></svg><span>${esc(t.ui.menu)}</span></summary>
			<nav aria-label="${esc(t.ui.nav)}"><ul>${menuLinks(page, sub, true)}</ul></nav>
		</details>
		<details class="langmenu">
			<summary aria-label="${esc(t.ui.languages)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.4 8.2 12s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17"/></svg><span>${esc(t.nativeName)}</span></summary>
			<nav aria-label="${esc(t.ui.languages)}"><ul>${languageLinks(page, sub)}</ul></nav>
		</details>
		<a class="button button-main button-small" href="${esc(config.links.curseforge)}" rel="noopener">${esc(t.download.heading)}</a>
	</div>
</header>`;
}

function footer(page, sub) {
	const t = page.text;
	return `<footer class="bottom">
	<div class="ornament" aria-hidden="true"><span></span></div>
	<p class="footer-brand" lang="en"><img src="/assets/logo.webp" alt="" width="40" height="40" loading="lazy" decoding="async"> Wanderer</p>
	<nav class="langs" aria-label="${esc(t.ui.languages)}">
		<ul>${languageLinks(page, sub)}</ul>
	</nav>
	<p class="author">${esc(t.footer.madeBy).replace('{author}', '<span lang="en">' + esc(AUTHOR.name) + '</span>')
		.replace('{curseforge}', `<a href="${esc(AUTHOR.curseforge)}" rel="noopener author">CurseForge</a>`)
		.replace('{github}', `<a href="${esc(AUTHOR.github)}" rel="noopener">GitHub</a>`)}</p>
	${config.studio && t.footer.studio ? `<p class="studio">${esc(t.footer.studio).replace('{studio}', `<a href="${esc(config.studio.url)}" rel="noopener" lang="en">${esc(config.studio.name)}</a>`)}</p>` : ''}
	<p class="legal">${esc(t.footer.text)}</p>
</footer>`;
}

// An extension's download buttons, or the line saying it comes soon.
function extensionButtons(t, ext, place) {
	if (ext.soon) return `<p class="soon">${esc(t.ui.comingSoon)}</p>`;
	return ext.places
		.filter(([key]) => config.links[key])
		.map(([key, name], i) => `<a class="button${i === 0 ? ' button-main' : ''}" href="${esc(config.links[key])}" rel="noopener" data-place="${place}">${esc(t.ui.downloadOn)} <strong>${name}</strong></a>`)
		.join('\n\t\t\t\t');
}

// One member of the family, as a card: its emblem, its name, its promise in a line, the way to its page.
function tile(page, ext) {
	const t = page.text;
	const x = t[ext.key];
	const image = findImage(ext.key);
	return `
		<article class="tile reveal${ext.soon ? ' tile-soon' : ''}" aria-labelledby="tile-${ext.key}-title">
			${image ? `<img class="tile-emblem" src="/assets/${image}" alt="${esc(x.alt)}" width="160" height="160" loading="lazy" decoding="async">` : ''}
			<p class="tile-kicker">${esc(x.tagline)}</p>
			<h3 id="tile-${ext.key}-title" lang="en"><a href="${pagePath(page.slug, ext.key)}">${ext.name}</a></h3>
			<p class="tile-text">${esc(x.summary)}</p>${ext.soon ? `
			<p class="tile-badge">${esc(t.ui.soonBadge)}</p>` : ''}
		</article>`;
}

// An extension's page: a short hero (its emblem, its promise), its chapters, its questions,
// where to get it, the rest of the family, the way back.
function renderExtension(page, ext) {
	const t = page.text;
	const x = t.pages[ext.key];
	const e = t.extensionPage;
	const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
	const image = findImage(ext.key);
	const links = extensionButtons(t, ext, ext.key + '-page');
	const others = EXTENSIONS.filter((o) => o.key !== ext.key).map((o) => tile(page, o)).join('');
	const sections = x.sections.map((s, i) => `
	<section class="need need-solo ext-chapter" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-title">
		<div class="need-text reveal">
			<p class="numeral" aria-hidden="true">${NUMERALS[i] || i + 1}</p>
			<h2 id="${esc(s.id)}-title">${esc(s.h2)}</h2>
			${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n\t\t\t')}
		</div>
	</section>`).join('\n');
	const faq = x.faq.map((item) => `
			<details>
				<summary><h3>${esc(item.q)}</h3></summary>
				<p>${esc(item.a)}</p>
			</details>`).join('');
	return `<!doctype html>
<html lang="${t.hreflang}" dir="ltr">
<head>
${headTags(page, ext.key, x.meta.title, x.meta.description)}
<link rel="stylesheet" href="${STYLE}">
${extensionData(page, ext)}
</head>
<body>
<script>document.documentElement.classList.add('js')</script>
<a class="skip" href="#content">${esc(t.ui.skip)}</a>
${masthead(page, ext.key)}
<main id="content">
	<nav class="crumbs" aria-label="${esc(e.breadcrumb)}">
		<ol>
			<li><a href="/${page.slug}/" lang="en">${esc(e.home)}</a></li>
			<li><span aria-current="page" lang="en">${ext.name}</span></li>
		</ol>
	</nav>
	<header class="ext-hero">${image ? `
		<div class="frame ext-hero-image"><img src="/assets/${image}" alt="${esc(t[ext.key].alt)}" width="720" height="720" fetchpriority="high" decoding="async"></div>` : ''}
		<div class="ext-hero-text">
			<p class="kicker" lang="en">${ext.name}</p>
			<h1>${esc(x.h1)}</h1>
			<div class="ornament" aria-hidden="true"><span></span></div>
			<p class="lead">${esc(x.lead)}</p>
			<div class="buttons">
				${links}
			</div>
			<p class="note">${esc(e.requires)}</p>
		</div>
	</header>
${sections}

	<section class="faq reveal" id="faq" aria-labelledby="faq-title">
		<div class="ornament" aria-hidden="true"><span></span></div>
		<h2 id="faq-title">${esc(e.faqHeading.replace('{name}', ext.name))}</h2>
		<div class="faq-list">${faq}
		</div>
	</section>

	<section class="install reveal" id="install" aria-labelledby="install-title">
		<div class="install-card">
			<h2 id="install-title">${esc(e.downloadHeading.replace('{name}', ext.name))}</h2>
			<p>${esc(e.requires)}</p>
			<div class="buttons">
				${links}
			</div>
			<p class="changelog"><a href="/${page.slug}/">${esc(e.back)}</a></p>
		</div>
	</section>

	<section class="family family-more" id="family" aria-labelledby="family-title">
		<header class="family-head reveal">
			<div class="ornament" aria-hidden="true"><span></span></div>
			<h2 id="family-title">${esc(e.otherHeading)}</h2>
		</header>
		<div class="family-grid">${others}
		</div>
	</section>
</main>
${footer(page, ext.key)}
<script src="${SCRIPT}" defer></script>
</body>
</html>
`;
}

function render(page) {
	const t = page.text;
	// Each need: a numeral, the question, the answer, and its picture beside it
	// (alternating sides). The comfort section stands over a landscape instead.
	const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
	let side = 0;
	const sections = t.sections
		.map((s, i) => {
			const shot = figure(s.image, t);
			const text = `
				<div class="need-text reveal">
					<p class="numeral" aria-hidden="true">${NUMERALS[i] || i + 1}</p>
					<h2 id="${esc(s.id)}-title">${esc(s.h2)}</h2>
					${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n\t\t\t\t\t')}
				</div>`;
			if (s.id === 'comfort') {
				return `
		<section class="need need-band" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-title">
			<img class="band-bg" src="/assets/band.webp" alt="" width="1920" height="828" loading="lazy" decoding="async">
			<div class="band-panel">${text}
			</div>
		</section>`;
			}
			if (!shot) {
				return `
		<section class="need need-solo" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-title">${text}
		</section>`;
			}
			side++;
			return `
		<section class="need need-split${side % 2 === 0 ? ' need-flip' : ''}" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-title">${text}
			${shot}
		</section>`;
		})
		.join('\n');
	// The family: a card for each extension, in a grid.
	const e = t.extensions;
	const family = `
	<section class="family" id="family" aria-labelledby="family-title">
		<header class="family-head reveal">
			<p class="numeral">${esc(e.kicker)}</p>
			<h2 id="family-title">${esc(e.title)}</h2>
			<p>${esc(e.intro)}</p>
			<div class="ornament" aria-hidden="true"><span></span></div>
		</header>
		<div class="family-grid">${EXTENSIONS.map((ext) => tile(page, ext)).join('')}
		</div>
	</section>`;
	const faq = t.faq.items
		.map((item) => `
			<details>
				<summary><h3>${esc(item.q)}</h3></summary>
				<p>${esc(item.a)}</p>
			</details>`)
		.join('');
	const github = config.links.github;
	const feedbackLinks = [`<li><a href="${esc(config.links.curseforgeComments)}" rel="noopener">${esc(t.feedback.comments)}</a></li>`]
		.concat(github ? [`<li><a href="${esc(github)}" rel="noopener">${esc(t.feedback.github)}</a></li>`] : [])
		.join('\n\t\t\t\t');
	const videoId = config.video.id;

	return `<!doctype html>
<html lang="${t.hreflang}" dir="ltr">
<head>
${headTags(page, null, t.meta.title, t.meta.description)}
<link rel="preload" as="image" href="/assets/hero.webp" imagesrcset="/assets/hero-960.webp 960w, /assets/hero.webp 1920w" imagesizes="100vw" fetchpriority="high">
<link rel="stylesheet" href="${STYLE}">
${structuredData(page)}
</head>
<body>
<script>document.documentElement.classList.add('js')</script>
<a class="skip" href="#content">${esc(t.ui.skip)}</a>
${masthead(page)}
<main id="content">
	<div class="hero">
		<img class="hero-bg" src="/assets/hero.webp" srcset="/assets/hero-960.webp 960w, /assets/hero.webp 1920w" sizes="100vw" alt="" width="1920" height="870" fetchpriority="high">
		<div class="hero-inner">
			<img class="medallion" src="/assets/logo.webp" alt="" width="112" height="112">
			<p class="kicker" lang="en">${esc(t.hero.subtitle)}</p>
			<h1>${esc(t.hero.h1)}</h1>
			<div class="ornament" aria-hidden="true"><span></span></div>
			<p class="lead">${esc(t.hero.lead)}</p>
			<section class="download" aria-labelledby="download-title">
				<h2 id="download-title" class="visually-hidden">${esc(t.download.heading)}</h2>
				<div class="buttons">
				${downloadButtons(t, 'top')}
				</div>
				<p class="note">${esc(fill(t.download.note))} ${esc(t.hero.status)}</p>
			</section>
		</div>
	</div>

	<div class="trailer reveal" id="trailer">
		<div class="frame frame-video">
			<a class="video-facade" href="https://www.youtube.com/watch?v=${videoId}" data-video="${videoId}" data-title="${esc(t.ui.videoTitle)}">
				<img src="/assets/video-poster.jpg" alt="${esc(t.ui.videoTitle)}" width="960" height="540" loading="lazy" decoding="async">
				<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>
			</a>
		</div>
		<p class="trailer-caption"><span class="trailer-label">${esc(t.ui.play)}</span> <span class="trailer-time">0:41</span></p>
	</div>
${facts(t)}
${family}
	<header class="core-head reveal" id="wanderer">
		<p class="numeral">${esc(t.core.kicker)}</p>
		<h2>${esc(t.core.title)}</h2>
		<p>${esc(t.core.intro)}</p>
		<div class="ornament" aria-hidden="true"><span></span></div>
	</header>
${sections}

	<section class="faq reveal" id="faq" aria-labelledby="faq-title">
		<div class="ornament" aria-hidden="true"><span></span></div>
		<h2 id="faq-title">${esc(t.faq.heading)}</h2>
		<div class="faq-list">${faq}
		</div>
	</section>

	<section class="install reveal" id="install" aria-labelledby="install-title">
		<div class="install-card">
			<h2 id="install-title">${esc(t.install.heading)}</h2>
			<ol>
				${t.install.steps.map((s) => `<li>${esc(s)}</li>`).join('\n\t\t\t\t')}
			</ol>
			<div class="buttons">
				${downloadButtons(t, 'install')}
			</div>
			<p class="changelog"><a href="${esc(config.links.changelog)}" rel="noopener">${esc(t.install.changelog)}</a></p>
		</div>
	</section>

	<section class="feedback reveal" id="feedback" aria-labelledby="feedback-title">
		<h2 id="feedback-title">${esc(t.feedback.heading)}</h2>
		<p>${esc(t.feedback.text)}</p>
		<ul class="links">
				${feedbackLinks}
		</ul>
	</section>
</main>
${footer(page)}
<script src="${SCRIPT}" defer></script>
</body>
</html>
`;
}

// Hyphenated words kept whole on their line, in the body's visible text only.
function keepHyphens(html) {
	const at = html.indexOf('<body>');
	const head = html.slice(0, at);
	const body = html.slice(at).replace(/>([^<]+)</g, (match, text) =>
		'>' + text.replace(/([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+)/gu, '<span class="nw">$1</span>') + '<');
	return head + body;
}

// The root: the English page is the reference, visitors are sent there.
function rootPage() {
	const en = pageUrl(config.defaultLanguage);
	const alternates = pages
		.map((p) => `<link rel="alternate" hreflang="${p.text.hreflang}" href="${pageUrl(p.slug)}">`)
		.concat(`<link rel="alternate" hreflang="x-default" href="${en}">`)
		.join('\n');
	return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(reference.meta.title)}</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${en}">
${alternates}
<meta http-equiv="refresh" content="0; url=/${config.defaultLanguage}/">
<meta name="build" content="${new Date().toISOString()}">
</head>
<body>
<p><a href="/${config.defaultLanguage}/">Wanderer</a></p>
</body>
</html>
`;
}

function sitemap() {
	const today = new Date().toISOString().slice(0, 10);
	const urls = [null, ...EXTENSIONS.map((ext) => ext.key)].flatMap((sub) => {
		const alternates = pages
			.map((p) => `    <xhtml:link rel="alternate" hreflang="${p.text.hreflang}" href="${pageUrl(p.slug, sub)}"/>`)
			.concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(config.defaultLanguage, sub)}"/>`)
			.join('\n');
		return pages.map((p) => `  <url>\n    <loc>${pageUrl(p.slug, sub)}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`);
	}).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

// For Apache hosts (OVH shared hosting): one address only (https, the host of
// siteUrl, www or not), the root sent to the reference language, compression
// and caching.
function htaccess() {
	const host = new URL(SITE).host;
	const other = host.startsWith('www.') ? host.slice(4) : 'www.' + host;
	const escape = (h) => h.replace(/\./g, '\\.');
	return `# Made by build.js: one address for the whole site, ${SITE}
Options -Indexes +FollowSymLinks
DirectoryIndex index.html
AddDefaultCharset utf-8

<IfModule mod_rewrite.c>
RewriteEngine On
# http (port 80, as OVH advises), or the other spelling of the domain: sent to ${SITE}
RewriteCond %{SERVER_PORT} 80 [OR]
RewriteCond %{HTTP_HOST} ^${escape(other)}$ [NC]
RewriteRule ^(.*)$ ${SITE}/$1 [R=301,L]
# The root: the reference language
RewriteRule ^$ ${SITE}/${config.defaultLanguage}/ [R=301,L]
# A language without its final slash
RewriteRule ^(${config.languages.join('|')})$ ${SITE}/$1/ [R=301,L]${(config.removed || []).length ? `
# An extension taken off the site (config.removed): its old pages sent to the language's home
RewriteRule ^(${config.languages.join('|')})/(${config.removed.join('|')})(/.*)?$ ${SITE}/$1/ [R=301,L]` : ''}
</IfModule>

<IfModule mod_headers.c>
Header always set Strict-Transport-Security "max-age=31536000"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# The pages are checked again at every visit (a quick "not changed" when nothing moved):
# an update shows at once. Style and script carry a fingerprint, so they can stay in cache.
<FilesMatch ".html$">
<IfModule mod_headers.c>
Header set Cache-Control "no-cache"
</IfModule>
</FilesMatch>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/xml image/svg+xml text/plain
</IfModule>

<IfModule mod_expires.c>
ExpiresActive On
ExpiresDefault "access plus 1 hour"
ExpiresByType text/html "access plus 0 seconds"
ExpiresByType text/css "access plus 1 week"
ExpiresByType text/javascript "access plus 1 week"
ExpiresByType application/javascript "access plus 1 week"
ExpiresByType image/jpeg "access plus 1 month"
ExpiresByType image/png "access plus 1 month"
ExpiresByType image/webp "access plus 1 month"
ExpiresByType image/avif "access plus 1 month"
ExpiresByType image/gif "access plus 1 month"
ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

ErrorDocument 404 /${config.defaultLanguage}/
`;
}

// A plain summary for AI search engines (llmstxt.org), from the English reference.
function llms() {
	const plain = (text) => String(text).split(NO_BREAK).join(' ');
	const en = reference;
	const lines = [
		'# Wanderer',
		'',
		'> ' + plain(en.hero.lead) + ' ' + plain(en.hero.status),
		'',
		'Wanderer is a free addon for World of Warcraft Forever, version ' + RELEASE.version + ' (' + RELEASE.date + '), translated into ' + pages.length + ' languages, made by ' + AUTHOR.name + '.',
		'',
		'## What it does',
		'',
		...en.sections.map((section) => '- ' + plain(section.h2) + ' ' + section.paragraphs.map(plain).join(' ')),
		'',
		'## Extensions',
		'',
		...EXTENSIONS.flatMap((ext) => {
			const x = en.pages[ext.key];
			return ['### ' + ext.name, '', plain(x.lead), '',
				...x.sections.map((section) => '- ' + plain(section.h2) + ' ' + section.paragraphs.map(plain).join(' ')),
				'', '#### Questions about ' + ext.name, '', ...x.faq.map((item) => '- ' + plain(item.q) + ' ' + plain(item.a)), '',
				'Page: ' + pageUrl(config.defaultLanguage, ext.key) + '. ' + (ext.soon ? 'Coming soon on CurseForge.' : 'Download: ' + ext.places.map(([key]) => config.links[key]).filter(Boolean).join(', ') + '.'), ''];
		}),
		'## Questions about Wanderer',
		'',
		...en.faq.items.map((item) => '- ' + plain(item.q) + ' ' + plain(item.a)),
		'',
		'## Pages',
		'',
		...pages.map((p) => '- [' + p.text.nativeName + '](' + pageUrl(p.slug) + '): ' + plain(p.text.meta.title)),
		'',
		'## Download and source',
		'',
		'- [CurseForge](' + config.links.curseforge + ')',
				...(config.links.github ? ['- [GitHub](' + config.links.github + ')'] : []),
		'- [Trailer on YouTube](https://www.youtube.com/watch?v=' + config.video.id + ')',
		'',
	];
	return lines.join('\n');
}

// ---------- write ----------

fs.rmSync(DIST, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }); // (Windows: a file still held by the preview is retried)
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), {
	recursive: true,
	filter: (file) => !file.endsWith('.md'),
});
fs.copyFileSync(path.join(ROOT, 'src', 'style.css'), path.join(DIST, 'style.css'));
fs.copyFileSync(path.join(ROOT, 'src', 'video.js'), path.join(DIST, 'video.js'));
for (const page of pages) {
	fs.mkdirSync(path.join(DIST, page.slug), { recursive: true });
	fs.writeFileSync(path.join(DIST, page.slug, 'index.html'), keepHyphens(render(page)));
	for (const ext of EXTENSIONS) {
		fs.mkdirSync(path.join(DIST, page.slug, ext.key), { recursive: true });
		fs.writeFileSync(path.join(DIST, page.slug, ext.key, 'index.html'), keepHyphens(renderExtension(page, ext)));
	}
}
fs.writeFileSync(path.join(DIST, 'index.html'), rootPage());
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap());
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot',
	'Perplexity-User', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'Bytespider', 'meta-externalagent', 'cohere-ai', 'MistralAI-User'];
fs.writeFileSync(path.join(DIST, 'robots.txt'), [
	'# Every crawler is welcome, search engines and AI alike.',
	'User-agent: *',
	'Allow: /',
	'',
	...AI_CRAWLERS.flatMap((bot) => ['User-agent: ' + bot, 'Allow: /', '']),
	'Sitemap: ' + SITE + '/sitemap.xml',
	'',
].join('\n'));
fs.writeFileSync(path.join(DIST, '.htaccess'), htaccess());
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms());

const missingShots = [...new Set(reference.sections.filter((s) => s.image && !findImage(s.image.file)).map((s) => s.image.file))];
if (missingShots.length) warn('screenshots not there yet (' + (DRAFTS ? 'frames shown' : 'left out of the pages') + '): ' + missingShots.join(', '));
for (const key of ['github']) if (!config.links[key]) warn('config.json: links.' + key + ' empty, its button is left out');
if (/example/.test(SITE)) warn('config.json: siteUrl is still ' + SITE);

console.log('Built ' + pages.length + ' languages in dist/: ' + pages.map((p) => p.slug).join(', '));
for (const w of warnings) console.log('  note: ' + w);
