# Duyệt mẫu qd_066

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 184046)
- Trạng thái duyệt: render_verified
- Kiểm tra gần nhất: 2026-11-10

## Bất thường trong văn bản nguồn

- Không ghi nhận.

## Checklist khi duyệt gold

- [ ] Trường đơn (số hiệu, ngày, cơ quan, trích yếu) khớp nguồn
- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ
- [ ] Đủ điều, khoản, khoản con; không tự đánh số đoạn không có ký hiệu
- [ ] Nơi nhận và chữ ký khớp nguồn
- [ ] Phụ lục chỉ tham chiếu, không bịa nội dung

## Ghi chú

## Lịch sử thay đổi gold

- 19/11/2026 (quy ước do người dùng chốt): tiêu đề cột "Loại nhà ở xã hội" → "Loại Nhà ở xã hội" (nguyên văn nguồn).
- 19/11/2026 (quy ước do người dùng chốt): bảng chuyển sang dạng header_rows/rows: ô là chuỗi nguyên văn, bỏ value_vnd; dòng đơn vị '(...)' nằm trong header_rows nên unit=null; ô STT của dòng thứ hai cùng nhóm là null (ô gộp).
