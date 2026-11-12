-- ==============================================================================
-- INSERT 3 JOBS MỚI VÀO CƠ SỞ DỮ LIỆU (job_descriptions)
-- ==============================================================================

INSERT INTO job_descriptions (
    title,
    jd_text,
    required_skills,
    required_experience,
    project_keywords,
    is_active,
    department,
    location,
    created_at,
    started_time,
    expired_time,
    custom_criteria,
    image
) VALUES 
(
    'Mobile Developer (Flutter/React Native)',
    '
                Tuyển Mobile Developer tham gia phát triển ứng dụng di động fintech.
                Mô tả công việc:
                - Phát triển và tối ưu các tính năng trên mobile app sử dụng Flutter hoặc React Native.
                - Phối hợp với Backend team để tích hợp RESTful API và WebSocket.
                - Quản lý state hiệu quả với Bloc, Provider hoặc Redux/Zustand.
                - Tối ưu hóa UI/UX mượt mà, responsive trên cả iOS và Android.
                Yêu cầu:
                - 2+ năm kinh nghiệm lập trình Mobile (Flutter hoặc React Native).
                - Thành thạo Dart hoặc TypeScript/JavaScript.
                - Nắm vững kiến thức về Mobile Lifecycle, offline storage, push notifications.
                - Có sản phẩm đã phát hành trên App Store hoặc Google Play là lợi thế lớn.
                ',
    '["flutter", "react native", "dart", "typescript", "restful api"]'::json,
    2.0,
    '["mobile app", "cross-platform", "state management", "fintech payment"]'::json,
    true,
    'MoMo (M_Service)',
    'TP. Hồ Chí Minh',
    NOW(),
    '2026-11-11 08:00:00',
    '2026-12-31 23:59:59',
    '[]'::json,
    '/images/hochiminh.png'
),
(
    'Data Engineer (Python/Spark/Airflow)',
    '
                Tuyển Data Engineer xây dựng hệ thống xử lý dữ liệu lớn.
                Mô tả công việc:
                - Thiết kế, xây dựng và tối ưu các pipeline ETL/ELT xử lý dữ liệu lớn từ nhiều nguồn.
                - Lập lịch và điều phối luồng dữ liệu tự động với Apache Airflow.
                - Xử lý streaming data thời gian thực với Apache Kafka và Spark Streaming.
                - Thiết kế kiến trúc Data Warehouse và tối ưu truy vấn SQL phân tích.
                Yêu cầu:
                - 2+ năm kinh nghiệm Data Engineering / Big Data.
                - Thành thạo Python, SQL nâng cao.
                - Kinh nghiệm thực tế với Apache Spark, Apache Airflow hoặc Kafka.
                - Hiểu biết về cơ sở dữ liệu quan hệ (PostgreSQL) và NoSQL.
                ',
    '["python", "sql", "spark", "airflow", "kafka", "postgresql"]'::json,
    2.0,
    '["data pipeline", "etl", "big data", "data warehouse", "lakehouse"]'::json,
    true,
    'Viettel Solutions',
    'Hà Nội',
    NOW(),
    '2026-11-11 08:00:00',
    '2026-12-31 23:59:59',
    '[]'::json,
    '/images/hanoi.png'
),
(
    'QA Automation Engineer (Selenium/Playwright/Python)',
    '
                Tuyển QA Automation Engineer phụ trách kiểm thử tự động cho hệ thống doanh nghiệp.
                Mô tả công việc:
                - Thiết kế, xây dựng và bảo trì Automation Test Framework cho Web UI và REST API.
                - Viết test scripts tự động sử dụng Selenium hoặc Playwright kết hợp với Python.
                - Tích hợp test suite tự động vào quy trình CI/CD (GitHub Actions / Jenkins / GitLab CI).
                - Thực hiện API testing, regression testing và lập báo cáo chất lượng kiểm thử.
                Yêu cầu:
                - 2+ năm kinh nghiệm làm Automation Testing.
                - Thành thạo một trong các công cụ: Selenium, Playwright, Cypress.
                - Nắm vững ngôn ngữ lập trình Python hoặc Java/JavaScript.
                - Thành thạo Postman/Newman cho kiểm thử API và hiểu biết về CI/CD.
                ',
    '["selenium", "playwright", "python", "automation test", "postman", "ci/cd"]'::json,
    2.0,
    '["automation testing", "test framework", "api testing", "ci/cd pipeline", "regression test"]'::json,
    true,
    'FPT Software',
    'Đà Nẵng',
    NOW(),
    '2026-11-11 08:00:00',
    '2026-12-31 23:59:59',
    '[]'::json,
    '/images/DaNang.png'
);

