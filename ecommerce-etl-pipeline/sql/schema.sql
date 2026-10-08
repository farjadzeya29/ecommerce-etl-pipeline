-- ==============================================================================
-- Project: E-Commerce End-to-End ETL Pipeline
-- Target Database: MySQL 8.0+
-- File: schema.sql
-- Description: Production DDL script defining relational entities,
--              primary keys, foreign keys, compound indexes,
--              audit logging, and incremental watermark tables.
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS ecommerce_dw
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecommerce_dw;

-- Disable FK checks during schema setup for idempotency
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS etl_audit_log;
DROP TABLE IF EXISTS etl_watermarks;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. Table: customers
-- ------------------------------------------------------------------------------
CREATE TABLE customers (
    customer_id VARCHAR(32) NOT NULL,
    customer_unique_id VARCHAR(32) NOT NULL,
    customer_city VARCHAR(100) NOT NULL,
    customer_state VARCHAR(10) NOT NULL,
    customer_zip_code_prefix VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_customers PRIMARY KEY (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customers_unique_id ON customers (customer_unique_id);
CREATE INDEX idx_customers_state_city ON customers (customer_state, customer_city);

-- ------------------------------------------------------------------------------
-- 2. Table: products
-- ------------------------------------------------------------------------------
CREATE TABLE products (
    product_id VARCHAR(32) NOT NULL,
    product_category_name VARCHAR(100) NOT NULL,
    product_name_length INT NULL,
    product_description_length INT NULL,
    product_weight_g DECIMAL(10, 2) NULL,
    product_length_cm DECIMAL(10, 2) NULL,
    product_height_cm DECIMAL(10, 2) NULL,
    product_width_cm DECIMAL(10, 2) NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_products PRIMARY KEY (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_category ON products (product_category_name);

-- ------------------------------------------------------------------------------
-- 3. Table: orders
-- ------------------------------------------------------------------------------
CREATE TABLE orders (
    order_id VARCHAR(32) NOT NULL,
    customer_id VARCHAR(32) NOT NULL,
    order_status VARCHAR(20) NOT NULL,
    order_purchase_timestamp DATETIME NOT NULL,
    order_approved_at DATETIME NULL,
    order_delivered_carrier_date DATETIME NULL,
    order_delivered_customer_date DATETIME NULL,
    order_estimated_delivery_date DATETIME NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_orders PRIMARY KEY (order_id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
        REFERENCES customers (customer_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_purchase_timestamp ON orders (order_purchase_timestamp);
CREATE INDEX idx_orders_customer_purchase ON orders (customer_id, order_purchase_timestamp);
CREATE INDEX idx_orders_status ON orders (order_status);

-- ------------------------------------------------------------------------------
-- 4. Table: order_items
-- ------------------------------------------------------------------------------
CREATE TABLE order_items (
    order_id VARCHAR(32) NOT NULL,
    order_item_id INT NOT NULL,
    product_id VARCHAR(32) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    freight_value DECIMAL(10, 2) NOT NULL,
    shipping_limit_date DATETIME NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_order_items PRIMARY KEY (order_id, order_item_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders (order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
        REFERENCES products (product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ------------------------------------------------------------------------------
-- 5. Table: payments
-- ------------------------------------------------------------------------------
CREATE TABLE payments (
    order_id VARCHAR(32) NOT NULL,
    payment_sequential INT NOT NULL,
    payment_type VARCHAR(30) NOT NULL,
    payment_installments INT NOT NULL DEFAULT 1,
    payment_value DECIMAL(10, 2) NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_payments PRIMARY KEY (order_id, payment_sequential),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
        REFERENCES orders (order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_type ON payments (payment_type);

-- ------------------------------------------------------------------------------
-- 6. Table: etl_watermarks (State Store for Incremental Extraction)
-- ------------------------------------------------------------------------------
CREATE TABLE etl_watermarks (
    pipeline_name VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    watermark_column VARCHAR(64) NOT NULL,
    last_success_value VARCHAR(128) NOT NULL,
    last_run_timestamp DATETIME NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_etl_watermarks PRIMARY KEY (pipeline_name, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: etl_audit_log (Observability & Pipeline Execution History)
-- ------------------------------------------------------------------------------
CREATE TABLE etl_audit_log (
    run_id VARCHAR(64) NOT NULL,
    pipeline_mode VARCHAR(20) NOT NULL, -- 'FULL' or 'INCREMENTAL'
    status VARCHAR(20) NOT NULL,        -- 'RUNNING', 'SUCCESS', 'FAILED'
    records_extracted INT NOT NULL DEFAULT 0,
    records_cleaned INT NOT NULL DEFAULT 0,
    records_quarantined INT NOT NULL DEFAULT 0,
    records_loaded INT NOT NULL DEFAULT 0,
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    duration_seconds DECIMAL(10, 2) NULL,
    error_message TEXT NULL,
    CONSTRAINT pk_etl_audit_log PRIMARY KEY (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_etl_audit_started ON etl_audit_log (started_at DESC);
