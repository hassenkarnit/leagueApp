interface Entry<V> {
	value: V;
	expiresAt: number;
}

export interface TtlCacheOptions {
	ttlMs: number;
	/** Au-delà, l'entrée la plus ancienne est évincée. */
	maxEntries?: number;
	now?: () => number;
}

/** Cache mémoire à durée de vie (research.md R9). */
export class TtlCache<K, V> {
	readonly #entries = new Map<K, Entry<V>>();
	readonly #pending = new Map<K, Promise<V>>();
	readonly #ttlMs: number;
	readonly #maxEntries: number;
	readonly #now: () => number;

	constructor({ ttlMs, maxEntries = Infinity, now = Date.now }: TtlCacheOptions) {
		this.#ttlMs = ttlMs;
		this.#maxEntries = maxEntries;
		this.#now = now;
	}

	get(key: K): V | undefined {
		const entry = this.#entries.get(key);
		if (!entry) return undefined;
		if (this.#now() >= entry.expiresAt) {
			this.#entries.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: K, value: V): void {
		this.#entries.delete(key);
		this.#entries.set(key, { value, expiresAt: this.#now() + this.#ttlMs });
		if (this.#entries.size > this.#maxEntries) {
			const oldestKey = this.#entries.keys().next().value as K;
			this.#entries.delete(oldestKey);
		}
	}

	/** Renvoie la valeur en cache ou la charge une seule fois, même pour des appels simultanés. */
	async getOrLoad(key: K, loader: () => Promise<V>): Promise<V> {
		const cached = this.get(key);
		if (cached !== undefined) return cached;

		const pending = this.#pending.get(key);
		if (pending) return pending;

		const promise = loader()
			.then((value) => {
				this.set(key, value);
				return value;
			})
			.finally(() => this.#pending.delete(key));
		this.#pending.set(key, promise);
		return promise;
	}
}
