// Formats d'affichage partagés (français).

/** 1820 → « 30:20 », 3725 → « 1:02:05 » */
export function formatDuration(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = String(totalSeconds % 60).padStart(2, '0');
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
		: `${minutes}:${seconds}`;
}

export function formatKda({
	kills,
	deaths,
	assists
}: {
	kills: number;
	deaths: number;
	assists: number;
}): string {
	return `${kills} / ${deaths} / ${assists}`;
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60]
];

const relativeFormat = new Intl.RelativeTimeFormat('fr', { numeric: 'always' });

/** « il y a 2 jours », « il y a 45 minutes », « à l'instant » */
export function formatRelativeDate(iso: string, now = Date.now()): string {
	const elapsedSeconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
	for (const [unit, seconds] of UNITS) {
		if (elapsedSeconds >= seconds) {
			return relativeFormat.format(-Math.floor(elapsedSeconds / seconds), unit);
		}
	}
	return "à l'instant";
}
