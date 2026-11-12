# ==============================================================================
# FILE: backend/seed_companies.py
# MÔ TẢ: Khởi tạo dữ liệu mẫu các Doanh nghiệp / Công ty công nghệ hàng đầu
# ==============================================================================

from database import SessionLocal
from models import Company, JobDescription

COMPANIES_DATA = [
    {
        "name": "APEX Technology Group",
        "logo": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop",
        "tagline": "Tiên phong Đổi mới Sáng tạo & Nền tảng AI Thông minh",
        "industry": "Trí tuệ Nhân tạo & Phần mềm",
        "location": "TP. Hồ Chí Minh",
        "company_size": "500 - 1000 nhân viên",
        "website": "https://apex-tech.com",
        "rating": 4.9,
        "description": "APEX Technology Group là tập đoàn công nghệ tiên phong tại Đông Nam Á, tập trung nghiên cứu và ứng dụng Trí tuệ Nhân tạo (Generative AI, NLP, Computer Vision) vào các bài toán chuyển đổi số doanh nghiệp quy mô lớn.",
        "benefits": [
            "Lương thưởng cạnh tranh (tháng 13, 14 theo hiệu suất)",
            "Cấp MacBook Pro M3 mới 100%",
            "Làm việc Hybrid linh hoạt 2 ngày/tuần",
            "Bảo hiểm sức khỏe quốc tế cao cấp PTI",
            "Du lịch nghỉ dưỡng 5 sao định kỳ hàng năm"
        ]
    },
    {
        "name": "AI Research Lab",
        "logo": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=256&h=256&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop",
        "tagline": "Trung tâm Nghiên cứu & Ứng dụng Trí tuệ Nhân tạo Đỉnh cao",
        "industry": "Trí tuệ Nhân tạo & Deep Learning",
        "location": "TP. Hồ Chí Minh",
        "company_size": "50 - 100 nhân viên",
        "website": "https://ai-research.vn",
        "rating": 4.9,
        "description": "AI Research Lab tập hợp các nhà khoa học và kỹ sư AI xuất sắc, chuyên sâu vào xử lý ngôn ngữ tự nhiên (NLP) cho tiếng Việt, mô hình ngôn ngữ lớn (LLM) và các hệ thống matching thông minh.",
        "benefits": [
            "Hệ thống GPU Cluster A100/H100 điện toán đám mây",
            "Tài trợ công bố bài báo khoa học quốc tế (NeurIPS, ACL)",
            "Lương thưởng theo chuẩn nhân tài AI quốc tế",
            "Môi trường học thuật tự do và sáng tạo cao"
        ]
    },
    {
        "name": "VNG Corporation",
        "logo": "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=256&h=256&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=400&fit=crop",
        "tagline": "Đón nhận Thách thức & Kiến tạo Tương lai Số",
        "industry": "Internet, Game & Điện toán Đám mây",
        "location": "TP. Hồ Chí Minh (VNG Campus, Quận 7)",
        "company_size": "1000+ nhân viên",
        "website": "https://vng.com.vn",
        "rating": 4.8,
        "description": "VNG là kỳ lân công nghệ đầu tiên tại Việt Nam với các sản phẩm hàng chục triệu người dùng như Zalo, ZaloPay, VNG Cloud và các tựa game nổi tiếng toàn cầu.",
        "benefits": [
            "Khuôn viên VNG Campus chuẩn quốc tế đẳng cấp",
            "Phòng Gym, hồ bơi, canteen ăn sáng & trưa miễn phí",
            "Chế độ thưởng ESOP và hiệu quả công việc hấp dẫn",
            "Cơ hội đào tạo công nghệ hàng đầu khu vực"
        ]
    },
    {
        "name": "FPT Software",
        "logo": "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=256&h=256&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=400&fit=crop",
        "tagline": "Cùng Bạn Đi Đến Thành Công Toàn Cầu",
        "industry": "Xuất khẩu Phần mềm & Chuyển đổi số",
        "location": "TP. Hồ Chí Minh (F-Town, TP. Thủ Đức)",
        "company_size": "1000+ nhân viên",
        "website": "https://fptsoftware.com",
        "rating": 4.7,
        "description": "FPT Software là công ty phần mềm lớn nhất Việt Nam với hơn 30,000 kỹ sư công nghệ trên toàn cầu, phục vụ hàng trăm khách hàng Fortune 500 tại Mỹ, Nhật Bản, châu Âu.",
        "benefits": [
            "Cơ hội Onsite làm việc dài hạn tại Nhật Bản, Mỹ, EU",
            "Xe buýt đưa đón nhân viên miễn phí tại các campus",
            "Gói bảo hiểm FPT Care cho nhân viên và người thân",
            "Hỗ trợ 100% lệ phí thi chứng chỉ quốc tế AWS, Azure, GCP"
        ]
    },
    {
        "name": "MoMo (M_Service)",
        "logo": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=256&h=256&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
        "tagline": "Siêu Ứng dụng Tài chính cho Hàng triệu Người Việt",
        "industry": "Fintech & Tài chính Số",
        "location": "TP. Hồ Chí Minh",
        "company_size": "500 - 1000 nhân viên",
        "website": "https://momo.vn",
        "rating": 4.8,
        "description": "MoMo là siêu ứng dụng thanh toán và tài chính số hàng đầu tại Việt Nam, phục vụ hơn 31 triệu người dùng với nền tảng công nghệ chịu tải cực lớn và bảo mật cao.",
        "benefits": [
            "Chính sách thưởng hiệu quả và thưởng dự án hàng quý",
            "Gói bảo hiểm chăm sóc sức khỏe toàn diện cao cấp",
            "Trợ cấp thiết bị công nghệ làm việc hiện đại",
            "Môi trường văn hóa cởi mở, tôn trọng sáng kiến cá nhân"
        ]
    },
    {
        "name": "Viettel Solutions",
        "logo": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=256&h=256&fit=crop",
        "cover_image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop",
        "tagline": "Tiên phong Kiến tạo Xã hội Số",
        "industry": "Viễn thông & Dịch vụ Số",
        "location": "Hà Nội",
        "company_size": "1000+ nhân viên",
        "website": "https://viettel.vn",
        "rating": 4.7,
        "description": "Viettel Solutions là đơn vị dẫn đầu trong việc cung cấp các giải pháp công nghệ thông tin, Cloud, IoT, Big Data cho các cơ quan chính phủ và doanh nghiệp hàng đầu.",
        "benefits": [
            "Thu nhập thuộc top đầu ngành viễn thông & công nghệ số",
            "Phúc lợi vững chắc từ Tập đoàn Công nghiệp - Viễn thông Quân đội",
            "Tham gia trực tiếp các dự án công nghệ mang tầm vóc quốc gia",
            "Môi trường kỷ luật, chuyên nghiệp và đầy thử thách lớn"
        ]
    }
]

def seed_companies():
    db = SessionLocal()
    try:
        for item in COMPANIES_DATA:
            existing = db.query(Company).filter(Company.name == item["name"]).first()
            if not existing:
                company = Company(**item)
                db.add(company)
                print(f"Added company: {item['name']}")
            else:
                existing.logo = item["logo"]
                existing.cover_image = item["cover_image"]
                existing.tagline = item["tagline"]
                existing.industry = item["industry"]
                existing.location = item["location"]
                existing.company_size = item["company_size"]
                existing.website = item["website"]
                existing.rating = item["rating"]
                existing.description = item["description"]
                existing.benefits = item["benefits"]
                print(f"Updated company: {item['name']}")

        # Đồng bộ department và location trong job_descriptions với các công ty thực tế
        jd_updates = [
            (5, "AI Research Lab", "TP. Hồ Chí Minh"),           # AI/ML Engineer
            (1, "APEX Technology Group", "TP. Hồ Chí Minh"),     # Backend Developer
            (2, "VNG Corporation", "TP. Hồ Chí Minh"),           # Frontend Developer
            (3, "FPT Software", "TP. Hồ Chí Minh"),              # Full-stack Developer
            (4, "Viettel Solutions", "Hà Nội"),                  # DevOps Engineer
        ]
        for jd_id, comp_name, loc in jd_updates:
            jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
            if jd:
                jd.department = comp_name
                jd.location = loc
                print(f"Mapped Job ID {jd_id} ('{jd.title}') -> {comp_name} ({loc})")

        db.commit()
        print("Seed companies completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_companies()
