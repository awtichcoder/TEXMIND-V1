# Duyệt mẫu qd_068

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_068 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 180888)
- Tiêu đề (metadata HF): Quyết định số 26/2025/QĐ-UBND Ban hành định mức kinh tế - kỹ thuật để lập dự toán xây dựng, điều chỉnh bảng giá đất, định giá đất cụ thể trên địa bàn tỉnh Trà Vinh
- Đợt chọn: batch_2026-11-19; đề xuất split: train

## Lý do chọn

Mẫu cơ sở đơn giản nhất: chỉ 4 điều một đoạn; định mức 'ban hành kèm theo' không có trong text nên không được bịa phụ lục. Căn cứ có dấu câu không đồng nhất (',', ':', ';').

## Đặc điểm cấu trúc

- đơn giản: 4 điều không khoản
- không nơi nhận
- ban hành kèm định mức không có trong text
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
- PHỤ LỤC: attachments có định mức ban hành kèm theo (source_reference 'Điều 1') – cùng câu hỏi quy ước như qd_100.
- AI ghi 3 bất thường nguồn (dấu câu cuối căn cứ không đồng nhất; text không có nội dung định mức) – hợp lý.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0957_gpt-6.1-sol_qd_068/normalized.json. CHƯA DUYỆT.
