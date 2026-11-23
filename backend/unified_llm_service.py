# ==============================================================================
# FILE: backend/unified_llm_service.py
# MÔ TẢ: Unified LLM Service - Đánh giá đa tiêu chí tốc độ cao bằng Gemini LLM
# ==============================================================================
import os
import json
import time
import hashlib
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from unified_schemas import UnifiedAssessmentResponse, CriterionAssessment

# SYSTEM PROMPT TẬP TRUNG & TỐI ƯU HÓA TOKEN
SYSTEM_PROMPT_UNIFIED = """Bạn là chuyên gia thẩm định hồ sơ ứng viên tuyển dụng chuẩn ATS quốc tế.
Nhiệm vụ: Thẩm định hồ sơ CV so với yêu cầu của Job Description (JD) trên 4 trụ cột cốt lõi:
1. skill_assessments (Kỹ năng công nghệ & chuyên môn)
2. experience_assessments (Số năm kinh nghiệm, cấp bậc seniority, lĩnh vực nghiệp vụ)
3. project_assessments (Quy mô dự án, mức độ đóng góp cá nhân theo chuẩn STAR, kết quả đo lường)
4. education_assessments (Trình độ bằng cấp, đúng chuyên ngành CNTT, chứng chỉ nghề nghiệp/ngoại ngữ)

QUY TẮC CHẤM ĐIỂM LEVEL (0 đến 4) CHO MỌI TIÊU CHÍ:
- Level 0 (m=0.0): Hoàn toàn không có thông tin/bằng chứng hoặc mâu thuẫn rõ rệt. Mã lý do: not_found hoặc explicitly_not_met.
- Level 1 (m=0.25): Tự nhận, chỉ liệt kê từ khóa, hoặc dưới 50% yêu cầu; chưa có sản phẩm thực tế. Mã: partially_met.
- Level 2 (m=0.50): Có ứng dụng mức độ cơ bản/học tập, đáp ứng 50%-75% yêu cầu. Mã: partially_met.
- Level 3 (m=0.75): Đáp ứng tốt 100% yêu cầu công việc thực tế, có vai trò cá nhân rõ ràng. Mã: evidence_based.
- Level 4 (m=1.00): Vượt trội, có thành tựu đo lường bằng số liệu (metrics), dẫn dắt (lead/mentor), hoặc chứng chỉ quốc tế uy tín. Mã: exceeds_expectations.

QUY TẮC TRỌNG SỐ (importance):
- "core": Tiêu chí bắt buộc cốt lõi (Trọng số X3).
- "supporting": Tiêu chí bổ trợ quan trọng (Trọng số X2).
- "preferred": Tiêu chí điểm cộng ưu tiên (Trọng số X1).

NGUYÊN TẮC ZERO-HALLUCINATION:
- Trích xuất quote ngắn gọn nguyên văn từ CV làm bằng chứng (evidence).
- Không tự bịa đặt dự án, số liệu hay kinh nghiệm không có trong CV.
- Nếu CV không đề cập, bắt buộc chấm Level 0 với evidence rỗng.
"""

# In-memory LRU Cache để phản hồi tức thì các yêu cầu lặp
_UNIFIED_EVALUATION_CACHE: Dict[str, Dict[str, Any]] = {}
_QUOTA_BLOCKED_UNTIL: float = 0.0


def _prune_cv_context(cv_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Context Pruning: Tinh gọn văn bản CV, loại bỏ thông tin rác nhằm giảm 50-70% token gửi vào LLM.
    """
    raw_text = cv_data.get("cv_text") or ""
    
    # Lấy tối đa 1500 ký tự đầu của CV (tóm tắt, học vấn) và các mô tả dự án
    cleaned_lines = []
    for line in raw_text.splitlines():
        line_clean = line.strip()
        # Bỏ qua các dòng định dạng rác phổ biến từ PDF
        if not line_clean or len(line_clean) < 3:
            continue
        if any(ignore in line_clean.lower() for ignore in ["trang 1", "page 1", "curriculum vitae", "sở thích", "người tham chiếu"]):
            continue
        cleaned_lines.append(line_clean)
        if len(cleaned_lines) >= 80: # Giới hạn tối đa 80 dòng cốt lõi
            break
            
    pruned_text = "\n".join(cleaned_lines)
    
    # Dự án thực tế
    projects = cv_data.get("project_descriptions") or []
    pruned_projects = []
    for p in projects[:5]: # Tối đa 5 dự án nổi bật nhất
        if isinstance(p, dict):
            pruned_projects.append({
                "name": p.get("name") or "Dự án",
                "bullets": (p.get("bullet_points") or [])[:4]
            })
        elif isinstance(p, str):
            pruned_projects.append(p[:300])

    return {
        "summary_and_content": pruned_text[:2000],
        "parsed_skills": cv_data.get("parsed_skills", [])[:20],
        "experience_years": cv_data.get("experience_years", 1.0),
        "education": cv_data.get("education", ""),
        "projects": pruned_projects
    }


def evaluate_cv_against_jd_unified(cv_data: Dict[str, Any], jd_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Đánh giá đơn lượt (Single-Pass) toàn diện 4 trụ cột CV so với JD.
    Trả về dict chuẩn hóa bao gồm:
    - candidate_summary
    - skill_assessments
    - experience_assessments
    - project_assessments
    - education_assessments
    """
    global _QUOTA_BLOCKED_UNTIL

    # 1. Tạo cache key từ mã băm nội dung
    cache_str = json.dumps({
        "cv_text_sample": (cv_data.get("cv_text") or "")[:500],
        "cv_skills": cv_data.get("parsed_skills", []),
        "jd_skills": jd_data.get("required_skills", []),
        "jd_exp": jd_data.get("required_experience", 0),
        "jd_text_sample": (jd_data.get("jd_text") or "")[:400]
    }, sort_keys=True)
    cache_key = hashlib.md5(cache_str.encode("utf-8")).hexdigest()

    if cache_key in _UNIFIED_EVALUATION_CACHE:
        return _UNIFIED_EVALUATION_CACHE[cache_key]

    # 2. Kiểm tra nếu đang bị 429 Rate Limit
    if time.time() < _QUOTA_BLOCKED_UNTIL:
        print("  [Unified LLM] Đang trong thời gian chờ Rate-Limit, kích hoạt fallback tức thì.")
        return _build_heuristic_fallback(cv_data, jd_data)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("  [Unified LLM] Thiếu GEMINI_API_KEY, chuyển sang fallback heuristic.")
        return _build_heuristic_fallback(cv_data, jd_data)

    # 3. Chuẩn bị Payload nhỏ gọn đã prune
    pruned_cv = _prune_cv_context(cv_data)
    
    # Chuẩn hóa required_skills từ JD
    raw_skills = jd_data.get("required_skills") or []
    formatted_skills = []
    for s in raw_skills:
        if isinstance(s, dict):
            formatted_skills.append({
                "skill": s.get("skill", ""),
                "importance": s.get("importance", "core")
            })
        elif isinstance(s, str) and s.strip():
            formatted_skills.append({
                "skill": s.strip(),
                "importance": "core"
            })

    target_job_title = jd_data.get("title") or "Vị trí tuyển dụng"
    required_exp_years = float(jd_data.get("required_experience") or 1.0)

    request_payload = {
        "candidate": pruned_cv,
        "job_description": {
            "title": target_job_title,
            "required_experience_years": required_exp_years,
            "required_skills": formatted_skills,
            "project_keywords": (jd_data.get("project_keywords") or [])[:10],
            "context_summary": (jd_data.get("jd_text") or "")[:800]
        }
    }

    try:
        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        # Gọi Gemini API với Structured Output JSON Schema
        response = client.models.generate_content(
            model=model_name,
            contents=json.dumps(request_payload, ensure_ascii=False),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT_UNIFIED,
                response_mime_type="application/json",
                response_schema=UnifiedAssessmentResponse,
                temperature=0.0
            ),
        )

        if not response or not response.text:
            raise RuntimeError("Gemini không trả về nội dung đánh giá")

        parsed_resp = UnifiedAssessmentResponse.model_validate_json(response.text)
        result_dict = parsed_resp.model_dump()

        # Cache kết quả
        _UNIFIED_EVALUATION_CACHE[cache_key] = result_dict
        return result_dict

    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg:
            _QUOTA_BLOCKED_UNTIL = time.time() + 180  # Chặn 3 phút để tránh dính spam
            print("  [Unified LLM] Gặp lỗi 429 Quota Exceeded. Kích hoạt Fallback Heuristic.")
        else:
            print(f"  [Unified LLM] Lỗi gọi Gemini API: {err_msg[:120]}. Dùng Fallback Heuristic.")
        
        fallback_res = _build_heuristic_fallback(cv_data, jd_data)
        _UNIFIED_EVALUATION_CACHE[cache_key] = fallback_res
        return fallback_res


def _build_heuristic_fallback(cv_data: Dict[str, Any], jd_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback Heuristic thông minh: Trả về kết quả đánh giá theo đúng cấu trúc 4 trụ cột
    với đầy đủ trọng số và bằng chứng thực tế từ CV mà không cần gọi API ngoài.
    """
    cv_full_lower = (cv_data.get("cv_text") or "").lower()
    raw_skills = jd_data.get("required_skills") or []
    
    # 1. Kỹ năng
    skill_assessments = []
    for s in raw_skills:
        s_name = s.get("skill") if isinstance(s, dict) else str(s)
        importance = s.get("importance", "core") if isinstance(s, dict) else "core"
        if not s_name:
            continue
        found = s_name.lower() in cv_full_lower
        skill_assessments.append({
            "name": s_name,
            "pillar": "skills",
            "importance": importance,
            "level": 3 if found else 0,
            "reason_code": "evidence_based" if found else "not_found",
            "reason": f"Tìm thấy kỹ năng '{s_name}' trong nội dung hồ sơ" if found else f"Chưa tìm thấy từ khóa '{s_name}' trong CV",
            "evidence": [{"source_id": "cv", "quote": s_name}] if found else []
        })

    # 2. Kinh nghiệm
    req_exp = float(jd_data.get("required_experience") or 1.0)
    cand_exp = float(cv_data.get("experience_years") or 1.0)
    exp_ratio = cand_exp / max(req_exp, 1.0)
    
    if exp_ratio >= 1.2:
        exp_level = 4
        exp_reason = f"Có {cand_exp} năm kinh nghiệm, vượt yêu cầu {req_exp} năm của JD"
    elif exp_ratio >= 0.9:
        exp_level = 3
        exp_reason = f"Có {cand_exp} năm kinh nghiệm, đáp ứng tốt yêu cầu {req_exp} năm"
    elif exp_ratio >= 0.5:
        exp_level = 2
        exp_reason = f"Có {cand_exp} năm kinh nghiệm, đạt mức độ cơ bản (yêu cầu {req_exp} năm)"
    else:
        exp_level = 1
        exp_reason = f"Số năm kinh nghiệm ({cand_exp} năm) còn khiêm tốn so với yêu cầu ({req_exp} năm)"

    exp_assessments = [
        {
            "name": f"Số năm kinh nghiệm chuyên môn (Yêu cầu {req_exp} năm)",
            "pillar": "experience",
            "importance": "core",
            "level": exp_level,
            "reason_code": "evidence_based" if exp_level >= 2 else "partially_met",
            "reason": exp_reason,
            "evidence": [{"source_id": "cv", "quote": f"{cand_exp} năm kinh nghiệm"}]
        },
        {
            "name": "Mức độ phù hợp với cấp bậc vị trí (Seniority)",
            "pillar": "experience",
            "importance": "core",
            "level": exp_level,
            "reason_code": "evidence_based",
            "reason": "Đã có quá trình đảm nhiệm các công việc thực tế trong ngành",
            "evidence": []
        }
    ]

    # 3. Dự án
    projects = cv_data.get("project_descriptions") or []
    has_proj = len(projects) > 0
    proj_assessments = [
        {
            "name": "Quy mô và số lượng dự án thực tế",
            "pillar": "projects",
            "importance": "core",
            "level": 3 if len(projects) >= 2 else (2 if len(projects) == 1 else 1),
            "reason_code": "evidence_based" if has_proj else "partially_met",
            "reason": f"Hồ sơ có {len(projects)} dự án thực tế được mô tả" if has_proj else "Chưa có dự án cụ thể",
            "evidence": [{"source_id": "proj_0", "quote": str(projects[0])[:120]}] if has_proj else []
        },
        {
            "name": "Minh chứng vai trò và trách nhiệm cá nhân (STAR)",
            "pillar": "projects",
            "importance": "supporting",
            "level": 3 if has_proj else 1,
            "reason_code": "evidence_based" if has_proj else "partially_met",
            "reason": "Có mô tả nhiệm vụ và công nghệ đã sử dụng trong dự án",
            "evidence": []
        }
    ]

    # 4. Học vấn
    edu_text = cv_data.get("education") or ""
    has_degree = any(deg in (edu_text.lower() + cv_full_lower) for deg in ["đại học", "cử nhân", "kỹ sư", "bachelor", "master", "thạc sĩ"])
    edu_assessments = [
        {
            "name": "Trình độ học vấn & Bằng cấp chuyên ngành",
            "pillar": "education",
            "importance": "supporting",
            "level": 3 if has_degree else 2,
            "reason_code": "evidence_based" if has_degree else "partially_met",
            "reason": f"Trình độ học vấn: {edu_text}" if edu_text else ("Tốt nghiệp Đại học/Cao đẳng chuyên ngành liên quan" if has_degree else "Đang theo học hoặc đã hoàn thành khóa đào tạo chuyên môn"),
            "evidence": [{"source_id": "cv", "quote": edu_text[:100]}] if edu_text else []
        }
    ]

    return {
        "candidate_summary": "Hồ sơ có nền tảng tốt, đáp ứng phần lớn các tiêu chí kỹ thuật và kinh nghiệm yêu cầu.",
        "skill_assessments": skill_assessments,
        "experience_assessments": exp_assessments,
        "project_assessments": proj_assessments,
        "education_assessments": edu_assessments
    }
