// Checks the built pages in dist/ (run node build.js first).
// Usage: node check.js          everything that can be checked offline
//        node check.js --links  also asks every outside link whether it answers

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const SITE = config.siteUrl.replace(/\/+$/, '');
const LONG_DASH = new RegExp(String.fromCharCode(0x2014)); // the long dash, built from its code so this file never holds one

let failures = 0;
const fail = (message) => { failures++; console.log('  FAIL ' + message); };
const ok = (message) => console.log('  ok   ' + message);

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
		return [full];
	});
}

// 1. No long dash anywhere in the site folder (sources, content, output).
console.log('Long dashes');
const textFiles = walk(ROOT).filter((f) => /\.(html|css|js|json|xml|txt|md|svg)$/.test(f));
const withDash = textFiles.filter((f) => LONG_DASH.test(fs.readFileSync(f, 'utf8')));
if (withDash.length) withDash.forEach((f) => fail('long dash in ' + path.relative(ROOT, f)));
else ok('none in ' + textFiles.length + ' files');

// 2. Every page: one h1, headings in order, alt texts, size, structured data.
// Every language's page, and its extensions' pages (no video there: a breadcrumb instead).
const SUBS = [null, 'bags', 'auction', 'mail', 'quests', 'maps', 'training', 'outfits', 'professions', 'chat', 'bestiary'];
const pages = SUBS.flatMap((sub) => config.languages.map((slug) => ({
	slug, sub, name: slug + (sub ? '/' + sub : ''), url: SITE + '/' + slug + '/' + (sub ? sub + '/' : ''),
	file: path.join(DIST, slug, ...(sub ? [sub] : []), 'index.html'),
})));
const hreflangs = {};
console.log('Pages');
for (const page of pages) {
	if (!fs.existsSync(page.file)) { fail(page.name + ': not built'); continue; }
	const html = fs.readFileSync(page.file, 'utf8');
	const name = page.name;

	const h1 = (html.match(/<h1[\s>]/g) || []).length;
	if (h1 !== 1) fail(name + ': ' + h1 + ' h1');

	let previous = 1;
	for (const m of html.matchAll(/<h([1-6])[\s>]/g)) {
		const level = Number(m[1]);
		if (level > previous + 1) fail(name + ': h' + level + ' after h' + previous);
		previous = level;
	}

	for (const m of html.matchAll(/<img\b[^>]*>/g)) {
		if (!/\salt="/.test(m[0])) fail(name + ': image without alt: ' + m[0].slice(0, 80));
	}

	const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
	const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
	if (!title) fail(name + ': no title');
	if (!description) fail(name + ': no meta description');
	if (description.length > 170) fail(name + ': meta description is ' + description.length + ' characters');

	const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
	if (canonical !== page.url) fail(name + ': canonical ' + canonical);

	for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'og:locale']) {
		if (!html.includes('property="' + tag + '"')) fail(name + ': no ' + tag);
	}
	if (!html.includes('name="twitter:card"')) fail(name + ': no twitter:card');

	hreflangs[page.name] = [...html.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)">/g)].map((m) => [m[1], m[2]]);

	const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
	const types = [];
	// The text of the page as a reader sees it: tags gone, plain spaces.
	const NO_BREAK = String.fromCharCode(0xa0);
	const visible = (fragment) => fragment.replace(/<[^>]+>/g, '').split(NO_BREAK).join(' ')
		.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
	const questions = [...html.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((m) => visible(m[1]));
	const answers = [...html.matchAll(/<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => visible(m[1]));
	const nodes = [];
	for (const block of blocks) {
		let parsed;
		try { parsed = JSON.parse(block); } catch (e) { fail(name + ': JSON-LD does not parse: ' + e.message); continue; }
		if (parsed['@context'] !== 'https://schema.org') fail(name + ': JSON-LD without schema.org context');
		for (const node of parsed['@graph'] || [parsed]) nodes.push(node);
	}
	const byId = new Map(nodes.filter((n) => n['@id']).map((n) => [n['@id'], n]));
	for (const node of nodes) {
		for (const value of Object.values(node)) {
			const refs = Array.isArray(value) ? value : [value];
			for (const ref of refs) {
				if (ref && typeof ref === 'object' && ref['@id'] && Object.keys(ref).length === 1 && !byId.has(ref['@id'])) fail(name + ': JSON-LD points to a missing ' + ref['@id']);
			}
		}
	}
	for (const data of nodes) {
		types.push(data['@type']);
		if (data['@type'] === 'SoftwareApplication') {
			for (const key of ['name', 'applicationCategory', 'operatingSystem', 'offers']) if (!data[key]) fail(name + ': SoftwareApplication without ' + key);
			if (data.offers && data.offers.price !== '0') fail(name + ': SoftwareApplication not free');
		}
		if (data['@type'] === 'FAQPage') {
			const items = data.mainEntity || [];
			if (!items.length) fail(name + ': FAQPage empty');
			items.forEach((q, i) => { if (q['@type'] !== 'Question' || !q.name || !q.acceptedAnswer || !q.acceptedAnswer.text) fail(name + ': FAQ item ' + i + ' incomplete'); });
			// Google wants the very same questions and answers visible on the page.
			items.forEach((q) => { if (!questions.includes(q.name)) fail(name + ': FAQ question not on the page: ' + q.name); });
			items.forEach((q) => { if (!answers.includes(q.acceptedAnswer.text)) fail(name + ': FAQ answer differs from the page: ' + q.name); });
		}
		if (data['@type'] === 'VideoObject') {
			for (const key of ['name', 'description', 'thumbnailUrl', 'uploadDate']) if (!data[key]) fail(name + ': VideoObject without ' + key);
			if (!/^\d{4}-\d{2}-\d{2}/.test(data.uploadDate || '')) fail(name + ': VideoObject uploadDate not a date');
		}
	}
	for (const type of ['WebSite', 'WebPage', 'SoftwareApplication', 'FAQPage', page.sub ? 'BreadcrumbList' : 'VideoObject']) if (!types.includes(type)) fail(name + ': no ' + type);
	const webPage = nodes.find((n) => n['@type'] === 'WebPage');
	if (webPage && webPage.inLanguage !== (html.match(/<html lang="([^"]*)"/) || [])[1]) fail(name + ': WebPage language differs from the page');
	if (webPage && webPage.url !== page.url) fail(name + ': WebPage url ' + webPage.url);

	const bytes = Buffer.byteLength(html);
	// (68 KB: Cyrillic and Korean letters weigh two or three bytes each; still light once compressed.
	// Raised from 64/80 KB on 2026-11-10 for the controller section and question of the home page.)
	if (bytes > (/^(ru|ko|zh-cn|zh-tw)/.test(name) ? 84000 : 68000)) fail(name + ": page is " + bytes + " bytes");
	if (!html.includes('name="viewport"')) fail(name + ': no viewport');
}
const totalBytes = pages.reduce((sum, p) => sum + (fs.existsSync(p.file) ? fs.statSync(p.file).size : 0), 0);
ok(pages.length + ' pages read, ' + Math.round(totalBytes / pages.length / 1024) + ' KB of HTML each on average');

// 3. hreflang: every page lists every page, itself included, and x-default.
console.log('hreflang');
const expected = pages.map((p) => p.url);
for (const page of pages) {
	const list = hreflangs[page.name] || [];
	const family = pages.filter((p) => p.sub === page.sub).map((p) => p.url);
	const home = SITE + '/' + config.defaultLanguage + '/' + (page.sub ? page.sub + '/' : '');
	const urls = list.filter(([lang]) => lang !== 'x-default').map(([, url]) => url);
	for (const url of family) if (!urls.includes(url)) fail(page.name + ': no hreflang to ' + url);
	const xDefault = list.find(([lang]) => lang === 'x-default');
	if (!xDefault || xDefault[1] !== home) fail(page.name + ': x-default missing or wrong');
	const codes = list.map(([lang]) => lang);
	if (new Set(codes).size !== codes.length) fail(page.name + ': a hreflang code is repeated');
	// Each code must point to the page that declares the same code for itself.
	for (const [lang, url] of list) {
		if (lang === 'x-default') continue;
		const target = pages.find((p) => p.url === url);
		const own = target && (fs.readFileSync(target.file, 'utf8').match(/<html lang="([^"]*)"/) || [])[1];
		if (own !== lang) fail(page.name + ': hreflang ' + lang + ' points to a page in ' + own);
	}
}
if (!failures) ok('reciprocal between ' + pages.length + ' pages, x-default to /' + config.defaultLanguage + '/');

// 4. Sitemap and robots.
console.log('Sitemap and robots');
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
for (const url of expected) if (!sitemap.includes('<loc>' + url + '</loc>')) fail('sitemap: no ' + url);
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: ' + SITE + '/sitemap.xml')) fail('robots.txt: no sitemap line');
ok('sitemap with ' + (sitemap.match(/<loc>/g) || []).length + ' pages, robots.txt points to it');

// llms.txt for AI search engines: every page linked.
const llms = fs.existsSync(path.join(DIST, 'llms.txt')) ? fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8') : '';
if (!llms) fail('no llms.txt');
for (const url of pages.filter((p) => !p.sub || p.slug === config.defaultLanguage).map((p) => p.url)) if (llms && !llms.includes(url)) fail('llms.txt: no ' + url);

// 5. Local files the pages use.
console.log('Local files');
const english = fs.readFileSync(path.join(DIST, config.defaultLanguage, 'index.html'), 'utf8');
const local = [...new Set([...english.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1].split('#')[0]))].filter((u) => u && !u.endsWith('/'));
for (const url of local) if (!fs.existsSync(path.join(DIST, url.split("?")[0]))) fail('missing file ' + url);
ok(local.length + ' local files found');

// 6. Outside links (only with --links: needs the network).
async function links() {
	const outside = new Set();
	for (const page of pages) {
		const html = fs.readFileSync(page.file, 'utf8');
		for (const m of html.matchAll(/<a [^>]*href="(https?:\/\/[^"]*)"/g)) outside.add(m[1].replace(/&amp;/g, '&'));
	}
	console.log('Outside links');
	for (const url of outside) {
		try {
			const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' } });
			// CurseForge answers robots with 403 behind its shield: the page exists, a browser opens it.
			if (res.ok) ok(res.status + ' ' + url);
			else if (res.status === 403 && /curseforge\.com/.test(url)) ok('403 (bot shield, opens in a browser) ' + url);
			else fail(res.status + ' ' + url);
		} catch (e) {
			fail('no answer ' + url + ' (' + e.message + ')');
		}
	}
}

(process.argv.includes('--links') ? links() : Promise.resolve()).then(() => {
	console.log(failures ? failures + ' problem(s)' : 'All good');
	process.exitCode = failures ? 1 : 0;
});
