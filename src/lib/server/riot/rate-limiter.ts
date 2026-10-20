// Limiteur de débit pour un hôte Riot (research.md R8, principe II de la constitution).
// - fenêtres glissantes « app » (20/1 s et 100/2 min au départ), recalées sur les en-têtes Riot ;
// - fenêtres propres à chaque méthode, créées à partir de X-Method-Rate-Limit ;
// - pause globale sur Retry-After ;
// - deux priorités : « interactive » (recherche) passe avant « background » (analyse).

export type Priority = 'interactive' | 'background';

export interface ScheduleOptions {
	priority?: Priority;
	/** Nom stable de l'endpoint, ex. `match.getMatch`. */
	method?: string;
}

export interface RateLimiterOptions {
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
}

interface Window {
	limit: number;
	windowMs: number;
	/** Instants de départ des requêtes encore comptées dans la fenêtre. */
	starts: number[];
}

interface QueuedTask {
	run: () => void;
	method: string | undefined;
}

const DEFAULT_APP_LIMITS = '20:1,100:120';

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** « 20:1,100:120 » → [{ limit: 20, windowMs: 1000 }, { limit: 100, windowMs: 120000 }] */
function parseLimits(header: string): Array<{ limit: number; windowMs: number }> {
	return header
		.split(',')
		.map((part) => part.split(':').map(Number))
		.filter(([limit, seconds]) => Number.isFinite(limit) && Number.isFinite(seconds) && seconds > 0)
		.map(([limit, seconds]) => ({ limit, windowMs: seconds * 1000 }));
}

/** « 3:1,40:120 » → Map(windowMs → nombre de requêtes déjà comptées par Riot) */
function parseCounts(header: string): Map<number, number> {
	return new Map(parseLimits(header).map(({ limit, windowMs }) => [windowMs, limit]));
}

export class RateLimiter {
	readonly #now: () => number;
	readonly #sleep: (ms: number) => Promise<void>;
	#appWindows: Window[];
	readonly #methodWindows = new Map<string, Window[]>();
	readonly #queues: Record<Priority, QueuedTask[]> = { interactive: [], background: [] };
	#pausedUntil = 0;
	#pumping = false;

	constructor({ now = Date.now, sleep = realSleep }: RateLimiterOptions = {}) {
		this.#now = now;
		this.#sleep = sleep;
		this.#appWindows = parseLimits(DEFAULT_APP_LIMITS).map((l) => ({ ...l, starts: [] }));
	}

	schedule<T>(task: () => Promise<T>, { priority = 'interactive', method }: ScheduleOptions = {}) {
		return new Promise<T>((resolve, reject) => {
			this.#queues[priority].push({
				method,
				run: () => {
					task().then(resolve, reject);
				}
			});
			void this.#pump();
		});
	}

	pauseFor(seconds: number): void {
		this.#pausedUntil = Math.max(this.#pausedUntil, this.#now() + seconds * 1000);
	}

	updateFromHeaders(headers: Headers, method?: string): void {
		const appLimit = headers.get('X-App-Rate-Limit');
		if (appLimit) {
			this.#appWindows = this.#recalibrate(
				this.#appWindows,
				appLimit,
				headers.get('X-App-Rate-Limit-Count')
			);
		}
		const methodLimit = headers.get('X-Method-Rate-Limit');
		if (method && methodLimit) {
			this.#methodWindows.set(
				method,
				this.#recalibrate(
					this.#methodWindows.get(method) ?? [],
					methodLimit,
					headers.get('X-Method-Rate-Limit-Count')
				)
			);
		}
	}

	#recalibrate(current: Window[], limitHeader: string, countHeader: string | null): Window[] {
		const counts = countHeader ? parseCounts(countHeader) : new Map<number, number>();
		const now = this.#now();
		return parseLimits(limitHeader).map(({ limit, windowMs }) => {
			const existing = current.find((w) => w.windowMs === windowMs);
			const starts = existing ? this.#active(existing, now) : [];
			// Si Riot a compté plus de requêtes que nous (autre processus, redémarrage…), on s'aligne.
			const missing = (counts.get(windowMs) ?? 0) - starts.length;
			for (let i = 0; i < missing; i++) starts.push(now);
			return { limit, windowMs, starts };
		});
	}

	#active(window: Window, now: number): number[] {
		return window.starts.filter((start) => start > now - window.windowMs);
	}

	/** Temps d'attente avant de pouvoir lancer une requête dans ces fenêtres (0 = tout de suite). */
	#waitFor(windows: Window[], now: number): number {
		let wait = 0;
		for (const window of windows) {
			window.starts = this.#active(window, now);
			if (window.starts.length >= window.limit) {
				const oldest = window.starts[window.starts.length - window.limit];
				wait = Math.max(wait, oldest + window.windowMs - now);
			}
		}
		return wait;
	}

	#nextQueue(): QueuedTask[] | undefined {
		if (this.#queues.interactive.length > 0) return this.#queues.interactive;
		if (this.#queues.background.length > 0) return this.#queues.background;
		return undefined;
	}

	async #pump(): Promise<void> {
		if (this.#pumping) return;
		this.#pumping = true;
		try {
			for (let queue = this.#nextQueue(); queue; queue = this.#nextQueue()) {
				const next = queue[0];
				const now = this.#now();
				const methodWindows = next.method ? (this.#methodWindows.get(next.method) ?? []) : [];
				const wait = Math.max(
					this.#pausedUntil - now,
					this.#waitFor(this.#appWindows, now),
					this.#waitFor(methodWindows, now)
				);
				if (wait > 0) {
					// Après l'attente, on re-choisit : une requête interactive a pu arriver entre-temps.
					await this.#sleep(wait);
					continue;
				}
				queue.shift();
				for (const window of [...this.#appWindows, ...methodWindows]) window.starts.push(now);
				next.run();
			}
		} finally {
			this.#pumping = false;
		}
	}
}

/** Un limiteur par hôte Riot (les quotas sont comptés par région/plateforme). */
export function createLimiterRegistry(options: RateLimiterOptions = {}) {
	const limiters = new Map<string, RateLimiter>();
	return (host: string): RateLimiter => {
		let limiter = limiters.get(host);
		if (!limiter) {
			limiter = new RateLimiter(options);
			limiters.set(host, limiter);
		}
		return limiter;
	};
}
