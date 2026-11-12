# ==============================================================================
# FILE: backend/avatar_extractor.py
# MÔ TẢ: Trích xuất ảnh chân dung đại diện ứng viên từ file CV PDF
#        - Chiến lược 1: Trích ảnh nhúng (embedded image) ở nửa trên trang 1
#        - Chiến lược 2: Render toàn trang (scan / 1-page image) và cắt khuôn mặt
#        - Sử dụng PyMuPDF (fitz) + OpenCV FaceDetectorYN (YuNet ONNX)
# ==============================================================================

import os
import time
import uuid
import logging
from typing import Optional

import cv2
import numpy as np
import pymupdf as fitz

logger = logging.getLogger("avatar_extractor")
logger.setLevel(logging.INFO)

# Đường dẫn thư mục
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DEFAULT_UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
AVATARS_DIR = os.path.join(DEFAULT_UPLOAD_DIR, "avatars")
os.makedirs(AVATARS_DIR, exist_ok=True)

# Tìm đường dẫn file mô hình YuNet ONNX
MODEL_PATHS = [
    os.path.join(BACKEND_DIR, "models_onnx", "face_detection_yunet_2023mar.onnx"),
    os.path.join(PROJECT_DIR, "models", "face_detection_yunet_2023mar.onnx"),
    os.path.join(BACKEND_DIR, "face_detection_yunet_2023mar.onnx"),
]

MODEL_PATH = None
for p in MODEL_PATHS:
    if os.path.exists(p):
        MODEL_PATH = p
        break


def _get_detector(width: int, height: int, score_threshold: float = 0.65):
    """Khởi tạo FaceDetectorYN với kích thước ảnh đầu vào."""
    if not MODEL_PATH or not os.path.exists(MODEL_PATH):
        logger.warning(f"Không tìm thấy file mô hình YuNet tại: {MODEL_PATHS}")
        return None
    try:
        detector = cv2.FaceDetectorYN.create(
            model=MODEL_PATH,
            config="",
            input_size=(width, height),
            score_threshold=score_threshold,
            nms_threshold=0.3,
            top_k=5,
        )
        return detector
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo FaceDetectorYN: {e}")
        return None


def _crop_square_face(image: np.ndarray, face_box: np.ndarray, padding_ratio: float = 1.8) -> np.ndarray:
    """
    Cắt vùng khuôn mặt thành hình vuông tỉ lệ 1:1 có lề (padding)
    để tạo ảnh chân dung / avatar hoàn chỉnh.
    """
    img_h, img_w = image.shape[:2]
    fx, fy, fw, fh = face_box[:4]

    # Tâm khuôn mặt
    center_x = fx + fw / 2.0
    center_y = fy + fh / 2.0

    # Kích thước khung vuông bao quanh
    box_size = max(fw, fh) * padding_ratio

    # Tính tọa độ hình vuông, hơi dịch tâm lên trên một chút để lấy thêm tóc/trán
    x1 = int(center_x - box_size / 2.0)
    y1 = int(center_y - box_size * 0.45)
    x2 = int(x1 + box_size)
    y2 = int(y1 + box_size)

    # Đảm bảo nằm trong giới hạn ảnh
    if x1 < 0:
        x2 = min(img_w, x2 - x1)
        x1 = 0
    if y1 < 0:
        y2 = min(img_h, y2 - y1)
        y1 = 0
    if x2 > img_w:
        x1 = max(0, x1 - (x2 - img_w))
        x2 = img_w
    if y2 > img_h:
        y1 = max(0, y1 - (y2 - img_h))
        y2 = img_h

    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return image

    # Resize về 256x256 px chuẩn avatar web
    return cv2.resize(crop, (256, 256), interpolation=cv2.INTER_AREA)


def extract_candidate_avatar(pdf_path: str, output_dir: Optional[str] = None) -> Optional[str]:
    """
    Trích xuất ảnh chân dung ứng viên từ file CV PDF.
    
    Quy trình:
      1. Quét các ảnh nhúng (embedded images) ở trang 1 có vị trí ở nửa trên trang.
         Kiểm tra xem có ảnh nào chứa khuôn mặt bằng YuNet không.
      2. Nếu không tìm thấy, render trang 1 thành ảnh (150 DPI) và quét khuôn mặt
         trên trang để cắt (dành cho CV scan hoặc CV thiết kế xuất cả trang làm 1 ảnh).
      3. Chuẩn hóa ảnh về 256x256 px, lưu vào thư mục avatars và trả về URL tương đối.
      4. Trả về None nếu không phát hiện được khuôn mặt hợp lệ.
    """
    if not os.path.exists(pdf_path):
        logger.error(f"File PDF không tồn tại: {pdf_path}")
        return None

    target_dir = output_dir or AVATARS_DIR
    os.makedirs(target_dir, exist_ok=True)

    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0:
            return None

        page = doc[0]
        page_h = page.rect.height

        # ======================================================================
        # CHIẾN LƯỢC 1: TRÍCH XUẤT ẢNH NHÚNG GỐC TRÊN TRANG 1
        # ======================================================================
        embedded_images = page.get_images(full=True)
        best_avatar_img = None
        best_confidence = 0.0

        for img_info in embedded_images:
            xref = img_info[0]

            # Kiểm tra vị trí ảnh trên trang nếu lấy được rect
            rects = page.get_image_rects(xref)
            if rects:
                top_y = min(r.y0 for r in rects)
                # Ảnh chân dung hầu như luôn nằm ở 65% trên cùng của trang 1
                if top_y > page_h * 0.65:
                    continue

            # Trích xuất dữ liệu ảnh gốc
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image.get("image")
                if not image_bytes:
                    continue

                raw_w = base_image.get("width", 0)
                raw_h = base_image.get("height", 0)

                # Bỏ qua các ảnh quá nhỏ (icon, bullet points, logo nhỏ)
                if raw_w < 50 or raw_h < 50:
                    continue

                # Bỏ qua các dải banner quá dẹp
                aspect = raw_w / float(raw_h)
                if aspect > 3.0 or aspect < 0.3:
                    continue

                # Giải mã sang OpenCV BGR
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    continue

                # Quét khuôn mặt với FaceDetectorYN
                detector = _get_detector(img.shape[1], img.shape[0], score_threshold=0.65)
                if detector:
                    _, faces = detector.detect(img)
                    if faces is not None and len(faces) > 0:
                        # Lấy mặt có độ tin cậy cao nhất
                        faces_sorted = sorted(faces, key=lambda f: f[-1], reverse=True)
                        face = faces_sorted[0]
                        conf = face[-1]

                        if conf > best_confidence:
                            best_confidence = conf
                            # Cắt vuông quanh khuôn mặt
                            best_avatar_img = _crop_square_face(img, face, padding_ratio=1.75)

            except Exception as e:
                logger.debug(f"Lỗi khi xử lý ảnh xref {xref}: {e}")
                continue

        # ======================================================================
        # CHIẾN LƯỢC 2: RENDER TRANG 1 NẾU CHƯA TÌM THẤY MẶT (CV SCAN / ẢNH NGUYÊN TRANG)
        # ======================================================================
        if best_avatar_img is None:
            try:
                # Render trang 1 ở 150 DPI
                pix = page.get_pixmap(dpi=150)
                rendered = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
                if pix.n == 4:
                    rendered_bgr = cv2.cvtColor(rendered, cv2.COLOR_RGBA2BGR)
                elif pix.n == 3:
                    rendered_bgr = cv2.cvtColor(rendered, cv2.COLOR_RGB2BGR)
                else:
                    rendered_bgr = rendered

                # Chỉ quét ở nửa trên trang 1 (top 60%)
                top_limit = int(rendered_bgr.shape[0] * 0.60)
                search_region = rendered_bgr[:top_limit, :]

                detector = _get_detector(search_region.shape[1], search_region.shape[0], score_threshold=0.65)
                if detector:
                    _, faces = detector.detect(search_region)
                    if faces is not None and len(faces) > 0:
                        faces_sorted = sorted(faces, key=lambda f: f[-1], reverse=True)
                        face = faces_sorted[0]
                        conf = face[-1]
                        logger.info(f"Phát hiện khuôn mặt trên trang scan (confidence: {conf:.2f})")
                        best_avatar_img = _crop_square_face(rendered_bgr, face, padding_ratio=2.0)
            except Exception as e:
                logger.warning(f"Lỗi khi render trang PDF để tìm mặt: {e}")

        # ======================================================================
        # LƯU FILE ẢNH ĐẠI DIỆN VÀ TRẢ VỀ ĐƯỜNG DẪN
        # ======================================================================
        if best_avatar_img is not None:
            filename = f"avatar_{int(time.time())}_{uuid.uuid4().hex[:8]}.jpg"
            save_path = os.path.join(target_dir, filename)
            
            # Lưu với định dạng JPEG chất lượng cao
            cv2.imwrite(save_path, best_avatar_img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            logger.info(f"Đã lưu avatar thành công tại: {save_path}")
            
            # Trả về URL tương đối phục vụ web
            return f"/uploads/avatars/{filename}"

    except Exception as e:
        logger.error(f"Lỗi trong quá trình trích xuất avatar: {e}", exc_info=True)

    return None


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    test_pdf = os.path.join(DEFAULT_UPLOAD_DIR, "user1_1790388741_CV.pdf")
    print(f"Testing with file: {test_pdf}")
    result = extract_candidate_avatar(test_pdf)
    print("Avatar extraction result:", result)
