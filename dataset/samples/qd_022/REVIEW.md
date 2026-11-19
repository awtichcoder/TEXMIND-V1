# Duyệt mẫu qd_022

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_022 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 6357)
- Tiêu đề (metadata HF): Quyết định số 85/2000/QĐ-TTg Về việc chuyển Công ty Giấy Viễn Đông thành Công ty cổ phần
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Quyết định của Thủ tướng về cổ phần hóa: nhiều dòng '-' không có số thứ tự (không được tự đánh số), số tiền dạng 11.600.000.000 đồng, tên tiếng Anh viết thường.

## Đặc điểm cấu trúc

- Thủ tướng Chính phủ (TTg)
- gạch đầu dòng không đánh số
- số tiền lớn
- 2000

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
- ĐOẠN KHÔNG SỐ: 15 đoạn gạch đầu dòng (number '-') + 4 khoản số ở Điều 1 – kiểm tra từng đoạn thuộc đúng điều/khoản cha.
- Tiêu đề Điều 5 'Công ty cổ phần Giấy Viễn Đông :' (có khoảng trắng trước dấu hai chấm) – đúng nguyên văn nguồn dòng 69.
- CHỮ KÝ: authority 'THỦ TƯỚNG CHÍNH PHỦ', delegation 'KT. THỦ TƯỚNG', position 'PHÓ THỦ TƯỚNG' – đối chiếu nguồn.
- HIỆU LỰC: supersedes = [] (câu 'các quyết định trước đây trái với Quyết định này' là chung chung, vẫn còn nguyên văn ở Điều 6). XÓA cảnh báo AI 'Điều 6 bãi bỏ các quyết định trước đây... không nêu cụ thể số, ký hiệu văn bản' (quy ước: không cảnh báo trường hợp này).
- Xóa cảnh báo/bất thường LỖI THỜI nói nguồn 'không cung cấp dataset/license/input_file/source_id' (khối source nay đã điền từ metadata).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 19/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn (giữ nguyên "85/2000/QĐ-TTG", "ngày 18 tháng 07"), 3 căn cứ (căn cứ cuối kết thúc bằng dấu phẩy như nguồn), enactment "QUYẾT ĐỊNH:", 6 điều; Điều 3 và Điều 6 không tách tiêu đề – toàn văn giữ trong heading, không có khoản (cùng quy ước gold qd_010); 4 khoản số ở Điều 1 và 15 đoạn gạch đầu dòng number "-" đúng điều/khoản cha (giữ khoảng trắng trước dấu hai chấm như nguồn); không có nơi nhận; chữ ký KT. THỦ TƯỚNG/PHÓ THỦ TƯỚNG, authority "THỦ TƯỚNG CHÍNH PHỦ" lấy từ cơ quan ban hành vì nguồn không có dòng TM. (cùng quy ước gold qd_010); hiệu lực "từ ngày ký" → effective_from = ngày ban hành 2000-07-18 (cùng cách gold qd_030); supersedes=[] (bãi bỏ chung chung).
- Đã sửa (kèm đổi source_consistency warning → passed vì không còn cảnh báo): (1) xóa mục source_anomalies có source_text "VĂN BẢN NGUỒN:" – đây là nhãn trong prompt, KHÔNG có trong nguồn; (2) xóa 2 cảnh báo lỗi thời về dataset/license/input_file và source_id (khối source đã điền từ metadata, source_id 6357); (3) xóa cảnh báo "Điều 6 bãi bỏ… không nêu cụ thể" theo quy ước đã chốt 19/11.



## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0954_gpt-6.1-sol_qd_022/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1025_gpt-6.1-sol_qd_022/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1025_gpt-6.1-sol_qd_022 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1031_replay_qd_022/normalized.json. CHƯA DUYỆT.
- 19/11/2026: quy ước mới signed_status (nguyên văn dòng ký, không có → null + cảnh báo) và supersedes (chỉ văn bản cụ thể) → tạo lại draft.json từ raw của runs/2026-11-19_1025_gpt-6.1-sol_qd_022 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1040_replay_qd_022/normalized.json. CHƯA DUYỆT.
