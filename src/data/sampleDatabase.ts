export interface TableSchema {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    keyType?: 'PK' | 'FK' | 'COMPOSITE_PK';
    references?: string;
    index?: string;
    description: string;
  }[];
}

export interface SqlQueryExample {
  id: string;
  title: string;
  category: 'Reconciliation' | 'KPI' | 'Integrity' | 'Observability';
  description: string;
  sql: string;
  resultsColumns: string[];
  resultsRows: (string | number)[][];
}

export const DATABASE_SCHEMAS: TableSchema[] = [
  {
    name: 'customers',
    description: 'Master dimension table storing verified customer geographic and account identities.',
    columns: [
      { name: 'customer_id', type: 'VARCHAR(32)', nullable: false, keyType: 'PK', description: 'Unique order-level customer identifier' },
      { name: 'customer_unique_id', type: 'VARCHAR(32)', nullable: false, index: 'idx_customers_unique_id', description: 'Global cross-order buyer identity' },
      { name: 'customer_city', type: 'VARCHAR(100)', nullable: false, index: 'idx_customers_state_city', description: 'Customer normalized city name' },
      { name: 'customer_state', type: 'VARCHAR(10)', nullable: false, index: 'idx_customers_state_city', description: 'Two-letter ISO state code' },
      { name: 'customer_zip_code_prefix', type: 'VARCHAR(10)', nullable: false, description: '5-digit postal zip prefix' },
      { name: 'created_at', type: 'DATETIME', nullable: false, description: 'Customer creation timestamp' },
      { name: 'loaded_at', type: 'TIMESTAMP', nullable: false, description: 'ETL metadata load timestamp' },
    ],
  },
  {
    name: 'products',
    description: 'Product catalog dimension containing categories and physical shipping attributes.',
    columns: [
      { name: 'product_id', type: 'VARCHAR(32)', nullable: false, keyType: 'PK', description: 'Primary product SKU identifier' },
      { name: 'product_category_name', type: 'VARCHAR(100)', nullable: false, index: 'idx_products_category', description: 'Normalized category slug' },
      { name: 'product_name_length', type: 'INT', nullable: true, description: 'Character count of product title' },
      { name: 'product_description_length', type: 'INT', nullable: true, description: 'Length of description text' },
      { name: 'product_weight_g', type: 'DECIMAL(10,2)', nullable: true, description: 'Weight in grams for logistics calculations' },
      { name: 'product_length_cm', type: 'DECIMAL(10,2)', nullable: true, description: 'Package length in cm' },
      { name: 'product_height_cm', type: 'DECIMAL(10,2)', nullable: true, description: 'Package height in cm' },
      { name: 'product_width_cm', type: 'DECIMAL(10,2)', nullable: true, description: 'Package width in cm' },
      { name: 'loaded_at', type: 'TIMESTAMP', nullable: false, description: 'ETL load timestamp' },
    ],
  },
  {
    name: 'orders',
    description: 'Core transaction fact table recording lifecycle timestamps and delivery statuses.',
    columns: [
      { name: 'order_id', type: 'VARCHAR(32)', nullable: false, keyType: 'PK', description: 'Unique order identifier' },
      { name: 'customer_id', type: 'VARCHAR(32)', nullable: false, keyType: 'FK', references: 'customers.customer_id', index: 'idx_orders_customer_purchase', description: 'FK to purchasing customer' },
      { name: 'order_status', type: 'VARCHAR(20)', nullable: false, index: 'idx_orders_status', description: 'Lifecycle state (delivered, shipped, processing)' },
      { name: 'order_purchase_timestamp', type: 'DATETIME', nullable: false, index: 'idx_orders_purchase_timestamp', description: 'Watermark tracking column' },
      { name: 'order_approved_at', type: 'DATETIME', nullable: true, description: 'Payment approval timestamp' },
      { name: 'order_delivered_carrier_date', type: 'DATETIME', nullable: true, description: 'Handover to carrier timestamp' },
      { name: 'order_delivered_customer_date', type: 'DATETIME', nullable: true, description: 'Final doorstep delivery timestamp' },
      { name: 'order_estimated_delivery_date', type: 'DATETIME', nullable: false, description: 'Promised estimated delivery date' },
      { name: 'loaded_at', type: 'TIMESTAMP', nullable: false, description: 'Initial insert timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: 'Auto-updated on UPSERT' },
    ],
  },
  {
    name: 'order_items',
    description: 'Line item grain fact table linking orders to specific product units, pricing, and freight.',
    columns: [
      { name: 'order_id', type: 'VARCHAR(32)', nullable: false, keyType: 'COMPOSITE_PK', references: 'orders.order_id', description: 'FK to parent order' },
      { name: 'order_item_id', type: 'INT', nullable: false, keyType: 'COMPOSITE_PK', description: 'Sequential item index (1, 2, ...)' },
      { name: 'product_id', type: 'VARCHAR(32)', nullable: false, keyType: 'FK', references: 'products.product_id', index: 'idx_order_items_product', description: 'FK to catalog product' },
      { name: 'price', type: 'DECIMAL(10,2)', nullable: false, description: 'Unit retail price' },
      { name: 'freight_value', type: 'DECIMAL(10,2)', nullable: false, description: 'Shipping & handling freight charge' },
      { name: 'shipping_limit_date', type: 'DATETIME', nullable: false, description: 'Seller fulfillment deadline' },
      { name: 'loaded_at', type: 'TIMESTAMP', nullable: false, description: 'ETL load timestamp' },
    ],
  },
  {
    name: 'payments',
    description: 'Financial ledger recording payment tenders, installment terms, and processed amounts.',
    columns: [
      { name: 'order_id', type: 'VARCHAR(32)', nullable: false, keyType: 'COMPOSITE_PK', references: 'orders.order_id', description: 'FK to parent order' },
      { name: 'payment_sequential', type: 'INT', nullable: false, keyType: 'COMPOSITE_PK', description: 'Sequential tender number' },
      { name: 'payment_type', type: 'VARCHAR(30)', nullable: false, index: 'idx_payments_type', description: 'Payment method (credit_card, boleto, voucher)' },
      { name: 'payment_installments', type: 'INT', nullable: false, description: 'Number of monthly installments' },
      { name: 'payment_value', type: 'DECIMAL(10,2)', nullable: false, description: 'Total charge amount' },
      { name: 'loaded_at', type: 'TIMESTAMP', nullable: false, description: 'ETL load timestamp' },
    ],
  },
  {
    name: 'etl_watermarks',
    description: 'State management metadata table for tracking high-watermarks in incremental extraction.',
    columns: [
      { name: 'pipeline_name', type: 'VARCHAR(64)', nullable: false, keyType: 'COMPOSITE_PK', description: 'Pipeline identifier' },
      { name: 'table_name', type: 'VARCHAR(64)', nullable: false, keyType: 'COMPOSITE_PK', description: 'Target table tracked' },
      { name: 'watermark_column', type: 'VARCHAR(64)', nullable: false, description: 'Timestamp column used as filter cutoff' },
      { name: 'last_success_value', type: 'VARCHAR(128)', nullable: false, description: 'Latest processed timestamp value' },
      { name: 'last_run_timestamp', type: 'DATETIME', nullable: false, description: 'Time of last successful watermark advancement' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: 'System update timestamp' },
    ],
  },
  {
    name: 'etl_audit_log',
    description: 'Comprehensive execution audit ledger recording row counts, durations, and errors.',
    columns: [
      { name: 'run_id', type: 'VARCHAR(64)', nullable: false, keyType: 'PK', description: 'Unique batch execution run identifier' },
      { name: 'pipeline_mode', type: 'VARCHAR(20)', nullable: false, description: 'FULL or INCREMENTAL' },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, description: 'RUNNING, SUCCESS, FAILED' },
      { name: 'records_extracted', type: 'INT', nullable: false, description: 'Total raw records read' },
      { name: 'records_cleaned', type: 'INT', nullable: false, description: 'Records passing schema validation' },
      { name: 'records_quarantined', type: 'INT', nullable: false, description: 'Records rejected and sent to quarantine' },
      { name: 'records_loaded', type: 'INT', nullable: false, description: 'Records committed into target tables' },
      { name: 'started_at', type: 'DATETIME', nullable: false, description: 'Execution start time' },
      { name: 'ended_at', type: 'DATETIME', nullable: true, description: 'Execution finish time' },
      { name: 'duration_seconds', type: 'DECIMAL(10,2)', nullable: true, description: 'Total runtime in seconds' },
      { name: 'error_message', type: 'TEXT', nullable: true, description: 'Exception stack or error details if failed' },
    ],
  },
];

export const VALIDATION_QUERIES: SqlQueryExample[] = [
  {
    id: 'financial_reconciliation',
    title: 'Financial Reconciliation: Order Items vs Payments',
    category: 'Reconciliation',
    description: 'Audits invoiced basket totals (price + freight) against gateway payment collections to guarantee 0 uncaptured revenue.',
    sql: `WITH item_totals AS (
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
LEFT JOIN payment_totals pt ON o.order_id = pt.order_id
ORDER BY variance_amount DESC
LIMIT 10;`,
    resultsColumns: ['order_id', 'order_status', 'total_items_amount', 'total_payments_amount', 'variance_amount', 'reconciliation_status'],
    resultsRows: [
      ['ORD-7001', 'delivered', 164.49, 164.49, 0.00, 'BALANCED'],
      ['ORD-7002', 'delivered', 90.70, 90.70, 0.00, 'BALANCED'],
      ['ORD-7003', 'delivered', 395.50, 395.50, 0.00, 'BALANCED'],
      ['ORD-7004', 'shipped', 210.00, 210.00, 0.00, 'BALANCED'],
      ['ORD-7005', 'delivered', 101.90, 101.90, 0.00, 'BALANCED'],
      ['ORD-7006', 'delivered', 44.00, 44.00, 0.00, 'BALANCED'],
      ['ORD-7007', 'delivered', 229.49, 229.49, 0.00, 'BALANCED'],
      ['ORD-7008', 'canceled', 488.00, 488.00, 0.00, 'BALANCED'],
      ['ORD-7009', 'delivered', 131.50, 131.50, 0.00, 'BALANCED'],
      ['ORD-7010', 'delivered', 90.70, 90.70, 0.00, 'BALANCED'],
    ],
  },
  {
    id: 'referential_integrity',
    title: 'Referential Integrity Audit (Orphaned Foreign Keys)',
    category: 'Integrity',
    description: 'Verifies that every transactional record has parent integrity in dimension tables. Expectation is 0 rows returned.',
    sql: `SELECT
    o.order_id,
    o.customer_id,
    'Orphaned Order (Invalid Customer)' AS issue_type
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL

UNION ALL

SELECT
    oi.order_id,
    oi.product_id,
    'Orphaned Item (Invalid Product)' AS issue_type
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.product_id
WHERE p.product_id IS NULL;`,
    resultsColumns: ['order_id', 'entity_id', 'issue_type'],
    resultsRows: [], // 0 rows = clean referential integrity!
  },
  {
    id: 'monthly_gmv',
    title: 'Monthly GMV & Average Order Value (AOV)',
    category: 'KPI',
    description: 'Calculates Gross Merchandise Value, distinct purchaser count, and AOV across order purchase months.',
    sql: `SELECT
    DATE_FORMAT(o.order_purchase_timestamp, '%Y-%m') AS order_month,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COUNT(DISTINCT o.customer_id) AS active_customers,
    ROUND(SUM(p.payment_value), 2) AS gross_merchandise_value,
    ROUND(AVG(p.payment_value), 2) AS avg_order_value
FROM orders o
JOIN payments p ON o.order_id = p.order_id
WHERE o.order_status != 'canceled'
GROUP BY DATE_FORMAT(o.order_purchase_timestamp, '%Y-%m')
ORDER BY order_month ASC;`,
    resultsColumns: ['order_month', 'total_orders', 'active_customers', 'gross_merchandise_value', 'avg_order_value'],
    resultsRows: [
      ['2024-01', 6, 6, 1236.08, 206.01],
      ['2024-02', 8, 8, 1184.59, 148.07],
      ['2024-03', 5, 5, 764.09, 152.82],
    ],
  },
  {
    id: 'top_categories',
    title: 'Top 5 Revenue-Generating Product Categories',
    category: 'KPI',
    description: 'Aggregates catalog sales volume and revenue by product category.',
    sql: `SELECT
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
LIMIT 5;`,
    resultsColumns: ['product_category_name', 'distinct_orders_count', 'total_category_revenue', 'avg_unit_price'],
    resultsRows: [
      ['computers_accessories', 3, 960.00, 320.00],
      ['electronics', 5, 749.95, 149.99],
      ['home_appliances', 3, 555.00, 185.00],
      ['office_furniture', 1, 450.00, 450.00],
      ['audio_video', 3, 238.50, 79.50],
    ],
  },
  {
    id: 'customer_cohorts',
    title: 'Customer Retention & Cohort Repeat Purchase Rate',
    category: 'KPI',
    description: 'Segments unique customers by lifetime order frequency and spend distribution.',
    sql: `WITH customer_order_counts AS (
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
ORDER BY customer_cohort;`,
    resultsColumns: ['customer_cohort', 'total_customers', 'cohort_spend', 'avg_customer_spend'],
    resultsRows: [
      ['1_single_purchase', 13, 2790.78, 214.68],
      ['2_repeat_purchaser', 2, 882.00, 441.00],
    ],
  },
  {
    id: 'watermark_audit',
    title: 'ETL Watermark State & Audit Execution Status',
    category: 'Observability',
    description: 'Inspects current high-watermarks alongside the latest audit ledger execution record.',
    sql: `SELECT
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
) a ON 1=1;`,
    resultsColumns: ['pipeline_name', 'table_name', 'watermark_column', 'last_success_value', 'last_run_timestamp', 'last_audit_run_id', 'last_run_status', 'last_records_loaded', 'duration_seconds'],
    resultsRows: [
      ['ecommerce_orders_daily', 'orders', 'order_purchase_timestamp', '2024-03-12 18:00:20', '2026-10-08 10:05:22', 'RUN-20261008100518-a3f12c', 'SUCCESS', 20, 2.84],
    ],
  },
];
