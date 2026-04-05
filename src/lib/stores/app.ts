/**
 * App Store - Global state management
 */

import type { AIResult } from '$lib/services/ai';
import type { Email } from '$lib/services/email';

export interface CompanyResult {
	name: string;
	domain: string;
	emailCount: number;
	hasPersonalData: boolean;
	dataTypes: string[];
	confidence: number;
	summary: string;
}

interface AppState {
	results: CompanyResult[];
	totalEmails: number;
	scannedAt: Date | null;
	settings: {
		aiProvider: 'local' | 'hybrid' | 'cloud';
		language: string;
	};
}

let state = $state<AppState>({
	results: [],
	totalEmails: 0,
	scannedAt: null,
	settings: {
		aiProvider: 'hybrid', // Default: local with cloud fallback
		language: 'nl',
	},
});

export const appStore = {
	get state() {
		return state;
	},

	setResults(companies: Map<string, Email[]>, aiResults: AIResult[]) {
		const results: CompanyResult[] = [];
		let i = 0;

		for (const [companyName, emails] of companies.entries()) {
			const aiResult = aiResults[i] || {
				hasPersonalData: false,
				dataTypes: [],
				confidence: 0,
				summary: '',
			};

			results.push({
				name: companyName,
				domain: companyName,
				emailCount: emails.length,
				...aiResult,
			});
			i++;
		}

		state.results = results.sort((a, b) => {
			// Sort by personal data presence, then by email count
			if (a.hasPersonalData !== b.hasPersonalData) {
				return a.hasPersonalData ? -1 : 1;
			}
			return b.emailCount - a.emailCount;
		});
		state.totalEmails = Array.from(companies.values()).reduce((sum, e) => sum + e.length, 0);
		state.scannedAt = new Date();
	},

	clearResults() {
		state.results = [];
		state.totalEmails = 0;
		state.scannedAt = null;
	},

	updateSettings(settings: Partial<AppState['settings']>) {
		state.settings = { ...state.settings, ...settings };
	},
};
