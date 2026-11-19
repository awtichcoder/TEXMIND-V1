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

## Máy kiểm tra sơ bộ (19/11/2026, không thay cho người duyệt)

- Đã tự so: mọi câu chữ (căn cứ, tiêu đề điều, khoản/điểm, nơi nhận, số hiệu, dòng ngày) đều có nguyên văn trong source.txt; số điều khớp nguồn.
- Điều 1 không có tiêu đề nên heading là cả câu và không có khoản – đúng quy ước gold cũ (qd_010).
- PHỤ LỤC: attachments có quy định ban hành kèm theo, source_reference = 'Điều 1'. Gold cũ không thống nhất (qd_021 dùng 'Ban hành kèm theo Quyết định này', qd_030 dùng vị trí điều/khoản) → chốt một quy ước trước khi duyệt.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_0953_gpt-6.1-sol_qd_100/normalized.json. CHƯA DUYỆT.
