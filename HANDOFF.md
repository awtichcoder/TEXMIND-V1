# HANDOFF – cập nhật 19/11/2026 (giờ VN), phiên Claude Code trên Windows

File này ghi trạng thái để phiên Claude Code tiếp quản. Đọc hết trước khi làm.

## 1. Bối cảnh nhanh

- Thư mục: `C:\CNPM\AI-r1-2026`. 19/11 người dùng yêu cầu tạo nhánh mới: toàn bộ thay đổi đã commit (`e3b493c`) trên nhánh `feature-texmind-codex-samples` và push lên `origin` (GitHub awtichcoder/TEXMIND-V1). Nhánh cũ `feature-texmind` giữ nguyên ở `f2792dd`.
- Push từ Claude Code: `.git/config` có `credential.credentialStore = cache` (không chạy trên Windows) → push bằng `git -c credential.credentialStore=wincredman push ...` (chỉ ghi đè cho lệnh đó, chưa sửa config).
- Provider AI: `https://api.xingchiapi.com/v1`, model `gpt-6.1-sol`, wire API responses, header `x-openai-actor-authorization: local-image-extension`.
- Gọi thẳng `POST /v1/responses` bằng script bị provider từ chối → transport mặc định `OPENAI_TRANSPORT=codex_cli`. **Đường Codex CLI đã chạy được thật (19/11).**
- Codex CLI: máy KHÔNG cài toàn cục; dùng `codex.exe` đi kèm extension VS Code `openai.chatgpt-*` (client tự tìm, bản 0.169.0-alpha.11.1). Có thể ép bằng `OPENAI_CODEX_COMMAND`.
- Python: đã cài Python 3.12.10 (winget, phạm vi user) + `.venv` trong dự án có `python-docx 1.2.0` và `pymupdf` (đổi PDF → ảnh để soát DOCX). Renderer tự dùng `.venv` (hoặc `TEXMIND_PYTHON`).
- Xem DOCX: LibreOffice headless (`C:\Program Files\LibreOffice\program\soffice.exe --headless --convert-to pdf`) chạy tốt. Word COM (automation) bị treo do hộp thoại ẩn → không dùng.
- Template: `TM-QD-001` (có bảng, mẫu qd_066, nay cả qd_082 nháp), `TM-QD-002` (không bảng; qd_021, qd_014, qd_067).

## 00. CẬP NHẬT MỚI NHẤT – phiên 19/11 (lần 3): người dùng chốt 4 quy ước

Thay đổi sau commit `e3b493c`; đã commit và push tiếp lên nhánh `feature-texmind-codex-samples` (19/11, theo yêu cầu người dùng):

1. (a) Schema `data_tables` tổng quát: `{table_id, title, unit|null, header_rows: [[ô]], rows: [[ô]]}`; ô là chuỗi NGUYÊN VĂN hoặc null (= gộp với ô phía trên); bỏ `money_value`/`group`/`minimum_rent`/`maximum_rent`. `src/data_tables.mjs` (`tableShapeErrors`, `suspiciousNumberCells`). Renderer TM-QD-001 vẽ số cột tự do, gộp dọc ô null, căn lề theo cột, dòng "Đơn vị tính" khi có unit. Normalizer tự thêm `quality.warnings` cho ô nghi gõ sai ("1. 200").
2. (b) `attachments[].source_reference` = "Điều X" / "Điều X, khoản Y" / "Điều X, khoản Y, điểm z". Normalizer: chuẩn hóa định dạng + đổi "Phụ lục N" thành vị trí khi chỉ một khoản/điểm nhắc tới. Prompt: phụ lục của văn bản khác KHÔNG phải attachment (căn cứ mẫu train qd_082).
3. (c) Đoạn không số: nguồn có "-" → number "-", không ký hiệu → null (prompt + normalizer theo dòng nguồn). Renderer in "- ", điểm chữ ở cấp điều in "a)". Gold cũ đã đúng quy ước, không phải sửa.
4. Gold cũ đã chuyển (ghi trong REVIEW.md từng mẫu; bản `dataset/van_ban_hanh_chinh/structured_0{1,2,3,5}.json` sửa giống hệt): qd_066 (bảng mới, tiêu đề cột nguyên văn "Loại Nhà ở xã hội"), qd_021 ("Điều 1"), qd_030 (4 phụ lục "Điều 1, khoản 1, điểm a..d"), qd_067 (12 phụ lục theo vị trí). qd_014, qd_010 không đổi.
5. (d) Split đã áp: test = qd_042, qd_096, qd_035, qd_022, qd_072; dev = qd_021, qd_067, qd_014; train = qd_066, qd_030, qd_010, qd_082, qd_081, qd_100, qd_040, qd_068. Bảng điểm nay dùng split HIỆN TẠI (không dùng split cũ ghi trong pipeline.json) và có thêm bảng dev.
6. Luật chuẩn hóa thêm (căn cứ mẫu train qd_068, qd_100 – không dùng mẫu test): bỏ dấu ở ký hiệu ("a)" → "a"), xóa đoạn null lặp nguyên văn tiêu đề điều, điền khối `source` từ metadata.json (`--source-metadata`, pipeline tự truyền ở chế độ --sample).
7. 10 draft tạo lại bằng gpt-6.1-sol theo quy ước mới, rồi replay từ raw đã lưu (không gọi AI) để áp luật chuẩn hóa mới. Máy kiểm tra: 0 vấn đề (câu chữ nguyên văn, số điều, ký hiệu -/null, vị trí phụ lục, ô bảng). Gợi ý duyệt cụ thể nằm ở mục "Máy kiểm tra sơ bộ" trong REVIEW.md từng mẫu. KHÔNG có gold.json mới.
8. Dev chạy lại bằng AI thật: qd_021 1.0, qd_067 1.0, qd_014 1.0 (strict/tolerant). Test chưa có điểm vì chưa có gold. `npm test` 84/84, `git diff --check` sạch.
9. (lần 4, người dùng chốt) `signature.signed_status` = NGUYÊN VĂN dòng ký trong nguồn (giữ ngoặc, hoa/thường); nguồn không có → null (schema đã cho phép null) + cảnh báo chuẩn "Nguồn không có dòng ký..." trong quality.warnings; renderer không in gì. `legal_effect.supersedes` chỉ gồm văn bản cụ thể (có số hiệu/tên rõ); câu chung chung ("các/những/mọi ... trước đây trái với ...", không có số) → bỏ, KHÔNG cảnh báo. Đã thêm vào prompt + normalizer (`signed_status_verbatim_from_source`, `signed_status_null_when_source_has_no_signed_line`, `warn_missing_signed_line`, `drop_generic_supersedes_without_identifier`) – theo định nghĩa người dùng, không tinh chỉnh theo mẫu test.
   - Soát 6 gold: signed_status đều khớp nguyên văn (qd_067 là "(đã ký)" viết thường), supersedes đều cụ thể → KHÔNG phải sửa gold.
   - Draft đổi (replay từ raw, không gọi AI): qd_081, qd_068 "Đã ký" → "(Đã ký)"; qd_040 → null + cảnh báo (DOCX không in dòng ký); qd_022 supersedes → []. qd_022 còn cảnh báo AI tự viết về Điều 6 → để người duyệt xóa (mẫu test, không thêm luật tự xóa).
   - Kiểm tra 10 draft: 0 vấn đề. `npm test` 86/86, `git diff --check` sạch.
10. Còn chờ người dùng: duyệt 10 draft (gợi ý trong REVIEW.md). Gold cũ có `source.input_file` kiểu cũ ("input_03.txt") trong khi metadata mới là "source.txt" – chưa đổi (không được chấm điểm).
11. Google Docs: vẫn không có công cụ → người dùng dán tay.

## 0. Phiên 19/11 (lần 2)

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

## 3. Việc tiếp theo (cập nhật 19/11 cuối ngày)

Thứ tự ưu tiên:

1. **Người dùng: rotate API key** (key từng bị dán vào chat), cập nhật `.env`, chạy lại `npm run smoke:codex`.
2. **Người dùng: duyệt 5 mẫu TEST trước** (qd_042, qd_096, qd_035, qd_022, qd_072) – có gold test mới có điểm thật đầu tiên. Mỗi mẫu: mở `source.txt` + `draft.json` + `REVIEW.md` (mục "Máy kiểm tra sơ bộ"), xem DOCX nháp ở `runs/<run_id mới nhất của mẫu>/rendered.docx`; sửa thẳng `draft.json`, tick hết checklist, rồi người dùng ra lệnh: `npm run samples:promote -- --sample <mã> --reviewer "<tên>" --confirm true`.
3. **Claude: chấm test** khi đã có gold: `npm run pipeline:e2e -- --sample <mã>` cho từng mẫu test (gọi gpt-6.1-sol thật), rồi `npm run scoreboard`. Báo điểm + lỗi cụ thể. KHÔNG chỉnh prompt/normalizer dựa trên lỗi mẫu test.
4. **Người dùng: duyệt 5 mẫu TRAIN** (qd_082, qd_081, qd_100, qd_040, qd_068) rồi promote như trên.
5. **22–25/11 – đợt 2:** chọn thêm 5–10 văn bản mới từ `dataset/hf_quyet_dinh` (loại văn bản thiếu quốc hiệu/số hiệu/chữ ký), `npm run samples:prepare -- --batch dataset/selection/<đợt 2>.json`, tạo draft bằng `--save-draft true`, người dùng duyệt 3–4 mẫu/ngày → mục tiêu 15–20 gold. Chỉ sửa prompt/normalizer theo lỗi lặp lại ở dev/train.
6. **26–27/11:** train thử LoRA trên Colab (Qwen 1.5B–3B); test luôn là gold người duyệt.
7. **28–29/11:** người dùng CHƯA trả lời có cần trang demo hay chỉ chạy bằng lệnh → cần hỏi trước khi làm. Viết README + báo cáo.

Việc nhỏ còn treo (không gấp):
- `.git/config` có `credential.credentialStore = cache` (lỗi trên Windows) → người dùng có thể chạy `git config --unset credential.credentialStore`; tới lúc đó Claude push bằng `git -c credential.credentialStore=wincredman push`.
- Bộ chấm chưa chấm `data_tables` (bảng) và `signed_status`/`supersedes` → cân nhắc thêm khi có gold có bảng (qd_066, qd_082).
- Gold cũ có `source.input_file` kiểu cũ ("input_03.txt"), metadata mới là "source.txt" – không ảnh hưởng điểm.
- 2 dòng config Codex bị bỏ qua (`disable_response_storage`, `network_access`) – Codex 0.169 báo "ignored", vô hại.
- Google Docs: phiên Claude Code KHÔNG có công cụ Google Docs → người dùng dán tay đoạn báo cáo.

## 4. Kiểm tra cuối phiên

- `npm test`: **86/86 đạt** (cuối phiên 19/11 lần 4); `git diff --check` sạch.
- Gold: 6 (qd_010, qd_014, qd_021, qd_030, qd_066, qd_067). Draft chờ duyệt: 10. Điểm dev mới nhất (gpt-6.1-sol): qd_021 1.0, qd_067 1.0, qd_014 1.0. Test: chưa có điểm (chưa có gold). Chi tiết: `reports/scoreboard.md` (`runs/` không lên git).

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

## Ý tưởng để sau (người dùng chốt 19/11: CHƯA làm trong đợt này, giữ kế hoạch ban đầu)

Mở rộng đầu vào: nhận file Word đã có nội dung nhưng chưa đúng thể thức hành chính (Nghị định 30/2020/NĐ-CP) và trả về bản chuẩn.
- Bước 0 mới: đọc DOCX (nội dung + định dạng hiện có), sau đó dùng lại pipeline sẵn có (AI → JSON → template → DOCX chuẩn).
- Lỗi trình bày (khổ giấy, lề, font, cỡ chữ, quốc hiệu, số ký hiệu, địa danh/ngày, ký thay...): code kiểm tra và sửa theo luật cố định, không dùng AI.
- Lỗi nội dung/câu chữ (viết hoa, căn cứ...): AI chỉ gợi ý dạng track changes, người quyết định; không tự sửa dữ kiện.
- Dữ liệu chấm: tự làm hỏng các DOCX chuẩn có sẵn để tạo cặp "hỏng → chuẩn" có nhãn lỗi.
