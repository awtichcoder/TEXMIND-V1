# Duyệt mẫu qd_072

> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.
> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:
> `npm run samples:promote -- --sample qd_072 --reviewer "<tên>" --confirm true`

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 139832)
- Tiêu đề (metadata HF): Quyết định số 33/2019/QĐ-UBND Quy định nội dung và mức chi đối với hội thi tay nghề trên địa bàn tỉnh Đồng Tháp
- Đợt chọn: batch_2026-11-19; đề xuất split: test

## Lý do chọn

Mức chi hội thi tay nghề: khoản 1 trỏ tới 'Phụ lục đính kèm' (không có trong text), có nơi nhận. Kiểm tra attachments chỉ tham chiếu, không bịa nội dung.

## Đặc điểm cấu trúc

- có nơi nhận
- tham chiếu 'Phụ lục đính kèm'
- 5 điều
- 2019

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
- PHỤ LỤC: 'Phụ lục' @ 'Điều 2, khoản 1', included_in_source = false – đúng quy ước mới.
- NƠI NHẬN: 11 dòng – đếm lại với nguồn.
- Xóa cảnh báo/bất thường LỖI THỜI nói nguồn 'không cung cấp dataset/license/input_file/source_id' (khối source nay đã điền từ metadata).

## Ghi chú của người duyệt

- Người duyệt: Claude (AI), 19/11/2026 – đối chiếu draft.json với source.txt; CHƯA có người duyệt. Nên có người soát lại khi có thời gian.
- Đã kiểm: trường đơn, trích yếu nối 2 dòng của nguồn bằng dấu cách, 4 căn cứ (giữ "–" và "-" đúng từng chỗ như nguồn), enactment "QUYẾT ĐỊNH:", 5 điều (Điều 4, 5 không tách tiêu đề – toàn văn trong heading, cùng quy ước gold qd_010), khoản 2 Điều 2 có đoạn number=null, 11 dòng nơi nhận nguyên văn, chữ ký TM./KT. CHỦ TỊCH/PHÓ CHỦ TỊCH, hiệu lực 27/12/2019, supersedes=[].
- Phụ lục: 1 attachment "Phụ lục" @ "Điều 2, khoản 1", included_in_source=false – đúng quy ước. Cảnh báo + bất thường về việc nguồn không kèm nội dung phụ lục: giữ (hơi trùng nhau nhưng không sai).
- Đã sửa: xóa cảnh báo lỗi thời "Đầu vào không cung cấp mã nguồn riêng, tên bộ dữ liệu, giấy phép hoặc tên tệp."



## Checklist người duyệt (cho NGƯỜI tự kiểm – mẫu TEST, 20/11/2026)

Dựa trên lỗi thật của gpt-6.1-sol ở các lần chạy trước. Tick [x] từng mục sau khi tự kiểm, sửa `gold.json` nếu sai,
rồi bảo Claude (hoặc tự chạy) `npm run samples:mark-human -- --sample qd_072 --reviewer "<tên bạn>" --confirm true`.

- [ ] Mở `source.txt` và `gold.json` cạnh nhau; đối chiếu với NGUỒN, không tin gold (gold do AI tạo và AI duyệt).
- [ ] `header.issue_date_text` có đủ địa danh ở đầu (AI bỏ địa danh ở 4/5 mẫu test; máy đã tự sửa – xác nhận lại).
- [ ] Đếm lại so với nguồn: số căn cứ, số điều, số khoản/điểm/đoạn, số nơi nhận. Không đoạn nào bị gộp vào đoạn khác hoặc bỏ sót (AI từng gộp tiêu đề khoản với đoạn sau và làm mất 1 đoạn ở qd_042).
- [ ] Câu chữ NGUYÊN VĂN, kể cả lỗi chính tả và khoảng trắng lạ của nguồn; soi kỹ chỗ nguồn bị ngắt dòng (trích yếu, căn cứ dài).
- [ ] Cấp lồng: điểm a), b)… và đoạn không số đứng ngay sau một khoản nằm trong `children` của khoản đó; đoạn trước khoản đầu hoặc ở điều không có khoản thì ở cấp điều.
- [ ] `number` chỉ là "1", "a", "-" hoặc null (không dính dấu "." hay ")" – AI từng ghi "1.", "a)").
- [ ] Chữ ký (authority/delegation/position/signed_status/signer_name), ngày hiệu lực `effective_from`, `supersedes` (chỉ văn bản cụ thể) đúng nguồn.
- [ ] Không còn cảnh báo/bất thường lỗi thời hoặc sai sự thật trong `quality.warnings`, `provenance.source_anomalies`.
- [ ] (qd_072) Phụ lục: nguồn viết "Chi tiết theo Phụ lục đính kèm" (Điều 2 khoản 1). Gold đang để title "Phụ lục" (lần chạy đầu AI ghi "Phụ lục đính kèm") – chọn tên bạn thấy đúng; source_reference "Điều 2, khoản 1", included_in_source = false.
- [ ] (qd_072) 11 dòng nơi nhận khớp nguồn.

## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0958_gpt-6.1-sol_qd_072/normalized.json. CHƯA DUYỆT.
- 19/11/2026: xóa draft.json cũ (bản sao còn trong runs/) để tạo lại theo quy ước mới: bảng nguyên văn, vị trí phụ lục 'Điều X, khoản Y, điểm z', đoạn '-' / null.
- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1027_gpt-6.1-sol_qd_072/normalized.json. CHƯA DUYỆT.
- 19/11/2026: thêm luật điền khối source (source_id, dataset, license, input_file) từ metadata.json → tạo lại draft.json từ raw của runs/2026-11-19_1027_gpt-6.1-sol_qd_072 (cùng output gpt-6.1-sol, không gọi AI lại).
- 19/11/2026: AI (replay) tạo draft.json từ runs/2026-11-19_1031_replay_qd_072/normalized.json. CHƯA DUYỆT.
- 20/11/2026: ĐÃ DUYỆT bởi Claude (AI) – chưa có người duyệt; draft.json → gold.json.
