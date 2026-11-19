# Duyệt mẫu qd_081

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_081 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 166951)
- Tiêu đề (metadata HF): Quyết định số 26/2023/QĐ-UBND Quy định định mức đất sản xuất làm cơ sở xác định hộ gia đình thiếu đất sản xuất trên địa bàn tỉnh Thái Nguyên
- Đợt chọn: batch_2026-11-19; đề xuất split: train

## Lý do chọn

Định mức đất sản xuất: khoản 1, 2 chứa điểm với số đo (1.500 m2/hộ, hệ số 3,33); kiểm tra dấu thập phân kiểu Việt Nam và tham chiếu chéo 'điểm a khoản 2 Điều 1'.

## Đặc điểm cấu trúc

- khoản + điểm lồng nhau
- số liệu m2 và hệ số quy đổi
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
- Không phát hiện vấn đề rõ ràng; kiểm tra dấu thập phân (3,33) và tham chiếu 'điểm a khoản 2 Điều 1'.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0951_gpt-6.1-sol_qd_081/normalized.json. CHƯA DUYỆT.
