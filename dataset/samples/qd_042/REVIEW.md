# Duyệt mẫu qd_042

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_042 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 183050)
- Tiêu đề (metadata HF): Quyết định số 96/2025/QĐ-UBND Phân cấp thẩm quyền quyết định xác lập, phê duyệt phương án xử lý tài sản được xác lập quyền sở hữu toàn dân trên địa bàn tỉnh Tuyên Quang
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Văn bản phân cấp mới (2025), 6 điều có tiêu đề, khoản 1/2 chứa điểm a) b) c) d); có nơi nhận. Đại diện văn bản hiện hành có cấu trúc lồng nhau.

## Đặc điểm cấu trúc

- khoản + điểm lồng nhau
- có nơi nhận
- 6 điều
- 2025

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
- CẤU TRÚC: 21 khoản/điểm, sâu 2 cấp (khoản → điểm a, b, c, d) ở Điều 1–5 – kiểm tra không sót điểm, đúng cha–con.
- NƠI NHẬN: 22 dòng – đếm lại với nguồn.
- Xóa cảnh báo/bất thường LỖI THỜI nói nguồn 'không cung cấp dataset/license/input_file/source_id' (khối source nay đã điền từ metadata).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 19/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn, dòng ngày có địa danh, 4 căn cứ (kể cả "Theo đề nghị…"), 6 điều, 21 khoản/điểm đúng cha–con (Điều 1 khoản 1 có đoạn dẫn number=null rồi điểm a–d; khoản 2 điểm a–d; Điều 3 một đoạn number=null), 22 dòng nơi nhận nguyên văn, chữ ký, hiệu lực 22/10/2025, supersedes=[]; không có phụ lục/bảng.
- Đã sửa: (1) header.issuer bỏ ký tự xuống dòng, nối bằng dấu cách theo quy ước 6 gold cũ; (2) xóa cảnh báo lỗi thời "Nguồn không cung cấp tên bộ dữ liệu…".
- Kiểm tra máy sau sửa: mọi dòng nội dung của nguồn có trong draft; không có chuỗi nào trong draft ngoài nguồn.



## Checklist người duyệt (cho NGƯỜI tự kiểm – mẫu TEST, 20/11/2026)

Dựa trên lỗi thật của gpt-6.1-sol ở các lần chạy trước. Tick [x] từng mục sau khi tự kiểm, sửa `gold.json` nếu sai,
rồi bảo Claude (hoặc tự chạy) `npm run samples:mark-human -- --sample qd_042 --reviewer "<tên bạn>" --confirm true`.

- [ ] Mở `source.txt` và `gold.json` cạnh nhau; đối chiếu với NGUỒN, không tin gold (gold do AI tạo và AI duyệt).
- [ ] `header.issue_date_text` có đủ địa danh ở đầu (AI bỏ địa danh ở 4/5 mẫu test; máy đã tự sửa – xác nhận lại).
- [ ] Đếm lại so với nguồn: số căn cứ, số điều, số khoản/điểm/đoạn, số nơi nhận. Không đoạn nào bị gộp vào đoạn khác hoặc bỏ sót (AI từng gộp tiêu đề khoản với đoạn sau và làm mất 1 đoạn ở qd_042).
- [ ] Câu chữ NGUYÊN VĂN, kể cả lỗi chính tả và khoảng trắng lạ của nguồn; soi kỹ chỗ nguồn bị ngắt dòng (trích yếu, căn cứ dài).
- [ ] Cấp lồng: điểm a), b)… và đoạn không số đứng ngay sau một khoản nằm trong `children` của khoản đó; đoạn trước khoản đầu hoặc ở điều không có khoản thì ở cấp điều.
- [ ] `number` chỉ là "1", "a", "-" hoặc null (không dính dấu "." hay ")" – AI từng ghi "1.", "a)").
- [ ] Chữ ký (authority/delegation/position/signed_status/signer_name), ngày hiệu lực `effective_from`, `supersedes` (chỉ văn bản cụ thể) đúng nguồn.
- [ ] Không còn cảnh báo/bất thường lỗi thời hoặc sai sự thật trong `quality.warnings`, `provenance.source_anomalies`.
- [ ] (qd_042) Điều 1 khoản 1: "1. Phạm vi điều chỉnh" là khoản riêng, đoạn "Quyết định này quy định…" là con number=null của nó (lần chạy đầu AI gộp hai phần này và mất 1 đoạn).
- [ ] (qd_042) Các đoạn có câu chữ GẦN GIỐNG NHAU lặp ở nhiều điều ("Sở Tài chính quyết định…" ở Điều 2, 3; "Cơ quan chuyên môn…" ở Điều 2, 4, 5; "Ủy ban nhân dân xã, phường…" ở Điều 2, 5): kiểm từng đoạn nằm đúng điều/khoản và đúng câu chữ của điều đó.
- [ ] (qd_042) 22 dòng nơi nhận khớp nguồn.

## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0947_gpt-6.1-sol_qd_042/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1017_gpt-6.1-sol_qd_042/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1017_gpt-6.1-sol_qd_042 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1030_replay_qd_042/normalized.json. CHƯA DUYỆT.
- 20/11/2026: ĐÃ DUYỆT bởi Claude (AI) – chưa có người duyệt; draft.json → gold.json.
