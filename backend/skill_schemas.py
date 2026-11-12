from typing import Literal
from pydantic import BaseModel, Field

class Evidence(BaseModel):
    source_id: str
    quote: str = Field(min_length=1)

class SkillAssessment(BaseModel):
    skill: str
    level: int = Field(ge=0, le=4)
    reason_code: Literal[
        "not_found", "explicitly_not_met", "evidence_based", "needs_review"
    ]
    reason: str = Field(min_length=1)
    evidence: list[Evidence]

class AssessmentResponse(BaseModel):
    assessments: list[SkillAssessment]
