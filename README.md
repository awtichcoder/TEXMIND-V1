# TexMind AI R1

Khung thử nghiệm cho luồng chuyển nội dung thô thành tài liệu theo template.

## Trạng thái hiện tại

- Đã thu thập 100 văn bản Quyết định và lọc 10 mẫu ứng viên.
- Đã chọn `qd_066` làm mẫu đầu tiên.
- Đã xác minh cặp `input_01.txt` → `output_01.docx` theo template `TM-QD-001`.
- Đã tạo sáu mẫu chuẩn `structured_01.json` đến `structured_06.json` theo JSON Schema phiên bản 1.0.
- Schema hỗ trợ khoản lồng nhau, tham chiếu phụ lục, điều không đánh số khoản, chữ ký không có dòng ủy quyền và văn bản chưa chọn template.
- Mẫu `qd_014` bổ sung trường hợp văn bản không có khối nơi nhận; `recipients` được giữ là mảng rỗng thay vì bịa dữ liệu.
- Dữ liệu có cơ chế giữ nguyên và cảnh báo lỗi/mâu thuẫn từ nguồn thay vì âm thầm sửa.
- Đã chạy thử trích xuất AI đầu tiên trên `qd_067` bằng `oc/deepseek-v4.1-flash-free`.
- Điểm nghiêm ngặt trước chuẩn hóa là 82,14%; nội dung điều, căn cứ, khoản/điểm và nơi nhận đạt 100%.
- Sau hai quy tắc chuẩn hóa xác định trước (`sample_id` từ ngữ cảnh và nhãn `Phụ lục N`), điểm đạt 100%.
- Phản hồi thô không được dùng trực tiếp: lần thử cần sửa cú pháp JSON một lần và loại một trường trùng lặp trước khi qua schema.
- Đã tích hợp hai quy tắc trên vào pipeline, lưu riêng bản thô và nhật ký hậu xử lý.
- Lần chạy hồi quy mới trên `qd_067` đạt 100% ngay từ bản thô, hợp lệ theo schema và không cần hậu xử lý thay đổi dữ liệu.
- Đã chạy `qd_014` trên Colab bằng `Qwen/Qwen2.5-3B-Instruct` 4-bit và lưu riêng bản thô, bản chuẩn hóa cùng báo cáo.
- Bộ chấm điểm 2.0 giữ riêng điểm nghiêm ngặt và điểm dung sai, căn khoản theo vị trí cấu trúc và cảnh báo sai số khoản/căn cứ bị rút ngắn.
- Với kết quả chạy lại `qd_014`, điểm nghiêm ngặt là 61,33%, điểm dung sai là 75,79%; 28/29 khoản khớp tuyệt đối và 29/29 khoản khớp theo dung sai.
- Prompt đã được siết để giữ nguyên tiêu đề điều, trích toàn bộ từng căn cứ pháp lý và không tự đánh số đoạn không có ký hiệu trong nguồn.
- Lần chạy `qd_014` mới bằng `oc/deepseek-v4.1-flash-free` trích đúng 6/6 tiêu đề, 4/4 căn cứ và 29/29 khoản. Bản thô có 2 lỗi schema do đặt `quality` sai vị trí; sau ba thay đổi hậu xử lý xác định được, kết quả hợp lệ và đạt 100% ở cả điểm nghiêm ngặt lẫn điểm dung sai.
- Có lệnh `normalize:saved` để áp dụng lại normalizer cho JSON thô đã lưu mà không tiêu tốn thêm hạn mức API.
- Benchmark chưa thấy trước `qd_021` bằng DeepSeek hợp lệ schema ngay từ bản thô và không cần hậu xử lý. Trường đơn, 3/3 tiêu đề, 10/10 căn cứ, 3/3 khoản và tệp đính kèm đều khớp tuyệt đối; 12/12 nơi nhận khớp theo dung sai, trong đó 10 mục chỉ khác dấu câu. Điểm nghiêm ngặt đạt 86,11% và điểm dung sai đạt 100%.
- Khi đối chiếu trực tiếp Điều 1, đã sửa gold `structured_02.json` để bổ sung “Quy định ban hành kèm theo Quyết định” là tệp đính kèm không có nội dung trong nguồn.
- Đã chọn `qd_030` làm mẫu thứ năm vì có cấu trúc công bố kết quả rà soát, khoản lồng nhau và bốn danh mục được tham chiếu nhưng không kèm nội dung đầy đủ.
- Bản nháp DeepSeek của `qd_030` trích đúng 4/4 tiêu đề điều, 5/5 căn cứ pháp lý và 14/14 khoản; điểm nghiêm ngặt và dung sai đều đạt 83,33%. Sai sót nội dung duy nhất là bỏ sót 4/4 danh mục đính kèm được nguồn nhắc tới.
- Sau khi đối chiếu thủ công với nguồn, `structured_05.json` đã được sửa metadata nguồn và bổ sung bốn attachment với `included_in_source=false`. Prompt cũng đã thêm quy tắc xử lý câu “được lập thành N danh mục”.
- Benchmark `qd_010` bằng DeepSeek hợp lệ schema ngay từ bản thô và không cần hậu xử lý. Model trích đúng trường đơn, 3/3 tiêu đề điều, 8/8 căn cứ và 19/19 nơi nhận; điểm nghiêm ngặt và dung sai đều đạt 83,33%.
- Sai khác `qd_010` nằm ở cấu trúc: model lặp ba tiêu đề điều thành ba clause dư và làm lệch vị trí đoạn trách nhiệm thi hành không đánh số. Gold `structured_06.json` giữ đoạn này thành clause `number=null` của Điều 3, không tự tạo Điều 4; prompt đã được bổ sung quy tắc tương ứng.
- Evaluator hiện cảnh báo có cấu trúc khi tổng số clause lệch và khi heading bị lặp nguyên văn thành clause; báo cáo `qd_010` chỉ rõ 1 clause chuẩn so với 4 clause dự đoán và 3 heading bị lặp.
- Đã xây pipeline `render:docx`: Node kiểm tra JSON Schema và độ tương thích template trước khi gọi renderer Python; renderer dùng DOCX tham chiếu làm nền để giữ styles/theme/numbering rồi dựng header, tiêu đề, căn cứ, điều khoản, bảng dữ liệu, nơi nhận và chữ ký.
- Đã sinh lại `qd_066` từ `structured_01.json` thành `outputs/qd_066.rendered.docx`. Bản cuối có đúng 3 trang như reference, 60/60 nội dung kiểm tra xuất hiện, các package part preserve-only giữ nguyên hash và toàn bộ trang đã qua render QA không cắt chữ/chồng lấn.
- Toàn bộ 30 kiểm thử hiện vượt qua và `git diff --check` không phát hiện lỗi khoảng trắng.

## Bước tiếp theo

1. Chọn mẫu thứ bảy có cấu trúc khác và tiếp tục quy trình DeepSeek nháp → đối chiếu nguồn → duyệt gold.
2. So sánh DeepSeek và Colab trên cùng bộ chấm điểm 2.0 khi cần quyết định mô hình chạy hàng loạt.
3. Tạo template `TM-QD-002` cho Quyết định không có bảng và thử render một gold khác `qd_066`.
4. Mở rộng lên 20–50 mẫu gold trước khi cân nhắc LoRA/fine-tuning.

Do API miễn phí có thể hết hạn mức, notebook dự phòng cho benchmark `qd_021` có thể được tạo lại bằng:

```powershell
npm run build:colab:qd021
```

Mở `notebooks/TexMind_qd_021_Colab.ipynb` bằng Google Colab, bật GPU T4 và tải lên `input_02.txt`, `structured_02.json`, `texmind-document.schema.json` khi notebook yêu cầu. Gold chỉ được dùng để chấm sau khi model sinh prediction.

## Thử trích xuất bằng DeepSeek

```powershell
Copy-Item .env.example .env
# Điền DEEPSEEK_API_KEY trong .env, không commit file này.
npm run extract:ai
npm run evaluate:ai
```

Pipeline lấy `sample_id` từ tên output (hoặc đối số `--sample-id`) và chuẩn hóa tham chiếu phụ lục đánh số thành `Phụ lục N`. Kết quả dự đoán, bản AI thô và nhật ký hậu xử lý được lưu riêng trong `work/ai_extraction/`. Script không ghi hoặc in khóa API.

Chấm `qd_014` bằng bộ chấm điểm 2.0 và tạo báo cáo sai khác chi tiết:

```powershell
npm run evaluate:ai -- --expected dataset/van_ban_hanh_chinh/structured_04.json --actual outputs/qd_014.rerun.normalized.json --report outputs/qd_014.rerun.scoring-v2.json
npm run analyze:diff
```

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
