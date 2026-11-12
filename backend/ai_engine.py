# ==============================================================================
# FILE: backend/ai_engine.py
# MÔ TẢ: Bridge Layer - Kết nối FastAPI với Feature Registry Pipeline
# ==============================================================================
"""
Module cầu nối giữa API layer và AI core logic.

Tái sử dụng NGUYÊN VẸN:
  - feature_registry.py: DynamicFeaturePipeline + 6 built-in extractors
  - custom_extractors.py: 3 plugin extractors
  - model_artifacts/: Random Forest model + active_features.json

KHÔNG sửa đổi bất kỳ file gốc nào.
"""

import os
import sys
import json
import time

import joblib
import pandas as pd

# Sửa lỗi UnicodeEncodeError trên Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Thêm thư mục gốc vào PYTHONPATH để import feature_registry
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from feature_registry import tao_pipeline_mac_dinh
from custom_extractors import dang_ky_tat_ca_tieu_chi_mo_rong


# ==============================================================================
# CẤU HÌNH ĐƯỜNG DẪN
# ==============================================================================
MODEL_DIR = os.path.join(ROOT_DIR, "model_artifacts")
MODEL_FILE = os.path.join(MODEL_DIR, "rf_matcher_model.joblib")
FEATURE_LIST_FILE = os.path.join(MODEL_DIR, "active_features.json")


# ==============================================================================
# SINGLETON AI ENGINE
# ==============================================================================
class AIMatchingEngine:
    """
    Singleton engine quản lý pipeline + RF model.
    Chỉ khởi tạo 1 lần duy nhất khi server start.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        print("\n" + "=" * 60)
        print("  [AIEngine] Khởi tạo AI Matching Engine...")
        print("=" * 60)

        # 1. Khởi tạo pipeline (built-in + custom)
        self.pipeline = tao_pipeline_mac_dinh()
        dang_ky_tat_ca_tieu_chi_mo_rong(self.pipeline)
        print(f"  [AIEngine] Pipeline đã sẵn sàng với "
              f"{len(self.pipeline.feature_extractors)} tiêu chí.")

        # 2. Load RF model
        self.rf_model = None
        self.active_features = None
        self._load_rf_model()

        print("=" * 60)
        print("  [AIEngine] ✓ Engine đã sẵn sàng phục vụ!")
        print("=" * 60 + "\n")

    def _load_rf_model(self):
        """Load Random Forest model và danh sách features."""
        if not os.path.exists(MODEL_FILE):
            print(f"  [AIEngine] CẢNH BÁO: Không tìm thấy RF model tại '{MODEL_FILE}'")
            print(f"  [AIEngine] Hệ thống sẽ chỉ trả về feature_details (không có score).")
            return

        self.rf_model = joblib.load(MODEL_FILE)
        print(f"  [AIEngine] ✓ Đã load RF model: {MODEL_FILE}")

        with open(FEATURE_LIST_FILE, "r", encoding="utf-8") as f:
            self.active_features = json.load(f)
        print(f"  [AIEngine] ✓ Active features: {self.active_features}")

    def predict_score(self, extracted_features: dict) -> float:
        """
        Dự đoán Match Score. 
        Nếu có RandomForest model đã được train mới, sử dụng model.
        Ngược lại (trả về hằng số 82.5 do lỗi data cũ), áp dụng Heuristic Weighted Scoring.
        """
        # --- 1. SỬ DỤNG RANDOM FOREST (NẾU CÓ) ---
        if self.rf_model is not None and self.active_features:
            try:
                # Đảm bảo đúng thứ tự tính năng theo active_features
                feature_row = {f: extracted_features.get(f, 0.0) for f in self.active_features}
                df = pd.DataFrame([feature_row])
                rf_score = float(self.rf_model.predict(df)[0])
                
                # Bỏ qua nếu là model cũ trả về 82.5 cố định
                if round(rf_score, 2) != 82.50:
                    return round(max(0.0, min(100.0, rf_score)), 2)
            except Exception as e:
                print(f"  [AIEngine] Lỗi dự đoán RF: {e}. Fallback về Heuristic...")

        # --- 2. FALLBACK: HEURISTIC SCORING ---
        score = 0.0

        # 1. Kỹ năng (Max: 40đ)
        if extracted_features.get("Skill_Applicable", 0.0) == 1.0:
            score += extracted_features.get("Skill_Fit_Score", 0.0) * 40
        else:
            skill_ratio = extracted_features.get("Skill_Match_Ratio", 0.0)
            score += skill_ratio * 40

        # 2. Kinh nghiệm (Max: 20đ)
        # Khởi điểm 10đ. Đủ KN -> +10đ. Thiếu 1 năm -> -5đ. Thừa 1 năm -> +2đ
        exp_diff = extracted_features.get("Exp_Diff", 0.0)
        exp_score = 10.0
        if exp_diff >= 0:
            exp_score += 10.0 + min(exp_diff * 2.0, 5.0)  # Tối đa bonus 5đ
        else:
            exp_score += exp_diff * 5.0  # exp_diff âm nên sẽ trừ điểm
        
        score += max(0.0, min(25.0, exp_score)) # Clamp từ 0 đến 25

        # 3. Mức độ tương đồng nội dung JD (Max: 15đ)
        jd_sim = extracted_features.get("JD_Similarity_Score", 0.0)
        score += jd_sim * 15

        # 4. Mức độ tương đồng Dự án (Max: 10đ)
        proj_sim = extracted_features.get("Project_Similarity_Score", 0.0)
        score += proj_sim * 10

        # 5. Điểm thưởng (Bonus) (Max: 15đ)
        if extracted_features.get("Has_Live_Deployment", 0) > 0: score += 5.0
        if extracted_features.get("Has_Leadership", 0) > 0: score += 5.0
        if extracted_features.get("Has_English_Cert", 0) > 0: score += 3.0
        if extracted_features.get("Has_Degree", 0) > 0: score += 2.0

        # Đảm bảo điểm nằm trong khoảng 0-100
        final_score = max(0.0, min(100.0, score))
        return round(final_score, 2)

    @staticmethod
    def apply_hybrid_scoring(rf_base_score: float, cv_text: str, custom_criteria: list[dict]) -> tuple[float, list[dict]]:
        """
        Tính điểm Hybrid bằng cách cộng/trừ điểm từ custom_criteria.
        custom_criteria item format: {"name": str, "keywords": str, "level": str}
        Levels: 'nice' (+5), 'should' (+10), 'must' (-10 nếu thiếu), 'need' (-20 nếu thiếu)
        """
        final_score = rf_base_score
        results = []
        cv_text_lower = cv_text.lower() if cv_text else ""
        
        for c in custom_criteria:
            name = c.get("name", "")
            raw_keywords = c.get("keywords", "")
            if isinstance(raw_keywords, list):
                keywords = [str(k) for k in raw_keywords]
            else:
                keywords = [k.strip() for k in str(raw_keywords).split(",") if k.strip()]
                
            level = c.get("level", "nice").lower()
            
            met = False
            for kw in keywords:
                if kw.lower() in cv_text_lower:
                    met = True
                    break
            
            score_impact = 0
            if met:
                if level == "nice":
                    score_impact = 5
                elif level == "should":
                    score_impact = 10
            else:
                if level == "must":
                    score_impact = -10
                elif level == "need":
                    score_impact = -20
                    
            final_score += score_impact
            results.append({
                "name": name,
                "level": level,
                "met": met,
                "score_impact": score_impact
            })
            
        final_score = max(0.0, min(100.0, final_score))
        return round(final_score, 2), results

    @staticmethod
    def classify_match_level(score: float | None) -> str:
        """Phân loại mức độ phù hợp từ điểm số."""
        if score is None:
            return "Không xác định"
        if score >= 80:
            return "Rất phù hợp"
        elif score >= 60:
            return "Phù hợp"
        elif score >= 40:
            return "Tương đối"
        else:
            return "Chưa phù hợp"

    def match_cv_to_jd(self, cv_data: dict, jd_data: dict) -> dict:
        """
        Đánh giá 1 cặp CV-JD.
        """
        from skill_llm_service import evaluate_skills
        from skill_scoring import calculate_skill_score
        
        # 1. Trích xuất features cơ bản
        features = self.pipeline.tinh_toan_toan_bo_tieu_chi(cv_data, jd_data)

        # 2. Gọi Gemini đánh giá kỹ năng
        req_skills_raw = jd_data.get("required_skills", [])
        requirements = []
        for s in req_skills_raw:
            if isinstance(s, dict):
                requirements.append({"skill": s.get("skill", ""), "importance": s.get("importance", "core")})
            else:
                requirements.append({"skill": str(s), "importance": "core"})

        cv_sources = []
        if cv_data.get("cv_text"):
            cv_sources.append({"source_id": "cv", "section": "full_text", "text": cv_data["cv_text"]})
        if cv_data.get("project_descriptions"):
            for idx, p in enumerate(cv_data["project_descriptions"]):
                cv_sources.append({"source_id": f"proj_{idx}", "section": "projects", "text": p})

        skill_details_info = []
        if requirements:
            try:
                assessments = evaluate_skills(cv_sources, requirements)
                skill_result = calculate_skill_score(requirements, assessments)
                features["Skill_Fit_Score"] = skill_result.get("skill_fit_score", 0.0)
                features["Skill_Applicable"] = 1.0
                skill_details_info = skill_result.get("skill_details", [])
            except Exception as e:
                err_str = str(e)
                if "429" in err_str:
                    print("  [AIEngine] LLM Assessment Error: Hết Quota (429). Chuyển sang chấm điểm dự phòng.")
                else:
                    print(f"  [AIEngine] LLM Assessment Error: {err_str[:150]}...")
                # Heuristic fallback cho skill_details khi LLM gặp lỗi/hết quota
                cv_full_lower = (cv_data.get("cv_text") or "").lower()
                skill_details_info = []
                for req in requirements:
                    s_name = req["skill"]
                    weight = 3 if req.get("importance") == "core" else 2 if req.get("importance") == "supporting" else 1
                    found = s_name.lower() in cv_full_lower
                    skill_details_info.append({
                        "skill": s_name,
                        "weight": weight,
                        "m": 0.5 if found else 0.0,
                        "reason": f"Từ khóa xuất hiện trong CV (Fallback heuristic)" if found else "Không tìm thấy từ khóa trong CV",
                        "evidence": [{"source_id": "cv", "quote": s_name}] if found else []
                    })
                features["Skill_Fit_Score"] = features.get("Skill_Match_Ratio", 0.0)
                features["Skill_Applicable"] = 1.0 if skill_details_info else 0.0
        else:
            features["Skill_Fit_Score"] = 0.0
            features["Skill_Applicable"] = 0.0

        # Dự đoán điểm
        score = self.predict_score(features)
        
        # Áp dụng Hybrid Scoring (custom criteria)
        custom_criteria = jd_data.get("custom_criteria", [])
        custom_criteria_results = []
        if custom_criteria:
            score, custom_criteria_results = self.apply_hybrid_scoring(score, cv_data.get("cv_text", ""), custom_criteria)

        # Phân loại
        level = self.classify_match_level(score)

        return {
            "feature_details": features,
            "match_score": score if score is not None else 0.0,
            "match_level": level,
            "custom_criteria_results": custom_criteria_results,
            "skill_details": skill_details_info
        }

    def match_cv_to_all_jds(self, cv_data: dict, jd_list: list[dict]) -> tuple[list[dict], float]:
        """
        Core 1-to-N Logic: Đánh giá 1 CV với TẤT CẢ JDs song song.
        """
        from concurrent.futures import ThreadPoolExecutor

        start_time = time.time()
        
        def eval_single_jd(jd_info):
            jd_id = jd_info["jd_id"]
            jd_data = jd_info["jd_data"]
            res = self.match_cv_to_jd(cv_data, jd_data)
            res["jd_id"] = jd_id
            return res

        max_workers = min(max(len(jd_list), 1), 5)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(eval_single_jd, jd_list))

        # Xếp hạng từ cao → thấp
        results.sort(key=lambda x: x["match_score"], reverse=True)

        elapsed_ms = (time.time() - start_time) * 1000
        return results, elapsed_ms

    def match_jd_to_all_cvs(self, jd_data: dict, cv_list: list[dict]) -> tuple[list[dict], float]:
        """
        Core N-to-1 Logic: Đánh giá 1 JD với TẤT CẢ CVs song song.
        """
        from concurrent.futures import ThreadPoolExecutor

        start_time = time.time()
        
        def eval_single_cv(cv_info):
            cv_id = cv_info["cv_id"]
            cv_data = cv_info["cv_data"]
            res = self.match_cv_to_jd(cv_data, jd_data)
            res["cv_id"] = cv_id
            return res

        max_workers = min(max(len(cv_list), 1), 5)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(eval_single_cv, cv_list))

        # Xếp hạng từ cao → thấp
        results.sort(key=lambda x: x["match_score"], reverse=True)

        elapsed_ms = (time.time() - start_time) * 1000
        return results, elapsed_ms

    @staticmethod
    def analyze_gaps(jd_data: dict, cv_data: dict, feature_details: dict, custom_criteria_results: list[dict] = None) -> list[dict]:
        """
        Phân tích thiếu sót của CV so với yêu cầu JD.

        Trả về danh sách các 'gap' items, mỗi gap chứa:
          - category: nhóm (skill, experience, certification, project, ...)
          - severity: 'high' | 'medium' | 'low'
          - message: mô tả thiếu sót cụ thể
        """
        gaps = []
        raw_req_skills = jd_data.get("required_skills") or []
        required_skills = []
        for s in raw_req_skills:
            skill_str = s.get("skill", "") if isinstance(s, dict) else str(s)
            if skill_str:
                required_skills.append(skill_str.lower().strip())
        cv_skills = [s.lower().strip() for s in (cv_data.get("parsed_skills") or [])]

        # 1. Phân tích Skill Gap
        missing_skills = [s for s in required_skills if s not in cv_skills]
        if missing_skills:
            severity = "high" if len(missing_skills) / max(len(required_skills), 1) > 0.5 else "medium"
            gaps.append({
                "category": "skill",
                "severity": severity,
                "title": "Thiếu kỹ năng yêu cầu",
                "message": f"Ứng viên chưa có: {', '.join(missing_skills)}",
                "missing_items": missing_skills,
            })

        # 2. Phân tích Experience Gap
        exp_diff = feature_details.get("Exp_Diff", 0)
        req_exp = jd_data.get("required_experience", 0)
        if exp_diff < 0:
            severity = "high" if abs(exp_diff) >= 2 else "medium"
            gaps.append({
                "category": "experience",
                "severity": severity,
                "title": "Thiếu kinh nghiệm",
                "message": f"Yêu cầu {req_exp} năm, ứng viên thiếu {abs(round(exp_diff, 1))} năm",
                "missing_items": [],
            })

        # 3. Phân tích Certification Gap
        has_cert = feature_details.get("Has_English_Cert", 0)
        if has_cert == 0:
            jd_text = (jd_data.get("jd_text") or "").lower()
            if any(kw in jd_text for kw in ["ielts", "toeic", "toefl", "english", "tiếng anh"]):
                gaps.append({
                    "category": "certification",
                    "severity": "medium",
                    "title": "Thiếu chứng chỉ ngoại ngữ",
                    "message": "JD yêu cầu tiếng Anh nhưng CV không thể hiện chứng chỉ",
                    "missing_items": [],
                })

        # 4. Phân tích Project/Deployment Gap
        has_deploy = feature_details.get("Has_Live_Deployment", 0)
        if has_deploy == 0:
            jd_text = (jd_data.get("jd_text") or "").lower()
            if any(kw in jd_text for kw in ["deploy", "production", "vps", "cloud", "aws", "docker"]):
                gaps.append({
                    "category": "project",
                    "severity": "low",
                    "title": "Chưa có kinh nghiệm deploy thực tế",
                    "message": "JD mong muốn có kinh nghiệm triển khai thực tế (deploy/production)",
                    "missing_items": [],
                })

        # 5. Phân tích Leadership Gap
        has_leadership = feature_details.get("Has_Leadership", 0)
        if has_leadership == 0:
            jd_text = (jd_data.get("jd_text") or "").lower()
            if any(kw in jd_text for kw in ["lead", "quản lý", "team lead", "trưởng nhóm"]):
                gaps.append({
                    "category": "leadership",
                    "severity": "medium",
                    "title": "Chưa có kinh nghiệm lãnh đạo",
                    "message": "JD yêu cầu kinh nghiệm lead/quản lý nhóm",
                    "missing_items": [],
                })

        # 6. JD Similarity thấp = CV content xa với JD
        jd_sim = feature_details.get("JD_Similarity_Score", 0)
        if jd_sim < 0.4:
            gaps.append({
                "category": "relevance",
                "severity": "high" if jd_sim < 0.2 else "medium",
                "title": "Nội dung CV ít liên quan đến JD",
                "message": f"Độ tương đồng nội dung chỉ đạt {round(jd_sim * 100)}% — Hồ sơ có thể không đúng lĩnh vực",
                "missing_items": [],
            })

        # 7. Skill Match Ratio thấp
        skill_ratio = feature_details.get("Skill_Match_Ratio", 0)
        if skill_ratio < 0.5 and not missing_skills:
            gaps.append({
                "category": "skill",
                "severity": "medium",
                "title": "Tỷ lệ kỹ năng phù hợp thấp",
                "message": f"Chỉ {round(skill_ratio * 100)}% kỹ năng yêu cầu được đáp ứng",
                "missing_items": [],
            })

        # 8. Phân tích Custom Criteria Gaps
        if custom_criteria_results:
            for c in custom_criteria_results:
                if not c.get("met"):
                    level = c.get("level", "")
                    severity = "high"
                    if level == "nice":
                        severity = "low"
                    elif level == "should":
                        severity = "medium"
                    
                    gaps.append({
                        "category": "relevance",
                        "severity": severity,
                        "title": f"Thiếu tiêu chí tùy chỉnh: {c.get('name')}",
                        "message": f"Yêu cầu cấp độ {level.upper()} (bị trừ {abs(c.get('score_impact', 0))} điểm).",
                        "missing_items": [c.get("name")]
                    })

        return gaps


# Khởi tạo singleton
ai_engine = AIMatchingEngine()
