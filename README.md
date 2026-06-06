# Couples Food System

> A progressive web app for couples to share a kitchen, a grocery list, and a meal plan — in real time.

**Status:** Full MVP complete. Guided first-run experience (6-step wizard for Partner 1, code-join for Partner 2). Three pillars: Shopping List (real-time sync, offline queue, "Your regulars"), Pantry (natural language input, "Move to Pantry"), Meals (AI generation, weekly planning, saved recipe library). Adaptive cooking ("one prep, two plates") with body profiles and TDEE. PWA installable. See [Roadmap](#roadmap) for what's parked.

---

## What this is

A two-package monorepo:

- **`worker/`** — Cloudflare Worker (Hono) with two Durable Objects (`HouseholdSync` for real-time grocery data, `InviteStore` for invite codes). Each couple gets their own DO instance — one source of truth, sub-100ms sync between partners.
- **`frontend/`** — React 19 + Vite + TypeScript + Tailwind. Installable PWA. Two onboarding flows (create a kitchen / join with a code). The "we" language of the brand runs through the copy.

The brand follows the [source-of-truth spec](https://couples-food-system.com/source-of-truth): cream / sage / terracotta palette, Inter typeface, partner color coding (sage for slot 1, terracotta for slot 2).

---

## Quick start

You need **Node.js 22+** and a terminal. No Cloudflare account required for local dev.

```bash
# 1. Install the worker
cd worker
npm install

# 2. Install the frontend (in a second terminal)
cd ../frontend
npm install
```

Then start both, each in its own terminal:

```bash
# Terminal 1 — backend on http://localhost:8787
cd worker
npm run dev

# Terminal 2 — frontend on http://localhost:5173
cd frontend
npm run dev
```

Open `http://localhost:5173`. You'll see the onboarding flow:

1. **"Start our kitchen"** — give yourself a name, get a 6-digit invite code.
2. Copy that code. Open a second browser window (or an incognito window, or your phone on the same Wi-Fi).
3. **"Join my partner"** in the second window — paste the code, give yourself a name.
4. Both windows now share the same kitchen. Add an item in one. It appears in the other in under 100ms.

The header dot turns **green** when the WebSocket is live, **terracotta** when reconnecting, **red** when offline.

---

## Project structure

```
couples-food-system/
├── worker/                         # Cloudflare Worker (Hono)
│   ├── src/
│   │   ├── index.ts                # Hono routes, /api/household/*
│   │   ├── env.d.ts                # Cloudflare binding types
│   │   ├── durable-objects/
│   │   │   ├── HouseholdSync.ts    # The per-couple DO. SQLite + WebSocket.
│   │   │   └── InviteStore.ts      # Singleton DO for invite codes.
│   │   └── lib/
│   │       └── jwt.ts              # sign/verify with jose
│   ├── wrangler.toml               # DO + JWT_SECRET config
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                       # React 19 + Vite + Tailwind PWA
│   ├── src/
│   │   ├── main.tsx                # React + Query + Router entry
│   │   ├── App.tsx                 # Routes, auth gate
│   │   ├── index.css               # Tailwind + base styles
│   │   ├── env.d.ts                # Vite env types
│   │   ├── types/
│   │   │   └── grocery.ts          # GroceryItem, SyncEvent, Category
│   │   ├── lib/
│   │   │   ├── api.ts              # apiFetch() with auth header
│   │   │   └── categories.ts       # classify() + QUICK_ADD
│   │   ├── stores/
│   │   │   └── authStore.ts        # Zustand + localStorage persist
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # create/join household helpers
│   │   │   └── useGroceryList.ts   # TanStack Query + WS subscription
│   │   ├── pages/
│   │   │   ├── Onboarding.tsx      # Welcome / Create / Join / Created
│   │   │   ├── MainApp.tsx         # Header + bottom nav shell
│   │   │   ├── ShoppingTab.tsx     # The grocery list UI
│   │   │   ├── PantryTab.tsx       # placeholder
│   │   │   └── MealPlanTab.tsx     # placeholder
│   │   └── components/
│   │       ├── ShoppingList.tsx
│   │       ├── CategorySection.tsx
│   │       ├── ItemRow.tsx
│   │       ├── PartnerDot.tsx
│   │       ├── AddItemForm.tsx
│   │       ├── QuickAddChips.tsx
│   │       └── SyncIndicator.tsx
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icon-source.svg         # Source for generated icons
│   │   ├── icon-192.png            # Generated
│   │   ├── icon-512.png            # Generated
│   │   └── apple-touch-icon.png    # Generated
│   ├── scripts/
│   │   └── generate-icons.mjs      # `npm run icons`
│   ├── vite.config.ts              # Vite + PWA plugin
│   ├── tailwind.config.js          # Brand colors
│   ├── tsconfig.json
│   └── package.json
│
└── README.md                       # You are here
```

---

## API reference

All endpoints are under `/api/`. Auth is `Authorization: Bearer <jwt>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/household/create` | Create a new household. Body: `{ displayName }`. Returns `{ householdId, inviteCode, token, partner }`. |
| `POST` | `/api/household/join` | Join with a code. Body: `{ inviteCode, displayName }`. Returns `{ householdId, token, partner }`. |
| `GET` | `/api/household/:id/items` | List all grocery items for the household. |
| `POST` | `/api/household/:id/items` | Add an item. Body: `{ name, category, addedByPartnerId, addedByPartnerSlot }`. |
| `PATCH` | `/api/household/:id/items/:itemId/toggle` | Toggle an item's checked state. |
| `DELETE` | `/api/household/:id/items/:itemId` | Delete an item. |
| `GET` | `/api/household/:id/ws` | WebSocket upgrade. Query: `?token=…&partnerId=…&slot=1|2`. Server pushes `item_added` / `item_toggled` / `item_deleted` events. |

### Sync event format

```ts
type SyncEvent =
  | { type: 'hello'; partnerId: string; slot: 1 | 2; at: number }
  | { type: 'item_added'; item: GroceryItem }
  | { type: 'item_toggled'; item: GroceryItem }
  | { type: 'item_deleted'; id: string };
```

### Quick curl example

```bash
# Create a household
curl -X POST http://localhost:8787/api/household/create \
  -H 'content-type: application/json' \
  -d '{"displayName":"Alex"}'

# Add an item (replace TOKEN with the value from above)
curl -X POST http://localhost:8787/api/household/<householdId>/items \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"milk","category":"Dairy","addedByPartnerId":"<partnerId>","addedByPartnerSlot":1}'
```

---

## Available scripts

### Worker (`worker/`)

| Command | What it does |
|---|---|
| `npm run dev` | Run the worker locally on `http://localhost:8787`. |
| `npm run deploy` | Deploy to Cloudflare. Requires `wrangler login` first. |
| `npm run typecheck` | TypeScript check, no emit. |
| `npm run tail` | Tail the deployed worker's logs. |

### Frontend (`frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:5173` with hot reload. |
| `npm run build` | TypeScript check + production build to `dist/`. |
| `npm run preview` | Serve `dist/` locally (smoke test the production bundle). |
| `npm run typecheck` | TypeScript check, no emit. |
| `npm run icons` | Regenerate PWA icons from `public/icon-source.svg`. |

---

## Deployment

When you're ready to put this on the public internet (not Step 1, but later):

1. **Worker**
   - `cd worker && npx wrangler login`
   - `npm run deploy` — wrangler prints a URL like `https://couples-food-system-api.<your-subdomain>.workers.dev`.

2. **Frontend**
   - Create a Cloudflare Pages project pointing at this repo.
   - Build command: `npm run build`
   - Build output: `frontend/dist`
   - Environment variables:
     - `VITE_API_URL` = your worker URL
     - `VITE_WS_URL` = same URL but with `wss://`

3. **Production JWT secret** — in `worker/wrangler.toml`, replace `JWT_SECRET = "dev-secret-change-me-in-production"` with a real secret (or use `wrangler secret put JWT_SECRET`). The current value is unsafe for production.

---

## Step 1 acceptance test

Run this before moving to Step 2. If any item fails, fix it before continuing.

- [ ] `cd worker && npm run dev` — Wrangler starts on `http://127.0.0.1:8787`. No errors in the console.
- [ ] `cd frontend && npm run dev` — Vite starts on `http://localhost:5173`. The cream-colored onboarding screen loads.
- [ ] **Create a household** in tab A: enter a name, see a 6-digit invite code, continue to the shopping list.
- [ ] **Join the household** in tab B (incognito window or different device on same Wi-Fi): enter the code, enter a name, land on an empty shopping list.
- [ ] **Add an item** in tab A (e.g., "Milk"). Watch it appear in tab B in **under 1 second** (target: <100ms).
- [ ] **Check off** the item in tab B. Watch tab A update instantly.
- [ ] **Delete** the item in either tab. It disappears in the other.
- [ ] **Refresh** tab A. The list is still there (persisted in DO SQLite).
- [ ] **Close and reopen** the browser entirely. You're still signed in (token persisted in `localStorage` under `cfs.auth`).
- [ ] **The header dot is green** when both windows are focused; it briefly turns terracotta when the WS is reconnecting; red when the network is killed.
- [ ] **Brand colors render**: cream background, sage primary buttons and tab indicator, terracotta for partner 2's dot, Inter font.
- [ ] `cd frontend && npm run build` — production build completes. `dist/manifest.webmanifest` exists. `dist/sw.js` exists.
- [ ] `cd worker && npx wrangler deploy --dry-run` — compiles cleanly. Both Durable Objects (`HOUSEHOLD_SYNC`, `INVITE_STORE`) are listed in the bindings.

When all 12 pass, **Step 1 is done. Tell the assistant you're ready for Step 2.**

---

## Roadmap

This is **Step 1 of 7** in the [product development plan](../Cupla%20Market_Gap/Product_Development_Steps.md).

- [x] **Step 1** — Shared grocery list with real-time sync
- [x] **Step 2** — PWA install + mobile polish + offline support
- [x] **Step 3** — Partner profiles + D1 database
- [x] **Step 4** — Pantry tracking
- [x] **Step 5** — AI meal generation
- [x] **Step 6** — Meal calendar + smart grocery
- [x] **Step 7** — Adaptive shared cooking (the moat)
- [ ] **Step 4** — Pantry tracking
- [ ] **Step 5** — AI meal generation
- [ ] **Step 6** — Meal calendar + smart grocery
- [ ] **Step 7** — Adaptive shared cooking (the moat)

Each step is independently shippable.

---

## Troubleshooting

**"Port 8787 already in use"** — another `wrangler dev` is running, or another app. Find and kill it, or run `wrangler dev --port 9000` and update the frontend's `VITE_API_URL` to match.

**"Port 5173 already in use"** — same idea. Run `npm run dev -- --port 5174`.

**The header dot stays terracotta or red** — the WebSocket can't connect. Check:
- Is the worker still running in its terminal? (Look for any errors.)
- Did you change `VITE_API_URL` or `VITE_WS_URL`? They must point at the same place the worker is running.
- Open DevTools → Network → WS. Click on the connection. If the status is "failed," the URL is wrong. If it connects, the issue is elsewhere.

**"401 Unauthorized" on every request** — your JWT expired (30 days) or the worker was restarted with a different `JWT_SECRET`. Sign out and back in.

**Two tabs don't sync** — they need to be in the same household. The code on the join screen must match an existing household. Open the create-household screen in tab A to see the code, then enter that exact code in tab B.

**Icons missing in `dist/` after build** — run `npm run icons` in `frontend/` to regenerate them from the SVG.

**"Cannot find module '../stores/authStore'"** — you moved a file without updating the import. Check the import path: from `src/`, stores are at `./stores/authStore`.

---

## License

MIT.
