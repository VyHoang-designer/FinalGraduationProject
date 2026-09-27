# ==============================================================================
# FILE: run_feature_pipeline.py
# MÔ TẢ: End-to-End Orchestrator - Demo luồng hoàn chỉnh Feature Registry
# KIẾN TRÚC: Kết hợp Core (feature_registry) + Plugin (custom_extractors) + RF Model
# TÁC GIẢ: Senior ML Engineer
# ==============================================================================
"""
File điều phối chính: Chạy toàn bộ luồng CV-JD Matching từ đầu đến cuối.

Luồng xử lý:
  1. Khởi tạo DynamicFeaturePipeline với 6 tiêu chí built-in
  2. Plug-in thêm 3 tiêu chí mở rộng từ custom_extractors
  3. Hiển thị toàn bộ registry
  4. Trích xuất features từ cặp CV/JD thực tế
  5. Dự đoán điểm bằng Random Forest model đã train
  6. In báo cáo kết quả chi tiết
"""

import json
import os

import joblib
import pandas as pd

# Import kiến trúc Feature Registry
from feature_registry import tao_pipeline_mac_dinh
from custom_extractors import dang_ky_tat_ca_tieu_chi_mo_rong

# ==============================================================================
# CẤU HÌNH ĐƯỜNG DẪN
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model_artifacts")
MODEL_FILE = os.path.join(MODEL_DIR, "rf_matcher_model.joblib")
FEATURE_LIST_FILE = os.path.join(MODEL_DIR, "active_features.json")


# ==============================================================================
# 1. KHỞI TẠO PIPELINE
# ==============================================================================
def khoi_tao_pipeline():
    """Tạo pipeline hoàn chỉnh: built-in + custom extractors."""
    print("\n" + "=" * 70)
    print("  BƯỚC 1: KHỞI TẠO FEATURE REGISTRY PIPELINE")
    print("=" * 70)

    # Bước 1a: Tạo pipeline với 6 tiêu chí built-in
    print("\n>> Đang khởi tạo pipeline mặc định (6 tiêu chí built-in)...")
    pipeline = tao_pipeline_mac_dinh()

    # Bước 1b: Plug-in thêm tiêu chí mở rộng
    print(">> Đang đăng ký tiêu chí mở rộng từ custom_extractors...")
    dang_ky_tat_ca_tieu_chi_mo_rong(pipeline)

    # Bước 1c: Hiển thị toàn bộ registry
    pipeline.hien_thi_tieu_chi_da_dang_ky()

    return pipeline


# ==============================================================================
# 2. NẠP MÔ HÌNH RANDOM FOREST
# ==============================================================================
def nap_mo_hinh_rf():
    """Load mô hình RF và danh sách features đã train."""
    print("\n" + "=" * 70)
    print("  BƯỚC 2: NẠP MÔ HÌNH RANDOM FOREST")
    print("=" * 70)

    if not os.path.exists(MODEL_FILE):
        print(f"   CẢNH BÁO: Không tìm thấy mô hình tại '{MODEL_FILE}'")
        print(f"   -> Hãy chạy 'python auto_train_rf.py' trước để huấn luyện mô hình.")
        return None, None

    rf_model = joblib.load(MODEL_FILE)
    print(f"   ✓ Đã load mô hình RF từ: {MODEL_FILE}")

    with open(FEATURE_LIST_FILE, "r", encoding="utf-8") as f:
        active_features = json.load(f)
    print(f"   ✓ Danh sách tiêu chí mô hình đã học: {active_features}")

    return rf_model, active_features


# ==============================================================================
# 3. DỰ ĐOÁN ĐIỂM PHÙ HỢP
# ==============================================================================
def du_doan_diem(rf_model, active_features, extracted_features):
    """
    Dự đoán Match Score dùng RF model.
    
    Tự động căn chỉnh thứ tự features theo đúng thứ tự mô hình yêu cầu.
    Tiêu chí mà pipeline trích xuất được nhưng model chưa học → bỏ qua.
    Tiêu chí mà model cần nhưng pipeline chưa trích xuất → mặc định 0.0.
    """
    vector_row = {}
    for feature in active_features:
        vector_row[feature] = extracted_features.get(feature, 0.0)

    input_df = pd.DataFrame([vector_row], columns=active_features)
    score = rf_model.predict(input_df)[0]
    return round(float(score), 2)


# ==============================================================================
# 4. IN BÁO CÁO KẾT QUẢ CHI TIẾT
# ==============================================================================
def in_bao_cao(ten_vi_tri, extracted_features, match_score, active_features):
    """In bảng kết quả đánh giá chi tiết cho một cặp CV-JD."""
    print(f"\n{'━'*70}")
    print(f"  BÁO CÁO ĐÁNH GIÁ: {ten_vi_tri}")
    print(f"{'━'*70}")

    print(f"\n  {'TIÊU CHÍ':<35} {'GIÁ TRỊ':>10} {'TRẠNG THÁI':>15}")
    print(f"  {'─'*60}")

    for ten, gia_tri in extracted_features.items():
        # Xác định trạng thái
        if ten in (active_features or []):
            trang_thai = " Đã học"
        else:
            trang_thai = " Mới (chưa train)"

        # Format giá trị
        if isinstance(gia_tri, float):
            gia_tri_str = f"{gia_tri:.4f}"
        else:
            gia_tri_str = str(gia_tri)

        print(f"  {ten:<35} {gia_tri_str:>10} {trang_thai:>15}")

    print(f"  {'─'*60}")

    if match_score is not None:
        print(f"\n MATCH SCORE (Random Forest): {match_score:.2f} / 100")

        # Phân loại mức độ phù hợp
        if match_score >= 80:
            muc_do = "RẤT PHÙ HỢP"
        elif match_score >= 60:
            muc_do = "PHÙ HỢP"
        elif match_score >= 40:
            muc_do = "TƯƠNG ĐỐI PHÙ HỢP"
        else:
            muc_do = "CHƯA PHÙ HỢP"
        print(f"MỨC ĐỘ PHÙ HỢP: {muc_do}")
    else:
        print(f"\n Không thể dự đoán điểm (chưa có mô hình RF).")
        print(f"Hãy chạy 'python auto_train_rf.py' để huấn luyện trước.")

    print(f"{'━'*70}")


# ==============================================================================
# 5. LUỒNG CHÍNH: END-TO-END DEMO
# ==============================================================================
def main():
    print("\n" + "█" * 70)
    print("█" + " " * 68 + "█")
    print("█   HỆ THỐNG ĐÁNH GIÁ CV-JD MATCHING VỚI FEATURE REGISTRY          █")
    print("█   Kiến trúc: DynamicFeaturePipeline (Plug-and-Play)               █")
    print("█" + " " * 68 + "█")
    print("█" * 70)

    # ---- Bước 1: Khởi tạo pipeline ----
    pipeline = khoi_tao_pipeline()

    # ---- Bước 2: Nạp mô hình RF ----
    rf_model, active_features = nap_mo_hinh_rf()

    # ---- Bước 3: Chuẩn bị dữ liệu thực tế ----
    print("\n" + "=" * 70)
    print("  BƯỚC 3: TRÍCH XUẤT ĐẶC TRƯNG TỪ DỮ LIỆU THỰC TẾ")
    print("=" * 70)

    # ============================
    # CV ứng viên thực tế
    # ============================
    cv_hoang_vy = {
        "cv_text": """
        Họ và tên: Hoàng Vy
        Học vấn: Tốt nghiệp Đại học Đà Lạt, chuyên ngành Công nghệ thông tin (Cử nhân).
        Chứng chỉ: IELTS 6.5
        Mục tiêu: Trở thành Backend Developer giỏi.
        Kinh nghiệm: Tôi đã có 2.5 năm kinh nghiệm làm việc thực tế.
        Kỹ năng chuyên môn:
        - Lập trình nền tảng với C++, C# và Python.
        - Có khả năng xây dựng API bằng FastAPI và phát triển web với ASP.NET.
        - Quản trị cơ sở dữ liệu tốt bằng PostgreSQL và SQL Server.
        - Đã từng làm app desktop dùng SQLite.
        Dự án thực tế:
        - Đã deploy hệ thống API lên VPS sử dụng Docker và CI/CD pipeline.
        - Xây dựng microservice xử lý thanh toán cho 1000+ users.
        Thành tích: Đạt giải nhất cuộc thi lập trình cấp trường năm 2023.
        """,
        "project_descriptions": [
            "Deploy hệ thống API lên VPS sử dụng Docker và CI/CD",
            "Xây dựng microservice xử lý thanh toán với FastAPI và PostgreSQL",
        ],
    }

    # ============================
    # Các JD ứng tuyển
    # ============================
    ds_jd = [
        {
            "ten_vi_tri": "Backend Developer (C#/.NET)",
            "jd_data": {
                "jd_text": """
                We are looking for a Backend Engineer to build scalable web services.
                Responsibilities include developing RESTful APIs and managing databases.
                Required Skills: C#, ASP.NET Core, PostgreSQL, Docker.
                Experience: At least 2 years of backend development.
                Nice to have: CI/CD, Kubernetes.
                """,
                "required_experience": 2.0,
                "required_skills": ["c#", "asp.net core", "postgresql", "docker"],
                "project_keywords": ["backend api", "database management", "deployment"],
            },
        },
        {
            "ten_vi_tri": "Frontend Developer (React)",
            "jd_data": {
                "jd_text": """
                We are hiring a Frontend Developer to build interactive user interfaces.
                Required Skills: React, JavaScript, HTML, CSS, TypeScript.
                Experience: 1+ years of frontend development.
                Nice to have: UI/UX design, Figma.
                """,
                "required_experience": 1.0,
                "required_skills": ["react", "javascript", "html", "css", "typescript"],
                "project_keywords": ["user interface", "responsive design", "SPA"],
            },
        },
    ]

    # ---- Bước 4: Chạy pipeline cho từng JD ----
    print("\n" + "=" * 70)
    print("  BƯỚC 4: ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP")
    print("=" * 70)

    ket_qua_tong = []

    for jd_info in ds_jd:
        ten_vi_tri = jd_info["ten_vi_tri"]
        jd_data = jd_info["jd_data"]

        # Trích xuất toàn bộ features bằng pipeline
        extracted = pipeline.tinh_toan_toan_bo_tieu_chi(cv_hoang_vy, jd_data)

        # Dự đoán điểm (nếu có model)
        match_score = None
        if rf_model is not None:
            match_score = du_doan_diem(rf_model, active_features, extracted)

        # In báo cáo
        in_bao_cao(ten_vi_tri, extracted, match_score, active_features)

        ket_qua_tong.append({
            "vi_tri": ten_vi_tri,
            "features": extracted,
            "score": match_score,
        })

    # ---- Bước 5: Tổng kết ----
    print("\n" + "=" * 70)
    print("  TỔNG KẾT: SO SÁNH MỨC ĐỘ PHÙ HỢP GIỮA CÁC VỊ TRÍ")
    print("=" * 70)

    # Chỉ so sánh nếu có điểm
    ket_qua_co_diem = [r for r in ket_qua_tong if r["score"] is not None]

    if ket_qua_co_diem:
        for r in sorted(ket_qua_co_diem, key=lambda x: x["score"], reverse=True):
            bar_len = int(r["score"] / 2)
            bar = "█" * bar_len + "░" * (50 - bar_len)
            print(f"  {r['vi_tri']:<35} {r['score']:>6.2f}/100  |{bar}|")

        vi_tri_tot_nhat = max(ket_qua_co_diem, key=lambda x: x["score"])
        print(f"\n KẾT LUẬN: Ứng viên phù hợp nhất với vị trí: "
              f"'{vi_tri_tot_nhat['vi_tri']}' (Điểm: {vi_tri_tot_nhat['score']:.2f})")
    else:
        print("Chưa có mô hình RF để so sánh điểm.")
        print("Các features đã trích xuất thành công, hãy train model trước.")

    # ---- Demo: Thêm tiêu chí mới ngay lúc runtime ----
    print("\n" + "=" * 70)
    print("  DEMO PLUG-AND-PLAY: Thêm tiêu chí mới tại runtime")
    print("=" * 70)

    # Định nghĩa tiêu chí hoàn toàn mới ngay tại đây
    @pipeline.tieu_chi("Has_Open_Source")
    def trich_xuat_open_source(cv_data, jd_data):
        """Ứng viên có đóng góp mã nguồn mở không (1 = có, 0 = không)."""
        cv_text = cv_data.get("cv_text", "").lower()
        tu_khoa = ["github", "open source", "open-source", "mã nguồn mở",
                   "contributor", "pull request", "pr merged", "npm package",
                   "pypi", "crates.io", "nuget"]
        return 1 if any(kw in cv_text for kw in tu_khoa) else 0

    print("   ✓ Đã thêm tiêu chí 'Has_Open_Source' bằng decorator @pipeline.tieu_chi()")
    pipeline.hien_thi_tieu_chi_da_dang_ky()

    print(f"\n{'█'*70}")
    print(f"█{'HOÀN TẤT TOÀN BỘ QUY TRÌNH ĐÁNH GIÁ':^68}█")
    print(f"{'█'*70}")


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    main()
