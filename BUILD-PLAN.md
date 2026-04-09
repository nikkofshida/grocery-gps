# GroceryGPS — Build Plan

## Phase 1: Working Prototype (Web App)

The goal is a functional web app you can open on your phone and actually use
at the grocery store. No AI yet — just manual store mapping + route optimization.

---

### Step 1: Store Map Creator
**What it does:** Let the user define their store layout
- Enter store name
- Set number of aisles
- For each aisle, type in the categories (from the aisle signs)
- Define where the entrance/exit are
- Save to browser storage (localStorage)

**Files:** `index.html`, `store-editor.html`, `css/style.css`, `js/store.js`

---

### Step 2: Grocery List Input
**What it does:** Let the user type their shopping list
- Simple text area — one item per line
- Or add items one at a time with an input field
- Save list to browser storage
- Show the list with checkboxes

**Files:** `list.html`, `js/list.js`

---

### Step 3: Smart Category Matching
**What it does:** Match grocery items to store categories
- Built-in dictionary: "spaghetti" → Pasta, "milk" → Dairy, "chicken" → Meat
- Start with a manual mapping of ~200 common items
- When no match found, let user pick the aisle manually
- Remember user corrections for next time

**Files:** `js/categories.js` (the dictionary), `js/matcher.js`

---

### Step 4: Route Optimization
**What it does:** Calculate the fastest path through the store
- Take the list of aisles the user needs to visit
- Calculate shortest route (nearest-neighbor algorithm)
- Account for entrance/exit positions
- Display as an ordered list of stops

**Files:** `js/router.js`, `route.html`

---

### Step 5: Shopping Mode
**What it does:** The screen you use while actually shopping
- Shows current stop and next stop
- Check off items as you grab them
- Skip a stop if you decide not to get something
- Simple, large-text UI designed for quick glances at your phone

**Files:** `shop.html`, `js/shop.js`

---

### Step 6: Polish & Test
- Test on your actual phone at an actual store
- Fix any usability issues
- Make it look clean and feel smooth
- Add a "share store map" export/import feature (JSON file)

---

## Tech Stack for Phase 1

| Component | Technology | Why |
|---|---|---|
| Frontend | HTML + CSS + JavaScript | Simple, you're learning these already |
| Storage | localStorage | No server needed, data stays on your phone |
| Styling | CSS (no framework) | Keep it simple, learn the fundamentals |
| Hosting | GitHub Pages (free) | Easy to deploy, accessible from phone |

No backend server needed for Phase 1. Everything runs in the browser.

---

## What We Build in Each Session

### Session 1: Project setup + Store Map Creator
- Set up project structure
- Build the store editor UI
- Save/load store data

### Session 2: Grocery List + Category Matching
- Build the list input UI
- Create the category dictionary
- Match items to aisles

### Session 3: Route Optimization + Shopping Mode
- Implement the routing algorithm
- Build the shopping mode UI
- Connect everything together

### Session 4: Polish + Deploy
- Mobile-friendly styling
- Test and fix bugs
- Deploy to GitHub Pages
- Test at a real store!

---

## After Phase 1 — What's Next

Once the manual version works, we add AI and crowdsourcing:

- **Add AI category matching** — Replace the manual dictionary with OpenAI API
  calls that can match ANY item to a category intelligently
- **Add photo recognition** — Upload a photo of an aisle sign, AI reads it
  and populates categories automatically
- **Add a backend** — Move from localStorage to a real database so maps
  can be shared between users
- **Add user accounts** — Sign up, save multiple stores, contribute to
  community maps
- **Add video processing** — Record a walkthrough, AI extracts frames and
  builds the map automatically
