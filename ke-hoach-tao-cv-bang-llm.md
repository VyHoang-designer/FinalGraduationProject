# Kế hoạch phát triển chức năng tạo CV bằng LLM

## 1. Mục tiêu và phạm vi

Ứng viên nhập thông tin cá nhân, học vấn, kỹ năng, dự án và kinh nghiệm. Gemini hỗ trợ diễn đạt, sắp xếp nội dung thành CV rõ ràng; ứng viên kiểm tra, chỉnh sửa, lưu và xuất PDF hoặc dùng CV để ứng tuyển trên AI Talent Match.

Trong MVP, chức năng gồm:

- Tạo CV từ biểu mẫu thông tin.
- Viết lại mô tả dự án, kinh nghiệm và tạo phần giới thiệu bản thân từ dữ liệu đã nhập.
- Chọn ngôn ngữ tiếng Việt hoặc tiếng Anh; có thể khởi đầu với một ngôn ngữ để hoàn thiện luồng.
- Xem trước, chỉnh sửa, lưu bản nháp và xuất PDF.
- Chọn một phiên bản CV đã tạo khi nộp hồ sơ.

Sau MVP, bổ sung điều chỉnh CV theo JD: ưu tiên kinh nghiệm liên quan, sắp xếp kỹ năng và diễn đạt phù hợp với vị trí.

**Nguyên tắc:** LLM chỉ diễn đạt và sắp xếp dữ kiện do ứng viên cung cấp. Không tự thêm kỹ năng, chứng chỉ, công ty, nhiệm vụ cá nhân hoặc số liệu thành tích.

## 2. Luồng sử dụng

1. Ứng viên mở mục **Tạo CV bằng AI**.
2. Chọn ngôn ngữ, mẫu CV, vị trí mong muốn; có thể chọn JD đang tuyển khi hỗ trợ tính năng này.
3. Nhập thông tin vào biểu mẫu.
4. Backend kiểm tra dữ liệu và hiển thị thông tin cần bổ sung.
5. Ứng viên nhấn **Tạo nội dung CV**.
6. Gemini trả JSON có cấu trúc; backend kiểm tra trước khi hiển thị.
7. Ứng viên xem trước, rà soát các mục cần xác nhận và chỉnh sửa.
8. Ứng viên lưu CV và xuất PDF nếu cần.
9. Khi ứng tuyển, ứng viên chọn phiên bản CV rồi xác nhận nộp.

Tạo CV và nộp hồ sơ là hai thao tác riêng; tạo xong không tự động ứng tuyển.

## 3. Dữ liệu đầu vào

| Nhóm | Thông tin cần thu thập |
| --- | --- |
| Cá nhân | Họ tên, email, điện thoại, địa điểm, portfolio/GitHub |
| Mục tiêu | Vị trí mong muốn, định hướng nghề nghiệp |
| Học vấn | Trường, ngành, thời gian, GPA nếu muốn công bố |
| Kỹ năng | Tên kỹ năng và cách đã sử dụng |
| Kinh nghiệm | Công ty, vị trí, thời gian, nhiệm vụ cá nhân, kết quả |
| Dự án | Tên, mục tiêu, công nghệ, vai trò, nhiệm vụ, kết quả, liên kết |
| Bổ sung | Chứng chỉ, ngoại ngữ, giải thưởng, hoạt động |

Với sinh viên ít kinh nghiệm, ưu tiên dự án và thực tập. Biểu mẫu nên hỏi rõ **bạn trực tiếp làm phần nào** và **kết quả đã hoàn thành là gì** để có bằng chứng truy vết cho hệ thống matching.

## 4. Phân công xử lý

| Thành phần | Trách nhiệm |
| --- | --- |
| Frontend | Thu thập dữ liệu, hiển thị tiến trình, chỉnh sửa và xem trước |
| Backend | Kiểm tra dữ liệu, quản lý bản nháp và phiên bản CV |
| Gemini | Viết giới thiệu, diễn đạt mô tả, đề xuất thứ tự nội dung |
| Validator | Kiểm tra schema, nguồn dữ kiện và các trường không được thay đổi |
| Template renderer | Dàn trang từ dữ liệu đã kiểm tra |
| PDF exporter | Xuất PDF từ template |
| Hệ thống ứng tuyển | Gắn phiên bản CV được chọn vào hồ sơ ứng tuyển |

Có thể dùng chung cấu hình kết nối Gemini với chức năng chấm kỹ năng, nhưng prompt, schema và dịch vụ nghiệp vụ phải tách riêng. Gemini trả JSON có cấu trúc để nội dung dễ sửa và bố cục ổn định.

## 5. Kiểm soát nội dung do LLM tạo

Mỗi kinh nghiệm, dự án và kỹ năng đầu vào có ID. Nội dung Gemini tạo tham chiếu ID nguồn để backend và ứng viên truy lại dữ kiện.

Ví dụ, từ dữ kiện “Em làm API upload CV bằng FastAPI, có kiểm tra định dạng file”, có thể viết: “Xây dựng API tải lên CV bằng FastAPI, tích hợp kiểm tra định dạng tệp đầu vào.” Không được tự thêm “giảm 40% thời gian xử lý” khi ứng viên chưa cung cấp số liệu.

Backend đối chiếu tên, ngày tháng, kỹ năng và số liệu với đầu vào; kiểm tra schema và ID nguồn; từ chối hoặc yêu cầu tạo lại khi đầu ra sai. Kiểm tra tự động không bảo đảm đúng toàn bộ ý nghĩa, nên ứng viên phải rà soát và xác nhận. Khi thiếu thông tin, hỏi bổ sung hoặc bỏ mục đó.

## 6. Tích hợp với matching và nộp hồ sơ

Lưu CV dưới dạng dữ liệu có cấu trúc, đồng thời xuất PDF khi cần. Hệ thống matching có thể chuyển dữ liệu đã xác nhận thành các `sources` có ID mà không phải parse lại PDF.

Lưu riêng ba lớp dữ liệu:

1. Thông tin gốc do ứng viên nhập.
2. Nội dung LLM đề xuất.
3. Nội dung cuối được ứng viên chỉnh sửa và xác nhận.

Bản tóm tắt AI không tạo bằng chứng mới về năng lực. Câu mô tả dùng để chấm kỹ năng phải truy được về thông tin ứng viên cung cấp và xác nhận. JD chỉ định hướng cách trình bày, không bổ sung kinh nghiệm cho ứng viên.

Khi ứng tuyển, lưu một phiên bản CV cố định gắn với lần nộp đó. Chỉnh sửa về sau tạo phiên bản mới để kết quả matching cũ vẫn truy vết được.

## 7. Thứ tự triển khai

| Giai đoạn | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| 1. Dữ liệu và biểu mẫu | Chốt schema, xây form, lưu bản nháp | Nhập và sửa hồ sơ đầy đủ |
| 2. Sinh nội dung | Tạo prompt, schema đầu ra và dịch vụ Gemini | Tạo được CV từ dữ liệu thật |
| 3. Kiểm tra và chỉnh sửa | Validator, truy nguồn, editor, xử lý lỗi | Ứng viên sửa và xác nhận nội dung |
| 4. Trình bày | Một template đơn giản, xem trước, xuất PDF | PDF rõ ràng, không tràn hoặc mất chữ |
| 5. Ứng tuyển | Chọn CV, lưu phiên bản, chuyển thành nguồn matching | Nộp và đối chiếu CV–JD được |
| 6. Mở rộng | Điều chỉnh theo JD, thêm template/ngôn ngữ | Nội dung phù hợp JD và giữ đúng dữ kiện |

## 8. Kiểm thử và nghiệm thu

Kiểm tra hồ sơ chỉ có học vấn và dự án; thiếu kết quả cụ thể; nhiệm vụ của nhóm khác nhiệm vụ cá nhân; tiếng Việt có dấu; nội dung dài; Gemini lỗi hoặc trả JSON sai; và JD yêu cầu kỹ năng ứng viên chưa khai báo.

**Mốc nghiệm thu MVP:** ứng viên nhập dữ liệu → tạo nội dung có nguồn → chỉnh sửa → xuất PDF → chọn CV để nộp → matching sử dụng đúng phiên bản đã nộp.

Nên khởi đầu với một template đơn giản, một ngôn ngữ và luồng tạo từ biểu mẫu. Hoàn thiện luồng này trước khi thêm điều chỉnh theo JD để dễ kiểm chứng chất lượng và trình bày đóng góp của LLM trong báo cáo.
