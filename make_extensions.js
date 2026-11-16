// Builds the extensions' images for the site from their full logos (1024 px): a light WebP each,
// sized for the page (twice its drawn size, for sharp screens).
// Also the logo of the header and footer, from assets/logo.png.
// Usage: node make_extensions.js          every image
//        node make_extensions.js <name>   only that one (professions, bags...)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LOGOS = 'C:/Users/jacks/.wanderer-tools/media/Logo';
const OUT = path.join(__dirname, 'assets');
// [source, name, size]: the extensions' emblems, and the site's logo (transparent) for the header and footer.
const EMBLEMS = [['Wanderer Bags', 'bags'], ['Wanderer Auction', 'auction'], ['Wanderer Quests', 'quests'],
	['Wanderer Training', 'training'], ['Wanderer Chat', 'chat'], ['Wanderer mail', 'mail'], ['Wanderer Maps', 'maps'], ['Wanderer Outfits', 'outfits'], ['Wanderer Professions', 'professions']];
const IMAGES = EMBLEMS.map(([file, key]) => [LOGOS + '/' + file + '.png', key + '.webp', 720]).concat([[path.join(OUT, 'logo.png'), 'logo.webp', 224]]);

const ONLY = process.argv[2];
for (const [source, name, SIZE] of IMAGES.filter(([, file]) => !ONLY || file === ONLY + '.webp')) {
	const data = 'data:image/png;base64,' + fs.readFileSync(source).toString('base64');
	const html = `<!doctype html><html><body><script>
const image = new Image();
image.onload = () => {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = ${SIZE};
	const g = canvas.getContext('2d');
	g.imageSmoothingQuality = 'high';
	g.drawImage(image, 0, 0, ${SIZE}, ${SIZE});
	const out = document.createElement('pre');
	out.id = 'out';
	out.textContent = canvas.toDataURL('image/webp', ${SIZE < 300 ? 0.92 : 0.84});
	document.body.appendChild(out);
};
image.src = '${data}';
</script></body></html>`;
	const page = path.join(__dirname, '_extension.html');
	fs.writeFileSync(page, html);
	const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom',
		'file:///' + page.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	fs.unlinkSync(page);
	const found = dom.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
	if (!found) throw new Error('no image for ' + source);
	fs.writeFileSync(path.join(OUT, name), Buffer.from(found[1], 'base64'));
	console.log(name, fs.statSync(path.join(OUT, name)).size, 'bytes');
}
