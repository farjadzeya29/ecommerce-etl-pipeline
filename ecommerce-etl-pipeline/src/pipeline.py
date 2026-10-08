import os
import sys
import argparse
from datetime import datetime
from typing import Optional

from .config import PipelineConfig
from .utils.logger import setup_logger
from .utils.db import DatabaseManager
from .extract import DataExtractor
from .validate import DataValidator
from .transform import DataTransformer
from .quality_checks import DataQualityAuditor
from .load import DataLoader

def run_pipeline(mode: str = "full", db_type: str = "mysql", init_schema: bool = False, run_queries: bool = True):
    """
    Main orchestration entry point for the End-to-End E-Commerce ETL Pipeline.
    """
    config = PipelineConfig(db_type=db_type)
    logger = setup_logger(log_dir=config.logs_dir)

    start_time = datetime.now()
    logger.info("=" * 80)
    logger.info(f"STARTING E-COMMERCE ETL PIPELINE | MODE: {mode.upper()} | TARGET: {db_type.upper()}")
    logger.info("=" * 80)

    # 1. Initialize Database Manager
    db = DatabaseManager(
        db_type=config.db_type,
        host=config.db_host,
        port=config.db_port,
        database=config.db_name,
        user=config.db_user,
        password=config.db_password,
        sqlite_path=config.sqlite_path
    )

    # 2. Check DB Connectivity & Optionally Initialize Schema
    connected = db.test_connection()
    if not connected:
        if db_type == "mysql":
            logger.warning("Could not connect to MySQL instance. (Ensure Docker/MySQL service is running on port 3306).")
            logger.warning("If running locally without MySQL running, test with '--db-type sqlite'.")
        sys.exit(1)

    schema_file = os.path.join(config.sql_dir, "schema.sql")
    if init_schema and os.path.exists(schema_file):
        logger.info(f"Applying schema DDL from {schema_file}...")
        try:
            db.execute_script(schema_file)
        except Exception as e:
            logger.error(f"Error applying schema script: {e}")
            sys.exit(1)

    extractor = DataExtractor(config)
    validator = DataValidator(config)
    transformer = DataTransformer(config)
    auditor = DataQualityAuditor(config)
    loader = DataLoader(config, db)

    # 3. Watermark Inspection
    last_watermark = None
    if mode == "incremental":
        last_watermark = loader.get_last_watermark("orders")
        logger.info(f"Active Watermark for Incremental Load: {last_watermark or 'None (First run)'}")

    run_id = None
    try:
        # 4. Extraction Stage
        raw_datasets = extractor.extract_all(mode=mode, last_watermark=last_watermark)
        total_extracted = sum(len(df) for df in raw_datasets.values())
        if total_extracted == 0:
            logger.info("No new records found for ingestion. Pipeline finished early.")
            return

        # 5. Schema Validation & Quarantine Gate
        valid_datasets, quarantined_datasets = validator.validate_all(raw_datasets)
        total_cleaned = sum(len(df) for df in valid_datasets.values())
        total_quarantined = sum(len(df) for df in quarantined_datasets.values())

        # Start Audit Record
        run_id = loader.start_audit_run(
            mode=mode,
            extracted_count=total_extracted,
            cleaned_count=total_cleaned,
            quarantined_count=total_quarantined
        )
        logger.info(f"Initialized Pipeline Audit Run ID: {run_id}")

        # 6. Data Transformation & Standardization
        transformed_datasets = transformer.transform_all(valid_datasets)

        # 7. Automated Pre-Load Data Quality Audits
        quality_results = auditor.run_pre_load_checks(transformed_datasets)
        failed_checks = [r for r in quality_results if r.status == "FAILED"]
        if failed_checks:
            raise ValueError(
                f"Data Quality Halt: {len(failed_checks)} critical assertions failed before loading!"
            )

        # 8. Relational Database Loading & Watermark Update
        total_loaded = loader.load_all(transformed_datasets, mode=mode)

        # Complete Audit Log
        loader.complete_audit_run(
            run_id=run_id,
            status="SUCCESS",
            loaded_count=total_loaded,
            started_at=start_time
        )

        # 9. Post-Load Validation Queries
        if run_queries:
            logger.info("Running Post-Load Verification Queries...")
            val_file = os.path.join(config.sql_dir, "validation_queries.sql")
            if os.path.exists(val_file):
                try:
                    counts = db.execute_query("""
                        SELECT 'orders' as entity, COUNT(*) as cnt FROM orders
                        UNION ALL
                        SELECT 'order_items', COUNT(*) FROM order_items
                        UNION ALL
                        SELECT 'payments', COUNT(*) FROM payments
                    """)
                    logger.info("Post-Load Row Counts in Target Tables:")
                    for row in counts:
                        logger.info(f"  * {row.get('entity')}: {row.get('cnt')} rows")
                except Exception as q_err:
                    logger.warning(f"Validation queries warning: {q_err}")

        duration = round((datetime.now() - start_time).total_seconds(), 2)
        logger.info("=" * 80)
        logger.info(f"PIPELINE COMPLETED SUCCESSFULLY [Duration: {duration}s]")
        logger.info(f"  Extracted:   {total_extracted} rows")
        logger.info(f"  Cleaned:     {total_cleaned} rows")
        logger.info(f"  Quarantined: {total_quarantined} rows")
        logger.info(f"  Loaded:      {total_loaded} rows")
        logger.info("=" * 80)

    except Exception as exc:
        duration = round((datetime.now() - start_time).total_seconds(), 2)
        logger.error(f"PIPELINE EXECUTION FAILED after {duration}s: {exc}", exc_info=True)
        if run_id:
            loader.complete_audit_run(
                run_id=run_id,
                status="FAILED",
                loaded_count=0,
                started_at=start_time,
                error_msg=str(exc)
            )
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="End-to-End E-Commerce ETL Pipeline (Junior Data Engineer Portfolio)"
    )
    parser.add_argument(
        "--mode",
        choices=["full", "incremental"],
        default="full",
        help="Pipeline execution mode: 'full' baseline reload or 'incremental' delta ingestion."
    )
    parser.add_argument(
        "--db-type",
        choices=["mysql", "sqlite"],
        default="mysql",
        help="Target database engine: 'mysql' (production default) or 'sqlite' (local dev testing)."
    )
    parser.add_argument(
        "--init-db",
        action="store_true",
        help="Initialize or reset database tables from sql/schema.sql before running."
    )
    parser.add_argument(
        "--no-validations",
        action="store_true",
        help="Skip post-load SQL validation queries."
    )

    args = parser.parse_args()
    run_pipeline(
        mode=args.mode,
        db_type=args.db_type,
        init_schema=args.init_db,
        run_queries=not args.no_validations
    )

if __name__ == "__main__":
    main()
