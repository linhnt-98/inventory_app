from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import auth, bootstrap, data_io, health, items, lookups, stock, users, warehouses
from .seed import seed_defaults

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_defaults(db)


api_prefix = "/api/v1"
app.include_router(health.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(bootstrap.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(lookups.router, prefix=api_prefix)
app.include_router(warehouses.router, prefix=api_prefix)
app.include_router(items.router, prefix=api_prefix)
app.include_router(stock.router, prefix=api_prefix)
app.include_router(data_io.router, prefix=api_prefix)
