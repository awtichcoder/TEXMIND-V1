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
- CHỮ KÝ: nguồn KHÔNG có dòng ký → signed_status = null và có một cảnh báo chuẩn trong quality.warnings (đúng quy ước 19/11). Xác nhận cuối nguồn đúng là không có '(Đã ký)'. DOCX không in gì ở vị trí này.
- Giữ nguyên lỗi nguồn 'p hân cấp' (tiêu đề Điều 2) và 'thành phổ' (khoản 2 Điều 2).
- NƠI NHẬN: 9 dòng – đếm lại với nguồn.
- Xóa cảnh báo/bất thường LỖI THỜI nói nguồn 'không cung cấp dataset/license/input_file/source_id' (khối source nay đã điền từ metadata).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 20/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn, dòng ngày có địa danh, 6 căn cứ nguyên văn, 3 điều (Điều 3 heading là cả câu hiệu lực + 1 đoạn number=null như quy ước qd_010), Điều 2 khoản 1–4, 9 dòng nơi nhận, nguồn KHÔNG có dòng ký → signed_status=null + cảnh báo chuẩn, hiệu lực 31/10/2020, supersedes=[]. Lỗi nguồn 'p hân cấp', 'thành phổ' giữ nguyên, có trong bất thường.
- Đã sửa: (1) title.subject bỏ ký tự xuống dòng, nối bằng dấu cách; (2) xóa cảnh báo lỗi thời 'Nguồn không cung cấp source_id, dataset, license và input_file…'.
- ĐÃ CHỐT 20/11/2026 (người dùng): đoạn "Riêng mức hỗ trợ chi thù lao… 3% tổng số thu." là CON (number=null) của khoản 3 Điều 2 theo quy ước "đoạn không số ngay sau khoản có số là con của khoản đó".

## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0956_gpt-6.1-sol_qd_040/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1026_gpt-6.1-sol_qd_040/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1026_gpt-6.1-sol_qd_040 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1031_replay_qd_040/normalized.json. CHƯA DUYỆT.
- 19/11/2026: quy ước mới signed_status (nguyên văn dòng ký, không có → null + cảnh báo) và supersedes (chỉ văn bản cụ thể) → tạo lại draft.json từ raw của runs/2026-11-19_1026_gpt-6.1-sol_qd_040 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1040_replay_qd_040/normalized.json. CHƯA DUYỆT.
- 20/11/2026: ĐÃ DUYỆT bởi Claude (AI) – chưa có người duyệt; draft.json → gold.json.
- 20/11/2026 (quy ước do người dùng chốt: đoạn không số ngay sau khoản có số là con của khoản đó): Điều 2 – chuyển đoạn "Riêng mức hỗ trợ chi thù lao cho lực lượng trực tiếp thu và …" (number=null) vào children của khoản 3.
