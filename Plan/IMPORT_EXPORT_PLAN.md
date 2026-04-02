# Import / Export Feature Plan

## 1) Goal

Add reliable import/export capabilities so inventory data can be:
- backed up during prototype iterations,
- reviewed and edited by humans,
- migrated forward when schema changes.

This plan is designed for the current stack:
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + adapter pattern (`fastapi` / `firebase` / `local`)
- **Current domain models:** users, warehouses, categories, units, items, stock levels, stock transactions

---

## 2) Success Criteria

1. A manager can export app data to a portable, human-readable file set.
2. A manager can import data back into a fresh or updated app instance.
3. Import is safe: validates first, previews issues, and avoids partial corruption.
4. Schema-version mismatches are detectable and recoverable through mapping rules.
5. End-to-end backup/restore can be completed by non-technical staff with a simple SOP.

---

## 3) Primary Use Cases

### UC-1: Routine Backup
As a manager, I export current data weekly and store it externally.

### UC-2: Prototype Reset / Redesign
As the product owner, I wipe/rebuild the prototype database and re-import prior data.

### UC-3: Schema Change Migration
As a developer, I export from schema `v1`, upgrade to `v2`, then import with mapping/transform rules.

### UC-4: Bulk Data Maintenance
As a manager, I edit selected data in spreadsheet format (e.g., items, warehouses) and re-import.

### UC-5: Audit Snapshot
As an admin, I export a snapshot for external review without direct DB access.

---

## 4) Option Research (Formats & Approaches)

## Option A — CSV Pack (multiple CSV files)
**Description:** Export each entity as one CSV file, optionally zipped.

**Pros**
- Very human-readable/editable in Excel/Google Sheets.
- Easy to diff in Git.
- Low implementation complexity.

**Cons**
- Harder to represent nested/complex fields (`attributes_json`).
- Referential integrity issues are common when users edit IDs manually.
- Type fidelity (dates/booleans/enums) can degrade.

**Fit:** Excellent for master/reference data (items, warehouses, units, categories). Moderate for transactional data.

## Option B — XLSX Workbook (multi-sheet Excel)
**Description:** One `.xlsx` containing sheets per entity.

**Pros**
- Best user experience for business users.
- Can include dropdowns, instructions, and data dictionary sheet.
- Keeps a single file artifact.

**Cons**
- Additional backend dependency and parsing complexity.
- Harder to version/diff than CSV.
- Hidden Excel formatting errors can break imports.

**Fit:** Strong for “business-facing” import/edit workflows.

## Option C — Canonical JSON Snapshot
**Description:** Export one structured JSON snapshot with metadata and schema version.

**Pros**
- Highest fidelity to application model.
- Best for migrations and automated tests.
- Easy to include metadata, checksums, and versioning.

**Cons**
- Less comfortable for non-technical editing.
- Large files may be less convenient in spreadsheets.

**Fit:** Best for robust backup/restore and schema evolution.

## Option D — Raw DB File Backup (SQLite `.db` copy)
**Description:** Copy database file as backup.

**Pros**
- Fastest backup/restore.
- Full fidelity, no transformation.

**Cons**
- Not human-readable.
- Tightly coupled to DB schema/version.
- Poor fit for long-term migration across changing models.

**Fit:** Great as emergency fallback, not sufficient as primary prototype migration strategy.

---

## 5) Recommended Strategy (Hybrid)

Adopt a **2-track approach**:

1. **Canonical JSON Snapshot** as the source of truth for backup/restore and migration.
2. **Spreadsheet-friendly package** (CSV first, optional XLSX later) for human review/editing.

### Why this is best for your prototype
- You get reliability for schema changes (JSON + versioning).
- You still support business-friendly edits (CSV/XLSX).
- The same import pipeline can support both by converting CSV/XLSX → canonical internal model.

---

## 6) Proposed Export/Import Scope (v1)

## Entities in scope
- `warehouses`
- `categories`
- `units`
- `items`
- `stock_levels`
- `stock_transactions` (optional toggle: include history or not)
- `users` (without PIN hashes by default; security-sensitive)

## Out of scope in first cut
- Full auth credential migration via plaintext import.
- Cross-provider live sync.

---

## 7) Data Contract Proposal

## Snapshot metadata
Each export includes:
- `export_version` (format version, e.g. `1.0`)
- `app_schema_version` (backend schema migration tag)
- `exported_at` (UTC ISO timestamp)
- `exported_by` (user id/name)
- `provider` (`fastapi` / `firebase` / `local`)
- `entity_counts`
- `checksum` (optional in v1, recommended in v2)

## Canonical ID strategy
Use stable business keys where possible during import matching:
- Warehouse: `name` (or explicit `external_id` later)
- Item: preferred `sku`; fallback `name`
- Category/Unit: `name`
- User: `username`

For safety, import should support:
- **Upsert mode** (match then update/insert)
- **Insert-only mode**
- **Replace mode** (admin-only, high risk)

---

## 8) Import Modes

1. **Dry Run (required default):**
   - Parse + validate + resolve references
   - No DB writes
   - Return warnings/errors summary

2. **Commit Import:**
   - Executes transactionally
   - Either all-or-nothing in strict mode
   - Optional per-entity transactional batches in relaxed mode

3. **Merge vs Replace toggle:**
   - Merge for normal use
   - Replace only for controlled migration scenarios

---

## 9) Validation Rules

## Structural validation
- Required sheets/files exist.
- Required columns exist.
- Enum values valid (`stock_in`, `stock_out`, etc.).
- Date/time parseable.

## Domain validation
- No negative `stock_levels.quantity`.
- `stock_transactions.delta != 0`.
- References exist (`item_id`, `warehouse_id`, etc.).
- Unique constraints respected (e.g., `items.sku`, `users.username`).

## Safety validation
- Role check: manager/admin only.
- Max file size limits.
- Row limits per import run.
- Malware-safe parser handling for uploaded files.

---

## 10) Schema Evolution Plan

To survive frequent prototype schema changes:

1. Add `app_schema_version` to exports.
2. Maintain import transformers:
   - `transform_v1_to_v2(payload)`
   - `transform_v2_to_v3(payload)`
3. Chain transforms at import time until current schema is reached.
4. Keep a migration changelog in `Plan` with field rename/deprecation rules.

### Example evolution handling
- `item.unit` (string) in old export -> map to `unit_id` by unit name.
- Renamed field `warehouse.location` -> `warehouse.address`.

---

## 11) API + UI Planning (Implementation Direction)

## Backend endpoints (proposed)
- `POST /api/v1/data/export`  
  Returns downloadable archive (JSON/CSV and metadata).
- `POST /api/v1/data/import/dry-run`  
  Upload file(s), validate, return report.
- `POST /api/v1/data/import/commit`  
  Commit import using validated payload.
- `GET /api/v1/data/import/jobs/{id}` (optional if async later).

## Frontend UX (proposed)
Add a **Data Management** section in manager area:
- Export buttons:
  - “Export Snapshot (JSON)”
  - “Export Spreadsheet (CSV)”
- Import flow wizard:
  1. Upload file
  2. Preview summary (records, warnings, errors)
  3. Select mode (merge/replace, include history yes/no)
  4. Confirm with explicit warning
  5. Show result report + downloadable error file

---

## 12) Security & Compliance Considerations

- Restrict import/export to manager role.
- Log every import/export in `admin_audit_log` with metadata.
- Do not export sensitive secrets by default.
- For user data:
  - Export usernames/display names/roles/is_active
  - Handle PIN reset separately after import (or optional hashed migration only for trusted admin paths).
- Add anti-CSRF/auth protections according to current JWT session model.

---

## 13) Rollout Phases

## Phase 1 (MVP for prototype safety)
- Canonical JSON export + import dry-run + commit.
- Manager-only access.
- Basic validation + transaction safety.
- Audit log entries.

## Phase 2 (business-friendly editing)
- CSV pack export/import.
- Column templates and validation messages.
- Merge mode improvements and conflict reports.

## Phase 3 (advanced)
- XLSX workbook support.
- Async import jobs for larger files.
- Checksums/signatures and backup scheduling.

---

## 14) QA / Test Plan

1. Export then re-import into empty DB -> data parity checks.
2. Export from old schema, import into upgraded schema -> transformation passes.
3. Invalid file tests -> clear errors, no writes.
4. Permission tests -> non-manager blocked.
5. Large file test near limit.
6. Partial failure simulation -> rollback verified.

---

## 15) Risks & Mitigations

- **Risk:** User-edited spreadsheet breaks references.  
  **Mitigation:** dry-run required + error report + key-based matching.

- **Risk:** Schema churn makes old exports unusable.  
  **Mitigation:** versioned transforms + migration changelog.

- **Risk:** Sensitive user credentials leak.  
  **Mitigation:** exclude PIN hashes by default; require reset workflow.

- **Risk:** Large imports block API.  
  **Mitigation:** file limits now; async job queue later.

---

## 16) Recommended Decision

Proceed with **Phase 1 now** using **Canonical JSON snapshot import/export** as the dependable foundation.  
Then implement **CSV package support in Phase 2** for human-editable workflows.

This gives the prototype team immediate backup/migration safety without overengineering the first release.

---

## 17) Open Questions

1. Should transaction history be included by default, or only current stock snapshot?
2. Do you want user accounts imported with roles only, then PIN reset after import?
3. Should “replace mode” be available in UI, or CLI/admin-only?
4. Is cross-provider portability (`local`/`firebase`/`fastapi`) required in v1, or fastapi-only first?
5. What is acceptable max import size for your deployment environment?

---

## 18) Next Step (After Plan Approval)

Create a technical design spec with:
- exact file schemas (JSON + CSV columns),
- endpoint request/response contracts,
- validation error code catalog,
- implementation task breakdown for backend + frontend.
