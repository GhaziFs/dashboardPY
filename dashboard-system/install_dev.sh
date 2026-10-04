#!/usr/bin/env bash
set -e
[ -d venv ] || python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
[ -f .env ] || cp .env.example .env
echo "Developer environment ready. Run: source venv/bin/activate && uvicorn app.main:app --reload"
