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

- [ ] Trường đơn (cơ quan, số hiệu, nơi + ngày ban hành, trích yếu) khớp nguồn
- [ ] `issue_date_text` giữ nguyên cả địa danh (vd. "Hà Nội, ngày ...")
- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ (kể cả lỗi chính tả của nguồn)
- [ ] Đủ điều, khoản, điểm; đúng cấp lồng nhau; không tự đánh số đoạn không có ký hiệu
- [ ] Nơi nhận và chữ ký khớp nguồn (không có nơi nhận thì `recipients` = [])
- [ ] Phụ lục/văn bản kèm theo chỉ tham chiếu, không bịa nội dung
- [ ] Bất thường của nguồn ghi vào `provenance.source_anomalies`

## Máy kiểm tra sơ bộ (19/11/2026, không thay cho người duyệt)

- Đã tự so: mọi câu chữ (căn cứ, tiêu đề điều, khoản/điểm, nơi nhận, số hiệu, dòng ngày) đều có nguyên văn trong source.txt; số điều khớp nguồn.
- PHỤ LỤC: attachments có 'Phụ lục V ban hành kèm theo Thông tư 11/2021/TT-BXD' – phụ lục của văn bản KHÁC, không phải tài liệu kèm theo quyết định này → nên xóa (attachments = []).

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0951_gpt-6.1-sol_qd_035/normalized.json. CHƯA DUYỆT.
