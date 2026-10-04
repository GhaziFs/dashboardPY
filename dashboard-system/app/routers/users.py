from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth_utils import get_current_user
from ..permissions import require_admin
from .. import models, schemas

router = APIRouter(prefix="/api/users", tags=["إدارة المستخدمين"])


@router.get("/", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_admin(user)
    return db.query(models.User).order_by(models.User.id).all()


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_admin(user)
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return target


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_admin(user)
    if user.id == user_id:
        raise HTTPException(status_code=400, detail="ما تقدر تحذف حسابك الخاص")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    db.delete(target)
    db.commit()
