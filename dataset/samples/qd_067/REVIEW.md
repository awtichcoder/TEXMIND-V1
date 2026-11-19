# Duyệt mẫu qd_067

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 185483)
- Trạng thái duyệt: not_expert_reviewed
- Kiểm tra gần nhất: 2026-11-10

## Bất thường trong văn bản nguồn

- `trên địa bàn thành phố Hà Nộ`: Tiêu đề trong TXT có khả năng thiếu chữ 'i'; giữ nguyên theo nguồn.
- `Quyết định này có hiệu lực kể từ ngày 08 tháng 01 năm 2025./.`: Ngày hiệu lực trong TXT sớm hơn ngày ban hành và khác metadata 08/01/2026; cần đối chiếu văn bản chính thức.

## Checklist khi duyệt gold

- [ ] Trường đơn (số hiệu, ngày, cơ quan, trích yếu) khớp nguồn
- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ
- [ ] Đủ điều, khoản, khoản con; không tự đánh số đoạn không có ký hiệu
- [ ] Nơi nhận và chữ ký khớp nguồn
- [ ] Phụ lục chỉ tham chiếu, không bịa nội dung

## Ghi chú

