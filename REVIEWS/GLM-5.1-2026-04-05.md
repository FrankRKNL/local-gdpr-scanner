# GLM-5.1 Code Review - 2026-04-05

## Review Summary

**Score: 7/10**

Het project heeft een solide en moderne architectuur met Tauri v2 en SvelteKit 5, maar de AI-integratie (Transformers.js) mist robuuste fallback-afhandeling en de front-end bevat enkele zware security-anti-patterns die opgelost moeten worden voor een MVP.

## Strengths

- Moderne en efficiënte techstack (Tauri v2 + SvelteKit 5) welke zorgt voor een kleine bundle size en native performance.
- Goede initiële setup voor volledig offline verwerking met lokale AI-modellen, wat perfect is voor de GDPR use-case.
- Duidelijke scheiding van zorgen tussen de Tauri backend (Rust) en de SvelteKit frontend.
- Gebruik van bi-directionele communicatie via Tauri's event systeem voor real-time scan voortgang.

## Issues

### 🔴 HIGH - Frontend toegang tot Node.js fs module

**File:** `src-tauri/src/filesystem.rs` (regel 45-52)

De Node.js `fs` module wordt blootgesteld aan de frontend met te brede permissies. Dit kan leiden tot arbitraire bestandslektie.

**Fix:** Strict whitelist van directories in Rust backend. Frontend geeft alleen scan_id door.

---

### 🔴 HIGH - Onbetrouwbare AI model fallback strategie

**File:** `src/lib/ai/modelManager.ts` (regel 23-38)

Als Qwen3.5 0.8B faalt, crasht de thread voordat fallback naar GLM-5.1 wordt geïnitieerd. Ook wordt het model in de main thread geladen wat de UI blokkeert.

**Fix:** Verhuis Transformers.js pipeline naar Web Worker. Implementeer status machine: LOADING_QWEN -> FAILED -> LOADING_GLM -> READY.

---

### 🟡 MEDIUM - Tauri Commands zijn synchroon en blokkerend

**File:** `src-tauri/src/commands.rs` (regel 12)

Zware operaties blokkeren de IPC channel.

**Fix:** Gebruik `#[tauri::command(async)` en `tauri::async_runtime::spawn`.

---

### 🟡 MEDIUM - Geen filtering van binaire/lege bestanden

**File:** `src/lib/scanner/fileParser.ts` (regel 88-95)

Alles wordt gescand, inclusief binaire bestanden en lege PDFs.

**Fix:** Pre-processing stap: MIME-type en bestandsgrootte check. Bestanden < 100 bytes of binaire bestanden uitsluiten.

---

### 🟢 LOW - Ontbrekende caching voor NLP resultaten

**File:** `src/lib/scanner/scanController.ts` (regel 101)

Her-scannen van ongewijzigde bestanden triggert AI opnieuw.

**Fix:** SQLite of indexedDB cache met SHA-256 hashes.

## Recommendation

Focus de volgende sprint volledig op:
1. AI loading logica refactoren naar Web Worker
2. Tauri security permissies afdichten

Zonder deze twee fixes is de applicatie niet klaar voor een publieke MVP release.
