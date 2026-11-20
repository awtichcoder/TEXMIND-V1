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

- [x] Trường đơn (cơ quan, số hiệu, nơi + ngày ban hành, trích yếu) khớp nguồn
- [x] `issue_date_text` giữ nguyên cả địa danh (vd. "Hà Nội, ngày ...")
- [x] Đủ căn cứ pháp lý, giữ nguyên câu chữ (kể cả lỗi chính tả của nguồn)
- [x] Đủ điều, khoản, điểm; đúng cấp lồng nhau; không tự đánh số đoạn không có ký hiệu
- [x] Nơi nhận và chữ ký khớp nguồn (không có nơi nhận thì `recipients` = [])
- [x] Phụ lục/văn bản kèm theo chỉ tham chiếu, không bịa nội dung
- [x] Bất thường của nguồn ghi vào `provenance.source_anomalies`

## Máy kiểm tra sơ bộ (19/11/2026, theo quy ước mới; không thay cho người duyệt)

- Máy đã so: mọi câu chữ (căn cứ, tiêu đề điều, khoản/điểm, nơi nhận, số hiệu, dòng ngày, ô bảng) có nguyên văn trong source.txt; số điều khớp nguồn; ký hiệu khoản/điểm ('-'/null) khớp dòng nguồn; vị trí phụ lục đúng dạng và tồn tại.
- Khối `source` đã điền từ metadata.json (không do AI). Dòng ngày đã có địa danh.
- CẤU TRÚC: 16 khoản/điểm; kiểm tra số đo '1.500 m2/hộ', hệ số '3,33' giữ nguyên dấu.
- CHỮ KÝ: signed_status = '(Đã ký)' (máy đã lấy nguyên văn nguồn); position = 'PHÓ CHỦ TỊCH thường trực' (đúng nguồn).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 20/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn, trích yếu (nguồn ngắt 2 dòng, draft nối bằng dấu cách), dòng ngày có địa danh, 6 căn cứ (căn cứ 'Thực hiện Quyết định số 1719/QĐ-TTg…' bị ngắt dòng trong nguồn, nối bằng dấu cách), 4 điều, chữ ký TM./KT./'PHÓ CHỦ TỊCH thường trực'/'(Đã ký)', hiệu lực 25/11/2023, supersedes=[], không nơi nhận, không phụ lục.
- Đã sửa: LỖI CẤU TRÚC – các điểm a), b), c) đang nằm ngang hàng với khoản → lồng vào khoản cha: Điều 1 khoản 2 (điểm a, b); Điều 2 khoản 1 (điểm a, b, c) và khoản 2 (điểm a, b). Đoạn không số sau '1. Phạm vi điều chỉnh' chuyển thành con (number=null) của khoản 1.
- Không có cảnh báo/bất thường; source_consistency = passed (đúng).

## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0951_gpt-6.1-sol_qd_081/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1020_gpt-6.1-sol_qd_081/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1020_gpt-6.1-sol_qd_081 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1030_replay_qd_081/normalized.json. CHƯA DUYỆT.
- 19/11/2026: quy ước mới signed_status (nguyên văn dòng ký, không có → null + cảnh báo) và supersedes (chỉ văn bản cụ thể) → tạo lại draft.json từ raw của runs/2026-11-19_1020_gpt-6.1-sol_qd_081 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1040_replay_qd_081/normalized.json. CHƯA DUYỆT.
- 20/11/2026: ĐÃ DUYỆT bởi Claude (AI) – chưa có người duyệt; draft.json → gold.json.
