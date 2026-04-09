# Item Visual Selection Feature Research

**Date:** 2026-04-08  
**Scope:** Frontend + FastAPI backend current state, option analysis, and recommendation for item icon/image selection in admin item creation/edit flows.

---

## 1) Problem Statement

In the UI, items display a visual marker (`emoji` + colored tile), but admins currently cannot explicitly choose that visual during item creation/edit.

This creates:
- inconsistent item identity cues,
- a mismatch between prototype polish and admin authoring capability,
- unclear path for long-term visuals (emoji/icon vs uploaded photos).

---

## 2) Current State (Codebase Findings)

## 2.1 Where visuals are rendered

- `Frontend/src/pages/StockPage.jsx`
  - Uses `item.color` as tile background and `item.emoji` as displayed symbol.
- `Frontend/src/pages/HistoryPage.jsx`
  - Uses `item?.emoji || '📦'` in transaction cards.

## 2.2 Data sources by backend provider

### Local/Firebase adapters
- `Frontend/src/services/backend/localBackend.js`
- `Frontend/src/services/backend/firebaseBackend.js`

These providers can carry `emoji`/`color` in item objects (seed data includes rich visuals in `Frontend/src/data/mockData.js`).

### FastAPI adapter
- `Frontend/src/services/backend/fastapiBackend.js`

`mapItem(...)` currently hardcodes every item to:
- `emoji: '📦'`
- `color: '#e5e7eb'`

Also, item create/edit calls do not send visual fields to the backend.

## 2.3 Backend schema capability

FastAPI item model supports `attributes_json`:
- `Backend/fastapi_backend/app/models.py` (`Item.attributes_json`)
- `Backend/fastapi_backend/app/schemas.py` (`ItemCreate/ItemUpdate/ItemRead` include `attributes_json`)

This means there is already a structured place to store visual metadata **without schema migration**.

## 2.4 Import/export compatibility

Data IO already includes item `attributes_json`:
- `Backend/fastapi_backend/app/services/data_io_service.py`

So if visuals are stored in `attributes_json`, import/export can preserve them with little additional contract churn.

---

## 3) Product & Technical Constraints

- App is mobile-first and intended for quick warehouse actions.
- Existing visual pattern is lightweight (emoji + color chip).
- Backend providers are abstracted; ideal feature should work consistently across:
  - `fastapi`
  - `firebase`
  - `local`
- Current bundle already has size warnings; avoid large new dependencies unless needed.
- Team is actively iterating on MVP admin CRUD and inventory reliability.

---

## 4) Solution Options

## Option A — Curated Emoji/Icon Picker (Recommended for MVP)

### What it is
Admin chooses from a predefined set of icons (emoji or app-defined icon tokens) and optional color when creating/editing an item.

### Data approach
Persist as item metadata, e.g.:

```json
{
  "visual": {
    "kind": "emoji",
    "value": "🍵",
    "bgColor": "#86efac"
  }
}
```

Stored in:
- FastAPI: `items.attributes_json.visual`
- Local/Firebase: either same nested shape, or mapped to existing top-level `emoji`/`color` while preserving compatibility.

### Pros
- Very low implementation complexity.
- Fast on mobile; no file upload workflow.
- No storage/CDN infrastructure needed.
- Works offline/local provider easily.
- Aligns with existing UI pattern.

### Cons
- Less expressive than real product photos.
- Icon set curation is needed.

### Estimated effort
Low to medium.

---

## Option B — Upload Product Image (File Upload)

### What it is
Admin uploads item thumbnail/photo during create/edit.

### Required architecture changes
- **FastAPI path**:
  - file upload endpoint(s),
  - image validation/resizing,
  - persistent media storage strategy,
  - URL serving + cache strategy,
  - backup/export implications.
- **Firebase path**:
  - Firebase Storage integration + security rules.
- **Local path**:
  - local file persistence and URL generation.

### Pros
- Best visual fidelity.
- Useful for user recognition when SKUs/items are similar.

### Cons
- Significantly higher complexity.
- Security/performance concerns (file validation, size constraints, malware risk).
- Cross-provider consistency is much harder.
- Adds operational burden for self-hosted deployments.

### Estimated effort
Medium to high.

---

## Option C — Hybrid (Icon Picker now, Image Upload later)

### What it is
Implement Option A immediately, but design data contract to support future image references.

Example future-proof visual schema:

```json
{
  "visual": {
    "kind": "emoji",
    "value": "🍵",
    "bgColor": "#86efac",
    "imageUrl": null
  }
}
```

Later switch `kind` to `image` when image upload is introduced.

### Pros
- Delivers immediate UX value quickly.
- Avoids blocking on storage architecture.
- Keeps migration path clean.

### Cons
- Requires discipline to preserve contract compatibility.

### Estimated effort
Low now, medium later.

---

## 5) Best Solution

**Recommended path: Option C (Hybrid), starting with Option A now.**

Reasoning:
- Solves the user pain immediately (pickable visual in create/edit).
- Fits MVP velocity and current architecture.
- Minimizes infrastructure risk.
- Leverages existing `attributes_json` support in FastAPI for clean persistence.
- Preserves future path for image upload when operational readiness exists.

---

## 6) Implementation Blueprint (Phase 1: Icon Picker)

## 6.1 UI changes

In item create/edit modals (`Frontend/src/pages/ManagePage.jsx`):
- Add visual section:
  - icon grid (curated set, e.g. 24–40 options),
  - optional color swatches (8–12 preset colors),
  - preview tile.
- Keep defaults (`📦`, neutral color) for fast entry.

## 6.2 Frontend model normalization

Standardize item visuals in one helper mapping layer:
- Source precedence:
  1. `attributes_json.visual`
  2. legacy `emoji`/`color`
  3. defaults

This avoids provider divergence.

## 6.3 Adapter updates

- `fastapiBackend.js`
  - read visual metadata from `attributes_json` in `mapItem`.
  - include `attributes_json.visual` in add/edit item payloads.

- `localBackend.js` / `firebaseBackend.js`
  - persist a matching `attributes_json.visual` shape (can still mirror to `emoji`/`color` for backward compatibility).

## 6.4 Data migration behavior

For existing items without visual metadata:
- auto-fallback to default visual,
- optional one-time migration script can infer icons by category later (non-blocking).

## 6.5 QA checklist

- Create item with selected icon/color in each backend mode.
- Edit item visual and confirm it updates in:
  - stock list cards,
  - history cards.
- Export/import preserves visuals via `attributes_json`.
- Default fallback still works for old records.

---

## 7) Future Phase (Optional Image Upload)

When ready for photos, add:
- `visual.kind = 'image'`, `visual.imageUrl`.
- image constraints:
  - max size (e.g. 1 MB),
  - allowed mime types (`image/png`, `image/jpeg`, `image/webp`),
  - dimension normalization (thumbnail).
- secured upload/serving path per provider.

Important: keep emoji/icon fallback when image missing/broken.

---

## 8) Risks & Mitigations

- **Risk:** Visual data inconsistency across providers.  
  **Mitigation:** normalize to `attributes_json.visual` contract in all adapters.

- **Risk:** Extra clicks in item creation.  
  **Mitigation:** sensible defaults + optional visual section.

- **Risk:** Bundle growth from adding icon libraries.  
  **Mitigation:** start with emoji set or minimal in-app token list; avoid heavy assets initially.

---

## 9) Decision Summary

- **Short term (now):** implement curated icon picker + color preset, persisted in `attributes_json.visual`.
- **Medium term:** keep contract ready for image upload.
- **Long term (optional):** add photo upload once storage/security/ops approach is selected.

This gives the best balance of user value, implementation speed, and architectural safety for the current project stage.
