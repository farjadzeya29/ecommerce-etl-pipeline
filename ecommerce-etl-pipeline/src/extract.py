import os
import logging
from typing import Dict, Any, Optional
import pandas as pd
from .config import PipelineConfig

logger = logging.getLogger("ecommerce_etl")

class DataExtractor:
    """
    Extracts raw e-commerce data from CSV/JSON sources.
    Supports both Full Initial Extract and Timestamp-based Incremental Ingestion.
    """
    def __init__(self, config: PipelineConfig):
        self.config = config

    def extract_file(self, file_path: str) -> pd.DataFrame:
        """Reads a CSV or JSON file into a pandas DataFrame."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file does not exist: {file_path}")

        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == ".csv":
            df = pd.read_csv(file_path, dtype=str) # Ingest as string initially for robust raw validation
        elif file_ext in (".json", ".jsonl"):
            df = pd.read_json(file_path, dtype=str)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        logger.info(f"Extracted {len(df)} records from {os.path.basename(file_path)}.")
        return df

    def extract_all(self, mode: str = "full", last_watermark: Optional[str] = None) -> Dict[str, pd.DataFrame]:
        """
        Extracts all datasets based on pipeline execution mode.
        - 'full': Loads baseline master and transaction datasets.
        - 'incremental': Ingests delta/incremental batch files and filters by timestamp watermark.
        """
        logger.info(f"Starting Data Extraction stage (Mode: {mode.upper()})...")
        extracted_data = {}

        if mode == "full":
            dataset_files = {
                "customers": "customers.csv",
                "products": "products.csv",
                "orders": "orders.csv",
                "order_items": "order_items.csv",
                "payments": "payments.csv"
            }
        else:
            # Incremental ingestion
            logger.info(f"High-watermark cutoff: {last_watermark or 'None (ingesting all new delta files)'}")
            dataset_files = {
                "customers": "customers.csv", # Dimension tables can be re-scanned or upserted
                "products": "products.csv",
                "orders": "orders_incremental.csv" if os.path.exists(os.path.join(self.config.raw_data_dir, "orders_incremental.csv")) else "orders.csv",
                "order_items": "order_items_incremental.csv" if os.path.exists(os.path.join(self.config.raw_data_dir, "order_items_incremental.csv")) else "order_items.csv",
                "payments": "payments_incremental.csv" if os.path.exists(os.path.join(self.config.raw_data_dir, "payments_incremental.csv")) else "payments.csv"
            }

        for table_name, filename in dataset_files.items():
            path = os.path.join(self.config.raw_data_dir, filename)
            if not os.path.exists(path):
                logger.warning(f"File {filename} not found in {self.config.raw_data_dir}. Skipping.")
                continue

            df = self.extract_file(path)

            # Apply timestamp filtering if incremental watermark exists
            if mode == "incremental" and last_watermark and table_name == "orders":
                if "order_purchase_timestamp" in df.columns:
                    initial_count = len(df)
                    df = df[df["order_purchase_timestamp"] > last_watermark]
                    logger.info(
                        f"Applied watermark filter on orders ({last_watermark}): "
                        f"{len(df)} of {initial_count} records qualified for incremental load."
                    )

            extracted_data[table_name] = df

        total_records = sum(len(df) for df in extracted_data.values())
        logger.info(f"Extraction Stage Completed: {len(extracted_data)} tables, {total_records} total raw records read.")
        return extracted_data
