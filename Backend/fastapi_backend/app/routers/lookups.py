from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_manager
from ..models import Category, Unit
from ..schemas import CategoryCreate, CategoryRead, UnitCreate, UnitRead

router = APIRouter(prefix="/lookups", tags=["lookups"])


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryRead]:
    return [CategoryRead.model_validate(row) for row in db.scalars(select(Category).order_by(Category.name))]


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> CategoryRead:
    exists = db.scalar(select(Category).where(Category.name == payload.name))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already exists")

    category = Category(name=payload.name, is_active=True)
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryRead.model_validate(category)


@router.get("/units", response_model=list[UnitRead])
def list_units(db: Session = Depends(get_db)) -> list[UnitRead]:
    return [UnitRead.model_validate(row) for row in db.scalars(select(Unit).order_by(Unit.name))]


@router.post("/units", response_model=UnitRead, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitCreate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> UnitRead:
    exists = db.scalar(select(Unit).where(Unit.name == payload.name))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unit already exists")

    unit = Unit(name=payload.name, is_active=True)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return UnitRead.model_validate(unit)
