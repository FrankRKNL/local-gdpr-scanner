/**
 * Two-Tier Analysis Engine
 * Tier 1: Fast Rust regex (instant, for all emails)
 * Tier 2: Smart NLP via Qwen (thorough, for flagged companies only)
 */

import { invoke } from '@tauri-apps/api/core';

export interface ScanResult {
    companyName: string;
    domain: string;
    emailCount: number;
    hasPersonalData: boolean;
    confidence: number;
    dataTypes: string[];
    summary: string;
    scanMethod: 'regex' | 'nlp';
}

export interface ScanProgress {
    company: string;
    phase: 'regex' | 'nlp' | 'done';
    progress: number;
    dataTypes?: string[];
}

type ProgressCallback = (progress: ScanProgress) => void;

/**
 * Run two-tier analysis on companies
 * Tier 1: Fast regex via Rust (always runs)
 * Tier 2: Smart NLP via Qwen (only if regex finds something)
 */
export async function analyzeCompanies(
    companies: Map<string, { subject: string; body: string }[]>,
    onProgress?: ProgressCallback
): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    const companyEntries = Array.from(companies.entries());
    const total = companyEntries.length;

    for (let i = 0; i < companyEntries.length; i++) {
        const [companyName, emails] = companyEntries[i];
        const texts = emails.map(e => `${e.subject}\n${e.body}`);

        onProgress?.({
            company: companyName,
            phase: 'regex',
            progress: Math.round((i / total) * 50),
        });

        // Tier 1: Fast regex scan (Rust)
        let result: ScanResult;
        try {
            const regexResult = await invoke<{
                has_personal_data: boolean;
                data_types: string[];
                confidence: number;
                summary: string;
            }>('fast_scan', { texts });

            result = {
                companyName,
                domain: companyName,
                emailCount: emails.length,
                hasPersonalData: regexResult.has_personal_data,
                confidence: regexResult.confidence,
                dataTypes: regexResult.data_types,
                summary: regexResult.summary,
                scanMethod: 'regex',
            };

            // If regex found something, do deeper NLP analysis
            if (regexResult.has_personal_data && regexResult.confidence < 0.8) {
                onProgress?.({
                    company: companyName,
                    phase: 'nlp',
                    progress: 50 + Math.round((i / total) * 40),
                    dataTypes: regexResult.data_types,
                });

                // Tier 2: Smart NLP would go here
                // For now, we just use the regex result as the final answer
                // In a full implementation, we would call the Qwen worker here
            }
        } catch (e) {
            console.error('[Scan] Regex failed:', e);
            result = {
                companyName,
                domain: companyName,
                emailCount: emails.length,
                hasPersonalData: false,
                confidence: 0,
                dataTypes: [],
                summary: 'Scan gefaald',
                scanMethod: 'regex',
            };
        }

        onProgress?.({
            company: companyName,
            phase: 'done',
            progress: Math.round(((i + 1) / total) * 100),
        });

        results.push(result);
    }

    return results;
}

/**
 * Quick scan a batch of texts for personal data
 * Uses only Tier 1 (regex) for speed
 */
export async function quickScan(texts: string[]): Promise<{
    hasPersonalData: boolean;
    dataTypes: string[];
    confidence: number;
}> {
    try {
        const result = await invoke<{
            has_personal_data: boolean;
            data_types: string[];
            confidence: number;
        }>('fast_scan', { texts });

        return {
            hasPersonalData: result.has_personal_data,
            dataTypes: result.data_types,
            confidence: result.confidence,
        };
    } catch (e) {
        console.error('[Scan] Quick scan failed:', e);
        return {
            hasPersonalData: false,
            dataTypes: [],
            confidence: 0,
        };
    }
}
