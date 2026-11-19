# Duyệt mẫu qd_040

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_040 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 144380)
- Tiêu đề (metadata HF): Quyết định số 21/2020/QĐ-UBND Về việc quy định phân cấp, quản lý và sử dụng Quỹ phòng, chống thiên tai tỉnh Đắk Nông
- Đợt chọn: batch_2026-11-19; đề xuất split: train

## Lý do chọn

Văn bản ngắn có nơi nhận dài; khoản dạng '1. Phạm vi điều chỉnh: ...' (tiêu đề và nội dung chung dòng). Có lỗi gõ trong nguồn 'p hân cấp' để kiểm tra việc giữ nguyên nguồn.

## Đặc điểm cấu trúc

- có nơi nhận
- khoản có tiêu đề kèm nội dung cùng dòng
- 3 điều
- 2020

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
- Không phát hiện vấn đề rõ ràng; nguồn có lỗi gõ 'p hân cấp' – kiểm tra AI giữ nguyên.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0956_gpt-6.1-sol_qd_040/normalized.json. CHƯA DUYỆT.
