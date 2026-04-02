from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    Item,
    StockLevel,
    StockReason,
    StockTransaction,
    User,
    Warehouse,
)


def _ensure_warehouse(db: Session, warehouse_id: int) -> Warehouse:
    warehouse = db.get(Warehouse, warehouse_id)
    if not warehouse or not warehouse.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    return warehouse


def _ensure_item(db: Session, item_id: int) -> Item:
    item = db.get(Item, item_id)
    if not item or not item.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def _get_or_create_level(db: Session, warehouse_id: int, item_id: int) -> StockLevel:
    level = db.get(StockLevel, {"warehouse_id": warehouse_id, "item_id": item_id})
    if level:
        return level

    level = StockLevel(warehouse_id=warehouse_id, item_id=item_id, quantity=0)
    db.add(level)
    db.flush()
    return level


def record_stock_delta(
    db: Session,
    user: User,
    warehouse_id: int,
    item_id: int,
    delta: int,
    reason: StockReason,
    note: str | None = None,
) -> StockTransaction:
    if delta == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delta cannot be zero")

    _ensure_warehouse(db, warehouse_id)
    _ensure_item(db, item_id)

    level = _get_or_create_level(db, warehouse_id=warehouse_id, item_id=item_id)
    new_quantity = level.quantity + delta
    if new_quantity < 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock")

    level.quantity = new_quantity
    level.last_updated_at = datetime.now(timezone.utc)

    txn = StockTransaction(
        warehouse_id=warehouse_id,
        item_id=item_id,
        user_id=user.id,
        delta=delta,
        reason=reason,
        note=note,
    )
    db.add(txn)
    db.flush()
    return txn


def set_stock_absolute(
    db: Session,
    user: User,
    warehouse_id: int,
    item_id: int,
    new_quantity: int,
    note: str | None = None,
) -> StockTransaction:
    if new_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity cannot be negative")

    _ensure_warehouse(db, warehouse_id)
    _ensure_item(db, item_id)

    level = _get_or_create_level(db, warehouse_id=warehouse_id, item_id=item_id)
    delta = new_quantity - level.quantity
    if delta == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No stock change detected")

    return record_stock_delta(
        db=db,
        user=user,
        warehouse_id=warehouse_id,
        item_id=item_id,
        delta=delta,
        reason=StockReason.adjustment,
        note=note,
    )


def list_transactions(
    db: Session,
    warehouse_id: int | None,
    item_id: int | None,
    user_id: int | None,
    limit: int,
) -> list[StockTransaction]:
    query = select(StockTransaction)
    if warehouse_id is not None:
        query = query.where(StockTransaction.warehouse_id == warehouse_id)
    if item_id is not None:
        query = query.where(StockTransaction.item_id == item_id)
    if user_id is not None:
        query = query.where(StockTransaction.user_id == user_id)

    query = query.order_by(StockTransaction.created_at.desc()).limit(limit)
    return list(db.scalars(query))
