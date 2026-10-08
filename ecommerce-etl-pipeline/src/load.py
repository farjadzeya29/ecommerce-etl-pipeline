import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd
from .config import PipelineConfig
from .utils.db import DatabaseManager

logger = logging.getLogger("ecommerce_etl")

class DataLoader:
    """
    Loads transformed records into MySQL (or SQLite) relational tables
    in correct referential dependency order.
    Maintains incremental high-watermarks and records pipeline execution audit trails.
    """
    def __init__(self, config: PipelineConfig, db_manager: DatabaseManager):
        self.config = config
        self.db = db_manager

    def get_last_watermark(self, table_name: str = "orders") -> Optional[str]:
        """Fetches the last successfully processed watermark timestamp for a table."""
        try:
            query = f"""
                SELECT last_success_value
                FROM {self.config.watermark_table}
                WHERE pipeline_name = :pipeline AND table_name = :table
            """
            rows = self.db.execute_query(query, {"pipeline": self.config.pipeline_name, "table": table_name})
            if rows and rows[0].get("last_success_value"):
                watermark = str(rows[0]["last_success_value"])
                logger.info(f"Retrieved active watermark for '{table_name}': {watermark}")
                return watermark
        except Exception as e:
            logger.warning(f"Could not retrieve watermark (table may be uninitialized): {e}")
        return None

    def update_watermark(self, table_name: str, new_watermark: str):
        """Updates or inserts the watermark state after successful load."""
        from sqlalchemy import text
        engine = self.db.get_engine()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if self.db.db_type == "mysql":
            sql = f"""
                INSERT INTO {self.config.watermark_table}
                (pipeline_name, table_name, watermark_column, last_success_value, last_run_timestamp)
                VALUES (:pipeline, :table, :col, :val, :now)
                ON DUPLICATE KEY UPDATE
                    last_success_value = VALUES(last_success_value),
                    last_run_timestamp = VALUES(last_run_timestamp),
                    updated_at = CURRENT_TIMESTAMP
            """
        else: # sqlite
            sql = f"""
                INSERT OR REPLACE INTO {self.config.watermark_table}
                (pipeline_name, table_name, watermark_column, last_success_value, last_run_timestamp)
                VALUES (:pipeline, :table, :col, :val, :now)
            """

        with engine.begin() as conn:
            conn.execute(text(sql), {
                "pipeline": self.config.pipeline_name,
                "table": table_name,
                "col": self.config.watermark_column,
                "val": new_watermark,
                "now": now_str
            })
        logger.info(f"Updated watermark for table '{table_name}' -> {new_watermark}")

    def start_audit_run(self, mode: str, extracted_count: int, cleaned_count: int, quarantined_count: int) -> str:
        """Initializes a new execution run record in etl_audit_log."""
        run_id = f"RUN-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        from sqlalchemy import text
        engine = self.db.get_engine()

        sql = """
            INSERT INTO etl_audit_log
            (run_id, pipeline_mode, status, records_extracted, records_cleaned, records_quarantined, started_at)
            VALUES (:run_id, :mode, 'RUNNING', :extracted, :cleaned, :quarantined, :started_at)
        """
        try:
            with engine.begin() as conn:
                conn.execute(text(sql), {
                    "run_id": run_id,
                    "mode": mode.upper(),
                    "extracted": extracted_count,
                    "cleaned": cleaned_count,
                    "quarantined": quarantined_count,
                    "started_at": now_str
                })
        except Exception as e:
            logger.warning(f"Could not record initial audit entry: {e}")

        return run_id

    def complete_audit_run(self, run_id: str, status: str, loaded_count: int, started_at: datetime, error_msg: Optional[str] = None):
        """Finalizes the audit run entry with completion status, row counts, and duration."""
        ended_at = datetime.now()
        duration = round((ended_at - started_at).total_seconds(), 2)
        ended_str = ended_at.strftime("%Y-%m-%d %H:%M:%S")

        from sqlalchemy import text
        engine = self.db.get_engine()
        sql = """
            UPDATE etl_audit_log
            SET status = :status,
                records_loaded = :loaded,
                ended_at = :ended_at,
                duration_seconds = :duration,
                error_message = :err
            WHERE run_id = :run_id
        """
        try:
            with engine.begin() as conn:
                conn.execute(text(sql), {
                    "run_id": run_id,
                    "status": status,
                    "loaded": loaded_count,
                    "ended_at": ended_str,
                    "duration": duration,
                    "err": error_msg
                })
            logger.info(f"Audit log updated: Run {run_id} finished [{status}] in {duration}s. Loaded: {loaded_count} rows.")
        except Exception as e:
            logger.warning(f"Could not update audit completion entry: {e}")

    def load_table(self, table_name: str, df: pd.DataFrame, mode: str = "full") -> int:
        """
        Loads a DataFrame into the target database table using idempotent upsert/append.
        """
        if df.empty:
            logger.info(f"No records to load for table '{table_name}'. Skipping.")
            return 0

        engine = self.db.get_engine()
        schema = self.config.expected_schemas.get(table_name, {})
        pks = schema.get("primary_key", [])

        # Idempotent load strategy:
        # In MySQL, we can load records row by row or via INSERT ... ON DUPLICATE KEY UPDATE
        # For junior DE transparency, we use parameterized upsert queries or batch append with PK conflict handling.
        columns = list(df.columns)
        placeholders = ", ".join([f":{col}" for col in columns])
        col_list_str = ", ".join(columns)

        if self.db.db_type == "mysql":
            update_clauses = [f"{col} = VALUES({col})" for col in columns if col not in pks]
            update_str = ", ".join(update_clauses) if update_clauses else f"{pks[0]} = VALUES({pks[0]})"
            upsert_sql = f"""
                INSERT INTO {table_name} ({col_list_str})
                VALUES ({placeholders})
                ON DUPLICATE KEY UPDATE {update_str}
            """
        else: # sqlite
            upsert_sql = f"""
                INSERT OR REPLACE INTO {table_name} ({col_list_str})
                VALUES ({placeholders})
            """

        from sqlalchemy import text
        records = df.to_dict(orient="records")
        loaded_count = 0

        with engine.begin() as conn:
            for record in records:
                # Sanitize NaN values to None for SQL NULL
                clean_record = {k: (None if pd.isna(v) else v) for k, v in record.items()}
                conn.execute(text(upsert_sql), clean_record)
                loaded_count += 1

        logger.info(f"Loaded {loaded_count} rows into table '{table_name}'.")
        return loaded_count

    def load_all(self, datasets: Dict[str, pd.DataFrame], mode: str = "full") -> int:
        """
        Loads all datasets in dependency order:
        1. customers, products (independent dimension tables)
        2. orders (depends on customers)
        3. order_items, payments (depend on orders and products)
        """
        logger.info(f"Starting Database Loading stage ({mode.upper()})...")
        load_order = ["customers", "products", "orders", "order_items", "payments"]
        total_loaded = 0

        for table in load_order:
            if table in datasets:
                count = self.load_table(table, datasets[table], mode=mode)
                total_loaded += count

        # If orders were loaded, update high-watermark
        if "orders" in datasets and not datasets["orders"].empty:
            orders_df = datasets["orders"]
            if "order_purchase_timestamp" in orders_df.columns:
                max_timestamp = orders_df["order_purchase_timestamp"].dropna().max()
                if max_timestamp:
                    self.update_watermark("orders", str(max_timestamp))

        return total_loaded
