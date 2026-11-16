// The audit's checks, on every language (run node build.js first):
// Open Graph languages, titles and descriptions (length, never the same twice),
// lang and dir, the skip link, images (alt, sizes, lazy loading), the video
// loaded only on a click, robots.txt and the AI crawlers, the sitemap's
// alternates, contrast of the main colours, weight and requests of a page.
// Usage: node check-audit.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const SITE = config.siteUrl.replace(/\/+$/, '');
const LOCALES = { en: 'en_US', fr: 'fr_FR', de: 'de_DE', es: 'es_ES', it: 'it_IT', 'pt-br': 'pt_BR', ru: 'ru_RU', ko: 'ko_KR', 'zh-cn': 'zh_CN', 'zh-tw': 'zh_TW' };
const HREFLANG = { en: 'en', fr: 'fr', de: 'de', es: 'es', it: 'it', 'pt-br': 'pt-BR', ru: 'ru', ko: 'ko', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' };
const AI = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

let failures = 0;
const results = {};
function note(topic, problem) {
	results[topic] = results[topic] || [];
	if (problem) { results[topic].push(problem); failures++; }
}
const read = (file) => fs.readFileSync(path.join(DIST, file), 'utf8');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

const titles = {}, descriptions = {};
// Every language's page, then its extensions' pages (the same checks, but the video and the facts).
const PAGES = [null, 'bags', 'auction', 'mail', 'quests', 'maps', 'training', 'outfits', 'professions', 'chat', 'bestiary'].flatMap((sub) => config.languages.map((language) => [language, sub]));
for (const [language, sub] of PAGES) {
	const slug = language + (sub ? '/' + sub : '');
	const html = read(slug + '/index.html');
	const lang = HREFLANG[language];
	// Open Graph: its own locale, one alternate per other language, never itself.
	note('Open Graph');
	const own = (html.match(/property="og:locale" content="([^"]+)"/) || [])[1];
	const alternates = [...html.matchAll(/property="og:locale:alternate" content="([^"]+)"/g)].map((m) => m[1]);
	if (own !== LOCALES[language]) note('Open Graph', slug + ': og:locale ' + own);
	const expected = Object.entries(LOCALES).filter(([s]) => s !== language).map(([, l]) => l).sort();
	if (JSON.stringify(alternates.slice().sort()) !== JSON.stringify(expected)) note('Open Graph', slug + ': alternates ' + alternates.join(','));
	// Titles and descriptions: lengths, each language its own.
	note('Titles and descriptions');
	const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
	const description = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
	if ([...title].length > 60) note('Titles and descriptions', slug + ': title ' + [...title].length + ' characters');
	if ([...description].length > 155) note('Titles and descriptions', slug + ': description ' + [...description].length + ' characters');
	if (titles[title]) note('Titles and descriptions', slug + ': same title as ' + titles[title]);
	if (descriptions[description]) note('Titles and descriptions', slug + ': same description as ' + descriptions[description]);
	titles[title] = slug;
	descriptions[description] = slug;
	// lang, dir, the skip link first.
	note('Accessibility');
	if (!new RegExp('<html lang="' + lang + '" dir="ltr">').test(html)) note('Accessibility', slug + ': html lang/dir');
	const body = html.slice(html.indexOf('<body>'));
	const firstLink = (body.match(/<a [^>]*>/) || [])[0] || '';
	if (!/class="skip" href="#content"/.test(firstLink)) note('Accessibility', slug + ': skip link not first');
	if (!/<main id="content">/.test(body)) note('Accessibility', slug + ': no #content');
	// FAQ: real questions, no Markdown left.
	note('FAQ');
	if (/###/.test(body)) note('FAQ', slug + ': "###" in the page');
	const questions = [...body.matchAll(/<summary><h3>/g)].length;
	if (questions < 1) note('FAQ', slug + ': no question as <summary><h3>');
	// Images: alt, sizes, lazy except the first picture.
	note('Images');
	for (const m of body.matchAll(/<img\b[^>]*>/g)) {
		const tag = m[0];
		const src = (tag.match(/src="([^"]+)"/) || [])[1];
		if (!/\salt="/.test(tag)) note('Images', slug + ': no alt on ' + src);
		if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) note('Images', slug + ': no width/height on ' + src);
		const main = /hero-bg|logo\.(svg|webp)" alt="" width="(34|112)"|fetchpriority="high"/.test(tag);
		if (!main && !/loading="lazy"/.test(tag)) note('Images', slug + ': not lazy ' + src);
		if (/\.(png|jpe?g)$/.test(src || '') && !/video-poster/.test(src)) note('Images', slug + ': heavy format ' + src);
	}
	if (sub) continue;
	// The video: nothing from YouTube before a click.
	note('Video');
	if (/<iframe/.test(html)) note('Video', slug + ': an iframe in the page');
	if (/<script[^>]+src="https?:/.test(html)) note('Video', slug + ': an outside script');
	if (!/data-video="/.test(html)) note('Video', slug + ': no click-to-load facade');
	// Facts and author.
	note('Facts and author');
	if (!/<section class="facts/.test(body)) note('Facts and author', slug + ': no facts block');
	if (!/<p class="author">/.test(body)) note('Facts and author', slug + ': no author line');
}

// robots.txt: nothing useful forbidden, the AI crawlers let in, the sitemap.
note('robots.txt');
const robots = read('robots.txt');
if (/^Disallow:\s*\/\s*$/m.test(robots)) note('robots.txt', 'something disallows the whole site');
for (const bot of AI) if (!new RegExp('User-agent: ' + bot + '\\nAllow: /').test(robots)) note('robots.txt', bot + ' not named');
if (!robots.includes('Sitemap: ' + SITE + '/sitemap.xml')) note('robots.txt', 'no sitemap line');

// Sitemap: every page, each with every alternate and x-default.
note('Sitemap');
const sitemap = read('sitemap.xml');
for (const [language, sub] of PAGES) {
	const slug = language + '/' + (sub ? sub + '/' : '');
	const block = (sitemap.match(new RegExp('<url>\\s*<loc>' + SITE + '/' + slug + '</loc>[\\s\\S]*?</url>')) || [])[0];
	if (!block) { note('Sitemap', slug + ': missing'); continue; }
	const count = (block.match(/xhtml:link/g) || []).length;
	if (count !== config.languages.length + 1) note('Sitemap', slug + ': ' + count + ' alternates');
}

// Contrast of the main colours (WCAG): 4.5 for text, 3 for large text.
note('Contrast');
const css = fs.readFileSync(path.join(ROOT, 'src', 'style.css'), 'utf8');
const token = (name) => (css.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})')) || [])[1];
function luminance(hex) {
	const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const contrast = [
	['text', token('text'), token('night'), 4.5], ['muted text', token('muted'), token('night'), 4.5],
	['gold', token('gold'), token('night'), 4.5], ['links', token('gold-bright'), token('night'), 4.5],
	['legal text', '#8f8774', '#04070d', 4.5], ['facts value', token('ivory'), token('stone'), 4.5],
	['main button', '#fff5d6', '#7d630f', 4.5], // the addon's main button: cream words on deep gold
];
const measured = contrast.map(([name, fg, bg, least]) => {
	const r = ratio(fg, bg);
	if (r < least) note('Contrast', name + ' ' + r.toFixed(2));
	return name + ' ' + r.toFixed(1);
});

// Weight and requests of the English page as it first loads on a phone (no click, no scroll):
// the page, its style and script, the fonts the text needs, the hero picture, the logo.
const firstLoad = ['en/index.html', 'style.css', 'video.js', 'assets/logo.webp', 'assets/hero-960.webp',
	'assets/fonts/Cinzel-normal-latin.woff2', 'assets/fonts/EBGaramond-normal-latin.woff2'];
const bytes = firstLoad.reduce((sum, file) => sum + fs.statSync(path.join(DIST, file)).size, 0);
const lazy = ['assets/video-poster.jpg', ...fs.readdirSync(path.join(DIST, 'assets')).filter((f) => /\.webp$/.test(f) && !/^hero/.test(f)).map((f) => 'assets/' + f)];
const lazyBytes = lazy.reduce((sum, file) => sum + fs.statSync(path.join(DIST, file)).size, 0);

for (const [topic, problems] of Object.entries(results)) {
	console.log((problems.length ? 'PROBLEM ' : 'OK      ') + topic + (problems.length ? ': ' + problems.join(' | ') : ''));
}
console.log('        contrast: ' + measured.join(', '));
console.log('        first load: ' + firstLoad.length + ' requests, ' + Math.round(bytes / 1024) + ' KB (then ' + lazy.length + ' pictures, ' + Math.round(lazyBytes / 1024) + ' KB, only as you scroll)');
process.exitCode = failures ? 1 : 0;
