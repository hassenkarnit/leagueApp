// Construit un RequestEvent minimal pour appeler directement un handler `+server.ts` en test.
export function requestEvent<E>(
	params: Record<string, string>,
	url = 'http://localhost/',
	init?: RequestInit
): E {
	return { params, url: new URL(url), request: new Request(url, init) } as unknown as E;
}
