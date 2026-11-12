# ==============================================================================
# FILE: backend/cv_llm_service.py
# MÔ TẢ: Dịch vụ Gemini LLM biên tập nội dung CV tự động chuẩn ATS
# ==============================================================================
import os
import json
import re
from typing import Optional
from google import genai
from google.genai import types
from schemas import CVGenerateRequest, CVGenerateResponse, CVPolishedProject, CVPolishedExperience

CV_SYSTEM_PROMPT = """Bạn là Chuyên gia Soạn thảo CV Công nghệ thông tin cấp cao chuẩn ATS quốc tế cho nền tảng AI Talent Match.
Nhiệm vụ của bạn: Nhận dữ kiện thô từ ứng viên và biên tập thành nội dung CV chuyên nghiệp, mạch lạc, thu hút nhà tuyển dụng.

NGUYÊN TẮC BẮT BUỘC (CRITICAL ZERO-HALLUCINATION RULES):
1. TRUY NGUYÊN NGUỒN GỐC: Chỉ biên tập lại dựa trên đúng các dữ kiện ứng viên đã cung cấp.
2. TUYỆT ĐỐI KHÔNG BỊA ĐẶT (ZERO-HALLUCINATION):
   - Không tự sáng tác tên công ty, trường học, bằng cấp hoặc kỹ năng mà ứng viên chưa khai báo.
   - Tuyệt đối KHÔNG tự bịa ra số liệu phần trăm thành tích định lượng (ví dụ: 'tăng 40% doanh thu', 'giảm 50% độ trễ') nếu ứng viên KHÔNG tự ghi trong phần kết quả.
3. PHƯƠNG PHÁP HÀNH ĐỘNG (ACTION VERBS):
   - Diễn đạt các gạch đầu dòng dự án và kinh nghiệm bằng các động từ hành động mạnh mẽ (ví dụ: Xây dựng, Thiết kế, Tối ưu, Tích hợp, Triển khai, Phát triển, Chuẩn hóa).
   - Mô tả theo cấu trúc: [Động từ hành động] + [Nhiệm vụ cụ thể] + [Công nghệ sử dụng] + [Kết quả thực tế đã đạt].
4. PHÂN NHÓM KỸ NĂNG:
   - Phân loại danh sách kỹ năng của ứng viên thành các nhóm rõ ràng (Frontend, Backend, Database & Cloud, Tools & Methodologies).
5. TÓM TẮT CHUYÊN NGHIỆP (SUMMARY):
   - Viết 3-4 câu súc tích làm nổi bật thế mạnh công nghệ cốt lõi và thái độ làm việc, định hướng phù hợp với vị trí mục tiêu.
6. ĐỊNH DẠNG ĐẦU RA:
   - Trả về DUY NHẤT một JSON hợp lệ tuân thủ schema quy định. Tuyệt đối không thêm chữ giải thích bên ngoài JSON.
"""

def generate_cv_content_with_llm(req: CVGenerateRequest) -> dict:
    """
    Gọi Gemini API để biên tập nội dung CV.
    Nếu API lỗi hoặc hết quota, tự động fallback sang bộ biên tập ngữ cảnh thông minh.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Chuẩn bị dữ liệu gửi LLM
    prompt_payload = {
        "target_job_title": req.target_job_title,
        "language": req.language or "vi",
        "personal_info": {
            "full_name": req.personal_info.full_name,
            "email": req.personal_info.email,
            "phone": req.personal_info.phone,
            "address": req.personal_info.address,
        },
        "raw_summary": req.raw_summary or "",
        "education": [e.model_dump() for e in req.education],
        "skills": req.skills,
        "projects": [p.model_dump() for p in req.projects],
        "experiences": [exp.model_dump() for exp in req.experiences],
    }

    schema_instruction = """
Hãy trả về JSON theo đúng cấu trúc sau:
{
  "headline": "Chức danh nổi bật (VD: Kỹ sư Phần mềm Full-stack)",
  "professional_summary": "Đoạn văn tóm tắt chuyên nghiệp 3-4 câu...",
  "skills_categorized": {
    "Frontend": ["React", "JavaScript"],
    "Backend": ["Python", "FastAPI"],
    "Database & Cloud": ["PostgreSQL", "Docker"],
    "Tools & Khác": ["Git", "Agile"]
  },
  "polished_projects": [
    {
      "ref_id": "proj_id_từ_input",
      "name": "Tên dự án",
      "role": "Vai trò cụ thể",
      "technologies": ["Tech1", "Tech2"],
      "bullet_points": [
        "Xây dựng...",
        "Tích hợp..."
      ]
    }
  ],
  "polished_experiences": [
    {
      "ref_id": "exp_id_từ_input",
      "company": "Tên công ty",
      "position": "Vị trí",
      "duration": "Thời gian",
      "bullet_points": [
        "Phát triển...",
        "Tối ưu..."
      ]
    }
  ]
}
"""

    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            full_prompt = f"DỮ KIỆN ỨNG VIÊN:\n{json.dumps(prompt_payload, ensure_ascii=False, indent=2)}\n\n{schema_instruction}"
            
            response = client.models.generate_content(
                model=model_name,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=CV_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            
            if response and response.text:
                cleaned_text = response.text.strip()
                # Bóc tách nếu có block ```json ... ```
                if cleaned_text.startswith("```"):
                    cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text)
                    cleaned_text = re.sub(r"\s*```$", "", cleaned_text)
                parsed = json.loads(cleaned_text)
                print(f"[CV LLM Service] Gemini đã biên tập thành công CV cho '{req.personal_info.full_name}'")
                return parsed
        except Exception as e:
            print(f"[CV LLM Service] Lỗi khi gọi Gemini ({e}). Kích hoạt bộ tạo CV ngữ cảnh thông minh (Fallback).")

    # FALLBACK DỰ PHÒNG NẾU KHÔNG CÓ KEY HOẶC LỖI MẠNG
    return _generate_fallback_cv_content(req)


def _generate_fallback_cv_content(req: CVGenerateRequest) -> dict:
    """Tạo nội dung chuẩn hóa theo rule-based khi LLM offline."""
    target_job = req.target_job_title or "Chuyên viên Công nghệ thông tin"
    skills = req.skills or []
    
    # Phân nhóm kỹ năng cơ bản
    fe_keywords = {"react", "vue", "angular", "javascript", "typescript", "html", "css", "tailwind", "nextjs", "redux"}
    be_keywords = {"python", "fastapi", "django", "nodejs", "express", "java", "spring", "golang", "c#", ".net", "php", "laravel"}
    db_keywords = {"postgresql", "mysql", "mongodb", "redis", "sqlite", "docker", "aws", "gcp", "azure", "kubernetes", "ci/cd"}
    
    fe_skills = []
    be_skills = []
    db_skills = []
    other_skills = []

    for s in skills:
        s_lower = s.lower().strip()
        if any(k in s_lower for k in fe_keywords):
            fe_skills.append(s)
        elif any(k in s_lower for k in be_keywords):
            be_skills.append(s)
        elif any(k in s_lower for k in db_keywords):
            db_skills.append(s)
        else:
            other_skills.append(s)

    skills_categorized = {}
    if fe_skills:
        skills_categorized["Frontend"] = fe_skills
    if be_skills:
        skills_categorized["Backend"] = be_skills
    if db_skills:
        skills_categorized["Database & DevOps"] = db_skills
    if other_skills or not skills_categorized:
        skills_categorized["Kỹ năng bổ trợ & Công cụ"] = other_skills if other_skills else skills

    # Professional summary
    tech_highlight = ", ".join(skills[:4]) if skills else "Công nghệ thông tin"
    if req.raw_summary and len(req.raw_summary.strip()) > 10:
        summary = f"{req.raw_summary.strip()} Định hướng phát triển chuyên sâu trong vai trò {target_job}, không ngừng nâng cao năng lực kỹ thuật và đóng góp hiệu quả vào mục tiêu chung của tổ chức."
    else:
        summary = f"Chuyên viên {target_job} đầy nhiệt huyết với nền tảng vững chắc về {tech_highlight}. Có tư duy giải quyết vấn đề mạch lạc, khả năng làm việc độc lập và phối hợp nhóm hiệu quả, sẵn sàng tiếp cận công nghệ mới nhằm kiến tạo các sản phẩm chất lượng cao."

    # Polished projects
    polished_projects = []
    for p in req.projects:
        tech_str = ", ".join(p.technologies) if p.technologies else "các công cụ chuyên môn"
        bullets = []
        if p.my_role:
            bullets.append(f"Đảm nhiệm vai trò {p.my_role}, chịu trách nhiệm triển khai và hoàn thiện các module nghiệp vụ sử dụng {tech_str}.")
        if p.tasks:
            bullets.append(f"Xây dựng và tối ưu các chức năng cốt lõi: {p.tasks}.")
        if p.result:
            bullets.append(f"Đạt kết quả thực tế: {p.result}.")
        if not bullets:
            bullets.append(f"Phát triển và hoàn thiện các tính năng của dự án {p.name} với công nghệ {tech_str}.")

        polished_projects.append({
            "ref_id": p.id or f"proj_{len(polished_projects)+1}",
            "name": p.name,
            "role": p.my_role or target_job,
            "technologies": p.technologies,
            "bullet_points": bullets
        })

    # Polished experiences
    polished_experiences = []
    for exp in req.experiences:
        bullets = []
        if exp.responsibilities:
            bullets.append(f"Thực hiện các nhiệm vụ chuyên môn: {exp.responsibilities}.")
        if exp.achievements:
            bullets.append(f"Đạt thành tích nổi bật: {exp.achievements}.")
        if not bullets:
            bullets.append(f"Đảm nhiệm vị trí {exp.position} tại {exp.company}.")

        polished_experiences.append({
            "ref_id": exp.id or f"exp_{len(polished_experiences)+1}",
            "company": exp.company,
            "position": exp.position,
            "duration": exp.duration or "Hiện tại",
            "bullet_points": bullets
        })

    return {
        "headline": target_job,
        "professional_summary": summary,
        "skills_categorized": skills_categorized,
        "polished_projects": polished_projects,
        "polished_experiences": polished_experiences
    }
