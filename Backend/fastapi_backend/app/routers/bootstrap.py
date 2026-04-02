from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Item, StockLevel, StockTransaction, Unit, User, UserRole, Warehouse
from ..schemas import (
    BootstrapManagerRequest,
    BootstrapStatusResponse,
    InitialDataResponse,
    UserRead,
    WarehouseRead,
    ItemRead,
    CategoryRead,
    UnitRead,
    StockLevelRead,
    StockTransactionRead,
)
from ..security import hash_secret

router = APIRouter(prefix="/bootstrap", tags=["bootstrap"])


@router.get("/status", response_model=BootstrapStatusResponse)
def bootstrap_status(db: Session = Depends(get_db)) -> BootstrapStatusResponse:
    manager_count = db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.manager))
    return BootstrapStatusResponse(bootstrap_required=(manager_count == 0))


@router.post("/manager", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_initial_manager(payload: BootstrapManagerRequest, db: Session = Depends(get_db)) -> UserRead:
    manager_count = db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.manager))
    if manager_count and manager_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Setup has already been completed")

    exists = db.scalar(select(User).where(User.username == payload.username))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        username=payload.username,
        display_name=payload.display_name,
        role=UserRole.manager,
        pin_hash=hash_secret(payload.pin),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.get("/initial-data", response_model=InitialDataResponse)
def load_initial_data(db: Session = Depends(get_db)) -> InitialDataResponse:
    manager_count = db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.manager))

    return InitialDataResponse(
        bootstrap_required=(manager_count == 0),
        users=[UserRead.model_validate(row) for row in db.scalars(select(User).order_by(User.id))],
        warehouses=[WarehouseRead.model_validate(row) for row in db.scalars(select(Warehouse).order_by(Warehouse.id))],
        items=[ItemRead.model_validate(row) for row in db.scalars(select(Item).order_by(Item.id))],
        categories=[CategoryRead.model_validate(row) for row in db.scalars(select(Category).order_by(Category.id))],
        units=[UnitRead.model_validate(row) for row in db.scalars(select(Unit).order_by(Unit.id))],
        stock_levels=[StockLevelRead.model_validate(row) for row in db.scalars(select(StockLevel))],
        transactions=[
            StockTransactionRead.model_validate(row)
            for row in db.scalars(select(StockTransaction).order_by(StockTransaction.created_at.desc()).limit(200))
        ],
    )
