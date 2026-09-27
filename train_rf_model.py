import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# ==============================================================================
# ĐƯỜNG DẪN CONFIG
# ==============================================================================
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(ROOT_DIR, "model_artifacts")
MODEL_FILE = os.path.join(MODEL_DIR, "rf_matcher_model.joblib")
FEATURE_LIST_FILE = os.path.join(MODEL_DIR, "active_features.json")

def generate_synthetic_data(num_samples=1000):
    """
    Tạo dữ liệu giả lập (synthetic data) có tính logic:
    - Ứng viên kinh nghiệm cao, kỹ năng khớp nhiều -> Điểm cao
    - Ứng viên thiếu kinh nghiệm, kỹ năng ít khớp -> Điểm thấp
    """
    print("🚀 Đang tạo dữ liệu giả lập...")
    np.random.seed(42)
    
    with open(FEATURE_LIST_FILE, "r", encoding="utf-8") as f:
        active_features = json.load(f)

    data = []
    labels = []

    for _ in range(num_samples):
        # Tạo ngẫu nhiên các feature
        skill_ratio = np.random.uniform(0.1, 1.0)
        exp_diff = np.random.uniform(-3.0, 5.0)
        jd_sim = np.random.uniform(0.1, 1.0)
        proj_sim = np.random.uniform(0.0, 1.0)
        
        has_deploy = np.random.choice([0, 1], p=[0.7, 0.3])
        has_leadership = np.random.choice([0, 1], p=[0.8, 0.2])
        has_cert = np.random.choice([0, 1], p=[0.5, 0.5])
        has_degree = np.random.choice([0, 1], p=[0.2, 0.8])
        
        row = {
            "Exp_Diff": exp_diff,
            "Skill_Match_Ratio": skill_ratio,
            "Project_Similarity_Score": proj_sim,
            "Has_Live_Deployment": has_deploy,
            "JD_Similarity_Score": jd_sim,
            "Has_Degree": has_degree,
            "Has_English_Cert": has_cert,
            "Has_Leadership": has_leadership
        }
        
        # Dùng một công thức tính điểm ẩn (ground truth) có thêm noise
        base_score = 0
        base_score += skill_ratio * 40
        base_score += max(0, min(25, 10 + (exp_diff * 5 if exp_diff < 0 else 10 + min(exp_diff * 2, 5))))
        base_score += jd_sim * 15
        base_score += proj_sim * 10
        base_score += has_deploy * 5 + has_leadership * 5 + has_cert * 3 + has_degree * 2
        
        # Thêm nhiễu ngẫu nhiên để mô hình phải học thay vì chỉ nhớ công thức
        noise = np.random.normal(0, 3.0) 
        final_score = max(0.0, min(100.0, base_score + noise))
        
        data.append([row[f] for f in active_features])
        labels.append(final_score)
        
    df = pd.DataFrame(data, columns=active_features)
    y = np.array(labels)
    
    return df, y

def train_model():
    print("=" * 60)
    print("  [TRAINING] BẮT ĐẦU HUẤN LUYỆN RANDOM FOREST MODEL")
    print("=" * 60)
    
    # 1. Tạo hoặc load dữ liệu
    X, y = generate_synthetic_data(num_samples=2000)
    
    # 2. Chia tập Train/Test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"📊 Kích thước tập Train: {X_train.shape[0]} mẫu")
    print(f"📊 Kích thước tập Test: {X_test.shape[0]} mẫu")
    
    # 3. Cấu hình và Train model
    print("⚙️ Đang huấn luyện Random Forest...")
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    
    # 4. Đánh giá
    y_pred = rf_model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n✅ ĐÁNH GIÁ MÔ HÌNH:")
    print(f"  - Mean Squared Error (MSE): {mse:.2f}")
    print(f"  - R2 Score: {r2:.4f}")
    
    # 5. Lưu Model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(rf_model, MODEL_FILE)
    print(f"\n💾 Đã lưu mô hình mới tại: {MODEL_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    train_model()
