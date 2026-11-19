# Duyệt mẫu qd_096

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_096 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 152369)
- Tiêu đề (metadata HF): Quyết định số 20/2021/QĐ-UBND Quy định khung giá dịch vụ sử dụng cảng cá trên địa bàn tỉnh Kiên Giang
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Khung giá cảng cá: mỗi khoản có nhiều điểm a) b) c) với khoảng giá; kiểm tra giữ nguyên số tiền và thứ tự điểm. Số hiệu có khoảng trắng lạ '20 /2021/QĐ-UBND'.

## Đặc điểm cấu trúc

- nhiều điểm dưới khoản (16)
- mức thu 'từ ... đến ...'
- không nơi nhận

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
- Không phát hiện vấn đề rõ ràng; kiểm tra 28 khoản/điểm, đặc biệt số tiền 'từ ... đến ...' và số hiệu có khoảng trắng '20 /2021/QĐ-UBND'.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0949_gpt-6.1-sol_qd_096/normalized.json. CHƯA DUYỆT.
