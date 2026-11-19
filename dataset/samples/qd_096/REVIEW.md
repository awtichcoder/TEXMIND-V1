# Duyệt mẫu qd_096

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_096 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 152369)
- Tiêu đề (metadata HF): Quyết định số 20/2021/QĐ-UBND Quy định khung giá dịch vụ sử dụng cảng cá trên địa bàn tỉnh Kiên Giang
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Khung giá cảng cá: mỗi khoản có nhiều điểm a) b) c) với khoảng giá; kiểm tra giữ nguyên số tiền và thứ tự điểm. Số hiệu có khoảng trắng lạ '20 /2021/QĐ-UBND'.

## Đặc điểm cấu trúc

- nhiều điểm dưới khoản (16)
- mức thu 'từ ... đến ...'
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
- CẤU TRÚC: 28 khoản/điểm (Điều 3 có nhiều điểm a) b) c) với mức thu 'từ ... đến ...') – kiểm tra từng số tiền và thứ tự điểm.
- Nguồn có khoảng trắng lạ: '20 /2021/QĐ-UBND', 'q uy định', '565 /TTr- SNNPTNT', '20 21' – phải giữ nguyên (AI đã ghi bất thường).
- Hiệu lực: effective_from = 2022-06-01; supersedes = Quyết định số 04/2017/QĐ-UBND – đối chiếu dòng 109 của nguồn.
- Xóa cảnh báo/bất thường LỖI THỜI nói nguồn 'không cung cấp dataset/license/input_file/source_id' (khối source nay đã điền từ metadata).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 19/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn (giữ nguyên "20 /2021/QĐ-UBND", gạch nối "–" ở tiêu ngữ), dòng ngày có địa danh, 11 căn cứ nguyên văn (kể cả "q uy định", dấu chấm cuối căn cứ NĐ 26/2019, "565 /TTr- SNNPTNT ... năm 20 21"), enactment "QUYẾT ĐỊNH:" (dòng thẩm quyền "ỦY BAN NHÂN DÂN TỈNH KIÊN GIANG" trước căn cứ không lưu riêng – cùng quy ước gold qd_021), 5 điều, 28 khoản/điểm và mọi mức thu khớp nguồn, không có nơi nhận (recipients=[]), chữ ký TM./KT. CHỦ TỊCH/PHÓ CHỦ TỊCH, hiệu lực 01/6/2022, supersedes = QĐ 04/2017/QĐ-UBND (văn bản cụ thể), 4 bất thường nguồn hợp lý.
- Điểm mơ hồ, GIỮ NGUYÊN: đoạn "Thời gian vào, ra cảng 01 lần…" sau khoản 5 Điều 3 không có ký hiệu → để là đoạn number=null ngang cấp khoản (không tự gán làm con của khoản 5). Người duyệt có thể đổi nếu đối chiếu văn bản chính thức.
- Đã sửa: xóa cảnh báo lỗi thời "Nguồn được cung cấp trực tiếp… không kèm thông tin về bộ dữ liệu, giấy phép…".



## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0949_gpt-6.1-sol_qd_096/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1018_gpt-6.1-sol_qd_096/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1018_gpt-6.1-sol_qd_096 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1030_replay_qd_096/normalized.json. CHƯA DUYỆT.
