import os
import sys
import logging
from datetime import datetime

def setup_logger(name: str = "ecommerce_etl", log_dir: str = "logs", level: int = logging.INFO) -> logging.Logger:
    """
    Sets up a structured Python logger with both Console and File handlers.
    Outputs clear, timestamped log messages adhering to Data Engineering best practices.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Avoid adding duplicate handlers if setup_logger is invoked multiple times
    if logger.handlers:
        return logger

    # Ensure log directory exists
    os.makedirs(log_dir, exist_ok=True)
    today_str = datetime.now().strftime("%Y%m%d")
    log_filename = os.path.join(log_dir, f"etl_pipeline_{today_str}.log")

    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)-7s] [%(filename)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Console Stream Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. Rotating / Daily File Handler
    file_handler = logging.FileHandler(log_filename, encoding="utf-8")
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
