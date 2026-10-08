import os
import logging
from typing import Dict, Any
import pandas as pd
from .config import PipelineConfig

logger = logging.getLogger("ecommerce_etl")

class DataTransformer:
    """
    Standardizes data types, normalizes categorical fields,
    enforces datetime formatting, calculates derived business metrics,
    and deduplicates records.
    """
    def __init__(self, config: PipelineConfig):
        self.config = config

    def transform_customers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transforms and standardizes customer records."""
        df = df.copy()
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        df["customer_unique_id"] = df["customer_unique_id"].astype(str).str.strip()
        df["customer_city"] = df["customer_city"].astype(str).str.strip().str.title()
        df["customer_state"] = df["customer_state"].astype(str).str.strip().str.upper()
        df["customer_zip_code_prefix"] = df["customer_zip_code_prefix"].astype(str).str.strip().str.zfill(5)
        df["created_at"] = pd.to_datetime(df["created_at"]).dt.strftime("%Y-%m-%d %H:%M:%S")

        # Deduplicate on primary key if any identical re-ingested
        df = df.drop_duplicates(subset=["customer_id"], keep="last")
        return df

    def transform_products(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardizes product dimensions and categories."""
        df = df.copy()
        df["product_id"] = df["product_id"].astype(str).str.strip()
        df["product_category_name"] = df["product_category_name"].astype(str).str.strip().str.lower()

        # Handle numeric dimensions with proper types
        numeric_cols = [
            "product_name_length", "product_description_length",
            "product_weight_g", "product_length_cm", "product_height_cm", "product_width_cm"
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df = df.drop_duplicates(subset=["product_id"], keep="last")
        return df

    def transform_orders(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transforms order records, standardizes timestamps and statuses."""
        df = df.copy()
        df["order_id"] = df["order_id"].astype(str).str.strip()
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        df["order_status"] = df["order_status"].astype(str).str.strip().str.lower()

        # Format datetime columns to ISO standard
        date_cols = [
            "order_purchase_timestamp", "order_approved_at",
            "order_delivered_carrier_date", "order_delivered_customer_date",
            "order_estimated_delivery_date"
        ]
        for col in date_cols:
            if col in df.columns:
                # Convert to datetime and format as string, keeping NaT as None
                dt_series = pd.to_datetime(df[col], errors="coerce")
                df[col] = dt_series.dt.strftime("%Y-%m-%d %H:%M:%S").where(dt_series.notna(), None)

        # Ensure order_purchase_timestamp is sorted and primary key deduplicated
        df = df.drop_duplicates(subset=["order_id"], keep="last")
        return df

    def transform_order_items(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardizes order items, numeric precision, and computes line item totals."""
        df = df.copy()
        df["order_id"] = df["order_id"].astype(str).str.strip()
        df["order_item_id"] = pd.to_numeric(df["order_item_id"]).astype(int)
        df["product_id"] = df["product_id"].astype(str).str.strip()
        df["price"] = pd.to_numeric(df["price"]).round(2)
        df["freight_value"] = pd.to_numeric(df["freight_value"]).round(2)

        if "shipping_limit_date" in df.columns:
            df["shipping_limit_date"] = pd.to_datetime(df["shipping_limit_date"]).dt.strftime("%Y-%m-%d %H:%M:%S")

        df = df.drop_duplicates(subset=["order_id", "order_item_id"], keep="last")
        return df

    def transform_payments(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardizes payments and installment amounts."""
        df = df.copy()
        df["order_id"] = df["order_id"].astype(str).str.strip()
        df["payment_sequential"] = pd.to_numeric(df["payment_sequential"]).astype(int)
        df["payment_type"] = df["payment_type"].astype(str).str.strip().str.lower()
        df["payment_installments"] = pd.to_numeric(df["payment_installments"]).astype(int)
        df["payment_value"] = pd.to_numeric(df["payment_value"]).round(2)

        df = df.drop_duplicates(subset=["order_id", "payment_sequential"], keep="last")
        return df

    def transform_all(self, data_dict: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """Applies table-specific transformations across all valid datasets."""
        logger.info("Executing Data Transformation & Standardization Phase...")
        transformers = {
            "customers": self.transform_customers,
            "products": self.transform_products,
            "orders": self.transform_orders,
            "order_items": self.transform_order_items,
            "payments": self.transform_payments
        }

        transformed_data = {}
        os.makedirs(self.config.processed_data_dir, exist_ok=True)

        for table_name, df in data_dict.items():
            if table_name in transformers:
                transformed_df = transformers[table_name](df)
            else:
                transformed_df = df.copy()

            transformed_data[table_name] = transformed_df

            # Persist processed dataset for debugging & data lineage audit
            processed_file = os.path.join(self.config.processed_data_dir, f"{table_name}_processed.csv")
            transformed_df.to_csv(processed_file, index=False)
            logger.info(
                f"Transformed '{table_name}': {len(transformed_df)} records ready for loading."
            )

        return transformed_data
