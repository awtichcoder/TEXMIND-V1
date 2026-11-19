# HANDOFF – cập nhật 19/11/2026 (giờ VN), phiên Claude Code trên Windows

File này ghi trạng thái để phiên Claude Code tiếp quản. Đọc hết trước khi làm.

## 1. Bối cảnh nhanh

- Thư mục: `C:\CNPM\AI-r1-2026`, nhánh `feature-texmind`. Working tree có nhiều thay đổi chưa commit: GIỮ NGUYÊN. Chưa commit/push gì.
- Provider AI: `https://api.xingchiapi.com/v1`, model `gpt-6.1-sol`, wire API responses, header `x-openai-actor-authorization: local-image-extension`.
- Gọi thẳng `POST /v1/responses` bằng script bị provider từ chối → transport mặc định `OPENAI_TRANSPORT=codex_cli`. **Đường Codex CLI đã chạy được thật (19/11).**
- Codex CLI: máy KHÔNG cài toàn cục; dùng `codex.exe` đi kèm extension VS Code `openai.chatgpt-*` (client tự tìm, bản 0.169.0-alpha.11.1). Có thể ép bằng `OPENAI_CODEX_COMMAND`.
- Python: đã cài Python 3.12.10 (winget, phạm vi user) + `.venv` trong dự án có `python-docx 1.2.0` và `pymupdf` (đổi PDF → ảnh để soát DOCX). Renderer tự dùng `.venv` (hoặc `TEXMIND_PYTHON`).
- Xem DOCX: LibreOffice headless (`C:\Program Files\LibreOffice\program\soffice.exe --headless --convert-to pdf`) chạy tốt. Word COM (automation) bị treo do hộp thoại ẩn → không dùng.
- Template: `TM-QD-001` (có bảng, mẫu qd_066, nay cả qd_082 nháp), `TM-QD-002` (không bảng; qd_021, qd_014, qd_067).

## 0. CẬP NHẬT MỚI NHẤT – phiên 19/11 (lần 2)

1. Chạy thật `--sample` qd_014 (test), qd_021 (dev) và chạy lại qd_067. Bộ chấm nâng lên **2.1** (so thêm `header.issue_date_text`).
   - Điểm mới nhất (2.1): qd_067 1.0, qd_014 1.0, qd_021 0.8333. Trung bình gpt-6.1-sol trên test (4 lần chạy, 2 mẫu): 0.9972. Xem `reports/scoreboard.md`.
   - Lỗi lặp lại đã sửa: AI hay bỏ địa danh ở dòng ngày ("ngày 5 tháng 10..." thay vì "Bình Thạnh, ngày 5 tháng 10..."), DOCX in thiếu địa danh mà bộ chấm 2.0 không thấy. Sửa: luật chuẩn hóa `issue_date_text_keeps_place_from_source_line` (chỉ lấy đúng dòng có trong nguồn) + bộ chấm 2.1. Lần chạy lại qd_014 AI vẫn bỏ địa danh và luật đã tự khôi phục.
   - Lỗi còn lại qd_021 (2/2 lần): phụ lục "Quy định ban hành kèm theo" có `source_reference` = "Điều 1" (gold: "Ban hành kèm theo Quyết định này"). Gold cũ KHÔNG thống nhất (qd_030 trỏ vị trí "Điều 1 khoản 1 điểm a") → chờ người dùng chốt quy ước.
   - Soát DOCX bằng ảnh (LibreOffice → PDF → PNG): A4 đúng, không cắt/chồng chữ. Quốc hiệu xuống 2 dòng là cố ý (theo file tham chiếu).
   - `npm run scoreboard -- --rescore true` chấm lại mọi run; bản điểm cũ lưu `score.previous.json`. Lưu ý: `pipeline.json` của run cũ vẫn ghi điểm cũ; bảng điểm ưu tiên `score.json`.
2. 10 mẫu MỚI chưa từng dùng (đợt `dataset/selection/batch_2026-11-19.json`, có lý do chọn + mẫu bị loại): qd_082, qd_042, qd_096, qd_081, qd_035, qd_100, qd_022, qd_040, qd_068, qd_072.
   - Mỗi mẫu có `source.txt` (bản sao nguyên byte clean_text), `metadata.json`, `REVIEW.md` (có mục "Máy kiểm tra sơ bộ"), `draft.json` (nháp gpt-6.1-sol). KHÔNG có gold.json.
   - Loại qd_053, qd_017 (và các mẫu có bảng cũ): text thiếu quốc hiệu/số hiệu/chữ ký → làm gold sẽ phải bịa trường bắt buộc.
   - Máy kiểm tra: mọi câu chữ trong 10 draft đều có nguyên văn trong nguồn, số điều khớp 10/10. Vấn đề cần người duyệt: qd_082 (bảng: AI đổi "1. 200" → "01.200" vì mẫu số tiền của schema; phụ lục VII của Nghị định bị ghi nhầm là attachment), qd_035 (phụ lục V của Thông tư bị ghi nhầm là attachment), qd_022 (đoạn không số dùng "-" thay vì null), qd_100/qd_068 (quy ước source_reference cho quy định ban hành kèm theo).
   - CHƯA sửa prompt cho lỗi "phụ lục của văn bản khác bị ghi là attachment" vì qd_035 thuộc test đề xuất (tránh rò rỉ test). Làm sau khi chốt split, dựa trên mẫu train (qd_082).
   - Đề xuất split (CHƯA áp vào `dataset/splits/`): test = qd_042, qd_096, qd_035, qd_022, qd_072; train = qd_082, qd_081, qd_100, qd_040, qd_068. Gợi ý chuyển qd_067, qd_014 từ test sang dev vì đã thấy khi viết prompt.
3. Script mới: `npm run samples:prepare -- --batch <file>`; `npm run pipeline:e2e -- --sample <mã> --save-draft true` (từ chối nếu đã có draft/gold); `npm run samples:promote -- --sample <mã> --reviewer "<tên>" [--date YYYY-MM-DD] --confirm true` (CHỈ chạy khi người dùng ra lệnh; kiểm tra schema + checklist REVIEW.md đã tick hết; đổi draft.json → gold.json, ghi ngày duyệt vào REVIEW.md và metadata.json).
4. Sửa renderer: bảng chỉ có 3 tiêu đề cột (qd_082) gây `IndexError` → thêm cột "TT". Test 78/78, `git diff --check` sạch.
5. Câu hỏi chờ người dùng: (a) có mở rộng schema `data_tables` cho bảng tổng quát (cột tự do, số tiền không ép dạng dd.ddd) không; (b) quy ước `source_reference` cho quy định ban hành kèm theo; (c) đoạn không số dùng null hay "-"; (d) đồng ý đề xuất split không.
6. Google Docs: phiên Claude Code vẫn KHÔNG có công cụ Google Docs → người dùng dán tay đoạn báo cáo trong chat.

## 2. Đã làm trong phiên 19/11 (Claude Code)

1. Không còn tiến trình cũ (`run_end_to_end.mjs`, `qd067_openai_codex`, `texmind-codex-*`).
2. Smoke test `npm run smoke:codex`: ĐẠT (~15–17 giây, `{"ok": true}`).
   - Lỗi 1: `spawn codex ENOENT` → thêm `resolveCodexCommand()` (biến môi trường → PATH → codex.exe trong extension VS Code).
3. Pipeline qd_067 thật (`work/end_to_end/qd067_openai_codex/`): ĐẠT sau 3 lần sửa schema.
   - Lỗi 2: provider dùng Structured Outputs strict: mọi khóa phải nằm trong `required` (thiếu `children`).
   - Lỗi 3: provider từ chối `type: ["string","null"]` → phải viết `anyOf: [{type}, {type:"null"}]`.
   - Lỗi 4: một số máy chủ đòi mọi nút `enum`/`const` phải có `type`.
   - Provider KHÔNG ổn định: cùng một schema gửi 4 lần thì 3 lần nhận, 1 lần từ chối; có lúc trả `Upstream request failed`.
   - Giải pháp: `src/strict_output_schema.mjs` (`toStrictOutputSchema`, `dropNullOptionals`), extractor ghi `<output>.codex-output-schema.json` cho Codex, sau đó bỏ `null` ở khóa tùy chọn và kiểm tra bằng schema gốc. Thêm `requestCodexCliResponseWithRetry` (gọi lại tối đa `OPENAI_CODEX_ATTEMPTS`=3 lần với lỗi tạm thời) và `OPENAI_CODEX_STREAM_MAX_RETRIES`.
   - Sửa client: khi quá giờ dừng cả cây tiến trình (`taskkill /T`), chờ thoát rồi mới báo lỗi; xóa thư mục tạm có thử lại (trước đó `EBUSY` che mất lỗi gốc).
   - Kết quả: raw/normalized 0 lỗi schema, 0 thay đổi hậu xử lý, template TM-QD-002, DOCX 42 đoạn mở được, manifest `completed`. Điểm so `dataset/samples/qd_067/gold.json`: **strict 1.0, tolerant 1.0** (24/24 khoản). Lưu ý: qd_067 đã được xem khi viết prompt → điểm lạc quan. File điểm: `work/end_to_end/qd067_openai_codex/qd_067.score.json`.
   - `outputs/qd_067.rendered.docx` KHÔNG bị ghi đè.
4. Task 2 xong: `run_end_to_end.mjs --sample <mã>` → `runs/<YYYY-MM-DD>_<HHMM>_<model>_<mã>/` (raw, normalized, postprocess, rendered.docx, score.json, pipeline.json); stage `evaluate` khi có gold; manifest có `sample_id`, `run_id`, `split`, `strict_evaluation.overall_score`, `tolerant_evaluation.overall_score`, ghi chú "output AI không phải gold". `--raw` dùng nhãn `replay`. Hành vi cũ giữ nguyên. `runs/` đã vào `.gitignore`.
5. Task 3 xong: `src/build_scoreboard.mjs` + `npm run scoreboard` → `reports/scoreboard.md` (bảng theo lần chạy + trung bình theo model trên tập test, KHÔNG tính replay). Hàm thuần `renderScoreboard(rows)`.
6. Task 4 xong: `tests/samples_layout.mjs` (10 test), `tests/strict_output_schema.mjs` (4 test), thêm test cho `resolveCodexCommand`, gọi lại, cấu hình retry, `resolvePythonCommand`. Script npm `samples:migrate`, `scoreboard`. README cập nhật.
7. Test: **69/69 đạt**; `git diff --check` sạch.

## 3. Việc tiếp theo (theo kế hoạch mục 5)

1. Google Docs: phiên Claude Code này KHÔNG có công cụ Google Docs → báo cáo 19/11 chưa ghi; người dùng dán tay (nội dung đã đưa trong chat) hoặc phiên claude.ai ghi giúp.
2. Chạy `--sample qd_014` (test) và `qd_021` (dev) bằng gpt-6.1-sol, rồi `npm run scoreboard`.
3. 22–25/11: AI làm nháp thêm mẫu từ `dataset/hf_quyet_dinh`, người duyệt thành gold (thêm thư mục `dataset/samples/<mã>/`, cập nhật splits). Mẫu MỚI chưa thấy nên ưu tiên đưa vào test.
4. Có thể xóa 2 dòng config Codex bị bỏ qua (`disable_response_storage`, `network_access`) — Codex 0.169 báo "ignored"; hiện vô hại.

## 4. Kiểm tra cuối phiên

- `npm test`: **78/78 đạt** (cuối phiên 19/11 lần 2); `git diff --check` sạch.
- `runs/` hiện có 2 lần chạy: `2026-11-19_0911_replay_qd_067` (chấm lại raw cũ ngày 10/11) và `2026-11-19_0927_gpt-6.1-sol_qd_067` (AI thật, strict 1.0 / tolerant 1.0). `reports/scoreboard.md` đã tạo.

## 5. Kế hoạch tới 30/11/2026 (người dùng đã đồng ý hướng này)

| Ngày | Việc |
|---|---|
| 19–21/11 | ~~Smoke test + qd_067 thật; sắp lại thư mục; bảng điểm~~ (xong 19/11). Chạy thêm qd_014, qd_021. Nếu provider hỏng hẳn → chuyển sang Qwen trên Colab (notebook đã có). |
| 22–25/11 | AI làm nháp thêm 10–14 mẫu từ `dataset/hf_quyet_dinh`, người dùng duyệt 3–4 mẫu/ngày → 15–20 gold; chấm điểm hàng loạt; sửa prompt theo lỗi lặp lại. |
| 26–27/11 | Train thử LoRA trên Colab (Qwen 1.5B–3B) để học quy trình; có thể dùng dữ liệu "silver" do gpt-6.1-sol tạo cho train, nhưng test luôn là gold người duyệt. |
| 28–29/11 | Trang demo đơn giản (chưa chốt: người dùng chưa trả lời có cần demo hay chỉ chạy bằng lệnh) + README + báo cáo. |
| 30/11 | Dự phòng, tổng kết. |

## 6. Bảo mật

API key từng bị dán vào chat. Nhắc người dùng rotate key sau khi kiểm tra xong. Không đưa key vào prompt cho model. Kiểm tra 19/11: log và file chẩn đoán không có chuỗi dạng token (`sk-…`, `Bearer …`).
