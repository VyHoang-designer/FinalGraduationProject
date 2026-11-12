# ==============================================================================
# FILE: backend/schemas.py
# MÔ TẢ: Pydantic Schemas cho Request/Response validation
# ==============================================================================
"""
Các schema dùng cho FastAPI endpoint validation:
  - Request schemas: Nhận dữ liệu từ Frontend
  - Response schemas: Trả kết quả về Frontend
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, Literal, Any, List, Dict
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
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GoogleLoginRequest(BaseModel):
    """Schema đăng nhập bằng Google qua Firebase."""
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: Optional[str] = "ung_tuyen"
    firebase_uid: Optional[str] = None


class UserUpdateRequest(BaseModel):
    """Schema cập nhật thông tin cá nhân."""
    full_name: Optional[str] = None
    phone: Optional[str] = None


# ==============================================================================
# JOB DESCRIPTION SCHEMAS
# ==============================================================================
class JobDescriptionBase(BaseModel):
    title: str
    jd_text: str
    required_skills: list[Any] = []
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
    pipeline_counts: dict = {"applied": 0, "screening": 0, "interview": 0, "offer": 0, "hired": 0}

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
class GapItem(BaseModel):
    """Một thiếu sót cụ thể của CV so với JD."""
    category: str        # skill, experience, certification, project, ...
    severity: str        # high, medium, low
    title: str           # Tiêu đề ngắn
    message: str         # Mô tả chi tiết
    missing_items: list[str] = []


class MatchResultResponse(BaseModel):
    id: int
    cv_id: int
    jd_id: int
    match_score: float
    match_level: str
    feature_details: dict
    created_at: datetime
    status: Optional[str] = "applied"
    applied_at: Optional[datetime] = None

    # Nested JD info for ranked display
    job_title: Optional[str] = None
    job_department: Optional[str] = None
    job_location: Optional[str] = None
    job_required_skills: list[Any] = []
    gaps: list[GapItem] = []
    custom_criteria_results: list[dict] = []
    skill_details: list[dict] = []

    class Config:
        from_attributes = True


class ApplyJobRequest(BaseModel):
    """Request body cho ứng viên xác nhận nộp CV (POST /api/jobs/apply)."""
    user_id: Optional[int] = None
    cv_id: int
    jd_id: int
    match_score: Optional[float] = None
    match_level: Optional[str] = None
    feature_details: Optional[dict] = None
    custom_criteria_results: Optional[list[dict]] = None
    skill_details: Optional[list[dict]] = None


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
class CandidateMatchResult(BaseModel):
    """Kết quả matching 1 CV cho modal N-to-1."""
    cv_id: int
    candidate_name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    experience_years: float = 0.0
    parsed_skills: list[str] = []
    education: Optional[str] = None
    match_score: float
    match_level: str
    feature_details: dict
    rank: int                      # Thứ hạng (1 = best)
    gaps: list[GapItem] = []       # Thiếu sót (chỉ từ rank 2+)
    custom_criteria_results: list[dict] = []
    skill_details: list[dict] = []
    is_best_match: bool = False    # True if rank == 1


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


class UpdateCandidateStatusRequest(BaseModel):
    status: str


class AssignJobRequest(BaseModel):
    status: Optional[str] = "hired"
    note: Optional[str] = None
    start_date: Optional[str] = None
    salary_offer: Optional[str] = None


class ScheduleInterviewRequest(BaseModel):
    scheduled_at: str
    interview_type: Optional[str] = "Trực tiếp"
    location: str
    interviewer: Optional[str] = None
    regulations: Optional[str] = None
    note: Optional[str] = None


class CandidateInterviewResponse(BaseModel):
    response: str  # "confirmed" | "declined"
    note: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    tagline: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    benefits: list[Any] = []
    rating: float = 4.8
    active_jobs_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyDetailResponse(CompanyResponse):
    active_jobs: list[JobDescriptionResponse] = []


class CompanyCreateRequest(BaseModel):
    name: str
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    tagline: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    benefits: list[str] = []
    rating: Optional[float] = 4.8


class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    tagline: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    company_size: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[list[str]] = None
    rating: Optional[float] = None


# ==============================================================================
# CV BUILDER SCHEMAS (Tạo CV tự động cùng AI)
# ==============================================================================
class CVPersonalInfo(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    show_avatar: bool = True
    links: list[str] = []


class CVEducationItem(BaseModel):
    school: str
    major: str
    graduation_year: Optional[str] = None
    gpa: Optional[str] = None


class CVProjectItem(BaseModel):
    id: Optional[str] = None
    name: str
    technologies: list[str] = []
    my_role: Optional[str] = None
    tasks: Optional[str] = None
    result: Optional[str] = None


class CVExperienceItem(BaseModel):
    id: Optional[str] = None
    company: str
    position: str
    duration: Optional[str] = None
    responsibilities: Optional[str] = None
    achievements: Optional[str] = None


class CVGenerateRequest(BaseModel):
    target_job_title: Optional[str] = "Lập trình viên"
    language: Optional[str] = "vi"
    template_id: Optional[str] = "modern"
    personal_info: CVPersonalInfo
    raw_summary: Optional[str] = None
    education: list[CVEducationItem] = []
    skills: list[str] = []
    projects: list[CVProjectItem] = []
    experiences: list[CVExperienceItem] = []


class CVPolishedProject(BaseModel):
    ref_id: Optional[str] = None
    name: str
    role: Optional[str] = None
    technologies: list[str] = []
    bullet_points: list[str] = []


class CVPolishedExperience(BaseModel):
    ref_id: Optional[str] = None
    company: str
    position: str
    duration: Optional[str] = None
    bullet_points: list[str] = []


class CVGenerateResponse(BaseModel):
    professional_summary: str
    headline: Optional[str] = None
    skills_categorized: dict[str, list[str]] = {}
    polished_projects: list[CVPolishedProject] = []
    polished_experiences: list[CVPolishedExperience] = []


class CVSaveRequest(BaseModel):
    user_id: Optional[int] = None
    title: str = "Bản CV Mới"
    language: str = "vi"
    template_id: str = "modern"
    target_job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    raw_input: dict
    llm_output: dict
    final_data: dict


class UserGeneratedCVResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    language: str
    template_id: str
    target_job_title: Optional[str] = None
    avatar_url: Optional[str] = None
    raw_input: dict
    llm_output: dict
    final_data: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CVEvaluateMatchRequest(BaseModel):
    jd_id: int


class CVConfirmApplyRequest(BaseModel):
    jd_id: int
    cand_cv_id: int
    match_score: float
    match_level: str
    feature_details: Optional[dict] = None
    custom_criteria_results: Optional[list] = None
    skill_details: Optional[list] = None


class JobInquiryCreate(BaseModel):
    user_id: Optional[int] = None
    jd_id: int
    sender_name: str
    sender_email: str
    sender_phone: Optional[str] = None
    subject: str
    message: str


class JobInquiryReply(BaseModel):
    reply_message: str


class AIAssistantChatRequest(BaseModel):
    message: str
    history: Optional[list[dict[str, Any]]] = None
    user_context: Optional[dict[str, Any]] = None

AIAssistantChatRequest.model_rebuild()


class AIAssistantChatResponse(BaseModel):
    reply: str

AIAssistantChatResponse.model_rebuild()


class JobInquiryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    jd_id: int
    job_title: Optional[str] = None
    department: Optional[str] = None
    sender_name: str
    sender_email: str
    sender_phone: Optional[str] = None
    subject: str
    message: str
    status: str
    reply_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


AssignJobRequest.model_rebuild()



