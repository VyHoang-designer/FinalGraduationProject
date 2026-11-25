--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_generated_cvs DROP CONSTRAINT IF EXISTS user_generated_cvs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.match_results DROP CONSTRAINT IF EXISTS match_results_jd_id_fkey;
ALTER TABLE IF EXISTS ONLY public.match_results DROP CONSTRAINT IF EXISTS match_results_cv_id_fkey;
ALTER TABLE IF EXISTS ONLY public.job_inquiries DROP CONSTRAINT IF EXISTS job_inquiries_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.job_inquiries DROP CONSTRAINT IF EXISTS job_inquiries_jd_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidates_cv DROP CONSTRAINT IF EXISTS candidates_cv_user_id_fkey;
DROP INDEX IF EXISTS public.ix_users_id;
DROP INDEX IF EXISTS public.ix_users_email;
DROP INDEX IF EXISTS public.ix_user_generated_cvs_user_id;
DROP INDEX IF EXISTS public.ix_user_generated_cvs_id;
DROP INDEX IF EXISTS public.ix_match_results_id;
DROP INDEX IF EXISTS public.ix_job_inquiries_user_id;
DROP INDEX IF EXISTS public.ix_job_inquiries_jd_id;
DROP INDEX IF EXISTS public.ix_job_inquiries_id;
DROP INDEX IF EXISTS public.ix_job_descriptions_id;
DROP INDEX IF EXISTS public.ix_companies_name;
DROP INDEX IF EXISTS public.ix_companies_id;
DROP INDEX IF EXISTS public.ix_candidates_cv_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.user_generated_cvs DROP CONSTRAINT IF EXISTS user_generated_cvs_pkey;
ALTER TABLE IF EXISTS ONLY public.match_results DROP CONSTRAINT IF EXISTS match_results_pkey;
ALTER TABLE IF EXISTS ONLY public.job_inquiries DROP CONSTRAINT IF EXISTS job_inquiries_pkey;
ALTER TABLE IF EXISTS ONLY public.job_descriptions DROP CONSTRAINT IF EXISTS job_descriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.companies DROP CONSTRAINT IF EXISTS companies_pkey;
ALTER TABLE IF EXISTS ONLY public.candidates_cv DROP CONSTRAINT IF EXISTS candidates_cv_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_generated_cvs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.match_results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.job_inquiries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.job_descriptions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.companies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.candidates_cv ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_generated_cvs_id_seq;
DROP TABLE IF EXISTS public.user_generated_cvs;
DROP SEQUENCE IF EXISTS public.match_results_id_seq;
DROP TABLE IF EXISTS public.match_results;
DROP SEQUENCE IF EXISTS public.job_inquiries_id_seq;
DROP TABLE IF EXISTS public.job_inquiries;
DROP SEQUENCE IF EXISTS public.job_descriptions_id_seq;
DROP TABLE IF EXISTS public.job_descriptions;
DROP SEQUENCE IF EXISTS public.companies_id_seq;
DROP TABLE IF EXISTS public.companies;
DROP SEQUENCE IF EXISTS public.candidates_cv_id_seq;
DROP TABLE IF EXISTS public.candidates_cv;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: candidates_cv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidates_cv (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    cv_text text NOT NULL,
    parsed_skills json,
    project_descriptions json,
    education text,
    experience_years double precision,
    avatar_url text,
    created_at timestamp without time zone,
    user_id integer
);


ALTER TABLE public.candidates_cv OWNER TO postgres;

--
-- Name: COLUMN candidates_cv.full_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.full_name IS 'Họ tên ứng viên';


--
-- Name: COLUMN candidates_cv.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.email IS 'Email liên hệ';


--
-- Name: COLUMN candidates_cv.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.phone IS 'Số điện thoại';


--
-- Name: COLUMN candidates_cv.cv_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.cv_text IS 'Nội dung CV dạng plain text (đã parse từ PDF)';


--
-- Name: COLUMN candidates_cv.parsed_skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.parsed_skills IS 'Kỹ năng đã trích xuất [''python'',''sql'']';


--
-- Name: COLUMN candidates_cv.project_descriptions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.project_descriptions IS 'Mô tả các dự án đã làm';


--
-- Name: COLUMN candidates_cv.education; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.education IS 'Thông tin học vấn';


--
-- Name: COLUMN candidates_cv.experience_years; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.experience_years IS 'Số năm kinh nghiệm (parsed)';


--
-- Name: COLUMN candidates_cv.avatar_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.candidates_cv.avatar_url IS 'URL ảnh đại diện';


--
-- Name: candidates_cv_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.candidates_cv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidates_cv_id_seq OWNER TO postgres;

--
-- Name: candidates_cv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.candidates_cv_id_seq OWNED BY public.candidates_cv.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    logo character varying(1000),
    cover_image character varying(1000),
    tagline character varying(255),
    industry character varying(100),
    location character varying(255),
    company_size character varying(50),
    website character varying(255),
    description text,
    benefits json,
    rating double precision,
    created_at timestamp without time zone
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: COLUMN companies.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.name IS 'Tên công ty';


--
-- Name: COLUMN companies.logo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.logo IS 'URL logo công ty';


--
-- Name: COLUMN companies.cover_image; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.cover_image IS 'URL ảnh bìa công ty';


--
-- Name: COLUMN companies.tagline; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.tagline IS 'Slogan công ty';


--
-- Name: COLUMN companies.industry; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.industry IS 'Ngành nghề / Lĩnh vực';


--
-- Name: COLUMN companies.location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.location IS 'Địa điểm trụ sở chính';


--
-- Name: COLUMN companies.company_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.company_size IS 'Quy mô nhân sự';


--
-- Name: COLUMN companies.website; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.website IS 'Website công ty';


--
-- Name: COLUMN companies.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.description IS 'Mô tả công ty & văn hóa';


--
-- Name: COLUMN companies.benefits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.benefits IS 'Danh sách phúc lợi';


--
-- Name: COLUMN companies.rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.companies.rating IS 'Đánh giá công ty';


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: job_descriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_descriptions (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    jd_text text NOT NULL,
    required_skills json,
    required_experience double precision,
    project_keywords json,
    is_active boolean,
    department character varying(100),
    location character varying(100),
    created_at timestamp without time zone,
    started_time timestamp without time zone,
    expired_time timestamp without time zone,
    custom_criteria json DEFAULT '[]'::json,
    image character varying(1000)
);


ALTER TABLE public.job_descriptions OWNER TO postgres;

--
-- Name: COLUMN job_descriptions.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.title IS 'Tên vị trí tuyển dụng';


--
-- Name: COLUMN job_descriptions.jd_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.jd_text IS 'Nội dung mô tả công việc đầy đủ';


--
-- Name: COLUMN job_descriptions.required_skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.required_skills IS 'Danh sách kỹ năng yêu cầu [''python'',''fastapi'']';


--
-- Name: COLUMN job_descriptions.required_experience; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.required_experience IS 'Số năm kinh nghiệm yêu cầu';


--
-- Name: COLUMN job_descriptions.project_keywords; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.project_keywords IS 'Từ khóa dự án liên quan [''backend api'',''deployment'']';


--
-- Name: COLUMN job_descriptions.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.is_active IS 'JD còn đang tuyển hay không';


--
-- Name: COLUMN job_descriptions.department; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.department IS 'Phòng ban';


--
-- Name: COLUMN job_descriptions.location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.location IS 'Địa điểm làm việc';


--
-- Name: job_descriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_descriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_descriptions_id_seq OWNER TO postgres;

--
-- Name: job_descriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_descriptions_id_seq OWNED BY public.job_descriptions.id;


--
-- Name: job_inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_inquiries (
    id integer NOT NULL,
    user_id integer,
    jd_id integer NOT NULL,
    sender_name character varying(255) NOT NULL,
    sender_email character varying(255) NOT NULL,
    sender_phone character varying(50),
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    status character varying(50),
    reply_message text,
    created_at timestamp without time zone
);


ALTER TABLE public.job_inquiries OWNER TO postgres;

--
-- Name: COLUMN job_inquiries.sender_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.sender_name IS 'Họ tên người gửi';


--
-- Name: COLUMN job_inquiries.sender_email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.sender_email IS 'Email người gửi';


--
-- Name: COLUMN job_inquiries.sender_phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.sender_phone IS 'Số điện thoại người gửi';


--
-- Name: COLUMN job_inquiries.subject; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.subject IS 'Tiêu đề liên hệ';


--
-- Name: COLUMN job_inquiries.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.message IS 'Nội dung tin nhắn liên hệ';


--
-- Name: COLUMN job_inquiries.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.status IS 'Trạng thái: unread | read | replied';


--
-- Name: COLUMN job_inquiries.reply_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_inquiries.reply_message IS 'Phản hồi từ nhà tuyển dụng';


--
-- Name: job_inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_inquiries_id_seq OWNER TO postgres;

--
-- Name: job_inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_inquiries_id_seq OWNED BY public.job_inquiries.id;


--
-- Name: match_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_results (
    id integer NOT NULL,
    cv_id integer NOT NULL,
    jd_id integer NOT NULL,
    match_score double precision NOT NULL,
    match_level character varying(50) NOT NULL,
    feature_details json,
    created_at timestamp without time zone,
    custom_criteria_results json DEFAULT '[]'::json,
    skill_details json DEFAULT '[]'::json,
    status character varying(50) DEFAULT 'applied'::character varying,
    applied_at timestamp without time zone,
    interview_info json
);


ALTER TABLE public.match_results OWNER TO postgres;

--
-- Name: COLUMN match_results.match_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_results.match_score IS 'Điểm phù hợp AI (0-100)';


--
-- Name: COLUMN match_results.match_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_results.match_level IS 'Mức độ: Rất phù hợp / Phù hợp / Tương đối / Chưa phù hợp';


--
-- Name: COLUMN match_results.feature_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.match_results.feature_details IS 'Chi tiết từng tiêu chí {''Exp_Diff'': 0.5, ...}';


--
-- Name: match_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.match_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.match_results_id_seq OWNER TO postgres;

--
-- Name: match_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.match_results_id_seq OWNED BY public.match_results.id;


--
-- Name: user_generated_cvs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_generated_cvs (
    id integer NOT NULL,
    user_id integer,
    title character varying(255) NOT NULL,
    language character varying(10),
    template_id character varying(50),
    target_job_title character varying(255),
    raw_input json,
    llm_output json,
    final_data json,
    avatar_url text,
    pdf_url text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.user_generated_cvs OWNER TO postgres;

--
-- Name: COLUMN user_generated_cvs.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.title IS 'Tên phiên bản CV';


--
-- Name: COLUMN user_generated_cvs.language; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.language IS 'Ngôn ngữ: vi | en';


--
-- Name: COLUMN user_generated_cvs.template_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.template_id IS 'Mẫu thiết kế: modern | classic';


--
-- Name: COLUMN user_generated_cvs.target_job_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.target_job_title IS 'Vị trí ứng tuyển mục tiêu';


--
-- Name: COLUMN user_generated_cvs.raw_input; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.raw_input IS 'Dữ liệu thô ứng viên nhập vào wizard';


--
-- Name: COLUMN user_generated_cvs.llm_output; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.llm_output IS 'Dữ liệu Gemini LLM biên tập gợi ý';


--
-- Name: COLUMN user_generated_cvs.final_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.final_data IS 'Dữ liệu cuối cùng sau khi ứng viên soát lỗi và chỉnh sửa';


--
-- Name: COLUMN user_generated_cvs.avatar_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.avatar_url IS 'URL ảnh đại diện hoặc base64';


--
-- Name: COLUMN user_generated_cvs.pdf_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_generated_cvs.pdf_url IS 'Đường dẫn file PDF đã xuất (nếu có)';


--
-- Name: user_generated_cvs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_generated_cvs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_generated_cvs_id_seq OWNER TO postgres;

--
-- Name: user_generated_cvs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_generated_cvs_id_seq OWNED BY public.user_generated_cvs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    phone character varying(50),
    is_active boolean,
    created_at timestamp without time zone,
    avatar_url text,
    firebase_uid character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.full_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.full_name IS 'Họ tên người dùng';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email IS 'Email đăng nhập';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password_hash IS 'Mật khẩu đã hash (SHA-256)';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.role IS 'Vai trò: ung_tuyen | nha_tuyen_dung';


--
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.phone IS 'Số điện thoại';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.is_active IS 'Tài khoản còn hoạt động?';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: candidates_cv id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates_cv ALTER COLUMN id SET DEFAULT nextval('public.candidates_cv_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: job_descriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_descriptions ALTER COLUMN id SET DEFAULT nextval('public.job_descriptions_id_seq'::regclass);


--
-- Name: job_inquiries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_inquiries ALTER COLUMN id SET DEFAULT nextval('public.job_inquiries_id_seq'::regclass);


--
-- Name: match_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_results ALTER COLUMN id SET DEFAULT nextval('public.match_results_id_seq'::regclass);


--
-- Name: user_generated_cvs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_generated_cvs ALTER COLUMN id SET DEFAULT nextval('public.user_generated_cvs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: candidates_cv; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidates_cv (id, full_name, email, phone, cv_text, parsed_skills, project_descriptions, education, experience_years, avatar_url, created_at, user_id) FROM stdin;
2	Nguyễn Minh Tuấn	minhtuan@email.com	0912345678	\n                Họ và tên: Nguyễn Minh Tuấn\n                Học vấn: Thạc sĩ Khoa học Máy tính - ĐH Bách Khoa TP.HCM.\n                Chứng chỉ: TOEIC 850, AWS Certified Developer Associate.\n                Kinh nghiệm: 4 năm kinh nghiệm trong lĩnh vực AI/ML.\n                Kỹ năng chuyên môn:\n                - Python, PyTorch, TensorFlow, scikit-learn.\n                - NLP: spaCy, Hugging Face Transformers, Sentence-BERT.\n                - Backend: FastAPI, Flask, Docker.\n                - Cloud: AWS SageMaker, EC2, S3.\n                Dự án nổi bật:\n                - Xây dựng hệ thống NER tiếng Việt với spaCy, đạt F1-score 92%.\n                - Fine-tune PhoBERT cho bài toán sentiment analysis.\n                - Deploy mô hình ML lên production phục vụ 10K+ requests/ngày.\n                Thành tích:\n                - Giải nhì cuộc thi AI Hackathon 2023.\n                - Published paper tại hội nghị RIVF 2024.\n                - Team Lead nhóm AI gồm 4 người.\n                	["python", "pytorch", "tensorflow", "fastapi", "flask", "docker", "aws", "spacy", "nlp"]	["H\\u1ec7 th\\u1ed1ng NER ti\\u1ebfng Vi\\u1ec7t v\\u1edbi spaCy, F1-score 92%", "Fine-tune PhoBERT cho sentiment analysis", "Deploy ML model production 10K+ requests/ng\\u00e0y"]	Thạc sĩ KHMT - ĐH Bách Khoa TP.HCM	4	\N	2026-09-24 10:19:03.567354	\N
3	Trần Thị Mai	tranmai@email.com	0923456789	\n                Họ và tên: Trần Thị Mai\n                Học vấn: Cử nhân CNTT - Đại học FPT.\n                Kinh nghiệm: 1 năm kinh nghiệm thực tập và freelance.\n                Kỹ năng:\n                - Frontend: React, JavaScript, HTML, CSS, TypeScript.\n                - Có kiến thức cơ bản về Node.js và Express.\n                - Sử dụng Git, Figma.\n                Dự án:\n                - Xây dựng website portfolio cá nhân bằng React.\n                - Tham gia phát triển landing page cho startup.\n                - Clone giao diện Spotify bằng React + Tailwind CSS.\n                Hoạt động ngoại khóa:\n                - Sinh viên xuất sắc năm 2023.\n                - Mentor cho các bạn sinh viên năm nhất về HTML/CSS.\n                	["react", "javascript", "html", "css", "typescript", "git", "node.js"]	["Website portfolio c\\u00e1 nh\\u00e2n b\\u1eb1ng React", "Landing page cho startup", "Clone giao di\\u1ec7n Spotify b\\u1eb1ng React + Tailwind CSS"]	Cử nhân CNTT - Đại học FPT	1	\N	2026-09-24 10:19:03.567355	\N
5	HÀ HOÀNG VỸ	hahoangvy0707@gmail.com	0362514115	Họ tên: HÀ HOÀNG VỸ\nEmail: hahoangvy0707@gmail.com\nĐiện thoại: 0362514115\nTóm tắt: Sinh viên năm cuối ngành Công nghệ Thông tin tại Đại học Đà Lạt với nền tảng vững chắc về phát triển phần mềm và tư duy logic, định hướng phát triển sự nghiệp trong lĩnh vực kiểm thử tự động. Sở hữu kiến thức cơ bản về Python, Selenium, Playwright cùng kỹ năng xây dựng API và phân tích yêu cầu hệ thống. Đam mê áp dụng các công cụ automation testing và quy trình CI/CD nhằm nâng cao chất lượng phần mềm doanh nghiệp.\nKỹ năng: Python, Selenium, Playwright, Automation Test, Postman, CI/CD, RESTful APIs, SQL Server, Git/GitHub, Docker\nHọc vấn: \nDự án:\n	["Python", "Selenium", "Playwright", "Automation Test", "Postman", "CI/CD", "RESTful APIs", "SQL Server", "Git/GitHub", "Docker"]	["Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher: \\u0110\\u1ea3m nhi\\u1ec7m vai tr\\u00f2 Full-stack & AI API, ch\\u1ecbu tr\\u00e1ch nhi\\u1ec7m tri\\u1ec3n khai v\\u00e0 ho\\u00e0n thi\\u1ec7n c\\u00e1c module nghi\\u1ec7p v\\u1ee5 s\\u1eed d\\u1ee5ng React, FastAPI, PostgreSQL. | X\\u00e2y d\\u1ef1ng v\\u00e0 t\\u1ed1i \\u01b0u c\\u00e1c ch\\u1ee9c n\\u0103ng n\\u00f2ng c\\u1ed1t: Thi\\u1ebft k\\u1ebf giao di\\u1ec7n ng\\u01b0\\u1eddi d\\u00f9ng v\\u00e0 vi\\u1ebft API \\u0111\\u1ed1i s\\u00e1nh CV \\u1ee9ng vi\\u00ean t\\u1ef1 \\u0111\\u1ed9ng. | \\u0110\\u1ea1t k\\u1ebft qu\\u1ea3 th\\u1ef1c t\\u1ebf: H\\u1ec7 th\\u1ed1ng v\\u1eadn h\\u00e0nh tr\\u01a1n tru v\\u1edbi ph\\u1ea3n h\\u1ed3i d\\u01b0\\u1edbi 150ms."]	Bachelor of Science in Information Technology Da Lat University	1.5	https://lh3.googleusercontent.com/a/ACg8ocKAppHmG9D6p1dd4BpKyqFhxVOyXSenXXqtl3ZZcF1eKNSKEg=s96-c	2026-09-26 16:14:06.408126	5
13	ben mr (Tối ưu cho Backend Developer (Python/FastAPI))	hahoangvy0707@gmail.com	0362514115	Họ tên: HÀ HOÀNG VỸ\nVị trí mục tiêu: Backend Developer (Python/FastAPI)\nEmail: hahoangvy0707@gmail.com\nĐiện thoại: 0362514115\nTóm tắt chuyên môn: Cử nhân Công nghệ Thông tin với nền tảng vững chắc về phát triển phần mềm và tư duy hệ thống, định hướng phát triển chuyên sâu trong lĩnh vực Backend Development với Python và FastAPI. Sở hữu kinh nghiệm thực tế trong việc thiết kế RESTful API, tối ưu cơ sở dữ liệu PostgreSQL và triển khai container hóa bằng Docker. Đam mê xây dựng các hệ thống backend hiệu năng cao, ứng dụng mô hình Agile/Scrum nhằm mang lại giá trị tối ưu cho sản phẩm.\nKỹ năng: Python, FastAPI, PostgreSQL, Docker, RESTful APIs, Git/GitHub, CI/CD, Automation Test, Selenium, Playwright\nHọc vấn: Bachelor of Science in Information Technology Da Lat University\nDự án kinh nghiệm:\nWebsite Tuyển dụng AI Matcher: Phát triển hệ thống RESTful API hiệu năng cao sử dụng Python và FastAPI để xử lý logic đối sánh CV ứng viên tự động. | Thiết kế và tối ưu cấu trúc cơ sở dữ liệu PostgreSQL nhằm giảm thiểu thời gian truy vấn và lưu trữ dữ liệu hiệu quả. | Áp dụng quy trình container hóa với Docker để đồng bộ môi trường phát triển và triển khai ứng dụng. | Đạt kết quả thực tế: Hệ thống vận hành ổn định, phản hồi API nhanh chóng dưới 150ms đáp ứng tốt yêu cầu của người dùng.	["Python", "FastAPI", "PostgreSQL", "Docker", "RESTful APIs", "Git/GitHub", "CI/CD", "Automation Test", "Selenium", "Playwright"]	["Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher: Ph\\u00e1t tri\\u1ec3n h\\u1ec7 th\\u1ed1ng RESTful API hi\\u1ec7u n\\u0103ng cao s\\u1eed d\\u1ee5ng Python v\\u00e0 FastAPI \\u0111\\u1ec3 x\\u1eed l\\u00fd logic \\u0111\\u1ed1i s\\u00e1nh CV \\u1ee9ng vi\\u00ean t\\u1ef1 \\u0111\\u1ed9ng. | Thi\\u1ebft k\\u1ebf v\\u00e0 t\\u1ed1i \\u01b0u c\\u1ea5u tr\\u00fac c\\u01a1 s\\u1edf d\\u1eef li\\u1ec7u PostgreSQL nh\\u1eb1m gi\\u1ea3m thi\\u1ec3u th\\u1eddi gian truy v\\u1ea5n v\\u00e0 l\\u01b0u tr\\u1eef d\\u1eef li\\u1ec7u hi\\u1ec7u qu\\u1ea3. | \\u00c1p d\\u1ee5ng quy tr\\u00ecnh container h\\u00f3a v\\u1edbi Docker \\u0111\\u1ec3 \\u0111\\u1ed3ng b\\u1ed9 m\\u00f4i tr\\u01b0\\u1eddng ph\\u00e1t tri\\u1ec3n v\\u00e0 tri\\u1ec3n khai \\u1ee9ng d\\u1ee5ng. | \\u0110\\u1ea1t k\\u1ebft qu\\u1ea3 th\\u1ef1c t\\u1ebf: H\\u1ec7 th\\u1ed1ng v\\u1eadn h\\u00e0nh \\u1ed5n \\u0111\\u1ecbnh, ph\\u1ea3n h\\u1ed3i API nhanh ch\\u00f3ng d\\u01b0\\u1edbi 150ms \\u0111\\u00e1p \\u1ee9ng t\\u1ed1t y\\u00eau c\\u1ea7u c\\u1ee7a ng\\u01b0\\u1eddi d\\u00f9ng."]	Bachelor of Science in Information Technology Da Lat University	1.5	https://lh3.googleusercontent.com/a/ACg8ocKAppHmG9D6p1dd4BpKyqFhxVOyXSenXXqtl3ZZcF1eKNSKEg=s96-c	2026-11-23 11:20:16.238314	5
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, logo, cover_image, tagline, industry, location, company_size, website, description, benefits, rating, created_at) FROM stdin;
1	APEX Technology Group	https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=256&h=256&fit=crop	https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop	Tiên phong Đổi mới Sáng tạo & Nền tảng AI Thông minh	Trí tuệ Nhân tạo & Phần mềm	TP. Hồ Chí Minh	500 - 1000 nhân viên	https://apex-tech.com	APEX Technology Group là tập đoàn công nghệ tiên phong tại Đông Nam Á, tập trung nghiên cứu và ứng dụng Trí tuệ Nhân tạo (Generative AI, NLP, Computer Vision) vào các bài toán chuyển đổi số doanh nghiệp quy mô lớn.	["L\\u01b0\\u01a1ng th\\u01b0\\u1edfng c\\u1ea1nh tranh (th\\u00e1ng 13, 14 theo hi\\u1ec7u su\\u1ea5t)", "C\\u1ea5p MacBook Pro M3 m\\u1edbi 100%", "L\\u00e0m vi\\u1ec7c Hybrid linh ho\\u1ea1t 2 ng\\u00e0y/tu\\u1ea7n", "B\\u1ea3o hi\\u1ec3m s\\u1ee9c kh\\u1ecfe qu\\u1ed1c t\\u1ebf cao c\\u1ea5p PTI", "Du l\\u1ecbch ngh\\u1ec9 d\\u01b0\\u1ee1ng 5 sao \\u0111\\u1ecbnh k\\u1ef3 h\\u00e0ng n\\u0103m"]	4.9	2026-10-12 10:42:55.032031
2	AI Research Lab	https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=256&h=256&fit=crop	https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop	Trung tâm Nghiên cứu & Ứng dụng Trí tuệ Nhân tạo Đỉnh cao	Trí tuệ Nhân tạo & Deep Learning	TP. Hồ Chí Minh	50 - 100 nhân viên	https://ai-research.vn	AI Research Lab tập hợp các nhà khoa học và kỹ sư AI xuất sắc, chuyên sâu vào xử lý ngôn ngữ tự nhiên (NLP) cho tiếng Việt, mô hình ngôn ngữ lớn (LLM) và các hệ thống matching thông minh.	["H\\u1ec7 th\\u1ed1ng GPU Cluster A100/H100 \\u0111i\\u1ec7n to\\u00e1n \\u0111\\u00e1m m\\u00e2y", "T\\u00e0i tr\\u1ee3 c\\u00f4ng b\\u1ed1 b\\u00e0i b\\u00e1o khoa h\\u1ecdc qu\\u1ed1c t\\u1ebf (NeurIPS, ACL)", "L\\u01b0\\u01a1ng th\\u01b0\\u1edfng theo chu\\u1ea9n nh\\u00e2n t\\u00e0i AI qu\\u1ed1c t\\u1ebf", "M\\u00f4i tr\\u01b0\\u1eddng h\\u1ecdc thu\\u1eadt t\\u1ef1 do v\\u00e0 s\\u00e1ng t\\u1ea1o cao"]	4.9	2026-10-12 10:42:55.032049
3	VNG Corporation	https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=256&h=256&fit=crop	https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=400&fit=crop	Đón nhận Thách thức & Kiến tạo Tương lai Số	Internet, Game & Điện toán Đám mây	TP. Hồ Chí Minh (VNG Campus, Quận 7)	1000+ nhân viên	https://vng.com.vn	VNG là kỳ lân công nghệ đầu tiên tại Việt Nam với các sản phẩm hàng chục triệu người dùng như Zalo, ZaloPay, VNG Cloud và các tựa game nổi tiếng toàn cầu.	["Khu\\u00f4n vi\\u00ean VNG Campus chu\\u1ea9n qu\\u1ed1c t\\u1ebf \\u0111\\u1eb3ng c\\u1ea5p", "Ph\\u00f2ng Gym, h\\u1ed3 b\\u01a1i, canteen \\u0103n s\\u00e1ng & tr\\u01b0a mi\\u1ec5n ph\\u00ed", "Ch\\u1ebf \\u0111\\u1ed9 th\\u01b0\\u1edfng ESOP v\\u00e0 hi\\u1ec7u qu\\u1ea3 c\\u00f4ng vi\\u1ec7c h\\u1ea5p d\\u1eabn", "C\\u01a1 h\\u1ed9i \\u0111\\u00e0o t\\u1ea1o c\\u00f4ng ngh\\u1ec7 h\\u00e0ng \\u0111\\u1ea7u khu v\\u1ef1c"]	4.8	2026-10-12 10:42:55.032055
5	MoMo (M_Service)	https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=256&h=256&fit=crop	https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop	Siêu Ứng dụng Tài chính cho Hàng triệu Người Việt	Fintech & Tài chính Số	TP. Hồ Chí Minh	500 - 1000 nhân viên	https://momo.vn	MoMo là siêu ứng dụng thanh toán và tài chính số hàng đầu tại Việt Nam, phục vụ hơn 31 triệu người dùng với nền tảng công nghệ chịu tải cực lớn và bảo mật cao.	["Ch\\u00ednh s\\u00e1ch th\\u01b0\\u1edfng hi\\u1ec7u qu\\u1ea3 v\\u00e0 th\\u01b0\\u1edfng d\\u1ef1 \\u00e1n h\\u00e0ng qu\\u00fd", "G\\u00f3i b\\u1ea3o hi\\u1ec3m ch\\u0103m s\\u00f3c s\\u1ee9c kh\\u1ecfe to\\u00e0n di\\u1ec7n cao c\\u1ea5p", "Tr\\u1ee3 c\\u1ea5p thi\\u1ebft b\\u1ecb c\\u00f4ng ngh\\u1ec7 l\\u00e0m vi\\u1ec7c hi\\u1ec7n \\u0111\\u1ea1i", "M\\u00f4i tr\\u01b0\\u1eddng v\\u0103n h\\u00f3a c\\u1edfi m\\u1edf, t\\u00f4n tr\\u1ecdng s\\u00e1ng ki\\u1ebfn c\\u00e1 nh\\u00e2n"]	4.8	2026-10-12 10:42:55.032062
6	Viettel Solutions	https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=256&h=256&fit=crop	https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop	Tiên phong Kiến tạo Xã hội Số	Viễn thông & Dịch vụ Số	Hà Nội	1000+ nhân viên	https://viettel.vn	Viettel Solutions là đơn vị dẫn đầu trong việc cung cấp các giải pháp công nghệ thông tin, Cloud, IoT, Big Data cho các cơ quan chính phủ và doanh nghiệp hàng đầu.	["Thu nh\\u1eadp thu\\u1ed9c top \\u0111\\u1ea7u ng\\u00e0nh vi\\u1ec5n th\\u00f4ng & c\\u00f4ng ngh\\u1ec7 s\\u1ed1", "Ph\\u00fac l\\u1ee3i v\\u1eefng ch\\u1eafc t\\u1eeb T\\u1eadp \\u0111o\\u00e0n C\\u00f4ng nghi\\u1ec7p - Vi\\u1ec5n th\\u00f4ng Qu\\u00e2n \\u0111\\u1ed9i", "Tham gia tr\\u1ef1c ti\\u1ebfp c\\u00e1c d\\u1ef1 \\u00e1n c\\u00f4ng ngh\\u1ec7 mang t\\u1ea7m v\\u00f3c qu\\u1ed1c gia", "M\\u00f4i tr\\u01b0\\u1eddng k\\u1ef7 lu\\u1eadt, chuy\\u00ean nghi\\u1ec7p v\\u00e0 \\u0111\\u1ea7y th\\u1eed th\\u00e1ch l\\u1edbn"]	4.7	2026-10-12 10:42:55.032065
4	FPT Software	https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=256&h=256&fit=crop	https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=400&fit=crop	Cùng Bạn Đi Đến Thành Công Toàn Cầu	Xuất khẩu Phần mềm & Chuyển đổi số	TP. Hồ Chí Minh (F-Town, TP. Thủ Đức)	1000+ nhân viên	https://fptsoftware.com	FPT Software là công ty phần mềm lớn nhất Việt Nam với hơn 30,000 kỹ sư công nghệ trên toàn cầu, phục vụ hàng trăm khách hàng Fortune 500 tại Mỹ, Nhật Bản, châu Âu.	["C\\u01a1 h\\u1ed9i Onsite l\\u00e0m vi\\u1ec7c d\\u00e0i h\\u1ea1n t\\u1ea1i Nh\\u1eadt B\\u1ea3n, M\\u1ef9, EU", "Xe bu\\u00fdt \\u0111\\u01b0a \\u0111\\u00f3n nh\\u00e2n vi\\u00ean mi\\u1ec5n ph\\u00ed t\\u1ea1i c\\u00e1c campus", "G\\u00f3i b\\u1ea3o hi\\u1ec3m FPT Care cho nh\\u00e2n vi\\u00ean v\\u00e0 ng\\u01b0\\u1eddi th\\u00e2n", "H\\u1ed7 tr\\u1ee3 100% l\\u1ec7 ph\\u00ed thi ch\\u1ee9ng ch\\u1ec9 qu\\u1ed1c t\\u1ebf AWS, Azure, GCP"]	4.7	2026-10-12 10:42:55.032058
\.


--
-- Data for Name: job_descriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_descriptions (id, title, jd_text, required_skills, required_experience, project_keywords, is_active, department, location, created_at, started_time, expired_time, custom_criteria, image) FROM stdin;
5	AI/ML Engineer (NLP Focus)	\n                Tuyển AI Engineer chuyên về NLP cho sản phẩm AI.\n                Mô tả công việc:\n                - Nghiên cứu và phát triển mô hình NLP (text classification, NER, semantic search).\n                - Fine-tune các pre-trained models (BERT, GPT) cho tiếng Việt.\n                - Xây dựng pipeline ML end-to-end với MLOps.\n                - Deploy mô hình AI lên production với FastAPI.\n                Yêu cầu:\n                - 2+ năm kinh nghiệm ML/AI.\n                - Thành thạo Python, PyTorch hoặc TensorFlow.\n                - Kinh nghiệm NLP: spaCy, Transformers, Sentence-BERT.\n                - Có publication hoặc giải thưởng AI là lợi thế lớn.\n                	[{"skill": "python", "importance": "core"}, {"skill": "pytorch", "importance": "core"}, {"skill": "tensorflow", "importance": "supporting"}, {"skill": "fastapi", "importance": "supporting"}, {"skill": "docker", "importance": "preferred"}]	2	["NLP", "machine learning", "model deployment", "text processing"]	t	AI Research Lab	TP. Hồ Chí Minh	2026-09-24 10:19:03.556456	2026-09-25 19:51:00	2026-10-04 19:51:00	[]	/images/hochiminh.png
3	Full-stack Developer (C#/.NET + React)	\n                Tuyển Full-stack Developer cho hệ thống ERP.\n                Mô tả công việc:\n                - Phát triển backend với ASP.NET Core và Entity Framework.\n                - Xây dựng frontend với React hoặc Angular.\n                - Quản trị SQL Server và PostgreSQL.\n                - Deploy ứng dụng lên Azure Cloud.\n                Yêu cầu:\n                - 3+ năm kinh nghiệm phát triển phần mềm.\n                - Thành thạo C#, ASP.NET Core, SQL Server.\n                - Kinh nghiệm React hoặc Angular.\n                - Có kinh nghiệm Azure/AWS là lợi thế.\n                	["c#", "asp.net core", "sql server", "react", "azure"]	3	["ERP system", "enterprise application", "cloud deployment", "full-stack"]	t	FPT Software	TP. Hồ Chí Minh	2026-09-24 10:19:03.556454	\N	\N	[]	/images/DaNang.png
4	DevOps Engineer	\n                Tuyển DevOps Engineer cho team Infrastructure.\n                Mô tả công việc:\n                - Thiết kế và quản lý CI/CD pipelines.\n                - Quản trị hệ thống Kubernetes cluster trên AWS/GCP.\n                - Monitoring, logging và alerting với Prometheus/Grafana.\n                - Infrastructure as Code với Terraform/Ansible.\n                Yêu cầu:\n                - 3+ năm kinh nghiệm DevOps/SRE.\n                - Thành thạo Docker, Kubernetes, Helm.\n                - Kinh nghiệm AWS hoặc GCP.\n                - Scripting: Python hoặc Bash.\n                	["docker", "kubernetes", "aws", "terraform", "python"]	3	["CI/CD", "cloud infrastructure", "monitoring", "automation"]	t	Viettel Solutions	Hà Nội	2026-09-24 10:19:03.556455	\N	\N	[]	/images/hochiminh.png
2	Frontend Developer (React/TypeScript)	\n                Tuyển Frontend Developer cho dự án SaaS.\n                Mô tả công việc:\n                - Phát triển giao diện người dùng với React và TypeScript.\n                - Xây dựng UI components tái sử dụng với design system.\n                - Tích hợp API RESTful và GraphQL.\n                - Tối ưu performance và responsive design.\n                Yêu cầu:\n                - 1+ năm kinh nghiệm Frontend development.\n                - Thành thạo React, JavaScript, TypeScript, HTML, CSS.\n                - Kinh nghiệm với state management (Redux/Zustand).\n                - Biết UI/UX design là lợi thế.\n                	["react", "javascript", "typescript", "html", "css"]	1	["user interface", "responsive design", "SPA", "design system"]	t	VNG Corporation	TP. Hồ Chí Minh	2026-09-24 10:19:03.556452	\N	\N	[]	/images/hanoi.png
1	Backend Developer (Python/FastAPI)	\n                Công ty ABC tuyển Backend Developer.\n                Mô tả công việc:\n                - Phát triển và bảo trì các RESTful API sử dụng Python và FastAPI.\n                - Thiết kế và tối ưu cơ sở dữ liệu PostgreSQL.\n                - Triển khai CI/CD pipeline và container hóa ứng dụng với Docker.\n                - Làm việc theo mô hình Agile/Scrum với team 5-8 người.\n                Yêu cầu:\n                - Tối thiểu 2 năm kinh nghiệm Backend development.\n                - Thành thạo Python, FastAPI hoặc Django.\n                - Kinh nghiệm với PostgreSQL, Redis.\n                - Có kinh nghiệm Docker, CI/CD là lợi thế lớn.\n                	["python", "fastapi", "postgresql", "docker", "redis"]	2	["backend api", "database optimization", "deployment", "microservices"]	t	APEX Technology Group	TP. Hồ Chí Minh	2026-09-24 10:19:03.556446	\N	\N	[{"name": "T\\u00e0i kho\\u1ea3n GitHub", "keywords": "github", "level": "must"}]	/images/hochiminh.png
6	Mobile Developer (Flutter/React Native)	\n                Tuyển Mobile Developer tham gia phát triển ứng dụng di động fintech.\n                Mô tả công việc:\n                - Phát triển và tối ưu các tính năng trên mobile app sử dụng Flutter hoặc React Native.\n                - Phối hợp với Backend team để tích hợp RESTful API và WebSocket.\n                - Quản lý state hiệu quả với Bloc, Provider hoặc Redux/Zustand.\n                - Tối ưu hóa UI/UX mượt mà, responsive trên cả iOS và Android.\n                Yêu cầu:\n                - 2+ năm kinh nghiệm lập trình Mobile (Flutter hoặc React Native).\n                - Thành thạo Dart hoặc TypeScript/JavaScript.\n                - Nắm vững kiến thức về Mobile Lifecycle, offline storage, push notifications.\n                - Có sản phẩm đã phát hành trên App Store hoặc Google Play là lợi thế lớn.\n                	["flutter", "react native", "dart", "typescript", "restful api"]	2	["mobile app", "cross-platform", "state management", "fintech payment"]	t	MoMo (M_Service)	TP. Hồ Chí Minh	2026-11-11 14:20:54.137698	\N	\N	[]	/images/hochiminh.png
7	Data Engineer (Python/Spark/Airflow)	\n                Tuyển Data Engineer xây dựng hệ thống xử lý dữ liệu lớn.\n                Mô tả công việc:\n                - Thiết kế, xây dựng và tối ưu các pipeline ETL/ELT xử lý dữ liệu lớn từ nhiều nguồn.\n                - Lập lịch và điều phối luồng dữ liệu tự động với Apache Airflow.\n                - Xử lý streaming data thời gian thực với Apache Kafka và Spark Streaming.\n                - Thiết kế kiến trúc Data Warehouse và tối ưu truy vấn SQL phân tích.\n                Yêu cầu:\n                - 2+ năm kinh nghiệm Data Engineering / Big Data.\n                - Thành thạo Python, SQL nâng cao.\n                - Kinh nghiệm thực tế với Apache Spark, Apache Airflow hoặc Kafka.\n                - Hiểu biết về cơ sở dữ liệu quan hệ (PostgreSQL) và NoSQL.\n                	["python", "sql", "spark", "airflow", "kafka", "postgresql"]	2	["data pipeline", "etl", "big data", "data warehouse", "lakehouse"]	t	Viettel Solutions	Hà Nội	2026-11-11 14:20:54.137712	\N	\N	[]	/images/hanoi.png
8	QA Automation Engineer (Selenium/Playwright/Python)	\n                Tuyển QA Automation Engineer phụ trách kiểm thử tự động cho hệ thống doanh nghiệp.\n                Mô tả công việc:\n                - Thiết kế, xây dựng và bảo trì Automation Test Framework cho Web UI và REST API.\n                - Viết test scripts tự động sử dụng Selenium hoặc Playwright kết hợp với Python.\n                - Tích hợp test suite tự động vào quy trình CI/CD (GitHub Actions / Jenkins / GitLab CI).\n                - Thực hiện API testing, regression testing và lập báo cáo chất lượng kiểm thử.\n                Yêu cầu:\n                - 2+ năm kinh nghiệm làm Automation Testing.\n                - Thành thạo một trong các công cụ: Selenium, Playwright, Cypress.\n                - Nắm vững ngôn ngữ lập trình Python hoặc Java/JavaScript.\n                - Thành thạo Postman/Newman cho kiểm thử API và hiểu biết về CI/CD.\n                	["selenium", "playwright", "python", "automation test", "postman", "ci/cd"]	2	["automation testing", "test framework", "api testing", "ci/cd pipeline", "regression test"]	t	FPT Software	Đà Nẵng	2026-11-11 14:20:54.137716	\N	\N	[]	/images/DaNang.png
\.


--
-- Data for Name: job_inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_inquiries (id, user_id, jd_id, sender_name, sender_email, sender_phone, subject, message, status, reply_message, created_at) FROM stdin;
1	5	7	ben mr	mrbenhandsome2000@gmail.com	\N	Quy trình & lịch trình phỏng vấn	hello nhà tuyển dụng	read	\N	2026-11-11 15:42:32.383284
\.


--
-- Data for Name: match_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.match_results (id, cv_id, jd_id, match_score, match_level, feature_details, created_at, custom_criteria_results, skill_details, status, applied_at, interview_info) FROM stdin;
303	3	2	72.47	Phù hợp	{"Exp_Diff": 0.0, "Skill_Match_Ratio": 1.0, "Project_Similarity_Score": 0.4065, "Has_Live_Deployment": 0, "JD_Similarity_Score": 0.6274, "Has_Degree": 1, "Has_English_Cert": 0, "Has_Leadership": 1, "Has_Award": 1, "Skill_Fit_Score": 0.0, "Skill_Applicable": 0.0}	2026-10-10 16:10:43.844576	[]	[]	applied	2026-10-12 14:33:13.604715	\N
336	5	5	44.3	Tương đối	{"Exp_Diff": 0.0, "Skill_Match_Ratio": 0.2, "Project_Similarity_Score": 0.2696, "Has_Live_Deployment": 1, "JD_Similarity_Score": 0.3935, "Has_Degree": 1, "Has_English_Cert": 1, "Has_Leadership": 0, "Has_Award": 1, "Skill_Fit_Score": 0.022727272727272728, "Skill_Applicable": 1.0}	2026-10-12 08:20:46.096766	[]	[{"skill": "python", "weight": 3, "m": 0, "reason_code": "not_found", "reason": "CV kh\\u00f4ng \\u0111\\u1ec1 c\\u1eadp \\u0111\\u1ebfn k\\u1ef9 n\\u0103ng Python.", "evidence": []}, {"skill": "pytorch", "weight": 3, "m": 0, "reason_code": "not_found", "reason": "CV kh\\u00f4ng \\u0111\\u1ec1 c\\u1eadp \\u0111\\u1ebfn k\\u1ef9 n\\u0103ng PyTorch.", "evidence": []}, {"skill": "tensorflow", "weight": 2, "m": 0, "reason_code": "not_found", "reason": "CV kh\\u00f4ng \\u0111\\u1ec1 c\\u1eadp \\u0111\\u1ebfn k\\u1ef9 n\\u0103ng TensorFlow.", "evidence": []}, {"skill": "fastapi", "weight": 2, "m": 0, "reason_code": "not_found", "reason": "CV kh\\u00f4ng \\u0111\\u1ec1 c\\u1eadp \\u0111\\u1ebfn k\\u1ef9 n\\u0103ng FastAPI.", "evidence": []}, {"skill": "docker", "weight": 1, "m": 0.25, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean ch\\u1ec9 li\\u1ec7t k\\u00ea Docker trong ph\\u1ea7n c\\u00f4ng c\\u1ee5 v\\u00e0 d\\u1ef1 \\u00e1n Dalat Lookbook m\\u00e0 ch\\u01b0a m\\u00f4 t\\u1ea3 chi ti\\u1ebft nhi\\u1ec7m v\\u1ee5 \\u1ee9ng d\\u1ee5ng c\\u1ee5 th\\u1ec3.", "evidence": [{"source_id": "cv", "quote": "Tools: Git/GitHub, Visual Studio, VS Code, Supabase, Docker, AWS EC2"}, {"source_id": "cv", "quote": "Technologies: Next.js, TypeScript, Tailwind CSS, Supabase, Docker, AWS EC2."}]}]	hired	2026-10-12 02:04:05.606525	{"type": "hired", "status": "hired", "hired_at": "2026-11-12T05:44:10.508602", "scheduled_at": "2026-11-13", "start_date": "2026-11-13", "salary_offer": "25", "message": "Ch\\u00fac m\\u1eebng b\\u1ea1n H\\u00c0 HO\\u00c0NG V\\u1ef8! Sau khi \\u0111\\u00e1nh gi\\u00e1 h\\u1ed3 s\\u01a1 v\\u00e0 n\\u0103ng l\\u1ef1c, ch\\u00fang t\\u00f4i nh\\u1eadn th\\u1ea5y b\\u1ea1n r\\u1ea5t ph\\u00f9 h\\u1ee3p v\\u1edbi v\\u1ecb tr\\u00ed AI/ML Engineer (NLP Focus) t\\u1ea1i AI Research Lab. Ban Nh\\u00e2n s\\u1ef1 xin tr\\u00e2n tr\\u1ecdng th\\u00f4ng b\\u00e1o b\\u1ea1n \\u0111\\u00e3 \\u0111\\u01b0\\u1ee3c tuy\\u1ec3n d\\u1ee5ng v\\u00e0o l\\u00e0m vi\\u1ec7c. Ch\\u00fang t\\u00f4i s\\u1ebd s\\u1edbm li\\u00ean h\\u1ec7 \\u0111\\u1ec3 trao \\u0111\\u1ed5i c\\u00e1c b\\u01b0\\u1edbc ti\\u1ebfp theo.", "note": "Ch\\u00fac m\\u1eebng b\\u1ea1n H\\u00c0 HO\\u00c0NG V\\u1ef8! Sau khi \\u0111\\u00e1nh gi\\u00e1 h\\u1ed3 s\\u01a1 v\\u00e0 n\\u0103ng l\\u1ef1c, ch\\u00fang t\\u00f4i nh\\u1eadn th\\u1ea5y b\\u1ea1n r\\u1ea5t ph\\u00f9 h\\u1ee3p v\\u1edbi v\\u1ecb tr\\u00ed AI/ML Engineer (NLP Focus) t\\u1ea1i AI Research Lab. Ban Nh\\u00e2n s\\u1ef1 xin tr\\u00e2n tr\\u1ecdng th\\u00f4ng b\\u00e1o b\\u1ea1n \\u0111\\u00e3 \\u0111\\u01b0\\u1ee3c tuy\\u1ec3n d\\u1ee5ng v\\u00e0o l\\u00e0m vi\\u1ec7c. Ch\\u00fang t\\u00f4i s\\u1ebd s\\u1edbm li\\u00ean h\\u1ec7 \\u0111\\u1ec3 trao \\u0111\\u1ed5i c\\u00e1c b\\u01b0\\u1edbc ti\\u1ebfp theo.", "job_title": "AI/ML Engineer (NLP Focus)", "department": "AI Research Lab", "location": "TP. H\\u1ed3 Ch\\u00ed Minh", "read": false, "updated_at": "2026-11-12T05:44:10.508602"}
340	13	1	58.5	Tương đối phù hợp	{"Exp_Diff": -2, "Skill_Match_Ratio": 0.4, "Project_Similarity_Score": 0.4154, "Has_Live_Deployment": 1, "JD_Similarity_Score": 0.5122, "Has_Degree": 1, "Has_English_Cert": 0, "Has_Leadership": 0, "Has_Award": 0, "Skill_Fit_Score": 0.45, "Exp_Fit_Score": 0.25, "Project_Fit_Score": 0.75, "Edu_Fit_Score": 0.75, "Skill_Applicable": 1, "pillar_scores": {"skills": 45, "experience": 25, "projects": 75, "education": 75}, "all_criteria_details": {"skills": [{"name": "Python", "skill": "Python", "pillar": "skills", "importance": "core", "weight": 3, "level": 2, "m": 0.5, "reason_code": "partially_met", "reason": "\\u1ee8ng vi\\u00ean c\\u00f3 li\\u1ec7t k\\u00ea Python trong k\\u1ef9 n\\u0103ng nh\\u01b0ng ch\\u01b0a ch\\u1ee9ng minh \\u0111\\u01b0\\u1ee3c m\\u1ee9c \\u0111\\u1ed9 th\\u00e0nh th\\u1ea1o n\\u00e2ng cao theo y\\u00eau c\\u1ea7u.", "evidence": [{"source_id": "cv", "quote": "K\\u1ef9 n\\u0103ng: Python, Selenium, Playwright, Automation Test, Postman, CI/CD, RESTful APIs, SQL Server, Git/GitHub, Docker"}]}, {"name": "FastAPI", "skill": "FastAPI", "pillar": "skills", "importance": "core", "weight": 3, "level": 3, "m": 0.75, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean c\\u00f3 kinh nghi\\u1ec7m s\\u1eed d\\u1ee5ng FastAPI trong d\\u1ef1 \\u00e1n Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher.", "evidence": [{"source_id": "proj_0", "quote": "Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher: \\u0110\\u1ea3m nhi\\u1ec7m vai tr\\u00f2 Full-stack & AI API, ch\\u1ecbu tr\\u00e1ch nhi\\u1ec7m tri\\u1ec3n khai v\\u00e0 ho\\u00e0n thi\\u1ec7n c\\u00e1c module nghi\\u1ec7p v\\u1ee5 s\\u1eed d\\u1ee5ng React, FastAPI, PostgreSQL."}]}, {"name": "PostgreSQL", "skill": "PostgreSQL", "pillar": "skills", "importance": "core", "weight": 3, "level": 3, "m": 0.75, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean \\u0111\\u00e3 s\\u1eed d\\u1ee5ng PostgreSQL trong d\\u1ef1 \\u00e1n AI Matcher.", "evidence": [{"source_id": "proj_0", "quote": "Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher: \\u0110\\u1ea3m nhi\\u1ec7m vai tr\\u00f2 Full-stack & AI API, ch\\u1ecbu tr\\u00e1ch nhi\\u1ec7m tri\\u1ec3n khai v\\u00e0 ho\\u00e0n thi\\u1ec7n c\\u00e1c module nghi\\u1ec7p v\\u1ee5 s\\u1eed d\\u1ee5ng React, FastAPI, PostgreSQL."}]}, {"name": "Docker", "skill": "Docker", "pillar": "skills", "importance": "core", "weight": 3, "level": 1, "m": 0.25, "reason_code": "partially_met", "reason": "\\u1ee8ng vi\\u00ean ch\\u1ec9 li\\u1ec7t k\\u00ea Docker trong ph\\u1ea7n k\\u1ef9 n\\u0103ng m\\u00e0 ch\\u01b0a c\\u00f3 minh ch\\u1ee9ng \\u00e1p d\\u1ee5ng trong d\\u1ef1 \\u00e1n c\\u1ee5 th\\u1ec3.", "evidence": [{"source_id": "cv", "quote": "K\\u1ef9 n\\u0103ng: Python, Selenium, Playwright, Automation Test, Postman, CI/CD, RESTful APIs, SQL Server, Git/GitHub, Docker"}]}, {"name": "Redis", "skill": "Redis", "pillar": "skills", "importance": "core", "weight": 3, "level": 0, "m": 0, "reason_code": "not_found", "reason": "CV kh\\u00f4ng \\u0111\\u1ec1 c\\u1eadp \\u0111\\u1ebfn k\\u1ef9 n\\u0103ng Redis.", "evidence": []}], "experience": [{"name": "S\\u1ed1 n\\u0103m kinh nghi\\u1ec7m Backend", "skill": "S\\u1ed1 n\\u0103m kinh nghi\\u1ec7m Backend", "pillar": "experience", "importance": "core", "weight": 3, "level": 1, "m": 0.25, "reason_code": "partially_met", "reason": "JD y\\u00eau c\\u1ea7u t\\u1ed1i thi\\u1ec3u 2 n\\u0103m kinh nghi\\u1ec7m, trong khi \\u1ee9ng vi\\u00ean l\\u00e0 sinh vi\\u00ean n\\u0103m cu\\u1ed1i v\\u00e0 c\\u00f3 kho\\u1ea3ng 1 n\\u0103m kinh nghi\\u1ec7m th\\u1ef1c t\\u1ebf.", "evidence": [{"source_id": "cv", "quote": "Sinh vi\\u00ean n\\u0103m cu\\u1ed1i ng\\u00e0nh C\\u00f4ng ngh\\u1ec7 Th\\u00f4ng tin t\\u1ea1i \\u0110\\u1ea1i h\\u1ecdc \\u0110\\u00e0 L\\u1ea1t"}]}], "projects": [{"name": "Backend API & Database Optimization", "skill": "Backend API & Database Optimization", "pillar": "projects", "importance": "supporting", "weight": 2, "level": 3, "m": 0.75, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean tham gia x\\u00e2y d\\u1ef1ng API \\u0111\\u1ed1i s\\u00e1nh CV v\\u00e0 c\\u00e1c module nghi\\u1ec7p v\\u1ee5 trong d\\u1ef1 \\u00e1n AI Matcher.", "evidence": [{"source_id": "proj_0", "quote": "X\\u00e2y d\\u1ef1ng v\\u00e0 t\\u1ed1i \\u01b0u c\\u00e1c ch\\u1ee9c n\\u0103ng n\\u00f2ng c\\u1ed1t: Thi\\u1ebft k\\u1ebf giao di\\u1ec7n ng\\u01b0\\u1eddi d\\u00f9ng v\\u00e0 vi\\u1ebft API \\u0111\\u1ed1i s\\u00e1nh CV \\u1ee9ng vi\\u00ean t\\u1ef1 \\u0111\\u1ed9ng."}]}], "education": [{"name": "Tr\\u00ecnh \\u0111\\u1ed9 chuy\\u00ean m\\u00f4n CNTT", "skill": "Tr\\u00ecnh \\u0111\\u1ed9 chuy\\u00ean m\\u00f4n CNTT", "pillar": "education", "importance": "supporting", "weight": 2, "level": 3, "m": 0.75, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean l\\u00e0 sinh vi\\u00ean n\\u0103m cu\\u1ed1i ng\\u00e0nh C\\u00f4ng ngh\\u1ec7 Th\\u00f4ng tin t\\u1ea1i \\u0110\\u1ea1i h\\u1ecdc \\u0110\\u00e0 L\\u1ea1t.", "evidence": [{"source_id": "cv", "quote": "Sinh vi\\u00ean n\\u0103m cu\\u1ed1i ng\\u00e0nh C\\u00f4ng ngh\\u1ec7 Th\\u00f4ng tin t\\u1ea1i \\u0110\\u1ea1i h\\u1ecdc \\u0110\\u00e0 L\\u1ea1t"}]}]}, "candidate_summary": "\\u1ee8ng vi\\u00ean H\\u00e0 Ho\\u00e0ng V\\u1ef9 l\\u00e0 sinh vi\\u00ean n\\u0103m cu\\u1ed1i ng\\u00e0nh CNTT, \\u0111\\u1ecbnh h\\u01b0\\u1edbng Automation Test nh\\u01b0ng \\u0111ang \\u1ee9ng tuy\\u1ec3n v\\u1ecb tr\\u00ed Backend Developer, \\u0111\\u00e1p \\u1ee9ng m\\u1ed9t ph\\u1ea7n k\\u1ef9 n\\u0103ng Python v\\u00e0 FastAPI nh\\u01b0ng thi\\u1ebfu kinh nghi\\u1ec7m l\\u00e0m vi\\u1ec7c th\\u1ef1c t\\u1ebf theo y\\u00eau c\\u1ea7u JD.", "audit_trail": {"original_match_score": 43.7, "original_match_level": "T\\u01b0\\u01a1ng \\u0111\\u1ed1i", "original_pillar_scores": {"skills": 45, "experience": 25, "projects": 75, "education": 75}, "verified_match_score": 58.5, "verified_match_level": "T\\u01b0\\u01a1ng \\u0111\\u1ed1i ph\\u00f9 h\\u1ee3p", "verified_pillar_scores": {"skills": 60, "experience": 50, "projects": 75, "education": 75}, "audited_evidences": [{"criterion_name": "Kinh nghi\\u1ec7m l\\u00e0m vi\\u1ec7c 2 n\\u0103m (Backend Developer (Python/FastAPI))", "pillar": "experience", "credibility_score": 0.95, "verdict": "verified_high", "audit_reason": "\\u1ee8ng vi\\u00ean c\\u00f3 \\u0111\\u00ednh k\\u00e8m t\\u1ec7p h\\u00ecnh \\u1ea3nh minh ch\\u1ee9ng kinh nghi\\u1ec7m h\\u1ee3p l\\u1ec7 (/uploads/evidence/ev_1795382383_minhchungkinhnghiem.png). M\\u1eb7c d\\u00f9 CV g\\u1ed1c n\\u00eau 1.5 n\\u0103m kinh nghi\\u1ec7m v\\u00e0 \\u0111\\u1ecbnh h\\u01b0\\u1edbng Automation Test, vi\\u1ec7c cung c\\u1ea5p minh ch\\u1ee9ng tr\\u1ef1c quan cho th\\u1ea5y \\u1ee9ng vi\\u00ean \\u0111\\u00e3 th\\u1ef1c t\\u1ebf tham gia ph\\u00e1t tri\\u1ec3n backend v\\u1edbi Python/FastAPI, \\u0111\\u00e1p \\u1ee9ng t\\u1ed1t y\\u00eau c\\u1ea7u c\\u1ed1t l\\u00f5i c\\u1ee7a v\\u1ecb tr\\u00ed.", "awarded_level": 4, "evidence_quote": "\\u0110\\u00ednh k\\u00e8m t\\u1ec7p minh ch\\u1ee9ng: minhchungkinhnghiem.png cho th\\u1ea5y n\\u0103ng l\\u1ef1c Backend Developer.", "evidence_file_url": "/uploads/evidence/ev_1795382383_minhchungkinhnghiem.png", "evidence_file_name": "minhchungkinhnghiem.png"}], "overall_credibility": 0.9, "challenge_results": {"score_percent": 50, "correct_count": 1, "total_count": 2, "details": [{"question_id": "q1", "criterion_name": "FastAPI", "question": "Trong FastAPI, khi b\\u1ea1n mu\\u1ed1n th\\u1ef1c hi\\u1ec7n c\\u00e1c t\\u00e1c v\\u1ee5 b\\u1ea5t \\u0111\\u1ed3ng b\\u1ed9 (nh\\u01b0 g\\u1ecdi API b\\u00ean ngo\\u00e0i ho\\u1eb7c truy v\\u1ea5n DB t\\u1ed1n th\\u1eddi gian) m\\u00e0 kh\\u00f4ng l\\u00e0m block v\\u00f2ng l\\u1eb7p s\\u1ef1 ki\\u1ec7n ch\\u00ednh (event loop) c\\u1ee7a ASGI server, c\\u00e1ch ti\\u1ebfp c\\u1eadn chu\\u1ea9n x\\u00e1c nh\\u1ea5t l\\u00e0 g\\u00ec?", "user_choice": 0, "correct_choice": 0, "is_correct": true, "explanation": "Khi khai b\\u00e1o b\\u1eb1ng `def` thu\\u1ea7n (kh\\u00f4ng c\\u00f3 async), FastAPI s\\u1ebd t\\u1ef1 \\u0111\\u1ed9ng ch\\u1ea1y h\\u00e0m \\u0111\\u00f3 trong m\\u1ed9t external threadpool (Starlette's run_in_threadpool), gi\\u00fap tr\\u00e1nh vi\\u1ec7c block event loop ch\\u00ednh khi x\\u1eed l\\u00fd c\\u00e1c I/O blocking ho\\u1eb7c th\\u01b0 vi\\u1ec7n \\u0111\\u1ed3ng b\\u1ed9."}, {"question_id": "q2", "criterion_name": "PostgreSQL & Redis", "question": "Khi \\u00e1p d\\u1ee5ng chi\\u1ebfn l\\u01b0\\u1ee3c Cache-aside Pattern v\\u1edbi Redis \\u0111\\u1ec3 gi\\u1ea3m t\\u1ea3i cho PostgreSQL trong \\u1ee9ng d\\u1ee5ng FastAPI, b\\u01b0\\u1edbc x\\u1eed l\\u00fd n\\u00e0o l\\u00e0 b\\u1eaft bu\\u1ed9c khi d\\u1eef li\\u1ec7u trong database b\\u1ecb c\\u1eadp nh\\u1eadt (Update/Delete)?", "user_choice": 0, "correct_choice": 1, "is_correct": false, "explanation": "Trong Cache-aside pattern, \\u0111\\u1ec3 tr\\u00e1nh t\\u00ecnh tr\\u1ea1ng d\\u1eef li\\u1ec7u c\\u0169 (stale cache), l\\u1eadp tr\\u00ecnh vi\\u00ean ph\\u1ea3i ch\\u1ee7 \\u0111\\u1ed9ng x\\u00f3a ho\\u1eb7c c\\u1eadp nh\\u1eadt l\\u1ea1i cache ngay khi database c\\u00f3 thay \\u0111\\u1ed5i d\\u1eef li\\u1ec7u."}], "summary": "\\u1ee8ng vi\\u00ean tr\\u1ea3 l\\u1eddi \\u0111\\u00fang 1/2 c\\u00e2u h\\u1ecfi ki\\u1ec3m tra nhanh (50.0%)."}, "interview_probe_kit": ["D\\u1ef1a tr\\u00ean h\\u00ecnh \\u1ea3nh minh ch\\u1ee9ng kinh nghi\\u1ec7m, h\\u00e3y m\\u00f4 t\\u1ea3 chi ti\\u1ebft m\\u1ed9t API ph\\u1ee9c t\\u1ea1p nh\\u1ea5t m\\u00e0 b\\u1ea1n t\\u1eebng x\\u00e2y d\\u1ef1ng b\\u1eb1ng FastAPI, bao g\\u1ed3m c\\u00e1ch x\\u1eed l\\u00fd Dependency Injection v\\u00e0 x\\u00e1c th\\u1ef1c JWT?", "Trong qu\\u00e1 tr\\u00ecnh l\\u00e0m vi\\u1ec7c v\\u1edbi PostgreSQL v\\u00e0 Redis, b\\u1ea1n \\u0111\\u00e3 t\\u1eebng g\\u1eb7p b\\u00e0i to\\u00e1n cache stampede (hi\\u1ec7n t\\u01b0\\u1ee3ng \\u0111\\u1ed3ng lo\\u1ea1t truy v\\u1ea5n DB khi cache expired) ch\\u01b0a? B\\u1ea1n \\u0111\\u00e3 gi\\u1ea3i quy\\u1ebft n\\u00f3 nh\\u01b0 th\\u1ebf n\\u00e0o?", "Quy tr\\u00ecnh CI/CD m\\u00e0 b\\u1ea1n \\u0111\\u00e3 t\\u1eebng tri\\u1ec3n khai cho c\\u00e1c \\u1ee9ng d\\u1ee5ng Python/FastAPI container h\\u00f3a b\\u1eb1ng Docker di\\u1ec5n ra nh\\u01b0 th\\u1ebf n\\u00e0o? B\\u1ea1n d\\u00f9ng c\\u00f4ng c\\u1ee5 g\\u00ec \\u0111\\u1ec3 build v\\u00e0 deploy?", "CV g\\u1ed1c c\\u1ee7a b\\u1ea1n \\u0111\\u1ecbnh h\\u01b0\\u1edbng v\\u1ec1 Automation Test nh\\u01b0ng b\\u1ed5 sung kinh nghi\\u1ec7m Backend Developer, h\\u00e3y chia s\\u1ebb c\\u00e1ch t\\u01b0 duy ki\\u1ec3m th\\u1eed ph\\u1ea7n m\\u1ec1m gi\\u00fap \\u00edch g\\u00ec cho b\\u1ea1n trong vi\\u1ec7c vi\\u1ebft unit test v\\u00e0 integration test cho c\\u00e1c FastAPI project?"]}}	2026-11-23 04:20:16.310297	[{"name": "T\\u00e0i kho\\u1ea3n GitHub", "level": "must", "met": true, "score_impact": 0}]	[{"name": "Python", "skill": "Python", "pillar": "skills", "importance": "core", "weight": 3, "level": 2, "m": 0.5, "reason_code": "partially_met", "reason": "\\u1ee8ng vi\\u00ean c\\u00f3 li\\u1ec7t k\\u00ea Python trong k\\u1ef9 n\\u0103ng nh\\u01b0ng ch\\u01b0a ch\\u1ee9ng minh \\u0111\\u01b0\\u1ee3c m\\u1ee9c \\u0111\\u1ed9 th\\u00e0nh th\\u1ea1o n\\u00e2ng cao theo y\\u00eau c\\u1ea7u.", "evidence": [{"source_id": "cv", "quote": "K\\u1ef9 n\\u0103ng: Python, Selenium, Playwright, Automation Test, Postman, CI/CD, RESTful APIs, SQL Server, Git/GitHub, Docker"}]}, {"name": "FastAPI", "skill": "FastAPI", "pillar": "skills", "importance": "core", "weight": 3, "level": 3, "m": 0.75, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean c\\u00f3 kinh nghi\\u1ec7m s\\u1eed d\\u1ee5ng FastAPI trong d\\u1ef1 \\u00e1n Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher.", "evidence": [{"source_id": "proj_0", "quote": "Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher: \\u0110\\u1ea3m nhi\\u1ec7m vai tr\\u00f2 Full-stack & AI API, ch\\u1ecbu tr\\u00e1ch nhi\\u1ec7m tri\\u1ec3n khai v\\u00e0 ho\\u00e0n thi\\u1ec7n c\\u00e1c module nghi\\u1ec7p v\\u1ee5 s\\u1eed d\\u1ee5ng React, FastAPI, PostgreSQL."}]}, {"name": "PostgreSQL", "skill": "PostgreSQL", "pillar": "skills", "importance": "core", "weight": 3, "level": 3, "m": 0.75, "reason_code": "evidence_based", "reason": "\\u1ee8ng vi\\u00ean \\u0111\\u00e3 s\\u1eed d\\u1ee5ng PostgreSQL trong d\\u1ef1 \\u00e1n AI Matcher.", "evidence": [{"source_id": "proj_0", "quote": "Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher: \\u0110\\u1ea3m nhi\\u1ec7m vai tr\\u00f2 Full-stack & AI API, ch\\u1ecbu tr\\u00e1ch nhi\\u1ec7m tri\\u1ec3n khai v\\u00e0 ho\\u00e0n thi\\u1ec7n c\\u00e1c module nghi\\u1ec7p v\\u1ee5 s\\u1eed d\\u1ee5ng React, FastAPI, PostgreSQL."}]}, {"name": "Docker", "skill": "Docker", "pillar": "skills", "importance": "core", "weight": 3, "level": 1, "m": 0.25, "reason_code": "partially_met", "reason": "\\u1ee8ng vi\\u00ean ch\\u1ec9 li\\u1ec7t k\\u00ea Docker trong ph\\u1ea7n k\\u1ef9 n\\u0103ng m\\u00e0 ch\\u01b0a c\\u00f3 minh ch\\u1ee9ng \\u00e1p d\\u1ee5ng trong d\\u1ef1 \\u00e1n c\\u1ee5 th\\u1ec3.", "evidence": [{"source_id": "cv", "quote": "K\\u1ef9 n\\u0103ng: Python, Selenium, Playwright, Automation Test, Postman, CI/CD, RESTful APIs, SQL Server, Git/GitHub, Docker"}]}, {"name": "Redis", "skill": "Redis", "pillar": "skills", "importance": "core", "weight": 3, "level": 0, "m": 0, "reason_code": "not_found", "reason": "CV kh\\u00f4ng \\u0111\\u1ec1 c\\u1eadp \\u0111\\u1ebfn k\\u1ef9 n\\u0103ng Redis.", "evidence": []}]	applied	2026-11-23 04:20:16.310297	\N
334	2	5	81.96	Rất phù hợp	{"Exp_Diff": 2.0, "Skill_Match_Ratio": 1.0, "Project_Similarity_Score": 0.3416, "Has_Live_Deployment": 1, "JD_Similarity_Score": 0.7119, "Has_Degree": 1, "Has_English_Cert": 1, "Has_Leadership": 1, "Has_Award": 1, "Skill_Fit_Score": 0.25, "Skill_Applicable": 1.0}	2026-10-12 08:20:46.065366	[]	[{"skill": "python", "weight": 3.0, "m": 0.25, "reason_code": "evidence_based", "reason": "CV lists Python in technical skills but lacks specific project tasks demonstrating application.", "evidence": [{"source_id": "cv", "quote": "- Python, PyTorch, TensorFlow, scikit-learn."}]}, {"skill": "pytorch", "weight": 3.0, "m": 0.25, "reason_code": "evidence_based", "reason": "CV lists PyTorch in technical skills without detailed implementation projects.", "evidence": [{"source_id": "cv", "quote": "- Python, PyTorch, TensorFlow, scikit-learn."}]}, {"skill": "tensorflow", "weight": 2.0, "m": 0.25, "reason_code": "evidence_based", "reason": "CV lists TensorFlow in technical skills without specific project tasks.", "evidence": [{"source_id": "cv", "quote": "- Python, PyTorch, TensorFlow, scikit-learn."}]}, {"skill": "fastapi", "weight": 2.0, "m": 0.25, "reason_code": "evidence_based", "reason": "CV lists FastAPI under backend skills without specific project tasks.", "evidence": [{"source_id": "cv", "quote": "- Backend: FastAPI, Flask, Docker."}]}, {"skill": "docker", "weight": 1.0, "m": 0.25, "reason_code": "evidence_based", "reason": "CV lists Docker under backend skills without specific project tasks.", "evidence": [{"source_id": "cv", "quote": "- Backend: FastAPI, Flask, Docker."}]}]	screening	2026-10-12 14:33:13.603724	\N
\.


--
-- Data for Name: user_generated_cvs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_generated_cvs (id, user_id, title, language, template_id, target_job_title, raw_input, llm_output, final_data, avatar_url, pdf_url, created_at, updated_at) FROM stdin;
3	5	CV - Lập trình viên	vi	modern	Lập trình viên	{"cand_cv_id": 5}	{}	{"personal_info": {"full_name": "ben mr", "email": "mrbenhandsome2000@gmail.com", "phone": "0901234567", "title": "L\\u1eadp tr\\u00ecnh vi\\u00ean", "address": "TP. H\\u1ed3 Ch\\u00ed Minh", "education": "\\u0110\\u1ea1i h\\u1ecdc B\\u00e1ch Khoa TP.HCM - C\\u00f4ng ngh\\u1ec7 Th\\u00f4ng tin (2026, GPA: 3.4/4.0)"}, "professional_summary": "Chuy\\u00ean vi\\u00ean L\\u1eadp tr\\u00ecnh vi\\u00ean \\u0111\\u1ea7y nhi\\u1ec7t huy\\u1ebft v\\u1edbi n\\u1ec1n t\\u1ea3ng v\\u1eefng ch\\u1eafc v\\u1ec1 JavaScript, React, Python, FastAPI. C\\u00f3 t\\u01b0 duy gi\\u1ea3i quy\\u1ebft v\\u1ea5n \\u0111\\u1ec1 m\\u1ea1ch l\\u1ea1c, kh\\u1ea3 n\\u0103ng l\\u00e0m vi\\u1ec7c \\u0111\\u1ed9c l\\u1eadp v\\u00e0 ph\\u1ed1i h\\u1ee3p nh\\u00f3m hi\\u1ec7u qu\\u1ea3, s\\u1eb5n s\\u00e0ng ti\\u1ebfp c\\u1eadn c\\u00f4ng ngh\\u1ec7 m\\u1edbi nh\\u1eb1m ki\\u1ebfn t\\u1ea1o c\\u00e1c s\\u1ea3n ph\\u1ea9m ch\\u1ea5t l\\u01b0\\u1ee3ng cao.", "skills": ["JavaScript", "React", "Python", "FastAPI", "PostgreSQL", "Git"], "polished_projects": [{"name": "Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher", "role": "Full-stack & AI API", "bullet_points": ["\\u0110\\u1ea3m nhi\\u1ec7m vai tr\\u00f2 Full-stack & AI API, ch\\u1ecbu tr\\u00e1ch nhi\\u1ec7m tri\\u1ec3n khai v\\u00e0 ho\\u00e0n thi\\u1ec7n c\\u00e1c module nghi\\u1ec7p v\\u1ee5 s\\u1eed d\\u1ee5ng React, FastAPI, PostgreSQL.", "X\\u00e2y d\\u1ef1ng v\\u00e0 t\\u1ed1i \\u01b0u c\\u00e1c ch\\u1ee9c n\\u0103ng n\\u00f2ng c\\u1ed1t: Thi\\u1ebft k\\u1ebf giao di\\u1ec7n ng\\u01b0\\u1eddi d\\u00f9ng v\\u00e0 vi\\u1ebft API \\u0111\\u1ed1i s\\u00e1nh CV \\u1ee9ng vi\\u00ean t\\u1ef1 \\u0111\\u1ed9ng.", "\\u0110\\u1ea1t k\\u1ebft qu\\u1ea3 th\\u1ef1c t\\u1ebf: H\\u1ec7 th\\u1ed1ng v\\u1eadn h\\u00e0nh tr\\u01a1n tru v\\u1edbi ph\\u1ea3n h\\u1ed3i d\\u01b0\\u1edbi 150ms."]}]}	\N	\N	2026-11-12 15:56:07.635072	2026-11-13 21:00:41.421458
4	5	CV tối ưu cho QA Automation Engineer (Selenium/Playwright/Python)	vi	modern	QA Automation Engineer (Selenium/Playwright/Python)	{"cand_cv_id": 5}	{}	{"personal_info": {"full_name": "H\\u00c0 HO\\u00c0NG V\\u1ef8", "email": "hahoangvy0707@gmail.com", "phone": "0362514115", "title": "QA Automation Engineer (Selenium/Playwright/Python)", "education": "Bachelor of Science in Information Technology Da Lat University"}, "professional_summary": "Sinh vi\\u00ean n\\u0103m cu\\u1ed1i ng\\u00e0nh C\\u00f4ng ngh\\u1ec7 Th\\u00f4ng tin t\\u1ea1i \\u0110\\u1ea1i h\\u1ecdc \\u0110\\u00e0 L\\u1ea1t v\\u1edbi n\\u1ec1n t\\u1ea3ng v\\u1eefng ch\\u1eafc v\\u1ec1 ph\\u00e1t tri\\u1ec3n ph\\u1ea7n m\\u1ec1m v\\u00e0 t\\u01b0 duy logic, \\u0111\\u1ecbnh h\\u01b0\\u1edbng ph\\u00e1t tri\\u1ec3n s\\u1ef1 nghi\\u1ec7p trong l\\u0129nh v\\u1ef1c ki\\u1ec3m th\\u1eed t\\u1ef1 \\u0111\\u1ed9ng. S\\u1edf h\\u1eefu ki\\u1ebfn th\\u1ee9c c\\u01a1 b\\u1ea3n v\\u1ec1 Python, Selenium, Playwright c\\u00f9ng k\\u1ef9 n\\u0103ng x\\u00e2y d\\u1ef1ng API v\\u00e0 ph\\u00e2n t\\u00edch y\\u00eau c\\u1ea7u h\\u1ec7 th\\u1ed1ng. \\u0110am m\\u00ea \\u00e1p d\\u1ee5ng c\\u00e1c c\\u00f4ng c\\u1ee5 automation testing v\\u00e0 quy tr\\u00ecnh CI/CD nh\\u1eb1m n\\u00e2ng cao ch\\u1ea5t l\\u01b0\\u1ee3ng ph\\u1ea7n m\\u1ec1m doanh nghi\\u1ec7p.", "skills": ["Python", "Selenium", "Playwright", "Automation Test", "Postman", "CI/CD", "RESTful APIs", "SQL Server", "Git/GitHub", "Docker"], "polished_projects": []}	\N	\N	2026-11-13 09:24:15.405154	2026-11-13 21:00:41.341602
8	5	CV tối ưu cho Backend Developer (Python/FastAPI)	vi	modern	Backend Developer (Python/FastAPI)	{}	{}	{"personal_info": {"full_name": "H\\u00c0 HO\\u00c0NG V\\u1ef8", "email": "hahoangvy0707@gmail.com", "phone": "0362514115", "title": "Backend Developer (Python/FastAPI)", "education": "Bachelor of Science in Information Technology Da Lat University"}, "professional_summary": "C\\u1eed nh\\u00e2n C\\u00f4ng ngh\\u1ec7 Th\\u00f4ng tin v\\u1edbi n\\u1ec1n t\\u1ea3ng v\\u1eefng ch\\u1eafc v\\u1ec1 ph\\u00e1t tri\\u1ec3n ph\\u1ea7n m\\u1ec1m v\\u00e0 t\\u01b0 duy h\\u1ec7 th\\u1ed1ng, \\u0111\\u1ecbnh h\\u01b0\\u1edbng ph\\u00e1t tri\\u1ec3n chuy\\u00ean s\\u00e2u trong l\\u0129nh v\\u1ef1c Backend Development v\\u1edbi Python v\\u00e0 FastAPI. S\\u1edf h\\u1eefu kinh nghi\\u1ec7m th\\u1ef1c t\\u1ebf trong vi\\u1ec7c thi\\u1ebft k\\u1ebf RESTful API, t\\u1ed1i \\u01b0u c\\u01a1 s\\u1edf d\\u1eef li\\u1ec7u PostgreSQL v\\u00e0 tri\\u1ec3n khai container h\\u00f3a b\\u1eb1ng Docker. \\u0110am m\\u00ea x\\u00e2y d\\u1ef1ng c\\u00e1c h\\u1ec7 th\\u1ed1ng backend hi\\u1ec7u n\\u0103ng cao, \\u1ee9ng d\\u1ee5ng m\\u00f4 h\\u00ecnh Agile/Scrum nh\\u1eb1m mang l\\u1ea1i gi\\u00e1 tr\\u1ecb t\\u1ed1i \\u01b0u cho s\\u1ea3n ph\\u1ea9m.", "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "RESTful APIs", "Git/GitHub", "CI/CD", "Automation Test", "Selenium", "Playwright"], "polished_projects": [{"name": "Website Tuy\\u1ec3n d\\u1ee5ng AI Matcher", "role": "Backend & Full-stack Developer", "technologies": ["Python", "FastAPI", "PostgreSQL", "React", "Docker"], "bullet_points": ["Ph\\u00e1t tri\\u1ec3n h\\u1ec7 th\\u1ed1ng RESTful API hi\\u1ec7u n\\u0103ng cao s\\u1eed d\\u1ee5ng Python v\\u00e0 FastAPI \\u0111\\u1ec3 x\\u1eed l\\u00fd logic \\u0111\\u1ed1i s\\u00e1nh CV \\u1ee9ng vi\\u00ean t\\u1ef1 \\u0111\\u1ed9ng.", "Thi\\u1ebft k\\u1ebf v\\u00e0 t\\u1ed1i \\u01b0u c\\u1ea5u tr\\u00fac c\\u01a1 s\\u1edf d\\u1eef li\\u1ec7u PostgreSQL nh\\u1eb1m gi\\u1ea3m thi\\u1ec3u th\\u1eddi gian truy v\\u1ea5n v\\u00e0 l\\u01b0u tr\\u1eef d\\u1eef li\\u1ec7u hi\\u1ec7u qu\\u1ea3.", "\\u00c1p d\\u1ee5ng quy tr\\u00ecnh container h\\u00f3a v\\u1edbi Docker \\u0111\\u1ec3 \\u0111\\u1ed3ng b\\u1ed9 m\\u00f4i tr\\u01b0\\u1eddng ph\\u00e1t tri\\u1ec3n v\\u00e0 tri\\u1ec3n khai \\u1ee9ng d\\u1ee5ng.", "\\u0110\\u1ea1t k\\u1ebft qu\\u1ea3 th\\u1ef1c t\\u1ebf: H\\u1ec7 th\\u1ed1ng v\\u1eadn h\\u00e0nh \\u1ed5n \\u0111\\u1ecbnh, ph\\u1ea3n h\\u1ed3i API nhanh ch\\u00f3ng d\\u01b0\\u1edbi 150ms \\u0111\\u00e1p \\u1ee9ng t\\u1ed1t y\\u00eau c\\u1ea7u c\\u1ee7a ng\\u01b0\\u1eddi d\\u00f9ng."], "source_tag": "original"}]}	\N	\N	2026-11-23 11:20:16.290417	2026-11-23 11:20:16.290424
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password_hash, role, phone, is_active, created_at, avatar_url, firebase_uid) FROM stdin;
2	Admin Nhà Tuyển Dụng	admin@aimatcher.vn	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	nha_tuyen_dung	0123456789	t	2026-10-09 08:20:10.541741	\N	\N
1	Vy Hoang	hahoangvy0707@gmail.com	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	nha_tuyen_dung	0124567889	t	2026-09-26 08:45:00.542172	/uploads/avatars/avatar_1791857187_817cbade.jpg	Re8QhvGZkITKuSGPahBSoh3c8lO2
4	messi cr7	messi772004@gmail.com	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	ung_tuyen	\N	t	2026-10-12 16:06:53.071567	https://lh3.googleusercontent.com/a/ACg8ocJpbPS0chawuhpWxxz8XrdsbEbsmULHI_psCI2U_zSxdyjKMA=s96-c	0RKgIPIkmGZAffbT8k3yyQdIBsG3
5	ben mr	mrbenhandsome2000@gmail.com	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9	ung_tuyen	\N	t	2026-11-11 14:28:27.214564	https://lh3.googleusercontent.com/a/ACg8ocKAppHmG9D6p1dd4BpKyqFhxVOyXSenXXqtl3ZZcF1eKNSKEg=s96-c	hqq96Ca4rNSNsN6KR6YukokdEmd2
\.


--
-- Name: candidates_cv_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.candidates_cv_id_seq', 13, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 6, true);


--
-- Name: job_descriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_descriptions_id_seq', 8, true);


--
-- Name: job_inquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_inquiries_id_seq', 1, true);


--
-- Name: match_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.match_results_id_seq', 340, true);


--
-- Name: user_generated_cvs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_generated_cvs_id_seq', 8, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: candidates_cv candidates_cv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates_cv
    ADD CONSTRAINT candidates_cv_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: job_descriptions job_descriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_descriptions
    ADD CONSTRAINT job_descriptions_pkey PRIMARY KEY (id);


--
-- Name: job_inquiries job_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_inquiries
    ADD CONSTRAINT job_inquiries_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_pkey PRIMARY KEY (id);


--
-- Name: user_generated_cvs user_generated_cvs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_generated_cvs
    ADD CONSTRAINT user_generated_cvs_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_candidates_cv_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_candidates_cv_id ON public.candidates_cv USING btree (id);


--
-- Name: ix_companies_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_companies_id ON public.companies USING btree (id);


--
-- Name: ix_companies_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_companies_name ON public.companies USING btree (name);


--
-- Name: ix_job_descriptions_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_job_descriptions_id ON public.job_descriptions USING btree (id);


--
-- Name: ix_job_inquiries_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_job_inquiries_id ON public.job_inquiries USING btree (id);


--
-- Name: ix_job_inquiries_jd_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_job_inquiries_jd_id ON public.job_inquiries USING btree (jd_id);


--
-- Name: ix_job_inquiries_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_job_inquiries_user_id ON public.job_inquiries USING btree (user_id);


--
-- Name: ix_match_results_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_match_results_id ON public.match_results USING btree (id);


--
-- Name: ix_user_generated_cvs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_generated_cvs_id ON public.user_generated_cvs USING btree (id);


--
-- Name: ix_user_generated_cvs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_generated_cvs_user_id ON public.user_generated_cvs USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: candidates_cv candidates_cv_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates_cv
    ADD CONSTRAINT candidates_cv_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: job_inquiries job_inquiries_jd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_inquiries
    ADD CONSTRAINT job_inquiries_jd_id_fkey FOREIGN KEY (jd_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: job_inquiries job_inquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_inquiries
    ADD CONSTRAINT job_inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: match_results match_results_cv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_cv_id_fkey FOREIGN KEY (cv_id) REFERENCES public.candidates_cv(id) ON DELETE CASCADE;


--
-- Name: match_results match_results_jd_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_jd_id_fkey FOREIGN KEY (jd_id) REFERENCES public.job_descriptions(id) ON DELETE CASCADE;


--
-- Name: user_generated_cvs user_generated_cvs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_generated_cvs
    ADD CONSTRAINT user_generated_cvs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Y6pEBMc55ivFOITEnZIeyJ8jrxyfYP9ofPmOMzgklGW8ZtDvRuhueduJR18Isxr

