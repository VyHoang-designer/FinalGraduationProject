# ==============================================================================
# FILE: backend/schemas.py
# MÔ TẢ: Pydantic Schemas cho Request/Response validation
# ==============================================================================
"""
Các schema dùng cho FastAPI endpoint validation:
  - Request schemas: Nhận dữ liệu từ Frontend
  - Response schemas: Trả kết quả về Frontend
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr


# ==============================================================================
# USER / AUTH SCHEMAS
# ==============================================================================
class UserRegister(BaseModel):
    """Schema đăng ký tài khoản mới."""
    full_name: str
    email: str
    password: str
    role: Literal["ung_tuyen", "nha_tuyen_dung"]
    phone: Optional[str] = None


class UserLogin(BaseModel):
    """Schema đăng nhập."""
    email: str
    password: str
    role: Literal["ung_tuyen", "nha_tuyen_dung"]


class UserResponse(BaseModel):
    """Response trả về sau đăng nhập/đăng ký."""
    id: int
    full_name: str
    email: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# JOB DESCRIPTION SCHEMAS
# ==============================================================================
class JobDescriptionBase(BaseModel):
    title: str
    jd_text: str
    required_skills: list[str] = []
    required_experience: float = 0.0
    project_keywords: list[str] = []
    is_active: bool = True
    department: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None
    started_time: Optional[datetime] = None
    expired_time: Optional[datetime] = None
    custom_criteria: list[dict] = []


class JobDescriptionCreate(JobDescriptionBase):
    pass


class JobDescriptionResponse(JobDescriptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# CANDIDATE CV SCHEMAS
# ==============================================================================
class CandidateCVBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cv_text: str
    parsed_skills: list[str] = []
    project_descriptions: list[str] = []
    education: Optional[str] = None
    experience_years: float = 0.0
    avatar_url: Optional[str] = None


class CandidateCVCreate(CandidateCVBase):
    pass


class CandidateCVResponse(CandidateCVBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# MATCH RESULT SCHEMAS
# ==============================================================================
class MatchResultResponse(BaseModel):
    id: int
    cv_id: int
    jd_id: int
    match_score: float
    match_level: str
    feature_details: dict
    created_at: datetime

    # Nested JD info for ranked display
    job_title: Optional[str] = None
    job_department: Optional[str] = None
    job_location: Optional[str] = None
    job_required_skills: list[str] = []
    gaps: list[GapItem] = []
    custom_criteria_results: list[dict] = []

    class Config:
        from_attributes = True


# ==============================================================================
# 1-TO-N MATCHING SCHEMAS
# ==============================================================================
class Match1ToNRequest(BaseModel):
    """Request body cho endpoint POST /api/match/1-to-n"""
    cv_id: int


class Match1ToNResponse(BaseModel):
    """Response cho kết quả matching 1 CV → N JDs"""
    cv_id: int
    candidate_name: str
    total_jobs_matched: int
    results: list[MatchResultResponse]
    processing_time_ms: float


# ==============================================================================
# N-TO-1 MATCHING SCHEMAS (1 JD → N CVs)
# ==============================================================================
class GapItem(BaseModel):
    """Một thiếu sót cụ thể của CV so với JD."""
    category: str        # skill, experience, certification, project, ...
    severity: str        # high, medium, low
    title: str           # Tiêu đề ngắn
    message: str         # Mô tả chi tiết
    missing_items: list[str] = []


class CandidateMatchResult(BaseModel):
    """Kết quả matching 1 CV cho modal N-to-1."""
    cv_id: int
    candidate_name: str
    email: Optional[str] = None
    experience_years: float = 0.0
    parsed_skills: list[str] = []
    education: Optional[str] = None
    match_score: float
    match_level: str
    feature_details: dict
    rank: int                      # Thứ hạng (1 = best)
    gaps: list[GapItem] = []       # Thiếu sót (chỉ từ rank 2+)
    custom_criteria_results: list[dict] = []
    is_best_match: bool = False    # True nếu rank == 1


class MatchNTo1Request(BaseModel):
    """Request body cho endpoint POST /api/match/n-to-1"""
    jd_id: int


class MatchNTo1Response(BaseModel):
    """Response cho kết quả matching 1 JD → N CVs."""
    jd_id: int
    job_title: str
    total_candidates: int
    results: list[CandidateMatchResult]
    processing_time_ms: float

