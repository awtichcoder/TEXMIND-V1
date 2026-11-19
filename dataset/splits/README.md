# Chia tập train / dev / test

Mỗi file liệt kê mã mẫu (thư mục trong `dataset/samples/`), một mã mỗi dòng. Dòng bắt đầu bằng `#` là ghi chú.

- `train.txt`: dùng để train mô hình (LoRA) hoặc làm ví dụ trong prompt.
- `dev.txt`: dùng khi chỉnh prompt, quy tắc chuẩn hóa, tham số.
- `test.txt`: chỉ dùng để chấm điểm cuối. **Không bao giờ** đưa vào train hay prompt.

Một mã chỉ được nằm ở đúng một tập (có test tự động kiểm tra).

Lưu ý trung thực: 6 mẫu đầu tiên đều đã được xem khi viết prompt và normalizer, nên điểm trên `test.txt` hiện tại có thể cao hơn thực tế. Mẫu test mới nên lấy từ văn bản chưa từng dùng khi phát triển.

Cập nhật 19/11/2026 (người dùng chốt): test chỉ gồm 5 văn bản mới (qd_042, qd_096, qd_035, qd_022, qd_072); qd_067 và qd_014 chuyển sang dev vì đã xem khi viết prompt. Các mẫu mới chỉ có `draft.json` cho tới khi người duyệt promote thành `gold.json`; khi chưa có gold thì pipeline không chấm điểm mẫu đó.
