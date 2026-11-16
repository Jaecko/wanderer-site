// Builds the site's logo files from the emblem image: the medallion cut out of its
// dark background (transparent around the ring and the gems), and a square
// version on the night color for the phones' home screen.
// Usage: node make_logo.js <emblem image>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const source = process.argv[2];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'assets');
const data = 'data:image/webp;base64,' + fs.readFileSync(source).toString('base64');

// The emblem: center, the ring's radius, and how far the gems reach (pixels of the 1024 image).
const CX = 513, CY = 515, RING = 338, REACH = 405;

function render(name, size, cutout) {
	const html = `<!doctype html><html><body style="margin:0;background:transparent">
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const image = new Image();
image.onload = () => {
	const canvas = document.getElementById('c');
	const g = canvas.getContext('2d');
	const crop = ${REACH} * 2;
	g.drawImage(image, ${CX} - ${REACH}, ${CY} - ${REACH}, crop, crop, 0, 0, ${size}, ${size});
	if (${cutout}) {
		const pixels = g.getImageData(0, 0, ${size}, ${size});
		const d = pixels.data, scale = ${size} / crop;
		for (let y = 0; y < ${size}; y++) for (let x = 0; x < ${size}; x++) {
			const i = (y * ${size} + x) * 4;
			const r = Math.hypot(x - ${size} / 2, y - ${size} / 2) / scale;
			if (r < ${RING}) continue;
			// Outside the ring: only what shines (the frame's glow, the gems) stays.
			const light = Math.max(d[i], d[i + 1], d[i + 2]);
			d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (light - 40) / 50)));
		}
		g.putImageData(pixels, 0, 0);
	}
	document.title = 'done';
};
image.src = '${data}';
</script></body></html>`;
	const page = path.join(__dirname, '_logo.html');
	fs.writeFileSync(page, html);
	execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
		`--window-size=${size},${size}`, '--virtual-time-budget=3000', `--screenshot=${path.join(OUT, name)}`,
		'file:///' + page.replace(/\\/g, '/')], { stdio: 'ignore' });
	fs.unlinkSync(page);
	console.log(name, fs.statSync(path.join(OUT, name)).size, 'bytes');
}

render('logo.png', 256, true);
render('logo-64.png', 64, true);
render('apple-touch-icon.png', 180, false);
