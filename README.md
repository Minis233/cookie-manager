# Cookie Manager

A modern userscript that turns any browser into a full-featured cookie editor. Runs on **Tampermonkey, Violentmonkey, Greasemonkey, Userscripts (Safari), Stay (Safari), Via (Android)** and any other userscript engine.

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/Minis233/cookie-manager)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features

- **Dual engine** — uses the modern `cookieStore` API on Chromium, automatically falls back to `document.cookie` on Firefox/Safari/legacy
- **Full CRUD** — add / edit / delete / batch-add with smart paste parsing
- **Multi-select** — select-all (filter-aware), bulk copy, bulk delete with one-click undo
- **Sort / filter / group** — sort by key / size / expires (asc/desc), filter Secure-only / HttpOnly-only, group by domain or root domain
- **Multiple copy formats** — Cookie Header, cURL `--cookie`, JSON (DevTools / EditThisCookie compatible), KV
- **Import / Export JSON** — back up your login state, share between devices
- **Detail view** — tap a cookie to see Domain / Path / Expires / Secure / HttpOnly / SameSite / Size, with size warning at >4 KB
- **Undo delete** — every delete shows a 5-second Undo toast
- **Dark mode** — auto / light / dark, follows `prefers-color-scheme` by default
- **Bilingual UI** — instant 中/EN switch, persists across sessions, auto-detects browser language
- **Search** — filter by key or value
- **Draggable floating button** — position is remembered

## Install

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome / Edge / Firefox / Safari / Opera)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome / Edge / Firefox)
   - [Greasemonkey](https://www.greasespot.net/) (Firefox)
   - [Userscripts](https://github.com/quoid/userscripts) (Safari macOS / iOS)
   - [Via](https://viayoo.com/) (Android, built-in support)
2. Open the raw script file:

   👉 **[Install Cookie Manager](https://raw.githubusercontent.com/Minis233/cookie-manager/main/cookie-manager.user.js)**

   Your userscript manager will pick it up and ask you to confirm.

## Usage

A small blue **C** button appears at the bottom-right of every page. Tap it to open the manager.

- **Drag** the button anywhere — its position is saved.
- **Search** by key / value.
- **Multi-select** mode → bulk operations + filter-aware select all.
- **Copy As...** dropdown → choose the format you need (header for HTTP debugging, cURL for terminal, JSON for backup).
- **More ▾** → Export / Import JSON.
- **Tap any cookie** to expand its full details.
- **Edit** lets you rename the key, change value/domain/path/expiry — all editable.
- **Switch language** with the **中/EN** pill in the header.

## Browser compatibility

| Engine | Status | Notes |
|---|---|---|
| Tampermonkey | ✅ Full | Tested on Chromium |
| Violentmonkey | ✅ Full | Tested on Chromium |
| Greasemonkey 4 | ✅ Works | Falls back to `localStorage` for settings (sync `GM_*` not available) |
| Userscripts (Safari) | ✅ Full | macOS / iOS |
| Via Browser (Android) | ✅ Full | Original target platform |
| Stay (Safari) | ✅ Should work | Untested but uses same APIs |

| Browser cookie API | Status |
|---|---|
| Chromium-based (Chrome/Edge/Brave/Opera/Vivaldi) | Uses `cookieStore` — full Domain/Path/Secure/HttpOnly/SameSite/Expires |
| Firefox | Falls back to `document.cookie` — limited to non-HttpOnly cookies for the current host |
| Safari | Falls back to `document.cookie` — same limitation |

> **Note:** `HttpOnly` cookies are by design unreadable from JavaScript on any browser without the `cookieStore` API. This is a browser security feature, not a script limitation.

## Privacy

This script makes **zero network requests**. All data stays in your browser. No telemetry, no analytics, no remote calls.

## Development

```bash
git clone https://github.com/Minis233/cookie-manager.git
cd cookie-manager

# Set up the preview harness (copy or symlink the script into preview/)
cp cookie-manager.user.js preview/script.js
python3 -m http.server 8765 --directory preview
# Open http://localhost:8765/index.html
```

The preview harness in `preview/index.html` mocks `GM_getValue` / `GM_setValue` / `GM_registerMenuCommand` so you can iterate without installing anything.

## Roadmap

- [x] ~~Optional dark mode~~ (v0.4.0)
- [x] ~~Quick filter chips (Secure / HttpOnly)~~ (v0.4.0)
- [x] ~~Sort by key / size / expires~~ (v0.4.0)
- [x] ~~Group by domain~~ (v0.4.0)
- [ ] Drag to reorder selection
- [ ] Per-domain favorite presets
- [ ] Filter by domain pattern

PRs welcome.

## License

[MIT](LICENSE) © Minis
