# Duyệt mẫu qd_035

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_035 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 160281)
- Tiêu đề (metadata HF): Quyết định số 04/2023/QĐ-UBND Quy định nội dung, chi phí hỗ trợ chuẩn bị đầu tư và quản lý dự án đối với dự án đầu tư xây dựng theo cơ chế đặc thù thuộc Chương trình mục tiêu quốc gia giai đoạn 2021-2025 trên địa bàn tỉnh Điện Biên
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Mẫu dài nhất bộ: 5 điều có tiêu đề, khoản '2. Định mức chi phí...' chứa điểm a) b) c); nhắc 'Phụ lục V ban hành kèm theo Thông tư...' (phụ lục của văn bản khác, không phải attachment của quyết định này).

## Đặc điểm cấu trúc

- khoản + điểm lồng nhau
- dài (~7.300 ký tự)
- tham chiếu phụ lục của văn bản khác
- 2023

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
- CẤU TRÚC: 26 khoản/điểm, sâu 2 cấp; mẫu dài nhất – kiểm tra kỹ Điều 2, 3 (khoản 2 có điểm a) b) c)).
- PHỤ LỤC: attachments = [] là ĐÚNG ('Phụ lục V ban hành kèm theo Thông tư 11/2021/TT-BXD' là phụ lục của văn bản khác).
- 4 bất thường AI ghi: 'xây dưng', 'đối với các đối với', 'phí thẩm dự án đầu tư xây dựng', dấu phẩy thừa sau 'kiểm tra' – xác nhận từng chỗ có trong nguồn.
- Xóa cảnh báo/bất thường LỖI THỜI nói nguồn 'không cung cấp dataset/license/input_file/source_id' (khối source nay đã điền từ metadata).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 19/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn, dòng ngày có địa danh, 7 căn cứ nguyên văn (kể cả "xây dưng"), enactment "QUYẾT ĐỊNH:", 5 điều, 26 khoản/điểm đúng cha–con (Điều 1 khoản 1, 2 có đoạn number=null; Điều 2, 3 khoản 2 có điểm; Điều 4 khoản 4, 5 có điểm), không có nơi nhận, chữ ký TM. UBND/CHỦ TỊCH, hiệu lực 15/5/2023, supersedes=[].
- attachments=[] là đúng: "Phụ lục V ban hành kèm theo Thông tư số 11/2021/TT-BXD" là phụ lục của văn bản khác.
- Đã xác nhận 4 bất thường có nguyên văn trong nguồn: "xây dưng", "đối với các đối với", "phí thẩm dự án đầu tư xây dựng", "giám sát, kiểm tra, tình hình".
- Đã sửa: xóa cảnh báo lỗi thời "Dữ liệu đầu vào không cung cấp tên bộ dữ liệu, giấy phép hoặc tên tệp."



## Checklist người duyệt (cho NGƯỜI tự kiểm – mẫu TEST, 20/11/2026)

Dựa trên lỗi thật của gpt-6.1-sol ở các lần chạy trước. Tick [x] từng mục sau khi tự kiểm, sửa `gold.json` nếu sai,
rồi bảo Claude (hoặc tự chạy) `npm run samples:mark-human -- --sample qd_035 --reviewer "<tên bạn>" --confirm true`.

- [ ] Mở `source.txt` và `gold.json` cạnh nhau; đối chiếu với NGUỒN, không tin gold (gold do AI tạo và AI duyệt).
- [ ] `header.issue_date_text` có đủ địa danh ở đầu (AI bỏ địa danh ở 4/5 mẫu test; máy đã tự sửa – xác nhận lại).
- [ ] Đếm lại so với nguồn: số căn cứ, số điều, số khoản/điểm/đoạn, số nơi nhận. Không đoạn nào bị gộp vào đoạn khác hoặc bỏ sót (AI từng gộp tiêu đề khoản với đoạn sau và làm mất 1 đoạn ở qd_042).
- [ ] Câu chữ NGUYÊN VĂN, kể cả lỗi chính tả và khoảng trắng lạ của nguồn; soi kỹ chỗ nguồn bị ngắt dòng (trích yếu, căn cứ dài).
- [ ] Cấp lồng: điểm a), b)… và đoạn không số đứng ngay sau một khoản nằm trong `children` của khoản đó; đoạn trước khoản đầu hoặc ở điều không có khoản thì ở cấp điều.
- [ ] `number` chỉ là "1", "a", "-" hoặc null (không dính dấu "." hay ")" – AI từng ghi "1.", "a)").
- [ ] Chữ ký (authority/delegation/position/signed_status/signer_name), ngày hiệu lực `effective_from`, `supersedes` (chỉ văn bản cụ thể) đúng nguồn.
- [ ] Không còn cảnh báo/bất thường lỗi thời hoặc sai sự thật trong `quality.warnings`, `provenance.source_anomalies`.
- [ ] (qd_035) `attachments` = [] (lần chạy đầu AI ghi nhầm "Phụ lục V ban hành kèm theo Thông tư 11/2021/TT-BXD" – phụ lục của văn bản khác).
- [ ] (qd_035) 4 chỗ lỗi nguồn giữ nguyên và có trong bất thường: "xây dưng", "đối với các đối với", "phí thẩm dự án đầu tư xây dựng", dấu phẩy thừa sau "kiểm tra".
- [ ] (qd_035) 26 khoản/điểm, đặc biệt Điều 2–3 khoản 2 có điểm a), b), c).

## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0951_gpt-6.1-sol_qd_035/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1021_gpt-6.1-sol_qd_035/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1021_gpt-6.1-sol_qd_035 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1031_replay_qd_035/normalized.json. CHƯA DUYỆT.
- 20/11/2026: ĐÃ DUYỆT bởi Claude (AI) – chưa có người duyệt; draft.json → gold.json.
