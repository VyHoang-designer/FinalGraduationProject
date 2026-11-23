# ==============================================================================
# FILE: backend/unified_scoring.py
# MÔ TẢ: Unified Scoring Engine - Tính điểm trọng số đa tiêu chí (Skills, Exp, Projects, Edu)
# ==============================================================================
from typing import Dict, Any, List

IMPORTANCE_WEIGHTS = {
    "core": 3.0,        # Cốt lõi (X3)
    "supporting": 2.0,  # Bổ trợ (X2)
    "preferred": 1.0,   # Điểm cộng (X1)
}

LEVEL_TO_M = {
    0: 0.0,
    1: 0.25,
    2: 0.50,
    3: 0.75,
    4: 1.00
}

# Trọng số phân bổ giữa 4 trụ cột chính
PILLAR_WEIGHTS = {
    "skills": 0.40,       # Kỹ năng công nghệ & chuyên môn: 40%
    "experience": 0.30,   # Kinh nghiệm làm việc & seniority: 30%
    "projects": 0.20,     # Dự án thực tế & chuẩn STAR: 20%
    "education": 0.10     # Học vấn, bằng cấp & chứng chỉ: 10%
}


def calculate_pillar_score(assessments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Tính điểm cho một trụ cột đánh giá dựa trên trọng số W và mức độ m của từng tiêu chí.
    Công thức: Score = Sum(W_i * m_i) / Sum(W_i) * 100
    """
    if not assessments:
        return {
            "score": 0.0,
            "total_weight": 0.0,
            "details": []
        }

    total_weight = 0.0
    weighted_sum = 0.0
    details = []

    for item in assessments:
        name = item.get("name") or "Tiêu chí"
        importance = item.get("importance", "core")
        if importance not in IMPORTANCE_WEIGHTS:
            importance = "core"
        weight = IMPORTANCE_WEIGHTS[importance]

        level = item.get("level", 0)
        m = LEVEL_TO_M.get(level, float(level) / 4.0 if 0 <= level <= 4 else 0.0)

        total_weight += weight
        weighted_sum += weight * m

        details.append({
            "name": name,
            "skill": name, # Tương thích ngược với UI cũ
            "pillar": item.get("pillar", "skills"),
            "importance": importance,
            "weight": weight,
            "level": level,
            "m": m,
            "reason_code": item.get("reason_code", "not_found"),
            "reason": item.get("reason", ""),
            "evidence": item.get("evidence", [])
        })

    pillar_score = (weighted_sum / total_weight * 100.0) if total_weight > 0 else 0.0

    return {
        "score": round(pillar_score, 1),
        "total_weight": total_weight,
        "details": details
    }


def calculate_unified_composite_score(raw_evaluation: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tính toán toàn diện cả 4 trụ cột và điểm tổng hợp tổng thể.
    """
    skill_res = calculate_pillar_score(raw_evaluation.get("skill_assessments") or [])
    exp_res = calculate_pillar_score(raw_evaluation.get("experience_assessments") or [])
    proj_res = calculate_pillar_score(raw_evaluation.get("project_assessments") or [])
    edu_res = calculate_pillar_score(raw_evaluation.get("education_assessments") or [])

    # Tính điểm tổng hợp có trọng số giữa các trụ cột
    # Nếu một trụ cột nào đó hoàn toàn không có tiêu chí trong JD, tái phân bổ trọng số
    available_pillars = []
    if skill_res["details"]:
        available_pillars.append(("skills", skill_res["score"], PILLAR_WEIGHTS["skills"]))
    if exp_res["details"]:
        available_pillars.append(("experience", exp_res["score"], PILLAR_WEIGHTS["experience"]))
    if proj_res["details"]:
        available_pillars.append(("projects", proj_res["score"], PILLAR_WEIGHTS["projects"]))
    if edu_res["details"]:
        available_pillars.append(("education", edu_res["score"], PILLAR_WEIGHTS["education"]))

    if available_pillars:
        total_p_weight = sum(p[2] for p in available_pillars)
        composite_score = sum(p[1] * p[2] for p in available_pillars) / total_p_weight
    else:
        composite_score = 0.0

    # Phẳng hóa danh sách chi tiết để tương thích với UI hiển thị bảng
    all_criteria_details = {
        "skills": skill_res["details"],
        "experience": exp_res["details"],
        "projects": proj_res["details"],
        "education": edu_res["details"]
    }

    # Flat list gom tất cả tiêu chí
    flat_criteria = (
        skill_res["details"] +
        exp_res["details"] +
        proj_res["details"] +
        edu_res["details"]
    )

    return {
        "overall_score": round(composite_score, 1),
        "candidate_summary": raw_evaluation.get("candidate_summary") or "",
        "pillar_scores": {
            "skills": skill_res["score"],
            "experience": exp_res["score"],
            "projects": proj_res["score"],
            "education": edu_res["score"]
        },
        "all_criteria_details": all_criteria_details,
        # Giữ lại skill_details để tương thích 100% với các component cũ
        "skill_details": skill_res["details"],
        "flat_criteria": flat_criteria
    }
