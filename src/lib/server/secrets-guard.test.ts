import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Garde-fou du principe I de la constitution : la clé Riot ne doit jamais être versionnée.
describe('protection de la clé API Riot', () => {
	it('ignore le fichier .env dans git', () => {
		const ignored = execFileSync('git', ['check-ignore', '.env'], { encoding: 'utf8' }).trim();
		expect(ignored).toBe('.env');
	});

	it('ne contient aucune vraie clé dans .env.example', () => {
		const example = readFileSync('.env.example', 'utf8');
		const value = example.match(/^RIOT_API_KEY=(.*)$/m)?.[1];
		expect(value).toBe('RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
	});
});
