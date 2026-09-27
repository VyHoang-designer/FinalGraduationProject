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

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from database import engine, get_db, Base
from models import User, JobDescription, CandidateCV, MatchResult
from schemas import (
    UserRegister, UserLogin, UserResponse,
    JobDescriptionCreate, JobDescriptionResponse,
    CandidateCVCreate, CandidateCVResponse,
    Match1ToNRequest, Match1ToNResponse, MatchResultResponse,
    MatchNTo1Request, MatchNTo1Response, CandidateMatchResult, GapItem,
)


# ==============================================================================
# LIFESPAN: Khởi tạo DB tables + AI Engine khi server start
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Tạo tables và khởi tạo AI Engine khi startup."""
    # Tạo tất cả tables nếu chưa tồn tại
    Base.metadata.create_all(bind=engine)
    print("[API] ✓ Database tables đã sẵn sàng.")

    # Import AI Engine (trigger singleton init)
    from ai_engine import ai_engine
    app.state.ai_engine = ai_engine

    yield  # Server running

    print("[API] Server đang shutdown...")


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
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# HEALTH CHECK
# ==============================================================================
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI CV-JD Matching API is running"}


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


@app.get("/api/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả người dùng (admin use)."""
    return db.query(User).order_by(User.created_at.desc()).all()


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


@app.post("/api/candidates", response_model=CandidateCVResponse, status_code=201)
def create_candidate(data: CandidateCVCreate, db: Session = Depends(get_db)):
    """Thêm ứng viên mới vào database."""
    candidate = CandidateCV(**data.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate

@app.get("/api/candidates/my-cvs/{user_id}", response_model=list[CandidateCVResponse])
def get_my_cvs(user_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách CV của một user cụ thể."""
    return db.query(CandidateCV).filter(CandidateCV.user_id == user_id).order_by(CandidateCV.created_at.desc()).all()

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

        # Lấy email từ user nếu CV không có
        user = db.query(User).filter(User.id == user_id).first()
        cv_email = parsed["email"] or (user.email if user else None)

        candidate = CandidateCV(
            full_name=parsed["full_name"],
            email=cv_email,
            phone=parsed["phone"],
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
    """Lấy danh sách JDs (mặc định chỉ lấy JDs đang active)."""
    query = db.query(JobDescription)
    if active_only:
        query = query.filter(JobDescription.is_active == True)
    return query.order_by(JobDescription.created_at.desc()).all()


@app.post("/api/jobs", response_model=JobDescriptionResponse, status_code=201)
def create_job(data: JobDescriptionCreate, db: Session = Depends(get_db)):
    """Thêm JD mới vào database."""
    job = JobDescription(**data.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


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
        custom_criteria_results=result.get("custom_criteria_results", [])
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
            job_title=jd_obj.title,
            job_department=jd_obj.department,
            job_location=jd_obj.location,
            job_required_skills=jd_obj.required_skills or [],
            gaps=gaps,
            custom_criteria_results=result.get("custom_criteria_results", []),
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
    Core Business Logic: Chạy AI matching 1 JD → ALL CVs.

    Flow:
      1. Fetch JD data từ DB
      2. Fetch ALL candidates từ DB
      3. Với mỗi CV: chạy DynamicFeaturePipeline + RF prediction
      4. Rank kết quả cao → thấp
      5. Từ rank 2+: phân tích gap (thiếu sót so với JD)
      6. Trả về ranked list + gap analysis
    """
    start_time = time.time()

    # ---- Step 1: Fetch JD ----
    jd = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy JD với ID={request.jd_id}")

    # ---- Step 2: Fetch ALL Candidates ----
    all_cvs = db.query(CandidateCV).all()
    if not all_cvs:
        raise HTTPException(status_code=404, detail="Chưa có ứng viên nào trong hệ thống.")

    # ---- Step 3: Build data dicts ----
    jd_data = {
        "jd_text": jd.jd_text,
        "required_experience": jd.required_experience or 0.0,
        "required_skills": jd.required_skills or [],
        "project_keywords": jd.project_keywords or [],
        "custom_criteria": jd.custom_criteria or [],
    }

    cv_list = []
    cv_lookup = {}  # id -> CandidateCV ORM object
    for cv in all_cvs:
        cv_lookup[cv.id] = cv
        cv_list.append({
            "cv_id": cv.id,
            "cv_data": {
                "cv_text": cv.cv_text,
                "project_descriptions": cv.project_descriptions or [],
            },
        })

    # ---- Step 4: Run AI Engine ----
    ai = app.state.ai_engine
    results, ai_time_ms = ai.match_jd_to_all_cvs(jd_data, cv_list)

    # ---- Step 5: Xóa kết quả cũ và Build response with gap analysis ----
    db.query(MatchResult).filter(MatchResult.jd_id == request.jd_id).delete()
    
    response_results = []
    for rank_idx, result in enumerate(results):
        cv_id = result["cv_id"]
        cv_obj = cv_lookup[cv_id]
        rank = rank_idx + 1
        is_best = rank == 1

        # Gap analysis cho rank 2+ (best match không cần gap)
        gaps = []
        if not is_best:
            cv_data_for_gap = {
                "parsed_skills": cv_obj.parsed_skills or [],
                "cv_text": cv_obj.cv_text,
            }
            raw_gaps = ai.analyze_gaps(jd_data, cv_data_for_gap, result["feature_details"], result.get("custom_criteria_results", []))
            gaps = [GapItem(**g) for g in raw_gaps]

        # Lưu match result vào DB
        db_match = MatchResult(
            cv_id=cv_id,
            jd_id=request.jd_id,
            match_score=result["match_score"],
            match_level=result["match_level"],
            feature_details=result["feature_details"],
            custom_criteria_results=result.get("custom_criteria_results", []),
        )
        db.add(db_match)
        db.flush()

        response_results.append(CandidateMatchResult(
            cv_id=cv_id,
            candidate_name=cv_obj.full_name,
            email=cv_obj.email,
            experience_years=cv_obj.experience_years or 0.0,
            parsed_skills=cv_obj.parsed_skills or [],
            education=cv_obj.education,
            match_score=result["match_score"],
            match_level=result["match_level"],
            feature_details=result["feature_details"],
            rank=rank,
            gaps=gaps,
            custom_criteria_results=result.get("custom_criteria_results", []),
            is_best_match=is_best,
        ))

    db.commit()

    total_time_ms = (time.time() - start_time) * 1000

    return MatchNTo1Response(
        jd_id=request.jd_id,
        job_title=jd.title,
        total_candidates=len(results),
        results=response_results,
        processing_time_ms=round(total_time_ms, 2),
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
            job_title=jd.title if jd else "N/A",
            job_department=jd.department if jd else None,
            job_location=jd.location if jd else None,
            job_required_skills=jd.required_skills if jd else [],
            gaps=gaps,
            custom_criteria_results=r.custom_criteria_results or [],
        ))

    return response


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run("api:app", host=host, port=port, reload=True)
