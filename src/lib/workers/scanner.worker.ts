/**
 * AI Scanner Web Worker
 * Runs Qwen model in background thread - prevents UI blocking
 */

import { pipeline, env, type Pipeline } from '@huggingface/transformers';

// Model: Qwen2.5 0.8B ONNX - optimized for local inference
const MODEL_ID = 'onnx-community/Qwen2.5-0.8B-Instruct';

let generator: Pipeline | null = null;
let loading = false;

interface LoadMessage {
    action: 'load';
}

interface AnalyzeMessage {
    action: 'analyze';
    companyName: string;
    emails: { subject: string; body: string }[];
    conversationId: string;
}

type WorkerMessage = LoadMessage | AnalyzeMessage;

function log(status: string, data?: any) {
    self.postMessage({ type: 'log', status, data });
}

/**
 * Initialize the Qwen model
 */
async function loadModel(): Promise<boolean> {
    if (generator) return true;
    if (loading) return false;
    loading = true;

    try {
        log('loading', { progress: 10, status: 'Qwen model laden...' });

        // Try WebGPU first (fastest, best performance)
        try {
            log('loading', { progress: 30, status: 'WebGPU proberen...' });
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            generator = await pipeline('text-generation', MODEL_ID, {
                device: 'webgpu',
                dtype: 'q4f16',
            });
            log('loading', { progress: 100, status: 'Qwen geladen (WebGPU)' });
            loading = false;
            return true;
        } catch (e1) {
            log('loading', { progress: 30, status: 'WebGPU failed, WASM proberen...' });
        }

        // Try WASM (good balance)
        try {
            generator = await pipeline('text-generation', MODEL_ID, {
                device: 'wasm',
                dtype: 'q4',
            });
            log('loading', { progress: 100, status: 'Qwen geladen (WASM)' });
            loading = false;
            return true;
        } catch (e2) {
            log('loading', { progress: 50, status: 'WASM failed, CPU proberen...' });
        }

        // Fallback CPU
        generator = await pipeline('text-generation', MODEL_ID, {
            device: 'cpu',
            dtype: 'q4',
        });
        log('loading', { progress: 100, status: 'Qwen geladen (CPU - langzaam)' });
        loading = false;
        return true;

    } catch (e) {
        log('error', { message: e instanceof Error ? e.message : 'Model laden failed' });
        loading = false;
        return false;
    }
}

/**
 * Analyze emails from a company
 */
async function analyzeCompany(
    companyName: string,
    emails: { subject: string; body: string }[]
): Promise<any> {
    if (!generator) {
        return {
            hasPersonalData: false,
            dataTypes: [],
            confidence: 0,
            summary: 'Model niet geladen',
        };
    }

    // Limit emails and truncate body for faster processing
    const emailTexts = emails.slice(0, 5).map(e =>
        `- ${e.subject}\n  ${e.body.slice(0, 300)}`
    ).join('\n');

    // Improved prompt with JSON output expectation
    const prompt = `<|im_start|>system
Je bent een GDPR compliance analyzer. Analyseer emails en geef ALLEEN een JSON object terug:
{"hasPersonalData": boolean, "dataTypes": string[], "confidence": number, "summary": string}
- hasPersonalData: true als bedrijf mogelijk persoonsgegevens heeft
- dataTypes: array van gevonden types zoals "email", "naam", "adres", "telefoon", "bankrekening", "geboortedatum"
- confidence: 0.0-1.0 hoe zeker je bent
- summary: korte Nederlandse samenvatting<|im_end|>
<|im_start|>user
Bedrijf: ${companyName}

Emails:
${emailTexts}<|im_end|>
<|im_start|>assistant
`;

    try {
        const output = await generator(prompt, {
            max_new_tokens: 150,
            do_sample: false,
            temperature: 0.1,
        });

        const response = output[0]?.generated_text?.trim() || '';

        // Try to extract JSON from response
        let result;
        try {
            // Find JSON in response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch {
            // Fallback to simple parsing if JSON fails
            const hasPersonalData = response.toLowerCase().includes('true') ||
                                   response.includes('"hasPersonalData": true');
            result = {
                hasPersonalData,
                dataTypes: hasPersonalData ? ['email', 'naam'] : [],
                confidence: hasPersonalData ? 0.7 : 0.9,
                summary: hasPersonalData ? 'Gevonden via AI' : 'Geen persoonsgegevens',
            };
        }

        return result;
    } catch (e) {
        return {
            hasPersonalData: false,
            dataTypes: [],
            confidence: 0,
            summary: 'Analyse gefaald: ' + (e instanceof Error ? e.message : 'onbekende fout'),
        };
    }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { action } = event.data;

    switch (action) {
        case 'load': {
            const success = await loadModel();
            self.postMessage({ type: 'loaded', success });
            break;
        }
        case 'analyze': {
            const { companyName, emails, conversationId } = event.data;
            log('analyzing', { company: companyName, emailCount: emails.length });

            const result = await analyzeCompany(companyName, emails);

            self.postMessage({
                type: 'result',
                conversationId,
                result,
            });
            break;
        }
    }
};
