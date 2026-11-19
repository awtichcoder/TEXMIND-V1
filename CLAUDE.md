# TEXMIND-V1 – quy tắc làm việc cho Claude

Dự án: pipeline chuyển văn bản pháp lý tiếng Việt (Quyết định) thành DOCX theo template:
văn bản nguồn → AI trích xuất JSON → chuẩn hóa → kiểm tra JSON Schema → chọn template → render DOCX → manifest.

Trạng thái và việc đang làm dở: xem `HANDOFF.md` (đọc trước khi làm bất cứ việc gì).

## Quy tắc bắt buộc

1. Giải thích cho người dùng bằng tiếng Việt đơn giản, dễ hiểu. Người dùng đang học, mục tiêu có thành phẩm mức tạm được trước 30/11/2026.
2. Sau khi xong mỗi phần việc: ghi báo cáo tiến độ vào Google Docs
   https://docs.google.com/document/d/1v9FW7Wl8RpW7GwXJhnq_UCJbsKFAi_zOCgrOWIIslbs/edit
   (thêm đoạn mới vào cuối mục "Lịch sử cập nhật", dạng `dd/mm/yyyy – TRẠNG THÁI ...`), rồi đọc lại đoạn vừa ghi để xác nhận.
3. KHÔNG push GitHub, KHÔNG commit nếu người dùng chưa yêu cầu.
4. KHÔNG đọc, in hoặc ghi giá trị API key ở bất cứ đâu (terminal, log, câu trả lời, commit, manifest, Google Docs). Key nằm trong `.env` (đã gitignore).
5. KHÔNG `git reset --hard`, `git checkout -- .` hay xóa thay đổi cũ trong working tree; chúng là thay đổi hợp lệ.
6. Không bao giờ coi output của AI là gold. Gold chỉ ở `dataset/samples/<mã>/gold.json` và phải do người duyệt.
7. Không chạy `codex` với `--dangerously-bypass-approvals-and-sandbox`.

## Lệnh hay dùng (PowerShell, tại thư mục dự án)

```powershell
npm test                       # toàn bộ test (hiện 86/86)
git diff --check               # kiểm tra lỗi khoảng trắng
npm run smoke:codex            # kiểm tra nhanh đường gọi gpt-6.1-sol qua Codex CLI
npm run pipeline:e2e -- --input dataset/van_ban_hanh_chinh/input_03.txt --sample-id qd_067 --work-dir work/end_to_end/qd067_openai_codex --output work/end_to_end/qd067_openai_codex/qd_067.rendered.docx
npm run pipeline:e2e -- --sample qd_067   # cấu trúc mới: ghi vào runs/<run_id>/ và chấm điểm với gold
npm run scoreboard                        # tạo reports/scoreboard.md
```
