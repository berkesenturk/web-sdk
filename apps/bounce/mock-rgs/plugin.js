// Dev-only mock RGS for local play. The web-sdk client hardcodes `https://${rgs_url}`
// (rgs-fetcher), so we serve the wallet/replay endpoints from the bounce dev server
// itself over HTTPS (same origin → no CORS). Point the game at it with:
//   https://localhost:3007/?rgs_url=localhost:3007&sessionID=mock&currency=USD&device=desktop&lang=en
//
// Books are read straight from the math-sdk publish_files (.jsonl.zst, decompressed
// with Node's built-in zstd) and sampled by the real lookup-table weights, so payouts
// follow the same distribution the RGS would serve. Nothing here runs in `vite build`.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { zstdDecompressSync } from 'node:zlib';

const API = 1_000_000; // constants-shared/bet API_AMOUNT_MULTIPLIER ($1 = 1_000_000)
const DIR = import.meta.dirname;
const PUBLISH = path.resolve(DIR, '../../../../math-sdk/games/bounce/library/publish_files');
const CERT_DIR = path.join(DIR, '.cert');

// $0.10 → $8000 ladder (40 levels, indexes cover MOST_USED_BET_INDEXES).
const BET_LEVELS = [0.1, 1, 10, 100, 1000].flatMap((m) =>
	[1, 2, 3, 4, 5, 6, 7, 8].map((d) => +(m * d).toFixed(2)),
);

let balance = 1000 * API; // starting play-money balance
let pendingPayout = 0; // this round's win, credited on end-round (not on play), so
// KREDİ shows the stake taken at spin-start and the win landing when the round ends.
const modeCache = new Map(); // mode -> { lines, cum, total }

const readIndex = () => JSON.parse(fs.readFileSync(path.join(PUBLISH, 'index.json'), 'utf8'));

const resolveMode = (requested) => {
	const modes = readIndex().modes;
	const hit = modes.find((m) => m.name === requested);
	return (hit ?? modes[0]).name; // unknown/'BASE' → first mode (normal)
};

// Decompress a mode's books + weights once, then weighted-sample on demand. The
// decompressed normal file is ~715 MB (>Node's max string length), so we keep the
// raw Buffer and record per-line byte ranges instead of building one giant string.
// The cache holds at most 2 modes (each buffer is several hundred MB) — the
// oldest other mode is evicted when a new one loads.
const loadMode = (mode) => {
	if (modeCache.has(mode)) return modeCache.get(mode);
	for (const key of modeCache.keys()) {
		if (modeCache.size < 2) break;
		modeCache.delete(key);
	}
	const entry = readIndex().modes.find((m) => m.name === mode);
	const buf = zstdDecompressSync(fs.readFileSync(path.join(PUBLISH, entry.events)));
	const ranges = [];
	let pos = 0, nl;
	while ((nl = buf.indexOf(0x0a, pos)) !== -1) {
		if (nl > pos) ranges.push([pos, nl]);
		pos = nl + 1;
	}
	if (pos < buf.length) ranges.push([pos, buf.length]);
	const cum = new Float64Array(ranges.length);
	let total = 0;
	const wRows = fs.readFileSync(path.join(PUBLISH, entry.weights), 'utf8').split('\n');
	for (let i = 0; i < ranges.length; i++) {
		total += Number(wRows[i]?.split(',')[1] ?? 0); // col: id,weight,payout
		cum[i] = total;
	}
	const loaded = { buf, ranges, cum, total };
	modeCache.set(mode, loaded);
	return loaded;
};

const parseBook = (m, i) => JSON.parse(m.buf.toString('utf8', m.ranges[i][0], m.ranges[i][1]));

const sampleBook = (mode) => {
	const m = loadMode(mode);
	const r = Math.random() * m.total;
	let lo = 0, hi = m.cum.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (m.cum[mid] < r) lo = mid + 1;
		else hi = mid;
	}
	return parseBook(m, lo);
};

const bookByIndex = (mode, idx) => {
	const m = loadMode(mode);
	const i = Number.isInteger(idx) && idx >= 0 && idx < m.ranges.length ? idx : 0;
	return parseBook(m, i);
};

const round = (book, amount) => {
	const payoutMultiplier = book.payoutMultiplier / 100; // book is integer cents → float ×
	return {
		roundID: Date.now(),
		amount,
		payout: Math.round(amount * payoutMultiplier),
		payoutMultiplier,
		active: true,
		mode: book.events?.[0]?.mode ?? 'normal',
		event: null,
		state: book.events,
	};
};

const authenticate = () => {
	// Each session (page load) starts fresh at 1000 USD play-money.
	balance = 1000 * API;
	pendingPayout = 0;
	return {
	status: { statusCode: 'SUCCESS', statusMessage: '' },
	balance: { amount: balance, currency: 'USD' },
	config: {
		betLevels: BET_LEVELS.map((v) => v * API),
		defaultBetLevel: 1 * API,
		betModes: Object.fromEntries(
			readIndex().modes.map((m) => [m.name, { mode: m.name, costMultiplier: m.cost, feature: false }]),
		),
		jurisdiction: {
			socialCasino: false, disabledFullscreen: false, disabledTurbo: false,
			disabledSuperTurbo: false, disabledAutoplay: false, disabledSlamstop: false,
			disabledSpacebar: false, disabledBuyFeature: false, displayNetPosition: false,
			displayRTP: false, displaySessionTimer: false, minimumRoundDuration: 0,
		},
	},
	};
};

const readBody = (req) =>
	new Promise((resolve) => {
		let data = '';
		req.on('data', (c) => (data += c));
		req.on('end', () => {
			try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
		});
	});

const sendJson = (res, body) => {
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
};

// Self-signed cert so the same-origin HTTPS fetch works. Browser shows a one-time
// "not private" warning on first navigation to https://localhost:3007 — click through it.
const ensureCert = () => {
	const key = path.join(CERT_DIR, 'key.pem');
	const cert = path.join(CERT_DIR, 'cert.pem');
	if (!fs.existsSync(key) || !fs.existsSync(cert)) {
		fs.mkdirSync(CERT_DIR, { recursive: true });
		execFileSync(
			'openssl',
			['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '3650',
				'-keyout', key, '-out', cert, '-subj', '/CN=localhost',
				'-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'],
			{ stdio: 'ignore' },
		);
	}
	return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
};

export function mockRgs() {
	return {
		name: 'mock-rgs',
		// Serve the dev app over HTTPS so the client's hardcoded https:// reaches us.
		config(_, { command }) {
			if (command !== 'serve') return;
			return { server: { https: ensureCert() } };
		},
		configureServer: {
			order: 'pre',
			handler(server) {
				server.middlewares.use(async (req, res, next) => {
					const url = (req.url ?? '').split('?')[0];
					try {
						if (req.method === 'POST' && url === '/wallet/authenticate')
							return sendJson(res, authenticate());

						if (req.method === 'POST' && url === '/wallet/play') {
							const body = await readBody(req);
							const book = sampleBook(resolveMode(body.mode));
							const r = round(book, body.amount ?? API);
							// Take the stake now; hold the win for end-round (real-RGS convention:
							// /wallet/play settles the bet, /wallet/end-round settles the win).
							balance = balance - r.amount;
							pendingPayout = r.payout;
							server.config.logger.info(
								`[mock-rgs] play ${r.mode} → ${r.payoutMultiplier}x (id ${book.id})`,
							);
							return sendJson(res, {
								status: { statusCode: 'SUCCESS', statusMessage: '' },
								balance: { amount: balance, currency: 'USD' },
								round: r,
							});
						}

						if (req.method === 'POST' && url === '/wallet/end-round') {
							balance = balance + pendingPayout;
							pendingPayout = 0;
							return sendJson(res, {
								status: { statusCode: 'SUCCESS', statusMessage: '' },
								balance: { amount: balance, currency: 'USD' },
							});
						}

						// Dev nicety: pre-warm a mode's books when the selector picks it,
						// so the first play doesn't stall on the big zstd decompression.
						if (req.method === 'POST' && url === '/dev/warm-mode') {
							const mode = resolveMode(new URLSearchParams((req.url ?? '').split('?')[1]).get('mode'));
							setTimeout(() => {
								try { loadMode(mode); } catch { /* warm-up only */ }
							}, 0);
							return sendJson(res, { status: { statusCode: 'SUCCESS', statusMessage: '' } });
						}

						if (req.method === 'POST' && url === '/bet/event') {
							const body = await readBody(req);
							return sendJson(res, {
								status: { statusCode: 'SUCCESS', statusMessage: '' },
								event: body.event ?? '0',
							});
						}

						// GET /bet/replay/{game}/{version}/{mode}/{event}
						//      [0]''  [1]bet [2]replay [3]game [4]version [5]mode [6]event
						if (req.method === 'GET' && url.startsWith('/bet/replay/')) {
							const [, , , , , mode, event] = url.split('/');
							const book = bookByIndex(resolveMode(mode), Number(event));
							return sendJson(res, round(book, 1 * API));
						}
					} catch (error) {
						res.statusCode = 500;
						return sendJson(res, { error: 'mock_rgs_error', message: String(error) });
					}
					next();
				});
			},
		},
	};
}
