# Jason's Tea Shop — Warehouse Inventory System

## Planning & MVP Document

---

## 1. Project Overview

**What:** A self-hosted mobile-friendly inventory management app for Jason's Tea Shop — a small business with a few retail tea shop locations and a central warehouse.

**Why:** Replace the previous system (BoxHero) which required ongoing subscription payments. The new system should be free to operate, self-hosted (e.g. on a spare laptop or mini PC), and give full control over data.

**Who:** Tea shop employees and managers who need to track stock moving in and out of the warehouse.

---

## 2. Key Concepts

| Term | Definition |
|---|---|
| **Warehouse** | A physical storage location (e.g. "Main Warehouse", or even a specific shop's back room) |
| **Item** | A product tracked in inventory (e.g. "Jasmine Green Tea — 250g bag") |
| **Stock In** | Adding inventory — receiving a shipment, restocking from supplier |
| **Stock Out** | Removing inventory — taking items to a shop, damaged/expired goods, etc. |
| **Transaction** | A recorded stock-in or stock-out event with quantity, timestamp, who did it, and why |

---

## 3. User Stories (MVP)

### 3.1 Stock Out — Employee Takes Items from Warehouse

> *As a tea shop employee, I want to quickly record items I'm taking from the warehouse so the stock count stays accurate.*

**Flow:**
1. Open the app on my phone
2. Select the warehouse I'm at (or it remembers my last one)
3. Search for the item by name or scan/browse
4. Enter the quantity I'm taking
5. (Optional) Add a note — e.g. "Taking to Downtown shop"
6. Confirm — done in under 30 seconds

**Acceptance Criteria:**
- Stock count for that item decreases by the entered amount
- A transaction record is saved (who, what, how many, when, why)
- App warns if quantity would go below zero
- Works well on a phone screen, even with one hand

---

### 3.2 Stock In — Receiving a Shipment

> *As a warehouse worker, I want to record incoming items while unloading a delivery so everything is accounted for immediately.*

**Flow:**
1. Open the app on my phone
2. Select the warehouse
3. Search for the item
4. Enter the quantity received
5. (Optional) Add a note — e.g. "Spring order from Supplier ABC"
6. Confirm

**Acceptance Criteria:**
- Stock count for that item increases by the entered amount
- A transaction record is saved
- Fast and usable while standing/moving (big buttons, simple flow)

---

### 3.3 View Current Stock

> *As a manager or employee, I want to see what's currently in stock at a warehouse so I know what's available or what needs reordering.*

**Flow:**
1. Open the app
2. Select a warehouse
3. See a list of all items with current quantities
4. Search/filter to find a specific item

**Acceptance Criteria:**
- Shows item name, current quantity, and unit
- Can search by item name
- Shows items sorted alphabetically (with option for low-stock-first)

---

### 3.4 View Transaction History

> *As a manager, I want to see a log of all stock movements so I can audit activity and spot problems.*

**Flow:**
1. Open the app
2. Go to "History" or "Activity"
3. See recent transactions (item, qty, in/out, who, when)
4. Filter by date range, item, or warehouse

**Acceptance Criteria:**
- Displays all stock-in and stock-out records
- Shows who performed each action and when
- Can filter by item or date

---

### 3.5 Manage Items (Admin)

> *As a manager, I want to add new products or edit existing ones so the catalog stays up to date.*

**Flow:**
1. Go to "Items" / "Products" section
2. Add a new item: name, category, unit (e.g. bags, boxes, kg)
3. Edit an existing item's details
4. Deactivate items no longer sold (don't delete — keep history)

**Acceptance Criteria:**
- Can create items with: name, category, unit of measure
- Can edit item details
- Can deactivate (soft-delete) items
- Deactivated items don't show in search but history is preserved

---

### 3.6 Manage Warehouses (Admin)

> *As a manager, I want to add or rename warehouse locations.*

**Acceptance Criteria:**
- Can add a new warehouse with a name and optional address
- Can rename or deactivate a warehouse
- Cannot delete a warehouse that has transaction history

---

### 3.7 User Login

> *As an employee, I want to log in so the system knows who made each transaction.*

**Acceptance Criteria:**
- Simple login (username + password, or PIN for speed)
- Each transaction is tied to the logged-in user
- Manager role can access admin features (manage items, warehouses, users)
- Employee role can only do stock-in, stock-out, and view stock

---

## 4. MVP Feature Summary

### ✅ In MVP (Build This First)

| Feature | Priority | Notes |
|---|---|---|
| Stock Out (remove items) | 🔴 Critical | Core use case |
| Stock In (add items) | 🔴 Critical | Core use case |
| View current stock levels | 🔴 Critical | Need visibility into what's available |
| Search items | 🔴 Critical | Must be fast — employees are busy |
| Select warehouse | 🔴 Critical | Support multiple locations |
| Transaction history log | 🟡 High | Needed for accountability |
| User login (simple) | 🟡 High | Know who did what |
| Manage items (add/edit) | 🟡 High | Catalog needs to be editable |
| Manage warehouses | 🟢 Medium | Rarely changes, can seed via DB initially |
| Role-based access (manager vs employee) | 🟢 Medium | Keep it simple — 2 roles max |

### ❌ NOT in MVP (Future Ideas)

| Feature | Notes |
|---|---|
| Barcode / QR scanning | Nice-to-have, add later |
| Low-stock alerts / notifications | Useful but not day-one critical |
| Reports & analytics (charts, exports) | Can query DB directly at first |
| Multi-warehouse transfers | Track as stock-out + stock-in for now |
| Supplier management | Out of scope for MVP |
| Purchase orders | Out of scope for MVP |
| Photo attachments | Out of scope |
| Offline mode with sync | Stretch goal — depends on network reliability |

---

## 5. System Architecture (Recommended)

### Overview

```
┌──────────────┐        ┌──────────────────┐        ┌────────────┐
│  Mobile App  │◄──────►│   REST API        │◄──────►│  Database  │
│  (Browser)   │  HTTP  │   (Self-hosted)   │        │  (SQLite/  │
│              │        │                   │        │  Postgres) │
└──────────────┘        └──────────────────┘        └────────────┘
     Phone                  Laptop Server              On server
```

### Recommended Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React (Progressive Web App) | Works on any phone browser — no app store needed. Install to home screen. |
| **Backend API** | Node.js + Express *or* Python + FastAPI | Lightweight, easy to deploy on a laptop |
| **Database** | SQLite (simplest) or PostgreSQL | SQLite = zero config, single file. Postgres if you want more power later. |
| **Hosting** | Laptop/mini PC on local network | Free. Accessible via local Wi-Fi. |
| **Auth** | Simple JWT tokens | Lightweight, no external service needed |

### Why a PWA (Progressive Web App)?

- **No app store** — employees just open a URL in their phone browser
- **Installable** — can add to home screen, looks like a native app
- **Cross-platform** — works on Android and iPhone
- **No build/deploy to stores** — just update the server
- **Can work offline** — with service workers (future enhancement)

### Network & Hosting Considerations

- The server (laptop/mini PC) should be on the **same Wi-Fi network** as the shops, or accessible via a simple VPN/tunnel if shops are in different physical locations
- For multiple locations: consider a cheap cloud VPS ($5/month on DigitalOcean/Hetzner) OR use a tunnel like **Tailscale** (free) or **Cloudflare Tunnel** (free) to expose the laptop server securely
- **Backups**: automate daily backup of the SQLite/Postgres database to a USB drive or cloud storage (Google Drive, etc.)
- **UPS**: if using a laptop as server, the battery IS your UPS — a bonus!

---

## 6. Data Model (MVP)

### Users
| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| username | string | Unique |
| password_hash | string | Bcrypt hashed |
| display_name | string | Shown in UI and logs |
| role | enum | 'employee' or 'manager' |
| is_active | bool | Soft delete |

### Warehouses
| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| name | string | e.g. "Main Warehouse" |
| address | string | Optional |
| is_active | bool | Soft delete |

### Items
| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| name | string | e.g. "Jasmine Green Tea 250g" |
| category | string | e.g. "Green Tea", "Accessories" |
| unit | string | e.g. "bags", "boxes", "kg" |
| is_active | bool | Soft delete |

### Stock (Current Levels)
| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| warehouse_id | FK → Warehouses | |
| item_id | FK → Items | |
| quantity | int | Current stock count |
| *(unique constraint on warehouse_id + item_id)* | | |

### Transactions (History Log)
| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| warehouse_id | FK → Warehouses | |
| item_id | FK → Items | |
| user_id | FK → Users | Who did it |
| type | enum | 'in' or 'out' |
| quantity | int | Amount added/removed |
| note | string | Optional reason/context |
| created_at | datetime | Auto-set |

---

## 7. UI Design Principles

Given the context (warehouse workers, possibly carrying boxes, using phones):

- **Big touch targets** — buttons at least 48px, ideally larger
- **Minimal steps** — stock-in/out should be ≤ 4 taps
- **Fast search** — type-ahead search for items, recent items shown first
- **Clear feedback** — green flash for success, red for errors
- **Responsive** — designed for phones first, but works on tablets/laptops too
- **Remember context** — remember last-used warehouse per user
- **High contrast** — readable in bright warehouse lighting

---

## 8. MVP Development Phases

### Phase 1 — Core (Week 1–2)
- [ ] Set up backend API + database
- [ ] User login (simple auth)
- [ ] CRUD for items and warehouses
- [ ] Stock-in and stock-out endpoints
- [ ] Basic mobile UI: login → select warehouse → search item → adjust stock

### Phase 2 — Polish (Week 3)
- [ ] Transaction history view
- [ ] Current stock view with search
- [ ] Role-based access (manager vs employee)
- [ ] Form validation and error handling
- [ ] Deploy to laptop server, test on phones

### Phase 3 — Harden (Week 4)
- [ ] Automated database backups
- [ ] PWA setup (installable, offline shell)
- [ ] Basic logging and monitoring
- [ ] User testing with real employees
- [ ] Fix issues from testing

---

## 9. Open Questions

1. **How many items?** Rough count helps decide if search is enough or if categories/browsing is needed. (~50? ~500? ~5000?)
2. **How many users?** Determines if simple auth is enough. (~5? ~20?)
3. **Network setup:** Are all locations on the same network? If not, we need a tunnel or cloud hosting.
4. **Existing data:** Is there data from BoxHero that needs to be imported?
5. **Units:** Are items always counted in whole numbers, or do some use decimals (e.g. kg)?
6. **Permissions:** Should employees be restricted to certain warehouses?

---

## 10. Success Criteria

The MVP is successful when:
- ✅ An employee can record a stock-out in under 30 seconds
- ✅ A warehouse worker can record incoming stock while unloading
- ✅ A manager can see current stock levels at any warehouse
- ✅ All transactions are logged with who/what/when
- ✅ The system runs on a local machine with zero subscription costs
- ✅ It works reliably on employees' phones via browser

---

*Document created: March 9, 2026*