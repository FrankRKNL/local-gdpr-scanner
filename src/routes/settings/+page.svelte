<script lang="ts">
    import { appStore } from '$lib/stores/app';
    import { aiService } from '$lib/services/ai';

    const settings = $derived(appStore.state.settings);

    // Theme state (currently only dark supported)
    let currentTheme = $state('dark');

    // Language options
    const languages = [
        { code: 'nl', name: 'Nederlands' },
        { code: 'en', name: 'English' },
        { code: 'de', name: 'Deutsch' },
    ];

    // AI mode options
    const aiModes = [
        { value: 'local', label: 'Alleen lokaal (Qwen 3.5)', description: '100% privaat, geen internet' },
        { value: 'hybrid', label: 'Hybrid (Qwen + GLM-5.1)', description: 'Snel lokaal, cloud fallback' },
        { value: 'cloud', label: 'Alleen cloud (GLM-5.1)', description: 'Snelste resultaten, vereist internet' },
    ];

    // Scan history
    interface ScanHistoryEntry {
        id: string;
        date: Date;
        companyCount: number;
        emailCount: number;
        flaggedCount: number;
    }

    let scanHistory = $state<ScanHistoryEntry[]>([]);

    // Load scan history from localStorage
    function loadHistory() {
        try {
            const stored = localStorage.getItem('gdpr-scan-history');
            if (stored) {
                const parsed = JSON.parse(stored);
                scanHistory = parsed.map((e: any) => ({
                    ...e,
                    date: new Date(e.date),
                }));
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }

    // Save scan history to localStorage
    function saveHistory(entry: Omit<ScanHistoryEntry, 'id'>) {
        const newEntry: ScanHistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
        };
        scanHistory = [newEntry, ...scanHistory].slice(0, 10); // Keep last 10
        localStorage.setItem('gdpr-scan-history', JSON.stringify(scanHistory));
    }

    // Data export
    function exportResults() {
        const data = {
            exportedAt: new Date().toISOString(),
            results: appStore.state.results,
            totalEmails: appStore.state.totalEmails,
            scannedAt: appStore.state.scannedAt,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gdpr-scan-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportAsCsv() {
        const results = appStore.state.results;
        if (results.length === 0) return;

        // CSV header
        let csv = 'Bedrijf,Domein,Aantal Emails,Persoonsgegevens,Datatypes,Zekerheid%\n';

        // CSV rows
        for (const r of results) {
            csv += `"${r.name}","${r.domain}",${r.emailCount},${r.hasPersonalData ? 'Ja' : 'Nee'}","${r.dataTypes.join('; ')}",${Math.round(r.confidence * 100)}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gdpr-scan-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function clearHistory() {
        scanHistory = [];
        localStorage.removeItem('gdpr-scan-history');
    }

    // Init
    loadHistory();
</script>

<div class="settings">
    <h2>Instellingen</h2>

    <section class="settings-section card">
        <h3>AI Model</h3>
        <p class="description">
            Kies hoe uw emails geanalyseerd worden.
        </p>
        
        <div class="ai-mode-selector">
            {#each aiModes as mode}
                <label class="ai-mode-option" class:selected={settings.aiProvider === mode.value}>
                    <input 
                        type="radio" 
                        name="aiMode" 
                        value={mode.value}
                        bind:group={settings.aiProvider}
                    />
                    <div class="mode-content">
                        <span class="mode-label">{mode.label}</span>
                        <span class="mode-desc">{mode.description}</span>
                    </div>
                </label>
            {/each}
        </div>

        <div class="info-grid">
            <div class="info-row">
                <span>Lokaal model</span>
                <span class="badge badge-success">Qwen 3.5 0.8B</span>
            </div>
            <div class="info-row">
                <span>Cloud model</span>
                <span class="badge badge-info">GLM-5.1 (Z.AI)</span>
            </div>
            <div class="info-row">
                <span>Locatie</span>
                <span>{settings.aiProvider === 'local' ? 'Alleen lokaal' : settings.aiProvider === 'cloud' ? 'Alleen cloud' : 'Hybrid (lokaal + cloud)'}</span>
            </div>
        </div>
    </section>

    <section class="settings-section card">
        <h3>Scan Geschiedenis</h3>
        <p class="description">
            Uw recente scans worden hier opgeslagen.
        </p>
        
        {#if scanHistory.length > 0}
            <div class="history-list">
                {#each scanHistory as entry}
                    <div class="history-item">
                        <div class="history-date">
                            {entry.date.toLocaleDateString('nl-NL')}
                            <span class="history-time">{entry.date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="history-stats">
                            <span>{entry.companyCount} bedrijven</span>
                            <span class="divider">•</span>
                            <span>{entry.emailCount} emails</span>
                            <span class="divider">•</span>
                            <span class="flagged">{entry.flaggedCount} gevlagd</span>
                        </div>
                    </div>
                {/each}
            </div>
            <button class="btn btn-secondary" onclick={clearHistory}>
                Geschiedenis wissen
            </button>
        {:else}
            <p class="empty-history">Nog geen scans uitgevoerd.</p>
        {/if}
    </section>

    <section class="settings-section card">
        <h3>Taal</h3>
        <p class="description">
            Selecteer de taal voor de interface.
        </p>
        <select bind:value={settings.language} class="select">
            {#each languages as lang}
                <option value={lang.code}>{lang.name}</option>
            {/each}
        </select>
    </section>

    <section class="settings-section card">
        <h3>Data Beheer</h3>
        <p class="description">
            Exporteer of verwijder uw scan resultaten.
        </p>

        <div class="export-buttons">
            <button class="btn btn-secondary" onclick={exportResults}>
                📥 Exporteer als JSON
            </button>
            <button class="btn btn-secondary" onclick={exportAsCsv}>
                📊 Exporteer als CSV
            </button>
        </div>

        <div class="divider"></div>

        <button class="btn btn-danger" onclick={() => appStore.clearResults()}>
            Verwijder alle resultaten
        </button>
    </section>

    <section class="settings-section card">
        <h3>Privacy</h3>
        <div class="privacy-list">
            <div class="privacy-item">
                <span class="icon">🔒</span>
                <div>
                    <strong>Emails</strong>
                    <p>Worden alleen lokaal verwerkt</p>
                </div>
            </div>
            <div class="privacy-item">
                <span class="icon">🤖</span>
                <div>
                    <strong>AI Analyse</strong>
                    <p>Gebeurt op uw eigen apparaat</p>
                </div>
            </div>
            <div class="privacy-item">
                <span class="icon">☁️</span>
                <div>
                    <strong>Cloud</strong>
                    <p>Geen gegevens verlaten uw machine</p>
                </div>
            </div>
            <div class="privacy-item">
                <span class="icon">🔑</span>
                <div>
                    <strong>Wachtwoorden</strong>
                    <p>Worden nooit opgeslagen</p>
                </div>
            </div>
        </div>
    </section>

    <section class="settings-section card">
        <h3>Over</h3>
        <div class="about-info">
            <p><strong>Local GDPR Scanner</strong></p>
            <p class="version">Versie 0.1.0</p>
            <p class="description">
                Een privacy-first desktop applicatie voor het scannen van uw email op GDPR-persoonsgegevens.
            </p>
            <div class="tech-stack">
                <span class="tech-badge">Tauri v2</span>
                <span class="tech-badge">SvelteKit 5</span>
                <span class="tech-badge">Qwen 3.5</span>
                <span class="tech-badge">Rust</span>
            </div>
            <p class="description">
                100% lokaal • Open source • Geen tracking
            </p>
        </div>
    </section>
</div>

<style>
    .settings {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-width: 700px;
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

    .info-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
    }

    .info-row:last-child {
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

    .export-buttons {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .divider {
        height: 1px;
        background: var(--border);
        margin: 1.5rem 0;
    }

    .privacy-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .privacy-item {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
    }

    .privacy-item .icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .privacy-item strong {
        display: block;
        margin-bottom: 0.25rem;
    }

    .privacy-item p {
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin: 0;
    }

    .about-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .version {
        color: var(--text-secondary);
        font-size: 0.85rem;
    }

    .tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.75rem 0;
    }

    .tech-badge {
        padding: 0.25rem 0.75rem;
        background: var(--surface-hover);
        border-radius: 9999px;
        font-size: 0.75rem;
    }

    .btn-danger {
        background: var(--danger);
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        cursor: pointer;
        width: 100%;
    }

    .btn-danger:hover {
        opacity: 0.9;
    }
</style>
