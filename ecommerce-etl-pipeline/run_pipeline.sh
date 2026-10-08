#!/usr/bin/env bash
# ==============================================================================
# E-Commerce ETL Pipeline Quickstart Runner
# ==============================================================================

set -e

echo "=== 1. Checking Python Environment ==="
python3 -m venv venv || true
source venv/bin/activate || true

echo "=== 2. Installing Requirements ==="
pip install -r requirements.txt --quiet

echo "=== 3. Starting Pipeline (Full Baseline Mode) ==="
python3 -m src.pipeline --mode full --init-db

echo "=== 4. Starting Pipeline (Incremental Delta Mode) ==="
python3 -m src.pipeline --mode incremental

echo "=== Pipeline Execution Completed Successfully ==="
