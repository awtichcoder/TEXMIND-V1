# Duyệt mẫu qd_021

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 172883)
- Trạng thái duyệt: not_expert_reviewed
- Kiểm tra gần nhất: 2026-11-10

## Bất thường trong văn bản nguồn

- `Như Diều 3;`: Có khả năng là lỗi OCR của 'Như Điều 3'; giữ nguyên vì chưa đối chiếu bản gốc chính thức.
- `BT, cac PRT Quận ủy;`: Có dấu hiệu lỗi OCR/dấu tiếng Việt; giữ nguyên theo TXT nguồn.
- `UBMTTOVN và các đoàn thể quận,`: Có dấu hiệu lỗi OCR ở chữ viết tắt; giữ nguyên theo TXT nguồn.

## Checklist khi duyệt gold

- [ ] Trường đơn (số hiệu, ngày, cơ quan, trích yếu) khớp nguồn
- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ
- [ ] Đủ điều, khoản, khoản con; không tự đánh số đoạn không có ký hiệu
- [ ] Nơi nhận và chữ ký khớp nguồn
- [ ] Phụ lục chỉ tham chiếu, không bịa nội dung

## Ghi chú

## Lịch sử thay đổi gold

- 19/11/2026 (quy ước do người dùng chốt): attachments pl_01: source_reference "Ban hành kèm theo Quyết định này" → "Điều 1".
