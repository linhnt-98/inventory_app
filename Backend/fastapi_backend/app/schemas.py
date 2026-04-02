from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from .models import StockReason, UserRole


class ApiError(BaseModel):
    code: str
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"


class LoginRequest(BaseModel):
    username: str
    pin: str

    @field_validator("pin")
    @classmethod
    def pin_must_be_4_digits(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 4:
            raise ValueError("PIN must be exactly 4 digits")
        return value


class BootstrapManagerRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    display_name: str = Field(min_length=1, max_length=120)
    pin: str

    @field_validator("pin")
    @classmethod
    def pin_must_be_4_digits(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 4:
            raise ValueError("PIN must be exactly 4 digits")
        return value


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    display_name: str = Field(min_length=1, max_length=120)
    role: UserRole = UserRole.employee
    pin: str

    @field_validator("pin")
    @classmethod
    def pin_must_be_4_digits(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 4:
            raise ValueError("PIN must be exactly 4 digits")
        return value


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    role: UserRole | None = None
    is_active: bool | None = None


class ResetPinRequest(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def pin_must_be_4_digits(cls, value: str) -> str:
        if not value.isdigit() or len(value) != 4:
            raise ValueError("PIN must be exactly 4 digits")
        return value


class UserRead(BaseModel):
    id: int
    username: str
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UnitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class CategoryRead(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class UnitRead(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class WarehouseLocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    description: str | None = Field(default=None, max_length=255)


class WarehouseLocationRead(BaseModel):
    id: int
    warehouse_id: int
    name: str
    description: str | None

    class Config:
        from_attributes = True


class WarehouseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    address: str | None = Field(default=None, max_length=255)
    lat: float | None = None
    lng: float | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=140)
    address: str | None = Field(default=None, max_length=255)
    lat: float | None = None
    lng: float | None = None
    is_active: bool | None = None


class WarehouseRead(BaseModel):
    id: int
    name: str
    address: str | None
    lat: float | None
    lng: float | None
    is_active: bool

    class Config:
        from_attributes = True


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    description: str | None = None
    sku: str | None = Field(default=None, max_length=120)
    category_id: int | None = None
    unit_id: int | None = None
    attributes_json: dict | None = None


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    sku: str | None = Field(default=None, max_length=120)
    category_id: int | None = None
    unit_id: int | None = None
    attributes_json: dict | None = None
    is_active: bool | None = None


class ItemRead(BaseModel):
    id: int
    name: str
    description: str | None
    sku: str | None
    category_id: int | None
    unit_id: int | None
    attributes_json: dict | None
    is_active: bool

    class Config:
        from_attributes = True


class StockMovementCreate(BaseModel):
    warehouse_id: int
    item_id: int
    quantity: int = Field(gt=0)
    reason: StockReason
    note: str | None = None


class StockAdjustCreate(BaseModel):
    warehouse_id: int
    item_id: int
    new_quantity: int = Field(ge=0)
    note: str | None = None


class StockTransferCreate(BaseModel):
    source_warehouse_id: int
    destination_warehouse_id: int
    item_id: int
    quantity: int = Field(gt=0)
    note: str | None = None


class StockLevelRead(BaseModel):
    warehouse_id: int
    item_id: int
    quantity: int
    last_updated_at: datetime

    class Config:
        from_attributes = True


class StockTransactionRead(BaseModel):
    id: int
    warehouse_id: int
    item_id: int
    user_id: int
    delta: int
    reason: StockReason
    note: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class BootstrapStatusResponse(BaseModel):
    bootstrap_required: bool


class InitialDataResponse(BaseModel):
    bootstrap_required: bool
    users: list[UserRead]
    warehouses: list[WarehouseRead]
    items: list[ItemRead]
    categories: list[CategoryRead]
    units: list[UnitRead]
    stock_levels: list[StockLevelRead]
    transactions: list[StockTransactionRead]


TokenResponse.model_rebuild()
