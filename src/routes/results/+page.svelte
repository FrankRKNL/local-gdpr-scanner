<script lang="ts">
	import { appStore } from '$lib/stores/app';

	const results = $derived(appStore.state.results);
	const totalEmails = $derived(appStore.state.totalEmails);
	const scannedAt = $derived(appStore.state.scannedAt);

	const withPersonalData = $derived(results.filter(r => r.hasPersonalData));
	const withoutPersonalData = $derived(results.filter(r => !r.hasPersonalData));
</script>

<div class="results">
	<section class="header">
		<h2>Scan Resultaten</h2>
		{#if scannedAt}
			<p class="scan-info">
				{totalEmails} emails gescand • {scannedAt.toLocaleDateString('nl-NL')}
			</p>
		{/if}
	</section>

	{#if results.length === 0}
		<section class="empty-state card">
			<p> Nog geen scan uitgevoerd. </p>
			<a href="/" class="btn btn-primary">Start een scan</a>
		</section>
	{:else}
		<section class="summary">
			<div class="summary-card card has-data">
				<span class="icon">🔴</span>
				<div>
					<span class="count">{withPersonalData.length}</span>
					<span class="label">Met persoonsgegevens</span>
				</div>
			</div>
			<div class="summary-card card no-data">
				<span class="icon">🟢</span>
				<div>
					<span class="count">{withoutPersonalData.length}</span>
					<span class="label">Zonder persoonsgegevens</span>
				</div>
			</div>
		</section>

		{#if withPersonalData.length > 0}
			<section class="results-section">
				<h3>⚠️ Moeten mogelijk verwijderd worden</h3>
				<div class="company-list">
					{#each withPersonalData as company}
						<div class="company-card card">
							<div class="company-header">
								<h4>{company.name}</h4>
								<span class="badge badge-warning">
									{Math.round(company.confidence * 100)}% zeker
								</span>
							</div>
							<p class="company-domain">{company.domain}</p>
							<p class="company-emails">{company.emailCount} emails</p>
							<div class="data-types">
								{#each company.dataTypes as type}
									<span class="data-type">{type}</span>
								{/each}
							</div>
							<p class="summary">{company.summary}</p>
							<div class="actions">
								<button class="btn btn-secondary">
									📧 Bekijk emails
								</button>
								<button class="btn btn-primary">
									📝 AVG brief genereren
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if withoutPersonalData.length > 0}
			<section class="results-section">
				<h3>✅ Geen actie nodig</h3>
				<div class="company-list">
					{#each withoutPersonalData as company}
						<div class="company-card card safe">
							<div class="company-header">
								<h4>{company.name}</h4>
								<span class="badge badge-success">✓</span>
							</div>
							<p class="company-domain">{company.domain}</p>
							<p class="company-emails">{company.emailCount} emails</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.results {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.header h2 {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.scan-info {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
	}

	.empty-state p {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.summary {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.summary-card {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.summary-card .icon {
		font-size: 2rem;
	}

	.summary-card .count {
		display: block;
		font-size: 2rem;
		font-weight: 700;
	}

	.summary-card .label {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.results-section h3 {
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.company-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.company-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.company-card.safe {
		opacity: 0.7;
	}

	.company-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.company-header h4 {
		font-size: 1.1rem;
	}

	.company-domain {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.company-emails {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.data-types {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.data-type {
		padding: 0.2rem 0.5rem;
		background: rgba(239, 68, 68, 0.15);
		color: var(--danger);
		border-radius: 4px;
		font-size: 0.75rem;
	}

	.summary {
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-style: italic;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
</style>
