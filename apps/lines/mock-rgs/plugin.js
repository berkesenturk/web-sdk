// Dev-only mock RGS for local play of the `lines` sample game. The web-sdk client
// hardcodes `https://${rgs_url}` (rgs-fetcher), so we serve the wallet/replay
// endpoints from the lines dev server itself over HTTPS (same origin → no CORS).
// Point the game at it with:
//   https://localhost:3001/?rgs_url=localhost:3001&sessionID=mock&currency=USD&device=desktop&lang=en
//
// Books come from the app's own storybook data (src/stories/data/*_books.ts),
// and are picked uniformly at random — good enough for local play; payout
// distribution is NOT the real math. Book `payoutMultiplier` here is already a
// float multiplier (unlike bounce's integer-cents books), so it is used as-is.
// The books data lives in *_books.json (the .ts modules are thin re-export
// shims — as TS literals the files were big enough to OOM Vite's transform),
// so the plugin JSON.parses the files directly. Nothing here runs in `vite build`.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const API = 1_000_000; // constants-shared/bet API_AMOUNT_MULTIPLIER ($1 = 1_000_000)
const DIR = import.meta.dirname;
const CERT_DIR = path.join(DIR, '.cert');

// $0.10 → $8000 ladder (40 levels).
const BET_LEVELS = [0.1, 1, 10, 100, 1000].flatMap((m) =>
	[1, 2, 3, 4, 5, 6, 7, 8].map((d) => +(m * d).toFixed(2)),
);

// Mode names match the client's default stateBet.activeBetModeKey ('BASE') and
// the costs in src/game/config.ts betModes.
const MODES = {
	BASE: { books: 'base_books.json', cost: 1, feature: true, buyBonus: false },
	BONUS: { books: 'bonus_books.json', cost: 100, feature: false, buyBonus: true },
};

let balance = 1000 * API; // starting play-money balance
let pendingPayout = 0; // credited on end-round, not on play (real-RGS convention)

const resolveMode = (requested) => {
	const key = String(requested ?? '').toUpperCase();
	return MODES[key] ? key : 'BASE';
};

const bookCache = new Map(); // mode -> parsed books array
const loadBooks = (mode) => {
	if (bookCache.has(mode)) return bookCache.get(mode);
	const file = path.resolve(DIR, '../src/stories/data', MODES[mode].books);
	const books = JSON.parse(fs.readFileSync(file, 'utf8'));
	bookCache.set(mode, books);
	return books;
};

const round = (book, amount, mode) => ({
	roundID: Date.now(),
	amount,
	payout: Math.round(amount * book.payoutMultiplier),
	payoutMultiplier: book.payoutMultiplier,
	active: true,
	mode,
	event: null,
	state: book.events,
});

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
				Object.entries(MODES).map(([name, m]) => [
					name,
					{ mode: name, costMultiplier: m.cost, feature: m.feature, buyBonus: m.buyBonus },
				]),
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
// "not private" warning on first navigation to https://localhost:3001 — click through it.
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
							const mode = resolveMode(body.mode);
							const books = loadBooks(mode);
							const book = books[Math.floor(Math.random() * books.length)];
							const r = round(book, body.amount ?? API, mode);
							// Take the stake now; hold the win for end-round.
							balance = balance - r.amount;
							pendingPayout = r.payout;
							server.config.logger.info(
								`[mock-rgs] play ${mode} → ${r.payoutMultiplier}x (id ${book.id})`,
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

						if (req.method === 'POST' && url === '/bet/event') {
							const body = await readBody(req);
							return sendJson(res, {
								status: { statusCode: 'SUCCESS', statusMessage: '' },
								event: body.event ?? '0',
							});
						}

						// GET /bet/replay/{game}/{version}/{mode}/{event}
						if (req.method === 'GET' && url.startsWith('/bet/replay/')) {
							const [, , , , , mode, event] = url.split('/');
							const resolved = resolveMode(mode);
							const books = loadBooks(resolved);
							const idx = Number(event);
							const book = books[Number.isInteger(idx) && idx >= 0 && idx < books.length ? idx : 0];
							return sendJson(res, round(book, 1 * API, resolved));
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
