// Draws the site's illustrations (no words in them: the same picture serves the 10 languages),
// in Wanderer's art direction: night blue, gold lines, the game's own colors for bars and classes.
// Usage: node illustrations/make.js  ->  assets/<name>.svg
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'assets');
const DEFS = fs.readFileSync(path.join(__dirname, '_defs.txt'), 'utf8');

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">${DEFS}${body}</svg>`;
const write = (name, body) => {
	fs.writeFileSync(path.join(OUT, name + '.svg'), svg(body));
	console.log(name + '.svg');
};

// A gold-edged panel, the way Wanderer draws its windows.
const panel = (x, y, w, h, r = 6) => `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#panel)" stroke="#e3bf6f" stroke-opacity=".38"/>
<path d="M${x + 8} ${y + 26}V${y + 8}H${x + 26}M${x + w - 26} ${y + h - 8}H${x + w - 8}V${y + h - 26}" fill="none" stroke="#e3bf6f" stroke-opacity=".8" stroke-width="2"/>`;

// A bar: its ground, its fill, its fine ink line.
const bar = (x, y, w, h, fill, color, extra = '') => `
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#05080f" stroke="#000" stroke-opacity=".7"/>
<rect x="${x}" y="${y}" width="${w * fill}" height="${h}" fill="${color}"/>${extra}
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#e3bf6f" stroke-opacity=".28"/>`;

// A face: a soft silhouette in a frame (square for the unit frames, round for lists).
const face = (cx, cy, size, ring, round) => {
	const half = size / 2;
	const clip = 'c' + Math.round(cx) + Math.round(cy);
	const shape = round ? `<circle cx="${cx}" cy="${cy}" r="${half}"/>` : `<rect x="${cx - half}" y="${cy - half}" width="${size}" height="${size}"/>`;
	return `
<clipPath id="${clip}">${shape}</clipPath>
<g clip-path="url(#${clip})">
<rect x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" fill="#1d2a45"/>
<radialGradient id="${clip}g" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="${ring}" stop-opacity=".45"/><stop offset="1" stop-color="#0c1322" stop-opacity="0"/></radialGradient>
<rect x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" fill="url(#${clip}g)"/>
<circle cx="${cx}" cy="${cy - size * 0.08}" r="${size * 0.2}" fill="#0a0f1b" opacity=".9"/>
<path d="M${cx - size * 0.38} ${cy + half}C${cx - size * 0.34} ${cy + size * 0.16} ${cx + size * 0.34} ${cy + size * 0.16} ${cx + size * 0.38} ${cy + half}Z" fill="#0a0f1b" opacity=".9"/>
</g>
${round ? `<circle cx="${cx}" cy="${cy}" r="${half}" fill="none" stroke="${ring}" stroke-width="3"/>` : `<rect x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" fill="none" stroke="${ring}" stroke-width="3"/>`}`;
};

// 1. Unit frames: the player's block and the target's, mirrored, with heals and damage to come.
{
	const P = 150; // portrait size
	const block = (x, y, mirror, o) => {
		const barW = 330;
		const fx = mirror ? x + barW + 14 : x; // portrait
		const bx = mirror ? x : x + P + 14; // bars
		const healthH = P - 34;
		let s = face(fx + P / 2, y + P / 2, P, o.ring, false);
		s += bar(bx, y, barW, healthH, o.health, '#2f9a3c', o.healthExtra(bx, y, barW, healthH));
		s += bar(bx, y + healthH + 6, barW, 28, o.power, o.powerColor);
		// level tab, rest tab
		const lx = mirror ? fx + 6 : fx + P - 46;
		s += `<rect x="${lx}" y="${y + P - 30}" width="40" height="24" fill="#070b14" stroke="#e3bf6f" stroke-opacity=".7"/><text x="${lx + 20}" y="${y + P - 12}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="16" fill="#f7dc97">${o.level}</text>`;
		if (o.rest) s += `<text x="${fx + 12}" y="${y + 26}" font-family="Georgia, serif" font-size="18" font-style="italic" fill="#a9c4ff">z</text><text x="${fx + 22}" y="${y + 18}" font-family="Georgia, serif" font-size="13" font-style="italic" fill="#a9c4ff">z</text>`;
		// points column
		const cx = mirror ? fx - 26 : fx + P + barW + 30;
		for (let i = 0; i < 5; i++) s += `<rect x="${cx}" y="${y + i * 31}" width="12" height="24" fill="${i < o.points ? '#f2c94c' : '#1a2236'}" stroke="#e3bf6f" stroke-opacity=".35"/>`;
		// cast bar under
		s += bar(mirror ? x : x, y + P + 14, barW + P + 14, 18, o.cast, '#d9a441');
		// name above, as a gold line
		s += `<rect x="${mirror ? x + barW + P - 140 : x}" y="${y - 28}" width="140" height="8" rx="4" fill="#e3bf6f" opacity=".75"/>`;
		return s;
	};
	const hot = (bx, y, w, h) => `
<rect x="${bx + w * 0.62}" y="${y}" width="${w * 0.2}" height="${h}" fill="#7be08a" opacity=".55"/>
<rect x="${bx + w * 0.62}" y="${y + h - 10}" width="${w * 0.3}" height="10" fill="#0e5c2a" opacity=".95"/>
<g transform="translate(${bx + w - 34} ${y + h / 2 - 14})"><rect x="10" y="0" width="8" height="28" fill="#7be08a"/><rect x="0" y="10" width="28" height="8" fill="#7be08a"/></g>`;
	const dot = (bx, y, w, h) => `
<rect x="${bx + w * 0.18}" y="${y}" width="${w * 0.24}" height="${h}" fill="#ff6a3d" opacity=".35"/>
<rect x="${bx + w * 0.18}" y="${y + h - 10}" width="${w * 0.24}" height="10" fill="#b8402a"/>
<g transform="translate(${bx + 10} ${y + h / 2 - 15})" fill="#ece3cc"><circle cx="15" cy="12" r="12"/><rect x="8" y="18" width="14" height="10" rx="2"/><circle cx="10" cy="12" r="3.5" fill="#05080f"/><circle cx="20" cy="12" r="3.5" fill="#05080f"/></g>`;
	write('frames', '<g transform="translate(800 450) scale(1.12) translate(-800 -450)">' + panel(110, 230, 1380, 440) +
		block(170, 330, false, { ring: '#e3bf6f', health: 0.62, healthExtra: hot, power: 0.8, powerColor: '#3b6fd8', level: '60', rest: true, points: 3, cast: 0.55 }) +
		block(870, 330, true, { ring: '#c0392b', health: 0.42, healthExtra: dot, power: 1, powerColor: '#c23b3b', level: '61', rest: false, points: 0, cast: 0 }) +
		`<line x1="800" y1="300" x2="800" y2="610" stroke="#e3bf6f" stroke-opacity=".25" stroke-dasharray="2 8"/></g>`);
}

// 2. Items: a tooltip in the item's quality, its icon as a badge, one line in green.
{
	const line = (y, w, color = '#ddd3bd', o = 0.55) => `<rect x="560" y="${y}" width="${w}" height="12" rx="6" fill="${color}" opacity="${o}"/>`;
	write('items', `
<g filter="url(#glow)" opacity=".35"><rect x="520" y="200" width="560" height="520" rx="8" fill="#a335ee"/></g>
<rect x="520" y="200" width="560" height="520" rx="8" fill="url(#panel)" stroke="#a335ee" stroke-width="3"/>
<g transform="translate(762 150)"><rect width="76" height="76" rx="6" fill="#1a1230" stroke="#a335ee" stroke-width="3"/>
<path d="M18 58L50 18M44 14l14 14M26 44l8 8" stroke="#e3bf6f" stroke-width="6" stroke-linecap="round"/></g>
<rect x="560" y="262" width="300" height="20" rx="10" fill="#c48bff"/>
${line(306, 180)}${line(334, 240)}${line(380, 300)}${line(408, 260)}${line(436, 280)}
<g transform="translate(560 486)"><path d="M0 18L14 0L28 18H19V32H9V18Z" fill="#3ccf4e"/><rect x="44" y="10" width="190" height="14" rx="7" fill="#3ccf4e"/></g>
${line(546, 220, '#e3bf6f', 0.7)}
<g transform="translate(990 640)"><circle r="20" fill="url(#gold)"/><circle r="13" fill="none" stroke="#7a5418" stroke-width="2"/></g>
<rect x="560" y="634" width="120" height="12" rx="6" fill="#ddd3bd" opacity=".45"/>
<g transform="translate(1180 300)" opacity=".85">${panel(0, 0, 260, 300)}
<rect x="30" y="40" width="130" height="14" rx="7" fill="#e3bf6f" opacity=".8"/>
${[0, 1, 2, 3, 4].map((i) => `<rect x="30" y="${84 + i * 40}" width="90" height="10" rx="5" fill="#ddd3bd" opacity=".45"/><rect x="140" y="${82 + i * 40}" width="90" height="14" fill="#05080f" stroke="#e3bf6f" stroke-opacity=".3"/><rect x="140" y="${82 + i * 40}" width="${[80, 54, 66, 30, 44][i]}" height="14" fill="#e3bf6f" opacity=".75"/>`).join('')}
</g>
<g transform="translate(160 300)" opacity=".8">${panel(0, 0, 260, 300)}
<rect x="30" y="40" width="130" height="14" rx="7" fill="#e3bf6f" opacity=".8"/>
${[0, 1, 2].map((i) => `<rect x="30" y="${90 + i * 60}" width="44" height="44" rx="4" fill="#1d2a45" stroke="#1eff00" stroke-opacity=".7"/><rect x="88" y="${100 + i * 60}" width="${[120, 90, 140][i]}" height="10" rx="5" fill="#ddd3bd" opacity=".45"/><rect x="88" y="${118 + i * 60}" width="70" height="8" rx="4" fill="#e3bf6f" opacity=".6"/>`).join('')}
</g>`);
}

// 3. Travel: a night landscape, the flight line with its stops, the traveller's dot.
{
	const stops = [260, 620, 980, 1340];
	write('travel', `
<circle cx="1260" cy="190" r="70" fill="#f3ead6" opacity=".9"/><circle cx="1290" cy="170" r="70" fill="#0c1322" opacity=".92"/>
${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 263) % 1600}" cy="${(i * 97) % 380}" r="${i % 5 === 0 ? 2 : 1.2}" fill="#f3ead6" opacity="${0.3 + (i % 4) * 0.15}"/>`).join('')}
<path d="M0 640L140 560L260 600L420 500L560 590L700 520L860 600L1000 480L1160 580L1300 520L1460 600L1600 540V900H0Z" fill="#0f1828"/>
<path d="M0 720L180 660L360 700L540 640L760 710L980 650L1200 720L1400 670L1600 700V900H0Z" fill="#0a111e"/>
<line x1="${stops[0]}" y1="380" x2="${stops[3]}" y2="380" stroke="#e3bf6f" stroke-opacity=".35" stroke-width="3"/>
<line x1="${stops[0]}" y1="380" x2="860" y2="380" stroke="url(#gold)" stroke-width="5"/>
${stops.map((x, i) => `<circle cx="${x}" cy="380" r="${i === 0 || i === 3 ? 12 : 9}" fill="${x <= 860 ? '#e3bf6f' : '#0c1322'}" stroke="#e3bf6f" stroke-width="3"/>`).join('')}
<g filter="url(#glow)"><circle cx="860" cy="380" r="18" fill="#f7dc97"/></g><circle cx="860" cy="380" r="12" fill="#fff1c9"/>
<rect x="580" y="290" width="440" height="22" rx="11" fill="#e3bf6f" opacity=".85"/>
<rect x="1240" y="420" width="120" height="16" rx="8" fill="#ddd3bd" opacity=".55"/>`);
}

// 4. Group: the raid markers' wheel around the cursor.
{
	const symbols = [
		['star', '#f6d743'], ['circle', '#f08a24'], ['diamond', '#c45cf5'], ['triangle', '#3fcf5a'],
		['moon', '#cfd8e6'], ['square', '#2f8cf0'], ['cross', '#e6413c'], ['skull', '#f3ead6'],
	];
	const shape = (kind, c) => ({
		star: `<path d="M0 -30L9 -9L31 -9L13 5L20 27L0 14L-20 27L-13 5L-31 -9L-9 -9Z" fill="${c}"/>`,
		circle: `<circle r="26" fill="${c}"/>`,
		diamond: `<path d="M0 -32L26 0L0 32L-26 0Z" fill="${c}"/>`,
		triangle: `<path d="M0 -30L30 24H-30Z" fill="${c}"/>`,
		moon: `<path d="M8 -28A30 30 0 1 0 8 28A22 22 0 1 1 8 -28Z" fill="${c}"/>`,
		square: `<rect x="-24" y="-24" width="48" height="48" fill="${c}"/>`,
		cross: `<path d="M-24 -16L-16 -24L0 -8L16 -24L24 -16L8 0L24 16L16 24L0 8L-16 24L-24 16L-8 0Z" fill="${c}"/>`,
		skull: `<circle cy="-6" r="24" fill="${c}"/><rect x="-14" y="10" width="28" height="18" rx="3" fill="${c}"/><circle cx="-9" cy="-6" r="7" fill="#05080f"/><circle cx="9" cy="-6" r="7" fill="#05080f"/>`,
	})[kind];
	const R = 210;
	write('group', `
<circle cx="800" cy="450" r="${R + 70}" fill="#070b14" opacity=".55" stroke="#e3bf6f" stroke-opacity=".45"/>
<circle cx="800" cy="450" r="${R - 70}" fill="none" stroke="#e3bf6f" stroke-opacity=".2"/>
${symbols.map(([kind, c], i) => {
		const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
		const x = 800 + Math.cos(a) * R;
		const y = 450 + Math.sin(a) * R;
		const chosen = i === 7;
		return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${chosen ? '<circle r="50" fill="#e3bf6f" opacity=".18"/><circle r="50" fill="none" stroke="#f7dc97" stroke-width="2"/>' : '<circle r="46" fill="#0c1322" stroke="#e3bf6f" stroke-opacity=".3"/>'}${shape(kind, c)}</g>`;
	}).join('')}
<path d="M800 450L800 490L810 480L818 498L826 494L818 476L832 476Z" fill="#f3ead6" stroke="#05080f" stroke-width="2"/>
<line x1="812" y1="440" x2="${800 + Math.cos(Math.PI * 1.25) * (R - 60)}" y2="${450 + Math.sin(Math.PI * 1.25) * (R - 60)}" stroke="#f7dc97" stroke-opacity=".5" stroke-dasharray="3 7"/>`);
}

// 5. Characters: the account's characters as rows, faces in their class colors, a reminder card beside.
{
	const rows = [['#ff7d0a', '60', 0.9, 120], ['#3fc7eb', '42', 0.55, 70], ['#f58cba', '27', 0.3, 40], ['#fff569', '14', 0.75, 20]];
	write('characters', panel(300, 170, 640, 560) + `
<rect x="350" y="214" width="200" height="16" rx="8" fill="#e3bf6f" opacity=".85"/>
${rows.map(([c, lvl, rest, gold], i) => {
		const y = 280 + i * 110;
		return `${face(400, y + 40, 76, c, true)}
<rect x="460" y="${y + 14}" width="${[170, 140, 150, 120][i]}" height="14" rx="7" fill="${c}" opacity=".9"/>
<text x="460" y="${y + 62}" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="19" fill="#f7dc97">${lvl}</text>
<rect x="510" y="${y + 50}" width="200" height="12" fill="#05080f" stroke="#e3bf6f" stroke-opacity=".3"/><rect x="510" y="${y + 50}" width="${200 * rest}" height="12" fill="#5b8cff" opacity=".8"/>
<circle cx="770" cy="${y + 40}" r="12" fill="url(#gold)"/><rect x="792" y="${y + 34}" width="${gold}" height="12" rx="6" fill="#ddd3bd" opacity=".55"/>
${i === 0 ? `<path d="M380 ${y - 4}l6 -12l6 12" fill="none" stroke="#f7dc97" stroke-width="3"/>` : ''}
<line x1="350" y1="${y + 96}" x2="890" y2="${y + 96}" stroke="#e3bf6f" stroke-opacity=".12"/>`;
	}).join('')}
<g transform="translate(1010 300)">${panel(0, 0, 320, 300)}
<rect x="34" y="40" width="150" height="14" rx="7" fill="#e3bf6f" opacity=".85"/>
${[0, 1, 2, 3].map((i) => `<rect x="34" y="${90 + i * 48}" width="20" height="20" rx="3" fill="${i < 2 ? '#e3bf6f' : 'none'}" stroke="#e3bf6f" stroke-opacity=".7"/>${i < 2 ? `<path d="M38 ${100 + i * 48}l5 5l8 -10" stroke="#070b14" stroke-width="3" fill="none"/>` : ''}<rect x="70" y="${94 + i * 48}" width="${[180, 140, 200, 120][i]}" height="12" rx="6" fill="#ddd3bd" opacity="${i < 2 ? 0.3 : 0.6}"/>`).join('')}
<path d="M270 230c0-14 22-14 22 0c0 12-11 24-11 24s-11-12-11-24Z" fill="#e3bf6f"/><circle cx="281" cy="230" r="4" fill="#070b14"/>
</g>`);
}

// 6. Bestiary (an emblem, square, for an extension without its own logo yet): an open tome,
// the round portraits of its list ringed in their rank's color on the left page, a wolf's head
// inked in gold on the right one. A real <key>.webp logo in assets/ takes its place.
{
	const square = (name, body) => {
		const defs = DEFS.replace(/<rect width="1600"[^>]*\/>/, '').replace(/<g opacity="\.18"[\s\S]*?<\/g>/, '');
		fs.writeFileSync(path.join(OUT, name + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" width="720" height="720">${defs}
<rect width="720" height="720" fill="url(#bg)"/>
<g opacity=".2" stroke="#e3bf6f" fill="none"><circle cx="360" cy="360" r="300"/><circle cx="360" cy="360" r="246" stroke-dasharray="2 10"/></g>${body}</svg>`);
		console.log(name + '.svg');
	};
	const page = (d) => `<path d="${d}" fill="url(#panel)" stroke="#e3bf6f" stroke-opacity=".55" stroke-width="2"/>`;
	const rings = [['#e3bf6f', 300], ['#4f8fe8', 372], ['#d8483e', 444]];
	square('bestiary', `<g transform="translate(360 372) scale(1.16) translate(-360 -400)">
<ellipse cx="360" cy="400" rx="230" ry="120" fill="#e3bf6f" opacity=".12" filter="url(#glow)"/>
${page('M356 262C300 246 228 244 162 258V492C228 478 300 480 356 496Z')}
${page('M364 262C420 246 492 244 558 258V492C492 478 420 480 364 496Z')}
<path d="M360 258V500" stroke="#e3bf6f" stroke-opacity=".8" stroke-width="2"/>
<path d="M150 266V504C226 488 300 490 360 508C420 490 494 488 570 504V266" fill="none" stroke="#e3bf6f" stroke-opacity=".35" stroke-width="2"/>
${rings.map(([c, y]) => `${face(208, y, 46, c, true)}
<rect x="244" y="${y - 12}" width="${[84, 70, 92][rings.findIndex((r) => r[1] === y)]}" height="9" rx="4.5" fill="#ddd3bd" opacity=".55"/>
<rect x="244" y="${y + 4}" width="40" height="8" rx="4" fill="#e3bf6f" opacity=".8"/>`).join('')}
<g transform="translate(-4 -6)">
<path d="M452 300L468 338L482 296L500 344C526 370 536 410 528 452L500 442C476 448 458 440 446 430L408 420C392 416 390 404 398 398L410 392C428 376 440 360 448 346Z" fill="#e3bf6f" fill-opacity=".14" stroke="url(#gold)" stroke-width="4" stroke-linejoin="round"/>
<path d="M432 372C440 366 450 366 456 372C448 376 440 377 432 372Z" fill="#f7dc97"/>
<path d="M404 410C420 414 432 420 442 426M470 352L476 330M490 352L492 332" fill="none" stroke="#f7dc97" stroke-opacity=".7" stroke-width="2.5" stroke-linecap="round"/>
<path d="M470 400C484 396 496 404 504 416M480 420C492 418 502 424 510 434" fill="none" stroke="#e3bf6f" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
</g>
<path d="M500 456L540 410M512 466L552 420M524 476L560 434" stroke="#f7dc97" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>
<path d="M352 500V560L360 552L368 560V500" fill="#b9852f" stroke="#e3bf6f" stroke-opacity=".7"/>
</g>`);
}
