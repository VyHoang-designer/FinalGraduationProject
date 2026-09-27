# 🧬 AI Talent Match — Hệ thống CV-JD Matching thông minh

> **Full-stack AI-powered CV-JD Matching System** sử dụng kiến trúc Plug-and-Play (Feature Registry + Random Forest) kết hợp FastAPI Backend và React Frontend.

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
- [Backend API](#-backend-api)
- [Frontend UI](#-frontend-ui)
- [Core AI Logic](#-core-ai-logic)
- [Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [Hướng dẫn chạy](#-hướng-dẫn-chạy)
- [API Endpoints](#-api-endpoints)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)

---

## 🎯 Tổng quan

Hệ thống giải quyết bài toán **"Auto-Routing 1 CV → N JDs"**: Khi HR upload 1 CV ứng viên, hệ thống tự động chạy AI đánh giá CV đó với **tất cả** các vị trí tuyển dụng đang hoạt động, rồi xếp hạng từ cao đến thấp.

### Luồng xử lý chính

```
HR upload CV → API nhận cv_id → Fetch ALL active JDs từ DB
    → Chạy DynamicFeaturePipeline (9 tiêu chí) cho mỗi JD
    → Dự đoán Match Score bằng Random Forest
    → Lưu kết quả vào match_results
    → Trả về ranked list cho Frontend
```

### Tính năng nổi bật

- **🪄 Phân tích AI 1-N**: Một click đánh giá CV với tất cả JDs
- **📊 Explainable AI**: Radar Chart + bảng chi tiết giải thích TẠI SAO AI cho điểm đó
- **🔌 Plug-and-Play**: Thêm tiêu chí đánh giá mới mà không cần sửa mã nguồn lõi
- **🎨 Modern Dashboard**: Giao diện B2B SaaS dark theme, responsive

---

## 🏗 Kiến trúc hệ thống

```
┌──────────────────────┐     REST API      ┌─────────────────────────┐
│   React Frontend     │ ◄──────────────── │    FastAPI Backend      │
│   (Vite + Tailwind)  │ ──────────────►   │    (api.py)             │
│   Port: 5173         │                   │    Port: 8000           │
└──────────────────────┘                   └────────┬────────────────┘
                                                    │
                                           ┌────────┴────────────────┐
                                           │                         │
                                    ┌──────▼──────┐   ┌──────────────▼──────────┐
                                    │ PostgreSQL  │   │ AI Engine (ai_engine.py) │
                                    │ 3 Tables    │   │                         │
                                    │ Port: 5432  │   │ ┌─────────────────────┐ │
                                    └─────────────┘   │ │ feature_registry.py │ │
                                                      │ │ (6 built-in)        │ │
                                                      │ ├─────────────────────┤ │
                                                      │ │ custom_extractors   │ │
                                                      │ │ (3 plugins)         │ │
                                                      │ ├─────────────────────┤ │
                                                      │ │ RF Model (.joblib)  │ │
                                                      │ └─────────────────────┘ │
                                                      └────────────────────────┘
```

---

## 📂 Cấu trúc dự án

```
d:/test_ml_matching_cv/
│
├── 📄 README.md                    ← Tài liệu này
│
│   ===== CORE AI LOGIC (GỐC - KHÔNG SỬA ĐỔI) =====
├── 📄 feature_registry.py          ← DynamicFeaturePipeline + 6 built-in extractors
├── 📄 custom_extractors.py          ← 3 plugin extractors (Has_English_Cert, Has_Leadership, Has_Award)
├── 📄 run_feature_pipeline.py       ← End-to-end orchestrator demo
├── 📁 model_artifacts/
│   ├── rf_matcher_model.joblib      ← Random Forest model đã train
│   └── active_features.json         ← Danh sách features model đã học
├── 📁 my_ner_model/                 ← spaCy NER model tùy chỉnh
│
│   ===== BACKEND (MỚI) =====
├── 📁 backend/
│   ├── .env                         ← Cấu hình DB connection string
│   ├── database.py                  ← SQLAlchemy engine + session factory
│   ├── models.py                    ← 3 ORM models (JobDescription, CandidateCV, MatchResult)
│   ├── schemas.py                   ← Pydantic request/response schemas
│   ├── ai_engine.py                 ← Bridge layer: FastAPI ↔ Feature Registry Pipeline
│   ├── api.py                       ← FastAPI app + tất cả endpoints
│   ├── seed_data.py                 ← Script nạp dữ liệu demo (5 JDs + 3 CVs)
│   └── requirements.txt             ← Python dependencies
│
│   ===== FRONTEND (MỚI) =====
├── 📁 frontend/
│   ├── index.html                   ← Entry point HTML
│   ├── vite.config.js               ← Vite + Tailwind config
│   ├── package.json
│   └── 📁 src/
│       ├── main.jsx                 ← React root entry
│       ├── App.jsx                  ← Root component + Navbar
│       ├── index.css                ← Full design system (dark theme, 28KB)
│       ├── 📁 pages/
│       │   └── CandidateDetail.jsx  ← Trang chính: quản lý state + orchestration
│       ├── 📁 components/
│       │   ├── CandidateSelector.jsx    ← Chọn ứng viên
│       │   ├── CandidateHeader.jsx      ← Avatar + Name + Skills + nút AI
│       │   ├── CVDetailPanel.jsx        ← Left panel (60%): CV details
│       │   ├── MatchResultsList.jsx     ← Right panel (40%): danh sách kết quả
│       │   ├── MatchResultCard.jsx      ← Card từng JD: score bar + badge
│       │   ├── ExplainableAIModal.jsx   ← Modal XAI: Radar + Feature table
│       │   └── RadarChart.jsx           ← Chart.js radar visualization
│       └── 📁 services/
│           └── api.js               ← API service layer (fetch wrapper)
│
│   ===== FILES BỎ QUA =====
├── test_ml_matching_Cv.py           ← (test file - bỏ qua)
├── test_sbert.py                    ← (test file - bỏ qua)
├── test_ner_skill.py                ← (test file - bỏ qua)
├── test_nlp_kinhnghiem.py           ← (test file - bỏ qua)
└── compete_set.py                   ← (test file - bỏ qua)
```

---

## 🗄 Cơ sở dữ liệu

**PostgreSQL 18** — Database: `cv_jd_matching_db`

### Bảng `job_descriptions`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | Integer (PK) | ID tự tăng |
| `title` | String(255) | Tên vị trí tuyển dụng |
| `jd_text` | Text | Nội dung JD đầy đủ |
| `required_skills` | JSON | Danh sách kỹ năng yêu cầu `["python","fastapi"]` |
| `required_experience` | Float | Số năm KN yêu cầu |
| `project_keywords` | JSON | Từ khóa dự án liên quan |
| `is_active` | Boolean | JD còn đang tuyển? |
| `department` | String(100) | Phòng ban |
| `location` | String(100) | Địa điểm |
| `created_at` | DateTime | Thời gian tạo |

### Bảng `candidates_cv`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | Integer (PK) | ID tự tăng |
| `full_name` | String(255) | Họ tên ứng viên |
| `email` | String(255) | Email |
| `phone` | String(50) | SĐT |
| `cv_text` | Text | Nội dung CV plain text |
| `parsed_skills` | JSON | Kỹ năng đã trích xuất |
| `project_descriptions` | JSON | Mô tả các dự án |
| `education` | Text | Thông tin học vấn |
| `experience_years` | Float | Số năm KN |
| `created_at` | DateTime | Thời gian tạo |

### Bảng `match_results`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | Integer (PK) | ID tự tăng |
| `cv_id` | Integer (FK) | → candidates_cv.id |
| `jd_id` | Integer (FK) | → job_descriptions.id |
| `match_score` | Float | Điểm phù hợp AI (0-100) |
| `match_level` | String(50) | Mức độ: Rất phù hợp / Phù hợp / Tương đối / Chưa phù hợp |
| `feature_details` | JSON | Chi tiết từng tiêu chí `{"Exp_Diff": 0.5, ...}` |
| `created_at` | DateTime | Thời gian đánh giá |

---

## ⚙ Backend API

### Kiến trúc Backend

```
api.py (FastAPI App)
  ├── database.py      → SQLAlchemy engine + get_db() dependency
  ├── models.py        → ORM models (3 tables)
  ├── schemas.py       → Pydantic validation
  └── ai_engine.py     → Singleton AIMatchingEngine
                            ├── imports feature_registry.py (NGUYÊN VẸN)
                            ├── imports custom_extractors.py (NGUYÊN VẸN)
                            └── loads model_artifacts/ (RF model + features list)
```

### AIMatchingEngine (ai_engine.py)

Module bridge quan trọng nhất — kết nối FastAPI với AI core:

- **Singleton pattern**: Chỉ khởi tạo 1 lần khi server start
- **Pipeline khởi tạo**: `tao_pipeline_mac_dinh()` + `dang_ky_tat_ca_tieu_chi_mo_rong()` = 9 tiêu chí
- **Prediction**: Reuse logic `du_doan_diem()` từ `run_feature_pipeline.py`
- **KHÔNG sửa đổi** bất kỳ file AI gốc nào

### Core Endpoint: `POST /api/match/1-to-n`

```python
# Request
{"cv_id": 1}

# Response
{
  "cv_id": 1,
  "candidate_name": "Hoàng Vy",
  "total_jobs_matched": 5,
  "processing_time_ms": 3420.15,
  "results": [
    {
      "jd_id": 1,
      "job_title": "Backend Developer (Python/FastAPI)",
      "match_score": 78.5,
      "match_level": "Phù hợp",
      "feature_details": {
        "Exp_Diff": 0.5,
        "Skill_Match_Ratio": 0.8,
        "JD_Similarity_Score": 0.72,
        "Has_Degree": 1,
        "Project_Similarity_Score": 0.65,
        "Has_Live_Deployment": 1,
        "Has_English_Cert": 1,
        "Has_Leadership": 0,
        "Has_Award": 1
      }
    },
    // ... thêm 4 JDs nữa
  ]
}
```

---

## 🎨 Frontend UI

### Giao diện tổng quan

Giao diện B2B SaaS Dashboard với dark theme, bao gồm:

| Vùng | Component | Mô tả |
|------|-----------|-------|
| **Navbar** | `App.jsx` | Logo "AI Talent Match" + navigation links |
| **Selector** | `CandidateSelector.jsx` | Chọn ứng viên (avatar + tên + meta) |
| **Header** | `CandidateHeader.jsx` | Avatar, tên, email, SĐT, skills tags, nút **"🪄 Phân tích AI 1-N"** |
| **Left (60%)** | `CVDetailPanel.jsx` | Học vấn, Experience bar, Skills grid, Project cards, Raw CV |
| **Right (40%)** | `MatchResultsList.jsx` | Stats chips + ranked list |
| **Job Card** | `MatchResultCard.jsx` | Rank badge (🥇🥈🥉), title, progress bar, match level badge, action buttons |
| **XAI Modal** | `ExplainableAIModal.jsx` | Score hero + Radar Chart + Feature details table |

### Design System (index.css)

- **Theme**: Dark mode với color palette tuỳ chỉnh (HSL-based)
- **Typography**: Inter font family (Google Fonts)
- **Effects**: Glassmorphism, gradient buttons, glow shadows
- **Animations**: `slideInCard`, `fadeIn`, `slideUp`, spinner, toast
- **Responsive**: Grid layout chuyển sang 1 cột dưới 1024px

---

## 🧠 Core AI Logic

### 9 Tiêu chí đánh giá (Feature Registry)

| # | Tiêu chí | Nguồn | Mô tả |
|---|----------|-------|-------|
| 1 | `Exp_Diff` | Built-in | Chênh lệch năm KN (CV − JD). Regex + NER fallback |
| 2 | `Skill_Match_Ratio` | Built-in | Tỷ lệ kỹ năng trùng khớp (0.0 - 1.0) |
| 3 | `JD_Similarity_Score` | Built-in | Cosine similarity CV↔JD bằng Sentence-BERT |
| 4 | `Project_Similarity_Score` | Built-in | Cosine similarity dự án CV↔keywords JD |
| 5 | `Has_Degree` | Built-in | Có bằng cấp? (binary: 0/1) |
| 6 | `Has_Live_Deployment` | Built-in | Có KN deploy thực tế? (binary: 0/1) |
| 7 | `Has_English_Cert` | Plugin | Có chứng chỉ tiếng Anh? (binary: 0/1) |
| 8 | `Has_Leadership` | Plugin | Có KN lãnh đạo/quản lý? (binary: 0/1) |
| 9 | `Has_Award` | Plugin | Có giải thưởng? (binary: 0/1) |

### Phân loại Match Level

| Điểm | Mức độ | Màu badge |
|------|--------|-----------|
| ≥ 80 | Rất phù hợp | 🟢 Green |
| ≥ 60 | Phù hợp | 🔵 Blue |
| ≥ 40 | Tương đối | 🟡 Yellow |
| < 40 | Chưa phù hợp | 🔴 Red |

### Kiến trúc Plug-and-Play

```python
# Thêm tiêu chí MỚI chỉ cần 3 dòng:
@pipeline.tieu_chi("Has_Open_Source")
def trich_xuat_open_source(cv_data, jd_data):
    """Ứng viên có đóng góp mã nguồn mở không."""
    cv_text = cv_data.get("cv_text", "").lower()
    return 1 if any(kw in cv_text for kw in ["github", "open source"]) else 0
```

---

## 📦 Hướng dẫn cài đặt

### Yêu cầu hệ thống

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 13+ (đã test trên PostgreSQL 18)

### Bước 1: Tạo Database

Mở pgAdmin hoặc psql:
```sql
CREATE DATABASE cv_jd_matching_db;
ALTER USER postgres WITH PASSWORD 'hoangvy123';
```

### Bước 2: Cài Backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Bước 3: Cấu hình kết nối DB

Sửa file `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/cv_jd_matching_db
```

### Bước 4: Seed dữ liệu demo

```bash
cd backend
python seed_data.py
```

### Bước 5: Cài Frontend dependencies

```bash
cd frontend
npm install
```

---

## 🚀 Hướng dẫn chạy

### Terminal 1 — Backend (FastAPI)

```bash
cd backend
python api.py
```

Server khởi động tại: **http://localhost:8000**
API docs (Swagger): **http://localhost:8000/docs**

### Terminal 2 — Frontend (React)

```bash
cd frontend
npm run dev
```

App khởi động tại: **http://localhost:5173**

---

## 📡 API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/candidates` | Danh sách tất cả ứng viên |
| `GET` | `/api/candidates/{id}` | Chi tiết 1 ứng viên |
| `POST` | `/api/candidates` | Thêm ứng viên mới |
| `GET` | `/api/jobs?active_only=true` | Danh sách JDs (active only) |
| `POST` | `/api/jobs` | Thêm JD mới |
| **`POST`** | **`/api/match/1-to-n`** | **★ Core: Chạy AI matching 1 CV → N JDs** |
| `GET` | `/api/match/results/{cv_id}` | Lấy kết quả matching đã cache |

---

## 🛠 Công nghệ sử dụng

### Backend
| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| Python | 3.14 | Ngôn ngữ chính |
| FastAPI | 0.141+ | Web framework |
| SQLAlchemy | 2.0+ | ORM |
| PostgreSQL | 18 | Database |
| psycopg2 | 2.9+ | PostgreSQL driver |
| Pydantic | 2.5+ | Data validation |
| scikit-learn | 1.9+ | Random Forest model |
| Sentence-BERT | 2.2+ | Semantic similarity |
| spaCy | 3.7+ | NER model |

### Frontend
| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| React | 19+ | UI library |
| Vite | 8.3 | Build tool |
| Tailwind CSS | 4.0 | Utility CSS |
| Chart.js | 4.0+ | Radar chart |
| react-chartjs-2 | 5.0+ | React wrapper cho Chart.js |

---

## 📝 Dữ liệu demo (Seed Data)

### 5 Job Descriptions
1. **Backend Developer (Python/FastAPI)** — Engineering, HCM
2. **Frontend Developer (React/TypeScript)** — Product, Hà Nội
3. **Full-stack Developer (C#/.NET + React)** — Engineering, Đà Nẵng
4. **DevOps Engineer** — Infrastructure, HCM
5. **AI/ML Engineer (NLP Focus)** — AI Research, HCM

### 3 Candidates
1. **Hoàng Vy** — 2.5 năm KN, Backend (Python/C#/FastAPI), IELTS 6.5
2. **Nguyễn Minh Tuấn** — 4 năm KN, AI/ML (PyTorch/NLP), Thạc sĩ
3. **Trần Thị Mai** — 1 năm KN, Frontend (React/TypeScript), Junior

---

*Built with ❤️ by AI Engineer — Kiến trúc Plug-and-Play cho hệ thống HR Tech.*
