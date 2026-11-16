// Merges the release texts written apart (patches-2026-11-08/<key>.json) into content/.
// An extension: { lang: { page, card } } -> extensions/<lang>.json pages.<key>, <lang>.json[<key>].
// Wanderer: { lang: { <top key>: value } } -> <lang>.json[<top key>].
// Usage: node merge-patches.js [folder]
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, process.argv[2] || 'patches-2026-11-08');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const KEEP = new Set(['lang', 'hreflang', 'ogLocale', 'nativeName', 'ui']);
let problems = 0;
for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
	const key = name.replace(/\.json$/, '');
	const patch = read(path.join(dir, name));
	for (const [lang, parts] of Object.entries(patch)) {
		const home = path.join(__dirname, 'content', lang + '.json');
		const ext = path.join(__dirname, 'content', 'extensions', lang + '.json');
		if (!fs.existsSync(home)) { console.log('langue inconnue :', key, lang); problems++; continue; }
		const homeData = read(home);
		if (key === 'wanderer') {
			for (const [top, value] of Object.entries(parts)) {
				if (KEEP.has(top)) { console.log('clé protégée ignorée :', lang, top); continue; }
				homeData[top] = value;
			}
		} else {
			if (!parts.page || !parts.card) { console.log('page ou carte absente :', key, lang); problems++; continue; }
			const extData = read(ext);
			extData.pages[key] = parts.page;
			write(ext, extData);
			homeData[key] = parts.card;
		}
		write(home, homeData);
	}
	console.log('fusionné :', key, Object.keys(patch).length, 'langues');
}
process.exit(problems ? 1 : 0);
