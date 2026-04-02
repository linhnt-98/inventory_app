from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from ..models import (
    AdminAuditLog,
    AuditAction,
    AuditEntity,
    Category,
    Item,
    StockLevel,
    StockReason,
    StockTransaction,
    Unit,
    User,
    UserRole,
    Warehouse,
)
from ..security import hash_secret


APP_SCHEMA_VERSION = "2026-04-fastapi-v1"


@dataclass
class ImportIssuePayload:
    code: str
    message: str
    severity: str
    entity: str | None = None
    field: str | None = None
    key: str | None = None

    def to_dict(self) -> dict[str, str | None]:
        return {
            "code": self.code,
            "message": self.message,
            "severity": self.severity,
            "entity": self.entity,
            "field": self.field,
            "key": self.key,
        }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.now(timezone.utc)


def build_export_snapshot(
    db: Session,
    current_user: User,
    include_transactions: bool,
    include_users: bool,
    include_user_credentials: bool,
) -> dict[str, Any]:
    categories = list(db.scalars(select(Category).order_by(Category.id)))
    units = list(db.scalars(select(Unit).order_by(Unit.id)))
    warehouses = list(db.scalars(select(Warehouse).order_by(Warehouse.id)))
    items = list(db.scalars(select(Item).order_by(Item.id)))
    stock_levels = list(db.scalars(select(StockLevel).order_by(StockLevel.warehouse_id, StockLevel.item_id)))
    transactions = (
        list(db.scalars(select(StockTransaction).order_by(StockTransaction.id)))
        if include_transactions
        else []
    )
    users = list(db.scalars(select(User).order_by(User.id))) if include_users else []

    categories_by_id = {category.id: category.name for category in categories}
    units_by_id = {unit.id: unit.name for unit in units}
    warehouses_by_id = {warehouse.id: warehouse.name for warehouse in warehouses}
    users_by_id = {user.id: user.username for user in users}

    payload_users: list[dict[str, Any]] = []
    for user in users:
        item = {
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
        if include_user_credentials:
            item["pin_hash"] = user.pin_hash
        payload_users.append(item)

    payload = {
        "meta": {
            "export_version": "1.0",
            "app_schema_version": APP_SCHEMA_VERSION,
            "exported_at": _now_iso(),
            "exported_by": {
                "user_id": current_user.id,
                "username": current_user.username,
                "display_name": current_user.display_name,
            },
            "provider": "fastapi",
            "options": {
                "include_transactions": include_transactions,
                "include_users": include_users,
                "include_user_credentials": include_user_credentials,
            },
            "entity_counts": {
                "users": len(payload_users),
                "warehouses": len(warehouses),
                "categories": len(categories),
                "units": len(units),
                "items": len(items),
                "stock_levels": len(stock_levels),
                "stock_transactions": len(transactions),
            },
            "checksum": None,
        },
        "data": {
            "users": payload_users,
            "warehouses": [
                {
                    "name": warehouse.name,
                    "address": warehouse.address,
                    "lat": warehouse.lat,
                    "lng": warehouse.lng,
                    "is_active": warehouse.is_active,
                }
                for warehouse in warehouses
            ],
            "categories": [
                {
                    "name": category.name,
                    "is_active": category.is_active,
                }
                for category in categories
            ],
            "units": [
                {
                    "name": unit.name,
                    "is_active": unit.is_active,
                }
                for unit in units
            ],
            "items": [
                {
                    "name": item.name,
                    "description": item.description,
                    "sku": item.sku,
                    "category_name": categories_by_id.get(item.category_id),
                    "unit_name": units_by_id.get(item.unit_id),
                    "attributes_json": item.attributes_json,
                    "is_active": item.is_active,
                }
                for item in items
            ],
            "stock_levels": [
                {
                    "warehouse_name": warehouses_by_id.get(level.warehouse_id),
                    "item_sku": next((item.sku for item in items if item.id == level.item_id), None),
                    "item_name": next((item.name for item in items if item.id == level.item_id), None),
                    "quantity": level.quantity,
                    "last_updated_at": level.last_updated_at.isoformat() if level.last_updated_at else None,
                }
                for level in stock_levels
            ],
            "stock_transactions": [
                {
                    "warehouse_name": warehouses_by_id.get(transaction.warehouse_id),
                    "item_sku": next((item.sku for item in items if item.id == transaction.item_id), None),
                    "item_name": next((item.name for item in items if item.id == transaction.item_id), None),
                    "username": users_by_id.get(transaction.user_id),
                    "delta": transaction.delta,
                    "reason": transaction.reason.value,
                    "note": transaction.note,
                    "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
                }
                for transaction in transactions
            ],
        },
    }

    return payload


def dry_run_import(payload: dict[str, Any], mode: str, strict: bool) -> dict[str, Any]:
    warnings: list[ImportIssuePayload] = []
    errors: list[ImportIssuePayload] = []

    meta = payload.get("meta")
    data = payload.get("data")
    if not isinstance(meta, dict):
        errors.append(ImportIssuePayload("E_META_MISSING", "Missing or invalid meta object", "error", "meta"))
    if not isinstance(data, dict):
        errors.append(ImportIssuePayload("E_REQUIRED_SECTION_MISSING", "Missing data section", "error", "data"))

    entity_names = [
        "users",
        "warehouses",
        "categories",
        "units",
        "items",
        "stock_levels",
        "stock_transactions",
    ]
    entity_counts: dict[str, int] = {name: 0 for name in entity_names}
    actions = {
        "create": {name: 0 for name in entity_names},
        "update": {name: 0 for name in entity_names},
        "noop": {name: 0 for name in entity_names},
    }

    if isinstance(data, dict):
        for name in entity_names:
            section = data.get(name, [])
            if not isinstance(section, list):
                errors.append(
                    ImportIssuePayload(
                        "E_FIELD_TYPE_INVALID",
                        f"{name} must be an array",
                        "error",
                        entity=name,
                        field=name,
                    )
                )
                continue
            entity_counts[name] = len(section)
            actions["create"][name] = len(section)

        export_version = meta.get("export_version") if isinstance(meta, dict) else None
        if export_version and export_version != "1.0":
            warnings.append(
                ImportIssuePayload(
                    "W_EXPORT_VERSION_UNVERIFIED",
                    f"Export version {export_version} has not been fully verified",
                    "warning",
                    entity="meta",
                    field="export_version",
                )
            )

    return {
        "ok": len(errors) == 0,
        "summary": {
            "mode": mode,
            "strict": strict,
            "app_schema_version_detected": meta.get("app_schema_version") if isinstance(meta, dict) else None,
            "entity_counts": entity_counts,
        },
        "actions": actions,
        "warnings": [warning.to_dict() for warning in warnings],
        "errors": [error.to_dict() for error in errors],
    }


def _find_item(db: Session, item_sku: str | None, item_name: str | None) -> Item | None:
    if item_sku:
        match = db.scalar(select(Item).where(Item.sku == item_sku))
        if match:
            return match
    if item_name:
        return db.scalar(select(Item).where(Item.name == item_name))
    return None


def apply_import_merge(
    db: Session,
    payload: dict[str, Any],
    include_users: bool,
    include_transactions: bool,
) -> tuple[dict[str, dict[str, int]], list[dict[str, str | None]]]:
    data = payload.get("data", {})
    warnings: list[ImportIssuePayload] = []

    summary = {
        "created": {
            "users": 0,
            "warehouses": 0,
            "categories": 0,
            "units": 0,
            "items": 0,
            "stock_levels": 0,
            "stock_transactions": 0,
        },
        "updated": {
            "users": 0,
            "warehouses": 0,
            "categories": 0,
            "units": 0,
            "items": 0,
            "stock_levels": 0,
            "stock_transactions": 0,
        },
        "skipped": {
            "users": 0,
            "warehouses": 0,
            "categories": 0,
            "units": 0,
            "items": 0,
            "stock_levels": 0,
            "stock_transactions": 0,
        },
    }

    for payload_category in data.get("categories", []):
        name = (payload_category.get("name") or "").strip()
        if not name:
            summary["skipped"]["categories"] += 1
            continue

        existing = db.scalar(select(Category).where(Category.name == name))
        if existing:
            existing.is_active = payload_category.get("is_active", existing.is_active)
            db.add(existing)
            summary["updated"]["categories"] += 1
        else:
            db.add(Category(name=name, is_active=payload_category.get("is_active", True)))
            summary["created"]["categories"] += 1
    db.flush()

    for payload_unit in data.get("units", []):
        name = (payload_unit.get("name") or "").strip()
        if not name:
            summary["skipped"]["units"] += 1
            continue

        existing = db.scalar(select(Unit).where(Unit.name == name))
        if existing:
            existing.is_active = payload_unit.get("is_active", existing.is_active)
            db.add(existing)
            summary["updated"]["units"] += 1
        else:
            db.add(Unit(name=name, is_active=payload_unit.get("is_active", True)))
            summary["created"]["units"] += 1
    db.flush()

    categories_by_name = {category.name: category.id for category in db.scalars(select(Category))}
    units_by_name = {unit.name: unit.id for unit in db.scalars(select(Unit))}

    for payload_warehouse in data.get("warehouses", []):
        name = (payload_warehouse.get("name") or "").strip()
        if not name:
            summary["skipped"]["warehouses"] += 1
            continue

        existing = db.scalar(select(Warehouse).where(Warehouse.name == name))
        if existing:
            existing.address = payload_warehouse.get("address")
            existing.lat = payload_warehouse.get("lat")
            existing.lng = payload_warehouse.get("lng")
            existing.is_active = payload_warehouse.get("is_active", existing.is_active)
            db.add(existing)
            summary["updated"]["warehouses"] += 1
        else:
            db.add(
                Warehouse(
                    name=name,
                    address=payload_warehouse.get("address"),
                    lat=payload_warehouse.get("lat"),
                    lng=payload_warehouse.get("lng"),
                    is_active=payload_warehouse.get("is_active", True),
                )
            )
            summary["created"]["warehouses"] += 1
    db.flush()

    if include_users:
        for payload_user in data.get("users", []):
            username = (payload_user.get("username") or "").strip()
            if not username:
                summary["skipped"]["users"] += 1
                continue

            role_value = payload_user.get("role") or UserRole.employee.value
            role = UserRole.manager if role_value == UserRole.manager.value else UserRole.employee

            existing = db.scalar(select(User).where(User.username == username))
            if existing:
                existing.display_name = payload_user.get("display_name", existing.display_name)
                existing.role = role
                existing.is_active = payload_user.get("is_active", existing.is_active)
                db.add(existing)
                summary["updated"]["users"] += 1
            else:
                db.add(
                    User(
                        username=username,
                        display_name=payload_user.get("display_name") or username,
                        role=role,
                        is_active=payload_user.get("is_active", True),
                        pin_hash=hash_secret("0000"),
                    )
                )
                summary["created"]["users"] += 1
                warnings.append(
                    ImportIssuePayload(
                        code="W_USER_DEFAULT_PIN_APPLIED",
                        message=f"User '{username}' was created with temporary default PIN 0000",
                        severity="warning",
                        entity="user",
                        key=username,
                    )
                )
        db.flush()

    warehouses_by_name = {warehouse.name: warehouse.id for warehouse in db.scalars(select(Warehouse))}

    for payload_item in data.get("items", []):
        item_name = (payload_item.get("name") or "").strip()
        item_sku = (payload_item.get("sku") or "").strip() or None
        if not item_name:
            summary["skipped"]["items"] += 1
            continue

        existing = _find_item(db, item_sku=item_sku, item_name=item_name)
        category_name = payload_item.get("category_name")
        unit_name = payload_item.get("unit_name")
        category_id = categories_by_name.get(category_name) if category_name else None
        unit_id = units_by_name.get(unit_name) if unit_name else None

        if category_name and category_id is None:
            warnings.append(
                ImportIssuePayload(
                    code="W_ITEM_CATEGORY_MISSING",
                    message=f"Category '{category_name}' not found; item category cleared",
                    severity="warning",
                    entity="item",
                    key=item_sku or item_name,
                )
            )
        if unit_name and unit_id is None:
            warnings.append(
                ImportIssuePayload(
                    code="W_ITEM_UNIT_MISSING",
                    message=f"Unit '{unit_name}' not found; item unit cleared",
                    severity="warning",
                    entity="item",
                    key=item_sku or item_name,
                )
            )

        if existing:
            existing.name = item_name
            existing.description = payload_item.get("description")
            existing.sku = item_sku
            existing.category_id = category_id
            existing.unit_id = unit_id
            existing.attributes_json = payload_item.get("attributes_json")
            existing.is_active = payload_item.get("is_active", existing.is_active)
            db.add(existing)
            summary["updated"]["items"] += 1
        else:
            db.add(
                Item(
                    name=item_name,
                    description=payload_item.get("description"),
                    sku=item_sku,
                    category_id=category_id,
                    unit_id=unit_id,
                    attributes_json=payload_item.get("attributes_json"),
                    is_active=payload_item.get("is_active", True),
                )
            )
            summary["created"]["items"] += 1
    db.flush()

    for payload_level in data.get("stock_levels", []):
        warehouse_name = payload_level.get("warehouse_name")
        warehouse_id = warehouses_by_name.get(warehouse_name)
        item = _find_item(
            db,
            item_sku=payload_level.get("item_sku"),
            item_name=payload_level.get("item_name"),
        )

        if not warehouse_id or not item:
            summary["skipped"]["stock_levels"] += 1
            continue

        quantity = int(payload_level.get("quantity", 0))
        if quantity < 0:
            summary["skipped"]["stock_levels"] += 1
            continue

        level = db.get(StockLevel, {"warehouse_id": warehouse_id, "item_id": item.id})
        if level:
            level.quantity = quantity
            level.last_updated_at = _parse_datetime(payload_level.get("last_updated_at"))
            db.add(level)
            summary["updated"]["stock_levels"] += 1
        else:
            db.add(
                StockLevel(
                    warehouse_id=warehouse_id,
                    item_id=item.id,
                    quantity=quantity,
                    last_updated_at=_parse_datetime(payload_level.get("last_updated_at")),
                )
            )
            summary["created"]["stock_levels"] += 1
    db.flush()

    if include_transactions:
        users_by_username = {user.username: user.id for user in db.scalars(select(User))}

        for payload_txn in data.get("stock_transactions", []):
            warehouse_id = warehouses_by_name.get(payload_txn.get("warehouse_name"))
            item = _find_item(db, item_sku=payload_txn.get("item_sku"), item_name=payload_txn.get("item_name"))
            user_id = users_by_username.get(payload_txn.get("username"))

            if not warehouse_id or not item or not user_id:
                summary["skipped"]["stock_transactions"] += 1
                continue

            reason_value = payload_txn.get("reason")
            if reason_value not in {
                StockReason.stock_in.value,
                StockReason.stock_out.value,
                StockReason.adjustment.value,
                StockReason.transfer_in.value,
                StockReason.transfer_out.value,
            }:
                summary["skipped"]["stock_transactions"] += 1
                continue

            delta = int(payload_txn.get("delta", 0))
            if delta == 0:
                summary["skipped"]["stock_transactions"] += 1
                continue

            created_at = _parse_datetime(payload_txn.get("created_at"))
            existing = db.scalar(
                select(StockTransaction).where(
                    and_(
                        StockTransaction.warehouse_id == warehouse_id,
                        StockTransaction.item_id == item.id,
                        StockTransaction.user_id == user_id,
                        StockTransaction.delta == delta,
                        StockTransaction.reason == StockReason(reason_value),
                        StockTransaction.note == payload_txn.get("note"),
                        StockTransaction.created_at == created_at,
                    )
                )
            )
            if existing:
                summary["skipped"]["stock_transactions"] += 1
                continue

            db.add(
                StockTransaction(
                    warehouse_id=warehouse_id,
                    item_id=item.id,
                    user_id=user_id,
                    delta=delta,
                    reason=StockReason(reason_value),
                    note=payload_txn.get("note"),
                    created_at=created_at,
                )
            )
            summary["created"]["stock_transactions"] += 1

    return summary, [warning.to_dict() for warning in warnings]


def log_data_io_event(
    db: Session,
    acting_user: User,
    operation: str,
    details: dict[str, Any],
) -> None:
    db.add(
        AdminAuditLog(
            user_id=acting_user.id,
            action=AuditAction.edited,
            entity_type=AuditEntity.item,
            entity_id=None,
            details_json={
                "scope": "data_io",
                "operation": operation,
                **details,
            },
        )
    )
