# FastAPI Inventory Backend

Production-oriented backend for the inventory app using FastAPI + SQLite.

## Why this design

This API intentionally improves on the frontend prototype contract:

- Server-side authentication and role enforcement.
- Atomic stock mutation operations.
- Immutable stock transaction history.
- Explicit transfer endpoint.
- Lookup entities for categories and units.
- Startup bootstrap endpoint for first manager creation.

## Stack

- FastAPI
- SQLAlchemy 2
- SQLite
- JWT auth
- Passlib bcrypt hashing

## Project structure

- `app/main.py`: FastAPI app wiring and startup.
- `app/models.py`: ORM models and constraints.
- `app/routers/`: API route modules.
- `app/services/inventory_service.py`: stock mutation logic.
- `app/seed.py`: default category and unit seeding.

## Run locally

```bash
cd Backend/fastapi_backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open API docs:

- http://127.0.0.1:8000/api/v1/docs

## Core endpoints

- `POST /api/v1/bootstrap/manager`: create first manager if none exists.
- `GET /api/v1/bootstrap/initial-data`: initial app payload.
- `POST /api/v1/auth/login`: login with username + PIN.
- `GET/POST/PATCH /api/v1/users`: manager-only user management.
- `GET/POST/PATCH /api/v1/warehouses`: warehouse management.
- `GET/POST/PATCH /api/v1/items`: item management.
- `GET/POST /api/v1/lookups/categories`: category lookups.
- `GET/POST /api/v1/lookups/units`: unit lookups.
- `GET /api/v1/stock/levels`: stock snapshot.
- `POST /api/v1/stock/movement`: stock in/out operations.
- `POST /api/v1/stock/adjust`: absolute stock correction.
- `POST /api/v1/stock/transfer`: warehouse-to-warehouse transfer.
- `GET /api/v1/stock/transactions`: transaction history.

## Important contract upgrades from prototype

- Backend methods are asynchronous over HTTP.
- Authentication is token-based, no client-side trust.
- Stock integrity is guaranteed by server checks and transaction ordering.
- Transfers are first-class and write two linked stock movements.

## Frontend adaptation notes

Frontend should:

- Store access token after login.
- Send `Authorization: Bearer <token>` for protected endpoints.
- Replace reducer-direct backend calls with async API calls.
- Use bootstrap endpoints for setup and initial load.
