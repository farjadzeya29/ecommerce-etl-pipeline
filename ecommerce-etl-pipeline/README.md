# End-to-End E-Commerce ETL Pipeline

Production-grade ETL (Extract, Transform, Load) pipeline built in **Python**, **pandas**, and **MySQL**. Automates raw data ingestion, schema validation, quarantine handling, relational data modeling, automated data quality assertions, and incremental loading using high-watermark state tracking.

---

## Architecture Overview

```
                      +------------------------------------+
                      |    Raw Data Sources (CSV / JSON)   |
                      |  customers, products, orders,      |
                      |  order_items, payments             |
                      +-----------------+------------------+
                                        |
                                        v
                      +------------------------------------+
                      |   1. Ingestion & Schema Gate       |
                      |   - Check required columns         |
                      |   - Enforce column types           |
                      +-----------------+------------------+
                                        |
                 +----------------------+----------------------+
                 | (Valid Records)                             | (Invalid Records)
                 v                                             v
+------------------------------------+       +------------------------------------+
|   2. Data Cleaning & Deduplication |       |   Bad Records Quarantine           |
|   - Null & range detection         |       |   (data/quarantine/*_quarantine.csv|
|   - Business key deduplication     |       |   records flagged with reason)     |
+-----------------+------------------+       +------------------------------------+
                  |
                  v
+------------------------------------+
|   3. Standardization & Transform   |
|   - ISO 8601 timestamps            |
|   - Decimal currency precision     |
|   - Derived metrics & dimensions   |
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|   4. Data Quality Gate (Asserts)   |
|   - PK Uniqueness & Non-null       |
|   - Referential integrity (FKs)    |
|   - Row count reconciliation       |
+-----------------+------------------+
                  |
                  v
+------------------------------------+
|   5. Relational Load (MySQL 8.0)   |
|   - Referential order execution    |
|   - Idempotent UPSERT strategy     |
|   - Update high-watermark state    |
+-----------------+------------------+
                  |
                  +-----------------------------------+
                  |                                   |
                  v                                   v
+------------------------------------+ +------------------------------------+
|      Target Tables (3NF Schema)    | |       Observability & State        |
| - customers      - order_items     | | - etl_watermarks (Delta tracking)  |
| - products       - payments        | | - etl_audit_log (Run history)      |
| - orders                           | | - Rotating log files (logs/*.log)  |
+------------------------------------+ +------------------------------------+
                  |
                  v
+------------------------------------+
|   6. Post-Load SQL Certifications  |
|   - Reconciliation queries         |
|   - Financial balance checks       |
|   - Cohort retention analytics     |
+------------------------------------+
```

---

## Business Problem & Context

E-commerce platforms capture transactional events across disparate upstream systems (checkout services, logistics carriers, payment gateways, catalog management). Data arriving from these distributed services often experiences:

1. **Schema Drift & Missing Fields**: Upstream updates omitting required identifiers.
2. **Data Dirtiness & Inconsistencies**: Negative item prices, invalid shipping dates, duplicate order webhooks.
3. **Redundant Ingestion Waste**: Ingesting the entire multi-year transaction history daily causes compute and network bottlenecks.
4. **Referential Integrity Breaks**: Items and payments arriving for non-existent order records.

This project delivers a resilient, idempotent, and audited batch ETL pipeline that transforms raw messy ingestion dumps into an analytics-ready 3NF MySQL database with automated quality gating.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| **Python 3.10+** | Core programming language for pipeline orchestration |
| **pandas** | In-memory data transformation, type coercion, and deduplication |
| **SQL / MySQL 8.0** | Relational data warehouse storage with strict foreign keys and indexing |
| **SQLAlchemy / PyMySQL** | Database abstraction, connection pooling, and transactional execution |
| **Docker & Docker Compose** | Reproducible containerized MySQL database environment |
| **pytest** | Automated unit testing for validation rules and data transformations |
| **Git** | Version control with production branch conventions and `.gitignore` |

---

## Relational Database Schema (MySQL)

The warehouse follows a 3rd Normal Form (3NF) relational design optimized for reporting and data integrity:

```
+--------------------+           +--------------------+
|     CUSTOMERS      |           |      PRODUCTS      |
+--------------------+           +--------------------+
| PK customer_id     |           | PK product_id      |
|    customer_uniq_id|           |    category_name   |
|    city, state, zip|           |    weight_g, dim_cm|
+---------+----------+           +---------+----------+
          | 1                              | 1
          |                                |
          | N                              | N
+---------+----------+           +---------+----------+
|       ORDERS       | 1       N |    ORDER_ITEMS     |
+--------------------+-----------+--------------------+
| PK order_id        |           | PK order_id        |
| FK customer_id     |           | PK order_item_id   |
|    order_status    |           | FK product_id      |
|    purchase_ts     |           |    price, freight  |
|    delivered_ts    |           |    shipping_limit  |
+---------+----------+           +--------------------+
          | 1
          |
          | N
+---------+----------+
|      PAYMENTS      |
+--------------------+
| PK order_id        |
| PK payment_seq     |
|    payment_type    |
|    payment_value   |
+--------------------+
```

### Table Definitions & Keys

1. **`customers`**
   - **Primary Key**: `customer_id` (VARCHAR 32)
   - **Indexes**: `idx_customers_unique_id`, compound `idx_customers_state_city`
2. **`products`**
   - **Primary Key**: `product_id` (VARCHAR 32)
   - **Index**: `idx_products_category`
3. **`orders`**
   - **Primary Key**: `order_id` (VARCHAR 32)
   - **Foreign Key**: `customer_id` REFERENCES `customers(customer_id)` (ON UPDATE CASCADE, ON DELETE RESTRICT)
   - **Indexes**: `idx_orders_purchase_timestamp`, compound `idx_orders_customer_purchase`, `idx_orders_status`
4. **`order_items`**
   - **Composite Primary Key**: `(order_id, order_item_id)`
   - **Foreign Keys**: `order_id` REFERENCES `orders(order_id)` (ON DELETE CASCADE), `product_id` REFERENCES `products(product_id)`
5. **`payments`**
   - **Composite Primary Key**: `(order_id, payment_sequential)`
   - **Foreign Key**: `order_id` REFERENCES `orders(order_id)` (ON DELETE CASCADE)
6. **`etl_watermarks`**
   - **Primary Key**: `(pipeline_name, table_name)`
   - Stores: `watermark_column`, `last_success_value`, `last_run_timestamp`
7. **`etl_audit_log`**
   - **Primary Key**: `run_id`
   - Stores: `pipeline_mode`, `status`, `records_extracted`, `records_cleaned`, `records_quarantined`, `records_loaded`, `started_at`, `ended_at`, `duration_seconds`, `error_message`

---

## Incremental Loading Mechanism

### How It Works

Instead of truncating and reloading the entire database on every run (Full Refresh), the pipeline implements **High-Watermark State Tracking**:

1. **Watermark Retrieval**: At pipeline startup, the loader queries `etl_watermarks` for the last recorded `order_purchase_timestamp` processed for the `orders` table.
2. **Delta Filtering**: The extractor evaluates incoming raw batch records and selects only records where:
   $$\text{order\_purchase\_timestamp} > \text{last\_success\_value}$$
3. **Idempotent Upsert Loading**:
   - Because upstream services occasionally re-send updated orders (e.g. status changes from `shipped` to `delivered`), the loader executes:
     ```sql
     INSERT INTO orders (order_id, customer_id, order_status, order_purchase_timestamp, ...)
     VALUES (...)
     ON DUPLICATE KEY UPDATE
         order_status = VALUES(order_status),
         order_delivered_customer_date = VALUES(order_delivered_customer_date),
         updated_at = CURRENT_TIMESTAMP;
     ```
   - This ensures **re-running the pipeline multiple times produces identical, consistent state without duplicate rows**.
4. **Watermark Commit**: Only upon successful completion of the transaction across all tables is the new maximum timestamp committed to `etl_watermarks`:
   $$\text{new\_watermark} = \max(\text{order\_purchase\_timestamp}_{\text{batch}})$$

---

## Data Quality & Validation Gates

The pipeline enforces data quality at three sequential barriers:

### 1. Ingestion Gate (`validate.py`)
- **Schema Presence**: Fails immediately if mandatory fields (`order_id`, `customer_id`, `price`) are missing from source headers.
- **Null Value Filter**: Detects nulls or whitespace-only records in primary keys.
- **Value Domain Assertions**:
  - `price > 0.00`
  - `freight_value >= 0.00`
  - `order_status IN ('delivered', 'shipped', 'processing', 'invoiced', 'canceled')`
  - `payment_value > 0.00`
- **Quarantine Routing**: Flawed records are extracted and written to `data/quarantine/{table}_quarantine_{timestamp}.csv` along with an explicit `quarantine_reason` column. The pipeline continues safely for clean rows.

### 2. Transformation Gate (`transform.py`)
- **Type Standardization**: Cleans string whitespace, enforces uppercase 2-letter state abbreviations (`TX`, `CA`), and formats timestamps to ISO-8601 (`YYYY-MM-DD HH:MM:SS`).
- **In-Memory Deduplication**: Retains the latest version of duplicated primary keys.

### 3. Pre-Load Audit Gate (`quality_checks.py`)
- **PK Uniqueness & Not-Null**: Verifies 0 duplicate keys exist before database operations.
- **Referential Integrity (Parent-Child Key Alignment)**:
  - Asserts 100% of foreign keys in `orders.customer_id` exist in `customers`.
  - Asserts 100% of foreign keys in `order_items.order_id` exist in `orders`.
  - Asserts 100% of foreign keys in `order_items.product_id` exist in `products`.
  - Asserts 100% of foreign keys in `payments.order_id` exist in `orders`.
- If any referential constraint fails, the pipeline aborts before modifying the database.

---

## Repository Structure

```
ecommerce-etl-pipeline/
│
├── config/
│   └── .env.example              # Sample environment variable template
│
├── data/
│   ├── raw/                      # Raw incoming CSV files
│   │   ├── customers.csv
│   │   ├── products.csv
│   │   ├── orders.csv
│   │   ├── order_items.csv
│   │   ├── payments.csv
│   │   ├── orders_incremental.csv
│   │   ├── order_items_incremental.csv
│   │   └── payments_incremental.csv
│   ├── processed/                # Standardized datasets ready for ingestion
│   └── quarantine/               # Diverted invalid records with reason tags
│
├── logs/                         # Rotating timestamped execution log files
│
├── sql/
│   ├── schema.sql                # Complete MySQL 8.0 DDL script
│   └── validation_queries.sql    # Analytical verification & reconciliation SQL
│
├── src/
│   ├── __init__.py
│   ├── config.py                 # Configuration settings and schema metadata
│   ├── extract.py                # Source extraction & watermark filtering
│   ├── validate.py               # Schema validation & quarantine routing
│   ├── transform.py              # Cleaning, normalization, and deduplication
│   ├── quality_checks.py         # Automated pre-load quality assertions
│   ├── load.py                   # MySQL upsert loader & watermark manager
│   ├── pipeline.py               # Main CLI execution orchestrator
│   └── utils/
│       ├── __init__.py
│       ├── db.py                 # SQLAlchemy connection manager & engine
│       └── logger.py             # Dual console and file logging setup
│
├── tests/
│   └── test_pipeline.py          # Pytest suite for validation & transforms
│
├── docker-compose.yml            # 1-command MySQL 8.0 container setup
├── requirements.txt              # Pinned Python package dependencies
├── run_pipeline.sh               # Quickstart shell execution script
├── .gitignore
└── README.md
```

---

## Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Docker and Docker Compose (or an existing MySQL 8.0 server)

### 1. Clone the Repository & Configure Environment
```bash
git clone https://github.com/your-username/ecommerce-etl-pipeline.git
cd ecommerce-etl-pipeline

cp config/.env.example .env
```

### 2. Start MySQL via Docker
```bash
docker compose up -d
```
*This spins up a MySQL 8.0 container on port 3306, automatically executes `sql/schema.sql`, and creates the database `ecommerce_dw` with user `etl_user`.*

### 3. Install Python Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Run the Pipeline

#### Full Baseline Ingestion (First Run)
Initializes database tables, extracts baseline datasets, executes data quality gates, and loads data:
```bash
python -m src.pipeline --mode full --init-db
```

#### Incremental Delta Ingestion (Subsequent Runs)
Uses watermark timestamp tracking to ingest only records occurring after the last successful run:
```bash
python -m src.pipeline --mode incremental
```

#### Standalone / Offline Dev Mode (SQLite Fallback)
If testing without Docker or MySQL:
```bash
python -m src.pipeline --mode full --db-type sqlite --init-db
```

### 5. Run Automated Tests
```bash
pytest tests/ -v
```

---

## Example Pipeline Output

```
================================================================================
STARTING E-COMMERCE ETL PIPELINE | MODE: FULL | TARGET: MYSQL
================================================================================
[2026-10-08 10:00:01] [INFO   ] [db.py:48] Initialized Database Engine (MYSQL) -> ecommerce_dw
[2026-10-08 10:00:01] [INFO   ] [db.py:61] Database connection verified successfully for MYSQL.
[2026-10-08 10:00:02] [INFO   ] [extract.py:34] Extracted 15 records from customers.csv.
[2026-10-08 10:00:02] [INFO   ] [extract.py:34] Extracted 10 records from products.csv.
[2026-10-08 10:00:02] [INFO   ] [extract.py:34] Extracted 17 records from orders.csv.
[2026-10-08 10:00:02] [INFO   ] [extract.py:34] Extracted 19 records from order_items.csv.
[2026-10-08 10:00:02] [INFO   ] [extract.py:34] Extracted 15 records from payments.csv.
[2026-10-08 10:00:02] [INFO   ] [validate.py:118] Validation [orders]: 15 passed, 2 quarantined.
[2026-10-08 10:00:02] [WARNING] [validate.py:130] Quarantined 2 invalid records from 'orders' -> orders_quarantine_20261008_100002.csv
[2026-10-08 10:00:02] [INFO   ] [validate.py:118] Validation [order_items]: 18 passed, 1 quarantined.
[2026-10-08 10:00:02] [WARNING] [validate.py:130] Quarantined 1 invalid records from 'order_items' -> order_items_quarantine_20261008_100002.csv
[2026-10-08 10:00:03] [INFO   ] [load.py:64] Initialized Pipeline Audit Run ID: RUN-20261008100003-8f2e91
[2026-10-08 10:00:03] [INFO   ] [transform.py:108] Transformed 'customers': 15 records ready for loading.
[2026-10-08 10:00:03] [INFO   ] [transform.py:108] Transformed 'orders': 15 records ready for loading.
[2026-10-08 10:00:04] [INFO   ] [quality_checks.py:107] All 12 Data Quality Assertions PASSED successfully.
[2026-10-08 10:00:04] [INFO   ] [load.py:134] Loaded 15 rows into table 'customers'.
[2026-10-08 10:00:04] [INFO   ] [load.py:134] Loaded 10 rows into table 'products'.
[2026-10-08 10:00:05] [INFO   ] [load.py:134] Loaded 15 rows into table 'orders'.
[2026-10-08 10:00:05] [INFO   ] [load.py:134] Loaded 18 rows into table 'order_items'.
[2026-10-08 10:00:05] [INFO   ] [load.py:134] Loaded 15 rows into table 'payments'.
[2026-10-08 10:00:05] [INFO   ] [load.py:47] Updated watermark for table 'orders' -> 2024-02-25 16:40:50
[2026-10-08 10:00:05] [INFO   ] [load.py:92] Audit log updated: Run RUN-20261008100003-8f2e91 finished [SUCCESS] in 3.42s. Loaded: 73 rows.
================================================================================
PIPELINE COMPLETED SUCCESSFULLY [Duration: 3.42s]
  Extracted:   76 rows
  Cleaned:     73 rows
  Quarantined: 3 rows
  Loaded:      73 rows
================================================================================
```

---

## Sample SQL Validation Queries

### Financial Reconciliation (Item Revenue vs Payment Gateway)
```sql
WITH item_totals AS (
    SELECT order_id, ROUND(SUM(price + freight_value), 2) AS total_items_amount
    FROM order_items GROUP BY order_id
),
payment_totals AS (
    SELECT order_id, ROUND(SUM(payment_value), 2) AS total_payments_amount
    FROM payments GROUP BY order_id
)
SELECT
    o.order_id,
    o.order_status,
    it.total_items_amount,
    pt.total_payments_amount,
    ROUND(ABS(COALESCE(it.total_items_amount, 0) - COALESCE(pt.total_payments_amount, 0)), 2) AS variance_amount,
    CASE
        WHEN ROUND(ABS(COALESCE(it.total_items_amount, 0) - COALESCE(pt.total_payments_amount, 0)), 2) < 0.05 THEN 'BALANCED'
        ELSE 'VARIANCE_FLAGGED'
    END AS reconciliation_status
FROM orders o
LEFT JOIN item_totals it ON o.order_id = it.order_id
LEFT JOIN payment_totals pt ON o.order_id = pt.order_id;
```

### Top 5 Revenue-Generating Product Categories
```sql
SELECT
    p.product_category_name,
    COUNT(DISTINCT oi.order_id) AS distinct_orders_count,
    SUM(oi.price) AS total_category_revenue,
    ROUND(AVG(oi.price), 2) AS avg_unit_price
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_status != 'canceled'
GROUP BY p.product_category_name
ORDER BY total_category_revenue DESC
LIMIT 5;
```

---

## Data Engineer Interview Talking Points

1. **How do you guarantee idempotency during ETL re-runs?**
   > *"I designed the loading stage using parameterized upsert statements (`INSERT ... ON DUPLICATE KEY UPDATE` in MySQL). Primary and composite business keys prevent duplicate record insertion. If a batch is re-run due to an upstream network timeout, existing records are updated in place rather than duplicated."*

2. **How does your incremental loading mechanism handle late-arriving data?**
   > *"The pipeline records high-watermarks in a dedicated `etl_watermarks` metadata table indexed by pipeline and entity name. For delta runs, we query records where the transaction timestamp exceeds the watermark. To protect against late-arriving events within a small clock-drift window, the watermark can also incorporate a lookback buffer (e.g. 1 hour) combined with the idempotent upsert logic."*

3. **How do you isolate dirty records without breaking production pipeline execution?**
   > *"Rather than letting an entire batch fail on a single faulty record or discarding corrupted data silently, I implemented a quarantine gate. Rows violating schema constraints, null keys, or non-positive price checks are segregated into timestamped quarantine CSVs with rejection reason tags, while clean rows proceed through transformation and loading."*
