# ==============================================================================
# FILE: backend/unified_schemas.py
# MÔ TẢ: Pydantic Schemas cho Đánh giá Đa tiêu chí Toàn diện (Skills, Exp, Projects, Edu)
# ==============================================================================
from typing import Literal, List, Optional
from pydantic import BaseModel, Field

class CriterionEvidence(BaseModel):
    source_id: str = Field(description="ID nguồn trích xuất (vd: cv, proj_0, exp_1)")
    quote: str = Field(min_length=1, description="Trích nguyên văn bằng chứng thực tế từ CV")

class CriterionAssessment(BaseModel):
    name: str = Field(description="Tên tiêu chí (vd: Python, Số năm kinh nghiệm Backend, Quy mô dự án...)")
    pillar: Literal["skills", "experience", "projects", "education"] = Field(
        description="Trụ cột đánh giá: skills | experience | projects | education"
    )
    importance: Literal["core", "supporting", "preferred"] = Field(
        default="core",
        description="Mức độ quan trọng: core (Cốt lõi X3) | supporting (Bổ trợ X2) | preferred (Điểm cộng X1)"
    )
    level: int = Field(
        ge=0, le=4,
        description="Mức độ đáp ứng từ 0 đến 4 (0: Không có, 1: Nhận/biết, 2: Cơ bản, 3: Tốt/đáp ứng, 4: Vượt trội/thực chiến)"
    )
    reason_code: Literal[
        "not_found", "explicitly_not_met", "partially_met", "evidence_based", "exceeds_expectations"
    ] = Field(description="Mã phân loại lý do")
    reason: str = Field(min_length=1, description="Giải thích chi tiết ngắn gọn vì sao đạt mức này")
    evidence: List[CriterionEvidence] = Field(
        default_factory=list,
        description="Danh sách bằng chứng trích dẫn thực tế từ CV"
    )

class UnifiedAssessmentResponse(BaseModel):
    candidate_summary: Optional[str] = Field(
        default="",
        description="Nhận xét tổng quan ngắn gọn 1-2 câu về mức độ đáp ứng của ứng viên đối với JD"
    )
    skill_assessments: List[CriterionAssessment] = Field(
        default_factory=list,
        description="Đánh giá chi tiết từng kỹ năng công nghệ yêu cầu"
    )
    experience_assessments: List[CriterionAssessment] = Field(
        default_factory=list,
        description="Đánh giá chi tiết về số năm kinh nghiệm, vị trí tương đương, lĩnh vực nghiệp vụ"
    )
    project_assessments: List[CriterionAssessment] = Field(
        default_factory=list,
        description="Đánh giá chi tiết về quy mô dự án thực tế, vai trò chuẩn STAR, sản phẩm thực tế"
    )
    education_assessments: List[CriterionAssessment] = Field(
        default_factory=list,
        description="Đánh giá chi tiết về chuyên ngành, văn bằng, chứng chỉ quốc tế/ngoại ngữ"
    )
