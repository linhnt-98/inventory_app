# Frontend to FastAPI Integration

This frontend now targets the FastAPI backend by default.

## Environment

Create `RossPrototype/.env.local`:

```env
VITE_BACKEND_PROVIDER=fastapi
VITE_FASTAPI_BASE_URL=http://127.0.0.1:8001
```

## Provider behavior

- Provider selection is in `src/services/backend/index.js`.
- FastAPI adapter is in `src/services/backend/fastapiBackend.js`.
- Local and Firebase adapters remain available for fallback/testing.

## Context refactor

`src/context/AppContext.jsx` is now async:

- Bootstraps app state from `/api/v1/bootstrap/initial-data`.
- Uses token-backed login via `/api/v1/auth/login`.
- Uses backend mutations for stock/items/warehouses/users.
- Exposes `isInitializing`, `apiError`, and `refreshInitialData`.

## Endpoint mapping used by frontend

- `POST /api/v1/auth/login`
- `GET /api/v1/bootstrap/initial-data`
- `POST /api/v1/bootstrap/manager`
- `GET /api/v1/lookups/categories`
- `POST /api/v1/lookups/categories`
- `GET /api/v1/lookups/units`
- `POST /api/v1/lookups/units`
- `POST /api/v1/items`
- `PATCH /api/v1/items/{item_id}`
- `POST /api/v1/warehouses`
- `POST /api/v1/stock/movement`
- `POST /api/v1/stock/adjust`
- `POST /api/v1/users`
- `PATCH /api/v1/users/{user_id}`
- `POST /api/v1/users/{user_id}/reset-pin`

## Demo code removed

- Removed quick-login and self-signup/forgot-PIN flows from `LoginPage`.
- Removed invite-code generation flow from `ManagePage`.
- Setup page now performs real backend bootstrap manager creation.
