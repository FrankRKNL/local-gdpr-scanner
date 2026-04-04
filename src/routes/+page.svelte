<script lang="ts">
	import { onMount } from 'svelte';
	import { aiService, type AIResult } from '$lib/services/ai';
	import { emailService, generateMockEmails, type Email } from '$lib/services/email';
	import { appStore } from '$lib/stores/app';

	let emails: Email[] = $state([]);
	let isScanning = $state(false);
	let scanProgress = $state(0);
	let aiReady = $state(false);
	let aiDevice = $state('loading...');
	let selectedProvider = $state<'gmail' | 'outlook' | 'imap'>('gmail');

	// IMAP config
	let imapServer = $state('');
	let imapPort = $state(993);
	let imapUsername = $state('');
	let imapPassword = $state('');
	let useTls = $state(true);

	onMount(async () => {
		// Initialize AI
		aiService.onLoadingProgress((progress, status) => {
			console.log(`[AI] ${progress}% - ${status}`);
			aiDevice = status;
		});

		const ok = await aiService.init();
		aiReady = ok;
		aiDevice = aiService.getDevice();
	});

	async function startScan() {
		isScanning = true;
		scanProgress = 0;
		emails = [];

		try {
			// For demo: use mock data
			// In production: use emailService to connect via IMAP/OAuth
			emails = generateMockEmails(20);
			scanProgress = 30;

			// Group by company
			const companies = emailService.groupByCompany(emails);
			scanProgress = 50;

			// Analyze each company with local AI
			const results: AIResult[] = [];
			const companyEntries = Array.from(companies.entries());
			const total = companyEntries.length;

			for (let i = 0; i < companyEntries.length; i++) {
				const [companyName, companyEmails] = companyEntries[i];
				const result = await aiService.analyzeCompany(
					companyName,
					companyEmails.map(e => ({ subject: e.subject, body: e.body }))
				);
				results.push(result);
				scanProgress = 50 + Math.round((i / total) * 50);
			}

			// Store results
			appStore.setResults(companies, results);
			scanProgress = 100;

		} catch (error) {
			console.error('Scan failed:', error);
		} finally {
			isScanning = false;
		}
	}

	async function connectImap() {
		const ok = await emailService.connect({
			host: imapServer,
			port: imapPort,
			username: imapUsername,
			password: imapPassword,
			secure: useTls
		});
		if (ok) {
			startScan();
		}
	}
</script>

<div class="scanner">
	<section class="hero">
		<h2>🔒 Scan uw emails op GDPR-persoonsgegevens</h2>
		<p>100% lokaal. Geen data verlaat uw apparaat.</p>
	</section>

	<section class="ai-status card">
		<div class="status-row">
			<span class="label">Lokale AI:</span>
			{#if aiReady}
				<span class="badge badge-success">✓ Geladen</span>
			{:else}
				<span class="badge badge-warning">⏳ Laden...</span>
			{/if}
			<span class="device">{aiDevice}</span>
		</div>
	</section>

	<section class="provider-select card">
		<h3>Email Provider</h3>
		<div class="provider-buttons">
			<button
				class="provider-btn"
				class:active={selectedProvider === 'gmail'}
				onclick={() => selectedProvider = 'gmail'}
			>
				Gmail
			</button>
			<button
				class="provider-btn"
				class:active={selectedProvider === 'outlook'}
				onclick={() => selectedProvider = 'outlook'}
			>
				Outlook
			</button>
			<button
				class="provider-btn"
				class:active={selectedProvider === 'imap'}
				onclick={() => selectedProvider = 'imap'}
			>
				IMAP (Anders)
			</button>
		</div>

		{#if selectedProvider === 'gmail' || selectedProvider === 'outlook'}
			<button class="btn btn-primary oauth-btn" onclick={() => window.location.href = '/auth/' + selectedProvider}>
				🔐 Verbinden met {selectedProvider === 'gmail' ? 'Google' : 'Microsoft'}
			</button>
			<p class="oauth-note">
				OAuth is veilig - uw wachtwoord wordt nooit opgeslagen.
			</p>
		{:else}
			<div class="imap-form">
				<div class="form-group">
					<label for="server">IMAP Server</label>
					<input id="server" type="text" bind:value={imapServer} placeholder="imap.example.com" />
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="port">Poort</label>
						<input id="port" type="number" bind:value={imapPort} placeholder="993" />
					</div>
					<div class="form-group">
						<label for="tls">
							<input id="tls" type="checkbox" bind:checked={useTls} />
							TLS/SSL
						</label>
					</div>
				</div>
				<div class="form-group">
					<label for="username">Emailadres</label>
					<input id="username" type="email" bind:value={imapUsername} placeholder="u@example.com" />
				</div>
				<div class="form-group">
					<label for="password">Wachtwoord</label>
					<input id="password" type="password" bind:value={imapPassword} />
				</div>
				<button class="btn btn-primary" onclick={connectImap} disabled={isScanning}>
					Verbinden & Scannen
				</button>
			</div>
		{/if}
	</section>

	<section class="demo-section card">
		<h3>Of probeer met demo data</h3>
		<button class="btn btn-secondary" onclick={startScan} disabled={isScanning || !aiReady}>
			{isScanning ? 'Scannen...' : 'Start Demo Scan'}
		</button>
	</section>

	{#if isScanning}
		<section class="progress-section card">
			<h3>Scannen in progress...</h3>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {scanProgress}%"></div>
			</div>
			<p>{scanProgress}%</p>
		</section>
	{/if}

	{#if emails.length > 0}
		<section class="results-preview">
			<h3>Gevonden: {emails.length} emails van {new Set(emails.map(e => e.from)).size} bedrijven</h3>
			<a href="/results" class="btn btn-primary">Bekijk alle resultaten →</a>
		</section>
	{/if}
</div>

<style>
	.scanner {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.hero {
		text-align: center;
		padding: 2rem 0;
	}

	.hero h2 {
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
	}

	.hero p {
		color: var(--text-secondary);
	}

	.ai-status .status-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.ai-status .label {
		font-weight: 500;
	}

	.ai-status .device {
		color: var(--text-secondary);
		font-size: 0.85rem;
		margin-left: auto;
	}

	.provider-select h3 {
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.provider-buttons {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.provider-btn {
		flex: 1;
		padding: 0.75rem;
		background: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text-secondary);
		transition: all 0.2s;
	}

	.provider-btn:hover {
		border-color: var(--primary);
	}

	.provider-btn.active {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.oauth-btn {
		width: 100%;
		justify-content: center;
		padding: 1rem;
		font-size: 1rem;
	}

	.oauth-note {
		margin-top: 0.75rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-align: center;
	}

	.imap-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.form-group label {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.form-group input[type="text"],
	.form-group input[type="email"],
	.form-group input[type="password"],
	.form-group input[type="number"] {
		padding: 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
	}

	.form-row {
		display: flex;
		gap: 1rem;
	}

	.demo-section {
		text-align: center;
	}

	.demo-section h3 {
		margin-bottom: 1rem;
		color: var(--text-secondary);
	}

	.progress-section h3 {
		margin-bottom: 1rem;
	}

	.progress-bar {
		height: 8px;
		background: var(--bg);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: var(--primary);
		transition: width 0.3s ease;
	}

	.results-preview {
		text-align: center;
		padding: 1.5rem;
		background: var(--surface);
		border: 1px solid var(--success);
		border-radius: 12px;
	}

	.results-preview h3 {
		margin-bottom: 1rem;
	}
</style>
