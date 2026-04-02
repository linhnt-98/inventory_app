# Import / Export Technical Specification

## Document Info
- Feature: Import / Export for backup + migration
- Date: 2026-04-01
- Status: Draft for implementation
- Related: `Plan/IMPORT_EXPORT_PLAN.md`

---

## 1) Scope (Phase 1)

Phase 1 delivers a reliable, backend-first workflow:
- Canonical JSON snapshot export
- Canonical JSON import (dry-run + commit)
- Manager-only authorization
- Validation report and atomic commit behavior
- Audit logging for import/export actions

Not in Phase 1:
- XLSX parsing
- Async job queue
- Cross-provider automatic conversion (`firebase`/`local`)

---

## 2) Canonical Snapshot Format (JSON)

## 2.1 File shape

```json
{
  "meta": {
    "export_version": "1.0",
    "app_schema_version": "2026-04-fastapi-v1",
    "exported_at": "2026-04-01T12:00:00Z",
    "exported_by": {
      "user_id": 1,
      "username": "manager1",
      "display_name": "Manager"
    },
    "provider": "fastapi",
    "options": {
      "include_transactions": true,
      "include_users": true,
      "include_user_credentials": false
    },
    "entity_counts": {
      "users": 4,
      "warehouses": 3,
      "categories": 6,
      "units": 8,
      "items": 120,
      "stock_levels": 210,
      "stock_transactions": 1500
    },
    "checksum": null
  },
  "data": {
    "users": [],
    "warehouses": [],
    "categories": [],
    "units": [],
    "items": [],
    "stock_levels": [],
    "stock_transactions": []
  }
}
```

## 2.2 Entity schemas

### `users[]`
```json
{
  "username": "alex",
  "display_name": "Alex",
  "role": "manager",
  "is_active": true,
  "created_at": "2026-03-28T10:11:12Z",
  "updated_at": "2026-03-28T10:11:12Z"
}
```
Notes:
- Exclude `pin_hash` by default.
- Optional trusted-mode field for future: `pin_hash` (off by default).

### `warehouses[]`
```json
{
  "name": "Main Warehouse",
  "address": "123 Tea St",
  "lat": 47.6205,
  "lng": -122.3493,
  "is_active": true
}
```

### `categories[]`
```json
{
  "name": "Green Tea",
  "is_active": true
}
```

### `units[]`
```json
{
  "name": "bag",
  "is_active": true
}
```

### `items[]`
```json
{
  "name": "Jasmine Green Tea 250g",
  "description": "Floral green tea",
  "sku": "TEA-JAS-250",
  "category_name": "Green Tea",
  "unit_name": "bag",
  "attributes_json": {
    "origin": "Taiwan",
    "caffeine": "medium"
  },
  "is_active": true
}
```

### `stock_levels[]`
```json
{
  "warehouse_name": "Main Warehouse",
  "item_sku": "TEA-JAS-250",
  "item_name": "Jasmine Green Tea 250g",
  "quantity": 42,
  "last_updated_at": "2026-03-31T08:00:00Z"
}
```
Matching rule:
- Use `item_sku` if present; fallback to `item_name`.

### `stock_transactions[]`
```json
{
  "warehouse_name": "Main Warehouse",
  "item_sku": "TEA-JAS-250",
  "item_name": "Jasmine Green Tea 250g",
  "username": "alex",
  "delta": -3,
  "reason": "stock_out",
  "note": "To Downtown shop",
  "created_at": "2026-03-31T09:15:00Z"
}
```

---

## 3) CSV Package Format (Phase 2-ready contract)

Phase 1 backend should define these canonical column names now to prevent churn.

## 3.1 Files
- `meta.json`
- `users.csv`
- `warehouses.csv`
- `categories.csv`
- `units.csv`
- `items.csv`
- `stock_levels.csv`
- `stock_transactions.csv` (optional)

## 3.2 Column definitions

### `users.csv`
- `username` (required)
- `display_name` (required)
- `role` (required, enum: manager|employee)
- `is_active` (required, boolean)

### `warehouses.csv`
- `name` (required)
- `address` (optional)
- `lat` (optional float)
- `lng` (optional float)
- `is_active` (required boolean)

### `categories.csv`
- `name` (required)
- `is_active` (required boolean)

### `units.csv`
- `name` (required)
- `is_active` (required boolean)

### `items.csv`
- `name` (required)
- `description` (optional)
- `sku` (optional, unique when set)
- `category_name` (optional)
- `unit_name` (optional)
- `attributes_json` (optional JSON string)
- `is_active` (required boolean)

### `stock_levels.csv`
- `warehouse_name` (required)
- `item_sku` (optional)
- `item_name` (required fallback key)
- `quantity` (required integer, >= 0)

### `stock_transactions.csv`
- `warehouse_name` (required)
- `item_sku` (optional)
- `item_name` (required fallback key)
- `username` (required)
- `delta` (required integer, != 0)
- `reason` (required enum)
- `note` (optional)
- `created_at` (required ISO datetime)

---

## 4) API Contract (FastAPI)

All endpoints are manager-only.

## 4.1 Export

### `POST /api/v1/data/export`

Request body:
```json
{
  "format": "json",
  "include_transactions": true,
  "include_users": true,
  "include_user_credentials": false
}
```

Response:
- `200 OK`
- `application/json` (Phase 1)
- Body: canonical snapshot JSON

Future (Phase 2):
- `format=csv` returns `application/zip`.

## 4.2 Import dry-run

### `POST /api/v1/data/import/dry-run`

Request body:
```json
{
  "payload": { "...canonical snapshot...": "..." },
  "mode": "merge",
  "strict": true,
  "include_transactions": true,
  "include_users": true
}
```

Response:
```json
{
  "ok": true,
  "summary": {
    "mode": "merge",
    "strict": true,
    "app_schema_version_detected": "2026-04-fastapi-v1",
    "entity_counts": {
      "users": 4,
      "warehouses": 3,
      "categories": 6,
      "units": 8,
      "items": 120,
      "stock_levels": 210,
      "stock_transactions": 1500
    }
  },
  "actions": {
    "create": { "users": 1, "items": 12 },
    "update": { "users": 3, "items": 5 },
    "noop": { "categories": 6 }
  },
  "warnings": [
    {
      "code": "W_ITEM_UNIT_MISSING",
      "entity": "item",
      "key": "TEA-JAS-250",
      "message": "Unit name missing; item will be imported with null unit_id"
    }
  ],
  "errors": []
}
```

## 4.3 Import commit

### `POST /api/v1/data/import/commit`

Request body (same as dry-run).

Behavior:
- Re-runs validation server-side.
- If `strict=true` and any error exists -> reject, no writes.
- If valid -> apply in transaction.

Response:
```json
{
  "ok": true,
  "import_id": "imp_20260401_001",
  "summary": {
    "created": { "warehouses": 1, "items": 12 },
    "updated": { "users": 3, "stock_levels": 210 },
    "skipped": { "stock_transactions": 0 }
  },
  "warnings": []
}
```

## 4.4 Error response envelope

```json
{
  "ok": false,
  "errors": [
    {
      "code": "E_SCHEMA_VERSION_UNSUPPORTED",
      "entity": "meta",
      "field": "app_schema_version",
      "message": "Unsupported schema version: 2025-11-v0"
    }
  ]
}
```

---

## 5) Validation & Error Catalog

## 5.1 Severity
- `error`: blocks commit
- `warning`: does not block commit unless `strict=true` and policy says escalate

## 5.2 Core error codes

### Schema / file errors
- `E_PAYLOAD_INVALID_JSON`
- `E_META_MISSING`
- `E_EXPORT_VERSION_UNSUPPORTED`
- `E_SCHEMA_VERSION_UNSUPPORTED`
- `E_REQUIRED_SECTION_MISSING`

### Entity structure errors
- `E_REQUIRED_FIELD_MISSING`
- `E_FIELD_TYPE_INVALID`
- `E_ENUM_INVALID`
- `E_DATETIME_INVALID`
- `E_JSON_PARSE_FAILED`

### Domain integrity errors
- `E_WAREHOUSE_NOT_FOUND`
- `E_ITEM_NOT_FOUND`
- `E_USER_NOT_FOUND`
- `E_REFERENCE_UNRESOLVED`
- `E_STOCK_NEGATIVE`
- `E_STOCK_DELTA_ZERO`
- `E_UNIQUE_CONSTRAINT`

### Authorization / policy errors
- `E_FORBIDDEN`
- `E_IMPORT_MODE_NOT_ALLOWED`
- `E_FILE_TOO_LARGE`
- `E_ROW_LIMIT_EXCEEDED`

## 5.3 Warning codes
- `W_ITEM_SKU_MISSING_USING_NAME_FALLBACK`
- `W_UNKNOWN_FIELDS_IGNORED`
- `W_ITEM_CATEGORY_MISSING`
- `W_ITEM_UNIT_MISSING`
- `W_TRANSACTION_SKIPPED_BY_OPTION`

---

## 6) Import Processing Algorithm

## 6.1 Dry-run flow
1. Validate top-level schema/meta.
2. Normalize payload to internal DTOs.
3. If needed, run version transformers to current schema.
4. Validate entities and references.
5. Resolve match keys for upsert (`username`, `warehouse name`, `sku/name`, etc.).
6. Produce action plan (`create/update/noop`).
7. Return summary + warnings/errors.

## 6.2 Commit flow
1. Execute dry-run internally.
2. If blocking errors -> reject.
3. Begin DB transaction.
4. Apply entities in safe order:
   - categories, units
   - warehouses
   - users (without credentials)
   - items
   - stock_levels
   - stock_transactions (optional)
5. Write admin audit log record.
6. Commit transaction and return summary.

---

## 7) Matching / Upsert Rules

## 7.1 Keys by entity
- User: `username`
- Warehouse: `name`
- Category: `name`
- Unit: `name`
- Item: `sku` when present, else `name`

## 7.2 Conflict handling
- If both `sku` and `name` match different records -> `E_UNIQUE_CONSTRAINT`.
- If key missing for required matching -> error in strict mode, warning+skip in relaxed mode.

---

## 8) Security Requirements

- Manager role required (`require_manager` dependency).
- Max import payload size default: 10 MB (configurable).
- Max row count default: 100k records total (configurable).
- Never export secrets (PIN hashes) unless explicit trusted-mode endpoint is added later.
- Write admin audit entries for:
  - export action
  - import dry-run
  - import commit

Audit details payload should include:
- mode, strict flag, include options
- entity counts
- result summary
- warnings/error count

---

## 9) Backend Implementation Tasks

## 9.1 New router/module
Create:
- `app/routers/data_io.py`

Add to `app/main.py` router registration.

## 9.2 New schemas
Add in `app/schemas.py` or split to `app/schemas_data_io.py`:
- `DataExportRequest`
- `DataImportRequest`
- `DataImportDryRunResponse`
- `DataImportCommitResponse`
- `ImportIssue`

## 9.3 New service
Create:
- `app/services/data_io_service.py`

Functions:
- `build_export_snapshot(...)`
- `validate_import_payload(...)`
- `plan_import_actions(...)`
- `apply_import_plan(...)`
- `transform_snapshot_to_current_schema(...)`

## 9.4 Config additions
In `app/config.py` add:
- `data_import_max_bytes`
- `data_import_max_rows`
- `data_io_allow_replace_mode`

## 9.5 Tests (backend)
Add tests for:
- happy path export/import
- dry-run errors
- permission enforcement
- transaction rollback
- schema version transform behavior

---

## 10) Frontend Integration Tasks

## 10.1 Adapter contract additions
Add methods to backend adapters:
- `exportData(options)`
- `importDataDryRun(payload, options)`
- `importDataCommit(payload, options)`

Apply to:
- `Frontend/src/services/backend/types.js`
- `Frontend/src/services/backend/fastapiBackend.js`
- temporary stubs for `localBackend.js` and `firebaseBackend.js`

## 10.2 UI
Add manager-only page/section:
- Export buttons
- Import upload area (JSON in phase 1)
- Dry-run result table (actions/warnings/errors)
- Commit button guarded by confirmation

---

## 11) Definition of Done (Phase 1)

1. Manager can export canonical JSON snapshot from UI.
2. Manager can run dry-run and view actionable report.
3. Manager can commit a valid import with atomic DB updates.
4. Invalid imports do not mutate database.
5. Import/export actions appear in admin audit log.
6. Automated tests pass for core data-io scenarios.

---

## 12) Suggested File Naming Convention

Export filename template:
- `inventory_export_<app_schema_version>_<yyyyMMdd_HHmmssZ>.json`

Example:
- `inventory_export_2026-04-fastapi-v1_20260401_120000Z.json`

---

## 13) Open Technical Decisions

1. Should commit endpoint require a confirmation token from prior dry-run to prevent drift?
2. Should transaction imports preserve timestamps exactly or allow optional re-timestamping?
3. Should large imports be chunked now or deferred to async Phase 3?
4. Should replace mode be API-disabled in production config by default?
