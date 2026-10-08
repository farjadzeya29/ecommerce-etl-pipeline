"""
Unit and Integration Tests for E-Commerce ETL Pipeline.
Demonstrates automated testing of schema validation, duplicate detection,
cleaning rules, and referential integrity.
"""
import pytest
import pandas as pd
from src.config import PipelineConfig
from src.validate import DataValidator
from src.transform import DataTransformer
from src.quality_checks import DataQualityAuditor

@pytest.fixture
def config():
    return PipelineConfig()

@pytest.fixture
def validator(config):
    return DataValidator(config)

@pytest.fixture
def transformer(config):
    return DataTransformer(config)

@pytest.fixture
def auditor(config):
    return DataQualityAuditor(config)

def test_missing_required_column_raises_error(validator):
    """Schema check: missing required column must raise ValueError."""
    bad_df = pd.DataFrame({
        "order_id": ["ORD-1"],
        # 'customer_id' missing intentionally
        "order_status": ["delivered"],
        "order_purchase_timestamp": ["2024-01-01 10:00:00"],
        "order_estimated_delivery_date": ["2024-01-05 00:00:00"]
    })
    with pytest.raises(ValueError, match="Missing required columns"):
        validator.validate_dataset("orders", bad_df)

def test_quarantine_bad_prices_and_duplicates(validator):
    """Business rule: negative prices and duplicate PKs must be routed to quarantine."""
    items_df = pd.DataFrame({
        "order_id": ["ORD-1", "ORD-1", "ORD-2"],
        "order_item_id": ["1", "1", "1"], # Duplicate composite PK (ORD-1, 1)
        "product_id": ["PROD-A", "PROD-A", "PROD-B"],
        "price": ["100.00", "100.00", "-25.00"], # Negative price
        "freight_value": ["15.00", "15.00", "10.00"],
        "shipping_limit_date": ["2024-01-10 18:00:00", "2024-01-10 18:00:00", "2024-01-12 18:00:00"]
    })
    clean_df, bad_df = validator.validate_dataset("order_items", items_df)
    assert len(clean_df) == 1
    assert len(bad_df) == 2
    assert "quarantine_reason" in bad_df.columns

def test_transformation_string_standardization(transformer):
    """Transformation: ensures state codes are capitalized and city names are titled."""
    raw_cust = pd.DataFrame({
        "customer_id": [" CUST-01 "],
        "customer_unique_id": ["USER-1"],
        "customer_city": ["  new york "],
        "customer_state": ["ny"],
        "customer_zip_code_prefix": ["10001"],
        "created_at": ["2024-01-01 10:00:00"]
    })
    clean_cust = transformer.transform_customers(raw_cust)
    row = clean_cust.iloc[0]
    assert row["customer_id"] == "CUST-01"
    assert row["customer_city"] == "New York"
    assert row["customer_state"] == "NY"

def test_data_quality_referential_integrity(auditor):
    """Auditor: flags orphaned foreign keys between orders and customers."""
    customers = pd.DataFrame({"customer_id": ["CUST-1001"]})
    orders = pd.DataFrame({
        "order_id": ["ORD-1", "ORD-2"],
        "customer_id": ["CUST-1001", "CUST-GHOST"] # CUST-GHOST does not exist
    })
    datasets = {"customers": customers, "orders": orders}
    results = auditor.run_pre_load_checks(datasets)

    fk_check = next((r for r in results if r.check_name == "FK_ORDERS_TO_CUSTOMERS"), None)
    assert fk_check is not None
    assert fk_check.status == "FAILED"
    assert fk_check.observed_value == 1
