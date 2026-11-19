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

## Máy kiểm tra sơ bộ (19/11/2026, không thay cho người duyệt)

- Đã tự so: mọi câu chữ (căn cứ, tiêu đề điều, khoản/điểm, nơi nhận, số hiệu, dòng ngày) đều có nguyên văn trong source.txt; số điều khớp nguồn.
- BẢNG: AI đổi '1. 200' → '01.200', '4. 000' → '04.000' để khớp mẫu số tiền của schema (^dd.ddd$). Nguồn KHÔNG có số 0 đầu → cần sửa tay; schema hiện chưa biểu diễn đúng bảng này (xem câu hỏi về mở rộng schema).
- BẢNG: bảng chỉ có 3 cột (Loại nhà, Mức tối thiểu, Mức tối đa), không có cột nhóm; trường `group` là AI tự đánh 1, 2.
- PHỤ LỤC: attachments có 'Phụ lục VII của Nghị định 95/2024/NĐ-CP' – đây là phụ lục của văn bản KHÁC được trích dẫn, không phải tài liệu kèm theo quyết định này → nên xóa.

## Ghi chú của người duyệt


## Lịch sử

- 19/11/2026: AI (gpt-6.1-sol) tạo draft.json từ runs/2026-11-19_1000_gpt-6.1-sol_qd_082/normalized.json. CHƯA DUYỆT.
