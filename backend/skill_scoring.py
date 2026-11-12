IMPORTANCE_WEIGHTS = {
    "core": 3.0,
    "supporting": 2.0,
    "preferred": 1.0,
}
VALID_LEVELS = {0.0, 0.25, 0.50, 0.75, 1.0}
VALID_REASONS = {"not_found", "explicitly_not_met", "evidence_based"}

def calculate_skill_score(requirements, assessments):
    """Tính điểm sau khi bước đánh giá hoàn tất cho mọi kỹ năng JD."""
    if not requirements:
        return {
            "status": "not_applicable",
            "skill_fit_score": None,
            "skill_details": [],
        }

    total_weight = 0.0
    weighted_score = 0.0
    details = []
    seen = set()

    for requirement in requirements:
        skill = requirement.get("skill")
        if not isinstance(skill, str) or not skill.strip():
            # Support simple string requirements gracefully if needed, but README says:
            raise ValueError("Tên kỹ năng phải là chuỗi không rỗng")
        
        # Bỏ qua logic trùng lặp nếu nó xảy ra do dữ liệu bẩn
        if skill in seen:
            continue
        seen.add(skill)

        # Hỗ trợ requirements dạng list of strings hoặc list of dicts
        importance = requirement.get("importance", "core")
        if importance not in IMPORTANCE_WEIGHTS:
            importance = "core"
            
        weight = IMPORTANCE_WEIGHTS[importance]

        if skill not in assessments:
            raise ValueError(f"Chưa hoàn tất đánh giá kỹ năng: {skill}")
            
        assessment = assessments[skill]
        level = assessment.get("m")
        code = assessment.get("reason_code")
        reason = assessment.get("reason")

        if (
            isinstance(level, bool)
            or not isinstance(level, (int, float))
            or level not in VALID_LEVELS
        ):
            raise ValueError(f"Mức m không hợp lệ cho {skill}: {level}")
        if code not in VALID_REASONS:
            raise ValueError(f"Mã lý do không hợp lệ cho {skill}: {code}")
        if (level == 0) != (code in {"not_found", "explicitly_not_met"}):
            raise ValueError(f"Mức m và mã lý do không nhất quán: {skill}")
        if not isinstance(reason, str) or not reason.strip():
            raise ValueError(f"Thiếu giải thích cho kỹ năng: {skill}")

        total_weight += weight
        weighted_score += weight * level
        details.append({
            "skill": skill,
            "weight": weight,
            "m": level,
            "reason_code": code,
            "reason": reason,
            "evidence": assessment.get("evidence", []),
        })

    return {
        "status": "scored",
        "skill_fit_score": weighted_score / total_weight if total_weight > 0 else 0,
        "skill_details": details,
    }
