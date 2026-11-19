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

## Máy kiểm tra sơ bộ (19/11/2026, theo quy ước mới; không thay cho người duyệt)

- Máy đã so: mọi câu chữ (căn cứ, tiêu đề điều, khoản/điểm, nơi nhận, số hiệu, dòng ngày, ô bảng) có nguyên văn trong source.txt; số điều khớp nguồn; ký hiệu khoản/điểm ('-'/null) khớp dòng nguồn; vị trí phụ lục đúng dạng và tồn tại.
- Khối `source` đã điền từ metadata.json (không do AI). Dòng ngày đã có địa danh.
- 4 điều không có tiêu đề riêng → heading là cả câu, không có khoản (máy đã xóa đoạn AI lặp lại tiêu đề).
- PHỤ LỤC: định mức kinh tế - kỹ thuật ban hành kèm theo @ 'Điều 1', included_in_source = false.
- CHỮ KÝ: signed_status = '(Đã ký)' (máy đã lấy nguyên văn nguồn).
- Căn cứ kết thúc bằng ',', ':' không đồng nhất – giữ nguyên.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0957_gpt-6.1-sol_qd_068/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1026_gpt-6.1-sol_qd_068/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật chuẩn hóa (bỏ dấu ở ký hiệu 'a)', xóa đoạn lặp nguyên tiêu đề điều) → tạo lại draft.json từ raw của runs/2026-11-19_1026_gpt-6.1-sol_qd_068 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1029_replay_qd_068/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1026_gpt-6.1-sol_qd_068 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1031_replay_qd_068/normalized.json. CHƯA DUYỆT.
- 19/11/2026: quy ước mới signed_status (nguyên văn dòng ký, không có → null + cảnh báo) và supersedes (chỉ văn bản cụ thể) → tạo lại draft.json từ raw của runs/2026-11-19_1026_gpt-6.1-sol_qd_068 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1040_replay_qd_068/normalized.json. CHƯA DUYỆT.
