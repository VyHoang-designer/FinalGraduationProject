# BÁO CÁO GIẢI PHÁP & LUỒNG HOẠT ĐỘNG: TỰ ĐỘNG TRÍCH XUẤT AVATAR TỪ CV PDF

> **Dự án**: AI CV-JD Matching System  
> **Chức năng**: Tự động nhận diện khuôn mặt và trích xuất ảnh chân dung ứng viên từ CV (PDF) làm ảnh đại diện hệ thống  
> **Công nghệ cốt lõi**: PyMuPDF (fitz) + OpenCV FaceDetectorYN (YuNet Deep Learning ONNX) + FastAPI Static Files  

---

## 1. Mục tiêu & Yêu cầu giải pháp

Trong hệ thống tuyển dụng ATS, hồ sơ ứng viên tải lên dưới dạng file PDF (từ TopCV, Canva, LinkedIn, hoặc bản scan) thường đã có sẵn ảnh chân dung chụp chuyên nghiệp của ứng viên. 

Việc yêu cầu ứng viên hoặc nhà tuyển dụng (HR) phải tự cắt ảnh và upload lại ảnh đại diện gây mất thời gian và giảm trải nghiệm người dùng. Giải pháp này giúp:
1. **Tự động 100%**: Khi CV PDF được tải lên, hệ thống tự động tìm và bóc tách ảnh đại diện của ứng viên.
2. **100% Offline & Bảo mật**: Không sử dụng API đám mây thương mại, không phát sinh chi phí hay quota, bảo vệ dữ liệu cá nhân theo tiêu chuẩn GDPR.
3. **Chính xác & Thông minh**: Nhận diện đúng khuôn mặt người thật, bỏ qua các logo công ty, icon kỹ năng hoặc hình minh họa; tự động căn giữa và crop tỉ lệ 1:1 vuông vức với padding chuẩn chân dung.
4. **Fallback an toàn**: Nếu CV không có ảnh hoặc nhận diện không ra mặt, hệ thống giữ nguyên chữ cái viết tắt (Initials Avatar) hoặc avatar mặc định mà không gây gián đoạn luồng xử lý.

---

## 2. Công nghệ & Mô hình sử dụng

| Thành phần | Công nghệ / Thư viện | Vai trò & Đặc điểm |
| :--- | :--- | :--- |
| **PDF Extraction & Rendering** | **PyMuPDF (`fitz` 1.28.2)** | Thư viện xử lý PDF C/C++ siêu tốc. Hỗ trợ lấy trực tiếp ảnh nhúng (raster stream) và render trang 1 thành bitmap độ phân giải cao (150 DPI). |
| **Face Detection Engine** | **OpenCV 5.0 (`cv2.FaceDetectorYN`)** | Bộ nhận diện khuôn mặt Deep Learning chuẩn mới nhất của OpenCV (thay thế bộ Haar Cascade cũ). |
| **Model Weights** | **YuNet ONNX (`face_detection_yunet_2023mar.onnx`)** | Mô hình mạng nơ-ron tích chập siêu nhẹ (**232 KB**), tốc độ xử lý **~10-25ms** trên CPU, độ nhạy cao cả khi mặt nghiêng hoặc đeo kính. |
| **Image Processing & Cropping** | **OpenCV (`cv2`) & NumPy** | Thuật toán crop hình vuông 1:1, mở rộng lề (padding ratio 1.75x–2.0x), bù trừ trục Y để lấy trọn vẹn tóc và phần vai, resize chuẩn 256×256 px JPEG chất lượng cao (92%). |
| **Static Serving** | **FastAPI `StaticFiles`** | Mount trực tiếp thư mục `uploads/` thành URL `/uploads/avatars/...`. |
| **Database & Frontend** | **PostgreSQL (SQLAlchemy) + React** | Lưu đường dẫn `avatar_url`, tự động cập nhật bảng `candidates_cv` và bảng `users`, hiển thị avatar mượt mà trên toàn bộ giao diện. |

---

## 3. Sơ đồ kiến trúc & Luồng hoạt động (Workflow)

```mermaid
flowchart TD
    A[Ứng viên / HR Tải lên file CV .pdf] --> B[API POST /api/candidates/upload-cv]
    B --> C[Lưu file PDF tạm vào backend/uploads/]
    C --> D[Bóc tách nội dung CV văn bản qua cv_parser.py]
    
    C --> E[avatar_extractor.py: extract_candidate_avatar]
    
    subgraph S1 [Chiến lược 1: Embedded Images]
        E --> F1[PyMuPDF duyệt danh sách ảnh nhúng ở trang 1]
        F1 --> G1[Lọc ảnh: vị trí top 65%, min size 50x50 px, tỉ lệ 0.4 - 2.5]
        G1 --> H1[Chạy YuNet FaceDetectorYN quét khuôn mặt]
        H1 --> I1{Có khuôn mặt?}
    end
    
    I1 -- Có (Confidence >= 65%) --> J1[Chọn ảnh có độ tin cậy cao nhất & Crop]
    I1 -- Không có ảnh nhúng --> S2
    
    subgraph S2 [Chiến lược 2: Scanned / Flattened PDF Fallback]
        S2[Render trang 1 ở 150 DPI thành ảnh BGR]
        S2 --> G2[Quét khuôn mặt ở vùng 60% phía trên trang]
        G2 --> H2{Tìm thấy khuôn mặt?}
    end
    
    H2 -- Có --> J1
    H2 -- Không --> K1[Trả về None: Sử dụng Avatar Initials mặc định]
    
    J1 --> L1[_crop_square_face: Cắt vuông 1:1, thêm padding tóc/vai, resize 256x256 px]
    L1 --> M1[Lưu file JPEG vào backend/uploads/avatars/avatar_xxx.jpg]
    M1 --> N1[Trả về đường dẫn /uploads/avatars/avatar_xxx.jpg]
    
    D --> O1[Lưu CandidateCV vào Database]
    N1 --> O1
    O1 --> P1[Cập nhật avatar_url cho CandidateCV và User]
    P1 --> Q1[Frontend hiển thị ảnh chân dung tại Bảng ứng viên, Chi tiết & AI Match]
```

---

## 4. Chi tiết các bước thực hiện

### Bước 1: Quét và trích xuất ảnh kép (Dual-Strategy Extraction)
1. **Chiến lược 1 (Embedded Image Stream)**:
   - Các file PDF xuất từ Word, TopCV, Canva thường nhúng ảnh thẻ của ứng viên thành một đối tượng ảnh riêng biệt.
   - Module lấy danh sách hình ảnh trên trang 1 qua `page.get_images()`, lọc tọa độ vị trí ở 65% nửa trên trang (nơi đặt thông tin cá nhân và ảnh đại diện).
   - Kiểm tra qua YuNet; nếu phát hiện khuôn mặt với độ tin cậy $\ge 65\%$, hệ thống ưu tiên sử dụng ngay ảnh gốc này để đạt chất lượng và độ sắc nét cao nhất.
2. **Chiến lược 2 (Full-Page Render Fallback)**:
   - Với CV scan (file ảnh chụp tài liệu) hoặc file PDF xuất phẳng (flattened vector), ảnh chân dung dính liền vào nền trang.
   - Hệ thống render trang 1 thành bitmap 150 DPI, cắt vùng 60% phía trên và đưa qua YuNet để dò tìm tọa độ bounding box của khuôn mặt.

### Bước 2: Thuật toán cắt chân dung thông minh (`_crop_square_face`)
Một bức ảnh chân dung đẹp cần thấy được cả mái tóc, tai và cổ/vai, không bị cắt sát cằm hay trán:
- **Tỉ lệ khung hình vuông (1:1)**: Lấy $L = \max(\text{face\_w}, \text{face\_h}) \times \text{padding\_ratio}$ (mặc định $1.75 - 2.0$).
- **Offset trục Y**: Khuôn mặt được đẩy nhẹ xuống 1 chút ($10\% - 15\%$ kích thước mặt) để chừa khoảng không gian thoáng cho phần tóc và đỉnh đầu.
- **Xử lý viền (Boundary Clamping)**: Nếu vùng crop chạm mép tài liệu, hệ thống tự động bù trừ tọa độ để không bị tràn hoặc méo hình.
- **Chuẩn hóa (Normalization)**: Resize ảnh về kích thước **$256 \times 256$ px** bằng bộ nội suy `cv2.INTER_AREA`, lưu nén JPEG chất lượng 92% (dung lượng nhẹ chỉ ~12 KB/ảnh).

### Bước 3: Tích hợp Backend API & Phục vụ file tĩnh
1. **Tự động mount static files**:
   ```python
   UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
   os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
   app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
   ```
2. **Kết nối vào Endpoint Upload CV (`/api/candidates/upload-cv`)**:
   - Khi file `.pdf` được tải lên, hệ thống gọi `extract_candidate_avatar(file_path)`.
   - Lưu kết quả vào trường `avatar_url` của bản ghi `CandidateCV`.
   - Nếu tài khoản `User` của ứng viên chưa có ảnh đại diện, hệ thống cập nhật luôn `user.avatar_url = extracted_avatar`.
3. **Bổ sung `avatar_url` vào các API liên quan**:
   - `GET /api/candidates` & `GET /api/candidates/{id}`
   - `GET /api/employer/candidates` (Danh sách ứng viên cho Nhà tuyển dụng)
   - `GET /api/jobs/{job_id}/candidates` (Danh sách ứng viên ứng tuyển vào 1 JD)
   - `POST /api/match/n-to-1` (Kết quả AI Match xếp hạng ứng viên)

### Bước 4: Tích hợp hiển thị giao diện người dùng (Frontend)
1. **Helper chuẩn hóa đường dẫn ảnh (`getAvatarUrl`)** trong `frontend/src/services/api.js`:
   - Tự động nhận diện URL tuyệt đối (`http://...`, Google account avatar), chuỗi Base64 (`data:image/...`), hoặc đường dẫn tĩnh backend (`/uploads/avatars/...` $\rightarrow$ `http://localhost:8000/uploads/avatars/...`).
2. **Cập nhật các thành phần giao diện**:
   - **`CandidatesPage.jsx`**: Cột ứng viên trong bảng hiển thị ảnh chân dung bo góc 10px kèm viền đổ bóng nhẹ; nếu không có ảnh tự động hiển thị chữ cái viết tắt (Initials).
   - **`HRCandidateHeader.jsx`**: Hiển thị avatar kích thước 56x56 px cạnh tên ứng viên ở trang chi tiết.
   - **`AppliedCandidatesModal.jsx`**: Hiển thị avatar trong danh sách ứng viên đã nộp đơn vào vị trí tuyển dụng.
   - **`AIMatchModal.jsx`**: Hiển thị avatar trong bảng xếp hạng Top ứng viên AI Match (huy chương vàng 🥇, bạc 🥈, đồng 🥉).
   - **`CandidateHeader.jsx` & `TopBar.jsx`**: Hiển thị ảnh đại diện của tài khoản đang đăng nhập ở góc trên bên phải.

---

## 5. Danh sách các tệp tin đã tạo & điều chỉnh

### 1. Tạo mới:
- [`backend/avatar_extractor.py`](file:///d:/test_ml_matching_cv/backend/avatar_extractor.py): Module bóc tách ảnh và phát hiện khuôn mặt YuNet.
- [`backend/models_onnx/face_detection_yunet_2023mar.onnx`](file:///d:/test_ml_matching_cv/backend/models_onnx/face_detection_yunet_2023mar.onnx): File trọng số mô hình YuNet ONNX (232 KB).

### 2. Cập nhật Backend:
- [`backend/api.py`](file:///d:/test_ml_matching_cv/backend/api.py):
  - Mount thư mục tĩnh `/uploads`.
  - Tích hợp `extract_candidate_avatar` trong endpoint `upload_cv`.
  - Bổ sung `avatar_url` trong `get_job_candidates` và `match_n_to_1`.
- [`backend/schemas.py`](file:///d:/test_ml_matching_cv/backend/schemas.py): Bổ sung `avatar_url: Optional[str] = None` trong `CandidateMatchResult`.
- [`backend/cv_parser.py`](file:///d:/test_ml_matching_cv/backend/cv_parser.py): Khắc phục lỗi `UnboundLocalError` do khai báo trùng `import re` trong hàm `extract_education`.

### 3. Cập nhật Frontend:
- [`frontend/src/services/api.js`](file:///d:/test_ml_matching_cv/frontend/src/services/api.js): Thêm và export hàm helper `getAvatarUrl(url)`.
- [`frontend/src/pages/CandidatesPage.jsx`](file:///d:/test_ml_matching_cv/frontend/src/pages/CandidatesPage.jsx): Render thẻ `<img>` avatar trong bảng ứng viên.
- [`frontend/src/components/HRCandidateHeader.jsx`](file:///d:/test_ml_matching_cv/frontend/src/components/HRCandidateHeader.jsx): Thêm avatar thumbnail cạnh tên ứng viên ở trang chi tiết.
- [`frontend/src/components/AppliedCandidatesModal.jsx`](file:///d:/test_ml_matching_cv/frontend/src/components/AppliedCandidatesModal.jsx): Hiển thị avatar trong modal ứng viên nộp hồ sơ.
- [`frontend/src/components/AIMatchModal.jsx`](file:///d:/test_ml_matching_cv/frontend/src/components/AIMatchModal.jsx): Hiển thị avatar trong danh sách AI Match.
- [`frontend/src/components/CandidateHeader.jsx`](file:///d:/test_ml_matching_cv/frontend/src/components/CandidateHeader.jsx): Hiển thị avatar người dùng tại thanh điều hướng Candidate Portal.
- [`frontend/src/components/TopBar.jsx`](file:///d:/test_ml_matching_cv/frontend/src/components/TopBar.jsx): Hiển thị avatar trên TopBar phía HR.

---

## 6. Kết quả nghiệm thu thực tế

1. **Trích xuất trên file CV thực tế (`user1_1790388741_CV.pdf`)**:
   - Nhận diện khuôn mặt thành công với độ tin cậy **$95\%$**.
   - Tạo file ảnh chân dung chuẩn tỉ lệ 1:1: `uploads/avatars/avatar_1791857187_817cbade.jpg` (dung lượng **12.2 KB**, $256 \times 256$ px).
2. **Kiểm thử Upload End-to-End (`POST /api/candidates/upload-cv`)**:
   - Trả về mã HTTP **200 OK**.
   - Tạo mới ứng viên `Candidate ID: 7` (`HÀ HOÀNG VỸ`), trường `avatar_url` nhận giá trị `/uploads/avatars/avatar_1791858098_976634cc.jpg`.
3. **Kiểm thử phục vụ tệp tĩnh (`GET /uploads/avatars/...`)**:
   - Phản hồi **HTTP 200 OK**, `Content-Length: 12203 bytes`.
4. **Hiển thị giao diện**:
   - Ảnh đại diện hiển thị đồng bộ, sắc nét, bo góc hài hòa và tự động chuyển về Initials nếu ứng viên chưa có ảnh chân dung.
