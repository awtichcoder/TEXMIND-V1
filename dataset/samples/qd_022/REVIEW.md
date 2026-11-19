# Duyệt mẫu qd_022

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_022 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 6357)
- Tiêu đề (metadata HF): Quyết định số 85/2000/QĐ-TTg Về việc chuyển Công ty Giấy Viễn Đông thành Công ty cổ phần
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Quyết định của Thủ tướng về cổ phần hóa: nhiều dòng '-' không có số thứ tự (không được tự đánh số), số tiền dạng 11.600.000.000 đồng, tên tiếng Anh viết thường.

## Đặc điểm cấu trúc

- Thủ tướng Chính phủ (TTg)
- gạch đầu dòng không đánh số
- số tiền lớn
- 2000

## Checklist khi duyệt

- [ ] Trường đơn (cơ quan, số hiệu, nơi + ngày ban hành, trích yếu) khớp nguồn
- [ ] `issue_date_text` giữ nguyên cả địa danh (vd. "Hà Nội, ngày ...")
- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ (kể cả lỗi chính tả của nguồn)
- [ ] Đủ điều, khoản, điểm; đúng cấp lồng nhau; không tự đánh số đoạn không có ký hiệu
- [ ] Nơi nhận và chữ ký khớp nguồn (không có nơi nhận thì `recipients` = [])
- [ ] Phụ lục/văn bản kèm theo chỉ tham chiếu, không bịa nội dung
- [ ] Bất thường của nguồn ghi vào `provenance.source_anomalies`

## Máy kiểm tra sơ bộ (19/11/2026, không thay cho người duyệt)

- Đã tự so: mọi câu chữ (căn cứ, tiêu đề điều, khoản/điểm, nơi nhận, số hiệu, dòng ngày) đều có nguyên văn trong source.txt; số điều khớp nguồn.
- ĐOẠN KHÔNG SỐ: các dòng gạch đầu dòng có number = '-'. Gold cũ dùng number = null cho đoạn không có ký hiệu → chốt quy ước ('-' hay null) rồi sửa cho thống nhất.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0954_gpt-6.1-sol_qd_022/normalized.json. CHƯA DUYỆT.
