/**
 * Email Service
 * Handles email fetching and grouping by company
 * In production: uses Tauri backend (Rust IMAP)
 * For demo: uses mock data
 */

import { invoke } from '@tauri-apps/api/core';

export interface Email {
	id: string;
	from: string;
	fromName: string | null;
	to: string;
	subject: string;
	date: Date;
	body: string;
	hasAttachments: boolean;
	companyId?: string;
	emailType?: EmailType;
}

export interface CompanyEmailSummary {
	companyName: string;
	domain: string;
	category: CompanyCategory;
	totalEmails: number;
	emailTypes: Record<EmailType, number>;
	latestEmail: Date;
	hasPersonalData: boolean;
}

export interface IMAPConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	secure: boolean;
}

export type CompanyCategory =
	| 'ecommerce'
	| 'newsletter'
	| 'banking'
	| 'social'
	| 'telecom'
	| 'retail'
	| 'travel'
	| 'entertainment'
	| 'tech'
	| 'other';

export type EmailType = 'transactional' | 'promotional' | 'newsletter' | 'notification';

// Email type detection
export function detectEmailType(subject: string, body: string): EmailType {
	const text = `${subject} ${body}`.toLowerCase();

	// Transactional indicators
	if (
		text.includes('factuur') ||
		text.includes('orderbevestiging') ||
		text.includes('bestelling') ||
		text.includes('verzonden') ||
		text.includes('levering') ||
		text.includes('betaling') ||
		text.includes('account') ||
		text.includes('wachtwoord')
	) {
		return 'transactional';
	}

	// Promotional indicators
	if (
		text.includes('korting') ||
		text.includes('aanbieding') ||
		text.includes('sale') ||
		text.includes('nu kopen') ||
		text.includes('gratis') ||
		text.includes('speciaal voor u') ||
		text.includes('bonus')
	) {
		return 'promotional';
	}

	// Newsletter indicators
	if (
		text.includes('nieuwsbrief') ||
		text.includes('wekelijkse update') ||
		text.includes('maandelijkse') ||
		text.includes('nieuws van')
	) {
		return 'newsletter';
	}

	// Notification indicators
	if (
		text.includes('melding') ||
		text.includes('herinnering') ||
		text.includes('notificatie') ||
		text.includes('update')
	) {
		return 'notification';
	}

	return 'transactional'; // Default to transactional as it usually requires action
}

// Known company patterns for categorization
const KNOWN_COMPANIES: Record<string, { category: CompanyCategory; domain: string }> = {
	'bol.com': { category: 'ecommerce', domain: 'bol.com' },
	'coolblue.nl': { category: 'ecommerce', domain: 'coolblue.nl' },
	'mediamarkt.nl': { category: 'ecommerce', domain: 'mediamarkt.nl' },
	'amazon.nl': { category: 'ecommerce', domain: 'amazon.nl' },
	'zalando.nl': { category: 'ecommerce', domain: 'zalando.nl' },
	'nu.nl': { category: 'newsletter', domain: 'nu.nl' },
	'ad.nl': { category: 'newsletter', domain: 'ad.nl' },
	'volkskrant.nl': { category: 'newsletter', domain: 'volkskrant.nl' },
	'ing.nl': { category: 'banking', domain: 'ing.nl' },
	'rabobank.nl': { category: 'banking', domain: 'rabobank.nl' },
	'abnamro.nl': { category: 'banking', domain: 'abnamro.nl' },
	'linkedin.com': { category: 'social', domain: 'linkedin.com' },
	'facebook.com': { category: 'social', domain: 'facebook.com' },
	'instagram.com': { category: 'social', domain: 'instagram.com' },
	'spotify.com': { category: 'entertainment', domain: 'spotify.com' },
	'netflix.com': { category: 'entertainment', domain: 'netflix.com' },
	'kpn.nl': { category: 'telecom', domain: 'kpn.nl' },
	'ziggo.nl': { category: 'telecom', domain: 'ziggo.nl' },
	't-mobile.nl': { category: 'telecom', domain: 't-mobile.nl' },
	'ah.nl': { category: 'retail', domain: 'ah.nl' },
	'jumbo.com': { category: 'retail', domain: 'jumbo.com' },
	'booking.com': { category: 'travel', domain: 'booking.com' },
	'airbnb.com': { category: 'travel', domain: 'airbnb.com' },
	'google.com': { category: 'tech', domain: 'google.com' },
	'microsoft.com': { category: 'tech', domain: 'microsoft.com' },
	'apple.com': { category: 'tech', domain: 'apple.com' },
};

function extractDomain(emailAddr: string): string {
	const parts = emailAddr.split('@');
	return parts.length === 2 ? parts[1].toLowerCase() : '';
}

function extractCompanyName(domain: string): string {
	const parts = domain.replace(/^(www\.|mail\.|smtp\.|imap\.)/i, '').split('.');
	if (parts.length >= 2) {
		return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
	}
	return domain;
}

function categorizeCompany(domain: string): CompanyCategory {
	const known = Object.entries(KNOWN_COMPANIES).find(([key]) => domain.includes(key));
	if (known) return known[1].category;

	if (domain.includes('bank')) return 'banking';
	if (domain.includes('shop') || domain.includes('store')) return 'ecommerce';
	if (domain.includes('news') || domain.includes('nieuws')) return 'newsletter';
	if (domain.includes('social') || domain.includes('net')) return 'social';
	return 'other';
}

export function extractDomainFromEmail(email: string): string {
	return extractDomain(email);
}

/**
 * Add email type detection to emails
 */
export function enrichWithEmailTypes(emails: Email[]): Email[] {
	return emails.map(email => ({
		...email,
		emailType: detectEmailType(email.subject, email.body)
	}));
}

/**
 * Generate a summary of emails per company with type breakdown
 */
export function getCompanySummary(
	companyName: string,
	emails: Email[],
	hasPersonalData: boolean = false
): CompanyEmailSummary {
	const emailTypes: Record<EmailType, number> = {
		transactional: 0,
		promotional: 0,
		newsletter: 0,
		notification: 0
	};

	let latestEmail = new Date(0);

	for (const email of emails) {
		const type = email.emailType || detectEmailType(email.subject, email.body);
		emailTypes[type]++;
		if (email.date > latestEmail) {
			latestEmail = email.date;
		}
	}

	return {
		companyName,
		domain: extractDomain(emails[0]?.from || ''),
		category: categorizeCompany(extractDomain(emails[0]?.from || '')),
		totalEmails: emails.length,
		emailTypes,
		latestEmail: latestEmail.getTime() > 0 ? latestEmail : new Date(),
		hasPersonalData
	};
}

export function groupByCompany(emails: Email[]): Map<string, Email[]> {
	const groups = new Map<string, Email[]>();

	for (const email of emails) {
		const domain = extractDomain(email.from);
		if (!domain) continue;

		const companyDomain = KNOWN_COMPANIES[domain]?.domain || domain;

		if (!groups.has(companyDomain)) {
			groups.set(companyDomain, []);
		}
		groups.get(companyDomain)!.push({
			...email,
			companyId: companyDomain,
		});
	}

	return groups;
}

export interface EmailService {
	connect(config: IMAPConfig): Promise<boolean>;
	disconnect(): Promise<void>;
	isConnected(): Promise<boolean>;
	fetchEmails(options?: { limit?: number; mailbox?: string }): Promise<Email[]>;
}

class TauriEmailService implements EmailService {
	async connect(config: IMAPConfig): Promise<boolean> {
		try {
			// Note: imap commands use underscore naming convention
			const response = await invoke<boolean>('imap::connect', {
				host: config.host,
				port: config.port,
				username: config.username,
				password: config.password,
				use_tls: config.secure,
			});
			return response;
		} catch (error) {
			console.error('[Email] Connection error:', error);
			return false;
		}
	}

	async disconnect(): Promise<void> {
		try {
			await invoke<boolean>('imap::disconnect');
		} catch (error) {
			console.error('[Email] Disconnect error:', error);
		}
	}

	async isConnected(): Promise<boolean> {
		try {
			return await invoke<boolean>('imap::is_connected');
		} catch {
			return false;
		}
	}

	async fetchEmails(options?: { limit?: number; mailbox?: string }): Promise<Email[]> {
		const limit = options?.limit || 200;
		const mailbox = options?.mailbox || 'INBOX';
		try {
			const response = await invoke<{ emails: any[]; total: number }>('imap::fetch_emails', {
				mailbox,
				limit,
			});
			return response.emails.map((e) => ({
				id: e.id || crypto.randomUUID(),
				from: e.from || '',
				fromName: e.from_name || null,
				to: e.to || '',
				subject: e.subject || '(Geen onderwerp)',
				date: new Date(e.date || Date.now()),
				body: e.body || '',
				hasAttachments: e.has_attachments || false,
			}));
		} catch (error) {
			console.error('[Email] Fetch error:', error);
			return [];
		}
	}
}

export const emailService: EmailService = new TauriEmailService();

/**
 * Generate realistic mock emails for demo/testing
 */
export function generateMockEmails(count: number): Email[] {
	const companies = [
		{ from: 'noreply@bol.com', name: 'Bol.com', category: 'ecommerce' as CompanyCategory },
		{ from: 'nieuwsbrief@nu.nl', name: 'NU.nl', category: 'newsletter' as CompanyCategory },
		{ from: 'info@ing.nl', name: 'ING Bank', category: 'banking' as CompanyCategory },
		{ from: 'marketing@coolblue.nl', name: 'Coolblue', category: 'ecommerce' as CompanyCategory },
		{ from: 'noreply@linkedin.com', name: 'LinkedIn', category: 'social' as CompanyCategory },
		{ from: 'noreply@spotify.com', name: 'Spotify', category: 'entertainment' as CompanyCategory },
		{ from: 'info@kpn.nl', name: 'KPN', category: 'telecom' as CompanyCategory },
		{ from: 'klant@ziggo.nl', name: 'Ziggo', category: 'telecom' as CompanyCategory },
	];

	const subjects = [
		'Uw bestelling is verzonden',
		'Herinnering: betaling openstaand',
		'We missen u! Kom terug voor korting',
		'Nieuwsbrief - week 14 - 2026',
		'Uw maandelijkse overzicht',
		'Veiligheidsmelding: nieuwe aanmelding',
		'Uw factuur is klaar',
		'Bekijk uw recente activiteit',
	];

	const mockEmails: Email[] = [];

	for (let i = 0; i < count; i++) {
		const company = companies[Math.floor(Math.random() * companies.length)];
		const subject = subjects[Math.floor(Math.random() * subjects.length)];
		const daysAgo = Math.floor(Math.random() * 90);

		mockEmails.push({
			id: crypto.randomUUID(),
			from: company.from,
			fromName: company.name,
			to: 'user@example.com',
			subject: `${subject} #${i + 1}`,
			date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
			body: generateMockBody(company.category, company.name),
			hasAttachments: false,
		});
	}

	return mockEmails.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function generateMockBody(category: CompanyCategory, companyName: string): string {
	switch (category) {
		case 'ecommerce':
			return `Beste klant,

Uw bestelling bij ${companyName} is verwerkt. Levering binnen 1-2 werkdagen.

Met vriendelijke groet,
${companyName} Klantenservice`;
		case 'banking':
			return `Uw ${companyName} overzicht is beschikbaar.

Bekijk de details in de app.

Met vriendelijke groet,
${companyName}`;
		case 'newsletter':
			return `De belangrijkste nieuwsberichten van vandaag, samengevat voor u door ${companyName}.`;
		case 'social':
			return `${companyName} nieuws: Uw netwerk groeit. Bekijk wie uw berichten heeft gezien.`;
		case 'entertainment':
			return `Ontdek nieuwe content op ${companyName}. Aanbevelingen op maat voor u.`;
		case 'telecom':
			return `Uw ${companyName} factuur staat klaar. Bekijk de details in Mijn ${companyName}.`;
		default:
			return `Bedankt voor uw bericht. Wij nemen zo snel mogelijk contact met u op.`;
	}
}
