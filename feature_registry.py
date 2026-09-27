# ==============================================================================
# FILE: feature_registry.py
# MÔ TẢ: Core Architecture - Feature Registry Engine (Plug-and-Play)
# KIẾN TRÚC: DynamicFeaturePipeline + Built-in Feature Extractors
# TÁC GIẢ: Senior ML Engineer
# ==============================================================================
"""
Module lõi của kiến trúc Feature Registry.

Cung cấp:
  - DynamicFeaturePipeline: Class trung tâm để đăng ký và quản lý tiêu chí đánh giá
  - 6 hàm trích xuất built-in (Exp_Diff, Skill_Match_Ratio, JD_Similarity_Score,
    Has_Degree, Project_Similarity_Score, Has_Live_Deployment)
  - Factory function tao_pipeline_mac_dinh() để khởi tạo nhanh

Thiết kế:
  - Lazy loading: NER model và SBERT model chỉ load lần đầu khi cần
  - Fallback strategy: Nếu NER model chưa train, tự động dùng Regex
  - Plug-and-play: Tiêu chí mới chỉ cần viết hàm rồi gọi dang_ky_tieu_chi()
"""

import os
import re
import warnings
warnings.filterwarnings('ignore')


# ==============================================================================
# 1. QUẢN LÝ LAZY LOADING CHO CÁC MÔ HÌNH AI
# ==============================================================================
class _ModelCache:
    """Singleton cache cho các mô hình AI nặng, chỉ load 1 lần duy nhất."""

    _ner_model = None
    _sbert_model = None

    @classmethod
    def get_ner_model(cls):
        """Load spaCy NER model đã huấn luyện tùy chỉnh (lazy)."""
        if cls._ner_model is None:
            ner_model_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "my_ner_model"
            )
            if os.path.exists(ner_model_path):
                import spacy
                cls._ner_model = spacy.load(ner_model_path)
                print(f"   [ModelCache] Đã load NER model từ: {ner_model_path}")
            else:
                print(f"   [ModelCache] CẢNH BÁO: Không tìm thấy NER model tại '{ner_model_path}'.")
                print(f"   [ModelCache] Các hàm NER sẽ fallback sang Regex.")
                cls._ner_model = False  # Đánh dấu đã thử load nhưng không có
        return cls._ner_model if cls._ner_model is not False else None

    @classmethod
    def get_sbert_model(cls):
        """Load Sentence-BERT model (lazy)."""
        if cls._sbert_model is None:
            from sentence_transformers import SentenceTransformer
            model_name = 'paraphrase-multilingual-MiniLM-L12-v2'
            print(f"   [ModelCache] Đang load SBERT model: {model_name}...")
            cls._sbert_model = SentenceTransformer(model_name)
            print(f"   [ModelCache] SBERT model đã sẵn sàng.")
        return cls._sbert_model


# ==============================================================================
# 2. CLASS LÕI: DynamicFeaturePipeline
# ==============================================================================
class DynamicFeaturePipeline:
    """
    Bộ trích xuất đặc trưng dạng Plug-and-Play (Feature Registry).

    Cho phép đăng ký/gỡ bỏ các hàm trích xuất tiêu chí đánh giá một cách
    linh hoạt mà không cần sửa đổi mã nguồn lõi.

    Cách dùng cơ bản:
        pipeline = DynamicFeaturePipeline()
        pipeline.dang_ky_tieu_chi("Ten_Tieu_Chi", ham_xu_ly)
        features = pipeline.tinh_toan_toan_bo_tieu_chi(cv_data, jd_data)

    Cách dùng với decorator:
        @pipeline.tieu_chi("Ten_Tieu_Chi")
        def ham_xu_ly(cv_data, jd_data):
            ...
    """

    def __init__(self):
        self.feature_extractors = {}

    # --- Đăng ký tiêu chí ---
    def dang_ky_tieu_chi(self, ten_tieu_chi, ham_xu_ly):
        """
        Đăng ký một hàm trích xuất đặc trưng vào pipeline.

        Args:
            ten_tieu_chi (str): Tên định danh tiêu chí (ví dụ: 'Exp_Diff').
            ham_xu_ly (callable): Hàm nhận (cv_data, jd_data) và trả về giá trị số.
        """
        self.feature_extractors[ten_tieu_chi] = ham_xu_ly

    # --- Decorator đăng ký ---
    def tieu_chi(self, ten_tieu_chi):
        """
        Decorator để đăng ký tiêu chí một cách trực quan.

        Cách dùng:
            @pipeline.tieu_chi("Has_Award")
            def trich_xuat_giai_thuong(cv_data, jd_data):
                ...
        """
        def wrapper(ham_xu_ly):
            self.dang_ky_tieu_chi(ten_tieu_chi, ham_xu_ly)
            return ham_xu_ly
        return wrapper

    # --- Tính toán toàn bộ tiêu chí ---
    def tinh_toan_toan_bo_tieu_chi(self, cv_data, jd_data):
        """
        Chạy tất cả hàm trích xuất đã đăng ký, trả về dict kết quả.

        Args:
            cv_data (dict): Dữ liệu CV. Bắt buộc có key 'cv_text'.
                            Tùy chọn: 'project_descriptions' (list[str]).
            jd_data (dict): Dữ liệu JD. Bắt buộc có key 'jd_text'.
                            Tùy chọn: 'required_experience' (float),
                                       'required_skills' (list[str]),
                                       'project_keywords' (list[str]).

        Returns:
            dict: {ten_tieu_chi: gia_tri_so, ...}
        """
        features = {}
        for ten_tieu_chi, ham in self.feature_extractors.items():
            try:
                features[ten_tieu_chi] = ham(cv_data, jd_data)
            except Exception as e:
                print(f"   [Pipeline] LỖI khi tính '{ten_tieu_chi}': {e}")
                features[ten_tieu_chi] = 0.0
        return features

    # --- Hiển thị tiêu chí đã đăng ký ---
    def hien_thi_tieu_chi_da_dang_ky(self):
        """In ra danh sách tất cả tiêu chí đã đăng ký cùng mô tả."""
        print(f"\n{'='*70}")
        print(f"  DANH SÁCH TIÊU CHÍ ĐÃ ĐĂNG KÝ ({len(self.feature_extractors)} tiêu chí)")
        print(f"{'='*70}")
        for idx, (ten, ham) in enumerate(self.feature_extractors.items(), 1):
            mo_ta = (ham.__doc__ or "Không có mô tả").strip().split('\n')[0]
            print(f"  {idx:>2}. {ten:<30} | {mo_ta}")
        print(f"{'='*70}")

    # --- Gỡ bỏ tiêu chí ---
    def xoa_tieu_chi(self, ten_tieu_chi):
        """
        Gỡ bỏ một tiêu chí khỏi pipeline.

        Args:
            ten_tieu_chi (str): Tên tiêu chí cần xóa.

        Returns:
            bool: True nếu xóa thành công, False nếu không tìm thấy.
        """
        if ten_tieu_chi in self.feature_extractors:
            del self.feature_extractors[ten_tieu_chi]
            print(f"   [Pipeline] Đã gỡ bỏ tiêu chí: '{ten_tieu_chi}'")
            return True
        else:
            print(f"   [Pipeline] Không tìm thấy tiêu chí: '{ten_tieu_chi}'")
            return False

    # --- Lấy danh sách tên tiêu chí ---
    def lay_danh_sach_tieu_chi(self):
        """Trả về list tên tất cả tiêu chí đã đăng ký (theo thứ tự đăng ký)."""
        return list(self.feature_extractors.keys())


# ==============================================================================
# 3. CÁC HÀM TRÍCH XUẤT ĐẶC TRƯNG BUILT-IN
# ==============================================================================

# --- Tiện ích NER ---
def _trich_xuat_thuc_the_ner(text, nhan_muc_tieu):
    """Trích xuất thực thể từ text bằng NER model. Trả về list[str]."""
    nlp = _ModelCache.get_ner_model()
    if nlp is None:
        return []
    doc = nlp(text)
    return [ent.text for ent in doc.ents if ent.label_ == nhan_muc_tieu]


# --- Tiện ích Regex cho kinh nghiệm ---
def _trich_xuat_kinh_nghiem_regex(text):
    """Fallback Regex: trích xuất số năm kinh nghiệm từ text."""
    text_lower = text.lower()
    patterns = [
        r"(\d+\.?\d*)\s*(?:năm kinh nghiệm|năm làm việc|năm nghiên cứu)",
        r"(\d+\.?\d*)\s*(?:years?\s+of\s+experience|years?\s+experience)",
        r"(\d+\.?\d*)\s*(?:years?\s+(?:in|of)\s+(?:professional|practical|working))",
    ]
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            return float(match.group(1))
    return 0.0


# ---- BUILT-IN EXTRACTOR 1: Exp_Diff ----
def trich_xuat_exp_diff(cv_data, jd_data):
    """Chênh lệch kinh nghiệm (năm CV - năm JD yêu cầu)."""
    cv_text = cv_data.get("cv_text", "")
    jd_required_exp = jd_data.get("required_experience", 0.0)

    cv_experience = 0.0

    # Ưu tiên Regex trước (pattern cụ thể, độ chính xác cao)
    # vì NER có thể nhầm lẫn số liệu khác (vd: "IELTS 6.5") thành EXPERIENCE
    cv_experience = _trich_xuat_kinh_nghiem_regex(cv_text)

    # Fallback sang NER nếu Regex không tìm được
    if cv_experience == 0.0:
        exp_entities = _trich_xuat_thuc_the_ner(cv_text, "EXPERIENCE")
        for entity_text in exp_entities:
            num_match = re.search(r"(\d+\.?\d*)", entity_text)
            if num_match:
                value = float(num_match.group(1))
                # Lọc giá trị vô lý: số > 50 rất có thể là năm lịch (2023, 2024...)
                if value <= 50:
                    cv_experience = max(cv_experience, value)

    return round(cv_experience - jd_required_exp, 2)


# ---- BUILT-IN EXTRACTOR 2: Skill_Match_Ratio ----
def trich_xuat_skill_match_ratio(cv_data, jd_data):
    """Tỷ lệ kỹ năng trùng khớp giữa CV và JD (0.0 - 1.0)."""
    cv_text = cv_data.get("cv_text", "")
    jd_required_skills = jd_data.get("required_skills", [])

    if not jd_required_skills:
        return 0.0

    # Thử NER trước
    cv_skills_ner = _trich_xuat_thuc_the_ner(cv_text, "SKILL")
    cv_skills_lower = {s.lower() for s in cv_skills_ner}

    # Bổ sung bằng keyword matching (đảm bảo coverage)
    # Danh sách kỹ năng phổ biến để fallback
    ky_nang_pho_bien = [
        "python", "fastapi", "django", "flask", "sql", "nosql", "docker",
        "git", "react", "vue", "angular", "html", "css", "javascript",
        "typescript", "linux", "c++", "c#", "asp.net", "postgresql",
        "sql server", "mysql", "redis", "kubernetes", "java", "golang",
        "rabbitmq", "mongodb", "sqlite", "pytorch", "tensorflow", "ci/cd",
        "aws", "azure", "gcp", "spring boot", "node.js", "graphql",
        ".net core", "asp.net core",
    ]
    cv_text_lower = cv_text.lower()
    for skill in ky_nang_pho_bien:
        if skill in cv_text_lower:
            cv_skills_lower.add(skill)

    # Tính tỷ lệ trùng khớp
    jd_skills_lower = {s.lower() for s in jd_required_skills}
    if not jd_skills_lower:
        return 0.0

    matched = cv_skills_lower.intersection(jd_skills_lower)
    ratio = len(matched) / len(jd_skills_lower)

    return round(min(ratio, 1.0), 4)


# ---- BUILT-IN EXTRACTOR 3: JD_Similarity_Score ----
def trich_xuat_jd_similarity(cv_data, jd_data):
    """Độ tương đồng ngữ nghĩa CV vs JD bằng Sentence-BERT (0.0 - 1.0)."""
    from sklearn.metrics.pairwise import cosine_similarity

    cv_text = cv_data.get("cv_text", "")
    jd_text = jd_data.get("jd_text", "")

    if not cv_text.strip() or not jd_text.strip():
        return 0.0

    sbert = _ModelCache.get_sbert_model()
    cv_embedding = sbert.encode([cv_text])
    jd_embedding = sbert.encode([jd_text])
    similarity = cosine_similarity(cv_embedding, jd_embedding)[0][0]

    return round(float(max(0.0, similarity)), 4)


# ---- BUILT-IN EXTRACTOR 4: Has_Degree ----
def trich_xuat_has_degree(cv_data, jd_data):
    """Ứng viên có bằng cấp hay không (1 = có, 0 = không)."""
    cv_text = cv_data.get("cv_text", "")

    # Thử NER trước
    degree_entities = _trich_xuat_thuc_the_ner(cv_text, "DEGREE")
    if degree_entities:
        return 1

    # Fallback keyword matching
    tu_khoa_bang_cap = [
        "đại học", "cử nhân", "thạc sĩ", "tiến sĩ", "kỹ sư",
        "bachelor", "master", "phd", "doctor", "university",
        "college", "undergraduate", "graduate", "mba",
    ]
    cv_lower = cv_text.lower()
    if any(keyword in cv_lower for keyword in tu_khoa_bang_cap):
        return 1

    return 0


# ---- BUILT-IN EXTRACTOR 5: Project_Similarity_Score ----
def trich_xuat_project_similarity(cv_data, jd_data):
    """Độ tương đồng dự án CV vs yêu cầu JD bằng SBERT (0.0 - 1.0)."""
    from sklearn.metrics.pairwise import cosine_similarity

    cv_projects = cv_data.get("project_descriptions", [])
    jd_keywords = jd_data.get("project_keywords", [])

    # Nếu không có dữ liệu project riêng, dùng toàn bộ text
    if not cv_projects:
        cv_project_text = cv_data.get("cv_text", "")
    else:
        cv_project_text = " | ".join(cv_projects)

    if not jd_keywords:
        jd_project_text = jd_data.get("jd_text", "")
    else:
        jd_project_text = " | ".join(jd_keywords)

    if not cv_project_text.strip() or not jd_project_text.strip():
        return 0.0

    sbert = _ModelCache.get_sbert_model()
    cv_emb = sbert.encode([cv_project_text])
    jd_emb = sbert.encode([jd_project_text])
    similarity = cosine_similarity(cv_emb, jd_emb)[0][0]

    return round(float(max(0.0, similarity)), 4)


# ---- BUILT-IN EXTRACTOR 6: Has_Live_Deployment ----
def trich_xuat_has_live_deployment(cv_data, jd_data):
    """Ứng viên có kinh nghiệm deploy thực tế không (1 = có, 0 = không)."""
    cv_text = cv_data.get("cv_text", "").lower()

    tu_khoa_deploy = [
        "deploy", "deployment", "triển khai", "production", "live server",
        "vps", "aws", "azure", "gcp", "cloud", "docker compose",
        "ci/cd", "devops", "heroku", "vercel", "netlify", "digitalocean",
        "hosting", "server thực tế", "hệ thống thực", "go live",
        "kubernetes", "k8s", "helm", "terraform", "ansible",
    ]

    if any(keyword in cv_text for keyword in tu_khoa_deploy):
        return 1

    return 0


# ==============================================================================
# 4. FACTORY FUNCTION: Khởi tạo Pipeline mặc định
# ==============================================================================
def tao_pipeline_mac_dinh():
    """
    Tạo DynamicFeaturePipeline với 6 tiêu chí built-in đã đăng ký sẵn.

    Returns:
        DynamicFeaturePipeline: Pipeline sẵn sàng sử dụng.
    """
    pipeline = DynamicFeaturePipeline()

    pipeline.dang_ky_tieu_chi("Exp_Diff",                  trich_xuat_exp_diff)
    pipeline.dang_ky_tieu_chi("Skill_Match_Ratio",         trich_xuat_skill_match_ratio)
    pipeline.dang_ky_tieu_chi("Project_Similarity_Score",  trich_xuat_project_similarity)
    pipeline.dang_ky_tieu_chi("Has_Live_Deployment",       trich_xuat_has_live_deployment)
    pipeline.dang_ky_tieu_chi("JD_Similarity_Score",       trich_xuat_jd_similarity)
    pipeline.dang_ky_tieu_chi("Has_Degree",                trich_xuat_has_degree)

    return pipeline


# ==============================================================================
# 5. SELF-TEST (Chạy trực tiếp file này để kiểm tra nhanh)
# ==============================================================================
if __name__ == "__main__":
    print("=" * 70)
    print("  KIỂM THỬ NHANH: feature_registry.py")
    print("=" * 70)

    pipeline = tao_pipeline_mac_dinh()
    pipeline.hien_thi_tieu_chi_da_dang_ky()

    # Dữ liệu mẫu để kiểm tra
    cv_mau = {
        "cv_text": """
        Họ và tên: Hoàng Vy
        Học vấn: Đại học Đà Lạt, chuyên ngành Công nghệ thông tin
        Kinh nghiệm: Tôi đã có 2.5 năm kinh nghiệm.
        Kỹ năng: Lập trình với C++, C# và Python. Xây dựng API bằng FastAPI.
        Cơ sở dữ liệu: PostgreSQL và SQL Server.
        Dự án: Đã deploy hệ thống lên VPS sử dụng Docker.
        """,
        "project_descriptions": [
            "Xây dựng REST API với FastAPI, deploy lên VPS bằng Docker",
            "Phát triển web app quản lý nhân sự với ASP.NET Core và PostgreSQL",
        ],
    }

    jd_mau = {
        "jd_text": """
        We are looking for a Backend Engineer.
        Required Skills: Python, FastAPI, PostgreSQL.
        Experience: At least 2 years of backend development.
        """,
        "required_experience": 2.0,
        "required_skills": ["python", "fastapi", "postgresql", "docker"],
        "project_keywords": ["backend api", "database management", "deployment"],
    }

    print("\n>> Đang tính toán tất cả tiêu chí...")
    ket_qua = pipeline.tinh_toan_toan_bo_tieu_chi(cv_mau, jd_mau)

    print(f"\n{'─'*50}")
    print(f"  KẾT QUẢ TRÍCH XUẤT ĐẶC TRƯNG")
    print(f"{'─'*50}")
    for ten, gia_tri in ket_qua.items():
        print(f"  {ten:<30}: {gia_tri}")
    print(f"{'─'*50}")
