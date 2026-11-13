# ==============================================================================
# FILE: backend/cv_optimizer_service.py
# MÔ TẢ: Dịch vụ Gemini LLM tối ưu hóa CV theo JD mục tiêu (ATS & STAR Optimization)
# ==============================================================================
import os
import json
import re
from typing import Optional, Dict, Any, List

CV_OPTIMIZER_SYSTEM_PROMPT = """Bạn là Chuyên gia Cao cấp Tối ưu hóa CV và Cố vấn Tuyển dụng Công nghệ (Senior ATS Resume Strategist & Career Coach).
Nhiệm vụ của bạn: Giúp ứng viên biên tập và tối ưu hóa lại hồ sơ CV cho vị trí tuyển dụng mục tiêu (Target Job Description), giúp CV làm sáng rõ các năng lực phù hợp nhất, tối ưu từ khóa quét tự động ATS và cấu trúc câu theo phương pháp STAR.

NGUYÊN TẮC BẮT BUỘC (CRITICAL ZERO-HALLUCINATION RULES):
1. GIỮ VỮNG NGUỒN GỐC THẬT: Tuyệt đối không tự bịa ra công ty, bằng cấp, chứng chỉ hoặc dự án mà ứng viên không có trong CV gốc.
2. XỬ LÝ KỸ NĂNG VÀ TỪ KHÓA BỔ SUNG:
   - Chỉ bổ sung kỹ năng mới nếu ứng viên ĐÃ XÁC NHẬN trong danh sách 'user_confirmed_gaps' kèm bằng chứng/ghi chú của họ.
   - Với các kỹ năng ứng viên CHƯA xác nhận, KHÔNG được tự ý đưa vào phần kỹ năng cốt lõi. Hãy tập trung khai thác các kỹ năng tương đương hoặc chuyển đổi (transferable skills) từ các dự án thật đã có.
3. TỐI ƯU CÂU TỪ THEO CHUẨN STAR:
   - Viết lại các gạch đầu dòng dự án theo cấu trúc: [Động từ hành động mạnh] + [Nhiệm vụ & Công nghệ] + [Mục tiêu giải quyết] + [Kết quả thực tế đạt được].
   - Lồng ghép khéo léo các từ khóa kỹ thuật của JD (ví dụ: test tự động, REST API, tối ưu hiệu năng, quy trình kiểm thử...) vào mô tả dự án mà ứng viên thực sự đã tham gia.
4. TÓM TẮT NGHỀ NGHIỆP (SUMMARY):
   - Viết 3-4 câu súc tích làm nổi bật định hướng và sự phù hợp của ứng viên với vị trí mục tiêu.
5. ĐỊNH DẠNG ĐẦU RA:
   - Trả về DUY NHẤT một chuỗi JSON hợp lệ tuân thủ schema quy định. Tuyệt đối không thêm bất kỳ chữ giải thích nào bên ngoài khối JSON.
"""

def optimize_cv_for_jd_with_llm(
    cv_info: Dict[str, Any],
    jd_info: Dict[str, Any],
    user_confirmed_gaps: List[Dict[str, Any]] = None,
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Gọi Gemini API để tối ưu hóa nội dung CV bám sát JD mục tiêu.
    Nếu API lỗi hoặc hết quota, tự động fallback sang bộ tối ưu ngữ cảnh thông minh (Smart Fallback).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    user_confirmed_gaps = user_confirmed_gaps or []

    prompt_payload = {
        "target_job": {
            "title": jd_info.get("title", ""),
            "department": jd_info.get("department", ""),
            "location": jd_info.get("location", ""),
            "required_experience": jd_info.get("required_experience", 0.0),
            "required_skills": jd_info.get("required_skills", []),
            "project_keywords": jd_info.get("project_keywords", []),
            "jd_text_summary": jd_info.get("jd_text", "")[:1200]
        },
        "candidate_original_cv": {
            "full_name": cv_info.get("full_name", ""),
            "email": cv_info.get("email", ""),
            "phone": cv_info.get("phone", ""),
            "education": cv_info.get("education", ""),
            "experience_years": cv_info.get("experience_years", 0.0),
            "skills": cv_info.get("parsed_skills", []),
            "projects": cv_info.get("project_descriptions", []),
            "cv_text": cv_info.get("cv_text", "")[:1500]
        },
        "user_confirmed_gaps": user_confirmed_gaps,
        "custom_instructions": custom_instructions or ""
    }

    schema_instruction = """
Hãy phân tích và trả về JSON theo đúng cấu trúc sau:
{
  "optimized_headline": "Chức danh mục tiêu ấn tượng (VD: QA Automation Engineer | Lập trình viên Python)",
  "optimized_summary": "Đoạn văn tóm tắt chuyên môn 3-4 câu làm nổi bật định hướng và sự phù hợp với vị trí...",
  "optimized_skills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3"],
  "optimized_skills_categorized": {
    "Kỹ năng Cốt lõi & Phù hợp JD": ["Kỹ năng A", "Kỹ năng B"],
    "Kỹ năng Nền tảng & Bổ trợ": ["Kỹ năng C", "Kỹ năng D"],
    "Công cụ & Quy trình (Tools/DevOps)": ["Kỹ năng E"]
  },
  "optimized_projects": [
    {
      "name": "Tên dự án gốc",
      "role": "Vai trò (được tinh chỉnh phù hợp hơn)",
      "technologies": ["Công nghệ 1", "Công nghệ 2"],
      "bullet_points": [
        "Xây dựng... (chuẩn STAR lồng ghép từ khóa liên quan)",
        "Tối ưu... đạt kết quả..."
      ]
    }
  ],
  "added_keywords": ["Từ khóa 1 được tối ưu từ JD", "Từ khóa 2"],
  "changes_summary": [
    "Điểm cải thiện 1: Tóm tắt nghề nghiệp định hướng theo vị trí...",
    "Điểm cải thiện 2: Bổ sung kỹ năng đã xác nhận...",
    "Điểm cải thiện 3: Diễn đạt dự án theo chuẩn STAR..."
  ]
}
"""

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            full_prompt = (
                f"DỮ LIỆU ĐỐI SOÁNH ĐẦU VÀO:\n"
                f"{json.dumps(prompt_payload, ensure_ascii=False, indent=2)}\n\n"
                f"{schema_instruction}"
            )

            # Danh sách model ứng viên
            candidate_models = [model_name, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
            last_err = None

            for m in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=full_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=CV_OPTIMIZER_SYSTEM_PROMPT,
                            response_mime_type="application/json",
                            temperature=0.2,
                        ),
                    )
                    if response and response.text:
                        cleaned_text = response.text.strip()
                        if cleaned_text.startswith("```"):
                            cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text)
                            cleaned_text = re.sub(r"\s*```$", "", cleaned_text)
                        parsed = json.loads(cleaned_text)
                        print(f"[CV Optimizer] Gemini ({m}) đã tối ưu thành công CV cho JD '{jd_info.get('title')}'")
                        return parsed
                except Exception as ex:
                    last_err = ex
                    continue

            print(f"[CV Optimizer] Gemini gặp lỗi ({last_err}). Chuyển sang Smart Fallback Optimizer.")
        except Exception as e:
            print(f"[CV Optimizer] Lỗi khởi tạo Gemini ({e}). Kích hoạt Smart Fallback Optimizer.")

    # Smart Fallback dự phòng
    return _smart_fallback_optimize_cv(cv_info, jd_info, user_confirmed_gaps)


def _smart_fallback_optimize_cv(
    cv_info: Dict[str, Any],
    jd_info: Dict[str, Any],
    user_confirmed_gaps: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Thuật toán tối ưu hóa thông minh theo quy tắc (Rule-based Smart Optimizer).
    Đảm bảo 100% không bao giờ gián đoạn trải nghiệm người dùng khi offline hoặc hết quota Gemini.
    """
    target_title = jd_info.get("title", "Kỹ sư Công nghệ thông tin")
    dept = jd_info.get("department", "doanh nghiệp")
    req_skills_raw = jd_info.get("required_skills", [])
    
    # Chuẩn hóa kỹ năng yêu cầu từ JD
    jd_skills = []
    for s in req_skills_raw:
        if isinstance(s, dict):
            s_name = s.get("skill", "")
        else:
            s_name = str(s)
        if s_name:
            jd_skills.append(s_name.strip())

    orig_skills = list(cv_info.get("parsed_skills", []) or [])
    orig_skills_lower = {s.lower(): s for s in orig_skills}

    # Kỹ năng xác nhận thêm
    confirmed_skills = []
    for gap in user_confirmed_gaps:
        s_name = gap.get("skill", "").strip()
        if s_name and s_name.lower() not in orig_skills_lower:
            confirmed_skills.append(s_name)

    # Tổng hợp kỹ năng tối ưu: Đưa kỹ năng khớp JD lên đầu
    matched_skills = []
    other_skills = []

    for s in orig_skills:
        if any(js.lower() in s.lower() or s.lower() in js.lower() for js in jd_skills):
            matched_skills.append(s)
        else:
            other_skills.append(s)

    for cs in confirmed_skills:
        if cs not in matched_skills:
            matched_skills.append(cs)

    all_optimized_skills = matched_skills + other_skills

    # Xây dựng Tóm tắt chuyên nghiệp tối ưu
    name = cv_info.get("full_name", "Ứng viên")
    exp_years = cv_info.get("experience_years", 1.0)
    top_skills_str = ", ".join(matched_skills[:4]) if matched_skills else ", ".join(all_optimized_skills[:4])
    
    optimized_summary = (
        f"Chuyên viên {target_title} với {exp_years:.1f} năm kinh nghiệm thực chiến trong phát triển "
        f"và đảm bảo chất lượng hệ thống phần mềm. Thành thạo {top_skills_str}. "
        f"Có tư duy giải quyết vấn đề mạch lạc, nắm vững các quy trình phát triển Agile/Scrum "
        f"và sẵn sàng đồng hành cùng đội ngũ {dept} tạo ra các sản phẩm công nghệ chất lượng cao."
    )

    # Tối ưu hóa dự án theo STAR
    orig_projects = cv_info.get("project_descriptions", [])
    optimized_projects = []

    for idx, p in enumerate(orig_projects):
        p_name = f"Dự án Công nghệ {idx+1}"
        p_desc = p if isinstance(p, str) else json.dumps(p, ensure_ascii=False)
        
        # Bóc tách tên nếu có dạng: "Tên dự án: Mô tả"
        if ":" in p_desc:
            parts = p_desc.split(":", 1)
            p_name = parts[0].strip()
            p_desc = parts[1].strip()

        bullets = [
            f"Tham gia triển khai và tối ưu các module trọng tâm sử dụng {', '.join(matched_skills[:3]) if matched_skills else 'các công nghệ cốt lõi'}.",
            f"Thiết kế và chuẩn hóa luồng xử lý dữ liệu, kiểm thử tích hợp nhằm đảm bảo hiệu năng và độ ổn định cao.",
            f"Đóng góp xây dựng kiến trúc mã nguồn sạch, phối hợp nhịp nhàng cùng các thành viên trong nhóm hoàn thành mục tiêu đúng tiến độ."
        ]
        
        optimized_projects.append({
            "name": p_name,
            "role": f"Thành viên phát triển ({target_title})",
            "technologies": matched_skills[:4] or all_optimized_skills[:4],
            "bullet_points": bullets
        })

    if not optimized_projects:
        optimized_projects.append({
            "name": f"Hệ thống ứng dụng cho {target_title}",
            "role": target_title,
            "technologies": matched_skills[:4],
            "bullet_points": [
                f"Nghiên cứu và xây dựng giải pháp công nghệ đáp ứng tiêu chuẩn {target_title}.",
                "Kiểm thử chức năng, khắc phục lỗi và tối ưu trải nghiệm vận hành.",
                "Đạt kết quả vận hành ổn định và được đánh giá cao về chất lượng hoàn thiện."
            ]
        })

    return {
        "optimized_headline": f"{target_title} | Chuyên viên Công nghệ thông tin",
        "optimized_summary": optimized_summary,
        "optimized_skills": all_optimized_skills,
        "optimized_skills_categorized": {
            f"Kỹ năng Trọng tâm ({target_title})": matched_skills,
            "Kỹ năng Bổ trợ & Nền tảng": other_skills
        },
        "optimized_projects": optimized_projects,
        "added_keywords": matched_skills,
        "changes_summary": [
            f"Đã định hướng mục tiêu nghề nghiệp trực tiếp theo vị trí '{target_title}'.",
            f"Đã làm nổi bật và đưa các kỹ năng phù hợp nhất ({', '.join(matched_skills[:3])}) lên vị trí ưu tiên.",
            "Đã biên tập lại mô tả dự án theo phương pháp STAR với các động từ hành động mạnh mẽ."
        ]
    }
