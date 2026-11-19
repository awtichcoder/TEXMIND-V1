# Duyệt mẫu qd_072

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_072 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 139832)
- Tiêu đề (metadata HF): Quyết định số 33/2019/QĐ-UBND Quy định nội dung và mức chi đối với hội thi tay nghề trên địa bàn tỉnh Đồng Tháp
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Mức chi hội thi tay nghề: khoản 1 trỏ tới 'Phụ lục đính kèm' (không có trong text), có nơi nhận. Kiểm tra attachments chỉ tham chiếu, không bịa nội dung.

## Đặc điểm cấu trúc

- có nơi nhận
- tham chiếu 'Phụ lục đính kèm'
- 5 điều
- 2019

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
- PHỤ LỤC: 'Phụ lục đính kèm' với source_reference 'Điều 2 khoản 1' – đúng là phụ lục của chính quyết định này (không có nội dung trong text) → kiểm tra included_in_source = false.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0958_gpt-6.1-sol_qd_072/normalized.json. CHƯA DUYỆT.
