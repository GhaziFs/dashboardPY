#!/usr/bin/env bash
set -e
pip install -r requirements.txt
[ -f .env ] || cp .env.example .env
if [ ! -f dashboard.db ]; then
    python3 -m app.create_user
    xlsx=$(ls *.xlsx 2>/dev/null | head -n 1 || true)
    if [ -n "$xlsx" ]; then python3 -m app.import_all "$xlsx"; else echo "No .xlsx file found - skipping data import."; fi
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000
