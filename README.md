# Local GDPR Scanner

**Privacy-first email scanner. 100% lokaal, geen externe API's.**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Privacy](https://img.shields.io/badge/privacy-100%25%20local-green)

## Wat is dit?

Een desktop applicatie die uw emails scant op bedrijven die mogelijk uw persoonsgegevens hebben. U krijgt een overzicht van alle bedrijven en kunt direct AVG-verzoekbrieven genereren.

**Het belangrijkste: geen data verlaat ooit uw apparaat.**

## Features

- 🔒 **100% Lokaal** — AI draait op uw eigen machine
- 🤖 **Qwen 3.5 0.8B** — Ingebouwde taalmodel (geen internet nodig)
- 📧 **Email Providers** — Gmail, Outlook, en andere IMAP servers
- 🔐 **OAuth2** — Veilige authenticatie (wachtwoord wordt nooit opgeslagen)
- 📊 **GDPR Overzicht** — Per bedrijf: welke gegevens, AVG-rechten
- 📝 **Brief Generator** — Direct verzoekbrieven versturen

## Installatie

### Windows / macOS / Linux

Download de nieuwste release van [GitHub Releases](https://github.com/FrankRKNL/local-gdpr-scanner/releases).

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
┌─────────────────────────────────────────────┐
│  Tauri v2 Desktop App                        │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  SvelteKit Frontend                 │    │
│  │  Transformers.js                    │    │
│  │  Qwen 3.5 0.8B (WebGPU/WASM)       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Rust Backend (IMAP, OAuth, File I/O)        │
└─────────────────────────────────────────────┘
```

### Stack

- **Desktop**: Tauri v2 (Rust)
- **Frontend**: SvelteKit + TypeScript
- **AI**: Qwen 3.5 0.8B via Transformers.js
- **Email**: IMAP via Rust `lettre` library
- **Auth**: OAuth2 (Google/Microsoft)

## Ontwikkeling

```bash
# Start frontend dev server
npm run dev

# Start Tauri in dev mode
npm run tauri:dev
```

## Privacy

- Alle AI verwerking gebeurt lokaal op uw apparaat
- Emails worden alleen via uw eigen IMAP server opgehaald
- Geen gegevens worden naar externe servers gestuurd
- Scan resultaten worden lokaal opgeslagen

## Licentie

MIT License — vrij te gebruiken, aan te passen, te delen.
