# TexMind AI R1

Khung thử nghiệm cho luồng chuyển nội dung thô thành tài liệu theo template.

## Trạng thái hiện tại

- Đã thu thập 100 văn bản Quyết định và lọc 10 mẫu ứng viên.
- Đã chọn `qd_066` làm mẫu đầu tiên.
- Đã xác minh cặp `input_01.txt` → `output_01.docx` theo template `TM-QD-001`.
- Đã tạo ba mẫu chuẩn `structured_01.json` đến `structured_03.json` theo JSON Schema phiên bản 1.0.
- Schema hỗ trợ khoản lồng nhau, tham chiếu phụ lục, điều không đánh số khoản, chữ ký không có dòng ủy quyền và văn bản chưa chọn template.
- Dữ liệu có cơ chế giữ nguyên và cảnh báo lỗi/mâu thuẫn từ nguồn thay vì âm thầm sửa.
- Đã chuẩn bị bộ gọi DeepSeek JSON Output và bộ chấm điểm; chưa chạy API vì chưa có khóa/cấu hình model trên máy.

## Bước tiếp theo

1. Sao chép `.env.example` thành `.env` và điền `DEEPSEEK_API_KEY` cục bộ.
2. Chạy `npm run extract:ai` để trích xuất `input_03.txt` mà không đưa mẫu chuẩn vào prompt.
3. Chạy `npm run evaluate:ai` để so sánh kết quả AI với `structured_03.json`.
4. Chỉ cân nhắc fine-tuning sau khi đo trên nhiều mẫu chưa thấy trước.

## Thử trích xuất bằng DeepSeek

```powershell
Copy-Item .env.example .env
# Điền DEEPSEEK_API_KEY trong .env, không commit file này.
npm run extract:ai
npm run evaluate:ai
```

Kết quả dự đoán và báo cáo được lưu trong `work/ai_extraction/`. Script không ghi hoặc in khóa API.

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
