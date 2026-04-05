<script lang="ts">
	import { appStore, type CompanyResult } from '$lib/stores/app';

	const results = $derived(appStore.state.results);
	const totalEmails = $derived(appStore.state.totalEmails);
	const scannedAt = $derived(appStore.state.scannedAt);

	const withPersonalData = $derived(results.filter(r => r.hasPersonalData));
	const withoutPersonalData = $derived(results.filter(r => !r.hasPersonalData));

	// Selection state
	let selectedCompanies = $state<Set<string>>(new Set());
	let handledCompanies = $state<Set<string>>(new Set());
	let filterType = $state<string>('all');

	// Load handled state from localStorage
	function loadHandled() {
		try {
			const stored = localStorage.getItem('gdpr-handled');
			if (stored) {
				handledCompanies = new Set(JSON.parse(stored));
			}
		} catch (e) {}
	}

	function saveHandled() {
		localStorage.setItem('gdpr-handled', JSON.stringify([...handledCompanies]));
	}

	function toggleSelect(companyName: string) {
		if (selectedCompanies.has(companyName)) {
			selectedCompanies.delete(companyName);
		} else {
			selectedCompanies.add(companyName);
		}
		selectedCompanies = new Set(selectedCompanies);
	}

	function selectAll() {
		selectedCompanies = new Set(withPersonalData.map(c => c.name));
	}

	function deselectAll() {
		selectedCompanies = new Set();
	}

	function markAsHandled(companyName: string) {
		handledCompanies.add(companyName);
		handledCompanies = new Set(handledCompanies);
		saveHandled();
	}

	function generateBatchLetters() {
		const selected = withPersonalData.filter(c => selectedCompanies.has(c.name));
		if (selected.length === 0) return;

		// Generate letters for each selected company
		// Navigate to first company, then user can continue
		const first = selected[0];
		window.location.href = `/tools/avg-brief?company=${encodeURIComponent(first.name)}&domain=${encodeURIComponent(first.domain)}&batch=${encodeURIComponent(selected.map(c => c.name).join(','))}`;
	}

	// Filter by data type
	const dataTypes = $derived([
		'all',
		...new Set(withPersonalData.flatMap(c => c.dataTypes))
	]);

	const filteredWithPersonalData = $derived(
		filterType === 'all' 
			? withPersonalData 
			: withPersonalData.filter(c => c.dataTypes.includes(filterType))
	);

	// Init
	loadHandled();
</script>

<div class="results">
	<section class="header">
		<h2>Scan Resultaten</h2>
		{#if scannedAt}
			<p class="scan-info">
				{totalEmails} emails gescand • {scannedAt.toLocaleDateString('nl-NL')}
				{scannedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
			</p>
		{/if}
	</section>

	{#if results.length === 0}
		<section class="empty-state card">
			<p>Nog geen scan uitgevoerd.</p>
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
				<div class="section-header">
					<h3>⚠️ Moeten mogelijk verwijderd worden</h3>
					
					<div class="batch-actions">
						<span class="selection-count">
							{selectedCompanies.size} geselecteerd
						</span>
						<button class="btn btn-sm" onclick={selectAll}>Alles selecteren</button>
						<button class="btn btn-sm" onclick={deselectAll}>Deselecteren</button>
						{#if selectedCompanies.size > 0}
							<button class="btn btn-primary btn-sm" onclick={generateBatchLetters}>
								📝 Brieven genereren ({selectedCompanies.size})
							</button>
						{/if}
					</div>
				</div>

				<div class="filters">
					<label class="filter-label">
						Filter by type:
						<select bind:value={filterType} class="filter-select">
							{#each dataTypes as type}
								<option value={type}>
									{type === 'all' ? 'Alle types' : type}
								</option>
							{/each}
						</select>
					</label>
				</div>

				<div class="company-list">
					{#each filteredWithPersonalData as company}
						<div class="company-card card" class:handled={handledCompanies.has(company.name)}>
							<div class="company-select">
								<input 
									type="checkbox" 
									checked={selectedCompanies.has(company.name)}
									onchange={() => toggleSelect(company.name)}
								/>
							</div>
							<div class="company-content">
								<div class="company-header">
									<div class="company-title">
										<h4>{company.name}</h4>
										{#if handledCompanies.has(company.name)}
											<span class="handled-badge">✓ Verwerkt</span>
										{/if}
									</div>
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
									<button class="btn btn-secondary btn-sm">
										📧 Bekijk emails
									</button>
									<a href="/tools/avg-brief?company={encodeURIComponent(company.name)}&domain={encodeURIComponent(company.domain)}" class="btn btn-primary btn-sm">
										📝 AVG brief
									</a>
									{#if !handledCompanies.has(company.name)}
										<button 
											class="btn btn-success btn-sm"
											onclick={() => markAsHandled(company.name)}
										>
											✓ Markeer als verwerkt
										</button>
									{/if}
								</div>
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

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.section-header h3 {
		font-size: 1.1rem;
	}

	.batch-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.selection-count {
		font-size: 0.85rem;
		color: var(--text-secondary);
		min-width: 100px;
	}

	.filters {
		margin-bottom: 1rem;
	}

	.filter-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
		font-size: 0.85rem;
	}

	.company-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.company-card {
		display: flex;
		gap: 1rem;
		transition: opacity 0.2s;
	}

	.company-card.handled {
		opacity: 0.6;
		border-left: 3px solid var(--success);
	}

	.company-select {
		display: flex;
		align-items: flex-start;
		padding-top: 0.25rem;
	}

	.company-select input[type="checkbox"] {
		width: 18px;
		height: 18px;
		accent-color: var(--primary);
		cursor: pointer;
	}

	.company-content {
		flex: 1;
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
		align-items: flex-start;
	}

	.company-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.company-title h4 {
		font-size: 1.1rem;
	}

	.handled-badge {
		background: var(--success);
		color: white;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
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

	p.summary {
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-style: italic;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-sm {
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
	}

	.results-section h3 {
		margin-bottom: 0.5rem;
		font-size: 1.1rem;
	}

	:root {
		--success: #22c55e;
	}
</style>
