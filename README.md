# GroceryGPS 🧭🛒

**Navigate your store, not your phone.**

A camera-first, gesture-driven grocery store navigation app that optimizes your shopping route. Map your store once, shop efficiently every time.

---

## Quick Start

1. Open `index.html` in any browser (mobile Safari recommended)
2. QFC Crown Hill is auto-loaded as your first store
3. Tap **Start Shopping** → add items → **Optimize Route**

No server, no build step, no dependencies. Everything runs client-side with `localStorage`.

---

## Architecture

| Layer | File(s) | Purpose |
|---|---|---|
| **Shell** | `index.html`, `css/style.css` | SPA layout, premium "Cartographic Luxury" design |
| **Router** | `js/app.js` | Screen switching, history, home screen rendering |
| **Storage** | `js/storage.js` | `localStorage` wrapper for stores, lists, corrections |
| **Store Editor** | `js/store-editor.js` | Visual store layout builder with entrance/exit diagram |
| **Store Finder** | `js/store-finder.js` | Google Maps Places integration for nearby stores |
| **Aisle Scanner** | `js/aisle-scanner.js` | Camera-based aisle sign scanning (manual entry MVP) |
| **Categories** | `js/categories.js` | ~300 item dictionary + fuzzy matcher + correction learning |
| **List Input** | `js/list-input.js` | Multi-modal list input: type, voice, photo, paste |
| **Route Engine** | `js/router.js` | Nearest-neighbor + natural-flow route optimization |
| **Store Map** | `js/store-map.js` | SVG bird's-eye map with zones, aisles, animated route |
| **Route View** | `js/route-view.js` | Route screen controller with strategy toggle + stop list |
| **Test Data** | `data/qfc-crown-hill.json` | Pre-built map for QFC Crown Hill, Seattle |

---

## Design Principles

- **Zero typing** — camera, voice, and paste-from-Notes as primary inputs
- **Mobile-first** — 48px min tap targets, bottom-aligned actions, safe area support
- **Cartographic luxury** — warm earth tones, DM Sans/DM Serif Display, subtle animations
- **Manual-first, AI-later** — everything works without AI; intelligence layered on later

---

## Build Sessions

| Session | Status | What |
|---|---|---|
| 1 | ✅ Done | App shell, store editor, storage layer, CSS design system |
| 2 | ✅ Done | List input, category matching, store finder, aisle scanner |
| 3 | ✅ Done | Route optimization algorithm + SVG store map |
| 4 | ⬜ | In-store "Shopping Mode" with check-off + progress |
| 5 | ⬜ | PWA polish (offline, icons, share/import) |
| 6 | ⬜ | Real-world testing at QFC Crown Hill + refinements |

---

## Future Features (Ongoing)

This list is proactively maintained. Items are added as ideas surface during development.

### 🟡 Near-term (Sessions 3–6)
- [x] Route optimization — nearest-neighbor + natural-flow algorithms
- [x] SVG bird's-eye store map with animated route path
- [ ] Shopping Mode — large-text stop-by-stop UI with swipe-to-complete
- [ ] Progress bar during shopping (items checked / total)
- [ ] PWA manifest + service worker for offline support
- [ ] App icons (all iOS sizes)
- [ ] Share/import store maps via JSON files or share sheet
- [ ] "Skip this stop" gesture in shopping mode
- [ ] Haptic feedback on item check-off (Vibration API)

### 🔵 Medium-term (Post-MVP)
- [ ] AI-powered aisle sign reading (OpenAI Vision / Google Vision API)
- [ ] AI category matching to replace/supplement the dictionary
- [ ] Photo-to-list OCR — photograph handwritten list, AI extracts items
- [ ] Voice command refinement — "add 2 pounds of chicken breast"
- [ ] Quantity support — "3x bananas" tracked per item
- [ ] Recipe import — paste a recipe URL, extract ingredients
- [ ] List templates — "Weekly Basics" with preset items
- [ ] Multiple lists — "Costco run" vs "QFC quick trip"
- [ ] Recently added items — quick re-add from history
- [ ] Store hours integration via Google Maps
- [ ] Push notification when near a saved store: "Shopping today?"

### 🟣 Long-term (Crowdsourcing & Scale)
- [ ] Backend + database — move from localStorage to cloud storage
- [ ] User accounts — sign up, sync across devices
- [ ] Community store maps — share maps, browse others' maps
- [ ] Map voting/verification — confirm or flag mappings
- [ ] Auto-update detection — notice layout changes from multiple users
- [ ] Product-level mapping — shelf-level detail from video walkthroughs
- [ ] Store comparison — "Which nearby store has everything on my list?"
- [ ] Affiliate/coupon integration — deals on items in your list
- [ ] Multi-store trip optimization — split list across stores by price/availability
- [ ] Barcode scanning — look up products by UPC

---

## Test Data

The QFC Crown Hill store map (`data/qfc-crown-hill.json`) is auto-loaded on first launch. It includes:
- 10 aisles with real category data
- 6 perimeter zones (Produce, Deli, Bakery, Meat & Seafood, Dairy, Frozen)
- Entrance/exit on the south side

---

## Tech Stack

- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript (no frameworks)
- **Storage**: `localStorage` (no server needed)
- **Maps**: Google Maps Places API (via MCP during development)
- **Typography**: DM Sans + DM Serif Display (Google Fonts)
- **Target**: Mobile Safari on iPhone (also works in Chrome/Firefox)
