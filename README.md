# Local GDPR Scanner

**Privacy-first email scanner. Lokale AI + cloud fallback.**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Privacy](https://img.shields.io/badge/privacy-hybrid-green)

## Wat is dit?

Een desktop applicatie die uw emails scant op bedrijven die mogelijk uw persoonsgegevens hebben. U krijgt een overzicht van alle bedrijven en kunt direct AVG-verzoekbrieven genereren.

**Het belangrijkste: keuzevrijheid tussen lokale of cloud AI.**

## Features

- **100% Lokaal** - Qwen 3.5 0.8B draait op uw eigen machine
- **Cloud Fallback** - GLM-5.1 via Z.AI API wanneer lokaal niet werkt
- **Email Providers** - Gmail, Outlook, en andere IMAP servers
- **OAuth2** - Veilige authenticatie (wachtwoord wordt nooit opgeslagen)
- **GDPR Overzicht** - Per bedrijf: welke gegevens, AVG-rechten
- **Brief Generator** - Direct verzoekbrieven versturen
- **Batch Operaties** - Selecteer meerdere bedrijven tegelijk
- **Markeren als Verwerkt** - Houd bij welke bedrijven u al gecontacteerd hebt
- **Scan Geschiedenis** - Bekijk eerdere scans

## Installatie

### Windows / macOS / Linux

Download de nieuwste release van GitHub Releases.

### Van bron compileren

```bash
# Vereisten
- Node.js 18+
- Rust 1.70+
- npm

# Frontend bouwen
npm install
npm run build

# Desktop app bouwen
cd src-tauri
cargo build --release
```

## Technische Architectuur

```
Tauri v2 Desktop App

SvelteKit Frontend
  Two-Tier Analysis:
  1. Rust regex (snel, altijd)
  2. Qwen 3.5 (lokaal) of GLM-5.1 (cloud)

Rust Backend (IMAP, OAuth, Fast Regex)
```

### Stack

- **Desktop**: Tauri v2 (Rust)
- **Frontend**: SvelteKit 5 + TypeScript
- **Lokale AI**: Qwen 3.5 0.8B via Transformers.js (WebGPU/WASM)
- **Cloud AI**: GLM-5.1 via Z.AI API (fallback)
- **Email**: IMAP via Rust async-imap
- **Auth**: OAuth2 (Google/Microsoft)

## Privacy

- **Lokale modus**: Alle AI verwerking gebeurt op uw apparaat
- **Hybrid/Cloud modus**: Alleen email-tekst wordt naar Z.AI gestuurd (opt-in)
- Emails worden alleen via uw eigen IMAP server opgehaald
- Wachtwoorden worden nooit opgeslagen
- Scan resultaten worden lokaal opgeslagen

## Licentie

MIT License - vrij te gebruiken, aan te passen, te delen.
