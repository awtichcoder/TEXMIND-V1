# Duyệt mẫu qd_082

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_082 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 170673)
- Tiêu đề (metadata HF): Quyết định số 49/2024/QĐ-UBND Quy định khung giá dịch vụ quản lý vận hành nhà chung cư trên địa bàn thành phố Đà Nẵng
- Đợt chọn: batch_2026-11-19; đề xuất split: train

## Lý do chọn

Khung giá dịch vụ chung cư có bảng mức giá; con số bị tách kiểu '1. 200', '13. 500' dễ bị nhận nhầm là khoản đánh số. Có nơi nhận và tham chiếu phụ lục.

## Đặc điểm cấu trúc

- bảng khung giá
- có nơi nhận
- có phụ lục
- số bị tách '1. 200'

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
- BẢNG (Điều 3): 1 dòng tiêu đề × 3 cột (Loại nhà | Mức giá tối thiểu | Mức giá tối đa), 2 dòng dữ liệu, unit = 'đồng/m 2 /tháng'. Đối chiếu từng ô với nguồn dòng 50–68; ô giá giữ nguyên '1. 200', '7. 000', '4. 000', '13. 500'.
- CẢNH BÁO: có 4 cảnh báo máy tự thêm cho 4 ô giá + 2–3 cảnh báo AI nói cùng ý → giữ một bộ, xóa phần trùng.
- PHỤ LỤC: attachments = [] là ĐÚNG ('Phụ lục VII của Nghị định 95/2024' là phụ lục của văn bản khác).
- Điều 1 có 2 đoạn gạch đầu dòng (number '-'); supersedes = Quyết định số 01/2021/QĐ-UBND – đối chiếu Điều 5.
- Bất thường nguồn: 'Bộ Bộ trưởng Bộ Xây dựng', khoảng trắng trước dấu phẩy – xác nhận đúng là có trong nguồn.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1000_gpt-6.1-sol_qd_082/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1016_gpt-6.1-sol_qd_082/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1016_gpt-6.1-sol_qd_082 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1030_replay_qd_082/normalized.json. CHƯA DUYỆT.
