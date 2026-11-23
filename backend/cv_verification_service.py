# ==============================================================================
# FILE: backend/cv_verification_service.py
# MÔ TẢ: Dịch vụ Thẩm định Bằng chứng (Micro-Evidence) & Tạo Thử thách Kỹ thuật (Quick Tech Check)
# ==============================================================================
import os
import json
import re
import hashlib
from typing import Optional, Dict, Any, List

VERIFICATION_AUDITOR_SYSTEM_PROMPT = """Bạn là Trưởng ban Kiểm toán Kỹ thuật & Thẩm định Hồ sơ Ứng viên Công nghệ (Senior Technical Audit Officer).
Nhiệm vụ của bạn: Thẩm định tính trung thực, hợp lý và độ sâu kỹ thuật của các thông tin năng lực mà ứng viên BỔ SUNG THÊM ngoài CV gốc (Micro-Evidence Declaration).

NGUYÊN TẮC THẨM ĐỊNH KHÁCH QUAN & MINH BẠCH:
1. PHÁT HIỆN GIAN LẬN & KHAI BÁO KHỐNG (Anti-Gaming / Anti-Fake):
   - Nếu ứng viên chỉ nêu chung chung kiểu "em có biết sơ qua", "đã đọc tài liệu", "tự học trên youtube" mà không có mô tả bài toán, module kỹ thuật hoặc sản phẩm cụ thể:
     -> Chấm credibility_score <= 0.3, verdict = 'insufficient', awarded_level = 0 hoặc 1.
   - Nếu ứng viên mô tả rõ bài toán thực tế (đồ án tốt nghiệp, bài tập lớn, dự án freelance, công việc ở cty cũ) với các thuật ngữ chuyên sâu, logic kiến trúc hợp lý:
     -> Chấm credibility_score >= 0.7, verdict = 'verified_plausible' hoặc 'verified_high', awarded_level = 2, 3 hoặc 4.
2. KIỂM TRA TÍNH NHẤT QUÁN THỜI GIAN (Timeline Consistency):
   - Mốc thời gian làm việc hoặc hoàn thành dự án bổ sung không được mâu thuẫn phi lý với quá trình học tập / công tác trong CV gốc.
3. TẠO CÂU HỎI THỬ THÁCH NHANH (Quick Tech Check):
   - Với các kỹ năng/công nghệ bổ sung cốt lõi, tạo 2 câu hỏi trắc nghiệm thực hành ngắn (mỗi câu 4 đáp án A, B, C, D) hỏi về tình huống thực tế hoặc cú pháp/kiến trúc chuẩn, không hỏi lý thuyết sáo rỗng.
4. TẠO BỘ CÂU HỎI PHỎNG VẤN KIỂM CHỨNG (Interview Probe Kit):
   - Sinh 3-4 câu hỏi phỏng vấn đào sâu dành cho Nhà tuyển dụng để phỏng vấn trực tiếp ứng viên nhằm xác minh xem ứng viên có tự tay làm thật hay không.
5. ĐỊNH DẠNG:
   - Trả về DUY NHẤT một khối JSON hợp lệ theo đúng schema hướng dẫn.
"""

# Ngân hàng câu hỏi trắc nghiệm thông minh dự phòng (Smart Fallback Tech Bank)
FALLBACK_TECH_QUESTION_BANK = {
    "fastapi": {
        "question": "Trong FastAPI, khi cần inject một dependency (như Database Session hoặc Authentication) vào một API router, cách tiếp cận chuẩn xác nhất là gì?",
        "options": [
            "Sử dụng Depends() làm giá trị mặc định của tham số hàm trong endpoint",
            "Khởi tạo global variable và import trực tiếp vào router",
            "Truyền qua biến môi trường os.environ trong runtime",
            "Tạo class singleton kế thừa từ BaseHTTPMiddleware"
        ],
        "correct_index": 0,
        "explanation": "FastAPI cung cấp hệ thống Dependency Injection mạnh mẽ và an toàn kiểu dữ liệu thông qua Depends()."
    },
    "postgresql": {
        "question": "Để tối ưu hóa truy vấn tìm kiếm dữ liệu theo chuỗi văn bản không phân biệt hoa thường và hỗ trợ toán tử LIKE '%keyword%' trong PostgreSQL, loại index nào phù hợp nhất?",
        "options": [
            "B-Tree index tiêu chuẩn",
            "GiST hoặc GIN index kết hợp với pg_trgm extension",
            "Hash index đơn cột",
            "BRIN index dựa trên block vật lý"
        ],
        "correct_index": 1,
        "explanation": "GIN/GiST index với extension pg_trgm cho phép đánh chỉ mục n-gram, tăng tốc đáng kể các câu lệnh LIKE/ILIKE."
    },
    "redis": {
        "question": "Cấu trúc dữ liệu nào trong Redis phù hợp nhất để xây dựng tính năng Bảng xếp hạng (Leaderboard) theo điểm số?",
        "options": [
            "Sorted Set (ZSET) với các lệnh ZADD, ZREVRANGE",
            "Redis List với lệnh LPUSH, RPOP",
            "Redis Hash với lệnh HSET, HGET",
            "HyperLogLog với lệnh PFADD"
        ],
        "correct_index": 0,
        "explanation": "Sorted Set lưu trữ các phần tử kèm score float, tự động sắp xếp và truy xuất theo thứ hạng với độ phức tạp O(log(N))."
    },
    "python": {
        "question": "Trong Python, decorator @classmethod và @staticmethod khác nhau cơ bản ở điểm nào?",
        "options": [
            "@classmethod nhận đối số đầu tiên là class (cls), còn @staticmethod không nhận tự động tham chiếu class hay instance",
            "@staticmethod nhận đối số đầu tiên là self, còn @classmethod không nhận",
            "@classmethod chỉ gọi được từ class, không thể gọi từ object instance",
            "Hai decorator này hoàn toàn tương đương nhau trong Python 3.10+"
        ],
        "correct_index": 0,
        "explanation": "@classmethod nhận cls làm đối số đầu tiên, cho phép truy cập và sửa đổi class state, trong khi @staticmethod hoạt động như một hàm thông thường."
    },
    "docker": {
        "question": "Lợi ích chính của kỹ thuật Multi-stage build trong Dockerfile là gì?",
        "options": [
            "Giảm tối đa kích thước image production bằng cách tách môi trường build khỏi môi trường runtime",
            "Tăng tốc độ mạng khi pull image từ Docker Hub",
            "Cho phép chạy đồng thời nhiều container từ một Dockerfile duy nhất",
            "Tự động mã hóa container secrets mà không cần Docker Swarm"
        ],
        "correct_index": 0,
        "explanation": "Multi-stage build cho phép biên dịch mã nguồn ở stage đầu và chỉ copy file artifact/binary sang stage runtime nhỏ gọn (như alpine)."
    },
    "react": {
        "question": "Trong React, hook useMemo được sử dụng với mục đích chính là gì?",
        "options": [
            "Ghi nhớ kết quả tính toán tốn kém tài nguyên để tránh tính lại không cần thiết giữa các lần re-render",
            "Ghi nhớ tham chiếu hàm callback để tránh render lại component con",
            "Tạo hiệu ứng phụ (side effect) sau khi DOM được cập nhật",
            "Quản lý global state thay thế hoàn toàn Redux"
        ],
        "correct_index": 0,
        "explanation": "useMemo cache lại giá trị đã tính toán, chỉ tính lại khi một trong các dependencies thay đổi."
    },
    "selenium": {
        "question": "Trong kiểm thử tự động với Selenium WebDriver, loại Wait nào được khuyến nghị để chờ phần tử xuất hiện mà không làm chậm kịch bản kiểm thử?",
        "options": [
            "Explicit Wait (WebDriverWait kết hợp expected_conditions)",
            "time.sleep() cố định 5 giây",
            "Implicit Wait đặt mức thời gian tối đa 60 giây",
            "PageLoadStrategy.NONE"
        ],
        "correct_index": 0,
        "explanation": "Explicit Wait kiểm tra liên tục điều kiện mong muốn và tiếp tục ngay khi thỏa mãn, tối ưu thời gian chạy test."
    },
    "playwright": {
        "question": "Tính năng nổi bật giúp Playwright hạn chế tối đa hiện tượng Flaky Test (kiểm thử lúc pass lúc fail) là gì?",
        "options": [
            "Cơ chế Auto-waiting tự động chờ phần tử sẵn sàng (visible, stable, enabled) trước khi thực hiện hành động",
            "Tự động restart trình duyệt mỗi khi xảy ra ngoại lệ",
            "Chỉ hỗ trợ chạy chế độ Headless đơn luồng",
            "Mặc định vô hiệu hóa JavaScript trên trình duyệt"
        ],
        "correct_index": 0,
        "explanation": "Playwright tích hợp sẵn Auto-waiting cho tất cả các thao tác (click, fill, hover), loại bỏ nhu cầu viết các vòng lặp sleep thủ công."
    }
}


def audit_candidate_evidence_and_create_challenges(
    cv_info: Dict[str, Any],
    jd_info: Dict[str, Any],
    declared_evidences: List[Dict[str, Any]],
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Thẩm định toàn diện danh sách bằng chứng ứng viên khai báo thêm và sinh bài kiểm tra nhanh (Quick Tech Check).
    """
    if not declared_evidences:
        return {
            "audited_evidences": [],
            "challenge_questions": [],
            "overall_credibility": 1.0,
            "can_proceed": True,
            "audit_notes": "Ứng viên không bổ sung tiêu chí mới. Hệ thống sẽ tối ưu hóa câu từ CV gốc.",
            "interview_probe_kit": []
        }

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    prompt_payload = {
        "target_job": {
            "title": jd_info.get("title", ""),
            "department": jd_info.get("department", ""),
            "required_experience": jd_info.get("required_experience", 0.0),
            "required_skills": jd_info.get("required_skills", []),
            "jd_text_summary": jd_info.get("jd_text", "")[:1200]
        },
        "original_cv_summary": {
            "full_name": cv_info.get("full_name", ""),
            "education": cv_info.get("education", ""),
            "experience_years": cv_info.get("experience_years", 0.0),
            "skills": cv_info.get("parsed_skills", []),
            "projects_count": len(cv_info.get("project_descriptions", []) or []),
            "cv_snippet": cv_info.get("cv_text", "")[:1000]
        },
        "declared_evidences": declared_evidences,
        "custom_instructions": custom_instructions or ""
    }

    schema_instruction = """
Hãy thẩm định và trả về JSON theo đúng định dạng sau:
{
  "audited_evidences": [
    {
      "criterion_name": "Tên kỹ năng/kinh nghiệm/dự án khai báo",
      "pillar": "skills | experience | projects | education",
      "credibility_score": 0.85,
      "verdict": "verified_high | verified_plausible | partially_accepted | insufficient",
      "audit_reason": "Lý giải ngắn gọn lý do chấp nhận hoặc nghi ngờ về tính xác thực...",
      "awarded_level": 3,
      "evidence_quote": "Trích dẫn tóm tắt bằng chứng có sức nặng nhất của ứng viên"
    }
  ],
  "challenge_questions": [
    {
      "id": "q1",
      "criterion_name": "Tên công nghệ (vd: FastAPI)",
      "pillar": "skills",
      "question": "Nội dung câu hỏi trắc nghiệm tình huống thực tế...",
      "options": [
        "A. Đáp án 1",
        "B. Đáp án 2",
        "C. Đáp án 3",
        "D. Đáp án 4"
      ],
      "correct_index": 0,
      "explanation": "Giải thích ngắn vì sao đáp án này là đúng..."
    }
  ],
  "interview_probe_kit": [
    "Câu hỏi 1 cho Nhà tuyển dụng kiểm tra kỹ thuật trực tiếp khi phỏng vấn...",
    "Câu hỏi 2..."
  ],
  "overall_credibility": 0.82,
  "can_proceed": true,
  "audit_notes": "Nhận xét tổng quan về tính hợp lý của bộ hồ sơ bổ sung"
}
"""

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            full_prompt = (
                f"DỮ LIỆU ĐỐI SOÁNH THẨM ĐỊNH:\n"
                f"{json.dumps(prompt_payload, ensure_ascii=False, indent=2)}\n\n"
                f"{schema_instruction}"
            )

            candidate_models = [model_name, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
            last_err = None

            for m in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=full_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=VERIFICATION_AUDITOR_SYSTEM_PROMPT,
                            response_mime_type="application/json",
                            temperature=0.2,
                        ),
                    )
                    if response and response.text:
                        cleaned = response.text.strip()
                        if cleaned.startswith("```"):
                            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                            cleaned = re.sub(r"\s*```$", "", cleaned)
                        parsed = json.loads(cleaned)
                        print(f"[CV Verification] Gemini ({m}) đã thẩm định thành công {len(declared_evidences)} bằng chứng.")
                        return parsed
                except Exception as ex:
                    last_err = ex
                    continue
            print(f"[CV Verification] Gemini gặp lỗi ({last_err}). Chuyển sang Smart Fallback Auditor.")
        except Exception as e:
            print(f"[CV Verification] Lỗi khởi tạo Gemini ({e}). Kích hoạt Smart Fallback.")

    # Smart Fallback nếu không có Gemini
    return _smart_fallback_audit(cv_info, jd_info, declared_evidences)


def _smart_fallback_audit(
    cv_info: Dict[str, Any],
    jd_info: Dict[str, Any],
    declared_evidences: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Thuật toán thẩm định bằng chứng quy tắc thông minh (Rule-based Audit Engine).
    Đảm bảo 100% hoạt động offline, không bao giờ crash và giữ vững tính công bằng.
    """
    audited = []
    challenge_questions = []
    interview_probe_kit = []
    total_score = 0.0

    target_title = jd_info.get("title", "Lập trình viên")

    for idx, item in enumerate(declared_evidences):
        name = item.get("item_name", "").strip()
        pillar = item.get("pillar", "skills")
        ctx = item.get("context_type", "academic_project")
        desc = item.get("description", "").strip()
        link = item.get("reference_link", "").strip()

        desc_len = len(desc)
        has_link = bool(re.match(r"^https?://", link, re.IGNORECASE))
        has_tech_keywords = any(kw in desc.lower() for kw in ["api", "module", "tối ưu", "xử lý", "cơ sở dữ liệu", "test", "deploy", "ci/cd", "thuật toán", "framework"])

        # Đánh giá độ tin cậy
        if has_link and desc_len >= 40:
            cred = 0.90
            verdict = "verified_high"
            awarded_level = 3
            reason = f"Ứng viên cung cấp link tham chiếu hợp lệ ({link}) và mô tả kỹ thuật cụ thể ({desc_len} ký tự)."
        elif desc_len >= 50 or (desc_len >= 25 and has_tech_keywords):
            cred = 0.75
            verdict = "verified_plausible"
            awarded_level = 2
            reason = f"Mô tả nghiệp vụ và bài toán rõ ràng trong ngữ cảnh {ctx}."
        elif desc_len >= 15:
            cred = 0.45
            verdict = "partially_accepted"
            awarded_level = 1
            reason = "Mô tả còn ngắn gọn hoặc mang tính đại cương; được ghi nhận ở mức độ tiềm năng."
        else:
            cred = 0.20
            verdict = "insufficient"
            awarded_level = 0
            reason = "Thiếu thông tin mô tả kỹ thuật cụ thể hoặc bằng chứng đối chứng."

        total_score += cred
        audited.append({
            "criterion_name": name,
            "pillar": pillar,
            "credibility_score": cred,
            "verdict": verdict,
            "audit_reason": reason,
            "awarded_level": awarded_level,
            "evidence_quote": desc[:150] if desc else f"Khai báo bổ sung cho {name}"
        })

        # Tạo câu hỏi phỏng vấn probe kit cho Recruiter
        if pillar == "skills":
            interview_probe_kit.append(
                f"Kiểm tra kỹ năng '{name}': Đề nghị ứng viên trình bày kiến trúc module hoặc cách giải quyết vấn đề khó khăn nhất khi áp dụng {name} trong '{desc[:60]}...'"
            )
        elif pillar == "experience":
            interview_probe_kit.append(
                f"Xác minh kinh nghiệm '{name}': Đề nghị ứng viên chia sẻ về quy trình làm việc nhóm, công cụ quản lý tác vụ và đóng góp cụ thể tại tổ chức đã khai báo."
            )
        elif pillar == "projects":
            interview_probe_kit.append(
                f"Kiểm tra dự án '{name}': Yêu cầu ứng viên mở mã nguồn (hoặc demo) và giải thích luồng xử lý dữ liệu trọng tâm từ frontend đến backend."
            )
        else:
            interview_probe_kit.append(
                f"Xác minh học vấn/chứng chỉ '{name}': Yêu cầu ứng viên xuất trình chứng chỉ hoặc chia sẻ các kiến thức trọng tâm đã thi đạt."
            )

        # Tạo câu hỏi trắc nghiệm nhanh (Quick Tech Check) nếu có trong ngân hàng
        normalized_name = name.lower().strip()
        for bank_key, qdata in FALLBACK_TECH_QUESTION_BANK.items():
            if bank_key in normalized_name or normalized_name in bank_key:
                if len(challenge_questions) < 2 and not any(q["criterion_name"].lower() == bank_key for q in challenge_questions):
                    challenge_questions.append({
                        "id": f"q_{len(challenge_questions)+1}_{bank_key}",
                        "criterion_name": name,
                        "pillar": pillar,
                        "question": qdata["question"],
                        "options": qdata["options"],
                        "correct_index": qdata["correct_index"],
                        "explanation": qdata["explanation"]
                    })

    # Nếu chưa đủ 2 câu hỏi kỹ thuật, sinh câu hỏi tổng quát
    if len(challenge_questions) < 2:
        generic_questions = [
            {
                "id": "q_generic_git",
                "criterion_name": "Quy trình phát triển & Quản lý mã nguồn",
                "pillar": "skills",
                "question": "Khi làm việc nhóm trong dự án phần mềm theo mô hình Git Flow, lệnh nào được dùng để cập nhật các commit mới nhất từ nhánh remote 'main' vào nhánh feature hiện tại một cách an toàn?",
                "options": [
                    "git pull origin main (hoặc git fetch kết hợp git rebase origin/main)",
                    "git push --force origin main",
                    "git clean -fdx",
                    "git reset --hard HEAD~5"
                ],
                "correct_index": 0,
                "explanation": "git pull hoặc rebase từ main cập nhật lịch sử commit mới nhất mà không gây mất mát dữ liệu."
            },
            {
                "id": "q_generic_api",
                "criterion_name": "Kiến trúc API & Backend",
                "pillar": "skills",
                "question": "Mã trạng thái HTTP Status Code nào biểu thị tài nguyên được yêu cầu không tìm thấy trên hệ thống máy chủ?",
                "options": [
                    "404 Not Found",
                    "200 OK",
                    "500 Internal Server Error",
                    "401 Unauthorized"
                ],
                "correct_index": 0,
                "explanation": "404 Not Found là mã chuẩn thông báo endpoint hoặc dữ liệu không tồn tại."
            }
        ]
        for gq in generic_questions:
            if len(challenge_questions) < 2:
                challenge_questions.append(gq)

    overall_credibility = round(total_score / len(declared_evidences), 2) if declared_evidences else 1.0

    return {
        "audited_evidences": audited,
        "challenge_questions": challenge_questions,
        "interview_probe_kit": interview_probe_kit[:4],
        "overall_credibility": overall_credibility,
        "can_proceed": overall_credibility >= 0.35,
        "audit_notes": (
            f"Đã thẩm định {len(declared_evidences)} tiêu chí bổ sung. Độ tin cậy trung bình: {overall_credibility * 100:.0f}%. "
            f"Hệ thống đã chuẩn bị {len(challenge_questions)} câu hỏi kiểm chứng kỹ thuật và {len(interview_probe_kit)} câu hỏi phỏng vấn cho Nhà tuyển dụng."
        )
    }


def evaluate_challenge_answers(
    challenge_questions: List[Dict[str, Any]],
    user_answers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Chấm điểm bài kiểm chứng kỹ thuật nhanh của ứng viên.
    """
    if not challenge_questions:
        return {
            "score_percent": 100.0,
            "correct_count": 0,
            "total_count": 0,
            "details": [],
            "summary": "Không có câu hỏi kiểm chứng bắt buộc."
        }

    ans_map = {str(a.get("question_id")): int(a.get("selected_index", -1)) for a in user_answers}
    correct_count = 0
    details = []

    for q in challenge_questions:
        qid = str(q.get("id"))
        user_choice = ans_map.get(qid, -1)
        expected_choice = int(q.get("correct_index", 0))
        is_correct = (user_choice == expected_choice)

        if is_correct:
            correct_count += 1

        details.append({
            "question_id": qid,
            "criterion_name": q.get("criterion_name"),
            "question": q.get("question"),
            "user_choice": user_choice,
            "correct_choice": expected_choice,
            "is_correct": is_correct,
            "explanation": q.get("explanation")
        })

    score_pct = round((correct_count / len(challenge_questions)) * 100.0, 1) if challenge_questions else 100.0

    return {
        "score_percent": score_pct,
        "correct_count": correct_count,
        "total_count": len(challenge_questions),
        "details": details,
        "summary": f"Ứng viên trả lời đúng {correct_count}/{len(challenge_questions)} câu hỏi kiểm tra nhanh ({score_pct}%)."
    }
