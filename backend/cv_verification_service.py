# ==============================================================================
# FILE: backend/cv_verification_service.py
# MÔ TẢ: Dịch vụ Thẩm định Bằng chứng (Micro-Evidence) & Tạo Thử thách Kỹ thuật (Quick Tech Check)
# ==============================================================================
import os
import json
import re
import time
import hashlib
import mimetypes
from typing import Optional, Dict, Any, List

# Cache kết quả thẩm định ngắn hạn (15 phút) để không gọi lại Vision nhiều lần liên tiếp
_AUDIT_CACHE: Dict[str, Dict[str, Any]] = {}
_AUDIT_CACHE_TTL = 900

VERIFICATION_AUDITOR_SYSTEM_PROMPT = """Bạn là Trưởng ban Kiểm toán Kỹ thuật & Thẩm định Hồ sơ Ứng viên Công nghệ (Senior Technical Audit Officer).
Nhiệm vụ của bạn: Thẩm định CHẶT CHẼ tính trung thực, độ liên quan và độ sâu kỹ thuật của các thông tin năng lực & tệp minh chứng mà ứng viên BỔ SUNG THÊM ngoài CV gốc (Micro-Evidence Declaration).

NGUYÊN TẮC THẨM ĐỊNH KHÁCH QUAN & CHỐNG GIAN LẬN (ANTI-FRAUD & MULTIMODAL VERIFICATION):
1. KIỂM TRA NỘI DUNG THỰC TẾ CỦA HÌNH ẢNH / TÀI LIỆU ĐÍNH KÈM (BẮT BUỘC):
   - Khi ứng viên tải lên hình ảnh (JPG/PNG/WEBP) hoặc file PDF/DOCX cho một tiêu chí, bạn SẼ NHẬN ĐƯỢC trực tiếp hình ảnh đó hoặc nội dung văn bản trích xuất từ file.
   - Bạn PHẢI ĐỌC VÀ PHÂN TÍCH NỘI DUNG BÊN TRONG ẢNH/TÀI LIỆU đó để kiểm tra xem nó có THỰC SỰ CHỨNG MINH cho tiêu chí `item_name` mà ứng viên tích chọn hay không.
   - TUYỆT ĐỐI TỪ CHỐI NGAY LẬP TỨC (verdict = 'insufficient', credibility_score = 0.0, awarded_level = 0) nếu:
     * Hình ảnh hoặc tài liệu KHÔNG LIÊN QUAN đến tiêu chí đã chọn (Ví dụ: ứng viên tích chọn 'Dự án Automation Testing / Selenium / Playwright', nhưng ảnh đính kèm lại là ảnh xác nhận làm Lập trình viên Backend Node.js/Django ở công ty khác, hoặc ảnh chụp không liên quan, ảnh rác, meme, hóa đơn...).
     * Hình ảnh/tài liệu có nội dung không chứng minh được công nghệ/kỹ năng/số năm kinh nghiệm hay dự án đang khai báo.
     * Ảnh bị mờ nhòe không đọc được thông tin kiểm chứng.
   - Trong `audit_reason`, PHẢI NÊU RÕ bạn đã đọc/nhìn thấy thông tin gì bên trong tệp/ảnh đính kèm và tại sao nó KHỚP hay KHÔNG KHỚP với tiêu chí `item_name`.
2. ĐÁNH GIÁ MÔ TẢ VĂN BẢN & LINK:
   - Nếu không đính kèm file hợp lệ và chỉ nêu chung chung ("em có biết sơ qua", "đã đọc tài liệu", không có bài toán kỹ thuật/link):
     -> Chấm credibility_score <= 0.25, verdict = 'insufficient', awarded_level = 0.
   - CHỈ CHẤP NHẬN (credibility_score >= 0.70, verdict = 'verified_plausible' hoặc 'verified_high', awarded_level >= 2) khi nội dung tệp/ảnh HOẶC mô tả chuyên sâu + link khớp TRỰC TIẾP với tiêu chí đã chọn.
3. KIỂM TRA TÍNH NHẤT QUÁN THỜI GIAN (Timeline Consistency):
   - Mốc thời gian làm việc hoặc hoàn thành dự án bổ sung không được mâu thuẫn phi lý với quá trình học tập / công tác trong CV gốc.
4. TẠO CÂU HỎI THỬ THÁCH NHANH (Quick Tech Check):
   - Với các kỹ năng/công nghệ bổ sung cốt lõi, tạo 2 câu hỏi trắc nghiệm thực hành ngắn (mỗi câu 4 đáp án A, B, C, D) hỏi về tình huống thực tế hoặc cú pháp/kiến trúc chuẩn.
5. TẠO BỘ CÂU HỎI PHỎNG VẤN KIỂM CHỨNG (Interview Probe Kit):
   - Sinh 3-4 câu hỏi phỏng vấn đào sâu dành cho Nhà tuyển dụng để kiểm chứng trực tiếp.
6. ĐỊNH DẠNG:
   - Trả về DUY NHẤT một khối JSON hợp lệ theo đúng schema hướng dẫn.
"""


def _extract_evidence_artifact(file_url: Optional[str]) -> Dict[str, Any]:
    """
    Đọc tệp minh chứng thực tế từ ổ đĩa (backend/uploads/evidence/...).
    Hỗ trợ Ảnh (bytes + mime_type), PDF (text hoặc render ảnh trang đầu), và DOCX (text).
    """
    if not file_url or not isinstance(file_url, str):
        return {"found": False, "is_image": False, "mime_type": None, "bytes": None, "text": ""}

    clean_rel = file_url.strip().lstrip("/")
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(backend_dir, clean_rel)

    if not os.path.exists(file_path):
        # Fallback nếu file_url không chứa prefix đúng
        file_path = os.path.join(backend_dir, "uploads", "evidence", os.path.basename(clean_rel))

    if not os.path.exists(file_path):
        return {"found": False, "is_image": False, "mime_type": None, "bytes": None, "text": ""}

    ext = os.path.splitext(file_path)[1].lower()
    mime_type, _ = mimetypes.guess_type(file_path)

    # 1. Xử lý hình ảnh trực tiếp
    if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        if not mime_type:
            mime_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else f"image/{ext.lstrip('.')}"
        try:
            with open(file_path, "rb") as f:
                img_bytes = f.read()
            return {"found": True, "is_image": True, "mime_type": mime_type, "bytes": img_bytes, "text": ""}
        except Exception as e:
            print(f"[CV Verification] Lỗi đọc file ảnh {file_path}: {e}")
            return {"found": False, "is_image": False, "mime_type": None, "bytes": None, "text": ""}

    # 2. Xử lý PDF
    if ext == ".pdf":
        extracted_text = ""
        first_page_png = None
        try:
            import fitz
            doc = fitz.open(file_path)
            texts = []
            for i in range(min(3, len(doc))):
                texts.append(doc[i].get_text("text"))
            extracted_text = "\n".join(texts).strip()
            # Nếu là PDF dạng ảnh scan (ít hơn 30 ký tự), render trang đầu thành PNG để gửi Gemini Vision
            if len(extracted_text) < 30 and len(doc) > 0:
                pix = doc[0].get_pixmap(dpi=150)
                first_page_png = pix.tobytes("png")
            doc.close()
        except Exception as e:
            print(f"[CV Verification] Lỗi đọc PDF {file_path}: {e}")

        if first_page_png:
            return {"found": True, "is_image": True, "mime_type": "image/png", "bytes": first_page_png, "text": extracted_text}
        return {"found": True, "is_image": False, "mime_type": "application/pdf", "bytes": None, "text": extracted_text[:3000]}

    # 3. Xử lý Word (.docx)
    if ext in [".docx", ".doc"]:
        extracted_text = ""
        try:
            import docx
            d = docx.Document(file_path)
            parts = [p.text for p in d.paragraphs if p.text.strip()]
            for tbl in d.tables:
                for row in tbl.rows:
                    parts.append(" | ".join(c.text.strip() for c in row.cells if c.text.strip()))
            extracted_text = "\n".join(parts).strip()
        except Exception as e:
            print(f"[CV Verification] Lỗi đọc DOCX {file_path}: {e}")
        return {"found": True, "is_image": False, "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "bytes": None, "text": extracted_text[:3000]}

    return {"found": False, "is_image": False, "mime_type": None, "bytes": None, "text": ""}

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


def _compute_audit_cache_key(cv_info: Dict[str, Any], jd_info: Dict[str, Any], declared_evidences: List[Dict[str, Any]]) -> str:
    payload = {
        "cv_snippet": (cv_info.get("cv_text") or "")[:300],
        "jd_title": jd_info.get("title", ""),
        "evidences": [
            {
                "pillar": e.get("pillar"),
                "item_name": e.get("item_name"),
                "description": e.get("description"),
                "reference_link": e.get("reference_link"),
                "evidence_file_url": e.get("evidence_file_url"),
            }
            for e in declared_evidences
        ],
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def audit_candidate_evidence_and_create_challenges(
    cv_info: Dict[str, Any],
    jd_info: Dict[str, Any],
    declared_evidences: List[Dict[str, Any]],
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Thẩm định toàn diện danh sách bằng chứng ứng viên khai báo thêm (kể cả đọc nội dung ảnh/PDF/DOCX thực tế)
    và sinh bài kiểm tra nhanh (Quick Tech Check).
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

    # Kiểm tra Cache để không gọi Gemini Vision 2 lần liên tiếp cho cùng bộ hồ sơ
    cache_key = _compute_audit_cache_key(cv_info, jd_info, declared_evidences)
    cached = _AUDIT_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"] < _AUDIT_CACHE_TTL):
        print("[CV Verification] Trả về kết quả thẩm định từ Cache (0ms).")
        return cached["data"]

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Đọc trước toàn bộ nội dung tệp minh chứng (ảnh / PDF / DOCX)
    enriched_evidences = []
    visual_attachments = []  # Danh sách (item_name, pillar, file_name, bytes, mime_type)

    for ev in declared_evidences:
        ev_copy = dict(ev)
        file_url = (ev.get("evidence_file_url") or "").strip()
        file_name = (ev.get("evidence_file_name") or "").strip()
        if file_url:
            artifact = _extract_evidence_artifact(file_url)
            ev_copy["_artifact_found"] = artifact["found"]
            if artifact["text"]:
                ev_copy["extracted_document_text"] = artifact["text"]
            if artifact["is_image"] and artifact["bytes"]:
                ev_copy["has_attached_image"] = True
                visual_attachments.append({
                    "item_name": ev.get("item_name", ""),
                    "pillar": ev.get("pillar", "skills"),
                    "file_name": file_name or os.path.basename(file_url),
                    "bytes": artifact["bytes"],
                    "mime_type": artifact["mime_type"],
                })
            elif artifact["found"]:
                ev_copy["has_attached_document"] = True
        enriched_evidences.append(ev_copy)

    prompt_payload = {
        "target_job": {
            "title": jd_info.get("title", ""),
            "department": jd_info.get("department", ""),
            "required_experience": jd_info.get("required_experience", 0.0),
            "required_skills": jd_info.get("required_skills", []),
            "jd_text_summary": (jd_info.get("jd_text") or "")[:1200]
        },
        "original_cv_summary": {
            "full_name": cv_info.get("full_name", ""),
            "education": cv_info.get("education", ""),
            "experience_years": cv_info.get("experience_years", 0.0),
            "skills": cv_info.get("parsed_skills", []),
            "projects_count": len(cv_info.get("project_descriptions", []) or []),
            "cv_snippet": (cv_info.get("cv_text") or "")[:1000]
        },
        "declared_evidences": enriched_evidences,
        "custom_instructions": custom_instructions or ""
    }

    schema_instruction = """
Hãy đối chiếu kỹ nội dung HÌNH ẢNH ĐÍNH KÈM / VĂN BẢN TÀI LIỆU với từng tiêu chí `item_name` mà ứng viên khai báo, sau đó trả về JSON theo đúng định dạng sau:
{
  "audited_evidences": [
    {
      "criterion_name": "Tên kỹ năng/kinh nghiệm/dự án khai báo (khớp chính xác item_name)",
      "pillar": "skills | experience | projects | education",
      "credibility_score": 0.0,
      "verdict": "verified_high | verified_plausible | partially_accepted | insufficient",
      "audit_reason": "Chỉ rõ bạn đọc/nhìn thấy gì trong ảnh/tài liệu và giải thích rõ ràng lý do Chấp nhận hay Từ chối (nếu không liên quan phải ghi rõ nội dung thực tế trong ảnh nói về gì và từ chối).",
      "awarded_level": 0,
      "evidence_quote": "Trích dẫn tóm tắt nội dung chứng minh thực tế từ ảnh/tài liệu hoặc mô tả"
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
  "overall_credibility": 0.0,
  "can_proceed": false,
  "audit_notes": "Nhận xét tổng quan trung thực về tính hợp lệ và độ khớp nội dung của các bằng chứng bổ sung"
}
"""

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            full_prompt_text = (
                f"DỮ LIỆU ĐỐI SOÁNH THẨM ĐỊNH:\n"
                f"{json.dumps(prompt_payload, ensure_ascii=False, indent=2)}\n\n"
                f"{schema_instruction}"
            )

            # Lắp ghép Multimodal Contents (Văn bản + Hình ảnh thực tế đính kèm)
            multimodal_contents: List[Any] = [full_prompt_text]
            for va in visual_attachments:
                multimodal_contents.append(
                    f"\n--- ĐÂY LÀ HÌNH ẢNH MINH CHỨNG ĐÍNH KÈM CHO TIÊU CHÍ: '{va['item_name']}' (Nhóm: {va['pillar']}, Tên file: {va['file_name']}). Hãy đọc chữ trong ảnh này để xác minh xem có đúng chứng minh cho '{va['item_name']}' không! ---"
                )
                multimodal_contents.append(
                    types.Part.from_bytes(data=va["bytes"], mime_type=va["mime_type"])
                )

            candidate_models = ["gemini-2.5-flash", model_name, "gemini-2.0-flash", "gemini-1.5-flash"]
            # Loại bỏ trùng lặp nhưng giữ thứ tự ưu tiên gemini-2.5-flash (hỗ trợ Vision cực tốt)
            seen_m = set()
            unique_models = [m for m in candidate_models if m and not (m in seen_m or seen_m.add(m))]
            last_err = None

            for m in unique_models:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=multimodal_contents,
                        config=types.GenerateContentConfig(
                            system_instruction=VERIFICATION_AUDITOR_SYSTEM_PROMPT,
                            response_mime_type="application/json",
                            temperature=0.1,
                        ),
                    )
                    if response and response.text:
                        cleaned = response.text.strip()
                        if cleaned.startswith("```"):
                            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                            cleaned = re.sub(r"\s*```$", "", cleaned)
                        parsed = json.loads(cleaned)

                        # Gắn lại URL & tên file gốc để hiển thị cho Recruiter/Candidate (KHÔNG ép điểm!)
                        file_lookup = {}
                        for de in declared_evidences:
                            k = (de.get("item_name") or "").strip().lower()
                            file_lookup[k] = {
                                "url": de.get("evidence_file_url"),
                                "name": de.get("evidence_file_name")
                            }

                        audited_ev_list = parsed.get("audited_evidences", [])
                        valid_count = 0
                        total_cred = 0.0
                        for ae in audited_ev_list:
                            ck = (ae.get("criterion_name") or "").strip().lower()
                            if ck in file_lookup and file_lookup[ck]["url"]:
                                ae["evidence_file_url"] = file_lookup[ck]["url"]
                                ae["evidence_file_name"] = file_lookup[ck]["name"]
                            c_score = float(ae.get("credibility_score", 0.0))
                            total_cred += c_score
                            if ae.get("verdict") != "insufficient" and c_score >= 0.5:
                                valid_count += 1

                        if audited_ev_list:
                            parsed["overall_credibility"] = round(total_cred / len(audited_ev_list), 2)
                            parsed["can_proceed"] = valid_count > 0

                        _AUDIT_CACHE[cache_key] = {"ts": time.time(), "data": parsed}
                        print(f"[CV Verification] Gemini Vision ({m}) đã thẩm định {len(declared_evidences)} bằng chứng (Hợp lệ: {valid_count}/{len(audited_ev_list)}).")
                        return parsed
                except Exception as ex:
                    last_err = ex
                    continue
            print(f"[CV Verification] Gemini gặp lỗi ({last_err}). Chuyển sang Smart Fallback Auditor.")
        except Exception as e:
            print(f"[CV Verification] Lỗi khởi tạo Gemini ({e}). Kích hoạt Smart Fallback.")

    # Smart Fallback nếu không kết nối được Gemini
    fallback_res = _smart_fallback_audit(cv_info, jd_info, enriched_evidences)
    _AUDIT_CACHE[cache_key] = {"ts": time.time(), "data": fallback_res}
    return fallback_res


def _check_keyword_relevance(criterion_name: str, text_corpus: str) -> bool:
    """
    Kiểm tra xem nội dung text (mô tả + văn bản trích xuất từ PDF/DOCX)
    có thực sự chứa từ khóa kỹ thuật liên quan đến tiêu chí đang xét hay không.
    """
    if not text_corpus or not criterion_name:
        return False
    corpus_low = text_corpus.lower()
    crit_low = criterion_name.lower()

    # Ánh xạ các nhóm từ khóa đồng nghĩa / cùng chuyên ngành
    DOMAIN_SYNONYMS = {
        "automation": ["automation", "selenium", "playwright", "cypress", "appium", "katalon", "test", "testing", "qa", "qc", "pytest", "webdriver"],
        "testing": ["test", "testing", "qa", "qc", "selenium", "playwright", "cypress", "postman", "jmeter", "automation", "kiểm thử"],
        "selenium": ["selenium", "webdriver", "automation", "testing", "test"],
        "playwright": ["playwright", "automation", "testing", "e2e"],
        "postman": ["postman", "api testing", "rest api", "swagger", "http", "endpoint"],
        "ci/cd": ["ci/cd", "jenkins", "github actions", "gitlab ci", "docker", "pipeline", "deploy"],
        "fastapi": ["fastapi", "python", "pydantic", "uvicorn", "api", "router"],
        "postgresql": ["postgresql", "postgres", "sql", "database", "cơ sở dữ liệu", "query"],
        "redis": ["redis", "cache", "in-memory", "pub/sub"],
        "react": ["react", "jsx", "tsx", "hooks", "frontend", "component", "redux"],
        "docker": ["docker", "container", "dockerfile", "compose", "image"],
        "kinh nghiệm": ["năm", "tháng", "công ty", "nhân viên", "lập trình", "developer", "engineer", "qa", "tester", "chuyên viên", "kinh nghiệm"],
        "học vấn": ["đại học", "cao đẳng", "bằng", "cử nhân", "kỹ sư", "gpa", "chứng chỉ", "ielts", "toeic", "chứng nhận", "tốt nghiệp"],
        "bằng cấp": ["đại học", "cao đẳng", "bằng", "cử nhân", "kỹ sư", "chứng chỉ", "chứng nhận", "tốt nghiệp"],
    }

    target_tokens = set()
    # Bóc các từ có nghĩa từ tên tiêu chí (bỏ stopword tiếng Việt thông thường)
    stopwords = {"dự", "án", "thực", "tế", "về", "kỹ", "năng", "kinh", "nghiệm", "làm", "việc", "học", "vấn", "và", "bằng", "cấp", "yêu", "cầu", "của", "cho", "năm"}
    for w in re.findall(r"[a-zA-Z0-9\+\#\.\/]+", crit_low):
        if len(w) >= 2 and w not in stopwords:
            target_tokens.add(w)
            if w in DOMAIN_SYNONYMS:
                target_tokens.update(DOMAIN_SYNONYMS[w])

    for key, syns in DOMAIN_SYNONYMS.items():
        if key in crit_low:
            target_tokens.update(syns)

    if not target_tokens:
        return len(corpus_low.strip()) >= 25

    return any(tok in corpus_low for tok in target_tokens)


def _smart_fallback_audit(
    cv_info: Dict[str, Any],
    jd_info: Dict[str, Any],
    declared_evidences: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Thuật toán thẩm định bằng chứng quy tắc thông minh (Rule-based Audit Engine).
    Không bao giờ tự động cho điểm file đính kèm nếu không có bằng chứng khớp nội dung!
    """
    audited = []
    challenge_questions = []
    interview_probe_kit = []
    total_score = 0.0
    valid_count = 0

    for idx, item in enumerate(declared_evidences):
        name = (item.get("item_name") or "").strip()
        pillar = item.get("pillar", "skills")
        ctx = item.get("context_type", "academic_project")
        desc = (item.get("description") or "").strip()
        link = (item.get("reference_link") or "").strip()

        desc_len = len(desc)
        file_url = (item.get("evidence_file_url") or "").strip()
        file_name = (item.get("evidence_file_name") or "").strip()
        extracted_text = (item.get("extracted_document_text") or "").strip()
        if not extracted_text and file_url:
            art = _extract_evidence_artifact(file_url)
            extracted_text = (art.get("text") or "").strip()

        has_file = bool(file_url)
        has_link = bool(re.match(r"^https?://", link, re.IGNORECASE))
        combined_text = f"{desc} {extracted_text}".strip()
        is_relevant = _check_keyword_relevance(name, combined_text)

        # Kiểm tra chặt chẽ tính liên quan trước khi chấm điểm!
        if has_file:
            if extracted_text:
                # Nếu là file PDF/DOCX có text nhưng text không chứa bất kỳ từ khóa liên quan nào -> TỪ CHỐI!
                if not is_relevant:
                    cred = 0.10
                    verdict = "insufficient"
                    awarded_level = 0
                    reason = f"Từ chối: Nội dung văn bản trong tệp '{file_name or 'tài liệu'}' KHÔNG chứa thông tin hoặc từ khóa liên quan đến tiêu chí '{name}'."
                else:
                    cred = 0.88
                    verdict = "verified_high"
                    awarded_level = 3
                    reason = f"Tệp tài liệu '{file_name}' có nội dung trùng khớp trực tiếp với tiêu chí '{name}'."
            else:
                # File hình ảnh hoặc PDF scan khi offline fallback (Gemini Vision lỗi)
                if desc_len >= 20 and is_relevant:
                    cred = 0.70
                    verdict = "verified_plausible"
                    awarded_level = 2
                    reason = f"Đã đính kèm hình ảnh '{file_name}' kèm mô tả kỹ thuật liên quan đến '{name}' (cần HR đối chiếu thêm ảnh)."
                else:
                    cred = 0.15
                    verdict = "insufficient"
                    awarded_level = 0
                    reason = f"Không thể xác nhận tính liên quan: Tệp ảnh '{file_name}' chưa được AI Vision xác nhận khớp với '{name}' và thiếu mô tả chi tiết khớp chuyên môn."
        elif has_link and desc_len >= 30 and is_relevant:
            cred = 0.85
            verdict = "verified_high"
            awarded_level = 3
            reason = f"Ứng viên cung cấp link tham chiếu ({link}) và mô tả kỹ thuật khớp với tiêu chí '{name}'."
        elif desc_len >= 35 and is_relevant:
            cred = 0.72
            verdict = "verified_plausible"
            awarded_level = 2
            reason = f"Mô tả bài toán thực tế phù hợp với tiêu chí '{name}' trong ngữ cảnh {ctx}."
        elif desc_len >= 15 and not is_relevant:
            cred = 0.15
            verdict = "insufficient"
            awarded_level = 0
            reason = f"Mô tả kỹ thuật không nhắc tới hoặc không chứng minh được tiêu chí '{name}'."
        else:
            cred = 0.15
            verdict = "insufficient"
            awarded_level = 0
            reason = f"Thiếu thông tin mô tả cụ thể hoặc bằng chứng đối chứng hợp lệ cho '{name}'."

        if verdict != "insufficient" and cred >= 0.5:
            valid_count += 1

        total_score += cred
        audited.append({
            "criterion_name": name,
            "pillar": pillar,
            "credibility_score": cred,
            "verdict": verdict,
            "audit_reason": reason,
            "awarded_level": awarded_level,
            "evidence_quote": (extracted_text[:150] if extracted_text else (desc[:150] if desc else f"Tệp: {file_name or name}")),
            "evidence_file_url": file_url or None,
            "evidence_file_name": file_name or None
        })

        # Tạo câu hỏi phỏng vấn probe kit cho Recruiter
        if pillar == "skills":
            interview_probe_kit.append(
                f"Kiểm tra kỹ năng '{name}': Đề nghị ứng viên trình bày kiến trúc module hoặc cách giải quyết vấn đề khó khăn nhất khi áp dụng {name}."
            )
        elif pillar == "experience":
            interview_probe_kit.append(
                f"Xác minh kinh nghiệm '{name}': Đề nghị ứng viên xuất trình giấy xác nhận / chia sẻ đóng góp cụ thể tại tổ chức đã khai báo."
            )
        elif pillar == "projects":
            interview_probe_kit.append(
                f"Kiểm tra dự án '{name}': Yêu cầu ứng viên mở mã nguồn (hoặc demo) và giải thích luồng xử lý trọng tâm."
            )
        else:
            interview_probe_kit.append(
                f"Xác minh học vấn/chứng chỉ '{name}': Yêu cầu ứng viên xuất trình bản chính bằng cấp / chứng chỉ để đối chiếu."
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
        "can_proceed": valid_count > 0,
        "audit_notes": (
            f"Đã thẩm định {len(declared_evidences)} tiêu chí bổ sung (Hợp lệ: {valid_count}/{len(declared_evidences)}). "
            f"Độ tin cậy trung bình: {overall_credibility * 100:.0f}%."
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
