# Duyệt mẫu qd_042

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_042 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 183050)
- Tiêu đề (metadata HF): Quyết định số 96/2025/QĐ-UBND Phân cấp thẩm quyền quyết định xác lập, phê duyệt phương án xử lý tài sản được xác lập quyền sở hữu toàn dân trên địa bàn tỉnh Tuyên Quang
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Văn bản phân cấp mới (2025), 6 điều có tiêu đề, khoản 1/2 chứa điểm a) b) c) d); có nơi nhận. Đại diện văn bản hiện hành có cấu trúc lồng nhau.

## Đặc điểm cấu trúc

- khoản + điểm lồng nhau
- có nơi nhận
- 6 điều
- 2025

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
- Không phát hiện vấn đề rõ ràng; kiểm tra kỹ cấp lồng nhau khoản → điểm (20 khoản/điểm) và 22 nơi nhận.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0947_gpt-6.1-sol_qd_042/normalized.json. CHƯA DUYỆT.
