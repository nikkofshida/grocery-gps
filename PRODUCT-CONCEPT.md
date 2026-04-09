# GroceryGPS — Product Concept

## One-Liner
A crowdsourced grocery store mapping app that creates optimized shopping routes using AI-powered aisle recognition and community contributions.

---

## The Problem
Grocery shopping is inefficient. You wander back and forth across the store because your list isn't organized by location. Some stores (like Fred Meyer) show aisle numbers online, but there's no route optimization, and most stores offer nothing at all.

## The Solution
GroceryGPS lets anyone map their local grocery store by recording a quick video of the aisle signs. AI reads the signs, maps categories to aisles, and then optimizes your shopping route based on your grocery list. Over time, crowdsourced recordings build detailed, always-current store maps.

---

## How It Works — User Flow

### First-Time Store Mapping (5 minutes)
1. User opens app, selects "Map a New Store"
2. App detects which store via GPS (or user types it in)
3. User walks through the store recording short videos or photos of each aisle sign
4. AI reads the signs: "Aisle 7 — Pasta, Sauces, Canned Vegetables"
5. App creates a category map: Pasta → Aisle 7, Sauces → Aisle 7, etc.
6. Map is saved and shared with the community

### Weekly Shopping (2 minutes)
1. User enters their grocery list (or imports from notes/reminders)
2. App matches items to categories: "spaghetti" → Pasta → Aisle 7
3. App generates the most efficient route through the store
4. User sees a simple ordered list: Stop 1 → Stop 2 → Stop 3...
5. User can remove stops, add items, or reorder on the fly

### Community Contributions (Passive)
1. Other shoppers at the same store submit their own recordings
2. App merges data — confirms existing mapping, catches rearrangements
3. Over time, maps get more detailed (category → section → shelf → product level)
4. Users get notified if their store's map was recently updated

---

## Core Features

### v1 — MVP (What we build first)
- **Manual store map creation** — User defines store name, number of aisles, and categories per aisle (typed, no AI yet)
- **Grocery list input** — Simple text input, one item per line
- **Category matching** — AI matches grocery items to aisle categories
- **Route optimization** — Generates an efficient path through the store
- **Interactive route** — Check off items as you shop, skip/remove stops
- **Store layout** — Simple grid representation of aisles

### v2 — AI Aisle Recognition
- **Photo/video upload** — Take pictures of aisle signs
- **AI sign reading** — Automatically extract categories from aisle signs (using vision AI)
- **Auto-populate store map** — No manual typing needed

### v3 — Crowdsourcing
- **User accounts** — Sign up, save your stores
- **Community store maps** — Share and use maps others have created
- **Map voting/verification** — Confirm or flag incorrect mappings
- **Auto-update detection** — Notice when multiple users report different layouts

### v4 — Deep Mapping
- **Product-level detail** — AI processes shelf videos to identify specific products
- **Search for exact products** — "Where is Barilla angel hair pasta?"
- **Store comparison** — "Which nearby store has everything on my list?"

---

## Key Screens

### 1. Home Screen
- Your stores (list of mapped stores)
- Quick start: "Start Shopping" button
- Community: "Find a Store Map" search

### 2. Store Map Editor
- Grid layout of aisles (numbered)
- Tap an aisle to add/edit categories
- Option to upload photos for AI recognition

### 3. Shopping List
- Text input for items
- Each item shows its matched category and aisle
- Flag items that couldn't be matched (user assigns manually)

### 4. Route View
- Ordered list of stops with aisle numbers
- Estimated item locations per stop
- Checkboxes to mark items as grabbed
- "Skip" button to remove a stop
- Visual map showing the path through the store

---

## Technical Architecture

### Frontend (What users see)
- **Phase 1:** Web app (HTML/CSS/JavaScript) — works on any phone browser
- **Phase 2:** Progressive Web App (PWA) — installable, works offline
- **Phase 3:** Native mobile app (React Native or Swift)

### Backend (Behind the scenes)
- **Database:** Store maps, user lists, community data
- **AI Services:**
  - Text matching (item → category): OpenAI API or local matching logic
  - Image/sign reading: Google Vision API or OpenAI Vision
  - Video frame extraction: FFmpeg (breaks video into photos)
- **Route Algorithm:** Nearest-neighbor or shortest-path through aisle grid

### Data Model
```
Store
  ├── name (e.g., "Fred Meyer — Beaverton")
  ├── location (GPS coordinates)
  ├── layout (grid dimensions, entrance/exit positions)
  └── aisles[]
        ├── number (e.g., 7)
        ├── side_a_categories (e.g., ["Pasta", "Sauces"])
        ├── side_b_categories (e.g., ["Canned Vegetables", "Soup"])
        └── products[] (optional, added over time)
              ├── name
              ├── brand
              ├── position (shelf, section)
              └── last_confirmed (date)

GroceryList
  ├── items[]
  │     ├── name (e.g., "spaghetti")
  │     ├── matched_category (e.g., "Pasta")
  │     ├── matched_aisle (e.g., 7)
  │     └── status (pending / grabbed / skipped)
  └── optimized_route[] (ordered list of aisle stops)
```

---

## What Makes This Different

| Existing Solutions | GroceryGPS |
|---|---|
| Store-specific (only works at Kroger, etc.) | Works at ANY store |
| Requires store cooperation / internal data | Built by shoppers, for shoppers |
| Shows aisle number only | Optimizes your full route |
| No community aspect | Crowdsourced, always improving |
| Static data, gets outdated | Community keeps it fresh |

---

## Monetization Ideas (Future)
- **Free tier:** 1 store, basic routing
- **Premium:** Multiple stores, offline mode, list sharing
- **Store partnerships:** Stores pay to maintain their official map
- **Affiliate/coupons:** "There's a deal on pasta in Aisle 7"

---

## Name Ideas
- GroceryGPS
- AisleMap
- ShopRoute
- CartPath
- GroceryNav
