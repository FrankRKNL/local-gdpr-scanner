<script lang="ts">
    import { appStore } from '$lib/stores/app';

    const results = $derived(appStore.state.results);
    const totalEmails = $derived(appStore.state.totalEmails);
    const scannedAt = $derived(appStore.state.scannedAt);

    const companiesWithData = $derived(results.filter(r => r.hasPersonalData));
    const companiesWithout = $derived(results.filter(r => !r.hasPersonalData));

    // Count data types
    const dataTypeCounts = $derived.by(() => {
        const counts: Record<string, number> = {};
        for (const r of companiesWithData) {
            for (const dt of r.dataTypes) {
                counts[dt] = (counts[dt] || 0) + 1;
            }
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    });

    // Top companies by email count
    const topCompanies = $derived.by(() =>
        [...results].sort((a, b) => b.emailCount - a.emailCount).slice(0, 5)
    );

    function formatDate(date: Date | null): string {
        if (!date) return 'Nog niet gescand';
        return date.toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<div class="dashboard">
    <h2>Privacy Dashboard</h2>
    <p class="subtitle">Overzicht van uw GDPR scan resultaten</p>

    {#if results.length === 0}
        <section class="empty-state card">
            <p>Nog geen scan uitgevoerd.</p>
            <a href="/" class="btn btn-primary">Start een scan</a>
        </section>
    {:else}
        <section class="stats-grid">
            <div class="stat-card card primary">
                <span class="icon">📧</span>
                <div class="stat-content">
                    <span class="value">{totalEmails}</span>
                    <span class="label">Emails gescand</span>
                </div>
            </div>

            <div class="stat-card card success">
                <span class="icon">🏢</span>
                <div class="stat-content">
                    <span class="value">{results.length}</span>
                    <span class="label">Bedrijven</span>
                </div>
            </div>

            <div class="stat-card card danger">
                <span class="icon">⚠️</span>
                <div class="stat-content">
                    <span class="value">{companiesWithData.length}</span>
                    <span class="label">Met persoonsgegevens</span>
                </div>
            </div>

            <div class="stat-card card">
                <span class="icon">✅</span>
                <div class="stat-content">
                    <span class="value">{companiesWithout.length}</span>
                    <span class="label">Veilig</span>
                </div>
            </div>
        </section>

        <section class="details-grid">
            <div class="card">
                <h3>Data Types Gevonden</h3>
                <div class="data-types">
                    {#each dataTypeCounts as [type, count]}
                        <div class="data-type-row">
                            <span class="type-name">{type}</span>
                            <span class="type-count">{count}</span>
                            <div class="type-bar">
                                <div class="type-fill" style="width: {(count / companiesWithData.length * 100)}%"></div>
                            </div>
                        </div>
                    {:else}
                        <p class="empty">Geen persoonsgegevens gevonden</p>
                    {/each}
                </div>
            </div>

            <div class="card">
                <h3>Top Bedrijven</h3>
                <div class="top-companies">
                    {#each topCompanies as company, i}
                        <div class="company-row">
                            <span class="rank">{i + 1}</span>
                            <span class="company-name">{company.name}</span>
                            <span class="company-count">{company.emailCount}</span>
                            {#if company.hasPersonalData}
                                <span class="badge badge-danger">!</span>
                            {:else}
                                <span class="badge badge-success">✓</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </section>

        <section class="scan-info card">
            <p>Laatste scan: <strong>{formatDate(scannedAt)}</strong></p>
            <div class="scan-actions">
                <a href="/" class="btn btn-secondary">Nieuwe scan</a>
                <a href="/results" class="btn btn-secondary">Bekijk details</a>
            </div>
        </section>
    {/if}
</div>

<style>
    .dashboard {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    h2 {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
    }

    .subtitle {
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
    }

    .empty-state {
        text-align: center;
        padding: 4rem;
    }

    .empty-state p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
    }

    .stat-card .icon {
        font-size: 2rem;
    }

    .stat-card .value {
        display: block;
        font-size: 2rem;
        font-weight: 700;
    }

    .stat-card .label {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .stat-card.primary {
        background: linear-gradient(135deg, var(--primary), #4f46e5);
        color: white;
    }

    .stat-card.primary .label {
        color: rgba(255, 255, 255, 0.8);
    }

    .stat-card.success {
        background: linear-gradient(135deg, var(--success), #16a34a);
        color: white;
    }

    .stat-card.success .label {
        color: rgba(255, 255, 255, 0.8);
    }

    .stat-card.danger {
        background: linear-gradient(135deg, var(--danger), #dc2626);
        color: white;
    }

    .stat-card.danger .label {
        color: rgba(255, 255, 255, 0.8);
    }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .card h3 {
        font-size: 1.1rem;
        margin-bottom: 1rem;
    }

    .data-types {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .data-type-row {
        display: grid;
        grid-template-columns: 1fr auto 100px;
        gap: 0.75rem;
        align-items: center;
    }

    .type-name {
        font-size: 0.9rem;
    }

    .type-count {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .type-bar {
        height: 8px;
        background: var(--bg);
        border-radius: 4px;
        overflow: hidden;
    }

    .type-fill {
        height: 100%;
        background: var(--danger);
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .top-companies {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .company-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
        background: var(--bg);
        border-radius: 6px;
    }

    .rank {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-hover);
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .company-name {
        flex: 1;
        font-size: 0.9rem;
    }

    .company-count {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .scan-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .scan-info p {
        color: var(--text-secondary);
    }

    .scan-actions {
        display: flex;
        gap: 0.75rem;
    }

    .empty {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    @media (max-width: 900px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .details-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
