# ==============================================================================
# Script: backend/add_jobs_direct.py
# Nạp trực tiếp 3 Job mới vào cơ sở dữ liệu đang chạy
# ==============================================================================
import os
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from database import SessionLocal
from models import JobDescription

NEW_JOBS = [
    {
        "title": "Mobile Developer (Flutter/React Native)",
        "jd_text": """
                Tuyển Mobile Developer tham gia phát triển ứng dụng di động fintech.
                Mô tả công việc:
                - Phát triển và tối ưu các tính năng trên mobile app sử dụng Flutter hoặc React Native.
                - Phối hợp với Backend team để tích hợp RESTful API và WebSocket.
                - Quản lý state hiệu quả với Bloc, Provider hoặc Redux/Zustand.
                - Tối ưu hóa UI/UX mượt mà, responsive trên cả iOS và Android.
                Yêu cầu:
                - 2+ năm kinh nghiệm lập trình Mobile (Flutter hoặc React Native).
                - Thành thạo Dart hoặc TypeScript/JavaScript.
                - Nắm vững kiến thức về Mobile Lifecycle, offline storage, push notifications.
                - Có sản phẩm đã phát hành trên App Store hoặc Google Play là lợi thế lớn.
                """,
        "required_skills": ["flutter", "react native", "dart", "typescript", "restful api"],
        "required_experience": 2.0,
        "project_keywords": ["mobile app", "cross-platform", "state management", "fintech payment"],
        "department": "MoMo (M_Service)",
        "location": "TP. Hồ Chí Minh",
        "image": "/images/hochiminh.png",
        "is_active": True,
        "custom_criteria": [],
    },
    {
        "title": "Data Engineer (Python/Spark/Airflow)",
        "jd_text": """
                Tuyển Data Engineer xây dựng hệ thống xử lý dữ liệu lớn.
                Mô tả công việc:
                - Thiết kế, xây dựng và tối ưu các pipeline ETL/ELT xử lý dữ liệu lớn từ nhiều nguồn.
                - Lập lịch và điều phối luồng dữ liệu tự động với Apache Airflow.
                - Xử lý streaming data thời gian thực với Apache Kafka và Spark Streaming.
                - Thiết kế kiến trúc Data Warehouse và tối ưu truy vấn SQL phân tích.
                Yêu cầu:
                - 2+ năm kinh nghiệm Data Engineering / Big Data.
                - Thành thạo Python, SQL nâng cao.
                - Kinh nghiệm thực tế với Apache Spark, Apache Airflow hoặc Kafka.
                - Hiểu biết về cơ sở dữ liệu quan hệ (PostgreSQL) và NoSQL.
                """,
        "required_skills": ["python", "sql", "spark", "airflow", "kafka", "postgresql"],
        "required_experience": 2.0,
        "project_keywords": ["data pipeline", "etl", "big data", "data warehouse", "lakehouse"],
        "department": "Viettel Solutions",
        "location": "Hà Nội",
        "image": "/images/hanoi.png",
        "is_active": True,
        "custom_criteria": [],
    },
    {
        "title": "QA Automation Engineer (Selenium/Playwright/Python)",
        "jd_text": """
                Tuyển QA Automation Engineer phụ trách kiểm thử tự động cho hệ thống doanh nghiệp.
                Mô tả công việc:
                - Thiết kế, xây dựng và bảo trì Automation Test Framework cho Web UI và REST API.
                - Viết test scripts tự động sử dụng Selenium hoặc Playwright kết hợp với Python.
                - Tích hợp test suite tự động vào quy trình CI/CD (GitHub Actions / Jenkins / GitLab CI).
                - Thực hiện API testing, regression testing và lập báo cáo chất lượng kiểm thử.
                Yêu cầu:
                - 2+ năm kinh nghiệm làm Automation Testing.
                - Thành thạo một trong các công cụ: Selenium, Playwright, Cypress.
                - Nắm vững ngôn ngữ lập trình Python hoặc Java/JavaScript.
                - Thành thạo Postman/Newman cho kiểm thử API và hiểu biết về CI/CD.
                """,
        "required_skills": ["selenium", "playwright", "python", "automation test", "postman", "ci/cd"],
        "required_experience": 2.0,
        "project_keywords": ["automation testing", "test framework", "api testing", "ci/cd pipeline", "regression test"],
        "department": "FPT Software",
        "location": "Đà Nẵng",
        "image": "/images/DaNang.png",
        "is_active": True,
        "custom_criteria": [],
    },
]

def add_jobs():
    db = SessionLocal()
    try:
        count = 0
        for item in NEW_JOBS:
            exists = db.query(JobDescription).filter(JobDescription.title == item["title"]).first()
            if not exists:
                jd = JobDescription(**item)
                db.add(jd)
                count += 1
                print(f"+ Đã thêm: {item['title']}")
            else:
                print(f"= Đã tồn tại: {item['title']}")
        db.commit()
        print(f"\nThành công! Đã thêm {count} job mới vào database.")
    except Exception as e:
        db.rollback()
        print(f"Lỗi: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_jobs()

