import os
from dataclasses import dataclass, field
from typing import Dict, List, Any

@dataclass
class PipelineConfig:
    """
    Centralized configuration settings for the e-commerce ETL pipeline.
    Reads environment variables with fallback defaults for local development.
    """
    # Environment & Database settings
    db_type: str = os.getenv("DB_TYPE", "mysql") # "mysql" or "sqlite"
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "3306"))
    db_name: str = os.getenv("DB_NAME", "ecommerce_dw")
    db_user: str = os.getenv("DB_USER", "etl_user")
    db_password: str = os.getenv("DB_PASSWORD", "etl_password")
    sqlite_path: str = os.getenv("SQLITE_PATH", "ecommerce_dw.db")

    # Directory Paths
    base_dir: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_data_dir: str = os.path.join(base_dir, "data", "raw")
    processed_data_dir: str = os.path.join(base_dir, "data", "processed")
    quarantine_data_dir: str = os.path.join(base_dir, "data", "quarantine")
    logs_dir: str = os.path.join(base_dir, "logs")
    sql_dir: str = os.path.join(base_dir, "sql")

    # Incremental watermark settings
    pipeline_name: str = "ecommerce_orders_daily"
    watermark_table: str = "etl_watermarks"
    watermark_column: str = "order_purchase_timestamp"

    # Schema expectations and validation rules
    tables: List[str] = field(default_factory=lambda: [
        "customers", "products", "orders", "order_items", "payments"
    ])

    expected_schemas: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "customers": {
            "required_columns": [
                "customer_id", "customer_unique_id", "customer_city",
                "customer_state", "customer_zip_code_prefix", "created_at"
            ],
            "primary_key": ["customer_id"],
            "not_null_columns": ["customer_id", "customer_unique_id", "customer_city", "customer_state"]
        },
        "products": {
            "required_columns": [
                "product_id", "product_category_name"
            ],
            "primary_key": ["product_id"],
            "not_null_columns": ["product_id", "product_category_name"]
        },
        "orders": {
            "required_columns": [
                "order_id", "customer_id", "order_status",
                "order_purchase_timestamp", "order_estimated_delivery_date"
            ],
            "primary_key": ["order_id"],
            "not_null_columns": [
                "order_id", "customer_id", "order_status",
                "order_purchase_timestamp", "order_estimated_delivery_date"
            ],
            "allowed_statuses": [
                "delivered", "shipped", "processing", "invoiced", "canceled", "unavailable"
            ]
        },
        "order_items": {
            "required_columns": [
                "order_id", "order_item_id", "product_id", "price", "freight_value", "shipping_limit_date"
            ],
            "primary_key": ["order_id", "order_item_id"],
            "not_null_columns": ["order_id", "order_item_id", "product_id", "price"],
            "min_price": 0.01,
            "min_freight": 0.0
        },
        "payments": {
            "required_columns": [
                "order_id", "payment_sequential", "payment_type", "payment_installments", "payment_value"
            ],
            "primary_key": ["order_id", "payment_sequential"],
            "not_null_columns": ["order_id", "payment_sequential", "payment_type", "payment_value"],
            "allowed_payment_types": ["credit_card", "boleto", "voucher", "debit_card"]
        }
    })
