# ==============================================================================
# FILE: custom_extractors.py
# MÔ TẢ: Plugin Layer - Tiêu chí đánh giá tùy biến (Plug-and-Play)
# KIẾN TRÚC: Mỗi hàm là một extractor độc lập, đăng ký vào pipeline khi cần
# TÁC GIẢ: Senior ML Engineer
# ==============================================================================
"""
Module mở rộng chứa các tiêu chí đánh giá tùy biến.

Đây là minh họa cách thêm tiêu chí MỚI vào hệ thống mà KHÔNG cần sửa đổi
mã nguồn lõi (feature_registry.py). Chỉ cần:
  1. Viết hàm nhận (cv_data, jd_data) → trả về giá trị số
  2. Gọi pipeline.dang_ky_tieu_chi("Tên", hàm) hoặc dùng decorator

3 tiêu chí mở rộng trong file này:
  - Has_English_Cert : Phát hiện chứng chỉ tiếng Anh (IELTS, TOEIC, TOEFL...)
  - Has_Leadership   : Phát hiện kinh nghiệm quản lý / lãnh đạo
  - Has_Award        : Phát hiện giải thưởng, thành tích nổi bật
"""

import re


# ==============================================================================
# TIÊU CHÍ MỞ RỘNG 1: Has_English_Cert
# ==============================================================================
def trich_xuat_has_english_cert(cv_data, jd_data):
    """Ứng viên có chứng chỉ tiếng Anh quốc tế không (1 = có, 0 = không)."""
    cv_text = cv_data.get("cv_text", "").lower()

    # ---- Nhóm 1: Chứng chỉ quốc tế có điểm số ----
    # Ví dụ: "IELTS 7.5", "TOEIC 850", "TOEFL iBT 100"
    chung_chi_co_diem = [
        r"ielts\s*[\d\.]+",
        r"toeic\s*[\d]+",
        r"toefl\s*(?:ibt|pbt)?\s*[\d]+",
    ]
    for pattern in chung_chi_co_diem:
        if re.search(pattern, cv_text):
            return 1

    # ---- Nhóm 2: Tên chứng chỉ (không cần điểm số) ----
    chung_chi_ten = [
        "ielts", "toeic", "toefl", "cambridge",
        "cefr", "aptis", "duolingo english test",
        "vstep",  # Chứng chỉ tiếng Anh nội địa Việt Nam
        "b1", "b2", "c1", "c2",  # Cấp độ CEFR
        "chứng chỉ tiếng anh", "chứng chỉ anh ngữ",
        "english certificate", "english proficiency",
        "english certification",
    ]
    if any(cert in cv_text for cert in chung_chi_ten):
        return 1

    return 0


# ==============================================================================
# TIÊU CHÍ MỞ RỘNG 2: Has_Leadership
# ==============================================================================
def trich_xuat_has_leadership(cv_data, jd_data):
    """Ứng viên có kinh nghiệm quản lý / lãnh đạo không (1 = có, 0 = không)."""
    cv_text = cv_data.get("cv_text", "").lower()

    tu_khoa_lanh_dao = [
        # Tiếng Việt
        "trưởng nhóm", "trưởng phòng", "quản lý dự án", "team lead",
        "nhóm trưởng", "phó phòng", "giám đốc", "cto", "ceo",
        "quản lý đội ngũ", "điều hành", "dẫn dắt đội",
        "quản lý nhóm", "lead developer", "tech lead",
        # Tiếng Anh
        "team leader", "project manager", "engineering manager",
        "tech lead", "lead engineer", "lead developer",
        "head of", "director of", "vp of engineering",
        "scrum master", "product owner", "squad lead",
        "managed a team", "led a team", "leading a team",
        "mentoring", "mentor",
    ]

    if any(keyword in cv_text for keyword in tu_khoa_lanh_dao):
        return 1

    # Phát hiện pattern dạng "quản lý X người" / "leading X members"
    pattern_so_nguoi = [
        r"(?:quản lý|dẫn dắt|lead|managed|leading)\s+(?:nhóm\s+)?\d+\s*(?:người|members|engineers|developers)",
        r"\d+\s*(?:người|members)\s+(?:team|nhóm)",
    ]
    for pattern in pattern_so_nguoi:
        if re.search(pattern, cv_text):
            return 1

    return 0


# ==============================================================================
# TIÊU CHÍ MỞ RỘNG 3: Has_Award
# ==============================================================================
def trich_xuat_has_award(cv_data, jd_data):
    """Ứng viên có giải thưởng / thành tích nổi bật không (1 = có, 0 = không)."""
    cv_text = cv_data.get("cv_text", "").lower()

    tu_khoa_giai_thuong = [
        # Tiếng Việt
        "giải nhất", "giải nhì", "giải ba", "giải khuyến khích",
        "giải thưởng", "xuất sắc", "thành tích", "danh hiệu",
        "sinh viên giỏi", "sinh viên xuất sắc", "thủ khoa",
        "top", "hạng nhất", "hạng nhì",
        "học bổng", "scholarship",
        # Tiếng Anh
        "award", "winner", "first prize", "second prize",
        "third prize", "hackathon", "competition winner",
        "best paper", "honor", "honours", "dean's list",
        "cum laude", "magna cum laude", "summa cum laude",
        "outstanding", "excellence", "gold medal", "silver medal",
        "certified", "certification of excellence",
        "employee of the", "star performer",
    ]

    if any(keyword in cv_text for keyword in tu_khoa_giai_thuong):
        return 1

    return 0


# ==============================================================================
# HÀM TIỆN ÍCH: Đăng ký tất cả tiêu chí mở rộng vào pipeline
# ==============================================================================
def dang_ky_tat_ca_tieu_chi_mo_rong(pipeline):
    """
    Plug tất cả custom extractors vào một DynamicFeaturePipeline.

    Args:
        pipeline (DynamicFeaturePipeline): Pipeline cần mở rộng.

    Ví dụ:
        from feature_registry import tao_pipeline_mac_dinh
        from custom_extractors import dang_ky_tat_ca_tieu_chi_mo_rong

        pipeline = tao_pipeline_mac_dinh()
        dang_ky_tat_ca_tieu_chi_mo_rong(pipeline)
    """
    pipeline.dang_ky_tieu_chi("Has_English_Cert", trich_xuat_has_english_cert)
    pipeline.dang_ky_tieu_chi("Has_Leadership",   trich_xuat_has_leadership)
    pipeline.dang_ky_tieu_chi("Has_Award",        trich_xuat_has_award)

    print("   [Plugin] Đã đăng ký 3 tiêu chí mở rộng: "
          "Has_English_Cert, Has_Leadership, Has_Award")


# ==============================================================================
# SELF-TEST
# ==============================================================================
if __name__ == "__main__":
    # Import pipeline lõi
    from feature_registry import DynamicFeaturePipeline

    print("=" * 70)
    print("  KIỂM THỬ NHANH: custom_extractors.py (Plugin Layer)")
    print("=" * 70)

    # Tạo pipeline trống, chỉ đăng ký tiêu chí mở rộng
    pipeline = DynamicFeaturePipeline()
    dang_ky_tat_ca_tieu_chi_mo_rong(pipeline)
    pipeline.hien_thi_tieu_chi_da_dang_ky()

    # CV mẫu với các thông tin đặc thù
    cv_test = {
        "cv_text": """
        Họ và tên: Nguyễn Văn A
        Chứng chỉ: IELTS 7.0, đạt trình độ B2 theo khung CEFR.
        Kinh nghiệm: Team Lead nhóm Backend gồm 5 người tại công ty XYZ.
        Thành tích: Đạt giải nhất cuộc thi Hackathon AI 2024.
        Học bổng toàn phần ngành CNTT.
        """,
    }

    jd_test = {
        "jd_text": "Looking for a Senior Backend Developer with leadership experience.",
    }

    ket_qua = pipeline.tinh_toan_toan_bo_tieu_chi(cv_test, jd_test)

    print(f"\n{'─'*50}")
    print(f"  KẾT QUẢ TIÊU CHÍ MỞ RỘNG")
    print(f"{'─'*50}")
    for ten, gia_tri in ket_qua.items():
        trang_thai = "✓ CÓ" if gia_tri == 1 else "✗ KHÔNG"
        print(f"  {ten:<25}: {gia_tri}  ({trang_thai})")
    print(f"{'─'*50}")
