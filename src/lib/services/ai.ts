/**
 * AI Service - Uses Web Worker for non-blocking inference
 * Routes to scanner.worker.ts for Qwen model execution
 */

export interface AIResult {
    hasPersonalData: boolean;
    dataTypes: string[];
    confidence: number;
    summary: string;
}

type LoadingCallback = (progress: number, status: string) => void;
type ResultCallback = (result: AIResult) => void;

let worker: Worker | null = null;
let loadingCallbacks: LoadingCallback[] = [];
let pendingResults: Map<string, ResultCallback> = new Map();
let conversationCounter = 0;

export function onLoadingProgress(cb: LoadingCallback) {
    loadingCallbacks.push(cb);
}

function notifyLoading(progress: number, status: string) {
    for (const cb of loadingCallbacks) {
        cb(progress, status);
    }
}

/**
 * Initialize the AI worker
 */
export async function init(): Promise<boolean> {
    if (worker) return true;

    return new Promise((resolve) => {
        try {
            // Create worker using Vite's worker syntax
            worker = new Worker(
                new URL('$lib/workers/scanner.worker.ts', import.meta.url),
                { type: 'module' }
            );

            worker.onmessage = (event) => {
                const { type, status, data, result, conversationId } = event.data;

                switch (type) {
                    case 'log':
                        notifyLoading(data.progress || 50, data.status);
                        break;
                    case 'loaded':
                        resolve(data.success);
                        break;
                    case 'result':
                        if (conversationId && pendingResults.has(conversationId)) {
                            const cb = pendingResults.get(conversationId)!;
                            pendingResults.delete(conversationId);
                            cb(result);
                        }
                        break;
                }
            };

            worker.onerror = (e) => {
                console.error('[AI Worker error]', e);
                resolve(false);
            };

            // Send load command to worker
            worker.postMessage({ action: 'load' });

        } catch (e) {
            console.error('[AI] Failed to create worker:', e);
            resolve(false);
        }
    });
}

export function isLoaded(): boolean {
    return worker !== null;
}

export function getLoadError(): string | null {
    return null; // Worker handles its own errors
}

export function getDevice(): string {
    return worker ? 'worker' : 'none';
}

/**
 * Analyze emails from a company - returns promise with AI result
 */
export async function analyzeCompany(
    companyName: string,
    emails: { subject: string; body: string }[]
): Promise<AIResult> {
    if (!worker) {
        // Fallback to pattern matching if worker not ready
        return patternFallback(emails);
    }

    return new Promise((resolve) => {
        const conversationId = `conv-${++conversationCounter}`;
        pendingResults.set(conversationId, resolve);

        worker!.postMessage({
            action: 'analyze',
            companyName,
            emails,
            conversationId,
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            if (pendingResults.has(conversationId)) {
                pendingResults.delete(conversationId);
                resolve({
                    hasPersonalData: false,
                    dataTypes: [],
                    confidence: 0,
                    summary: 'Timeout - AI te langzaam',
                });
            }
        }, 60000);
    });
}

/**
 * Pattern-based fallback detection
 */
function patternFallback(emails: { subject: string; body: string }[]): AIResult {
    const allText = emails.map(e => `${e.subject} ${e.body}`).join('\n').toLowerCase();
    const types: string[] = [];

    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(allText)) types.push('email');
    if (/\b(?:\+31|0)[6][1-9]\d{7,8}\b/.test(allText)) types.push('telefoon');
    if (/\bNL\d{2}[A-Z]{4}\d{10}\b/.test(allText)) types.push('bankrekening');
    if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(allText)) types.push('ip-adres');
    if (/bank|rekening|betalen|bedrag|€|factuur|iban/i.test(allText)) types.push('financieel');
    if (/straat|weg|laan|plein|huisnummer|postcode|\d{4}\s?[A-Z]{2}/i.test(allText)) types.push('adres');
    if (/geboortedatum|geboren|geboorte/i.test(allText)) types.push('geboortedatum');
    if (/medisch|gezondheid|arts|ziekenhuis|patient/i.test(allText)) types.push('medisch');
    if (/werk|baan|werkgever|salaris/i.test(allText)) types.push('werkgegevens');

    return {
        hasPersonalData: types.length > 0,
        dataTypes: types,
        confidence: 0.3,
        summary: types.length > 0
            ? `Gevonden via patronen: ${types.slice(0, 3).join(', ')}`
            : 'Geen persoonsgegevens gedetecteerd',
    };
}

export async function test(): Promise<boolean> {
    return init();
}

export const aiService = {
    init,
    isLoaded,
    getLoadError,
    getDevice,
    analyzeCompany,
    onLoadingProgress,
    test,
};
