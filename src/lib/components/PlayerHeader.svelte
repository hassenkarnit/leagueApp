<script lang="ts">
	import { PLATFORMS } from '#lib/shared/platforms.ts';
	import type { PlayerProfile } from '#lib/shared/types.ts';

	let { profile }: { profile: PlayerProfile } = $props();

	const platformLabel = $derived(
		PLATFORMS.find((p) => p.id === profile.platform)?.label ?? profile.platform
	);
</script>

<header class="flex items-center gap-4">
	<img
		src={profile.profileIconUrl}
		alt="Icône de profil"
		width="64"
		height="64"
		class="size-16 rounded-lg border border-zinc-200"
	/>
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">
			{profile.gameName}<span class="text-zinc-400">#{profile.tagLine}</span>
		</h1>
		<p class="text-sm text-zinc-600">Niveau {profile.summonerLevel} · {platformLabel}</p>
	</div>
</header>
