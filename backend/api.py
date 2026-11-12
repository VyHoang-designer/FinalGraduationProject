# ==============================================================================
# FILE: backend/api.py
# MÔ TẢ: FastAPI Application - REST API cho AI CV-JD Matching System
# ==============================================================================
"""
API Endpoints:
  GET  /api/candidates          - Danh sách tất cả ứng viên
  GET  /api/candidates/{id}     - Chi tiết 1 ứng viên
  POST /api/candidates          - Thêm ứng viên mới
  GET  /api/jobs                - Danh sách tất cả JDs
  POST /api/jobs                - Thêm JD mới
  POST /api/match/1-to-n        - *** Core: Chạy AI matching 1 CV → N JDs ***
  GET  /api/match/results/{id}  - Lấy kết quả matching đã lưu cho 1 CV
"""

import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from database import engine, get_db, Base
from models import User, JobDescription, CandidateCV, MatchResult, Company, UserGeneratedCV, JobInquiry
from schemas import (
    UserRegister, UserLogin, UserResponse, UserUpdateRequest,
    JobDescriptionCreate, JobDescriptionResponse,
    CandidateCVCreate, CandidateCVResponse,
    Match1ToNRequest, Match1ToNResponse, MatchResultResponse,
    MatchNTo1Request, MatchNTo1Response, CandidateMatchResult, GapItem,
    ApplyJobRequest, UpdateCandidateStatusRequest, AssignJobRequest,
    ScheduleInterviewRequest, CandidateInterviewResponse,
    CompanyResponse, CompanyDetailResponse,
    CompanyCreateRequest, CompanyUpdateRequest,
    CVGenerateRequest, CVGenerateResponse, CVSaveRequest, UserGeneratedCVResponse,
    GoogleLoginRequest,
    CVEvaluateMatchRequest, CVConfirmApplyRequest,
    JobInquiryCreate, JobInquiryResponse, JobInquiryReply,
    AIAssistantChatRequest, AIAssistantChatResponse
)
from cv_llm_service import generate_cv_content_with_llm
from ai_assistant_service import chat_with_ai_assistant
import hashlib


# ==============================================================================
# LIFESPAN: Khởi tạo DB tables + AI Engine khi server start
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Tạo tables và khởi tạo AI Engine khi startup."""
    try:
        Base.metadata.create_all(bind=engine)
        print("[API] Database tables da san sang.", flush=True)
    except Exception as e:
        print(f"[API] Warning DB init: {e}", flush=True)

    # Tự động nạp dữ liệu mẫu (JDs, Users, Candidates) nếu database đang thiếu
    try:
        from database import SessionLocal
        from models import JobDescription, User
        with SessionLocal() as db:
            job_count = db.query(JobDescription).count()
            user_count = db.query(User).count()
            if job_count == 0 or user_count == 0:
                print(f"[API] Database thiếu dữ liệu (JDs: {job_count}, Users: {user_count}). Đang tự động nạp dữ liệu mẫu...", flush=True)
                from seed_data import seed
                seed()
                print("[API] Đã nạp dữ liệu mẫu thành công!", flush=True)
    except Exception as e:
        print(f"[API] Warning auto-seed: {e}", flush=True)

    try:
        from ai_engine import ai_engine
        app.state.ai_engine = ai_engine
        print("[API] AI Engine da khoi tao thanh cong.", flush=True)
    except Exception as e:
        print(f"[API] Warning AI Engine init: {e}", flush=True)

    yield  # Server running

    print("[API] Server đang shutdown...", flush=True)


# ==============================================================================
# KHỞI TẠO FASTAPI APP
# ==============================================================================
app = FastAPI(
    title="AI CV-JD Matching System",
    description="Hệ thống đánh giá CV-JD bằng AI (Feature Registry + Random Forest)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS cho Frontend
default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://vyhoang-designer.github.io",
]
env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    CORS_ORIGINS = [o.strip() for o in env_cors.split(",") if o.strip()]
    if "https://vyhoang-designer.github.io" not in CORS_ORIGINS:
        CORS_ORIGINS.append("https://vyhoang-designer.github.io")
else:
    CORS_ORIGINS = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# STATIC FILES (Uploads & Avatars)
# ==============================================================================
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")



# ==============================================================================
# HEALTH CHECK
# ==============================================================================
@app.get("/")
@app.get("/healthz")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI CV-JD Matching API is running"}


@app.api_route("/api/admin/seed", methods=["GET", "POST"])
def trigger_seed(force: bool = False):
    """Endpoint thủ công nạp lại dữ liệu demo vào database nếu cần."""
    try:
        from seed_data import seed
        seed(force_recreate=force)
        return {"status": "ok", "message": "Nạp dữ liệu mẫu thành công"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/admin/sync-database")
def sync_database(data: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Nhận toàn bộ dữ liệu từ database cục bộ (Local PostgreSQL) và ghi đè đồng bộ lên Render.
    """
    from models import User, Company, JobDescription, CandidateCV, MatchResult, JobInquiry, UserGeneratedCV

    def parse_dt(v):
        if not v:
            return None
        if isinstance(v, datetime):
            return v
        try:
            return datetime.fromisoformat(str(v).replace('Z', '+00:00'))
        except Exception:
            return None

    def filter_model_fields(model_cls, row_dict):
        valid_cols = {c.name: c for c in model_cls.__table__.columns}
        res = {}
        for k, v in row_dict.items():
            if k in valid_cols:
                col_type = str(valid_cols[k].type).lower()
                if ('date' in col_type or 'time' in col_type) and v is not None:
                    res[k] = parse_dt(v)
                else:
                    res[k] = v
        return res

    tables_data = data.get("tables", {})
    summary = {}

    try:
        # Xóa các bảng phụ thuộc trước để tránh lỗi Foreign Key
        db.query(MatchResult).delete()
        db.query(JobInquiry).delete()
        db.query(UserGeneratedCV).delete()
        db.query(CandidateCV).delete()
        db.query(JobDescription).delete()
        db.query(Company).delete()
        db.query(User).delete()
        db.commit()

        model_map = [
            ("users", User),
            ("companies", Company),
            ("job_descriptions", JobDescription),
            ("candidates_cv", CandidateCV),
            ("match_results", MatchResult),
            ("job_inquiries", JobInquiry),
            ("user_generated_cvs", UserGeneratedCV),
        ]

        for tbl_name, model_cls in model_map:
            if tbl_name in tables_data:
                count = 0
                for r in tables_data[tbl_name]:
                    kwargs = filter_model_fields(model_cls, r)
                    obj = model_cls(**kwargs)
                    db.add(obj)
                    count += 1
                db.commit()
                summary[tbl_name] = count

        return {
            "success": True,
            "message": "Đã đồng bộ toàn bộ dữ liệu từ local sang Render thành công!",
            "summary": summary,
        }
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ dữ liệu: {str(e)}")


# ==============================================================================
# AUTH ENDPOINTS (Đăng ký / Đăng nhập)
# ==============================================================================
@app.post("/api/auth/register", response_model=UserResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Đăng ký tài khoản mới (ứng tuyển hoặc nhà tuyển dụng)."""
    # Kiểm tra email đã tồn tại
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng.")

    # Tạo user mới
    new_user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=User.hash_password(data.password),
        role=data.role,
        phone=data.phone,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login", response_model=UserResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Đăng nhập bằng email + password + role."""
    user = db.query(User).filter(
        User.email == data.email,
        User.role == data.role,
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Email hoặc vai trò không đúng.")

    if not user.verify_password(data.password):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa.")

    return user


@app.post("/api/auth/google", response_model=UserResponse)
def login_with_google(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Xác thực đăng nhập Google thông qua Firebase.
    Lưu trữ và đồng bộ người dùng tập trung trong cơ sở dữ liệu PostgreSQL.
    - Nếu email đã tồn tại: Đăng nhập user và đồng bộ avatar nếu có.
    - Nếu email chưa có trong DB: Tự động tạo bản ghi User mới trong PostgreSQL với vai trò chỉ định.
    """
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa.")

        # Cập nhật avatar_url hoặc firebase_uid nếu trước đó chưa có
        updated = False
        if data.avatar_url and not user.avatar_url:
            user.avatar_url = data.avatar_url
            updated = True
        if data.firebase_uid and not getattr(user, 'firebase_uid', None):
            user.firebase_uid = data.firebase_uid
            updated = True
        if updated:
            db.commit()
            db.refresh(user)
        return user
    else:
        # Tạo user mới trong PostgreSQL
        role = data.role if data.role in ["ung_tuyen", "nha_tuyen_dung"] else "ung_tuyen"
        # Mật khẩu ngẫu nhiên an toàn cho tài khoản OAuth
        rand_hash = hashlib.sha256(f"google_oauth_{email}_{data.firebase_uid or ''}".encode()).hexdigest()
        new_user = User(
            full_name=data.full_name or email.split("@")[0],
            email=email,
            password_hash=rand_hash,
            role=role,
            avatar_url=data.avatar_url,
            firebase_uid=data.firebase_uid,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user


@app.get("/api/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả người dùng (admin use)."""
    return db.query(User).order_by(User.created_at.desc()).all()


@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user_profile(user_id: int, req: UserUpdateRequest, db: Session = Depends(get_db)):
    """Cập nhật thông tin cá nhân của người dùng (họ tên, số điện thoại)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if req.full_name is not None and req.full_name.strip():
        user.full_name = req.full_name.strip()
    if req.phone is not None:
        user.phone = req.phone.strip()
    db.commit()
    db.refresh(user)
    return user


# ==============================================================================
# CANDIDATE ENDPOINTS
# ==============================================================================
@app.get("/api/candidates", response_model=list[CandidateCVResponse])
def list_candidates(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả ứng viên."""
    return db.query(CandidateCV).order_by(CandidateCV.created_at.desc()).all()


@app.get("/api/candidates/{candidate_id}", response_model=CandidateCVResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 ứng viên theo ID."""
    candidate = db.query(CandidateCV).filter(CandidateCV.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy ứng viên với ID={candidate_id}")
    return candidate


@app.get("/api/employer/candidates")
def get_employer_candidates(
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách ứng viên toàn diện dành cho Nhà tuyển dụng:
    Bao gồm thông tin hồ sơ, việc làm ứng tuyển, điểm AI Match và giai đoạn tuyển dụng.
    """
    candidates = db.query(CandidateCV).order_by(CandidateCV.created_at.desc()).all()
    results = []

    for cv in candidates:
        matches = (
            db.query(MatchResult, JobDescription)
            .join(JobDescription, MatchResult.jd_id == JobDescription.id)
            .filter(MatchResult.cv_id == cv.id)
            .order_by(MatchResult.applied_at.desc().nullslast(), MatchResult.match_score.desc())
            .all()
        )

        applications = []
        for match, jd in matches:
            applications.append({
                "match_id": match.id,
                "jd_id": jd.id,
                "job_title": jd.title,
                "department": jd.department,
                "location": jd.location,
                "status": match.status or "applied",
                "match_score": match.match_score,
                "match_level": match.match_level,
                "applied_at": match.applied_at.isoformat() if match.applied_at else None,
                "interview_info": match.interview_info,
            })

        applied_apps = [a for a in applications if a["applied_at"] is not None]
        active_app = applied_apps[0] if applied_apps else (applications[0] if applications else None)

        item = {
            "id": cv.id,
            "full_name": cv.full_name,
            "email": cv.email or "",
            "phone": cv.phone or "",
            "education": cv.education or "",
            "experience_years": cv.experience_years or 0.0,
            "parsed_skills": cv.parsed_skills or [],
            "avatar_url": cv.avatar_url,
            "created_at": cv.created_at.isoformat() if cv.created_at else None,
            "applications": applications,
            "active_application": active_app,
            "applied_job_title": active_app["job_title"] if active_app else "Kho nhân tài",
            "applied_jd_id": active_app["jd_id"] if active_app else None,
            "department": active_app["department"] if active_app else "",
            "status": active_app["status"] if active_app else "applied",
            "match_score": active_app["match_score"] if active_app else 0.0,
            "match_level": active_app["match_level"] if active_app else "Chưa đánh giá",
            "interview_info": active_app["interview_info"] if active_app else None,
            "has_applied": len(applied_apps) > 0,
        }

        if job_id and (not active_app or active_app["jd_id"] != job_id):
            continue
        if status and status != "all" and item["status"] != status:
            continue
        if search:
            s = search.lower()
            text = f"{item['full_name']} {item['email']} {' '.join(item['parsed_skills'])} {item['applied_job_title']}".lower()
            if s not in text:
                continue

        results.append(item)

    return results


@app.get("/api/employer/notifications")
def get_employer_notifications(db: Session = Depends(get_db)):
    """Lấy danh sách thông báo tuyển dụng dành cho Nhà tuyển dụng."""
    notifications = []
    
    # Lấy các đơn ứng tuyển gần đây có applied_at
    recent_matches = (
        db.query(MatchResult, CandidateCV, JobDescription)
        .join(CandidateCV, MatchResult.cv_id == CandidateCV.id)
        .join(JobDescription, MatchResult.jd_id == JobDescription.id)
        .filter(MatchResult.applied_at.isnot(None))
        .order_by(MatchResult.applied_at.desc())
        .limit(20)
        .all()
    )

    for match, cv, jd in recent_matches:
        # 1. Phản hồi phỏng vấn nếu có
        intv = match.interview_info if isinstance(match.interview_info, dict) else None
        if intv and intv.get("candidate_response"):
            resp = intv.get("candidate_response")
            notifications.append({
                "id": f"intv_{match.id}",
                "type": "interview_confirmed" if resp == "confirmed" else "interview_declined",
                "title": f"Ứng viên {cv.full_name} {'đã đồng ý' if resp == 'confirmed' else 'từ chối'} phỏng vấn",
                "message": f"Vị trí: {jd.title} • Thời gian: {intv.get('scheduled_at') or 'Đang sắp xếp'}",
                "created_at": match.applied_at.isoformat() if match.applied_at else None,
                "candidate_id": cv.id,
                "candidate_name": cv.full_name,
                "avatar_url": cv.avatar_url,
                "job_id": jd.id,
                "job_title": jd.title,
                "match_score": match.match_score,
            })

        # 2. Thông báo ứng tuyển mới / Đạt điểm cao AI
        is_top = (match.match_score or 0) >= 75
        notifications.append({
            "id": f"app_{match.id}",
            "type": "top_candidate" if is_top else "new_application",
            "title": f"{'⭐ Ứng viên tiềm năng: ' if is_top else '📋 Hồ sơ mới: '}{cv.full_name}",
            "message": f"Ứng tuyển vị trí {jd.title} • AI Match: {match.match_score or 0}%",
            "created_at": match.applied_at.isoformat() if match.applied_at else None,
            "candidate_id": cv.id,
            "candidate_name": cv.full_name,
            "avatar_url": cv.avatar_url,
            "job_id": jd.id,
            "job_title": jd.title,
            "match_score": match.match_score,
        })

    # 3. Thông báo tin nhắn liên hệ từ người dùng / ứng viên gửi cho JD
    try:
        recent_inquiries = (
            db.query(JobInquiry, JobDescription)
            .join(JobDescription, JobInquiry.jd_id == JobDescription.id)
            .order_by(JobInquiry.created_at.desc())
            .limit(15)
            .all()
        )
        for inq, jd in recent_inquiries:
            notifications.append({
                "id": f"inq_{inq.id}",
                "type": "new_inquiry",
                "title": f"📩 Tin nhắn liên hệ mới từ {inq.sender_name}",
                "message": f"Vị trí: {jd.title} • Tiêu đề: \"{inq.subject}\"",
                "created_at": inq.created_at.isoformat() if inq.created_at else None,
                "candidate_id": inq.user_id,
                "candidate_name": inq.sender_name,
                "avatar_url": None,
                "job_id": jd.id,
                "job_title": jd.title,
                "inquiry_id": inq.id,
                "inquiry_subject": inq.subject,
                "inquiry_message": inq.message,
                "sender_email": inq.sender_email,
                "sender_phone": inq.sender_phone,
                "status": inq.status,
            })
    except Exception as e:
        print("[NOTI] Lỗi lấy thông báo liên hệ:", e)

    # Sắp xếp thông báo mới nhất lên đầu
    notifications.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return notifications[:25]


# ==============================================================================
# JOB INQUIRIES / LIÊN HỆ CHO JD
# ==============================================================================
@app.post("/api/inquiries", response_model=JobInquiryResponse, status_code=201)
def create_job_inquiry(data: JobInquiryCreate, db: Session = Depends(get_db)):
    """Gửi liên hệ / tin nhắn từ ứng viên tới Nhà tuyển dụng của một JD cụ thể."""
    jd = db.query(JobDescription).filter(JobDescription.id == data.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Vị trí tuyển dụng (JD) không tồn tại.")

    inquiry = JobInquiry(
        user_id=data.user_id,
        jd_id=data.jd_id,
        sender_name=data.sender_name,
        sender_email=data.sender_email,
        sender_phone=data.sender_phone,
        subject=data.subject,
        message=data.message,
        status="unread"
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    return JobInquiryResponse(
        id=inquiry.id,
        user_id=inquiry.user_id,
        jd_id=inquiry.jd_id,
        job_title=jd.title,
        department=jd.department,
        sender_name=inquiry.sender_name,
        sender_email=inquiry.sender_email,
        sender_phone=inquiry.sender_phone,
        subject=inquiry.subject,
        message=inquiry.message,
        status=inquiry.status,
        reply_message=inquiry.reply_message,
        created_at=inquiry.created_at,
    )


@app.get("/api/inquiries/my/{user_id}", response_model=list[JobInquiryResponse])
def get_my_inquiries(user_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách các liên hệ mà ứng viên đã gửi."""
    inquiries = (
        db.query(JobInquiry, JobDescription)
        .join(JobDescription, JobInquiry.jd_id == JobDescription.id)
        .filter(JobInquiry.user_id == user_id)
        .order_by(JobInquiry.created_at.desc())
        .all()
    )
    results = []
    for inq, jd in inquiries:
        results.append(JobInquiryResponse(
            id=inq.id,
            user_id=inq.user_id,
            jd_id=inq.jd_id,
            job_title=jd.title,
            department=jd.department,
            sender_name=inq.sender_name,
            sender_email=inq.sender_email,
            sender_phone=inq.sender_phone,
            subject=inq.subject,
            message=inq.message,
            status=inq.status,
            reply_message=inq.reply_message,
            created_at=inq.created_at,
        ))
    return results


@app.get("/api/inquiries/job/{job_id}", response_model=list[JobInquiryResponse])
def get_job_inquiries(job_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách liên hệ gửi cho một JD cụ thể (dành cho Nhà tuyển dụng)."""
    inquiries = (
        db.query(JobInquiry, JobDescription)
        .join(JobDescription, JobInquiry.jd_id == JobDescription.id)
        .filter(JobInquiry.jd_id == job_id)
        .order_by(JobInquiry.created_at.desc())
        .all()
    )
    results = []
    for inq, jd in inquiries:
        results.append(JobInquiryResponse(
            id=inq.id,
            user_id=inq.user_id,
            jd_id=inq.jd_id,
            job_title=jd.title,
            department=jd.department,
            sender_name=inq.sender_name,
            sender_email=inq.sender_email,
            sender_phone=inq.sender_phone,
            subject=inq.subject,
            message=inq.message,
            status=inq.status,
            reply_message=inq.reply_message,
            created_at=inq.created_at,
        ))
    return results


@app.delete("/api/inquiries/{inquiry_id}")
def delete_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    """Xóa một tin nhắn liên hệ."""
    inq = db.query(JobInquiry).filter(JobInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ.")
    db.delete(inq)
    db.commit()
    return {"message": "Đã xóa liên hệ thành công", "id": inquiry_id}


@app.get("/api/employer/inquiries", response_model=list[JobInquiryResponse])
def get_employer_inquiries(
    jd_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách tất cả liên hệ từ ứng viên cho Nhà tuyển dụng:
    - Có thể lọc theo vị trí JD
    - Có thể lọc theo trạng thái (unread, read, replied)
    - Có thể tìm kiếm theo họ tên, email, tiêu đề
    """
    query = (
        db.query(JobInquiry, JobDescription)
        .join(JobDescription, JobInquiry.jd_id == JobDescription.id)
    )
    if jd_id:
        query = query.filter(JobInquiry.jd_id == jd_id)
    if status and status != "all":
        query = query.filter(JobInquiry.status == status)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                JobInquiry.sender_name.ilike(s),
                JobInquiry.sender_email.ilike(s),
                JobInquiry.subject.ilike(s),
                JobInquiry.message.ilike(s),
                JobDescription.title.ilike(s)
            )
        )
    inquiries = query.order_by(JobInquiry.created_at.desc()).all()
    results = []
    for inq, jd in inquiries:
        results.append(JobInquiryResponse(
            id=inq.id,
            user_id=inq.user_id,
            jd_id=inq.jd_id,
            job_title=jd.title,
            department=jd.department,
            sender_name=inq.sender_name,
            sender_email=inq.sender_email,
            sender_phone=inq.sender_phone,
            subject=inq.subject,
            message=inq.message,
            status=inq.status,
            reply_message=inq.reply_message,
            created_at=inq.created_at,
        ))
    return results


@app.get("/api/employer/inquiries/stats")
def get_employer_inquiry_stats(db: Session = Depends(get_db)):
    """Lấy thống kê số lượng liên hệ theo trạng thái dành cho Nhà tuyển dụng."""
    total = db.query(func.count(JobInquiry.id)).scalar() or 0
    unread = db.query(func.count(JobInquiry.id)).filter(JobInquiry.status == "unread").scalar() or 0
    read = db.query(func.count(JobInquiry.id)).filter(JobInquiry.status == "read").scalar() or 0
    replied = db.query(func.count(JobInquiry.id)).filter(JobInquiry.status == "replied").scalar() or 0
    return {
        "total": total,
        "unread": unread,
        "read": read,
        "replied": replied,
    }


@app.patch("/api/inquiries/{inquiry_id}/status", response_model=JobInquiryResponse)
def update_inquiry_status(inquiry_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    """Cập nhật trạng thái liên hệ (unread, read, replied)."""
    inq = db.query(JobInquiry).filter(JobInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ.")
    inq.status = status
    db.commit()
    db.refresh(inq)
    jd = db.query(JobDescription).filter(JobDescription.id == inq.jd_id).first()
    return JobInquiryResponse(
        id=inq.id,
        user_id=inq.user_id,
        jd_id=inq.jd_id,
        job_title=jd.title if jd else None,
        department=jd.department if jd else None,
        sender_name=inq.sender_name,
        sender_email=inq.sender_email,
        sender_phone=inq.sender_phone,
        subject=inq.subject,
        message=inq.message,
        status=inq.status,
        reply_message=inq.reply_message,
        created_at=inq.created_at,
    )


@app.post("/api/inquiries/{inquiry_id}/reply", response_model=JobInquiryResponse)
def reply_to_inquiry(inquiry_id: int, data: JobInquiryReply, db: Session = Depends(get_db)):
    """Nhà tuyển dụng gửi / lưu nội dung phản hồi cho ứng viên."""
    inq = db.query(JobInquiry).filter(JobInquiry.id == inquiry_id).first()
    if not inq:
        raise HTTPException(status_code=404, detail="Không tìm thấy liên hệ.")
    inq.reply_message = data.reply_message
    inq.status = "replied"
    db.commit()
    db.refresh(inq)
    jd = db.query(JobDescription).filter(JobDescription.id == inq.jd_id).first()
    return JobInquiryResponse(
        id=inq.id,
        user_id=inq.user_id,
        jd_id=inq.jd_id,
        job_title=jd.title if jd else None,
        department=jd.department if jd else None,
        sender_name=inq.sender_name,
        sender_email=inq.sender_email,
        sender_phone=inq.sender_phone,
        subject=inq.subject,
        message=inq.message,
        status=inq.status,
        reply_message=inq.reply_message,
        created_at=inq.created_at,
    )




@app.delete("/api/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    """Xóa hồ sơ ứng viên khỏi hệ thống."""
    candidate = db.query(CandidateCV).filter(CandidateCV.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")
    db.delete(candidate)
    db.commit()
    return {"message": "Xóa ứng viên thành công", "id": candidate_id}



@app.post("/api/candidates", response_model=CandidateCVResponse, status_code=201)
def create_candidate(data: CandidateCVCreate, db: Session = Depends(get_db)):
    """Thêm ứng viên mới vào database."""
    candidate = CandidateCV(**data.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate

def sync_user_generated_cv_to_candidate_cv(gen_cv: UserGeneratedCV, db: Session) -> Optional[CandidateCV]:
    """
    Tự động đồng bộ một bản CV tạo từ AI CV Builder sang bảng CandidateCV.
    Giúp ứng viên:
    1. Thấy ngay hồ sơ trong trang Cá nhân (ProfilePage) -> 'Hồ sơ / CV đã tải'
    2. Chọn ngay hồ sơ này trong Modal 'Ứng tuyển bằng AI' trên danh sách việc làm
    """
    if not gen_cv or not gen_cv.user_id:
        return None

    try:
        final_data = gen_cv.final_data or gen_cv.llm_output or {}
        raw_input = gen_cv.raw_input if isinstance(gen_cv.raw_input, dict) else {}
        personal_info = final_data.get("personal_info") or raw_input.get("personal_info") or {}

        user_obj = db.query(User).filter(User.id == gen_cv.user_id).first()

        full_name = (
            personal_info.get("full_name")
            or (user_obj.full_name if user_obj else None)
            or gen_cv.title
            or "Ứng viên"
        )
        email = personal_info.get("email") or (user_obj.email if user_obj else None)
        phone = personal_info.get("phone") or (user_obj.phone if user_obj else None)
        avatar_url = gen_cv.avatar_url or personal_info.get("avatar_url") or (user_obj.avatar_url if user_obj else None)

        skills = final_data.get("skills", [])
        if not skills:
            skills = raw_input.get("skills", [])
        if not isinstance(skills, list):
            skills = [str(skills)]

        summary = final_data.get("professional_summary") or raw_input.get("summary", "")
        projects = final_data.get("polished_projects") or raw_input.get("projects", [])

        project_descs = []
        exp_bullets = []
        if isinstance(projects, list):
            for p in projects:
                if isinstance(p, dict):
                    bullets = p.get("bullet_points", [])
                    b_text = " | ".join(bullets) if isinstance(bullets, list) else str(bullets)
                    desc = f"{p.get('name', 'Dự án')}: {b_text}"
                    project_descs.append(desc)
                    exp_bullets.append(desc)
                elif isinstance(p, str):
                    project_descs.append(p)
                    exp_bullets.append(p)

        education_info = final_data.get("education") or raw_input.get("education")
        if isinstance(education_info, dict):
            edu_str = f"{education_info.get('degree', '')} - {education_info.get('school', '')}".strip(" -")
        elif isinstance(education_info, str):
            edu_str = education_info
        else:
            edu_str = None

        exp_years = 1.5
        exps = final_data.get("work_experiences") or raw_input.get("experiences", [])
        if isinstance(exps, list) and len(exps) > 0:
            exp_years = max(1.0, float(len(exps)))

        cv_text = (
            f"Họ tên: {full_name}\n"
            f"Email: {email}\n"
            f"Điện thoại: {phone}\n"
            f"Tóm tắt: {summary}\n"
            f"Kỹ năng: {', '.join(str(s) for s in skills)}\n"
            f"Học vấn: {edu_str or ''}\n"
            f"Dự án:\n" + "\n".join(exp_bullets)
        )

        cand_cv = db.query(CandidateCV).filter(CandidateCV.user_id == gen_cv.user_id).first()
        if not cand_cv and email:
            cand_cv = db.query(CandidateCV).filter(CandidateCV.email == email).first()

        if not cand_cv:
            cand_cv = CandidateCV(
                user_id=gen_cv.user_id,
                full_name=full_name,
                email=email,
                phone=phone,
                cv_text=cv_text,
                parsed_skills=skills,
                project_descriptions=project_descs,
                education=edu_str,
                experience_years=exp_years,
                avatar_url=avatar_url,
            )
            db.add(cand_cv)
        else:
            cand_cv.user_id = gen_cv.user_id
            cand_cv.full_name = full_name
            cand_cv.email = email or cand_cv.email
            cand_cv.phone = phone or cand_cv.phone
            cand_cv.cv_text = cv_text
            cand_cv.parsed_skills = skills or cand_cv.parsed_skills
            cand_cv.project_descriptions = project_descs or cand_cv.project_descriptions
            if edu_str:
                cand_cv.education = edu_str
            if exp_years:
                cand_cv.experience_years = exp_years
            if avatar_url:
                cand_cv.avatar_url = avatar_url

        db.commit()
        db.refresh(cand_cv)
        return cand_cv
    except Exception as e:
        print(f"[API] Warning sync CV to CandidateCV: {e}")
        db.rollback()
        return None


@app.get("/api/candidates/my-cvs/{user_id}", response_model=list[CandidateCVResponse])
def get_my_cvs(user_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách CV của một user cụ thể, tự động đồng bộ từ AI CV Builder nếu có."""
    # 1. Tự động đồng bộ các bản CV tạo bằng AI sang bảng CandidateCV
    try:
        gen_cvs = db.query(UserGeneratedCV).filter(UserGeneratedCV.user_id == user_id).order_by(UserGeneratedCV.updated_at.desc()).all()
        for gen in gen_cvs:
            sync_user_generated_cv_to_candidate_cv(gen, db)
    except Exception as e:
        print(f"[API] Error auto-syncing UserGeneratedCV in get_my_cvs: {e}")

    # 2. Truy vấn danh sách CandidateCV theo user_id hoặc email
    user = db.query(User).filter(User.id == user_id).first()
    user_email = user.email if user else None

    conditions = [CandidateCV.user_id == user_id]
    if user_email:
        conditions.append(CandidateCV.email == user_email)

    return db.query(CandidateCV).filter(or_(*conditions)).order_by(CandidateCV.created_at.desc()).all()

from fastapi import File, UploadFile, Form
import shutil
import tempfile
from cv_parser import parse_cv_file

# Thư mục lưu file upload
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/candidates/upload-cv", response_model=CandidateCVResponse)
def upload_cv(user_id: int = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload file CV (.pdf, .docx), parse thật bằng cv_parser module,
    rồi lưu dữ liệu đã bóc tách vào bảng candidates_cv.
    """
    # Validate file extension
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in (".pdf", ".docx", ".doc"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file .pdf hoặc .docx")

    # Lưu file tạm vào thư mục uploads
    safe_name = f"user{user_id}_{int(datetime.utcnow().timestamp())}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # ★ Gọi CV Parser thật (pdfplumber + SpaCy NER + Regex)
        parsed = parse_cv_file(file_path)

        # ★ Trích xuất ảnh chân dung/avatar tự động từ CV PDF
        extracted_avatar = None
        if ext == ".pdf":
            try:
                from avatar_extractor import extract_candidate_avatar
                extracted_avatar = extract_candidate_avatar(file_path)
                if extracted_avatar:
                    print(f"[AVATAR EXTRACTOR] Da trich xuat avatar thanh cong: {extracted_avatar}")
            except Exception as ext_err:
                print(f"[AVATAR EXTRACTOR] Canh bao loi trich xuat avatar: {ext_err}")

        # Lấy email từ user nếu CV không có
        user = db.query(User).filter(User.id == user_id).first()
        cv_email = parsed["email"] or (user.email if user else None)
        final_avatar = extracted_avatar or (user.avatar_url if user else None)

        if user and extracted_avatar and not user.avatar_url:
            user.avatar_url = extracted_avatar

        candidate = CandidateCV(
            full_name=parsed["full_name"],
            email=cv_email,
            phone=parsed["phone"],
            avatar_url=final_avatar,
            cv_text=parsed["cv_text"],
            parsed_skills=parsed["parsed_skills"],
            project_descriptions=parsed["project_descriptions"],
            education=parsed["education"],
            experience_years=parsed["experience_years"],
            user_id=user_id,
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return candidate

    except Exception as e:
        # Cleanup file nếu lỗi
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Lỗi khi parse CV: {str(e)}")


# ==============================================================================
# JOB DESCRIPTION ENDPOINTS
# ==============================================================================
@app.get("/api/jobs", response_model=list[JobDescriptionResponse])
def list_jobs(active_only: bool = True, db: Session = Depends(get_db)):
    """Lấy danh sách JDs kèm pipeline counts thực tế."""
    query = db.query(JobDescription)
    if active_only:
        query = query.filter(JobDescription.is_active == True)
    jobs = query.order_by(JobDescription.created_at.desc()).all()

    # Tính pipeline counts cho từng JD từ match_results
    counts_raw = (
        db.query(MatchResult.jd_id, MatchResult.status, func.count(MatchResult.id))
        .filter(MatchResult.applied_at.isnot(None))
        .group_by(MatchResult.jd_id, MatchResult.status)
        .all()
    )
    counts_map = {}
    for jd_id, status, count_val in counts_raw:
        if jd_id not in counts_map:
            counts_map[jd_id] = {"applied": 0, "screening": 0, "interview": 0, "offer": 0, "hired": 0}
        st = status or "applied"
        counts_map[jd_id][st] = count_val

    response_jobs = []
    for job in jobs:
        counts = counts_map.get(job.id, {"applied": 0, "screening": 0, "interview": 0, "offer": 0, "hired": 0})
        job_dict = {
            "id": job.id,
            "title": job.title,
            "jd_text": job.jd_text,
            "required_skills": job.required_skills or [],
            "required_experience": job.required_experience or 0.0,
            "project_keywords": job.project_keywords or [],
            "is_active": job.is_active,
            "department": job.department,
            "location": job.location,
            "image": job.image,
            "started_time": job.started_time,
            "expired_time": job.expired_time,
            "custom_criteria": job.custom_criteria or [],
            "created_at": job.created_at,
            "pipeline_counts": counts,
        }
        response_jobs.append(JobDescriptionResponse(**job_dict))

    return response_jobs


@app.post("/api/jobs", response_model=JobDescriptionResponse, status_code=201)
def create_job(data: JobDescriptionCreate, db: Session = Depends(get_db)):
    """Thêm JD mới vào database."""
    job = JobDescription(**data.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@app.post("/api/jobs/apply")
def apply_for_job(request: ApplyJobRequest, db: Session = Depends(get_db)):
    """
    Ứng viên xác nhận nộp CV:
    Lưu thông tin ứng tuyển và toàn bộ kết quả phân tích AI (bao gồm skill_details từ LLM)
    vào database để tái sử dụng mà không cần phân tích lại khi Nhà tuyển dụng bấm AI Match.
    """
    candidate = db.query(CandidateCV).filter(CandidateCV.id == request.cv_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ ứng viên.")
    jd = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Không tìm thấy vị trí tuyển dụng.")

    if request.user_id and candidate.user_id is None:
        candidate.user_id = request.user_id

    # Tìm MatchResult hiện có cho cặp (cv_id, jd_id)
    match = db.query(MatchResult).filter(
        MatchResult.cv_id == request.cv_id,
        MatchResult.jd_id == request.jd_id
    ).first()

    now = datetime.utcnow()
    if match:
        match.status = "applied"
        match.applied_at = now
        if request.match_score is not None:
            match.match_score = request.match_score
        if request.match_level is not None:
            match.match_level = request.match_level
        if request.feature_details is not None:
            match.feature_details = request.feature_details
        if request.custom_criteria_results is not None:
            match.custom_criteria_results = request.custom_criteria_results
        if request.skill_details is not None:
            match.skill_details = request.skill_details
    else:
        match = MatchResult(
            cv_id=request.cv_id,
            jd_id=request.jd_id,
            match_score=request.match_score if request.match_score is not None else 0.0,
            match_level=request.match_level if request.match_level is not None else "Tương đối",
            feature_details=request.feature_details or {},
            custom_criteria_results=request.custom_criteria_results or [],
            skill_details=request.skill_details or [],
            status="applied",
            applied_at=now,
            created_at=now,
        )
        db.add(match)

    db.commit()
    db.refresh(match)
    return {
        "success": True,
        "message": f"Nộp hồ sơ thành công cho vị trí '{jd.title}'!",
        "application_id": match.id,
        "applied_at": match.applied_at
    }


@app.get("/api/candidates/applied-jobs/{user_id}")
def get_user_applied_jobs(user_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách các JD ID mà user này đã nộp hồ sơ ứng tuyển."""
    user = db.query(User).filter(User.id == user_id).first()
    user_email = user.email if user else ""
    applied_records = (
        db.query(MatchResult.jd_id)
        .join(CandidateCV, MatchResult.cv_id == CandidateCV.id)
        .filter(
            MatchResult.applied_at.isnot(None),
            (CandidateCV.user_id == user_id) | (CandidateCV.email == user_email)
        )
        .all()
    )
    jd_ids = list({r[0] for r in applied_records})
    return {"applied_jd_ids": jd_ids}


@app.get("/api/candidates/applications/{user_id}")
def get_user_applications(user_id: int, db: Session = Depends(get_db)):
    """
    Lấy danh sách chi tiết các công việc mà ứng viên đã nộp hồ sơ,
    kèm theo trạng thái tuyển dụng hiện tại và lịch phỏng vấn (nếu có).
    """
    user = db.query(User).filter(User.id == user_id).first()
    user_email = user.email if user else ""
    records = (
        db.query(MatchResult, JobDescription, CandidateCV)
        .join(CandidateCV, MatchResult.cv_id == CandidateCV.id)
        .join(JobDescription, MatchResult.jd_id == JobDescription.id)
        .filter(
            MatchResult.applied_at.isnot(None),
            (CandidateCV.user_id == user_id) | (CandidateCV.email == user_email)
        )
        .order_by(MatchResult.applied_at.desc())
        .all()
    )
    results = []
    for match, jd, cv in records:
        results.append({
            "match_id": match.id,
            "jd_id": jd.id,
            "cv_id": cv.id,
            "candidate_name": cv.full_name,
            "job_title": jd.title,
            "department": jd.department,
            "location": jd.location,
            "required_experience": jd.required_experience or 0.0,
            "required_skills": jd.required_skills or [],
            "match_score": match.match_score,
            "match_level": match.match_level,
            "status": match.status or "applied",
            "applied_at": match.applied_at.isoformat() if match.applied_at else None,
            "interview_info": match.interview_info,
        })
    return results


@app.get("/api/jobs/{job_id}/candidates")
def get_job_candidates(job_id: int, status: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lấy danh sách các ứng viên đã nộp hồ sơ / ứng tuyển vào một JD cụ thể.
    Có thể lọc theo status (applied, screening, interview, offer, hired).
    """
    query = (
        db.query(MatchResult, CandidateCV)
        .join(CandidateCV, MatchResult.cv_id == CandidateCV.id)
        .filter(
            MatchResult.jd_id == job_id,
            MatchResult.applied_at.isnot(None)
        )
    )
    if status and status != "all":
        query = query.filter(MatchResult.status == status)

    records = query.order_by(MatchResult.applied_at.desc()).all()
    results = []
    for match, cv in records:
        results.append({
            "match_id": match.id,
            "cv_id": cv.id,
            "full_name": cv.full_name,
            "email": cv.email,
            "phone": cv.phone,
            "avatar_url": cv.avatar_url,
            "experience_years": cv.experience_years or 0.0,
            "education": cv.education,
            "parsed_skills": cv.parsed_skills or [],
            "match_score": match.match_score,
            "match_level": match.match_level,
            "status": match.status or "applied",
            "applied_at": match.applied_at.isoformat() if match.applied_at else None,
            "interview_info": match.interview_info,
            "feature_details": match.feature_details or {},
            "custom_criteria_results": match.custom_criteria_results or [],
            "skill_details": match.skill_details or [],
        })
    return results


@app.patch("/api/jobs/{job_id}/candidates/{cv_id}/status")
def update_candidate_status(job_id: int, cv_id: int, req: UpdateCandidateStatusRequest, db: Session = Depends(get_db)):
    """Cập nhật trạng thái pipeline của ứng viên trong JD."""
    match = db.query(MatchResult).filter(MatchResult.jd_id == job_id, MatchResult.cv_id == cv_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ ứng tuyển.")
    match.status = req.status
    if req.status == "hired":
        now = datetime.utcnow()
        jd = match.job_description
        cv = match.candidate
        info = dict(match.interview_info or {})
        info.update({
            "type": "hired",
            "status": "hired",
            "hired_at": now.isoformat(),
            "message": f"Chúc mừng bạn {cv.full_name if cv else ''}! Bạn đã chính thức trúng tuyển vào vị trí {jd.title if jd else 'công việc'}.",
            "job_title": jd.title if jd else "",
            "department": jd.department if jd else "",
            "read": False,
            "updated_at": now.isoformat(),
        })
        match.interview_info = info

    db.commit()
    db.refresh(match)
    return {"success": True, "status": match.status, "interview_info": match.interview_info}


@app.post("/api/jobs/{job_id}/candidates/{cv_id}/assign")
def assign_candidate_to_job(
    job_id: int, 
    cv_id: int, 
    req: AssignJobRequest, 
    db: Session = Depends(get_db)
):
    """
    Nhà tuyển dụng assign vị trí JD này cho ứng viên và tuyển dụng ứng viên (status='hired').
    Tự động gửi thông báo trúng tuyển đến ứng viên và đổi trạng thái đã tuyển.
    """
    jd = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin vị trí tuyển dụng (JD).")

    cv = db.query(CandidateCV).filter(CandidateCV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ ứng viên.")

    now = datetime.utcnow()
    match = db.query(MatchResult).filter(MatchResult.jd_id == job_id, MatchResult.cv_id == cv_id).first()

    if not match:
        # Nếu chưa có MatchResult (recruiter chọn assign trực tiếp từ AI Job Routing)
        match = MatchResult(
            cv_id=cv_id,
            jd_id=job_id,
            match_score=85.0,
            match_level="Phù hợp",
            feature_details={},
            custom_criteria_results=[],
            skill_details=[],
            status="hired",
            applied_at=now,
        )
        db.add(match)
        db.flush()

    match.status = req.status or "hired"
    if not match.applied_at:
        match.applied_at = now

    hired_msg = req.note or f"Chúc mừng {cv.full_name}! Bạn đã trúng tuyển và được nhận vào làm việc tại vị trí {jd.title} ({jd.department or 'Công ty'})."
    hired_data = {
        "type": "hired",
        "status": "hired",
        "hired_at": now.isoformat(),
        "scheduled_at": req.start_date,
        "start_date": req.start_date,
        "salary_offer": req.salary_offer,
        "message": hired_msg,
        "note": req.note,
        "job_title": jd.title,
        "department": jd.department,
        "location": jd.location,
        "read": False,
        "updated_at": now.isoformat(),
    }
    match.interview_info = hired_data

    db.commit()
    db.refresh(match)
    return {
        "success": True,
        "match_id": match.id,
        "status": match.status,
        "interview_info": match.interview_info,
        "message": f"Đã assign vị trí '{jd.title}' cho ứng viên '{cv.full_name}' và gửi thông báo tuyển dụng thành công."
    }



@app.post("/api/jobs/{job_id}/candidates/{cv_id}/schedule-interview")
def schedule_interview(
    job_id: int, 
    cv_id: int, 
    req: ScheduleInterviewRequest, 
    db: Session = Depends(get_db)
):
    """
    Nhà tuyển dụng thiết lập ngày giờ, địa điểm và các quy định phỏng vấn cho ứng viên.
    Tự động cập nhật trạng thái ứng viên sang 'interview' (Phỏng vấn).
    """
    match = db.query(MatchResult).filter(MatchResult.jd_id == job_id, MatchResult.cv_id == cv_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ ứng tuyển.")

    now = datetime.utcnow()
    interview_data = {
        "scheduled_at": req.scheduled_at,
        "interview_type": req.interview_type or "Trực tiếp",
        "location": req.location,
        "interviewer": req.interviewer,
        "regulations": req.regulations,
        "note": req.note,
        "status": "invited",             # "invited" (Chờ ứng viên xác nhận)
        "candidate_response": None,      # None | "confirmed" | "declined"
        "candidate_response_at": None,
        "candidate_note": None,
        "updated_at": now.isoformat(),
    }
    match.interview_info = interview_data
    match.status = "interview"
    db.commit()
    db.refresh(match)
    return {"success": True, "interview_info": match.interview_info, "status": match.status}


@app.get("/api/candidates/interviews/{user_id}")
def get_candidate_interviews(user_id: int, db: Session = Depends(get_db)):
    """
    Lấy danh sách các lời mời phỏng vấn & thông báo tuyển dụng (Hired) dành cho ứng viên.
    Kiểm tra qua CandidateCV.user_id hoặc email của user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    records = (
        db.query(MatchResult, JobDescription, CandidateCV)
        .join(CandidateCV, MatchResult.cv_id == CandidateCV.id)
        .join(JobDescription, MatchResult.jd_id == JobDescription.id)
        .filter(
            (MatchResult.interview_info.isnot(None)) | (MatchResult.status == "hired"),
            (CandidateCV.user_id == user_id) | (CandidateCV.email == (user.email if user else ""))
        )
        .order_by(MatchResult.applied_at.desc())
        .all()
    )
    results = []
    for match, jd, cv in records:
        info = match.interview_info
        if not info and match.status == "hired":
            info = {
                "type": "hired",
                "status": "hired",
                "message": f"Chúc mừng bạn! Bạn đã trúng tuyển vào vị trí {jd.title}.",
                "job_title": jd.title,
                "department": jd.department,
                "location": jd.location,
                "hired_at": (match.applied_at or match.created_at).isoformat() if (match.applied_at or match.created_at) else None
            }
        results.append({
            "match_id": match.id,
            "cv_id": match.cv_id,
            "candidate_name": cv.full_name,
            "jd_id": match.jd_id,
            "job_title": jd.title,
            "department": jd.department,
            "location": jd.location,
            "status": match.status,
            "interview_info": info,
        })
    return results


@app.post("/api/candidates/interviews/{match_id}/respond")
def respond_interview(
    match_id: int, 
    req: CandidateInterviewResponse, 
    db: Session = Depends(get_db)
):
    """
    Ứng viên xác nhận đi phỏng vấn hay từ chối.
    """
    match = db.query(MatchResult).filter(MatchResult.id == match_id).first()
    if not match or not match.interview_info:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch hẹn phỏng vấn.")

    now = datetime.utcnow()
    info = dict(match.interview_info)
    info["candidate_response"] = req.response   # "confirmed" | "declined"
    info["candidate_response_at"] = now.isoformat()
    info["candidate_note"] = req.note
    if req.response == "confirmed":
        info["status"] = "confirmed"
    elif req.response == "declined":
        info["status"] = "declined"

    match.interview_info = info
    db.commit()
    db.refresh(match)
    return {"success": True, "interview_info": match.interview_info}


@app.get("/api/jobs/{job_id}", response_model=JobDescriptionResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 JD theo ID."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy JD với ID={job_id}")
    return job


@app.put("/api/jobs/{job_id}", response_model=JobDescriptionResponse)
def update_job(job_id: int, data: JobDescriptionCreate, db: Session = Depends(get_db)):
    """Cập nhật thông tin JD."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy JD với ID={job_id}")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)
        
    db.commit()
    db.refresh(job)
    return job


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Xóa 1 JD theo ID."""
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy JD với ID={job_id}")
    
    db.delete(job)
    db.commit()
    return {"message": "Xóa JD thành công", "id": job_id}


# ==============================================================================
# COMPANY ENDPOINTS
# ==============================================================================
@app.get("/api/companies", response_model=list[CompanyResponse])
def get_companies(industry: Optional[str] = None, location: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy danh sách các công ty tuyển dụng kèm số lượng jobs đang mở."""
    query = db.query(Company)
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%") | Company.tagline.ilike(f"%{search}%"))
    if industry and industry != "all":
        query = query.filter(Company.industry.ilike(f"%{industry}%"))
    if location and location != "all":
        query = query.filter(Company.location.ilike(f"%{location}%"))
    companies = query.order_by(Company.rating.desc(), Company.name.asc()).all()

    results = []
    for c in companies:
        jobs_count = db.query(JobDescription).filter(
            JobDescription.department.ilike(f"%{c.name}%"),
            JobDescription.is_active == True
        ).count()
        results.append(CompanyResponse(
            id=c.id,
            name=c.name,
            logo=c.logo,
            cover_image=c.cover_image,
            tagline=c.tagline,
            industry=c.industry,
            location=c.location,
            company_size=c.company_size,
            website=c.website,
            description=c.description,
            benefits=c.benefits or [],
            rating=c.rating or 4.8,
            active_jobs_count=jobs_count,
            created_at=c.created_at,
        ))
    return results


@app.get("/api/companies/{company_id}", response_model=CompanyDetailResponse)
def get_company_detail(company_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 công ty kèm danh sách các jobs đang tuyển."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy công ty.")

    jobs = db.query(JobDescription).filter(
        JobDescription.department.ilike(f"%{company.name}%"),
        JobDescription.is_active == True
    ).order_by(JobDescription.created_at.desc()).all()

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        logo=company.logo,
        cover_image=company.cover_image,
        tagline=company.tagline,
        industry=company.industry,
        location=company.location,
        company_size=company.company_size,
        website=company.website,
        description=company.description,
        benefits=company.benefits or [],
        rating=company.rating or 4.8,
        active_jobs_count=len(jobs),
        active_jobs=[JobDescriptionResponse.model_validate(j) for j in jobs],
        created_at=company.created_at,
    )


@app.post("/api/companies", response_model=CompanyResponse)
def create_company(req: CompanyCreateRequest, db: Session = Depends(get_db)):
    """Thêm một công ty mới vào hệ thống."""
    existing = db.query(Company).filter(Company.name == req.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Công ty với tên này đã tồn tại.")

    company = Company(
        name=req.name.strip(),
        logo=req.logo,
        cover_image=req.cover_image,
        tagline=req.tagline,
        industry=req.industry,
        location=req.location,
        company_size=req.company_size,
        website=req.website,
        description=req.description,
        benefits=req.benefits or [],
        rating=req.rating or 4.8,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    return CompanyResponse(
        id=company.id,
        name=company.name,
        logo=company.logo,
        cover_image=company.cover_image,
        tagline=company.tagline,
        industry=company.industry,
        location=company.location,
        company_size=company.company_size,
        website=company.website,
        description=company.description,
        benefits=company.benefits or [],
        rating=company.rating or 4.8,
        active_jobs_count=0,
        created_at=company.created_at,
    )


@app.put("/api/companies/{company_id}", response_model=CompanyDetailResponse)
def update_company(company_id: int, req: CompanyUpdateRequest, db: Session = Depends(get_db)):
    """Cập nhật thông tin công ty."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy công ty.")

    old_name = company.name

    if req.name and req.name.strip() != old_name:
        existing = db.query(Company).filter(Company.name == req.name.strip()).first()
        if existing and existing.id != company_id:
            raise HTTPException(status_code=400, detail="Tên công ty mới đã tồn tại.")
        new_name = req.name.strip()
        company.name = new_name
        # Đồng bộ department trong job_descriptions nếu đổi tên công ty
        db.query(JobDescription).filter(
            JobDescription.department.ilike(f"%{old_name}%")
        ).update({JobDescription.department: new_name}, synchronize_session=False)

    if req.logo is not None:
        company.logo = req.logo
    if req.cover_image is not None:
        company.cover_image = req.cover_image
    if req.tagline is not None:
        company.tagline = req.tagline
    if req.industry is not None:
        company.industry = req.industry
    if req.location is not None:
        company.location = req.location
    if req.company_size is not None:
        company.company_size = req.company_size
    if req.website is not None:
        company.website = req.website
    if req.description is not None:
        company.description = req.description
    if req.benefits is not None:
        company.benefits = req.benefits
    if req.rating is not None:
        company.rating = req.rating

    db.commit()
    db.refresh(company)

    jobs = db.query(JobDescription).filter(
        JobDescription.department.ilike(f"%{company.name}%"),
        JobDescription.is_active == True
    ).order_by(JobDescription.created_at.desc()).all()

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        logo=company.logo,
        cover_image=company.cover_image,
        tagline=company.tagline,
        industry=company.industry,
        location=company.location,
        company_size=company.company_size,
        website=company.website,
        description=company.description,
        benefits=company.benefits or [],
        rating=company.rating or 4.8,
        active_jobs_count=len(jobs),
        active_jobs=[JobDescriptionResponse.model_validate(j) for j in jobs],
        created_at=company.created_at,
    )


@app.delete("/api/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    """Xóa công ty."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy công ty.")

    db.delete(company)
    db.commit()
    return {"message": "Xóa công ty thành công", "id": company_id}



# ==============================================================================
# ★★★ CORE ENDPOINT: POST /api/match/1-to-n ★★★
# ==============================================================================
class Match1To1Request(BaseModel):
    cv_id: int
    jd_id: int

@app.post("/api/match/1-to-1", response_model=MatchResultResponse)
def match_one_to_one(request: Match1To1Request, db: Session = Depends(get_db)):
    """Chạy AI matching 1 CV → 1 JD."""
    candidate = db.query(CandidateCV).filter(CandidateCV.id == request.cv_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Không tìm thấy ứng viên.")
    
    jd = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc.")

    cv_data = {
        "cv_text": candidate.cv_text,
        "project_descriptions": candidate.project_descriptions or [],
    }
    jd_list = [{
        "jd_id": jd.id,
        "jd_data": {
            "jd_text": jd.jd_text,
            "required_experience": jd.required_experience or 0.0,
            "required_skills": jd.required_skills or [],
            "project_keywords": jd.project_keywords or [],
            "custom_criteria": jd.custom_criteria or [],
        }
    }]

    ai = app.state.ai_engine
    results, _ = ai.match_cv_to_all_jds(cv_data, jd_list)
    if not results:
        raise HTTPException(status_code=500, detail="Lỗi khi chạy AI matching.")
    
    result = results[0]
    
    # Tính gaps
    jd_data_for_gap = {
        "jd_text": jd.jd_text,
        "required_experience": jd.required_experience or 0.0,
        "required_skills": jd.required_skills or [],
        "project_keywords": jd.project_keywords or [],
    }
    cv_data_for_gap = {
        "parsed_skills": candidate.parsed_skills or [],
        "cv_text": candidate.cv_text,
    }
    raw_gaps = ai.analyze_gaps(jd_data_for_gap, cv_data_for_gap, result["feature_details"], result.get("custom_criteria_results", []))
    gaps = [GapItem(**g) for g in raw_gaps]

    return MatchResultResponse(
        id=0, # Fake ID vì không lưu DB cho thao tác test thử của ứng viên
        cv_id=request.cv_id,
        jd_id=request.jd_id,
        match_score=result["match_score"],
        match_level=result["match_level"],
        feature_details=result["feature_details"],
        created_at=datetime.utcnow(),
        job_title=jd.title,
        job_department=jd.department,
        job_location=jd.location,
        job_required_skills=jd.required_skills or [],
        gaps=gaps,
        custom_criteria_results=result.get("custom_criteria_results", []),
        skill_details=result.get("skill_details", []),
    )

@app.post("/api/match/1-to-n", response_model=Match1ToNResponse)
def match_one_to_n(request: Match1ToNRequest, db: Session = Depends(get_db)):
    """
    Core Business Logic: Chạy AI matching 1 CV → ALL active JDs.

    Flow:
      1. Fetch CV data từ DB
      2. Fetch ALL active JDs từ DB
      3. Với mỗi JD: chạy DynamicFeaturePipeline + RF prediction
      4. Lưu kết quả vào match_results
      5. Trả về ranked list (high → low score)
    """
    start_time = time.time()

    # ---- Step 1: Fetch Candidate ----
    candidate = db.query(CandidateCV).filter(CandidateCV.id == request.cv_id).first()
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy ứng viên với ID={request.cv_id}"
        )

    # ---- Step 2: Fetch ALL active JDs ----
    active_jds = db.query(JobDescription).filter(JobDescription.is_active == True).all()
    if not active_jds:
        raise HTTPException(
            status_code=404,
            detail="Không có vị trí tuyển dụng nào đang hoạt động."
        )

    # ---- Step 3: Build data dicts ----
    cv_data = {
        "cv_text": candidate.cv_text,
        "project_descriptions": candidate.project_descriptions or [],
    }

    jd_list = []
    for jd in active_jds:
        jd_list.append({
            "jd_id": jd.id,
            "jd_data": {
                "jd_text": jd.jd_text,
                "required_experience": jd.required_experience or 0.0,
                "required_skills": jd.required_skills or [],
                "project_keywords": jd.project_keywords or [],
                "custom_criteria": jd.custom_criteria or [],
            }
        })

    # ---- Step 4: Run AI Engine ----
    ai = app.state.ai_engine
    results, ai_time_ms = ai.match_cv_to_all_jds(cv_data, jd_list)

    # ---- Step 5: Xóa kết quả cũ (nếu có) rồi lưu mới ----
    db.query(MatchResult).filter(MatchResult.cv_id == request.cv_id).delete()

    # Tạo lookup dict cho JD info
    jd_lookup = {jd.id: jd for jd in active_jds}

    response_results = []
    for result in results:
        jd_id = result["jd_id"]
        jd_obj = jd_lookup[jd_id]

        # Lưu vào DB
        db_match = MatchResult(
            cv_id=request.cv_id,
            jd_id=jd_id,
            match_score=result["match_score"],
            match_level=result["match_level"],
            feature_details=result["feature_details"],
            custom_criteria_results=result.get("custom_criteria_results", []),
        )
        db.add(db_match)
        db.flush()  # Lấy ID mà chưa commit

        # Tính gaps
        jd_data_for_gap = {
            "jd_text": jd_obj.jd_text,
            "required_experience": jd_obj.required_experience or 0.0,
            "required_skills": jd_obj.required_skills or [],
            "project_keywords": jd_obj.project_keywords or [],
        }
        cv_data_for_gap = {
            "parsed_skills": candidate.parsed_skills or [],
            "cv_text": candidate.cv_text,
        }
        raw_gaps = ai.analyze_gaps(jd_data_for_gap, cv_data_for_gap, result["feature_details"], result.get("custom_criteria_results", []))
        gaps = [GapItem(**g) for g in raw_gaps]

        # Build response item
        response_results.append(MatchResultResponse(
            id=db_match.id,
            cv_id=request.cv_id,
            jd_id=jd_id,
            match_score=result["match_score"],
            match_level=result["match_level"],
            feature_details=result["feature_details"],
            created_at=db_match.created_at,
            status=db_match.status or "applied",
            applied_at=db_match.applied_at,
            job_title=jd_obj.title,
            job_department=jd_obj.department,
            job_location=jd_obj.location,
            job_required_skills=jd_obj.required_skills or [],
            gaps=gaps,
            custom_criteria_results=result.get("custom_criteria_results", []),
            skill_details=result.get("skill_details", []),
        ))

    db.commit()

    total_time_ms = (time.time() - start_time) * 1000

    return Match1ToNResponse(
        cv_id=request.cv_id,
        candidate_name=candidate.full_name,
        total_jobs_matched=len(results),
        results=response_results,
        processing_time_ms=round(total_time_ms, 2),
    )


# ==============================================================================
# ★★★ CORE ENDPOINT: POST /api/match/n-to-1 ★★★
# ==============================================================================
@app.post("/api/match/n-to-1", response_model=MatchNTo1Response)
def match_n_to_one(request: MatchNTo1Request, db: Session = Depends(get_db)):
    """
    Hiển thị kết quả AI Match cho 1 JD:
    - CHỈ hiển thị những ứng viên ĐÃ NỘP HỒ SƠ cho vị trí này.
    - Tái sử dụng trực tiếp kết quả đánh giá AI đã lưu trong DB (match_results) khi ứng viên nộp hồ sơ.
    - KHÔNG đánh giá lại bằng LLM, KHÔNG tốn quota API Gemini, phản hồi tức thì.
    """
    start_time = time.time()

    # ---- Step 1: Fetch JD ----
    jd = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy JD với ID={request.jd_id}")

    # ---- Step 2: CHỈ lấy các ứng viên ĐÃ NỘP HỒ SƠ cho JD này ----
    applied_matches = (
        db.query(MatchResult)
        .filter(
            MatchResult.jd_id == request.jd_id,
            MatchResult.applied_at.isnot(None)
        )
        .order_by(MatchResult.match_score.desc())
        .all()
    )

    if not applied_matches:
        return MatchNTo1Response(
            jd_id=request.jd_id,
            job_title=jd.title,
            total_candidates=0,
            results=[],
            processing_time_ms=0.0,
        )

    # ---- Step 3: Lấy thông tin ứng viên từ CandidateCV ----
    cv_ids = [m.cv_id for m in applied_matches]
    candidates = db.query(CandidateCV).filter(CandidateCV.id.in_(cv_ids)).all()
    cv_lookup = {c.id: c for c in candidates}

    jd_data = {
        "jd_text": jd.jd_text,
        "required_experience": jd.required_experience or 0.0,
        "required_skills": jd.required_skills or [],
        "project_keywords": jd.project_keywords or [],
    }

    ai = app.state.ai_engine
    response_results = []
    for rank_idx, match in enumerate(applied_matches):
        cv_obj = cv_lookup.get(match.cv_id)
        if not cv_obj:
            continue

        rank = rank_idx + 1
        is_best = (rank == 1)

        # Gap analysis (offline heuristic, không tốn quota LLM) cho rank 2+
        gaps = []
        if not is_best:
            cv_data_for_gap = {
                "parsed_skills": cv_obj.parsed_skills or [],
                "cv_text": cv_obj.cv_text,
            }
            try:
                raw_gaps = ai.analyze_gaps(
                    jd_data,
                    cv_data_for_gap,
                    match.feature_details or {},
                    match.custom_criteria_results or []
                )
                gaps = [GapItem(**g) for g in raw_gaps]
            except Exception:
                gaps = []

        response_results.append(CandidateMatchResult(
            cv_id=match.cv_id,
            candidate_name=cv_obj.full_name,
            email=cv_obj.email,
            avatar_url=cv_obj.avatar_url,
            experience_years=cv_obj.experience_years or 0.0,
            parsed_skills=cv_obj.parsed_skills or [],
            education=cv_obj.education,
            match_score=match.match_score or 0.0,
            match_level=match.match_level or "Chưa phù hợp",
            feature_details=match.feature_details or {},
            rank=rank,
            gaps=gaps,
            custom_criteria_results=match.custom_criteria_results or [],
            skill_details=match.skill_details or [],
            is_best_match=is_best,
        ))

    total_time_ms = round((time.time() - start_time) * 1000, 2)

    return MatchNTo1Response(
        jd_id=request.jd_id,
        job_title=jd.title,
        total_candidates=len(response_results),
        results=response_results,
        processing_time_ms=total_time_ms,
    )


# ==============================================================================
# GET CACHED MATCH RESULTS
# ==============================================================================
@app.get("/api/match/results/{cv_id}", response_model=list[MatchResultResponse])
def get_match_results(cv_id: int, db: Session = Depends(get_db)):
    """Lấy kết quả matching đã lưu cho 1 CV (từ cache DB)."""
    results = (
        db.query(MatchResult)
        .filter(MatchResult.cv_id == cv_id)
        .order_by(MatchResult.match_score.desc())
        .all()
    )

    response = []
    for r in results:
        jd = r.job_description
        
        gaps = []
        if jd:
            jd_data_for_gap = {
                "jd_text": jd.jd_text,
                "required_experience": jd.required_experience or 0.0,
                "required_skills": jd.required_skills or [],
                "project_keywords": jd.project_keywords or [],
            }
            # Accessing candidate directly may need eager load or relation, assuming it works
            cv_data_for_gap = {
                "parsed_skills": r.candidate.parsed_skills if r.candidate else [],
                "cv_text": r.candidate.cv_text if r.candidate else "",
            }
            raw_gaps = app.state.ai_engine.analyze_gaps(jd_data_for_gap, cv_data_for_gap, r.feature_details, r.custom_criteria_results or [])
            gaps = [{"category": g["category"], "severity": g["severity"], "title": g["title"], "message": g["message"], "missing_items": g["missing_items"]} for g in raw_gaps]

        response.append(MatchResultResponse(
            id=r.id,
            cv_id=r.cv_id,
            jd_id=r.jd_id,
            match_score=r.match_score,
            match_level=r.match_level,
            feature_details=r.feature_details,
            created_at=r.created_at,
            status=r.status or "applied",
            applied_at=r.applied_at,
            job_title=jd.title if jd else "N/A",
            job_department=jd.department if jd else None,
            job_location=jd.location if jd else None,
            job_required_skills=jd.required_skills if jd else [],
            gaps=gaps,
            custom_criteria_results=r.custom_criteria_results or [],
        ))

    return response


# ==============================================================================
# CV BUILDER APIS (Tạo CV tự động cùng AI)
# ==============================================================================
@app.post("/api/cv-builder/generate")
def generate_cv_content(req: CVGenerateRequest):
    """
    Gọi Gemini LLM để chuẩn hóa câu từ và bố cục CV theo chuẩn ATS.
    Tuân thủ quy tắc Zero-Hallucination: không bịa đặt số liệu hay kỹ năng.
    """
    try:
        result = generate_cv_content_with_llm(req)
        return {"success": True, "data": result}
    except Exception as e:
        print(f"[API] Lỗi khi tạo CV LLM: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai-assistant/chat", response_model=AIAssistantChatResponse)
def ai_assistant_chat(data: AIAssistantChatRequest):
    """
    Trò chuyện cùng AI Career Assistant (Gemini LLM nhúng):
    - Hướng nghiệp, tư vấn viết CV chuẩn ATS
    - Mẹo phỏng vấn, đàm phán lương
    - Hướng dẫn tính năng trên nền tảng AI Matcher
    """
    if not data.message or not data.message.strip():
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống.")
    try:
        reply_text = chat_with_ai_assistant(
            message=data.message.strip(),
            history=data.history or [],
            user_context=data.user_context or {}
        )
        return AIAssistantChatResponse(reply=reply_text)
    except Exception as e:
        print(f"[API] Lỗi AI Assistant: {e}")
        raise HTTPException(status_code=500, detail="Không thể tạo phản hồi từ AI Assistant.")



@app.post("/api/cv-builder/save")
def save_user_generated_cv(req: CVSaveRequest, db: Session = Depends(get_db)):
    """Lưu bản nháp hoặc phiên bản CV đã hoàn thành vào tài khoản người dùng và tự động đồng bộ sang CandidateCV."""
    try:
        cv_id = req.raw_input.get("id") if isinstance(req.raw_input, dict) else None
        existing_cv = None
        if cv_id:
            existing_cv = db.query(UserGeneratedCV).filter(UserGeneratedCV.id == cv_id).first()

        target_cv = None
        if existing_cv:
            existing_cv.title = req.title
            existing_cv.language = req.language
            existing_cv.template_id = req.template_id
            existing_cv.target_job_title = req.target_job_title
            existing_cv.avatar_url = req.avatar_url
            existing_cv.raw_input = req.raw_input
            existing_cv.llm_output = req.llm_output
            existing_cv.final_data = req.final_data
            existing_cv.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_cv)
            target_cv = existing_cv
        else:
            new_cv = UserGeneratedCV(
                user_id=req.user_id,
                title=req.title,
                language=req.language,
                template_id=req.template_id,
                target_job_title=req.target_job_title,
                avatar_url=req.avatar_url,
                raw_input=req.raw_input,
                llm_output=req.llm_output,
                final_data=req.final_data,
            )
            db.add(new_cv)
            db.commit()
            db.refresh(new_cv)
            target_cv = new_cv

        # Tự động đồng bộ sang bảng CandidateCV
        if target_cv and target_cv.user_id:
            sync_user_generated_cv_to_candidate_cv(target_cv, db)

        msg = "Cập nhật CV thành công" if existing_cv else "Lưu CV mới thành công"
        return {"success": True, "message": msg, "cv_id": target_cv.id, "cv": target_cv}
    except Exception as e:
        db.rollback()
        print(f"[API] Lỗi khi lưu CV: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu CV: {str(e)}")


@app.get("/api/cv-builder/my-cvs")
def get_user_generated_cvs(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các bản CV do người dùng tạo."""
    query = db.query(UserGeneratedCV)
    if user_id:
        query = query.filter(UserGeneratedCV.user_id == user_id)
    cvs = query.order_by(UserGeneratedCV.updated_at.desc()).all()
    return {"success": True, "cvs": cvs}


@app.get("/api/cv-builder/{cv_id}")
def get_user_generated_cv_detail(cv_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 bản CV theo ID."""
    cv = db.query(UserGeneratedCV).filter(UserGeneratedCV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="Không tìm thấy CV")
    return {"success": True, "cv": cv}


@app.delete("/api/cv-builder/{cv_id}")
def delete_user_generated_cv(cv_id: int, db: Session = Depends(get_db)):
    """Xóa 1 bản CV."""
    cv = db.query(UserGeneratedCV).filter(UserGeneratedCV.id == cv_id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="Không tìm thấy CV")
    db.delete(cv)
    db.commit()
    return {"success": True, "message": "Đã xóa CV thành công"}


@app.post("/api/cv-builder/{cv_id}/evaluate-match")
def evaluate_generated_cv_match(cv_id: int, req: CVEvaluateMatchRequest, db: Session = Depends(get_db)):
    """
    Bước 1: Chạy AI Engine đánh giá độ phù hợp giữa CV tạo bằng AI và JD được chọn.
    Trả về điểm số, phân tích kỹ năng, khoảng trống (gaps) để ứng viên xem xét TRƯỚC KHI nộp.
    """
    gen_cv = db.query(UserGeneratedCV).filter(UserGeneratedCV.id == cv_id).first()
    if not gen_cv:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản CV")

    jd = db.query(JobDescription).filter(JobDescription.id == req.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin tuyển dụng")

    final_data = gen_cv.final_data or gen_cv.llm_output or {}
    personal_info = final_data.get("personal_info", {})
    full_name = personal_info.get("full_name") or gen_cv.title or "Ứng viên"
    email = personal_info.get("email")
    phone = personal_info.get("phone")
    avatar_url = gen_cv.avatar_url or personal_info.get("avatar_url")
    skills = final_data.get("skills", [])
    summary = final_data.get("professional_summary", "")
    projects = final_data.get("polished_projects", [])
    
    project_descs = []
    exp_bullets = []
    for p in projects:
        bullets = p.get("bullet_points", []) if isinstance(p, dict) else []
        desc = f"{p.get('name', 'Dự án')}: " + " | ".join(bullets)
        project_descs.append(desc)
        exp_bullets.append(desc)

    cv_text = f"Họ tên: {full_name}\nEmail: {email}\nĐiện thoại: {phone}\nTóm tắt: {summary}\nKỹ năng: {', '.join(skills)}\nDự án kinh nghiệm:\n" + "\n".join(exp_bullets)

    # Đồng bộ / tạo CandidateCV
    cand_cv = None
    if gen_cv.user_id:
        cand_cv = db.query(CandidateCV).filter(CandidateCV.user_id == gen_cv.user_id).first()

    if not cand_cv:
        cand_cv = CandidateCV(
            user_id=gen_cv.user_id,
            full_name=full_name,
            email=email,
            phone=phone,
            cv_text=cv_text,
            parsed_skills=skills,
            project_descriptions=project_descs,
            avatar_url=avatar_url,
            experience_years=1.5
        )
        db.add(cand_cv)
        db.commit()
        db.refresh(cand_cv)
    else:
        cand_cv.full_name = full_name
        cand_cv.email = email or cand_cv.email
        cand_cv.phone = phone or cand_cv.phone
        cand_cv.cv_text = cv_text
        cand_cv.parsed_skills = skills
        cand_cv.project_descriptions = project_descs
        cand_cv.avatar_url = avatar_url or cand_cv.avatar_url
        db.commit()
        db.refresh(cand_cv)

    # Chạy AI Engine thật
    cv_data = {
        "cv_text": cv_text,
        "project_descriptions": project_descs,
    }
    jd_data = {
        "jd_text": jd.jd_text,
        "required_experience": jd.required_experience or 0.0,
        "required_skills": jd.required_skills or [],
        "project_keywords": jd.project_keywords or [],
        "custom_criteria": jd.custom_criteria or [],
    }

    ai = app.state.ai_engine
    result = ai.match_cv_to_jd(cv_data, jd_data)

    # Tính Gap Analysis
    jd_data_for_gap = {
        "jd_text": jd.jd_text,
        "required_experience": jd.required_experience or 0.0,
        "required_skills": jd.required_skills or [],
        "project_keywords": jd.project_keywords or [],
    }
    cv_data_for_gap = {
        "parsed_skills": skills,
        "cv_text": cv_text,
    }
    raw_gaps = ai.analyze_gaps(jd_data_for_gap, cv_data_for_gap, result["feature_details"], result.get("custom_criteria_results", []))

    return {
        "success": True,
        "cv_id": cv_id,
        "cand_cv_id": cand_cv.id,
        "jd_id": jd.id,
        "job_title": jd.title,
        "job_department": jd.department,
        "job_location": jd.location,
        "job_required_experience": jd.required_experience or 0.0,
        "job_required_skills": jd.required_skills or [],
        "candidate_name": full_name,
        "candidate_skills": skills,
        "match_score": result["match_score"],
        "match_level": result["match_level"],
        "feature_details": result["feature_details"],
        "gaps": raw_gaps,
        "custom_criteria_results": result.get("custom_criteria_results", []),
        "skill_details": result.get("skill_details", []),
    }


@app.post("/api/cv-builder/{cv_id}/confirm-apply")
def confirm_apply_generated_cv(cv_id: int, req: CVConfirmApplyRequest, db: Session = Depends(get_db)):
    """
    Bước 2: Xác nhận nộp CV chính thức sau khi ứng viên đã xem xét kết quả đánh giá của AI.
    Lưu kết quả phân tích AI và trạng thái 'applied' vào MatchResult.
    """
    gen_cv = db.query(UserGeneratedCV).filter(UserGeneratedCV.id == cv_id).first()
    if not gen_cv:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản CV")

    jd = db.query(JobDescription).filter(JobDescription.id == req.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin tuyển dụng")

    existing_match = db.query(MatchResult).filter(
        MatchResult.cv_id == req.cand_cv_id,
        MatchResult.jd_id == req.jd_id
    ).first()

    now = datetime.utcnow()
    if existing_match:
        existing_match.match_score = req.match_score
        existing_match.match_level = req.match_level
        existing_match.feature_details = req.feature_details or {}
        existing_match.custom_criteria_results = req.custom_criteria_results or []
        existing_match.skill_details = req.skill_details or []
        existing_match.status = "applied"
        existing_match.applied_at = now
        db.commit()
    else:
        new_match = MatchResult(
            cv_id=req.cand_cv_id,
            jd_id=req.jd_id,
            match_score=req.match_score,
            match_level=req.match_level,
            feature_details=req.feature_details or {},
            custom_criteria_results=req.custom_criteria_results or [],
            skill_details=req.skill_details or [],
            status="applied",
            applied_at=now
        )
        db.add(new_match)
        db.commit()

    return {
        "success": True,
        "message": f"Đã nộp CV thành công vào vị trí {jd.title}!",
        "match_score": req.match_score,
        "match_level": req.match_level,
    }


@app.post("/api/cv-builder/{cv_id}/apply-to-job")
def apply_generated_cv_to_job(cv_id: int, jd_id: int, db: Session = Depends(get_db)):
    """Fallback tự động đánh giá và nộp nhanh nếu gọi trực tiếp."""
    eval_res = evaluate_generated_cv_match(cv_id, CVEvaluateMatchRequest(jd_id=jd_id), db)
    confirm_req = CVConfirmApplyRequest(
        jd_id=jd_id,
        cand_cv_id=eval_res["cand_cv_id"],
        match_score=eval_res["match_score"],
        match_level=eval_res["match_level"],
        feature_details=eval_res["feature_details"],
        custom_criteria_results=eval_res["custom_criteria_results"],
        skill_details=eval_res["skill_details"]
    )
    return confirm_apply_generated_cv(cv_id, confirm_req, db)


# ==============================================================================
# REPORTS API (Báo cáo tuyển dụng)
# ==============================================================================
@app.get("/api/reports/overview")
def get_reports_overview(db: Session = Depends(get_db)):
    """
    Tổng hợp dữ liệu báo cáo tuyển dụng:
    - Tổng quan pipeline (applied → hired)
    - Thống kê theo JD
    - Phân bố điểm matching
    - Top ứng viên
    - Xu hướng theo thời gian
    """
    from collections import defaultdict

    # --- 1. Tổng quan số lượng ---
    total_jobs = db.query(func.count(JobDescription.id)).scalar() or 0
    active_jobs = db.query(func.count(JobDescription.id)).filter(JobDescription.is_active == True).scalar() or 0
    total_candidates = db.query(func.count(CandidateCV.id)).scalar() or 0
    total_applications = db.query(func.count(MatchResult.id)).filter(MatchResult.applied_at.isnot(None)).scalar() or 0
    total_companies = db.query(func.count(Company.id)).scalar() or 0

    # --- 2. Pipeline thống kê (trạng thái ứng viên) ---
    pipeline_query = (
        db.query(MatchResult.status, func.count(MatchResult.id))
        .filter(MatchResult.applied_at.isnot(None))
        .group_by(MatchResult.status)
        .all()
    )
    pipeline_stats = {
        "applied": 0,
        "screening": 0,
        "interview": 0,
        "offer": 0,
        "hired": 0
    }
    for status, count in pipeline_query:
        if status and status in pipeline_stats:
            pipeline_stats[status] = count

    # --- 3. Phân bố điểm matching ---
    score_ranges = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
    }
    all_scores = (
        db.query(MatchResult.match_score)
        .filter(MatchResult.applied_at.isnot(None))
        .all()
    )
    for (score,) in all_scores:
        if score is not None:
            if score <= 20:
                score_ranges["0-20"] += 1
            elif score <= 40:
                score_ranges["21-40"] += 1
            elif score <= 60:
                score_ranges["41-60"] += 1
            elif score <= 80:
                score_ranges["61-80"] += 1
            else:
                score_ranges["81-100"] += 1

    avg_score = db.query(func.avg(MatchResult.match_score)).filter(MatchResult.applied_at.isnot(None)).scalar()
    avg_score = round(float(avg_score), 1) if avg_score else 0.0

    # --- 4. Phân bố match_level ---
    level_query = (
        db.query(MatchResult.match_level, func.count(MatchResult.id))
        .filter(MatchResult.applied_at.isnot(None))
        .group_by(MatchResult.match_level)
        .all()
    )
    match_level_dist = {}
    for level, count in level_query:
        if level:
            match_level_dist[level] = count

    # --- 5. Thống kê theo từng JD ---
    jd_stats = []
    jd_query = (
        db.query(
            JobDescription.id,
            JobDescription.title,
            JobDescription.department,
            JobDescription.location,
            func.count(MatchResult.id).label("applicant_count"),
            func.avg(MatchResult.match_score).label("avg_score"),
            func.max(MatchResult.match_score).label("max_score"),
            func.min(MatchResult.match_score).label("min_score"),
        )
        .outerjoin(
            MatchResult,
            (MatchResult.jd_id == JobDescription.id) & (MatchResult.applied_at.isnot(None))
        )
        .group_by(JobDescription.id, JobDescription.title, JobDescription.department, JobDescription.location)
        .order_by(func.count(MatchResult.id).desc())
        .all()
    )
    for jd_id, title, dept, loc, app_count, avg_s, max_s, min_s in jd_query:
        # Pipeline breakdown per JD
        jd_pipeline = (
            db.query(MatchResult.status, func.count(MatchResult.id))
            .filter(MatchResult.jd_id == jd_id, MatchResult.applied_at.isnot(None))
            .group_by(MatchResult.status)
            .all()
        )
        jd_pipe = {"applied": 0, "screening": 0, "interview": 0, "offer": 0, "hired": 0}
        for s, c in jd_pipeline:
            if s and s in jd_pipe:
                jd_pipe[s] = c

        jd_stats.append({
            "jd_id": jd_id,
            "title": title,
            "department": dept,
            "location": loc,
            "applicant_count": app_count or 0,
            "avg_score": round(float(avg_s), 1) if avg_s else 0.0,
            "max_score": round(float(max_s), 1) if max_s else 0.0,
            "min_score": round(float(min_s), 1) if min_s else 0.0,
            "pipeline": jd_pipe,
        })

    # --- 6. Top ứng viên (theo điểm trung bình) ---
    top_candidates_agg = (
        db.query(
            MatchResult.cv_id,
            func.count(MatchResult.id).label("total_applications"),
            func.avg(MatchResult.match_score).label("avg_score"),
            func.max(MatchResult.match_score).label("best_score"),
        )
        .filter(MatchResult.applied_at.isnot(None), MatchResult.cv_id.isnot(None))
        .group_by(MatchResult.cv_id)
        .order_by(func.avg(MatchResult.match_score).desc())
        .limit(10)
        .all()
    )
    top_candidates = []
    if top_candidates_agg:
        cv_ids = [row[0] for row in top_candidates_agg if row[0] is not None]
        candidates_map = {}
        if cv_ids:
            candidates_list = db.query(CandidateCV).filter(CandidateCV.id.in_(cv_ids)).all()
            candidates_map = {c.id: c for c in candidates_list}

        for cid, total_apps, avg_s, best_s in top_candidates_agg:
            cand = candidates_map.get(cid)
            if cand:
                raw_skills = cand.parsed_skills
                skills_list = []
                if isinstance(raw_skills, list):
                    skills_list = [str(s) for s in raw_skills]
                elif isinstance(raw_skills, str):
                    try:
                        import json as _json
                        parsed = _json.loads(raw_skills)
                        if isinstance(parsed, list):
                            skills_list = [str(s) for s in parsed]
                        else:
                            skills_list = raw_skills.replace(",", " ").split()
                    except Exception:
                        skills_list = raw_skills.replace(",", " ").split()

                top_candidates.append({
                    "cv_id": cid,
                    "full_name": cand.full_name or "Ứng viên ẩn danh",
                    "email": cand.email or "",
                    "experience_years": cand.experience_years or 0.0,
                    "skills": skills_list[:6],
                    "avatar_url": cand.avatar_url,
                    "total_applications": total_apps,
                    "avg_score": round(float(avg_s), 1) if avg_s else 0.0,
                    "best_score": round(float(best_s), 1) if best_s else 0.0,
                })

    # --- 7. Kỹ năng phổ biến nhất trong JD ---
    popular_skills = defaultdict(int)
    all_jds = db.query(JobDescription.required_skills).filter(JobDescription.is_active == True).all()
    for (skills,) in all_jds:
        if skills and isinstance(skills, list):
            for skill_item in skills:
                if isinstance(skill_item, dict):
                    skill_name = skill_item.get("name") or skill_item.get("skill", "")
                elif isinstance(skill_item, str):
                    skill_name = skill_item
                else:
                    continue
                if skill_name:
                    popular_skills[skill_name.strip()] += 1
    top_skills = sorted(popular_skills.items(), key=lambda x: x[1], reverse=True)[:15]

    # --- 8. Xu hướng ứng tuyển theo ngày (30 ngày gần nhất) ---
    from datetime import timedelta
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    
    thirty_days_apps = (
        db.query(MatchResult.applied_at)
        .filter(MatchResult.applied_at.isnot(None), MatchResult.applied_at >= thirty_days_ago)
        .all()
    )
    daily_counts = defaultdict(int)
    for (app_date,) in thirty_days_apps:
        if app_date:
            d_str = app_date.strftime("%Y-%m-%d") if hasattr(app_date, 'strftime') else str(app_date)[:10]
            daily_counts[d_str] += 1

    application_trend = [
        {"date": d, "count": c}
        for d, c in sorted(daily_counts.items())
    ]

    # --- 9. Tỷ lệ chuyển đổi ---
    conversion_rate = 0.0
    if total_applications > 0:
        hired_count = pipeline_stats.get("hired", 0)
        conversion_rate = round((hired_count / total_applications) * 100, 1)

    interview_rate = 0.0
    if total_applications > 0:
        interview_count = pipeline_stats.get("interview", 0) + pipeline_stats.get("offer", 0) + pipeline_stats.get("hired", 0)
        interview_rate = round((interview_count / total_applications) * 100, 1)

    return {
        "summary": {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_candidates": total_candidates,
            "total_applications": total_applications,
            "total_companies": total_companies,
            "avg_match_score": avg_score,
            "conversion_rate": conversion_rate,
            "interview_rate": interview_rate,
        },
        "pipeline_stats": pipeline_stats,
        "score_distribution": score_ranges,
        "match_level_distribution": match_level_dist,
        "jd_stats": jd_stats,
        "top_candidates": top_candidates,
        "top_skills": [{"skill": s, "count": c} for s, c in top_skills],
        "application_trend": application_trend,
    }


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run("api:app", host=host, port=port, reload=True)
