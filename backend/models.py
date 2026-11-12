# ==============================================================================
# FILE: backend/models.py
# MÔ TẢ: SQLAlchemy ORM Models - 4 bảng chính của hệ thống
# ==============================================================================
"""
Định nghĩa 4 bảng PostgreSQL:
  - users:              Tài khoản người dùng (ứng tuyển / nhà tuyển dụng)
  - job_descriptions:   Lưu N vị trí tuyển dụng đang hoạt động
  - candidates_cv:      Lưu thông tin CV ứng viên đã parse
  - match_results:      Lưu kết quả AI đánh giá
"""

import hashlib
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database import Base


# ==============================================================================
# USER MODEL (Quản lý người dùng & vai trò)
# ==============================================================================
class User(Base):
    """Bảng users: lưu tài khoản đăng nhập với 2 vai trò."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=False, comment="Họ tên người dùng")
    email = Column(String(255), unique=True, nullable=False, index=True, comment="Email đăng nhập")
    password_hash = Column(String(255), nullable=False, comment="Mật khẩu đã hash (SHA-256)")
    role = Column(String(50), nullable=False, comment="Vai trò: ung_tuyen | nha_tuyen_dung")
    phone = Column(String(50), nullable=True, comment="Số điện thoại")
    avatar_url = Column(Text, nullable=True, comment="URL ảnh đại diện Google hoặc tải lên")
    firebase_uid = Column(String(255), nullable=True, index=True, comment="Firebase UID nếu đăng nhập Google")
    is_active = Column(Boolean, default=True, comment="Tài khoản còn hoạt động?")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    candidate_cvs = relationship("CandidateCV", back_populates="user")
    generated_cvs = relationship("UserGeneratedCV", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

    @staticmethod
    def hash_password(plain_password: str) -> str:
        """Hash mật khẩu bằng SHA-256."""
        return hashlib.sha256(plain_password.encode('utf-8')).hexdigest()

    def verify_password(self, plain_password: str) -> bool:
        """Kiểm tra mật khẩu."""
        return self.password_hash == self.hash_password(plain_password)


class Company(Base):
    """Bảng lưu trữ thông tin Doanh nghiệp / Công ty tuyển dụng."""
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False, index=True, comment="Tên công ty")
    logo = Column(String(1000), nullable=True, comment="URL logo công ty")
    cover_image = Column(String(1000), nullable=True, comment="URL ảnh bìa công ty")
    tagline = Column(String(255), nullable=True, comment="Slogan công ty")
    industry = Column(String(100), nullable=True, comment="Ngành nghề / Lĩnh vực")
    location = Column(String(255), nullable=True, comment="Địa điểm trụ sở chính")
    company_size = Column(String(50), nullable=True, comment="Quy mô nhân sự")
    website = Column(String(255), nullable=True, comment="Website công ty")
    description = Column(Text, nullable=True, comment="Mô tả công ty & văn hóa")
    benefits = Column(JSON, default=list, nullable=True, comment="Danh sách phúc lợi")
    rating = Column(Float, default=4.8, comment="Đánh giá công ty")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Company(id={self.id}, name='{self.name}')>"


class JobDescription(Base):
    """Bảng lưu trữ các JD (Job Descriptions) đang tuyển."""
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False, comment="Tên vị trí tuyển dụng")
    jd_text = Column(Text, nullable=False, comment="Nội dung mô tả công việc đầy đủ")
    required_skills = Column(JSON, default=list, comment="Danh sách kỹ năng yêu cầu ['python','fastapi']")
    required_experience = Column(Float, default=0.0, comment="Số năm kinh nghiệm yêu cầu")
    project_keywords = Column(JSON, default=list, comment="Từ khóa dự án liên quan ['backend api','deployment']")
    is_active = Column(Boolean, default=True, comment="JD còn đang tuyển hay không")
    department = Column(String(100), nullable=True, comment="Phòng ban")
    location = Column(String(100), nullable=True, comment="Địa điểm làm việc")
    image = Column(String(1000), nullable=True, comment="Hình ảnh đại diện cho JD")
    started_time = Column(DateTime, nullable=True, comment="Thời gian bắt đầu tuyển")
    expired_time = Column(DateTime, nullable=True, comment="Thời gian hết hạn")
    custom_criteria = Column(JSON, default=list, comment="Tiêu chí đánh giá 4 cấp độ")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    match_results = relationship("MatchResult", back_populates="job_description", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<JobDescription(id={self.id}, title='{self.title}')>"


class CandidateCV(Base):
    """Bảng lưu trữ CV ứng viên đã parse."""
    __tablename__ = "candidates_cv"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=False, comment="Họ tên ứng viên")
    email = Column(String(255), nullable=True, comment="Email liên hệ")
    phone = Column(String(50), nullable=True, comment="Số điện thoại")
    cv_text = Column(Text, nullable=False, comment="Nội dung CV dạng plain text (đã parse từ PDF)")
    parsed_skills = Column(JSON, default=list, comment="Kỹ năng đã trích xuất ['python','sql']")
    project_descriptions = Column(JSON, default=list, comment="Mô tả các dự án đã làm")
    education = Column(Text, nullable=True, comment="Thông tin học vấn")
    experience_years = Column(Float, default=0.0, comment="Số năm kinh nghiệm (parsed)")
    avatar_url = Column(Text, nullable=True, comment="URL ảnh đại diện")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="Liên kết với tài khoản người dùng")

    # Relationships
    match_results = relationship("MatchResult", back_populates="candidate", cascade="all, delete-orphan")
    user = relationship("User", back_populates="candidate_cvs")

    def __repr__(self):
        return f"<CandidateCV(id={self.id}, name='{self.full_name}')>"


class MatchResult(Base):
    """Bảng lưu kết quả đánh giá AI: 1 CV → N JDs."""
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cv_id = Column(Integer, ForeignKey("candidates_cv.id", ondelete="CASCADE"), nullable=False)
    jd_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, nullable=False, comment="Điểm phù hợp AI (0-100)")
    match_level = Column(String(50), nullable=False, comment="Mức độ: Rất phù hợp / Phù hợp / Tương đối / Chưa phù hợp")
    feature_details = Column(JSON, default=dict, comment="Chi tiết từng tiêu chí {'Exp_Diff': 0.5, ...}")
    custom_criteria_results = Column(JSON, default=list, comment="Kết quả của Custom Criteria")
    skill_details = Column(JSON, default=list, nullable=True, comment="Chi tiết đánh giá kỹ năng từ LLM")
    status = Column(String(50), default="applied", nullable=True, comment="Trạng thái ứng tuyển: applied / screening / interview / offer / hired")
    applied_at = Column(DateTime, nullable=True, comment="Thời điểm ứng viên xác nhận nộp CV")
    interview_info = Column(JSON, nullable=True, comment="Thông tin lịch phỏng vấn, địa điểm, quy định và phản hồi từ ứng viên")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    candidate = relationship("CandidateCV", back_populates="match_results")
    job_description = relationship("JobDescription", back_populates="match_results")

    def __repr__(self):
        return f"<MatchResult(cv={self.cv_id}, jd={self.jd_id}, score={self.match_score}, status='{self.status}')>"


class UserGeneratedCV(Base):
    """Bảng lưu trữ CV do ứng viên tạo tự động bằng AI (LLM Gemini)."""
    __tablename__ = "user_generated_cvs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="Bản CV Mới", comment="Tên phiên bản CV")
    language = Column(String(10), default="vi", comment="Ngôn ngữ: vi | en")
    template_id = Column(String(50), default="modern", comment="Mẫu thiết kế: modern | classic")
    target_job_title = Column(String(255), nullable=True, comment="Vị trí ứng tuyển mục tiêu")

    # 3 tầng dữ liệu cốt lõi
    raw_input = Column(JSON, default=dict, comment="Dữ liệu thô ứng viên nhập vào wizard")
    llm_output = Column(JSON, default=dict, comment="Dữ liệu Gemini LLM biên tập gợi ý")
    final_data = Column(JSON, default=dict, comment="Dữ liệu cuối cùng sau khi ứng viên soát lỗi và chỉnh sửa")

    avatar_url = Column(Text, nullable=True, comment="URL ảnh đại diện hoặc base64")
    pdf_url = Column(Text, nullable=True, comment="Đường dẫn file PDF đã xuất (nếu có)")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="generated_cvs")

    def __repr__(self):
        return f"<UserGeneratedCV(id={self.id}, user_id={self.user_id}, title='{self.title}')>"


class JobInquiry(Base):
    """Bảng lưu trữ thông tin liên hệ / tin nhắn từ ứng viên gửi tới Nhà tuyển dụng của một JD."""
    __tablename__ = "job_inquiries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    jd_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_name = Column(String(255), nullable=False, comment="Họ tên người gửi")
    sender_email = Column(String(255), nullable=False, comment="Email người gửi")
    sender_phone = Column(String(50), nullable=True, comment="Số điện thoại người gửi")
    subject = Column(String(255), nullable=False, comment="Tiêu đề liên hệ")
    message = Column(Text, nullable=False, comment="Nội dung tin nhắn liên hệ")
    status = Column(String(50), default="unread", comment="Trạng thái: unread | read | replied")
    reply_message = Column(Text, nullable=True, comment="Phản hồi từ nhà tuyển dụng")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    job_description = relationship("JobDescription")

    def __repr__(self):
        return f"<JobInquiry(id={self.id}, sender='{self.sender_name}', jd_id={self.jd_id})>"

