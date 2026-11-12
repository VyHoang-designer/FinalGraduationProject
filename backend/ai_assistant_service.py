# ==============================================================================
# FILE: backend/ai_assistant_service.py
# MÔ TẢ: Dịch vụ AI Assistant Chatbot (Gemini LLM) tư vấn nghề nghiệp & tuyển dụng
# ==============================================================================
import os
import re
from typing import List, Dict, Optional

AI_ASSISTANT_SYSTEM_PROMPT = """Bạn là "AI Career Assistant" - Trợ lý Tuyển dụng & Hướng nghiệp thông minh thuộc nền tảng AI Matcher.

VAI TRÒ VÀ NHIỆM VỤ CỦA BẠN:
1. Hướng nghiệp & Việc làm:
   - Tư vấn định hướng nghề nghiệp ngành Công nghệ thông tin (Software Engineer, AI/ML, Data Engineer, DevOps/Cloud, QA/QC, Frontend, Backend, Mobile,...).
   - Đưa ra lời khuyên về lộ trình học tập, các kỹ năng trọng yếu cần có theo yêu cầu của thị trường hiện nay.
2. Tối ưu CV chuẩn ATS & AI Matching:
   - Hướng dẫn ứng viên cách viết CV mạch lạc, sử dụng các động từ hành động (action verbs), định lượng kết quả theo mô hình STAR.
   - Giải thích nguyên lý hệ thống AI Matching của AI Matcher (sử dụng Feature Registry, Semantic Search và Machine Learning để tính điểm tương đồng CV và JD).
3. Bí quyết phỏng vấn & Deal lương:
   - Tư vấn cách chuẩn bị cho các vòng phỏng vấn (phỏng vấn văn hóa, phỏng vấn kỹ thuật/live coding, phỏng vấn tình huống).
   - Hướng dẫn cách đàm phán mức lương, phúc lợi phù hợp với số năm kinh nghiệm và năng lực thực tế.
4. Hỗ trợ sử dụng nền tảng AI Matcher:
   - Tính năng "Tạo CV tự động cùng AI": Ứng viên nhập thông tin cơ bản, AI sẽ biên soạn CV chuẩn ATS.
   - Tính năng "Ứng tuyển ngay bằng AI": Tự động phân tích mức độ phù hợp và gửi hồ sơ đến Nhà tuyển dụng.
   - Tính năng "Liên hệ JD": Cho phép ứng viên gửi câu hỏi trực tiếp cho Nhà tuyển dụng của từng vị trí công việc.

PHONG CÁCH GIAO TIẾP:
- Ngôn ngữ: Tiếng Việt tự nhiên, lịch sự, chuyên nghiệp, khích lệ và tràn đầy năng lượng tích cực.
- Trình bày: Dùng các gạch đầu dòng rõ ràng, in đậm các ý quan trọng, chia đoạn ngắn gọn để người dùng dễ theo dõi trên giao diện chat.
- Tuyệt đối không trả lời các câu hỏi tiêu cực, độc hại hoặc không liên quan đến công việc/nghề nghiệp.
"""

# Fallback generator phòng khi mất mạng hoặc hết quota Gemini API
FALLBACK_RESPONSES = {
    "cv": (
        "💡 **Mẹo tối ưu CV chuẩn ATS đạt điểm cao trên AI Matcher:**\n\n"
        "1. **Cấu trúc rõ ràng:** Đặt các mục chính theo thứ tự: Thông tin liên hệ ➔ Tóm tắt mục tiêu ➔ Kỹ năng cốt lõi ➔ Dự án nổi bật ➔ Kinh nghiệm làm việc ➔ Học vấn.\n"
        "2. **Dùng động từ hành động (Action Verbs):** Khởi đầu mỗi gạch đầu dòng bằng các từ như *Thiết kế, Xây dựng, Tối ưu hóa, Triển khai, Tích hợp*.\n"
        "3. **Định lượng thành tích:** Nêu rõ số liệu cụ thể (ví dụ: *'Tăng 30% tốc độ truy vấn', 'Phục vụ 50.000 người dùng hoạt động'*).\n"
        "4. **Từ khóa bám sát JD:** Chú ý các kỹ năng kỹ thuật bắt buộc được nêu trong tin tuyển dụng để đưa vào CV.\n\n"
        "👉 Bạn có thể dùng tính năng **'Tạo CV tự động cùng AI'** trên thanh điều hướng để hệ thống tự động soạn thảo CV chuẩn ATS giúp bạn!"
    ),
    "phong_van": (
        "🎯 **Bí quyết vượt qua vòng phỏng vấn kỹ thuật & văn hóa:**\n\n"
        "1. **Áp dụng mô hình STAR:**\n"
        "   - **S (Situation):** Bối cảnh dự án/thử thách bạn gặp phải.\n"
        "   - **T (Task):** Nhiệm vụ cụ thể bạn cần hoàn thành.\n"
        "   - **A (Action):** Những hành động và công nghệ bạn đã áp dụng.\n"
        "   - **R (Result):** Kết quả cụ thể đạt được.\n"
        "2. **Nắm vững kiến thức nền tảng:** Ôn tập cấu trúc dữ liệu, giải thuật, kiến trúc hệ thống (System Design) và database.\n"
        "3. **Đặt câu hỏi ngược lại cho NTD:** Hỏi về văn hóa công ty, quy trình release dự án hoặc cơ hội đào tạo để thể hiện sự quan tâm thực sự."
    ),
    "luong": (
        "💰 **Kinh nghiệm deal lương hiệu quả cho ứng viên IT:**\n\n"
        "1. **Khảo sát thị trường:** Tìm hiểu mức lương trung bình cho vị trí và số năm kinh nghiệm của bạn trên các báo cáo thị trường IT.\n"
        "2. **Đưa ra khoảng lương (Range):** Nên đưa ra khoảng lương mong muốn (ví dụ: 25 - 30 triệu) thay vì một con số cố định, đặt mức thấp nhất là con số bạn sẵn sàng nhận.\n"
        "3. **Tập trung vào giá trị mang lại:** Thuyết phục NTD bằng năng lực giải quyết bài toán khó và tác động của bạn đối với sản phẩm."
    ),
    "ai_matcher": (
        "✨ **Giới thiệu về hệ thống AI Matcher:**\n\n"
        "AI Matcher là nền tảng kết nối ứng viên và nhà tuyển dụng thông minh:\n"
        "• **AI Matching Engine:** Sử dụng mô hình Machine Learning phân tích độ tương đồng ngữ nghĩa giữa CV và JD.\n"
        "• **Báo cáo Gap Analysis:** Chỉ ra chi tiết các kỹ năng bạn đã đáp ứng và các điểm cần bổ sung.\n"
        "• **Tạo CV chuẩn ATS:** Hỗ trợ biên soạn nội dung CV chuyên nghiệp chỉ sau vài cú click chuột.\n"
        "• **Kênh liên hệ trực tiếp:** Trao đổi thắc mắc trực tiếp với Nhà tuyển dụng của từng vị trí công việc."
    ),
    "default": (
        "Chào bạn! Tôi là **AI Career Assistant** của AI Matcher. 🤖\n\n"
        "Tôi có thể hỗ trợ bạn về:\n"
        "• Gợi ý cách viết CV chuẩn ATS để đạt điểm số AI Matching cao nhất.\n"
        "• Tư vấn định hướng nghề nghiệp IT và các kỹ năng hot nhất hiện nay.\n"
        "• Hướng dẫn trả lời phỏng vấn và đàm phán mức lương.\n"
        "• Giải đáp thắc mắc về các tính năng trên hệ thống AI Matcher.\n\n"
        "Hãy cho tôi biết bạn đang quan tâm hoặc gặp khó khăn ở phần nào nhé!"
    )
}

def get_smart_fallback(user_text: str) -> str:
    """Trả về câu trả lời thông minh dựa trên từ khóa nếu LLM API gặp sự cố."""
    text_lower = user_text.lower()
    if any(k in text_lower for k in ["cv", "resume", "hồ sơ", "viết cv", "ats"]):
        return FALLBACK_RESPONSES["cv"]
    if any(k in text_lower for k in ["phỏng vấn", "interview", "trả lời câu hỏi", "star"]):
        return FALLBACK_RESPONSES["phong_van"]
    if any(k in text_lower for k in ["lương", "salary", "deal lương", "đãi ngộ", "thu nhập"]):
        return FALLBACK_RESPONSES["luong"]
    if any(k in text_lower for k in ["ai matcher", "nền tảng", "tính năng", "match", "điểm"]):
        return FALLBACK_RESPONSES["ai_matcher"]
    return FALLBACK_RESPONSES["default"]

def chat_with_ai_assistant(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    user_context: Optional[Dict] = None
) -> str:
    """
    Xử lý hội thoại với Gemini LLM.
    Nếu API bị giới hạn quota hoặc lỗi, tự động chuyển sang Smart Fallback.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        print("[AI Assistant] Chưa cấu hình GEMINI_API_KEY, dùng Smart Fallback.")
        return get_smart_fallback(message)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # Xây dựng ngữ cảnh hội thoại
        formatted_contents = []
        if history:
            for item in history[-6:]: # Giữ 6 lượt hội thoại gần nhất
                role = "user" if item.get("role") == "user" else "model"
                text = item.get("content") or item.get("text") or ""
                if text.strip():
                    formatted_contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=text)]
                        )
                    )

        # Thêm câu hỏi hiện tại
        formatted_contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=message)]
            )
        )

        # Thử với danh sách các model khả dụng
        candidate_models = [model_name, "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]
        # Loại bỏ trùng lặp
        unique_models = []
        for m in candidate_models:
            if m and m not in unique_models:
                unique_models.append(m)

        last_error = None
        for m in unique_models:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=formatted_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=AI_ASSISTANT_SYSTEM_PROMPT,
                        temperature=0.7,
                        max_output_tokens=1000,
                    ),
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                last_error = e
                print(f"[AI Assistant] Model {m} gặp lỗi: {e}, thử model tiếp theo...")
                continue

        print(f"[AI Assistant] Tất cả model Gemini đều gặp lỗi: {last_error}. Chuyển sang Smart Fallback.")
        return get_smart_fallback(message)

    except Exception as e:
        print(f"[AI Assistant Service] Lỗi ngoại lệ: {e}. Dùng Smart Fallback.")
        return get_smart_fallback(message)

