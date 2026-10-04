@echo off
REM Developer setup: isolated venv + dependencies + local .env
if not exist venv python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
if not exist .env copy .env.example .env
echo.
echo Developer environment ready. Run: venv\Scripts\activate ^&^& uvicorn app.main:app --reload
