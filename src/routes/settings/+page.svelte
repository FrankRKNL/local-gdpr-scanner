<script lang="ts">
	import { appStore } from '$lib/stores/app';

	const settings = $derived(appStore.state.settings);
</script>

<div class="settings">
	<h2>Instellingen</h2>

	<section class="settings-section card">
		<h3>🤖 AI Model</h3>
		<p class="description">
			Lokale AI draait volledig op uw apparaat. Geen data wordt naar externe servers gestuurd.
		</p>
		<div class="setting-row">
			<span>Actief model</span>
			<span class="badge badge-success">Qwen 3.5 0.8B (lokaal)</span>
		</div>
		<div class="setting-row">
			<span>Verwerking</span>
			<span>100% lokaal</span>
		</div>
	</section>

	<section class="settings-section card">
		<h3>🔒 Privacy</h3>
		<p class="description">
			Uw emails worden alleen lokaal verwerkt en opgeslagen.
		</p>
		<div class="setting-row">
			<span>Email data</span>
			<span class="badge badge-success">✓ Lokaal</span>
		</div>
		<div class="setting-row">
			<span>AI analyze</span>
			<span class="badge badge-success">✓ Lokaal</span>
		</div>
		<div class="setting-row">
			<span>Externe API's</span>
			<span class="badge badge-danger">✗ Geen</span>
		</div>
	</section>

	<section class="settings-section card">
		<h3>🗣️ Taal</h3>
		<p class="description">
			Selecteer de taal voor de interface en rapporten.
		</p>
		<select bind:value={settings.language} class="select">
			<option value="nl">Nederlands</option>
			<option value="en">English</option>
			<option value="de">Deutsch</option>
		</select>
	</section>

	<section class="settings-section card">
		<h3>ℹ️ Over</h3>
		<div class="about-info">
			<p><strong>Local GDPR Scanner</strong></p>
			<p>Versie 0.1.0</p>
			<p class="description">
				Een privacy-first desktop applicatie voor het scannen van uw email op GDPR-persoonsgegevens.
			</p>
			<p class="description">
				100% lokaal • Open source • Geen tracking
			</p>
		</div>
	</section>

	<section class="settings-section card">
		<h3>⚠️ Data verwijderen</h3>
		<p class="description">
			Verwijder alle lokaal opgeslagen scan resultaten.
		</p>
		<button class="btn btn-danger" onclick={() => appStore.clearResults()}>
			🗑️ Alle resultaten verwijderen
		</button>
	</section>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 600px;
	}

	h2 {
		font-size: 1.5rem;
	}

	.settings-section h3 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.description {
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.setting-row:last-child {
		border-bottom: none;
	}

	.select {
		width: 100%;
		padding: 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 1rem;
	}

	.about-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.btn-danger {
		background: var(--danger);
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.btn-danger:hover {
		opacity: 0.9;
	}
</style>
