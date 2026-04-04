/**
 * AVG/GDPR Brief Generator Templates
 * Generates legally-themed deletion request letters in Dutch
 */

export interface UserData {
    fullName: string;
    address: string;
    email: string;
    postalCode?: string;
    city?: string;
    dateOfBirth?: string;
}

export interface CompanyData {
    companyName: string;
    companyAddress: string;
    kvkNumber?: string;
    email?: string;
}

export interface LetterOptions {
    includeDateOfBirth: boolean;
    includeAddress: boolean;
    requestType: 'deletion' | 'access' | 'portability' | 'objection';
}

/**
 * Format date to Dutch locale
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Generate the HTML letter for AVG/GDPR deletion request
 */
export function generateAVGLetterHtml(
    user: UserData,
    company: CompanyData,
    options: Partial<LetterOptions> = {}
): string {
    const today = formatDate(new Date());
    const opts: LetterOptions = {
        includeDateOfBirth: false,
        includeAddress: true,
        requestType: 'deletion',
        ...options
    };

    const userAddressLines = user.address ? user.address.split('\n') : [];
    const companyAddressLines = company.companyAddress ? company.companyAddress.split('\n') : [];

    let subject = '';
    let legalBasis = '';
    let requestText = '';

    switch (opts.requestType) {
        case 'deletion':
            subject = 'Verzoek tot verwijdering van persoonsgegevens (Art. 17 AVG)';
            legalBasis = 'Op grond van artikel 17 van de AVG heeft u het recht om gegevens te laten verwijderen.';
            requestText = 'verwijdering van alle persoonsgegevens die u van mij bewaart';
            break;
        case 'access':
            subject = 'Verzoek tot inzage in persoonsgegevens (Art. 15 AVG)';
            legalBasis = 'Op grond van artikel 15 van de AVG heb ik het recht op inzage in mijn gegevens.';
            requestText = 'inzage in alle persoonsgegevens die u van mij verwerkt';
            break;
        case 'portability':
            subject = 'Verzoek tot gegevensportabiliteit (Art. 20 AVG)';
            legalBasis = 'Op grond van artikel 20 van de AVG heb ik het recht op overdracht van mijn gegevens.';
            requestText = 'een kopie van alle persoonsgegevens in een gestructureerd formaat';
            break;
        case 'objection':
            subject = 'Verzoek tot bezwaar tegen gegevensverwerking (Art. 21 AVG)';
            legalBasis = 'Op grond van artikel 21 van de AVG kan ik bezwaar maken tegen verwerking.';
            requestText = 'stopzetting van de verwerking van mijn persoonsgegevens';
            break;
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Times New Roman', Georgia, serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        .header { text-align: right; margin-bottom: 60px; }
        .header p { margin-bottom: 5px; }
        .date { color: #666; }
        .recipient { margin-bottom: 40px; }
        .recipient p { margin-bottom: 3px; }
        .subject { font-weight: bold; margin-bottom: 30px; }
        .salutation { margin-bottom: 20px; }
        .body p { margin-bottom: 15px; text-align: justify; }
        .highlight { background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 3px solid #333; }
        .signature { margin-top: 50px; }
        .signature p { margin-bottom: 5px; }
        .footer { margin-top: 40px; font-size: 9pt; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
            body { padding: 20px; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
${userAddressLines.map(line => `        <p>${line}</p>`).join('\n')}
        <p>${user.email}</p>
        <p class="date">${today}</p>
    </div>

    <div class="recipient">
${companyAddressLines.map(line => `        <p>${line}</p>`).join('\n')}
        ${company.kvkNumber ? `<p>KvK: ${company.kvkNumber}</p>` : ''}
        ${company.email ? `<p>${company.email}</p>` : ''}
    </div>

    <div class="subject">
        <p><strong>Betreft: ${subject}</strong></p>
    </div>

    <div class="salutation">
        <p>Geachte heer/mevrouw,</p>
    </div>

    <div class="body">
        <p>Hierbij dien ik formeel een verzoek in op grond van de Algemene Verordening Gegevensbescherming (AVG).</p>

        <div class="highlight">
            <p><strong>Mijn identificatiegegevens:</strong></p>
            <p>Naam: ${user.fullName}</p>
            ${opts.includeAddress && user.address ? `<p>Adres: ${user.address}</p>` : ''}
            <p>E-mailadres: ${user.email}</p>
            ${opts.includeDateOfBirth && user.dateOfBirth ? `<p>Geboortedatum: ${user.dateOfBirth}</p>` : ''}
        </div>

        <p>${legalBasis}</p>

        <p>Ik verzoek u hierbij om:</p>
        <p><strong>${requestText}</strong></p>

        <p>Dit verzoek is van toepassing op alle persoonsgegevens die u van mij bewaart, inclusief maar niet beperkt tot:</p>
        <ul style="margin-left: 30px; margin-bottom: 15px;">
            <li>Mijn accountgegevens en profielinformatie</li>
            <li>Mijn e-mailcorrespondentie met uw organisatie</li>
            <li>Transactie- en betaalgegevens</li>
            <li>Gebruikshistorie en cookies</li>
            <li>Alle andere aan mij gelinkte gegevens</li>
        </ul>

        <p>Indien er een gegronde reden is om aan dit verzoek niet direct gevolg te geven, verzoek ik u mij hiervan binnen 30 dagen schriftelijk op de hoogte te brengen, met een duidelijke motivering conform artikel 12, lid 3 van de AVG.</p>

        <p>Ik wijs u erop dat u bij weigering van dit verzoek de mogelijkheid heeft om een klacht in te dienen bij de Autoriteit Persoonsgegevens (AP).</p>
    </div>

    <div class="signature">
        <p>Met vriendelijke groet,</p>
        <br><br>
        <p><strong>${user.fullName}</strong></p>
        ${user.postalCode && user.city ? `<p>${user.postalCode} ${user.city}</p>` : ''}
    </div>

    <div class="footer">
        <p>Dit brief is automatisch gegenereerd door Local GDPR Scanner. Bewaar een kopie voor uw eigen administratie.</p>
        <p>Generated: ${today}</p>
    </div>
</body>
</html>`;
}

/**
 * Generate plain text version
 */
export function generateAVGLetterText(
    user: UserData,
    company: CompanyData,
    options: Partial<LetterOptions> = {}
): string {
    const today = formatDate(new Date());
    const opts: LetterOptions = {
        includeDateOfBirth: false,
        includeAddress: true,
        requestType: 'deletion',
        ...options
    };

    let subject = '';
    switch (opts.requestType) {
        case 'deletion':
            subject = 'Verzoek tot verwijdering van persoonsgegevens (Art. 17 AVG)';
            break;
        case 'access':
            subject = 'Verzoek tot inzage in persoonsgegevens (Art. 15 AVG)';
            break;
        case 'portability':
            subject = 'Verzoek tot gegevensportabiliteit (Art. 20 AVG)';
            break;
        case 'objection':
            subject = 'Verzoek tot bezwaar tegen gegevensverwerking (Art. 21 AVG)';
            break;
    }

    return `${user.fullName}
${user.address}
${user.email}
${today}

Aan: ${company.companyName}
${company.companyAddress}
${company.kvkNumber ? 'KvK: ' + company.kvkNumber : ''}

Betreft: ${subject}

Geachte heer/mevrouw,

Hierbij dien ik formeel een verzoek in op grond van de Algemene Verordening Gegevensbescherming (AVG).

Mijn identificatiegegevens:
- Naam: ${user.fullName}
${opts.includeAddress && user.address ? '- Adres: ' + user.address + '\n' : ''}
- E-mailadres: ${user.email}
${opts.includeDateOfBirth && user.dateOfBirth ? '- Geboortedatum: ' + user.dateOfBirth + '\n' : ''}

Ik verzoek u om alle persoonsgegevens die u van mij bewaart te verwijderen.

Indien er een gegronde reden is om aan dit verzoek niet direct gevolg te geven, verzoek ik u mij hiervan binnen 30 dagen schriftelijk op de hoogte te brengen.

Met vriendelijke groet,

${user.fullName}
${user.postalCode && user.city ? user.postalCode + ' ' + user.city : ''}
`;
}

/**
 * Generate a simple company info object from email domain
 */
export function companyFromDomain(domain: string): CompanyData {
    const companyMap: Record<string, Partial<CompanyData>> = {
        'bol.com': { companyName: 'Bol.com B.V.', companyAddress: 'Papendorpseweg 100\n3528 BJ Utrecht' },
        'ing.nl': { companyName: 'ING Bank N.V.', companyAddress: 'Bijlmerplein 888\n1092 MA Amsterdam' },
        'rabobank.nl': { companyName: 'Rabobank', companyAddress: 'Croeselaan 18\n3521 CB Utrecht' },
        'coolblue.nl': { companyName: 'Coolblue B.V.', companyAddress: 'Printerweg 18\n3822 AD Amersfoort' },
        'amazon.nl': { companyName: 'Amazon EU S.a r.l.', companyAddress: '38 avenue John F. Kennedy\nL-1855 Luxembourg' },
        'mediamarkt.nl': { companyName: 'MediaMarkt Saturn Holding B.V.', companyAddress: 'Huizensestraat 1\n1274 HD Huizen' },
        'zalando.nl': { companyName: 'Zalando SE', companyAddress: 'Tamara-Danz-Strasse 10\n10243 Berlin, Germany' },
        'kpn.nl': { companyName: 'KPN N.V.', companyAddress: 'Wilhelminakade 123\n3072 AP Rotterdam' },
        'ziggo.nl': { companyName: 'Ziggo N.V.', companyAddress: 'Boompjes 168\n3011 XZ Rotterdam' },
        't-mobile.nl': { companyName: 'T-Mobile Netherlands B.V.', companyAddress: 'Willemstraat 400\n4811 BL Breda' },
        'linkedin.com': { companyName: 'LinkedIn Ireland Unlimited Company', companyAddress: 'Wilton Plaza\nWilton, Dublin 2, Ireland' },
        'spotify.com': { companyName: 'Spotify AB', companyAddress: 'Birger Jarlsgatan 64\n111 43 Stockholm, Sweden' },
        'netflix.com': { companyName: 'Netflix International B.V.', companyAddress: 'Vijfhuizenberg 100\n1082 HM Amsterdam' },
    };

    const normalized = domain.toLowerCase().replace(/^www\./, '');
    return companyMap[normalized] || {
        companyName: domain.charAt(0).toUpperCase() + domain.slice(1),
        companyAddress: '[Voeg bedrijfsadres toe]'
    };
}
