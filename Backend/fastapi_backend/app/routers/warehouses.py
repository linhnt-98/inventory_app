from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_manager
from ..models import Warehouse, WarehouseLocation
from ..schemas import (
    WarehouseCreate,
    WarehouseLocationCreate,
    WarehouseLocationRead,
    WarehouseRead,
    WarehouseUpdate,
)

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=list[WarehouseRead])
def list_warehouses(db: Session = Depends(get_db)) -> list[WarehouseRead]:
    return [WarehouseRead.model_validate(row) for row in db.scalars(select(Warehouse).order_by(Warehouse.id))]


@router.post("", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> WarehouseRead:
    exists = db.scalar(select(Warehouse).where(Warehouse.name == payload.name))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Warehouse name already exists")

    warehouse = Warehouse(**payload.model_dump(), is_active=True)
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return WarehouseRead.model_validate(warehouse)


@router.patch("/{warehouse_id}", response_model=WarehouseRead)
def update_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> WarehouseRead:
    warehouse = db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    patch = payload.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(warehouse, key, value)

    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return WarehouseRead.model_validate(warehouse)


@router.get("/{warehouse_id}/locations", response_model=list[WarehouseLocationRead])
def list_locations(warehouse_id: int, db: Session = Depends(get_db)) -> list[WarehouseLocationRead]:
    warehouse = db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    rows = db.scalars(
        select(WarehouseLocation)
        .where(WarehouseLocation.warehouse_id == warehouse_id)
        .order_by(WarehouseLocation.id)
    )
    return [WarehouseLocationRead.model_validate(row) for row in rows]


@router.post("/{warehouse_id}/locations", response_model=WarehouseLocationRead, status_code=status.HTTP_201_CREATED)
def add_location(
    warehouse_id: int,
    payload: WarehouseLocationCreate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> WarehouseLocationRead:
    warehouse = db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    location = WarehouseLocation(
        warehouse_id=warehouse_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return WarehouseLocationRead.model_validate(location)
