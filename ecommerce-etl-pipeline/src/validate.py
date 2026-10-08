import os
import logging
from datetime import datetime
from typing import Dict, Tuple, List, Any
import pandas as pd
from .config import PipelineConfig

logger = logging.getLogger("ecommerce_etl")

class DataValidator:
    """
    Validates schema conformity, detects nulls and duplicates,
    checks value ranges, and diverts invalid rows to quarantine.
    """
    def __init__(self, config: PipelineConfig):
        self.config = config

    def validate_dataset(self, table_name: str, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Validates a single dataset against defined schema and business constraints.
        Returns:
            clean_df: rows passing all validation gates
            bad_df: rows flagged with failure reasons
        """
        schema = self.config.expected_schemas.get(table_name)
        if not schema:
            logger.warning(f"No schema specification found for table '{table_name}'. Passing through.")
            return df.copy(), pd.DataFrame()

        df_work = df.copy()
        quarantine_reasons = pd.Series([""] * len(df_work), index=df_work.index)

        # 1. Required Columns Check
        required_cols = schema.get("required_columns", [])
        missing_cols = [col for col in required_cols if col not in df_work.columns]
        if missing_cols:
            raise ValueError(
                f"Schema Failure on '{table_name}': Missing required columns: {missing_cols}"
            )

        # 2. Null Checks on Mandatory Non-Null Columns
        not_null_cols = schema.get("not_null_columns", [])
        for col in not_null_cols:
            if col in df_work.columns:
                null_mask = df_work[col].isna() | (df_work[col].astype(str).str.strip() == "")
                if null_mask.any():
                    reasons = quarantine_reasons.loc[null_mask]
                    quarantine_reasons.loc[null_mask] = reasons.apply(
                        lambda r: f"{r}; Missing mandatory field '{col}'" if r else f"Missing mandatory field '{col}'"
                    )

        # 3. Duplicate Detection on Primary / Business Key
        pk_cols = schema.get("primary_key", [])
        if pk_cols and all(col in df_work.columns for col in pk_cols):
            # Check duplicate primary keys (excluding rows that already have null PKs)
            valid_pk_mask = ~(df_work[pk_cols].isna().any(axis=1))
            dup_mask = df_work.duplicated(subset=pk_cols, keep="first") & valid_pk_mask
            if dup_mask.any():
                reasons = quarantine_reasons.loc[dup_mask]
                quarantine_reasons.loc[dup_mask] = reasons.apply(
                    lambda r: f"{r}; Duplicate primary key {pk_cols}" if r else f"Duplicate primary key {pk_cols}"
                )

        # 4. Domain & Value Range Checks
        if table_name == "orders" and "order_status" in df_work.columns:
            allowed = schema.get("allowed_statuses", [])
            status_invalid = ~df_work["order_status"].astype(str).str.lower().isin(allowed)
            if status_invalid.any():
                reasons = quarantine_reasons.loc[status_invalid]
                quarantine_reasons.loc[status_invalid] = reasons.apply(
                    lambda r: f"{r}; Invalid order status" if r else "Invalid order status"
                )

        if table_name == "order_items":
            if "price" in df_work.columns:
                numeric_prices = pd.to_numeric(df_work["price"], errors="coerce")
                neg_prices = (numeric_prices <= 0) | numeric_prices.isna()
                if neg_prices.any():
                    reasons = quarantine_reasons.loc[neg_prices]
                    quarantine_reasons.loc[neg_prices] = reasons.apply(
                        lambda r: f"{r}; Price must be positive float" if r else "Price must be positive float"
                    )

            if "freight_value" in df_work.columns:
                numeric_freight = pd.to_numeric(df_work["freight_value"], errors="coerce")
                neg_freight = numeric_freight < 0
                if neg_freight.any():
                    reasons = quarantine_reasons.loc[neg_freight]
                    quarantine_reasons.loc[neg_freight] = reasons.apply(
                        lambda r: f"{r}; Freight value cannot be negative" if r else "Freight value cannot be negative"
                    )

        if table_name == "payments" and "payment_value" in df_work.columns:
            numeric_pay = pd.to_numeric(df_work["payment_value"], errors="coerce")
            neg_pay = (numeric_pay <= 0) | numeric_pay.isna()
            if neg_pay.any():
                reasons = quarantine_reasons.loc[neg_pay]
                quarantine_reasons.loc[neg_pay] = reasons.apply(
                    lambda r: f"{r}; Payment value must be > 0" if r else "Payment value must be > 0"
                )

        # Split into Valid and Quarantined
        is_bad = quarantine_reasons != ""
        clean_df = df_work[~is_bad].copy()
        bad_df = df_work[is_bad].copy()

        if len(bad_df) > 0:
            bad_df["quarantine_reason"] = quarantine_reasons[is_bad]
            bad_df["quarantined_at"] = datetime.now().isoformat()
            self._save_to_quarantine(table_name, bad_df)

        logger.info(
            f"Validation [{table_name}]: {len(clean_df)} passed, {len(bad_df)} quarantined."
        )
        return clean_df, bad_df

    def _save_to_quarantine(self, table_name: str, bad_df: pd.DataFrame):
        """Persists quarantined records to data/quarantine for audit and review."""
        os.makedirs(self.config.quarantine_data_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{table_name}_quarantine_{timestamp}.csv"
        target_path = os.path.join(self.config.quarantine_data_dir, filename)
        bad_df.to_csv(target_path, index=False)
        logger.warning(
            f"Quarantined {len(bad_df)} invalid records from '{table_name}' -> {filename}"
        )

    def validate_all(self, data_dict: Dict[str, pd.DataFrame]) -> Tuple[Dict[str, pd.DataFrame], Dict[str, pd.DataFrame]]:
        """Executes validation across all extracted datasets."""
        logger.info("Executing Schema & Data Quality Validation Phase...")
        valid_datasets = {}
        quarantined_datasets = {}

        for table_name, df in data_dict.items():
            clean_df, bad_df = self.validate_dataset(table_name, df)
            valid_datasets[table_name] = clean_df
            if len(bad_df) > 0:
                quarantined_datasets[table_name] = bad_df

        return valid_datasets, quarantined_datasets
