# ==============================================================================
# FILE: backend/seed_data.py
# MÔ TẢ: Seed script - Nạp dữ liệu demo vào PostgreSQL
# ==============================================================================
"""
Chạy file này để tạo dữ liệu mẫu:
  - 5 JDs (các vị trí IT phổ biến)
  - 3 Candidates (CV mẫu với các profile khác nhau)

Usage:
  cd backend
  python seed_data.py
"""

import os
import sys

# Thêm thư mục gốc để import
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from database import engine, SessionLocal, Base
from models import JobDescription, CandidateCV


def seed():
    """Tạo tables và nạp dữ liệu demo."""
    # Tạo tất cả tables
    Base.metadata.create_all(bind=engine)
    print("✓ Đã tạo/kiểm tra database tables.")

    db = SessionLocal()

    try:
        # Kiểm tra nếu đã có dữ liệu
        existing_jds = db.query(JobDescription).count()
        existing_cvs = db.query(CandidateCV).count()

        if existing_jds > 0 or existing_cvs > 0:
            print(f"  Database đã có {existing_jds} JDs và {existing_cvs} CVs.")
            response = input("  Bạn có muốn xóa và tạo lại dữ liệu demo? (y/n): ")
            if response.lower() != 'y':
                print("  Bỏ qua seed data.")
                return
            # Xóa dữ liệu cũ
            db.query(CandidateCV).delete()
            db.query(JobDescription).delete()
            db.commit()
            print("  ✓ Đã xóa dữ liệu cũ.")

        # ==========================================================
        # SEED JOB DESCRIPTIONS
        # ==========================================================
        jds = [
            JobDescription(
                title="Backend Developer (Python/FastAPI)",
                jd_text="""
                Công ty ABC tuyển Backend Developer.
                Mô tả công việc:
                - Phát triển và bảo trì các RESTful API sử dụng Python và FastAPI.
                - Thiết kế và tối ưu cơ sở dữ liệu PostgreSQL.
                - Triển khai CI/CD pipeline và container hóa ứng dụng với Docker.
                - Làm việc theo mô hình Agile/Scrum với team 5-8 người.
                Yêu cầu:
                - Tối thiểu 2 năm kinh nghiệm Backend development.
                - Thành thạo Python, FastAPI hoặc Django.
                - Kinh nghiệm với PostgreSQL, Redis.
                - Có kinh nghiệm Docker, CI/CD là lợi thế lớn.
                """,
                required_skills=["python", "fastapi", "postgresql", "docker", "redis"],
                required_experience=2.0,
                project_keywords=["backend api", "database optimization", "deployment", "microservices"],
                department="Engineering",
                location="Hồ Chí Minh",
                is_active=True,
            ),
            JobDescription(
                title="Frontend Developer (React/TypeScript)",
                jd_text="""
                Tuyển Frontend Developer cho dự án SaaS.
                Mô tả công việc:
                - Phát triển giao diện người dùng với React và TypeScript.
                - Xây dựng UI components tái sử dụng với design system.
                - Tích hợp API RESTful và GraphQL.
                - Tối ưu performance và responsive design.
                Yêu cầu:
                - 1+ năm kinh nghiệm Frontend development.
                - Thành thạo React, JavaScript, TypeScript, HTML, CSS.
                - Kinh nghiệm với state management (Redux/Zustand).
                - Biết UI/UX design là lợi thế.
                """,
                required_skills=["react", "javascript", "typescript", "html", "css"],
                required_experience=1.0,
                project_keywords=["user interface", "responsive design", "SPA", "design system"],
                department="Product",
                location="Hà Nội",
                is_active=True,
            ),
            JobDescription(
                title="Full-stack Developer (C#/.NET + React)",
                jd_text="""
                Tuyển Full-stack Developer cho hệ thống ERP.
                Mô tả công việc:
                - Phát triển backend với ASP.NET Core và Entity Framework.
                - Xây dựng frontend với React hoặc Angular.
                - Quản trị SQL Server và PostgreSQL.
                - Deploy ứng dụng lên Azure Cloud.
                Yêu cầu:
                - 3+ năm kinh nghiệm phát triển phần mềm.
                - Thành thạo C#, ASP.NET Core, SQL Server.
                - Kinh nghiệm React hoặc Angular.
                - Có kinh nghiệm Azure/AWS là lợi thế.
                """,
                required_skills=["c#", "asp.net core", "sql server", "react", "azure"],
                required_experience=3.0,
                project_keywords=["ERP system", "enterprise application", "cloud deployment", "full-stack"],
                department="Engineering",
                location="Đà Nẵng",
                is_active=True,
            ),
            JobDescription(
                title="DevOps Engineer",
                jd_text="""
                Tuyển DevOps Engineer cho team Infrastructure.
                Mô tả công việc:
                - Thiết kế và quản lý CI/CD pipelines.
                - Quản trị hệ thống Kubernetes cluster trên AWS/GCP.
                - Monitoring, logging và alerting với Prometheus/Grafana.
                - Infrastructure as Code với Terraform/Ansible.
                Yêu cầu:
                - 3+ năm kinh nghiệm DevOps/SRE.
                - Thành thạo Docker, Kubernetes, Helm.
                - Kinh nghiệm AWS hoặc GCP.
                - Scripting: Python hoặc Bash.
                """,
                required_skills=["docker", "kubernetes", "aws", "terraform", "python"],
                required_experience=3.0,
                project_keywords=["CI/CD", "cloud infrastructure", "monitoring", "automation"],
                department="Infrastructure",
                location="Hồ Chí Minh",
                is_active=True,
            ),
            JobDescription(
                title="AI/ML Engineer (NLP Focus)",
                jd_text="""
                Tuyển AI Engineer chuyên về NLP cho sản phẩm AI.
                Mô tả công việc:
                - Nghiên cứu và phát triển mô hình NLP (text classification, NER, semantic search).
                - Fine-tune các pre-trained models (BERT, GPT) cho tiếng Việt.
                - Xây dựng pipeline ML end-to-end với MLOps.
                - Deploy mô hình AI lên production với FastAPI.
                Yêu cầu:
                - 2+ năm kinh nghiệm ML/AI.
                - Thành thạo Python, PyTorch hoặc TensorFlow.
                - Kinh nghiệm NLP: spaCy, Transformers, Sentence-BERT.
                - Có publication hoặc giải thưởng AI là lợi thế lớn.
                """,
                required_skills=["python", "pytorch", "tensorflow", "fastapi", "docker"],
                required_experience=2.0,
                project_keywords=["NLP", "machine learning", "model deployment", "text processing"],
                department="AI Research",
                location="Hồ Chí Minh",
                is_active=True,
            ),
        ]

        for jd in jds:
            db.add(jd)
        db.flush()
        print(f"  ✓ Đã tạo {len(jds)} JDs.")

        # ==========================================================
        # SEED CANDIDATES
        # ==========================================================
        candidates = [
            CandidateCV(
                full_name="Hoàng Vy",
                email="hoangvy@email.com",
                phone="0901234567",
                cv_text="""
                Họ và tên: Hoàng Vy
                Học vấn: Tốt nghiệp Đại học Đà Lạt, chuyên ngành Công nghệ thông tin (Cử nhân).
                Chứng chỉ: IELTS 6.5
                Mục tiêu: Trở thành Backend Developer chuyên nghiệp.
                Kinh nghiệm: Tôi đã có 2.5 năm kinh nghiệm làm việc thực tế.
                Kỹ năng chuyên môn:
                - Lập trình nền tảng với C++, C# và Python.
                - Có khả năng xây dựng API bằng FastAPI và phát triển web với ASP.NET.
                - Quản trị cơ sở dữ liệu tốt bằng PostgreSQL và SQL Server.
                - Đã từng làm app desktop dùng SQLite.
                Dự án thực tế:
                - Đã deploy hệ thống API lên VPS sử dụng Docker và CI/CD pipeline.
                - Xây dựng microservice xử lý thanh toán cho 1000+ users.
                - Phát triển web app quản lý nhân sự với ASP.NET Core và PostgreSQL.
                Thành tích: Đạt giải nhất cuộc thi lập trình cấp trường năm 2023.
                """,
                parsed_skills=["python", "c++", "c#", "fastapi", "asp.net", "postgresql", "sql server", "sqlite", "docker", "ci/cd"],
                project_descriptions=[
                    "Deploy hệ thống API lên VPS sử dụng Docker và CI/CD",
                    "Xây dựng microservice xử lý thanh toán với FastAPI và PostgreSQL",
                    "Phát triển web app quản lý nhân sự với ASP.NET Core",
                ],
                education="Cử nhân CNTT - Đại học Đà Lạt",
                experience_years=2.5,
            ),
            CandidateCV(
                full_name="Nguyễn Minh Tuấn",
                email="minhtuan@email.com",
                phone="0912345678",
                cv_text="""
                Họ và tên: Nguyễn Minh Tuấn
                Học vấn: Thạc sĩ Khoa học Máy tính - ĐH Bách Khoa TP.HCM.
                Chứng chỉ: TOEIC 850, AWS Certified Developer Associate.
                Kinh nghiệm: 4 năm kinh nghiệm trong lĩnh vực AI/ML.
                Kỹ năng chuyên môn:
                - Python, PyTorch, TensorFlow, scikit-learn.
                - NLP: spaCy, Hugging Face Transformers, Sentence-BERT.
                - Backend: FastAPI, Flask, Docker.
                - Cloud: AWS SageMaker, EC2, S3.
                Dự án nổi bật:
                - Xây dựng hệ thống NER tiếng Việt với spaCy, đạt F1-score 92%.
                - Fine-tune PhoBERT cho bài toán sentiment analysis.
                - Deploy mô hình ML lên production phục vụ 10K+ requests/ngày.
                Thành tích:
                - Giải nhì cuộc thi AI Hackathon 2023.
                - Published paper tại hội nghị RIVF 2024.
                - Team Lead nhóm AI gồm 4 người.
                """,
                parsed_skills=["python", "pytorch", "tensorflow", "fastapi", "flask", "docker", "aws", "spacy", "nlp"],
                project_descriptions=[
                    "Hệ thống NER tiếng Việt với spaCy, F1-score 92%",
                    "Fine-tune PhoBERT cho sentiment analysis",
                    "Deploy ML model production 10K+ requests/ngày",
                ],
                education="Thạc sĩ KHMT - ĐH Bách Khoa TP.HCM",
                experience_years=4.0,
            ),
            CandidateCV(
                full_name="Trần Thị Mai",
                email="tranmai@email.com",
                phone="0923456789",
                cv_text="""
                Họ và tên: Trần Thị Mai
                Học vấn: Cử nhân CNTT - Đại học FPT.
                Kinh nghiệm: 1 năm kinh nghiệm thực tập và freelance.
                Kỹ năng:
                - Frontend: React, JavaScript, HTML, CSS, TypeScript.
                - Có kiến thức cơ bản về Node.js và Express.
                - Sử dụng Git, Figma.
                Dự án:
                - Xây dựng website portfolio cá nhân bằng React.
                - Tham gia phát triển landing page cho startup.
                - Clone giao diện Spotify bằng React + Tailwind CSS.
                Hoạt động ngoại khóa:
                - Sinh viên xuất sắc năm 2023.
                - Mentor cho các bạn sinh viên năm nhất về HTML/CSS.
                """,
                parsed_skills=["react", "javascript", "html", "css", "typescript", "git", "node.js"],
                project_descriptions=[
                    "Website portfolio cá nhân bằng React",
                    "Landing page cho startup",
                    "Clone giao diện Spotify bằng React + Tailwind CSS",
                ],
                education="Cử nhân CNTT - Đại học FPT",
                experience_years=1.0,
            ),
        ]

        for c in candidates:
            db.add(c)

        db.commit()
        print(f"  ✓ Đã tạo {len(candidates)} Candidates.")
        print("\n✓ Seed data hoàn tất!")
        print(f"  - {len(jds)} Job Descriptions")
        print(f"  - {len(candidates)} Candidates")

    except Exception as e:
        db.rollback()
        print(f"  ✗ Lỗi khi seed data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
