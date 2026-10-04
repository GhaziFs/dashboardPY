from typing import Type, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..auth_utils import get_current_user
from ..permissions import require_write_access, require_review_access
from ..audit import log_action

def make_crud_router(*, prefix: str, tag: str, department_key: str, model, schema_out: Type[BaseModel], schema_create: Type[BaseModel]):
    router = APIRouter(prefix=prefix, tags=[tag])
    table_name = model.__tablename__

    @router.get("/", response_model=List[schema_out])
    def list_items(db: Session = Depends(get_db), _user=Depends(get_current_user)):
        # الاطلاع متاح لكل المستخدمين المسجّلين دخول (كل الأدوار تشوف كل شي)
        return db.query(model).order_by(model.id.desc()).all()

    @router.post("/", response_model=schema_out, status_code=201)
    def create_item(payload: schema_create, db: Session = Depends(get_db), user=Depends(get_current_user)):
        require_write_access(user, department_key)
        item = model(**payload.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        log_action(db, user, "create", table_name, item.id)
        return item

    @router.put("/{item_id}", response_model=schema_out)
    def update_item(item_id: int, payload: schema_create, db: Session = Depends(get_db), user=Depends(get_current_user)):
        require_write_access(user, department_key)
        item = db.query(model).filter(model.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="غير موجود")
        for field, value in payload.model_dump().items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        log_action(db, user, "update", table_name, item_id)
        return item

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
        require_write_access(user, department_key)
        item = db.query(model).filter(model.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="غير موجود")
        db.delete(item)
        db.commit()
        log_action(db, user, "delete", table_name, item_id)

    @router.patch("/{item_id}/review", response_model=schema_out)
    def review_item(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
        """يُستخدم من قِبل محلل البيانات لاعتماد سجل بعد مراجعته"""
        require_review_access(user)
        item = db.query(model).filter(model.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="غير موجود")
        item.reviewed = True
        db.commit()
        db.refresh(item)
        log_action(db, user, "review", table_name, item_id)
        return item

    return router

# ---------- تطبيق المصنع على الجداول الثمانية ----------

from .. import models, schemas  # noqa: E402

courses_router = make_crud_router(
    prefix="/api/courses", tag="التعليم التفاعلي", department_key="courses",
    model=models.Course, schema_out=schemas.CourseOut, schema_create=schemas.CourseCreate,
)

qna_router = make_crud_router(
    prefix="/api/qna", tag="السؤال والجواب", department_key="qna",
    model=models.QnaEntry, schema_out=schemas.QnaOut, schema_create=schemas.QnaCreate,
)

projects_router = make_crud_router(
    prefix="/api/projects", tag="المشاريع", department_key="projects",
    model=models.Project, schema_out=schemas.ProjectOut, schema_create=schemas.ProjectCreate,
)

subscriptions_router = make_crud_router(
    prefix="/api/subscriptions", tag="الاشتراكات", department_key="projects",
    model=models.Subscription, schema_out=schemas.SubscriptionOut, schema_create=schemas.SubscriptionCreate,
)

communities_router = make_crud_router(
    prefix="/api/communities", tag="المجتمعات الافتراضية", department_key="communities",
    model=models.Community, schema_out=schemas.CommunityOut, schema_create=schemas.CommunityCreate,
)

news_router = make_crud_router(
    prefix="/api/news", tag="الأخبار والبيانات", department_key="news",
    model=models.NewsEntry, schema_out=schemas.NewsOut, schema_create=schemas.NewsCreate,
)

site_metrics_router = APIRouter(prefix="/api/site-metrics", tags=["مقاييس المواقع"])

@site_metrics_router.get("/", response_model=List[schemas.SiteMetricOut])
def list_metrics(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return db.query(models.SiteMetric).order_by(models.SiteMetric.id.desc()).all()

@site_metrics_router.post("/", response_model=schemas.SiteMetricOut, status_code=201)
def create_metric(payload: schemas.SiteMetricCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # يتحقق من صلاحية المستخدم على القسم المحدد فعليًا بالطلب (rabita/sheikh/admin_metrics)
    require_write_access(user, payload.source)
    item = models.SiteMetric(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    log_action(db, user, "create", "site_metrics", item.id)
    return item

@site_metrics_router.put("/{item_id}", response_model=schemas.SiteMetricOut)
def update_metric(item_id: int, payload: schemas.SiteMetricCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(models.SiteMetric).filter(models.SiteMetric.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="غير موجود")
    # يتحقق من قسم السجل الأصلي بالقاعدة، مو من قسم الطلب (يمنع تلاعب بتغيير القسم بالتحايل)
    require_write_access(user, item.source)
    require_write_access(user, payload.source)
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    log_action(db, user, "update", "site_metrics", item_id)
    return item

@site_metrics_router.delete("/{item_id}", status_code=204)
def delete_metric(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(models.SiteMetric).filter(models.SiteMetric.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="غير موجود")
    require_write_access(user, item.source)
    db.delete(item)
    db.commit()
    log_action(db, user, "delete", "site_metrics", item_id)

@site_metrics_router.patch("/{item_id}/review", response_model=schemas.SiteMetricOut)
def review_metric(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_review_access(user)
    item = db.query(models.SiteMetric).filter(models.SiteMetric.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="غير موجود")
    item.reviewed = True
    db.commit()
    db.refresh(item)
    log_action(db, user, "review", "site_metrics", item_id)
    return item

all_data_routers = [
    courses_router, qna_router, projects_router, subscriptions_router,
    communities_router, news_router, site_metrics_router,
]
