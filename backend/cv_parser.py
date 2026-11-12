# ==============================================================================
# FILE: backend/cv_parser.py
# MÔ TẢ: Module trích xuất thông tin từ file CV (PDF/DOCX)
#         Sử dụng pdfplumber, python-docx, SpaCy NER, và Regex
# ==============================================================================
"""
Pipeline trích xuất CV:
  1. Đọc file PDF/DOCX → raw text
  2. Regex: Email, SĐT, Họ tên (dòng đầu)
  3. SpaCy NER: Tên người (PERSON), Tổ chức (ORG), Địa điểm (GPE/LOC)
  4. Skill Extraction: Đối chiếu với từ điển kỹ năng IT
  5. Experience Parser: Tính năm kinh nghiệm từ mốc thời gian
  6. Project Extraction: Bóc tách mô tả dự án
  7. Education Extraction: Bóc tách thông tin học vấn
"""

import re
import os
from datetime import datetime
from typing import Optional

import pdfplumber
from docx import Document as DocxDocument


# ==============================================================================
# 1. ĐỌC FILE → RAW TEXT
# ==============================================================================
def extract_text_from_pdf(file_path: str) -> str:
    """Đọc toàn bộ text từ file PDF bằng pdfplumber."""
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_docx(file_path: str) -> str:
    """Đọc toàn bộ text từ file DOCX bằng python-docx."""
    doc = DocxDocument(file_path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_path: str) -> str:
    """Dispatcher: đọc text từ PDF hoặc DOCX."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Định dạng file không được hỗ trợ: {ext}")


# ==============================================================================
# 2. REGEX EXTRACTORS (Email, SĐT, Họ tên)
# ==============================================================================
def extract_email(text: str) -> Optional[str]:
    """Trích xuất email đầu tiên tìm thấy trong CV."""
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    match = re.search(pattern, text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    """Trích xuất số điện thoại Việt Nam."""
    patterns = [
        r'(?:\+84|0)(?:\s?\.?-?)?\d{2,3}(?:\s?\.?-?)?\d{3}(?:\s?\.?-?)?\d{3,4}',
        r'\d{4}[\s.-]?\d{3}[\s.-]?\d{3}',
        r'\(\+84\)\s?\d{9,10}',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            phone = re.sub(r'[\s.-]', '', match.group(0))
            return phone
    return None


def extract_name_from_text(text: str) -> Optional[str]:
    """
    Trích xuất họ tên ứng viên.
    Chiến lược:
      1. Tìm sau các label phổ biến: "Họ và tên:", "Họ tên:", "Name:", "Full Name:"
      2. Nếu không có label, lấy dòng đầu tiên có >=2 từ viết hoa (thường là tên).
    """
    # Chiến lược 1: Tìm sau label
    label_patterns = [
        r'(?:Họ\s*(?:và\s*)?tên|Full\s*Name|Name)\s*[:\-]?\s*(.+)',
    ]
    for pattern in label_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Chỉ lấy phần tên, loại bỏ thông tin thừa (dấu |, email, sđt)
            name = re.split(r'[|,\n\r]', name)[0].strip()
            if 2 <= len(name.split()) <= 6 and len(name) < 50:
                return name

    # Chiến lược 2: Dòng đầu tiên có >=2 từ bắt đầu bằng chữ HOA
    lines = text.strip().split('\n')
    for line in lines[:8]:  # Chỉ xét 8 dòng đầu
        line = line.strip()
        if not line or len(line) > 60:
            continue
        # Bỏ qua dòng chứa email hoặc sđt
        if '@' in line or re.search(r'\d{8,}', line):
            continue
        words = line.split()
        if 2 <= len(words) <= 5:
            # Kiểm tra phần lớn từ bắt đầu bằng chữ HOA (tên tiếng Việt)
            cap_count = sum(1 for w in words if w[0].isupper())
            if cap_count >= len(words) * 0.6:
                return line
    return None


# ==============================================================================
# 3. SPACY NER EXTRACTION
# ==============================================================================
_nlp_model = None

def _get_nlp():
    """Lazy load SpaCy model."""
    global _nlp_model
    if _nlp_model is None:
        import spacy
        try:
            _nlp_model = spacy.load("en_core_web_sm")
        except OSError:
            print("[CVParser] SpaCy model 'en_core_web_sm' chưa được cài. Bỏ qua NER.")
            return None
    return _nlp_model


def extract_entities_ner(text: str) -> dict:
    """
    Dùng SpaCy NER để bóc tách các thực thể:
      - PERSON: Tên người
      - ORG: Tổ chức / Công ty
      - GPE/LOC: Địa điểm
      - DATE: Ngày tháng
    """
    nlp = _get_nlp()
    if nlp is None:
        return {"persons": [], "organizations": [], "locations": [], "dates": []}

    # Giới hạn text để tránh quá tải NER
    truncated = text[:5000]
    doc = nlp(truncated)

    entities = {
        "persons": [],
        "organizations": [],
        "locations": [],
        "dates": [],
    }

    for ent in doc.ents:
        val = ent.text.strip()
        if ent.label_ == "PERSON" and val not in entities["persons"]:
            entities["persons"].append(val)
        elif ent.label_ == "ORG" and val not in entities["organizations"]:
            entities["organizations"].append(val)
        elif ent.label_ in ("GPE", "LOC") and val not in entities["locations"]:
            entities["locations"].append(val)
        elif ent.label_ == "DATE" and val not in entities["dates"]:
            entities["dates"].append(val)

    return entities


# ==============================================================================
# 4. SKILL EXTRACTION (Từ điển kỹ năng IT)
# ==============================================================================
# Danh sách kỹ năng IT phổ biến (có thể mở rộng)
IT_SKILLS_DICTIONARY = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "c",
    "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "scala",
    "r", "matlab", "perl", "dart", "lua", "objective-c", "assembly",
    "visual basic", "vb.net", "cobol", "fortran", "haskell", "elixir",

    # Web Frontend
    "html", "css", "react", "reactjs", "react.js", "angular", "angularjs",
    "vue", "vue.js", "vuejs", "svelte", "next.js", "nextjs", "nuxt.js",
    "gatsby", "tailwindcss", "tailwind", "bootstrap", "sass", "scss",
    "less", "jquery", "webpack", "vite", "babel", "redux", "zustand",
    "pinia", "material ui", "chakra ui", "ant design",

    # Web Backend / Frameworks
    "node.js", "nodejs", "express", "express.js", "fastapi", "django",
    "flask", "spring", "spring boot", "asp.net", ".net", "dotnet",
    "rails", "ruby on rails", "laravel", "symfony", "gin", "fiber",
    "nest.js", "nestjs", "koa", "hapi", "strapi",

    # Databases
    "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis",
    "elasticsearch", "oracle", "sql server", "mssql", "mariadb",
    "cassandra", "dynamodb", "neo4j", "couchdb", "firestore",
    "supabase", "prisma", "sequelize", "sqlalchemy", "typeorm",

    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes",
    "k8s", "terraform", "ansible", "jenkins", "github actions",
    "gitlab ci", "circleci", "travis ci", "prometheus", "grafana",
    "nginx", "apache", "linux", "ubuntu", "centos", "bash", "shell",
    "powershell", "vagrant", "helm", "istio", "argocd",

    # AI / ML / Data
    "machine learning", "deep learning", "nlp", "natural language processing",
    "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn",
    "sklearn", "pandas", "numpy", "scipy", "matplotlib", "seaborn",
    "opencv", "yolo", "bert", "gpt", "llm", "langchain",
    "hugging face", "transformers", "spacy", "nltk",
    "data science", "data engineering", "data analysis",
    "power bi", "tableau", "looker", "airflow", "spark", "hadoop",
    "kafka", "flink", "dbt", "bigquery", "snowflake", "databricks",

    # Mobile
    "react native", "flutter", "android", "ios", "swiftui",
    "xamarin", "ionic", "cordova", "expo",

    # Version Control & Tools
    "git", "github", "gitlab", "bitbucket", "svn",
    "jira", "confluence", "trello", "notion", "slack",
    "figma", "postman", "swagger", "graphql", "rest", "restful",
    "grpc", "websocket", "soap", "oauth", "jwt",

    # Testing
    "jest", "mocha", "pytest", "unittest", "selenium", "cypress",
    "playwright", "puppeteer", "junit", "testng", "cucumber",

    # Security
    "owasp", "penetration testing", "ssl", "tls", "encryption",
    "firewall", "vpn", "iam", "sso", "ldap",

    # Other / Methodologies
    "agile", "scrum", "kanban", "devops", "ci/cd", "cicd",
    "microservices", "serverless", "api gateway", "message queue",
    "rabbitmq", "sqs", "event-driven", "design patterns",
    "solid", "oop", "functional programming",
    "clean architecture", "mvc", "mvvm",
}

def extract_skills(text: str) -> list[str]:
    """
    Trích xuất kỹ năng IT bằng cách đối chiếu từ điển.
    Dùng word-boundary regex để tránh match sai (ví dụ: 'c' trong 'catch').
    """
    text_lower = text.lower()
    found_skills = []

    # Sắp xếp theo độ dài giảm dần để match phrase dài trước (ví dụ: "machine learning" trước "machine")
    sorted_skills = sorted(IT_SKILLS_DICTIONARY, key=len, reverse=True)

    for skill in sorted_skills:
        # Xây dựng regex pattern có word boundary
        escaped = re.escape(skill)
        # Đối với kỹ năng ngắn (1-2 ký tự như "c", "r"), yêu cầu match chính xác hơn
        if len(skill) <= 2:
            pattern = r'(?<![a-zA-Z])' + escaped + r'(?![a-zA-Z])'
        else:
            pattern = r'\b' + escaped + r'\b'

        if re.search(pattern, text_lower):
            # Chuẩn hóa tên kỹ năng (viết hoa chữ đầu)
            normalized = skill.upper() if len(skill) <= 4 else skill.title()
            # Xử lý trường hợp đặc biệt
            special_cases = {
                "Reactjs": "ReactJS", "React.Js": "React.js",
                "Vuejs": "VueJS", "Vue.Js": "Vue.js",
                "Nodejs": "Node.js", "Node.Js": "Node.js",
                "Next.Js": "Next.js", "Nextjs": "Next.js",
                "Nest.Js": "Nest.js", "Nestjs": "NestJS",
                "Fastapi": "FastAPI", "Django": "Django",
                "Asp.Net": "ASP.NET", ".Net": ".NET",
                "Dotnet": ".NET",
                "Mysql": "MySQL", "Postgresql": "PostgreSQL",
                "Postgres": "PostgreSQL", "Mongodb": "MongoDB",
                "Elasticsearch": "Elasticsearch",
                "Sql Server": "SQL Server", "Mssql": "MSSQL",
                "Dynamodb": "DynamoDB", "Neo4J": "Neo4j",
                "Sqlalchemy": "SQLAlchemy", "Typeorm": "TypeORM",
                "Tensorflow": "TensorFlow", "Pytorch": "PyTorch",
                "Scikit-Learn": "Scikit-Learn", "Sklearn": "Scikit-Learn",
                "Opencv": "OpenCV", "Nltk": "NLTK",
                "Kubernetes": "Kubernetes", "K8S": "Kubernetes",
                "Terraform": "Terraform",
                "Github Actions": "GitHub Actions",
                "Gitlab Ci": "GitLab CI",
                "Github": "GitHub", "Gitlab": "GitLab",
                "Bitbucket": "Bitbucket",
                "Graphql": "GraphQL", "Grpc": "gRPC",
                "Websocket": "WebSocket",
                "Oauth": "OAuth", "Ci/Cd": "CI/CD", "CICD": "CI/CD",
                "Devops": "DevOps",
                "Rabbitmq": "RabbitMQ",
                "Owasp": "OWASP", "Bigquery": "BigQuery",
                "Power Bi": "Power BI",
                "Langchain": "LangChain",
                "Hugging Face": "Hugging Face",
                "Swiftui": "SwiftUI",
                "Machine Learning": "Machine Learning",
                "Deep Learning": "Deep Learning",
                "Natural Language Processing": "NLP",
                "Computer Vision": "Computer Vision",
                "Data Science": "Data Science",
                "Data Engineering": "Data Engineering",
                "Data Analysis": "Data Analysis",
                "React Native": "React Native",
                "Design Patterns": "Design Patterns",
                "Clean Architecture": "Clean Architecture",
                "Functional Programming": "Functional Programming",
                "Spring Boot": "Spring Boot",
                "Ruby On Rails": "Ruby on Rails",
                "Google Cloud": "Google Cloud",
                "Api Gateway": "API Gateway",
                "Message Queue": "Message Queue",
                "Event-Driven": "Event-Driven",
                "Penetration Testing": "Penetration Testing",
            }
            normalized = special_cases.get(normalized, normalized)

            if normalized not in found_skills:
                found_skills.append(normalized)

    return found_skills


# ==============================================================================
# 5. EXPERIENCE PARSER (Tính số năm kinh nghiệm)
# ==============================================================================
def extract_experience_years(text: str) -> float:
    """
    Tính toán số năm kinh nghiệm từ CV text.
    Chiến lược:
      1. Tìm khai báo trực tiếp: "3 năm kinh nghiệm", "5 years of experience"
      2. Tính từ mốc thời gian: "01/2020 - 06/2023" → 3.5 năm
      3. Fallback: Nếu có SpaCy DATE entities, ước lượng.
    """
    # Chiến lược 1: Khai báo trực tiếp
    direct_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:năm|years?)\s*(?:kinh\s*nghiệm|experience|of\s*experience)',
        r'(?:kinh\s*nghiệm|experience)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:năm|years?)',
        r'(\d+)\+?\s*(?:năm|years?)\s*(?:làm\s*việc|working)',
    ]
    for pattern in direct_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            years = float(match.group(1))
            if 0.5 <= years <= 40:
                return years

    # Chiến lược 2: Tính từ các khoảng thời gian (MM/YYYY - MM/YYYY)
    time_patterns = [
        # 01/2020 - 06/2023 hoặc 01/2020 – Present
        r'(\d{1,2})[/\-.](\d{4})\s*[-–—~]\s*(?:(\d{1,2})[/\-.](\d{4})|(?:nay|hiện\s*tại|present|current|now))',
        # 2020 - 2023
        r'(\d{4})\s*[-–—~]\s*(?:(\d{4})|(?:nay|hiện\s*tại|present|current|now))',
    ]

    total_months = 0
    seen_ranges = set()

    for pattern in time_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            groups = match.groups()

            if len(groups) == 4:  # MM/YYYY format
                start_month = int(groups[0])
                start_year = int(groups[1])
                if groups[2] and groups[3]:
                    end_month = int(groups[2])
                    end_year = int(groups[3])
                else:
                    end_month = datetime.now().month
                    end_year = datetime.now().year
            elif len(groups) == 2:  # YYYY format
                start_month = 1
                start_year = int(groups[0])
                if groups[1]:
                    end_month = 12
                    end_year = int(groups[1])
                else:
                    end_month = datetime.now().month
                    end_year = datetime.now().year
            else:
                continue

            # Validation
            if not (1990 <= start_year <= 2030 and 1990 <= end_year <= 2030):
                continue
            if start_year > end_year:
                continue

            range_key = (start_year, start_month, end_year, end_month)
            if range_key in seen_ranges:
                continue
            seen_ranges.add(range_key)

            months = (end_year - start_year) * 12 + (end_month - start_month)
            if 1 <= months <= 360:  # 1 tháng đến 30 năm
                total_months += months

    if total_months > 0:
        return round(total_months / 12, 1)

    return 0.0


# ==============================================================================
# 6. PROJECT EXTRACTION (Bóc tách mô tả dự án)
# ==============================================================================
def extract_projects(text: str) -> list[str]:
    """
    Bóc tách các mô tả dự án từ CV.
    Tìm section "Dự án" hoặc "Projects" rồi lấy nội dung.
    """
    projects = []

    # Tìm section Dự án / Projects
    section_pattern = r'(?:DỰ\s*ÁN|PROJECTS?|CÁC\s*DỰ\s*ÁN|PROJECT\s*EXPERIENCE|DỰ\s*ÁN\s*(?:ĐÃ\s*)?(?:THAM\s*GIA|THỰC\s*HIỆN))[:\s]*\n(.+?)(?=\n(?:HỌC\s*VẤN|EDUCATION|KỸ\s*NĂNG|SKILLS?|KINH\s*NGHIỆM|EXPERIENCE|CHỨNG\s*CHỈ|CERTIFIC|THÔNG\s*TIN|GIẢI\s*THƯỞNG|AWARDS?|SỞ\s*THÍCH|HOBBIES|REFERENCES?|$))'
    match = re.search(section_pattern, text, re.IGNORECASE | re.DOTALL)

    if match:
        project_section = match.group(1).strip()
        # Tách từng dự án (thường bắt đầu bằng tên in đậm hoặc bullet)
        project_blocks = re.split(r'\n(?=[•●▪►\-\*]\s*\S|[A-ZÀ-Ỹ][\wÀ-ỹ\s]+[:\-])', project_section)
        for block in project_blocks:
            block = block.strip()
            if block and len(block) > 20:
                projects.append(block)
    else:
        # Fallback: Tìm các dòng có từ khóa dự án
        fallback_patterns = [
            r'(?:Dự\s*án|Project)\s*[:\-]\s*(.+?)(?:\n|$)',
        ]
        for pattern in fallback_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                proj_text = m.group(1).strip()
                if proj_text and len(proj_text) > 10:
                    projects.append(proj_text)

    return projects[:10]  # Giới hạn tối đa 10 dự án


# ==============================================================================
# 7. EDUCATION EXTRACTION (Bóc tách học vấn)
# ==============================================================================
def extract_education(text: str) -> Optional[str]:
    """Bóc tách phần học vấn từ CV."""
    section_pattern = r'(?:HỌC\s*VẤN|EDUCATION|TRÌNH\s*ĐỘ\s*HỌC\s*VẤN|ACADEMIC|ĐÀO\s*TẠO)[:\s]*\n(.+?)(?=\n(?:KỸ\s*NĂNG|SKILLS?|KINH\s*NGHIỆM|EXPERIENCE|DỰ\s*ÁN|PROJECTS?|CHỨNG\s*CHỈ|CERTIFIC|THÔNG\s*TIN|GIẢI\s*THƯỞNG|SỞ\s*THÍCH|$))'
    match = re.search(section_pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        edu_text = match.group(1).strip()
        lines = [line.strip() for line in edu_text.split('\n') if line.strip()]
        if lines:
            core_edu = lines[0]
            # Loại bỏ thông tin thừa như GPA, ngày tốt nghiệp, v.v. bằng regex split
            core_edu = re.split(r'\||expected|cumulative|gpa|academic|tốt nghiệp', core_edu, flags=re.IGNORECASE)[0].strip()
            core_edu = core_edu.rstrip(',;-| ')
            return core_edu[:150] if core_edu else None
        return None

    # Fallback: Tìm từ khóa học vấn
    edu_keywords = [
        r'((?:Cử\s*nhân|Thạc\s*sĩ|Tiến\s*sĩ|Bachelor|Master|PhD|Engineer|Kỹ\s*sư)[\s\S]{5,100})',
    ]
    for pattern in edu_keywords:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return None


# ==============================================================================
# ★ MAIN: Pipeline tổng hợp
# ==============================================================================
def parse_cv_file(file_path: str) -> dict:
    """
    Pipeline chính: Đọc file CV → trích xuất toàn bộ thông tin.
    
    Returns dict với các key:
      - full_name: str
      - email: str | None
      - phone: str | None
      - cv_text: str (toàn bộ text thô)
      - parsed_skills: list[str]
      - experience_years: float
      - project_descriptions: list[str]
      - education: str | None
      - ner_entities: dict (PERSON, ORG, GPE, DATE từ SpaCy)
    """
    print(f"[CVParser] Đang đọc file: {file_path}")

    # Step 1: Đọc text
    raw_text = extract_text(file_path)
    if not raw_text or not raw_text.strip():
        raise ValueError("Không thể đọc nội dung từ file CV. File có thể trống hoặc bị mã hóa.")

    print(f"[CVParser] Đã đọc {len(raw_text)} ký tự.")

    # Step 2: Regex extraction
    email = extract_email(raw_text)
    phone = extract_phone(raw_text)
    name_regex = extract_name_from_text(raw_text)

    # Step 3: SpaCy NER
    ner_entities = extract_entities_ner(raw_text)

    # Ưu tiên tên từ Regex, fallback sang NER PERSON
    full_name = name_regex
    if not full_name and ner_entities["persons"]:
        full_name = ner_entities["persons"][0]
    if not full_name:
        full_name = "Ứng viên chưa xác định"

    # Step 4: Skills
    skills = extract_skills(raw_text)

    # Step 5: Experience
    exp_years = extract_experience_years(raw_text)

    # Step 6: Projects
    projects = extract_projects(raw_text)

    # Step 7: Education
    education = extract_education(raw_text)

    result = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "cv_text": raw_text,
        "parsed_skills": skills,
        "experience_years": exp_years,
        "project_descriptions": projects,
        "education": education,
        "ner_entities": ner_entities,  # Lưu lại để phát triển sau
    }

    print(f"[CVParser] ✓ Kết quả parse:")
    print(f"  - Họ tên: {result['full_name']}")
    print(f"  - Email: {result['email']}")
    print(f"  - SĐT: {result['phone']}")
    print(f"  - Skills ({len(result['parsed_skills'])}): {result['parsed_skills'][:8]}...")
    print(f"  - Kinh nghiệm: {result['experience_years']} năm")
    print(f"  - Dự án: {len(result['project_descriptions'])} dự án")
    print(f"  - Học vấn: {result['education'][:50] if result['education'] else 'N/A'}...")
    print(f"  - NER Entities: {len(ner_entities['persons'])} persons, {len(ner_entities['organizations'])} orgs, {len(ner_entities['locations'])} locs")

    return result


# ==============================================================================
# CLI: Test nhanh
# ==============================================================================
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python cv_parser.py <path_to_cv.pdf>")
        sys.exit(1)

    result = parse_cv_file(sys.argv[1])
    print("\n" + "=" * 60)
    print("KẾT QUẢ PARSE CV")
    print("=" * 60)
    for key, value in result.items():
        if key == "cv_text":
            print(f"  {key}: [{len(value)} chars]")
        elif key == "ner_entities":
            for ent_type, ent_list in value.items():
                print(f"  NER.{ent_type}: {ent_list}")
        else:
            print(f"  {key}: {value}")
