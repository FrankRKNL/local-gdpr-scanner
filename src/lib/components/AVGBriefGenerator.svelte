<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { generateAVGLetterHtml, generateAVGLetterText, companyFromDomain, type UserData, type CompanyData, type LetterOptions } from '$lib/templates/avgb-letter';
    import { appStore } from '$lib/stores/app';

    // Get query params
    const searchParams = $derived($page.url.searchParams);
    const companyNameParam = $derived(searchParams.get('company') || '');
    const companyDomainParam = $derived(searchParams.get('domain') || '');

    // Form state
    let userFullName = $state('');
    let userAddress = $state('');
    let userEmail = $state('');
    let userPostalCode = $state('');
    let userCity = $state('');
    let userDateOfBirth = $state('');

    let selectedCompany = $state(companyNameParam);
    let selectedDomain = $state(companyDomainParam);
    let customCompany = $state('');
    let customAddress = $state('');

    let requestType = $state<LetterOptions['requestType']>('deletion');
    let includeAddress = $state(true);
    let includeDateOfBirth = $state(false);

    let previewHtml = $state('');
    let showPreview = $state(false);

    // Get results from store
    const results = $derived(appStore.state.results);
    const companiesWithData = $derived(results.filter(r => r.hasPersonalData));

    // If company param is set, pre-fill company data
    $effect(() => {
        if (companyNameParam && companyDomainParam) {
            const info = companyFromDomain(companyDomainParam);
            customCompany = info.companyName;
            customAddress = info.companyAddress;
        }
    });

    function selectCompany(name: string, domain: string) {
        selectedCompany = name;
        selectedDomain = domain;
        const info = companyFromDomain(domain);
        customCompany = info.companyName;
        customAddress = info.companyAddress;
    }

    function generateLetter() {
        const user: UserData = {
            fullName: userFullName,
            address: userAddress,
            email: userEmail,
            postalCode: userPostalCode,
            city: userCity,
            dateOfBirth: userDateOfBirth || undefined
        };

        const company: CompanyData = {
            companyName: customCompany || selectedCompany,
            companyAddress: customAddress
        };

        const options: Partial<LetterOptions> = {
            includeAddress,
            includeDateOfBirth,
            requestType
        };

        previewHtml = generateAVGLetterHtml(user, company, options);
        showPreview = true;
    }

    function downloadHtml() {
        const blob = new Blob([previewHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avg-${requestType}-${selectedCompany || 'custom'}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadText() {
        const user: UserData = {
            fullName: userFullName,
            address: userAddress,
            email: userEmail,
            postalCode: userPostalCode,
            city: userCity
        };

        const company: CompanyData = {
            companyName: customCompany || selectedCompany,
            companyAddress: customAddress
        };

        const text = generateAVGLetterText(user, company, { requestType, includeAddress, includeDateOfBirth });
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avg-${requestType}-${selectedCompany || 'custom'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadPdf() {
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('PDF bibliotheek laden mislukt. Probeer HTML download.');
            return;
        }
        
        const doc = new jsPDF();
        
        let y = 20;
        const lineHeight = 7;
        
        doc.setFont('helvetica');
        
        // Header
        doc.setFontSize(16);
        doc.text('AVG Verwijderingsverzoek', 20, y);
        y += lineHeight * 2;
        
        // Date
        doc.setFontSize(10);
        doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 20, y);
        y += lineHeight * 2;
        
        // Company
        doc.setFontSize(11);
        doc.text(`Aan: ${customCompany || selectedCompany}`, 20, y);
        y += lineHeight;
        if (customAddress) {
            const addrLines = customAddress.split('\n');
            for (const line of addrLines) {
                doc.text(line, 20, y);
                y += lineHeight;
            }
        }
        y += lineHeight;
        
        // Subject
        doc.setFontSize(12);
        doc.text('Betreft: Verzoek tot verwijdering (Art. 17 AVG)', 20, y);
        y += lineHeight * 2;
        
        // Salutation
        doc.setFontSize(11);
        doc.text('Geachte heer/mevrouw,', 20, y);
        y += lineHeight * 2;
        
        // Body
        const bodyText = [
            'Hierbij dien ik formeel een verzoek in op grond van de AVG.',
            '',
            'Ik verzoek u alle persoonsgegevens te verwijderen.',
            '',
            'Indien er een gegronde reden is, verzoek ik u mij binnen 30 dagen te informeren.',
            '',
            'Bij weigering kan ik een klacht indienen bij de AP.',
        ];
        
        for (const line of bodyText) {
            doc.text(line, 20, y);
            y += lineHeight;
        }
        
        y += lineHeight;
        doc.text('Met vriendelijke groet,', 20, y);
        y += lineHeight * 2;
        doc.text(userFullName || '[Uw naam]', 20, y);
        
        doc.save(`avg-verwijderingsverzoek-${(customCompany || selectedCompany || 'custom').replace(/\s+/g, '-')}.pdf`);
    }
    
    function printLetter() {
        const printWindow = window.open('', '_blank');
        if (printWindow && previewHtml) {
            printWindow.document.write(previewHtml);
            printWindow.document.close();
            printWindow.print();
        }
    }
</script>

<div class="generator">
    <h2>AVG Brief Generator</h2>
    <p class="subtitle">Genereer een GDPR verwijderingsverzoek in 30 seconden</p>

    {#if companiesWithData.length > 0}
        <section class="company-select card">
            <h3>Selecteer een bedrijf uit uw scan</h3>
            <div class="company-list">
                {#each companiesWithData as company}
                    <button
                        class="company-btn"
                        class:active={selectedCompany === company.name}
                        onclick={() => selectCompany(company.name, company.domain)}
                    >
                        <span class="name">{company.name}</span>
                        <span class="data-types">{company.dataTypes.join(', ')}</span>
                    </button>
                {/each}
            </div>
        </section>
    {/if}

    <section class="user-form card">
        <h3>Uw Gegevens</h3>
        <p class="help">Deze gegevens worden in de brief opgenomen</p>

        <div class="form-grid">
            <div class="form-group full">
                <label for="fullName">Volledige naam *</label>
                <input id="fullName" type="text" bind:value={userFullName} placeholder="Jan de Vries" required />
            </div>

            <div class="form-group full">
                <label for="address">Adres *</label>
                <textarea id="address" bind:value={userAddress} placeholder="Straatnaam 123&#10;1234 AB Stad" rows="2"></textarea>
            </div>

            <div class="form-group">
                <label for="postalCode">Postcode</label>
                <input id="postalCode" type="text" bind:value={userPostalCode} placeholder="1234 AB" />
            </div>

            <div class="form-group">
                <label for="city">Plaats</label>
                <input id="city" type="text" bind:value={userCity} placeholder="Amsterdam" />
            </div>

            <div class="form-group">
                <label for="email">E-mailadres *</label>
                <input id="email" type="email" bind:value={userEmail} placeholder="jan@example.com" required />
            </div>

            <div class="form-group">
                <label for="dob">
                    <input id="dob" type="checkbox" bind:checked={includeDateOfBirth} />
                    Geboortedatum toevoegen
                </label>
                {#if includeDateOfBirth}
                    <input id="dateOfBirth" type="date" bind:value={userDateOfBirth} />
                {/if}
            </div>
        </div>
    </section>

    <section class="company-form card">
        <h3>Bedrijfsgegevens</h3>

        <div class="form-grid">
            <div class="form-group full">
                <label for="companyName">Bedrijfsnaam *</label>
                <input id="companyName" type="text" bind:value={customCompany} placeholder="Bol.com" required />
            </div>

            <div class="form-group full">
                <label for="companyAddress">Bedrijfsadres *</label>
                <textarea id="companyAddress" bind:value={customAddress} placeholder="Straatnaam 1&#10;1234 AB Stad" rows="2"></textarea>
            </div>
        </div>

        <div class="options">
            <h4>Type verzoek</h4>
            <div class="radio-group">
                <label class="radio">
                    <input type="radio" bind:group={requestType} value="deletion" />
                    <span>Verwijdering (Art. 17)</span>
                </label>
                <label class="radio">
                    <input type="radio" bind:group={requestType} value="access" />
                    <span>Inzage (Art. 15)</span>
                </label>
                <label class="radio">
                    <input type="radio" bind:group={requestType} value="portability" />
                    <span>Portabiliteit (Art. 20)</span>
                </label>
                <label class="radio">
                    <input type="radio" bind:group={requestType} value="objection" />
                    <span>Bezwaar (Art. 21)</span>
                </label>
            </div>
        </div>
    </section>

    <section class="actions">
        <button class="btn btn-primary" onclick={generateLetter} disabled={!userFullName || !userEmail || !customCompany}>
            📄 Brief Genereren
        </button>

        {#if showPreview}
            <div class="preview-actions">
                <button class="btn btn-secondary" onclick={downloadPdf}>
                    📄 Download PDF
                </button>
                <button class="btn btn-secondary" onclick={downloadHtml}>
                    📥 Download HTML
                </button>
                <button class="btn btn-secondary" onclick={downloadText}>
                    📥 Download TXT
                </button>
                <button class="btn btn-secondary" onclick={printLetter}>
                    🖨️ Afdrukken
                </button>
            </div>
        {/if}
    </section>

    {#if showPreview && previewHtml}
        <section class="preview card">
            <h3>Voorbeeld</h3>
            <div class="preview-frame">
                <iframe srcdoc={previewHtml} title="Brief preview"></iframe>
            </div>
        </section>
    {/if}
</div>

<style>
    .generator {
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
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 1.1rem;
        margin-bottom: 1rem;
    }

    .help {
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin-top: -0.5rem;
        margin-bottom: 1rem;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .form-group.full {
        grid-column: 1 / -1;
    }

    .form-group label {
        display: block;
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
    }

    .form-group input[type="text"],
    .form-group input[type="email"],
    .form-group input[type="date"],
    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        font-size: 1rem;
    }

    .form-group textarea {
        resize: vertical;
        font-family: inherit;
    }

    .company-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .company-btn {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--surface-hover);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .company-btn:hover {
        border-color: var(--primary);
    }

    .company-btn.active {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
    }

    .company-btn .name {
        font-weight: 500;
    }

    .company-btn .data-types {
        font-size: 0.75rem;
        opacity: 0.7;
    }

    .options h4 {
        font-size: 0.9rem;
        margin-bottom: 0.75rem;
    }

    .radio-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }

    .radio {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--surface-hover);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .radio input {
        accent-color: var(--primary);
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
    }

    .preview-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .preview {
        margin-top: 1rem;
    }

    .preview h3 {
        margin-bottom: 1rem;
    }

    .preview-frame {
        width: 100%;
        height: 500px;
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
    }

    .preview-frame iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    @media (max-width: 600px) {
        .form-grid {
            grid-template-columns: 1fr;
        }

        .radio-group {
            grid-template-columns: 1fr;
        }
    }
</style>
