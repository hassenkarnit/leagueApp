import { isPlatform } from '#lib/shared/platforms.ts';
import type { Platform } from '#lib/shared/types.ts';
import { errors } from '../errors.ts';

export type Region = 'europe' | 'americas' | 'asia' | 'sea';

// Table R7 de research.md. account-v1 n'accepte pas « sea » : les serveurs SEA passent par « asia ».
const ROUTING: Record<Platform, { match: Region; account: Region }> = {
	euw1: { match: 'europe', account: 'europe' },
	eun1: { match: 'europe', account: 'europe' },
	tr1: { match: 'europe', account: 'europe' },
	ru: { match: 'europe', account: 'europe' },
	me1: { match: 'europe', account: 'europe' },
	na1: { match: 'americas', account: 'americas' },
	br1: { match: 'americas', account: 'americas' },
	la1: { match: 'americas', account: 'americas' },
	la2: { match: 'americas', account: 'americas' },
	kr: { match: 'asia', account: 'asia' },
	jp1: { match: 'asia', account: 'asia' },
	oc1: { match: 'sea', account: 'asia' },
	sg2: { match: 'sea', account: 'asia' },
	tw2: { match: 'sea', account: 'asia' },
	vn2: { match: 'sea', account: 'asia' }
};

export function regionsFor(platform: string): { match: Region; account: Region } {
	if (!isPlatform(platform)) throw errors.invalidPlatform();
	return ROUTING[platform];
}

export function hostFor(routingValue: Region | Platform): string {
	return `${routingValue}.api.riotgames.com`;
}
