# Backend Planning — Inventory App

## Context From Current Project

- Frontend prototype is already built in `RossPrototype` (Vite + React).
- Primary goal from planning docs: low-cost, self-hosted, mobile-friendly inventory system.
- Core MVP needs: stock in/out, current stock per warehouse, transaction history, manager/employee roles, user accountability.
- Data shape is relational (users, warehouses, items, stock, activity logs).

---

## Backend Options Explored

## Option A: Local Laptop Hosting + Cloudflare Tunnel (`cloudflared`) + SQLite

### Architecture

1. React frontend served from the same machine (or static hosting).
2. Backend API (Node.js + Express/Fastify) runs on local laptop.
3. SQLite file (`.db`) used as relational database.
4. `cloudflared` creates secure HTTPS tunnel so remote shops can access without opening router ports.

### Why It Fits This Project

- Matches your self-hosted, no-subscription preference.
- SQLite is very good for low/medium concurrency with simple operations.
- Relational constraints help keep stock logic correct (foreign keys, transactions, non-negative stock checks).
- Easy backups: copy one DB file on schedule.
- Simple for MVP and easy to reason about during development.

### Pros

- Very low cost (can be near $0).
- Full data ownership and local control.
- Fast to build with your current schema direction.
- Strong consistency for inventory updates.
- No vendor lock-in at data layer.

### Risks / Cons

- Reliability depends on one laptop staying powered and connected.
- Requires basic ops setup (auto-start service, backups, monitoring, updates).
- SQLite is not ideal for high write concurrency at larger scale.
- If tunnel or laptop is down, remote access is down.

### Mitigations

- Use laptop + charger + UPS/battery backup.
- Run backend via process manager (`pm2`, `nssm`, or system service).
- Daily automated backup of `.db` to second location (external drive/cloud storage).
- Weekly restore test of backup.
- Add basic health endpoint (`/health`) and uptime check.

---

## Option B: Firebase (Auth + Firestore)

### Architecture

1. Frontend uses Firebase SDK directly or through thin backend API.
2. Firebase Authentication manages users/login.
3. Firestore stores inventory and activity documents.
4. Security rules enforce role-based access.

### Why It Might Be Attractive

- Fast startup for authentication and hosting.
- Managed infrastructure (less server maintenance).
- Good remote availability by default.

### Pros

- No local server maintenance for core infra.
- Built-in auth and hosted database.
- Easy internet access for multiple locations.
- Good scaling characteristics for moderate growth.

### Risks / Cons for Your Use Case

- Ongoing cost and usage-based billing (can grow unexpectedly).
- Harder to enforce relational inventory invariants compared to SQL.
- Stock operations often require transactions and careful rule logic.
- Vendor lock-in (data model and security rules tied to Firebase ecosystem).
- More complexity for audit-grade history consistency if done frontend-direct.

### Notes If Choosing Firebase

- Prefer Cloud Functions/API layer for stock writes (do not rely on direct client writes for critical inventory).
- Use transactional writes for stock movement and activity log together.
- Design clear role claims (`manager`, `employee`) and rules from day one.

### Firebase Free Tier (Web Research Summary)

Source pages checked: Firebase pricing/calculator, Firestore pricing, Hosting pricing, Authentication limits/pricing (retrieved on 2026-03-16).

- Firestore free quota (Spark): 1 GiB storage, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, 10 GiB/month outbound.
- Firebase pricing calculator view shows equivalent monthly planning values around: 1.5M reads, 600k writes, 600k deletes, 1 GiB storage.
- Firebase Auth (Identity Platform):
	- Tier 1 sign-in providers (email/social/anonymous/phone): first 50,000 MAU at no cost.
	- SAML/OIDC: first 50 MAU at no cost.
	- Phone auth SMS is billed by destination country (example: US/CA shown at about $0.01/SMS), with a small daily free SMS allowance.
- Firebase Hosting free quota: 10 GB storage and 10 GB data transfer per month.
- Cloud Functions free quota (from Firebase pricing calculator): 2,000,000 invocations, 400,000 GB-seconds, 200,000 CPU-seconds, 5 GB egress.

### Estimated Monthly Firebase Cost For This Project

Assumptions for this inventory app:

- Mostly text data, no large media.
- Typical operation writes a small transaction record and updates stock (modeled as 1 to 2 writes).
- Staff view stock/history often (reads usually dominate cost before writes do).
- Region example for Firestore pricing math: `us-central1`.

Firestore unit pricing used for estimate (`us-central1`, beyond free tier):

- Reads: $0.03 per 100,000
- Writes: $0.09 per 100,000
- Deletes: $0.01 per 100,000

#### Scenario 1: Small MVP usage (likely first phase)

- ~15 users, ~20 stock transactions/user/day, moderate browsing.
- Estimated monthly: reads ~300k, writes ~100k, deletes very low.
- Result: stays within free tier => Firestore cost approximately $0/month.

#### Scenario 2: Active small business usage

- ~40 users, ~40 stock transactions/user/day, heavy history/stock checks.
- Estimated monthly: reads ~3.2M, writes ~400k.
- Billable over free: reads ~1.7M.
- Estimated Firestore charge: $(1,700,000 / 100,000) * 0.03 = about $0.51/month.
- Writes still within free 600k equivalent monthly budget.

#### Scenario 3: Heavy usage, many list/history refreshes

- ~100 users, very frequent queries and dashboard refreshes.
- Estimated monthly: reads ~10.9M, writes ~650k.
- Billable over free: reads ~9.4M, writes ~50k.
- Estimated Firestore charge: reads about $2.82 + writes about $0.05 = about $2.87/month (excluding egress/storage overages).

### Cost Risks To Watch (Firebase)

- Realtime listeners can re-read data often; this increases read bill quickly.
- Security rules that use extra document lookups (`get/exists`) can add billable reads.
- Hosting transfer above 10 GB/month bills at published overage rates (pricing page currently shows $0.15/GB for Hosting transfer over free quota on Blaze).
- Phone auth SMS can become meaningful cost depending on country mix.
- Cloud Functions 2nd gen can add charges if min instances are configured or if Cloud Build/Artifact storage accumulates.

### Practical Cost-Control Rules If Using Firebase

1. Prefer paginated reads and `limit` queries for history screens.
2. Avoid unnecessary realtime listeners on wide collections.
3. Add cache headers/service worker for static assets to reduce Hosting transfer.
4. Keep phone auth optional; use email/password for managers and employees where possible.
5. Set Google Cloud budget alerts on day one.

Bottom line: Firebase can be very low cost at your expected MVP scale, but its long-term cost is usage-variable; local `SQLite` remains the most predictable near-zero monthly-cost option.

---

## Side-by-Side Summary

| Area | Local + `cloudflared` + SQLite | Firebase |
|---|---|---|
| Upfront Cost | Very low | Low initially |
| Ongoing Cost | Very low (hardware/power) | Variable monthly billing |
| Data Ownership | Full local control | Cloud-managed by vendor |
| Relational Integrity | Excellent | Requires careful app/rules design |
| Ops Burden | You manage server/backups | Firebase manages infra |
| Offline/LAN Performance | Excellent on local network | Internet-dependent |
| Vendor Lock-in | Low | Medium/High |
| Best For | Small team, cost-sensitive, self-hosted | Teams wanting managed cloud speed |

---

## Recommendation for This Project (MVP)

### Recommended Path: Option A First

Use:

- Backend: Node.js API (Express or Fastify)
- Database: SQLite (current schema is already aligned)
- Access: local network + `cloudflared` for remote shops
- Auth: app-managed JWT with hashed passwords

This best matches your planning goals: free/low-cost, controlled, self-hosted, and reliable inventory logic.

### Re-evaluate Later If Needed

Move to managed cloud (Firebase or PostgreSQL on cloud VM) if:

- concurrent usage grows significantly,
- uptime requirements increase beyond what one laptop can guarantee,
- multiple locations need always-on internet-first architecture,
- team prefers managed operations over self-hosting.

---

## Suggested MVP Backend Scope (Concrete)

1. Implement REST endpoints for:
	- auth/login
	- warehouses/items CRUD (manager)
	- stock transaction create (in/out/adjust)
	- stock levels list
	- activity/history query with filters
2. Enforce stock updates as transactional ledger writes.
3. Add role-based middleware (`manager` vs `employee`).
4. Add backup script and restore instructions before production use.

---

## Open Questions Before Build

1. Expected concurrent users at peak?
2. Number of warehouses and average daily transactions?
3. Is internet reliable at every location?
4. Do you want direct remote internet access required 24/7?
5. Who will maintain backups and machine updates?

These answers can confirm whether Option A remains best or if Firebase/cloud should be chosen earlier.
