/**
 * AI Service - Local AI for GDPR personal data detection
 * Uses Qwen3 0.8B via @huggingface/transformers
 * 100% local, no external API calls
 */

import { pipeline, env, type Pipeline } from '@huggingface/transformers';

// Local model path - can be bundled with the app
const MODEL_ID = 'onnx-community/Qwen3-0.8B-ONNX';

export interface AIResult {
	hasPersonalData: boolean;
	dataTypes: string[];
	confidence: number;
	summary: string;
}

type LoadingCallback = (progress: number, status: string) => void;
let loadingCallbacks: LoadingCallback[] = [];

let generator: Pipeline | null = null;
let loadError: string | null = null;
let loading = false;

export function onLoadingProgress(cb: LoadingCallback) {
	loadingCallbacks.push(cb);
}

function notifyLoading(progress: number, status: string) {
	for (const cb of loadingCallbacks) {
		cb(progress, status);
	}
}

/**
 * Initialize the Qwen3 model via Transformers.js
 * Uses WebGPU if available, falls back to WASM then CPU
 */
export async function init(): Promise<boolean> {
	if (generator) return true;
	if (loading) return false;
	loading = true;
	loadError = null;

	try {
		notifyLoading(10, 'Qwen3 model initialiseren...');

		// Try WebGPU first (fastest)
		try {
			notifyLoading(30, 'WebGPU proberen...');
			env.allowLocalModels = false;
			env.useBrowserCache = true;

			generator = await pipeline('text-generation', MODEL_ID, {
				device: 'webgpu',
				dtype: 'q4f16',
			});
			notifyLoading(100, 'Qwen3 geladen (WebGPU)');
			loading = false;
			return true;
		} catch (e1) {
			console.warn('[AI] WebGPU failed, trying WASM:', e1);
			notifyLoading(30, 'WASM proberen...');
		}

		// Try WASM (good performance, no GPU needed)
		try {
			generator = await pipeline('text-generation', MODEL_ID, {
				device: 'wasm',
				dtype: 'q4',
			});
			notifyLoading(100, 'Qwen3 geladen (WASM)');
			loading = false;
			return true;
		} catch (e2) {
			console.warn('[AI] WASM failed, trying CPU:', e2);
			notifyLoading(50, 'CPU proberen (langzamer)...');
		}

		// Fallback to CPU (slow but works)
		generator = await pipeline('text-generation', MODEL_ID, {
			device: 'cpu',
			dtype: 'q4',
		});
		notifyLoading(100, 'Qwen3 geladen (CPU - langzaam)');
		loading = false;
		return true;

	} catch (e) {
		console.error('[AI] Failed to load model:', e);
		loadError = e instanceof Error ? e.message : 'Unknown error';
		loading = false;
		return false;
	}
}

export function isLoaded(): boolean {
	return generator !== null;
}

export function getLoadError(): string | null {
	return loadError;
}

export function getDevice(): string {
	if (!generator) return 'none';
	// Return device info based on model config
	return 'local';
}

/**
 * Analyze emails from a company
 * Returns simple 0 (no personal data) or 1 (has personal data)
 */
export async function analyzeCompany(
	companyName: string,
	emails: { subject: string; body: string }[]
): Promise<AIResult> {
	// If model not loaded, use pattern matching fallback
	if (!generator) {
		const patterns = detectPatterns(emails);
		return {
			hasPersonalData: patterns.length > 0,
			dataTypes: patterns,
			confidence: 0.3,
			summary: patterns.length > 0
				? `Gevonden via patronen: ${patterns.slice(0, 3).join(', ')}`
				: 'Geen persoonsgegevens gedetecteerd',
		};
	}

	try {
		// Build prompt in Dutch - ask for simple yes/no (0/1)
		const emailTexts = emails.slice(0, 5).map(e =>
			`- ${e.subject}\n  ${e.body.slice(0, 200)}`
		).join('\n');

		const prompt = `Analyseer deze emails van "${companyName}".

Emails:
${emailTexts}

Beantwoord met ALLEEN een cijfer:
- 1 = dit bedrijf heeft mogelijk persoonsgegevens
- 0 = dit bedrijf heeft geen persoonsgegevens

Antwoord:`;

		// Generate using local model
		const output = await generator(prompt, {
			max_new_tokens: 10,
			do_sample: false,
			temperature: 0.1,
		});

		const response = output[0]?.generated_text?.trim() || '';
		console.log('[AI] Qwen3 response:', response);

		// Parse simple 0/1 response
		const hasPersonalData = response.includes('1');

		return {
			hasPersonalData,
			dataTypes: hasPersonalData ? ['email', 'naam'] : [],
			confidence: hasPersonalData ? 0.8 : 0.9,
			summary: hasPersonalData
				? 'Lokale AI: mogelijk persoonsgegevens gedetecteerd'
				: 'Lokale AI: geen persoonsgegevens',
		};
	} catch (e) {
		console.error('[AI] Analysis failed:', e);
		// Fallback to patterns
		const patterns = detectPatterns(emails);
		return {
			hasPersonalData: patterns.length > 0,
			dataTypes: patterns,
			confidence: 0.3,
			summary: patterns.length > 0
				? `Gevonden via patronen: ${patterns.slice(0, 3).join(', ')}`
				: 'Analyse mislukt, geen patronen gevonden',
		};
	}
}

/**
 * Pattern-based fallback detection
 * Works without any AI model
 */
function detectPatterns(emails: { subject: string; body: string }[]): string[] {
	const allText = emails.map(e => `${e.subject} ${e.body}`).join('\n').toLowerCase();
	const types: string[] = [];

	// Email addresses
	if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(allText)) {
		types.push('email');
	}

	// Dutch phone numbers
	if (/\b(?:\+31|0)[6][1-9]\d{7,8}\b/.test(allText)) {
		types.push('telefoon');
	}

	// IBAN
	if (/\bNL\d{2}[A-Z]{4}\d{10}\b/.test(allText)) {
		types.push('bankrekening');
	}

	// IP addresses
	if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(allText)) {
		types.push('ip-adres');
	}

	// Financial data
	if (/bank|rekening|betalen|bedrag|€|factuur|iban/i.test(allText)) {
		types.push('financieel');
	}

	// Address patterns (Dutch)
	if (/straat|weg|laan|plein|huisnummer|postcode|\d{4}\s?[A-Z]{2}/i.test(allText)) {
		types.push('adres');
	}

	// Date of birth
	if (/geboortedatum|geboren|geboorte/i.test(allText)) {
		types.push('geboortedatum');
	}

	// Medical
	if (/medisch|gezondheid|arts|ziekenhuis|patient/i.test(allText)) {
		types.push('medisch');
	}

	// Employment
	if (/werk|baan|werkgever|salaris/i.test(allText)) {
		types.push('werkgegevens');
	}

	return types;
}

export async function test(): Promise<boolean> {
	if (!generator) {
		const ok = await init();
		if (!ok) return false;
	}
	return true;
}
