from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Category, Unit

DEFAULT_CATEGORIES = [
    "Tea",
    "Supplies",
    "Packaging",
    "Equipment",
]

DEFAULT_UNITS = [
    "box",
    "bag",
    "pack",
    "unit",
    "pcs",
]


def seed_defaults(db: Session) -> None:
    existing_categories = {row.name for row in db.scalars(select(Category))}
    for name in DEFAULT_CATEGORIES:
        if name not in existing_categories:
            db.add(Category(name=name, is_active=True))

    existing_units = {row.name for row in db.scalars(select(Unit))}
    for name in DEFAULT_UNITS:
        if name not in existing_units:
            db.add(Unit(name=name, is_active=True))

    db.commit()
