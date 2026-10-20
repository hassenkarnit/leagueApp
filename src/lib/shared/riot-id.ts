import type { RiotId } from './types.ts';

export const RIOT_ID_FORMAT_MESSAGE =
	'Format attendu : Pseudo#TAG (3 à 16 caractères, puis 3 à 5 caractères après le #).';

export type RiotIdParseResult = { ok: true; value: RiotId } | { ok: false; message: string };

// Unicode autorisé (ex. « 제우스 ») : on ne contrôle que les longueurs et l'alphanumérique du tag.
const TAG_LINE_PATTERN = /^[\p{L}\p{N}]{3,5}$/u;

function validate(gameName: string, tagLine: string): RiotIdParseResult {
	const name = gameName.trim();
	const tag = tagLine.trim();
	const nameLength = [...name].length;
	if (nameLength < 3 || nameLength > 16 || !TAG_LINE_PATTERN.test(tag)) {
		return { ok: false, message: RIOT_ID_FORMAT_MESSAGE };
	}
	return { ok: true, value: { gameName: name, tagLine: tag } };
}

function splitOnLast(input: string, separator: string): RiotIdParseResult {
	const index = input.lastIndexOf(separator);
	if (index === -1) return { ok: false, message: RIOT_ID_FORMAT_MESSAGE };
	return validate(input.slice(0, index), input.slice(index + 1));
}

/** Saisie utilisateur « Pseudo#TAG ». */
export function parseRiotIdInput(input: string): RiotIdParseResult {
	return splitOnLast(input.trim(), '#');
}

/** Segment d'URL « gameName-tagLine », déjà décodé (un tag ne contient jamais de tiret). */
export function parseUrlSegment(segment: string): RiotIdParseResult {
	return splitOnLast(segment, '-');
}

export function toUrlSegment({ gameName, tagLine }: RiotId): string {
	return `${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}

export function formatRiotId({ gameName, tagLine }: RiotId): string {
	return `${gameName}#${tagLine}`;
}
