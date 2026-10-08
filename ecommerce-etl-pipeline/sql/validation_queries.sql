-- ==============================================================================
-- Project: E-Commerce End-to-End ETL Pipeline
-- File: validation_queries.sql
-- Description: Post-load integrity checks, audit reconciliation, and business KPI
--              verification queries executed to certify data quality in MySQL.
-- ==============================================================================

USE ecommerce_dw;

-- ------------------------------------------------------------------------------
-- 1. Table Row Counts & Basic Volume Verification
-- ------------------------------------------------------------------------------
SELECT 'customers' AS table_name, COUNT(*) AS total_rows, MAX(loaded_at) AS last_loaded FROM customers
UNION ALL
SELECT 'products', COUNT(*), MAX(loaded_at) FROM products
UNION ALL
SELECT 'orders', COUNT(*), MAX(loaded_at) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*), MAX(loaded_at) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*), MAX(loaded_at) FROM payments
UNION ALL
SELECT 'etl_audit_log', COUNT(*), MAX(started_at) FROM etl_audit_log;

-- ------------------------------------------------------------------------------
-- 2. Referential Integrity Audit (Checking for Orphaned Child Records)
--    Expectation: 0 rows returned for each check.
-- ------------------------------------------------------------------------------
-- A. Orders without valid Customers
SELECT
    o.order_id,
    o.customer_id,
    'Orphaned Order (Invalid Customer)' AS issue_type
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;

-- B. Order Items without valid Orders
SELECT
    oi.order_id,
    oi.order_item_id,
    'Orphaned Item (Invalid Order)' AS issue_type
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_id IS NULL;

-- C. Order Items without valid Products
SELECT
    oi.order_id,
    oi.product_id,
    'Orphaned Item (Invalid Product)' AS issue_type
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.product_id
WHERE p.product_id IS NULL;

-- ------------------------------------------------------------------------------
-- 3. Financial Reconciliation: Order Items Total (Price + Freight) vs Payments
--    Ensures no discrepancy between invoiced items and collected payments.
-- ------------------------------------------------------------------------------
WITH item_totals AS (
    SELECT
        order_id,
        ROUND(SUM(price + freight_value), 2) AS total_items_amount
    FROM order_items
    GROUP BY order_id
),
payment_totals AS (
    SELECT
        order_id,
        ROUND(SUM(payment_value), 2) AS total_payments_amount
    FROM payments
    GROUP BY order_id
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
LEFT JOIN payment_totals pt ON o.order_id = pt.order_id
ORDER BY variance_amount DESC;

-- ------------------------------------------------------------------------------
-- 4. Value Domain & Anomaly Checks
--    Expectation: 0 rows returned for negative pricing or future purchase dates.
-- ------------------------------------------------------------------------------
SELECT
    order_id,
    order_item_id,
    price,
    freight_value
FROM order_items
WHERE price <= 0 OR freight_value < 0;

SELECT
    order_id,
    order_purchase_timestamp
FROM orders
WHERE order_purchase_timestamp > NOW();

-- ------------------------------------------------------------------------------
-- 5. Business KPI: Monthly GMV & Order Volume
-- ------------------------------------------------------------------------------
SELECT
    DATE_FORMAT(o.order_purchase_timestamp, '%Y-%m') AS order_month,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COUNT(DISTINCT o.customer_id) AS active_customers,
    ROUND(SUM(p.payment_value), 2) AS gross_merchandise_value,
    ROUND(AVG(p.payment_value), 2) AS avg_order_value
FROM orders o
JOIN payments p ON o.order_id = p.order_id
WHERE o.order_status != 'canceled'
GROUP BY DATE_FORMAT(o.order_purchase_timestamp, '%Y-%m')
ORDER BY order_month ASC;

-- ------------------------------------------------------------------------------
-- 6. Top 5 Revenue-Generating Product Categories
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. Customer Retention & Repeat Purchase Analysis
-- ------------------------------------------------------------------------------
WITH customer_order_counts AS (
    SELECT
        c.customer_unique_id,
        COUNT(DISTINCT o.order_id) AS lifetime_orders,
        SUM(p.payment_value) AS total_spend
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    JOIN payments p ON o.order_id = p.order_id
    GROUP BY c.customer_unique_id
)
SELECT
    CASE
        WHEN lifetime_orders = 1 THEN '1_single_purchase'
        WHEN lifetime_orders = 2 THEN '2_repeat_purchaser'
        ELSE '3_loyal_customer'
    END AS customer_cohort,
    COUNT(*) AS total_customers,
    ROUND(SUM(total_spend), 2) AS cohort_spend,
    ROUND(AVG(total_spend), 2) AS avg_customer_spend
FROM customer_order_counts
GROUP BY customer_cohort
ORDER BY customer_cohort;

-- ------------------------------------------------------------------------------
-- 8. ETL Watermark & Execution Health Check
-- ------------------------------------------------------------------------------
SELECT
    w.pipeline_name,
    w.table_name,
    w.watermark_column,
    w.last_success_value,
    w.last_run_timestamp,
    a.run_id AS last_audit_run_id,
    a.status AS last_run_status,
    a.records_loaded AS last_records_loaded,
    a.duration_seconds
FROM etl_watermarks w
LEFT JOIN (
    SELECT *
    FROM etl_audit_log
    ORDER BY started_at DESC
    LIMIT 1
) a ON 1=1;
