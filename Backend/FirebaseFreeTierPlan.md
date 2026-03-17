# Firebase Free-Tier Setup Plan (No Payment Info)

## Goal

Build and test the inventory backend on Firebase **without adding any billing/payment method**.

This plan is designed for experimentation and MVP validation while staying on the **Spark (free) plan**.

---

## Hard Constraints (To Stay Free)

1. Use Firebase **Spark plan only**.
2. Do **not** enable Blaze billing.
3. Avoid features that require billing-enabled projects.
4. Keep reads/writes low with pagination and targeted queries.
5. Prefer email/password auth first (avoid paid SMS verification usage).

---

## What You Can Use on Spark (Free)

- **Authentication**
  - Email/password and social sign-in are suitable for testing.
  - Up to generous no-cost MAU limits for Tier 1 providers.
- **Cloud Firestore**
  - Free quota includes 1 GiB storage and daily read/write/delete limits.
- **Hosting**
  - Useful for deploying frontend prototype with free storage + transfer caps.
- **Local Emulator Suite**
  - Best for unlimited local development without consuming cloud quota.

## What to Avoid for No-Payment Setup

- Any feature requiring billing-enabled project (for example some advanced Firestore operations like PITR/backups/restore/clone).
- Designing around always-on Cloud Functions for core logic in early no-card setup.
- SMS-heavy phone auth experiments.

---

## Recommended Architecture (Experiment Phase)

### Phase 1: “Backendless Core” on Firebase

Use:

- React frontend (`RossPrototype`) + Firebase Web SDK
- Firebase Auth for login
- Firestore for data + transaction history
- Firestore Security Rules for authorization

This gives you backend behavior without running your own API server yet.

### Phase 2 (Optional): Add a Local Backend Server

If you need stricter server-side control while still spending $0:

- Run local Node API on your laptop (same as your existing local-hosting concept)
- API verifies Firebase ID tokens
- API writes to Firestore using Admin SDK

This hybrid approach keeps Firebase as data/auth platform while preserving strict business logic in your own backend.

---

## Data Model Plan in Firestore

Use flat collections with predictable IDs.

### Collections

- `users/{uid}`
  - `username`, `email`, `role` (`manager` or `employee`), `isActive`, `createdAt`
- `warehouses/{warehouseId}`
  - `name`, `location`, `isActive`, `createdAt`
- `items/{itemId}`
  - `name`, `description`, `sku`, `category`, `unit`, `isActive`, `createdAt`
- `stockLevels/{warehouseId_itemId}`
  - `warehouseId`, `itemId`, `quantity`, `updatedAt`
- `stockTransactions/{txId}`
  - `warehouseId`, `itemId`, `delta`, `reason`, `note`, `userId`, `createdAt`
- `adminAuditLog/{logId}`
  - `action`, `entityType`, `entityId`, `userId`, `createdAt`, `details`

### Write Pattern (Important)

For stock in/out, perform a Firestore transaction that:

1. Reads `stockLevels/{warehouseId_itemId}`
2. Validates `quantity + delta >= 0`
3. Updates stock level
4. Creates `stockTransactions` record

This is your core inventory integrity rule.

---

## Security Rules Plan (Minimum)

1. Require authentication for all reads/writes.
2. Managers can manage users/items/warehouses.
3. Employees can only:
   - read stock/items/warehouses
   - create stock transactions (through controlled fields)
4. Prevent clients from writing privileged fields directly (for example role changes).

### Rule Strategy

- Keep user roles in `users/{uid}`.
- In rules, fetch the caller role from that document.
- Deny direct user role elevation by clients.

---

## Step-by-Step Setup Plan

## 1) Create Firebase project (Spark)

- Create project in Firebase Console.
- Ensure plan is Spark and no billing is added.

## 2) Add web app configuration

- Register web app.
- Save `firebaseConfig` values into frontend env file.

## 3) Initialize Firebase in repo

Use `firebase-tools` and initialize only what you need first:

- Firestore
- Auth
- Hosting (optional now)
- Emulators (recommended)

## 4) Implement MVP auth + role seed

- Add email/password login.
- On first setup, create one manager user profile document.

## 5) Implement stock transaction flow with Firestore transaction

- All stock in/out goes through transaction logic.
- Add history list with pagination.

## 6) Add security rules + test in emulator

- Write rules before production use.
- Test manager and employee paths.

## 7) Deploy minimal test version

- Deploy frontend + Firestore rules/indexes.
- Keep quotas monitored weekly.

---

## Cost-Control Checklist (Operational)

- Use pagination (`limit`) on history and stock pages.
- Avoid broad realtime listeners on large collections.
- Use specific document reads instead of repeated full-collection scans.
- Add client-side cache for static assets.
- Prefer email/password over phone SMS auth.
- Monitor usage dashboards weekly.

---

## Backend System Decision Guidance

### If this is just experiment/MVP validation

Use Firebase directly from frontend with strict rules and transaction logic.

### If you need stricter business control soon

Add a local Node backend as gatekeeper for stock writes while still using Firebase Auth + Firestore.

This gives you a more traditional backend architecture without requiring paid cloud services.

---

## Suggested 2-Week Execution Plan

### Week 1

- Project setup (Spark)
- Auth + user profile documents
- Items/warehouses CRUD
- Initial security rules

### Week 2

- Transaction-safe stock in/out
- Activity/history with pagination
- Role restrictions hardening
- Deploy test build + quota monitoring

---

## Exit Criteria (No-Cost Experiment Success)

1. Manager can create items/warehouses/users.
2. Employee can record stock in/out safely.
3. Negative stock is blocked via transaction logic.
4. History shows who/what/when for all stock movements.
5. Monthly usage trend remains inside Spark quotas.
