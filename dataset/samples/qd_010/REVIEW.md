# Duyệt mẫu qd_010

- Nguồn: https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents (source_id 168554)
- Trạng thái duyệt: not_expert_reviewed
- Kiểm tra gần nhất: 2026-11-11

## Bất thường trong văn bản nguồn

- `Că n cứ Luật Phí và l ệ phí`: Nguồn có lỗi nghi OCR làm tách khoảng trắng trong từ; giữ nguyên khi trích nội dung.
- `Bộ trưởng các Bộ: Thông tin và Truyền thông, Tài chính, Kế hoạch và Đầu tư, Nội vụ, Cục trưởng Cục Viễn thông và Thủ trưởng các cơ quan liên quan chịu trách nhiệm thi hành Quyết định này./.`: Đoạn trách nhiệm thi hành nằm sau Điều 3 nhưng không có tiêu đề Điều 4 trong nguồn.

## Checklist khi duyệt gold

- [ ] Trường đơn (số hiệu, ngày, cơ quan, trích yếu) khớp nguồn
- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ
- [ ] Đủ điều, khoản, khoản con; không tự đánh số đoạn không có ký hiệu
- [ ] Nơi nhận và chữ ký khớp nguồn
- [ ] Phụ lục chỉ tham chiếu, không bịa nội dung

## Ghi chú

