# Local GDPR Scanner

**Privacy-first email scanner. 100% lokaal, geen externe API's.**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Privacy](https://img.shields.io/badge/privacy-100%25%20local-green)
![Build](https://img.shields.io/badge/build-Tauri%20v2-blue)

## Wat is dit?

Een desktop applicatie die uw emails scant op bedrijven die mogelijk uw persoonsgegevens hebben. U krijgt een overzicht van alle bedrijven en kunt direct AVG-verzoekbrieven genereren.

**Het belangrijkste: geen data verlaat ooit uw apparaat.**

## Features

### Core
- 🔒 **100% Lokaal** — AI draait op uw eigen machine
- 🤖 **Qwen 3.5 0.8B** — Ingebouwde taalmodel (geen internet nodig)
- ⚡ **Two-Tier Analysis** — Supersnel: regex scan + NLP analyse
- 📧 **Email Providers** — Gmail, Outlook, en andere IMAP servers

### AI & Scanning
- ⚡ **Fast Regex Scanner** — Instant detectie van BSN, IBAN, telefoon, postcode
- 🤖 **Smart NLP** — Diepgaande analyse met Qwen via Transformers.js
- 📊 **Privacy Dashboard** — Statistieken en overzicht van uw data

### Desktop Integration
- 🖥️ **System Tray** — Minimaliseer naar tray, draait op de achtergrond
- ⌨️ **Keyboard Shortcuts** — Snel navigeren met Ctrl+N/D/R/B
- 📱 **Portable** — USB-stick, overal mee naartoe

### Privacy Tools
- 📝 **AVG Brief Generator** — Direct verwijderingsbrieven downloaden (Art. 15, 17, 20, 21)
- 🎯 **AI Agent** — Smart acties: verwijderen, anonimiseren, verplaatsen, labelen
- 📤 **Data Export** — JSON en CSV export van scan resultaten

## Screenshots

De app heeft een moderne, donkere interface met Nederlandse tekst.

## Installatie

### Windows / macOS / Linux

Download de nieuwste release van [GitHub Releases](https://github.com/FrankRKNL/local-gdpr-scanner/releases).

### Van bron compileren

```bash
# Vereisten
- Node.js 18+
- Rust 1.70+
- npm

# Clone en build
git clone https://github.com/FrankRKNL/local-gdpr-scanner.git
cd local-gdpr-scanner
npm install

# Frontend bouwen
npm run build

# Desktop app bouwen (vereist GTK3 op Linux)
npm run tauri:build
```

### Linux dependencies

```bash
sudo apt install libgtk-3-dev pkg-config libssl-dev
```

## Technische Architectuur

```
┌─────────────────────────────────────────────┐
│  Tauri v2 Desktop App                        │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │  SvelteKit Frontend                  │  │
│  │                                      │  │
│  │  ⚡ Fast Regex Scanner (Rust)       │  │
│  │  🤖 Qwen 3.5 (WebGPU/WASM)        │  │
│  │  📊 Privacy Dashboard               │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  Rust Backend                               │
│  📧 IMAP (async-imap)                      │
│  🖥️ System Tray                           │
│  🎯 AI Agent (anonymizer)                   │
└─────────────────────────────────────────────┘
```

### Stack

| Component | Technologie |
|-----------|------------|
| Desktop | Tauri v2 (Rust) |
| Frontend | SvelteKit 5 + TypeScript |
| AI (lokaal) | Qwen 3.5 0.8B via Transformers.js |
| AI (analyse) | Fast Regex (Rust) + NLP (Qwen) |
| Email | IMAP via async-imap |
| Auth | OAuth2 (Gmail/Outlook) |

## Ontwikkeling

```bash
# Start frontend dev server
npm run dev

# Start Tauri in dev mode
npm run tauri:dev

# Run tests
npm test
```

## Keyboard Shortcuts

| Shortcut | Actie |
|----------|-------|
| `Ctrl+N` | Nieuwe scan |
| `Ctrl+D` | Dashboard |
| `Ctrl+R` | Resultaten |
| `Ctrl+B` | AVG Brief generator |
| `Ctrl+,` | Instellingen |
| `Shift+?` | Shortcuts help |

## Privacy

- ✅ Alle AI verwerking gebeurt lokaal op uw apparaat
- ✅ Emails worden alleen via uw eigen IMAP server opgehaald
- ✅ Geen gegevens worden naar externe servers gestuurd
- ✅ Scan resultaten worden lokaal opgeslagen
- ✅ Wachtwoorden worden nooit opgeslagen (OAuth2)

## Roadmap

- [ ] OAuth2 integratie (Gmail/Outlook)
- [ ] PDF export voor AVG brieven
- [ ] Dark/Light theme toggle
- [ ] Multi-account support
- [ ] Automatische scans (scheduled)

## Licentie

MIT License — vrij te gebruiken, aan te passen, te delen.

## Bijdragen

Bijdragen zijn welkom! Open een issue of pull request op GitHub.
