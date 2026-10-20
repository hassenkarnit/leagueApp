// SEUL module qui lit la clé API Riot (principe I de la constitution).
import { RIOT_API_KEY } from '$app/env/private';

export function getRiotApiKey(): string {
	return RIOT_API_KEY;
}
