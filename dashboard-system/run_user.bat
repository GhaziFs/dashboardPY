@echo off
REM End-user setup and launch. First run: creates the first account and imports the Excel file.
pip install -r requirements.txt
if not exist .env copy .env.example .env
if not exist dashboard.db (
    python -m app.create_user
    set FOUND=
    for %%f in (*.xlsx) do (
        if not defined FOUND (
            set FOUND=1
            python -m app.import_all "%%f"
        )
    )
    if not defined FOUND echo No .xlsx file found in this folder - skipping data import.
)
uvicorn app.main:app --host 0.0.0.0 --port 8000
