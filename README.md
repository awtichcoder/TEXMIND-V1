# TexMind AI R1

Khung thử nghiệm cho luồng chuyển nội dung thô thành tài liệu theo template.

## Trạng thái hiện tại

- Đã thu thập 100 văn bản Quyết định và lọc 10 mẫu ứng viên.
- Đã chọn `qd_066` làm mẫu đầu tiên.
- Đã xác minh cặp `input_01.txt` → `output_01.docx` theo template `TM-QD-001`.
- Đã tạo ba mẫu chuẩn `structured_01.json` đến `structured_03.json` theo JSON Schema phiên bản 1.0.
- Schema hỗ trợ khoản lồng nhau, tham chiếu phụ lục, điều không đánh số khoản, chữ ký không có dòng ủy quyền và văn bản chưa chọn template.
- Dữ liệu có cơ chế giữ nguyên và cảnh báo lỗi/mâu thuẫn từ nguồn thay vì âm thầm sửa.
- Đã chạy thử trích xuất AI đầu tiên trên `qd_067` bằng `oc/deepseek-v4.1-flash-free`.
- Điểm nghiêm ngặt trước chuẩn hóa là 82,14%; nội dung điều, căn cứ, khoản/điểm và nơi nhận đạt 100%.
- Sau hai quy tắc chuẩn hóa xác định trước (`sample_id` từ ngữ cảnh và nhãn `Phụ lục N`), điểm đạt 100%.
- Phản hồi thô không được dùng trực tiếp: lần thử cần sửa cú pháp JSON một lần và loại một trường trùng lặp trước khi qua schema.
- Đã tích hợp hai quy tắc trên vào pipeline, lưu riêng bản thô và nhật ký hậu xử lý.
- Lần chạy hồi quy mới trên `qd_067` đạt 100% ngay từ bản thô, hợp lệ theo schema và không cần hậu xử lý thay đổi dữ liệu.

## Bước tiếp theo

1. Chạy benchmark trên nhiều mẫu chưa thấy trước, lưu cả điểm thô và điểm sau chuẩn hóa.
2. Tạo mẫu JSON chuẩn thứ tư có cấu trúc khác ba mẫu hiện tại.
3. Xây bước render JSON đã kiểm tra thành DOCX theo template.
4. Chỉ cân nhắc fine-tuning sau khi có đủ kết quả benchmark.

## Thử trích xuất bằng DeepSeek

```powershell
Copy-Item .env.example .env
# Điền DEEPSEEK_API_KEY trong .env, không commit file này.
npm run extract:ai
npm run evaluate:ai
```

Pipeline lấy `sample_id` từ tên output (hoặc đối số `--sample-id`) và chuẩn hóa tham chiếu phụ lục đánh số thành `Phụ lục N`. Kết quả dự đoán, bản AI thô và nhật ký hậu xử lý được lưu riêng trong `work/ai_extraction/`. Script không ghi hoặc in khóa API.

## Thu thập mẫu từ Hugging Face

Lấy 100 văn bản loại Quyết định mà không tải toàn bộ dataset:

```powershell
node .\src\collect_hf_samples.mjs --count 100 --type "Quyết định"
```

Kết quả được lưu trong `dataset/hf_quyet_dinh/`. Các mẫu tải về mặc định có trạng thái `unreviewed` và chưa được coi là dữ liệu gold.

## Cấu trúc

```text
dataset/    Dữ liệu đầu vào và metadata
schemas/    JSON Schema cho dữ liệu trung gian
templates/  Đặc tả template
src/        Mã nguồn
tests/      Kiểm thử
outputs/    File được tạo ra để kiểm tra
```
