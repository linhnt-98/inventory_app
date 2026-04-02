from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_manager
from ..models import User
from ..schemas import ResetPinRequest, UserCreate, UserRead, UserUpdate
from ..security import hash_secret

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> list[UserRead]:
    return [UserRead.model_validate(row) for row in db.scalars(select(User).order_by(User.id))]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> UserRead:
    exists = db.scalar(select(User).where(User.username == payload.username))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    user = User(
        username=payload.username,
        display_name=payload.display_name,
        role=payload.role,
        pin_hash=hash_secret(payload.pin),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    patch = payload.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(user, key, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.post("/{user_id}/reset-pin", response_model=UserRead)
def reset_user_pin(
    user_id: int,
    payload: ResetPinRequest,
    db: Session = Depends(get_db),
    _manager=Depends(require_manager),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.pin_hash = hash_secret(payload.pin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)
