# ==============================================================================
# FILE: backend/seed_data.py
# MÔ TẢ: Script tự động tạo bảng và nạp dữ liệu demo vào Database
# ==============================================================================
"""
Script này sẽ:
1. Tạo tất cả các bảng nếu chưa có (User, JobDescription, CandidateCV, MatchResult, Company)
2. Nạp dữ liệu tài khoản demo (Nhà tuyển dụng & Ứng viên)
3. Nạp danh sách JD thực tế (8 JDs)
4. Nạp danh sách ứng viên mẫu (4 CVs)
5. Nạp danh sách doanh nghiệp đối tác (6 Companies)
6. Thiết lập kết quả matching demo (bao gồm thông báo trúng tuyển của messi cr7)
"""

import sys
import os

# Đảm bảo import được backend modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import JobDescription, CandidateCV, User, Company, MatchResult, UserGeneratedCV
from datetime import datetime, timezone


def seed(force_recreate: bool = False):
    """Tạo tables và nạp dữ liệu demo tự động."""
    Base.metadata.create_all(bind=engine)
    print("✓ Đã tạo/kiểm tra database tables.")

    db = SessionLocal()

    try:
        # ==========================================================
        # 1. SEED USERS (Nhà tuyển dụng & Ứng viên)
        # ==========================================================
        demo_users = [
            {
                "full_name": "Admin Nhà Tuyển Dụng",
                "email": "admin@aimatcher.vn",
                "password": "admin123",
                "role": "nha_tuyen_dung",
                "phone": "0987654321",
            },
            {
                "full_name": "Vy Hoang",
                "email": "hahoangvy0707@gmail.com",
                "password": "admin123",
                "role": "nha_tuyen_dung",
                "phone": "0901234567",
            },
            {
                "full_name": "messi cr7",
                "email": "messi772004@gmail.com",
                "password": "admin123",
                "role": "ung_tuyen",
                "phone": "0377891254",
            },
            {
                "full_name": "ben mr",
                "email": "mrbenhandsome2000@gmail.com",
                "password": "admin123",
                "role": "ung_tuyen",
                "phone": "0911223344",
            },
        ]

        user_map = {}
        for udata in demo_users:
            u = db.query(User).filter(User.email == udata["email"]).first()
            if not u:
                u = User(
                    full_name=udata["full_name"],
                    email=udata["email"],
                    password_hash=User.hash_password(udata["password"]),
                    role=udata["role"],
                    phone=udata["phone"],
                    is_active=True,
                )
                db.add(u)
                db.flush()
            else:
                # Đảm bảo role và password đúng
                u.role = udata["role"]
                u.password_hash = User.hash_password(udata["password"])
                db.flush()
            user_map[udata["email"]] = u
        db.commit()
        print(f"  ✓ Đã kiểm tra/tạo {len(user_map)} tài khoản Users demo (admin@aimatcher.vn / admin123).")

        # ==========================================================
        # 2. SEED JOB DESCRIPTIONS (8 JDs)
        # ==========================================================
        existing_jds = db.query(JobDescription).count()
        if existing_jds == 0 or force_recreate:
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
                    department="APEX Technology Group",
                    location="TP. Hồ Chí Minh",
                    image="/images/hochiminh.png",
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
                    department="VNG Corporation",
                    location="Hà Nội",
                    image="/images/hanoi.png",
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
                    department="APEX Technology Group",
                    location="Đà Nẵng",
                    image="/images/DaNang.png",
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
                    department="VNG Corporation",
                    location="TP. Hồ Chí Minh",
                    image="/images/hochiminh.png",
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
                    department="AI Research Lab",
                    location="TP. Hồ Chí Minh",
                    image="/images/hochiminh.png",
                    is_active=True,
                ),
                JobDescription(
                    title="Mobile Developer (Flutter/React Native)",
                    jd_text="""
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
                    required_skills=["flutter", "react native", "dart", "typescript", "restful api"],
                    required_experience=2.0,
                    project_keywords=["mobile app", "cross-platform", "state management", "fintech payment"],
                    department="MoMo (M_Service)",
                    location="TP. Hồ Chí Minh",
                    image="/images/hochiminh.png",
                    is_active=True,
                ),
                JobDescription(
                    title="Data Engineer (Python/Spark/Airflow)",
                    jd_text="""
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
                    required_skills=["python", "sql", "spark", "airflow", "kafka", "postgresql"],
                    required_experience=2.0,
                    project_keywords=["data pipeline", "etl", "big data", "data warehouse", "lakehouse"],
                    department="Viettel Solutions",
                    location="Hà Nội",
                    image="/images/hanoi.png",
                    is_active=True,
                ),
                JobDescription(
                    title="QA Automation Engineer (Selenium/Playwright/Python)",
                    jd_text="""
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
                    required_skills=["selenium", "playwright", "python", "automation test", "postman", "ci/cd"],
                    required_experience=2.0,
                    project_keywords=["automation testing", "test framework", "api testing", "ci/cd pipeline", "regression test"],
                    department="FPT Software",
                    location="Đà Nẵng",
                    image="/images/DaNang.png",
                    is_active=True,
                ),
            ]

            for jd in jds:
                db.add(jd)
            db.flush()
            print(f"  ✓ Đã tạo {len(jds)} JDs.")

        # ==========================================================
        # 3. SEED CANDIDATES (4 Candidates)
        # ==========================================================
        existing_cvs = db.query(CandidateCV).count()
        if existing_cvs == 0 or force_recreate:
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
            db.flush()
            print(f"  ✓ Đã tạo {len(candidates)} Candidates.")

        # ==========================================================
        # 4. TẠO CV & KẾT QUẢ GÁN (ASSIGN HIRED) CHO MESSI CR7
        # ==========================================================
        messi_user = user_map.get("messi772004@gmail.com")
        messi_cv = db.query(CandidateCV).filter(CandidateCV.email == "messi772004@gmail.com").first()
        if not messi_cv:
            messi_cv = CandidateCV(
                full_name="messi cr7",
                email="messi772004@gmail.com",
                phone="0377891254",
                cv_text="""
                Họ và tên: messi cr7
                Học vấn: Cử nhân Công nghệ Thông tin - Chuyên ngành AI / Machine Learning.
                Kinh nghiệm: 2 năm kinh nghiệm phát triển phần mềm và ứng dụng AI.
                Kỹ năng: Python, PyTorch, TensorFlow, FastAPI, Docker, PostgreSQL, React, JavaScript.
                Dự án:
                - Xây dựng hệ thống đặt phòng khách sạn tích hợp FastAPI và PostgreSQL.
                - Phát triển mô hình AI matching CV-JD tự động.
                """,
                parsed_skills=["python", "pytorch", "tensorflow", "fastapi", "docker", "postgresql", "react", "javascript"],
                project_descriptions=[
                    "Xây dựng hệ thống đặt phòng khách sạn tích hợp FastAPI và PostgreSQL",
                    "Phát triển mô hình AI matching CV-JD tự động"
                ],
                education="Cử nhân CNTT",
                experience_years=2.0,
                user_id=messi_user.id if messi_user else None,
            )
            db.add(messi_cv)
            db.flush()

        # Tạo MatchResult Hired cho messi cr7 nếu chưa có
        ai_jd = db.query(JobDescription).filter(JobDescription.title.ilike("%AI/ML%")).first()
        if ai_jd and messi_cv:
            existing_match = db.query(MatchResult).filter(MatchResult.cv_id == messi_cv.id, MatchResult.jd_id == ai_jd.id).first()
            if not existing_match:
                match = MatchResult(
                    cv_id=messi_cv.id,
                    jd_id=ai_jd.id,
                    match_score=85.0,
                    match_level="Rất phù hợp",
                    status="hired",
                    applied_at=datetime.now(timezone.utc),
                    interview_info={
                        "type": "hired",
                        "status": "hired",
                        "job_title": ai_jd.title,
                        "department": ai_jd.department or "AI Research Lab",
                        "location": ai_jd.location or "TP. Hồ Chí Minh",
                        "start_date": "2026-11-20T08:00:00",
                        "salary_offer": "25 Triệu VNĐ",
                        "message": "Chúc mừng bạn messi cr7! Nhà tuyển dụng rất ấn tượng với hồ sơ của bạn và chính thức tiếp nhận bạn vào làm việc.",
                    }
                )
                db.add(match)
                db.flush()

        # ==========================================================
        # 4b. TẠO CV & BẢN CV LƯU CHO BEN MR (mrbenhandsome2000@gmail.com)
        # ==========================================================
        ben_user = user_map.get("mrbenhandsome2000@gmail.com")
        ben_cv = db.query(CandidateCV).filter(CandidateCV.email == "mrbenhandsome2000@gmail.com").first()
        if not ben_cv:
            ben_cv = CandidateCV(
                full_name="ben mr",
                email="mrbenhandsome2000@gmail.com",
                phone="0901234567",
                cv_text="""
                Họ và tên: ben mr
                Vị trí: Lập trình viên
                Email: mrbenhandsome2000@gmail.com
                Điện thoại: 0901234567
                Địa điểm: TP. Hồ Chí Minh
                Học vấn: Đại học Bách Khoa TP.HCM - Công nghệ Thông tin (2026, GPA: 3.4/4.0).
                Mục tiêu & Tóm tắt: Chuyên viên Lập trình viên đầy nhiệt huyết với nền tảng vững chắc về JavaScript, React, Python, FastAPI. Có tư duy giải quyết vấn đề mạch lạc, khả năng làm việc độc lập và phối hợp nhóm hiệu quả.
                Kỹ năng chuyên môn: JavaScript, React, Python, FastAPI, PostgreSQL, Git.
                Dự án tiêu biểu:
                - Website Tuyển dụng AI Matcher: Đảm nhiệm vai trò Full-stack & AI API, chịu trách nhiệm triển khai và hoàn thiện các module nghiệp vụ sử dụng React, FastAPI, PostgreSQL. Xây dựng và tối ưu các chức năng nòng cốt. Hệ thống vận hành trơn tru với phản hồi dưới 150ms.
                """,
                parsed_skills=["javascript", "react", "python", "fastapi", "postgresql", "git"],
                project_descriptions=[
                    "Website Tuyển dụng AI Matcher: Đảm nhiệm vai trò Full-stack & AI API sử dụng React, FastAPI, PostgreSQL"
                ],
                education="Đại học Bách Khoa TP.HCM - Công nghệ Thông tin",
                experience_years=2.0,
                user_id=ben_user.id if ben_user else None,
            )
            db.add(ben_cv)
            db.flush()

        if ben_user:
            ben_gen_cv = db.query(UserGeneratedCV).filter(UserGeneratedCV.user_id == ben_user.id).first()
            if not ben_gen_cv:
                ben_gen_cv = UserGeneratedCV(
                    user_id=ben_user.id,
                    title="CV - Lập trình viên",
                    language="vi",
                    template_id="modern",
                    target_job_title="Lập trình viên",
                    final_data={
                        "personal_info": {
                            "full_name": "ben mr",
                            "email": "mrbenhandsome2000@gmail.com",
                            "phone": "0901234567",
                            "title": "Lập trình viên",
                            "address": "TP. Hồ Chí Minh",
                            "education": "Đại học Bách Khoa TP.HCM - Công nghệ Thông tin (2026, GPA: 3.4/4.0)"
                        },
                        "professional_summary": "Chuyên viên Lập trình viên đầy nhiệt huyết với nền tảng vững chắc về JavaScript, React, Python, FastAPI. Có tư duy giải quyết vấn đề mạch lạc, khả năng làm việc độc lập và phối hợp nhóm hiệu quả, sẵn sàng tiếp cận công nghệ mới nhằm kiến tạo các sản phẩm chất lượng cao.",
                        "skills": ["JavaScript", "React", "Python", "FastAPI", "PostgreSQL", "Git"],
                        "polished_projects": [
                            {
                                "name": "Website Tuyển dụng AI Matcher",
                                "role": "Full-stack & AI API",
                                "bullet_points": [
                                    "Đảm nhiệm vai trò Full-stack & AI API, chịu trách nhiệm triển khai và hoàn thiện các module nghiệp vụ sử dụng React, FastAPI, PostgreSQL.",
                                    "Xây dựng và tối ưu các chức năng nòng cốt: Thiết kế giao diện người dùng và viết API đối sánh CV ứng viên tự động.",
                                    "Đạt kết quả thực tế: Hệ thống vận hành trơn tru với phản hồi dưới 150ms."
                                ]
                            }
                        ]
                    }
                )
                db.add(ben_gen_cv)
                db.flush()

        # ==========================================================
        # 5. SEED COMPANIES DEMO (6 Companies chuẩn theo models.py)
        # ==========================================================
        existing_companies = db.query(Company).count()
        if existing_companies == 0 or force_recreate:
            demo_companies = [
                Company(
                    name="APEX Technology Group",
                    logo="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop",
                    cover_image="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop",
                    tagline="Tiên phong Đổi mới Sáng tạo & Nền tảng AI Thông minh",
                    industry="Trí tuệ Nhân tạo & Phần mềm",
                    location="TP. Hồ Chí Minh",
                    company_size="500 - 1000 nhân viên",
                    website="https://apex-tech.com",
                    description="APEX Technology Group là tập đoàn công nghệ tiên phong tại Đông Nam Á, tập trung nghiên cứu và ứng dụng Trí tuệ Nhân tạo (Generative AI, NLP, Computer Vision) vào các bài toán chuyển đổi số doanh nghiệp quy mô lớn.",
                    benefits=[
                        "Lương thưởng cạnh tranh (tháng 13, 14 theo hiệu suất)",
                        "Cấp MacBook Pro M3 mới 100%",
                        "Làm việc Hybrid linh hoạt 2 ngày/tuần",
                        "Bảo hiểm sức khỏe quốc tế cao cấp PTI",
                        "Du lịch nghỉ dưỡng 5 sao định kỳ hàng năm",
                    ],
                    rating=4.9,
                ),
                Company(
                    name="AI Research Lab",
                    logo="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=256&h=256&fit=crop",
                    cover_image="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop",
                    tagline="Trung tâm Nghiên cứu & Ứng dụng Trí tuệ Nhân tạo Đỉnh cao",
                    industry="Trí tuệ Nhân tạo & Deep Learning",
                    location="TP. Hồ Chí Minh",
                    company_size="50 - 100 nhân viên",
                    website="https://ai-research.vn",
                    description="AI Research Lab tập hợp các nhà khoa học và kỹ sư AI xuất sắc, chuyên sâu vào xử lý ngôn ngữ tự nhiên (NLP) cho tiếng Việt, mô hình ngôn ngữ lớn (LLM) và các hệ thống matching thông minh.",
                    benefits=[
                        "Hệ thống GPU Cluster A100/H100 điện toán đám mây",
                        "Tài trợ công bố bài báo khoa học quốc tế (NeurIPS, ACL)",
                        "Lương thưởng theo chuẩn nhân tài AI quốc tế",
                        "Môi trường học thuật tự do và sáng tạo cao",
                    ],
                    rating=4.9,
                ),
                Company(
                    name="VNG Corporation",
                    logo="https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=256&h=256&fit=crop",
                    cover_image="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=400&fit=crop",
                    tagline="Đón nhận Thách thức & Kiến tạo Tương lai Số",
                    industry="Internet, Game & Điện toán Đám mây",
                    location="TP. Hồ Chí Minh (VNG Campus, Quận 7)",
                    company_size="1000+ nhân viên",
                    website="https://vng.com.vn",
                    description="VNG là kỳ lân công nghệ đầu tiên tại Việt Nam với các sản phẩm hàng chục triệu người dùng như Zalo, ZaloPay, VNG Cloud và các tựa game nổi tiếng toàn cầu.",
                    benefits=[
                        "Khuôn viên VNG Campus chuẩn quốc tế đẳng cấp",
                        "Phòng Gym, hồ bơi, canteen ăn sáng & trưa miễn phí",
                        "Chế độ thưởng ESOP và hiệu quả công việc hấp dẫn",
                        "Cơ hội đào tạo công nghệ hàng đầu khu vực",
                    ],
                    rating=4.8,
                ),
                Company(
                    name="FPT Software",
                    logo="https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=256&h=256&fit=crop",
                    cover_image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=400&fit=crop",
                    tagline="Cùng Bạn Đi Đến Thành Công Toàn Cầu",
                    industry="Xuất khẩu Phần mềm & Chuyển đổi số",
                    location="TP. Hồ Chí Minh (F-Town, TP. Thủ Đức)",
                    company_size="1000+ nhân viên",
                    website="https://fptsoftware.com",
                    description="FPT Software là công ty phần mềm lớn nhất Việt Nam với hơn 30,000 kỹ sư công nghệ trên toàn cầu, phục vụ hàng trăm khách hàng Fortune 500 tại Mỹ, Nhật Bản, châu Âu.",
                    benefits=[
                        "Cơ hội Onsite làm việc dài hạn tại Nhật Bản, Mỹ, EU",
                        "Xe buýt đưa đón nhân viên miễn phí tại các campus",
                        "Gói bảo hiểm FPT Care cho nhân viên và người thân",
                        "Hỗ trợ 100% lệ phí thi chứng chỉ quốc tế AWS, Azure, GCP",
                    ],
                    rating=4.7,
                ),
                Company(
                    name="MoMo (M_Service)",
                    logo="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=256&h=256&fit=crop",
                    cover_image="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
                    tagline="Siêu Ứng dụng Tài chính cho Hàng triệu Người Việt",
                    industry="Fintech & Tài chính Số",
                    location="TP. Hồ Chí Minh",
                    company_size="500 - 1000 nhân viên",
                    website="https://momo.vn",
                    description="MoMo là siêu ứng dụng thanh toán và tài chính số hàng đầu tại Việt Nam, phục vụ hơn 31 triệu người dùng với nền tảng công nghệ chịu tải cực lớn và bảo mật cao.",
                    benefits=[
                        "Chính sách thưởng hiệu quả và thưởng dự án hàng quý",
                        "Gói bảo hiểm chăm sóc sức khỏe toàn diện cao cấp",
                        "Trợ cấp thiết bị công nghệ làm việc hiện đại",
                        "Môi trường văn hóa cởi mở, tôn trọng sáng kiến cá nhân",
                    ],
                    rating=4.8,
                ),
                Company(
                    name="Viettel Solutions",
                    logo="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=256&h=256&fit=crop",
                    cover_image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop",
                    tagline="Tiên phong Kiến tạo Xã hội Số",
                    industry="Viễn thông & Dịch vụ Số",
                    location="Hà Nội",
                    company_size="1000+ nhân viên",
                    website="https://viettel.vn",
                    description="Viettel Solutions là đơn vị dẫn đầu trong việc cung cấp các giải pháp công nghệ thông tin, Cloud, IoT, Big Data cho các cơ quan chính phủ và doanh nghiệp hàng đầu.",
                    benefits=[
                        "Thu nhập thuộc top đầu ngành viễn thông & công nghệ số",
                        "Phúc lợi vững chắc từ Tập đoàn Công nghiệp - Viễn thông Quân đội",
                        "Tham gia trực tiếp các dự án công nghệ mang tầm vóc quốc gia",
                        "Môi trường kỷ luật, chuyên nghiệp và đầy thử thách lớn",
                    ],
                    rating=4.7,
                ),
            ]
            for comp in demo_companies:
                db.add(comp)
            db.flush()
            print("  ✓ Đã tạo danh sách Companies demo.")

        db.commit()
        print("\n✓ Seed data hoàn tất thành công!")

    except Exception as e:
        db.rollback()
        print(f"  ✗ Lỗi khi seed data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
