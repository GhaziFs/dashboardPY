from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import Base, engine
from .routers import auth, notify, audit_log, export, users
from .routers.data import all_data_routers

Base.metadata.create_all(bind=engine)

app = FastAPI(title="نظام لوحة التحكم الذكية")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(notify.router)
app.include_router(audit_log.router)
app.include_router(export.router)
for r in all_data_routers:
    app.include_router(r)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
def health_check():
    return {"status": "النظام شغّال"}
