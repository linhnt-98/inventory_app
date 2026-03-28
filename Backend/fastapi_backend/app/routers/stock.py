from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import StockLevel, StockReason, User
from ..schemas import (
    StockAdjustCreate,
    StockLevelRead,
    StockMovementCreate,
    StockTransactionRead,
    StockTransferCreate,
)
from ..services.inventory_service import list_transactions, record_stock_delta, set_stock_absolute

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/levels", response_model=list[StockLevelRead])
def get_stock_levels(
    warehouse_id: int | None = None,
    item_id: int | None = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[StockLevelRead]:
    query = select(StockLevel)
    if warehouse_id is not None:
        query = query.where(StockLevel.warehouse_id == warehouse_id)
    if item_id is not None:
        query = query.where(StockLevel.item_id == item_id)

    rows = db.scalars(query.order_by(StockLevel.warehouse_id, StockLevel.item_id))
    return [StockLevelRead.model_validate(row) for row in rows]


@router.get("/transactions", response_model=list[StockTransactionRead])
def get_stock_transactions(
    warehouse_id: int | None = None,
    item_id: int | None = None,
    user_id: int | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[StockTransactionRead]:
    rows = list_transactions(
        db=db,
        warehouse_id=warehouse_id,
        item_id=item_id,
        user_id=user_id,
        limit=limit,
    )
    return [StockTransactionRead.model_validate(row) for row in rows]


@router.post("/movement", response_model=StockTransactionRead, status_code=status.HTTP_201_CREATED)
def create_stock_movement(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StockTransactionRead:
    if payload.reason not in {StockReason.stock_in, StockReason.stock_out, StockReason.adjustment}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported reason for movement")

    delta = payload.quantity if payload.reason == StockReason.stock_in else -payload.quantity
    if payload.reason == StockReason.adjustment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use /stock/adjust for absolute edits")

    try:
        txn = record_stock_delta(
            db=db,
            user=current_user,
            warehouse_id=payload.warehouse_id,
            item_id=payload.item_id,
            delta=delta,
            reason=payload.reason,
            note=payload.note,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return StockTransactionRead.model_validate(txn)


@router.post("/adjust", response_model=StockTransactionRead, status_code=status.HTTP_201_CREATED)
def adjust_stock(
    payload: StockAdjustCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StockTransactionRead:
    try:
        txn = set_stock_absolute(
            db=db,
            user=current_user,
            warehouse_id=payload.warehouse_id,
            item_id=payload.item_id,
            new_quantity=payload.new_quantity,
            note=payload.note,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return StockTransactionRead.model_validate(txn)


@router.post("/transfer", response_model=list[StockTransactionRead], status_code=status.HTTP_201_CREATED)
def transfer_stock(
    payload: StockTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StockTransactionRead]:
    if payload.source_warehouse_id == payload.destination_warehouse_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination warehouses must differ",
        )

    try:
        tx_out = record_stock_delta(
            db=db,
            user=current_user,
            warehouse_id=payload.source_warehouse_id,
            item_id=payload.item_id,
            delta=-payload.quantity,
            reason=StockReason.transfer_out,
            note=payload.note,
        )
        tx_in = record_stock_delta(
            db=db,
            user=current_user,
            warehouse_id=payload.destination_warehouse_id,
            item_id=payload.item_id,
            delta=payload.quantity,
            reason=StockReason.transfer_in,
            note=payload.note,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return [StockTransactionRead.model_validate(tx_out), StockTransactionRead.model_validate(tx_in)]
