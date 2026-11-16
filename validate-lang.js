// Checks one language against the English plan: same keys, same list lengths, no long dashes,
// title/description lengths. Usage: node validate-lang.js fr
const fs = require('fs');
const lang = process.argv[2];
const DASH = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'); // built from codes: this file never holds one
const problems = [];
function same(a, b, where) {
	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return problems.push(where + ': not a list');
		if (a.length !== b.length) problems.push(where + ': ' + b.length + ' items instead of ' + a.length);
		a.forEach((v, i) => b[i] !== undefined && same(v, b[i], where + '[' + i + ']'));
	} else if (a && typeof a === 'object') {
		if (!b || typeof b !== 'object') return problems.push(where + ': missing');
		for (const k of Object.keys(a)) b[k] === undefined || b[k] === '' ? problems.push(where + '.' + k + ': missing') : same(a[k], b[k], where + '.' + k);
		for (const k of Object.keys(b)) if (a[k] === undefined) problems.push(where + '.' + k + ': not in English');
	} else if (typeof b === 'string' && DASH.test(b)) problems.push(where + ': long dash');
}
for (const [file, label] of [['content/', 'page'], ['content/extensions/', 'extensions']]) {
	const en = JSON.parse(fs.readFileSync(file + 'en.json', 'utf8'));
	const other = JSON.parse(fs.readFileSync(file + lang + '.json', 'utf8'));
	if (label === 'page') for (const k of ['lang', 'hreflang', 'ogLocale', 'nativeName']) delete en[k], delete other[k];
	same(en, other, label);
	const metas = label === 'page' ? [['home', other.meta]] : Object.entries(other.pages || {}).map(([k, p]) => [k, p.meta]);
	for (const [k, m] of metas) {
		if (!m) continue;
		if ([...m.title].length > 60) problems.push(k + ' title ' + [...m.title].length + ' > 60');
		if ([...m.description].length > 155) problems.push(k + ' description ' + [...m.description].length + ' > 155');
	}
}
console.log(problems.length ? problems.join('\n') : lang + ': OK');
process.exit(problems.length ? 1 : 0);
