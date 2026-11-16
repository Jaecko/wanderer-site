// The download count of Wanderer on CurseForge, through the official CurseForge
// API (never by reading the web page). Called by build.js when the counter is
// switched on; prints {"count": N} on success, {} otherwise, and never fails.
//
// The key comes from the environment (CURSEFORGE_API_KEY), never from the code,
// and never reaches the browser: the number is written into the static page.
// Nothing is kept on disk: the API terms forbid saving or caching its data.
const PROJECT_ID = 1720988;
const TIMEOUT = 8000; // ms

async function main() {
	const key = process.env.CURSEFORGE_API_KEY;
	if (!key) return {};
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT);
	try {
		const res = await fetch('https://api.curseforge.com/v1/mods/' + PROJECT_ID, {
			headers: { 'x-api-key': key, accept: 'application/json' },
			signal: controller.signal,
		});
		if (!res.ok) return {};
		const body = await res.json();
		const count = body && body.data && body.data.downloadCount;
		return Number.isFinite(count) ? { count } : {};
	} catch (e) {
		return {};
	} finally {
		clearTimeout(timer);
	}
}

main().then((result) => process.stdout.write(JSON.stringify(result)), () => process.stdout.write('{}'));
