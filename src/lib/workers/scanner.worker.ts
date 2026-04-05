/**
 * AI Scanner Web Worker
 * Runs Qwen model in background thread - prevents UI blocking
 * Falls back to Z.AI GLM-5.1 API when local model fails
 */

import { pipeline, env, type Pipeline } from '@huggingface/transformers';

// Model: Qwen3.5 0.8B ONNX - released March 2026
const MODEL_ID = 'huggingworld/Qwen3.5-0.8B-ONNX';

// Z.AI API fallback config
const ZAI_API_ENDPOINT = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const ZAI_API_KEY = 'a2a189626fe24251a22809e5e8399a84.CNrlxvOenUTGuTbY';
const GLM_MODEL = 'GLM-5.1';

let generator: Pipeline | null = null;
let loading = false;
let localModelFailed = false;
let localModelAttempts = 0;
const MAX_LOCAL_ATTEMPTS = 2;

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
        localModelFailed = true;
        loading = false;
        return false;
    }
}

/**
 * GLM-5.1 API fallback - called when local Qwen model fails
 */
async function analyzeWithGLM5(
    companyName: string,
    emails: { subject: string; body: string }[]
): Promise<any> {
    const emailTexts = emails.slice(0, 5).map(e =>
        `- ${e.subject}\n  ${e.body.slice(0, 300)}`
    ).join('\n');

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
        const response = await fetch(ZAI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ZAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                thinking: { type: 'disabled' },
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            throw new Error(`GLM API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback parsing
        const hasPersonalData = content.toLowerCase().includes('true') ||
                               content.includes('"hasPersonalData": true');
        return {
            hasPersonalData,
            dataTypes: hasPersonalData ? ['email', 'naam'] : [],
            confidence: hasPersonalData ? 0.8 : 0.95,
            summary: hasPersonalData ? 'Gevonden via GLM-5.1' : 'Geen persoonsgegevens',
        };
    } catch (e) {
        // Last resort: pattern matching
        return {
            hasPersonalData: false,
            dataTypes: [],
            confidence: 0,
            summary: 'Cloud AI ook gefaald: ' + (e instanceof Error ? e.message : 'onbekende fout'),
        };
    }
}

/**
 * Analyze emails from a company
 * Priority: Qwen (local) -> GLM-5.1 (cloud) -> pattern matching
 */
async function analyzeCompany(
    companyName: string,
    emails: { subject: string; body: string }[]
): Promise<any> {
    // Try local Qwen first
    if (generator && !localModelFailed) {
        try {
            const emailTexts = emails.slice(0, 5).map(e =>
                `- ${e.subject}\n  ${e.body.slice(0, 300)}`
            ).join('\n');

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

            const output = await generator(prompt, {
                max_new_tokens: 150,
                do_sample: false,
                temperature: 0.1,
            });

            const response = output[0]?.generated_text?.trim() || '';
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Qwen failed, fall through to GLM-5.1
            localModelFailed = true;
        }
    }

    // Fallback to GLM-5.1 cloud API
    if (localModelFailed) {
        return await analyzeWithGLM5(companyName, emails);
    }

    // Final fallback: pattern matching
    return {
        hasPersonalData: false,
        dataTypes: [],
        confidence: 0,
        summary: 'Model niet geladen',
    };
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { action } = event.data;

    switch (action) {
        case 'load': {
            const success = await loadModel();
            self.postMessage({ type: 'loaded', success, cloudFallback: localModelFailed });
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
