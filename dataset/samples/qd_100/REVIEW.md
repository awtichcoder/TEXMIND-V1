# Duyệt mẫu qd_100

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_100 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 168304)
- Tiêu đề (metadata HF): Quyết định số 16/2024/QĐ-UBND Quy định vị trí, chức năng, nhiệm vụ, nguyên tắc hoạt động, cơ cấu tổ chức, chế độ chính sách và một số điều kiện đảm bảo hoạt động của tổ bảo vệ an ninh, trật tự trên địa bàn tỉnh Hưng Yên.
- Đợt chọn: batch_2026-11-19; đề xuất split: train

## Lý do chọn

Điều 3 'Trách nhiệm thi hành' có điểm a) b) ngay dưới điều, không qua khoản; Điều 2 có tiêu đề rồi nội dung ở dòng riêng. Nơi nhận dài. Kiểm tra mô hình không tự chế khoản.

## Đặc điểm cấu trúc

- điểm a) b) nằm thẳng dưới điều (không có khoản)
- điều có tiêu đề + đoạn văn riêng
- có nơi nhận
- 2024

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
- Điều 1 không có tiêu đề riêng → heading là cả câu, không có khoản (đúng quy ước qd_010).
- Điều 3: điểm a), b) nằm thẳng dưới điều (number 'a', 'b'); Điều 2: 1 đoạn number=null.
- PHỤ LỤC: quy định ban hành kèm theo @ 'Điều 1' – đúng quy ước mới.
- Bất thường 'đảm bảo vệ' trong căn cứ – xác nhận có trong nguồn.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0953_gpt-6.1-sol_qd_100/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1024_gpt-6.1-sol_qd_100/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật chuẩn hóa (bỏ dấu ở ký hiệu 'a)', xóa đoạn lặp nguyên tiêu đề điều) → tạo lại draft.json từ raw của runs/2026-11-19_1024_gpt-6.1-sol_qd_100 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1029_replay_qd_100/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1024_gpt-6.1-sol_qd_100 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1031_replay_qd_100/normalized.json. CHƯA DUYỆT.
