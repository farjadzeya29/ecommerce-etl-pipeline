import os
import logging
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

logger = logging.getLogger("ecommerce_etl")

class DatabaseManager:
    """
    Manages database connectivity and execution for MySQL and SQLite.
    Supports transactional execution, connection pooling, and error handling.
    """
    def __init__(
        self,
        db_type: str = "mysql",
        host: str = "localhost",
        port: int = 3306,
        database: str = "ecommerce_dw",
        user: str = "etl_user",
        password: str = "etl_password",
        sqlite_path: str = "ecommerce_dw.db"
    ):
        self.db_type = db_type.lower()
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.sqlite_path = sqlite_path
        self._engine = None

    def get_connection_url(self) -> str:
        """Returns SQLAlchemy connection URL string based on configured db_type."""
        if self.db_type == "mysql":
            return f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}?charset=utf8mb4"
        elif self.db_type == "sqlite":
            return f"sqlite:///{self.sqlite_path}"
        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")

    def get_engine(self):
        """Initializes and returns the SQLAlchemy engine."""
        if self._engine is None:
            try:
                from sqlalchemy import create_engine
                url = self.get_connection_url()
                pool_args = {}
                if self.db_type == "mysql":
                    pool_args = {"pool_size": 5, "max_overflow": 10, "pool_recycle": 3600}
                self._engine = create_engine(url, **pool_args)
                logger.info(f"Initialized Database Engine ({self.db_type.upper()}) -> {self.database}")
            except Exception as e:
                logger.error(f"Failed to create database engine: {e}")
                raise
        return self._engine

    def test_connection(self) -> bool:
        """Validates connectivity to the target database."""
        try:
            from sqlalchemy import text
            engine = self.get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"Database connection verified successfully for {self.db_type.upper()}.")
            return True
        except Exception as e:
            logger.warning(f"Could not connect to database ({self.db_type.upper()}): {e}")
            return False

    def execute_script(self, script_path: str):
        """Executes a SQL script file containing multiple DDL/DML statements."""
        if not os.path.exists(script_path):
            raise FileNotFoundError(f"SQL script not found: {script_path}")

        with open(script_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        from sqlalchemy import text
        engine = self.get_engine()
        statements = [stmt.strip() for stmt in sql_content.split(";") if stmt.strip()]

        with engine.begin() as conn:
            for statement in statements:
                # Skip comments or USE statements in SQLite
                if self.db_type == "sqlite" and statement.upper().startswith("USE "):
                    continue
                conn.execute(text(statement))
        logger.info(f"Executed SQL script '{script_path}' ({len(statements)} statements).")

    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Executes a SELECT query and returns a list of dictionaries."""
        from sqlalchemy import text
        engine = self.get_engine()
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            columns = result.keys()
            return [dict(zip(columns, row)) for row in result.fetchall()]
