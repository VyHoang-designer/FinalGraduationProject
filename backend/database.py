# ==============================================================================
# FILE: backend/database.py
# MÔ TẢ: SQLAlchemy engine & session factory cho PostgreSQL
# ==============================================================================
"""
Kết nối PostgreSQL thông qua SQLAlchemy async-compatible session.
Đọc DATABASE_URL từ file .env.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load .env từ thư mục backend
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:hoangvy123@localhost:5432/cv_jd_matching_db")

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: cung cấp DB session cho mỗi request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
