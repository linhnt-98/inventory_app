from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_manager
from ..models import Category, Item, StockLevel, StockTransaction, Unit
from ..schemas import ItemCreate, ItemRead, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=list[ItemRead])
def list_items(db: Session = Depends(get_db)) -> list[ItemRead]:
    return [ItemRead.model_validate(row) for row in db.scalars(select(Item).order_by(Item.id))]


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> ItemRead:
    if payload.sku:
        exists = db.scalar(select(Item).where(Item.sku == payload.sku))
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")

    if payload.category_id is not None and not db.get(Category, payload.category_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if payload.unit_id is not None and not db.get(Unit, payload.unit_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

    item = Item(**payload.model_dump(), is_active=True)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ItemRead.model_validate(item)


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> ItemRead:
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    patch = payload.model_dump(exclude_unset=True)

    if "sku" in patch and patch["sku"]:
        existing = db.scalar(select(Item).where(Item.sku == patch["sku"], Item.id != item_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")

    if "category_id" in patch and patch["category_id"] is not None and not db.get(Category, patch["category_id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if "unit_id" in patch and patch["unit_id"] is not None and not db.get(Unit, patch["unit_id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

    for key, value in patch.items():
        setattr(item, key, value)

    db.add(item)
    db.commit()
    db.refresh(item)
    return ItemRead.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> Response:
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    has_transactions = db.scalar(select(StockTransaction.id).where(StockTransaction.item_id == item_id).limit(1))
    if has_transactions is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item has transaction history and cannot be deleted. Deactivate it instead.",
        )

    has_stock_on_hand = db.scalar(
        select(StockLevel.warehouse_id)
        .where(StockLevel.item_id == item_id, StockLevel.quantity > 0)
        .limit(1)
    )
    if has_stock_on_hand is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item has stock on hand and cannot be deleted.",
        )

    stock_level_rows = db.scalars(select(StockLevel).where(StockLevel.item_id == item_id)).all()
    for stock_level in stock_level_rows:
        db.delete(stock_level)

    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
