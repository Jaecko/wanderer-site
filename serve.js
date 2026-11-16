// Shows dist/ at http://localhost:8080 to look at the pages before putting them online.
// Usage: node serve.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const TYPES = {
	'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
	'.gif': 'image/gif', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
	let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
	if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
	if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
	res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
	fs.createReadStream(file).pipe(res);
}).listen(8080, () => console.log('http://localhost:8080'));
