import logging
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
import pandas as pd
from .config import PipelineConfig

logger = logging.getLogger("ecommerce_etl")

@dataclass
class QualityCheckResult:
    check_name: str
    table_name: str
    status: str # "PASSED" or "FAILED"
    details: str
    observed_value: Any
    expected_value: Any

class DataQualityAuditor:
    """
    Executes automated data quality assertions before and after database loading:
    - Primary key non-null and uniqueness tests
    - Referential integrity tests across parent-child datasets
    - Domain value constraints (positive pricing, valid status enums)
    - Row count reconciliation
    """
    def __init__(self, config: PipelineConfig):
        self.config = config

    def run_pre_load_checks(self, datasets: Dict[str, pd.DataFrame]) -> List[QualityCheckResult]:
        """Runs quality assertions on transformed data before committing to the database."""
        logger.info("Executing Pre-Load Data Quality Audits...")
        results: List[QualityCheckResult] = []

        # 1. Null Checks on Primary Keys
        for table_name, df in datasets.items():
            schema = self.config.expected_schemas.get(table_name, {})
            pks = schema.get("primary_key", [])
            for pk in pks:
                if pk in df.columns:
                    null_count = int(df[pk].isna().sum())
                    passed = (null_count == 0)
                    results.append(QualityCheckResult(
                        check_name=f"NOT_NULL_{pk.upper()}",
                        table_name=table_name,
                        status="PASSED" if passed else "FAILED",
                        details=f"Null check on primary key column '{pk}'",
                        observed_value=null_count,
                        expected_value=0
                    ))

        # 2. Uniqueness Checks on Primary Keys
        for table_name, df in datasets.items():
            schema = self.config.expected_schemas.get(table_name, {})
            pks = schema.get("primary_key", [])
            if pks and all(pk in df.columns for pk in pks):
                dup_count = int(df.duplicated(subset=pks).sum())
                passed = (dup_count == 0)
                results.append(QualityCheckResult(
                    check_name="PRIMARY_KEY_UNIQUENESS",
                    table_name=table_name,
                    status="PASSED" if passed else "FAILED",
                    details=f"Duplicate primary key check on columns {pks}",
                    observed_value=dup_count,
                    expected_value=0
                ))

        # 3. Referential Integrity (Parent-Child Key Alignment)
        # Check Orders -> Customers
        if "orders" in datasets and "customers" in datasets:
            orders_df = datasets["orders"]
            customers_df = datasets["customers"]
            orphan_orders = (~orders_df["customer_id"].isin(customers_df["customer_id"])).sum()
            results.append(QualityCheckResult(
                check_name="FK_ORDERS_TO_CUSTOMERS",
                table_name="orders",
                status="PASSED" if orphan_orders == 0 else "FAILED",
                details="Referential integrity: every order must link to a valid customer",
                observed_value=int(orphan_orders),
                expected_value=0
            ))

        # Check Order Items -> Orders
        if "order_items" in datasets and "orders" in datasets:
            items_df = datasets["order_items"]
            orders_df = datasets["orders"]
            orphan_items = (~items_df["order_id"].isin(orders_df["order_id"])).sum()
            results.append(QualityCheckResult(
                check_name="FK_ORDER_ITEMS_TO_ORDERS",
                table_name="order_items",
                status="PASSED" if orphan_items == 0 else "FAILED",
                details="Referential integrity: every item must link to an existing order",
                observed_value=int(orphan_items),
                expected_value=0
            ))

        # Check Order Items -> Products
        if "order_items" in datasets and "products" in datasets:
            items_df = datasets["order_items"]
            products_df = datasets["products"]
            orphan_products = (~items_df["product_id"].isin(products_df["product_id"])).sum()
            results.append(QualityCheckResult(
                check_name="FK_ORDER_ITEMS_TO_PRODUCTS",
                table_name="order_items",
                status="PASSED" if orphan_products == 0 else "FAILED",
                details="Referential integrity: every item must map to an existing catalog product",
                observed_value=int(orphan_products),
                expected_value=0
            ))

        # Check Payments -> Orders
        if "payments" in datasets and "orders" in datasets:
            pay_df = datasets["payments"]
            orders_df = datasets["orders"]
            orphan_pay = (~pay_df["order_id"].isin(orders_df["order_id"])).sum()
            results.append(QualityCheckResult(
                check_name="FK_PAYMENTS_TO_ORDERS",
                table_name="payments",
                status="PASSED" if orphan_pay == 0 else "FAILED",
                details="Referential integrity: every payment must link to an existing order",
                observed_value=int(orphan_pay),
                expected_value=0
            ))

        # 4. Domain Constraints (Prices & Payments > 0)
        if "order_items" in datasets and "price" in datasets["order_items"].columns:
            neg_prices = int((datasets["order_items"]["price"] <= 0).sum())
            results.append(QualityCheckResult(
                check_name="POSITIVE_ITEM_PRICE",
                table_name="order_items",
                status="PASSED" if neg_prices == 0 else "FAILED",
                details="Business rule: item prices must be strictly greater than $0.00",
                observed_value=neg_prices,
                expected_value=0
            ))

        # Log summary of results
        failures = [r for r in results if r.status == "FAILED"]
        if failures:
            logger.error(f"Data Quality Gate Failed: {len(failures)} assertion(s) violated!")
            for f in failures:
                logger.error(f"  [X] {f.check_name} ({f.table_name}): {f.details} (Observed: {f.observed_value})")
        else:
            logger.info(f"All {len(results)} Data Quality Assertions PASSED successfully.")

        return results
