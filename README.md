# TexMind AI R1

Khung thử nghiệm cho luồng chuyển nội dung thô thành tài liệu theo template.

## Trạng thái hiện tại

- Đã thu thập 100 văn bản Quyết định và lọc 10 mẫu ứng viên.
- Đã chọn `qd_066` làm mẫu đầu tiên.
- Đã xác minh cặp `input_01.txt` → `output_01.docx` theo template `TM-QD-001`.
- Đã tạo sáu mẫu chuẩn `structured_01.json` đến `structured_06.json` theo JSON Schema phiên bản 1.0.
- Schema hỗ trợ khoản lồng nhau, tham chiếu phụ lục, điều không đánh số khoản, chữ ký không có dòng ủy quyền và văn bản chưa chọn template.
- Mẫu `qd_014` bổ sung trường hợp văn bản không có khối nơi nhận; `recipients` được giữ là mảng rỗng thay vì bịa dữ liệu.
- Dữ liệu có cơ chế giữ nguyên và cảnh báo lỗi/mâu thuẫn từ nguồn thay vì âm thầm sửa.
- Đã chạy thử trích xuất AI đầu tiên trên `qd_067` bằng `oc/deepseek-v4.1-flash-free`.
- Điểm nghiêm ngặt trước chuẩn hóa là 82,14%; nội dung điều, căn cứ, khoản/điểm và nơi nhận đạt 100%.
- Sau hai quy tắc chuẩn hóa xác định trước (`sample_id` từ ngữ cảnh và nhãn `Phụ lục N`), điểm đạt 100%.
- Phản hồi thô không được dùng trực tiếp: lần thử cần sửa cú pháp JSON một lần và loại một trường trùng lặp trước khi qua schema.
- Đã tích hợp hai quy tắc trên vào pipeline, lưu riêng bản thô và nhật ký hậu xử lý.
- Lần chạy hồi quy mới trên `qd_067` đạt 100% ngay từ bản thô, hợp lệ theo schema và không cần hậu xử lý thay đổi dữ liệu.
- Đã chạy `qd_014` trên Colab bằng `Qwen/Qwen2.5-3B-Instruct` 4-bit và lưu riêng bản thô, bản chuẩn hóa cùng báo cáo.
- Bộ chấm điểm 2.0 giữ riêng điểm nghiêm ngặt và điểm dung sai, căn khoản theo vị trí cấu trúc và cảnh báo sai số khoản/căn cứ bị rút ngắn.
- Với kết quả chạy lại `qd_014`, điểm nghiêm ngặt là 61,33%, điểm dung sai là 75,79%; 28/29 khoản khớp tuyệt đối và 29/29 khoản khớp theo dung sai.
- Prompt đã được siết để giữ nguyên tiêu đề điều, trích toàn bộ từng căn cứ pháp lý và không tự đánh số đoạn không có ký hiệu trong nguồn.
- Lần chạy `qd_014` mới bằng `oc/deepseek-v4.1-flash-free` trích đúng 6/6 tiêu đề, 4/4 căn cứ và 29/29 khoản. Bản thô có 2 lỗi schema do đặt `quality` sai vị trí; sau ba thay đổi hậu xử lý xác định được, kết quả hợp lệ và đạt 100% ở cả điểm nghiêm ngặt lẫn điểm dung sai.
- Có lệnh `normalize:saved` để áp dụng lại normalizer cho JSON thô đã lưu mà không tiêu tốn thêm hạn mức API.
- Benchmark chưa thấy trước `qd_021` bằng DeepSeek hợp lệ schema ngay từ bản thô và không cần hậu xử lý. Trường đơn, 3/3 tiêu đề, 10/10 căn cứ, 3/3 khoản và tệp đính kèm đều khớp tuyệt đối; 12/12 nơi nhận khớp theo dung sai, trong đó 10 mục chỉ khác dấu câu. Điểm nghiêm ngặt đạt 86,11% và điểm dung sai đạt 100%.
- Khi đối chiếu trực tiếp Điều 1, đã sửa gold `structured_02.json` để bổ sung “Quy định ban hành kèm theo Quyết định” là tệp đính kèm không có nội dung trong nguồn.
- Đã chọn `qd_030` làm mẫu thứ năm vì có cấu trúc công bố kết quả rà soát, khoản lồng nhau và bốn danh mục được tham chiếu nhưng không kèm nội dung đầy đủ.
- Bản nháp DeepSeek của `qd_030` trích đúng 4/4 tiêu đề điều, 5/5 căn cứ pháp lý và 14/14 khoản; điểm nghiêm ngặt và dung sai đều đạt 83,33%. Sai sót nội dung duy nhất là bỏ sót 4/4 danh mục đính kèm được nguồn nhắc tới.
- Sau khi đối chiếu thủ công với nguồn, `structured_05.json` đã được sửa metadata nguồn và bổ sung bốn attachment với `included_in_source=false`. Prompt cũng đã thêm quy tắc xử lý câu “được lập thành N danh mục”.
- Benchmark `qd_010` bằng DeepSeek hợp lệ schema ngay từ bản thô và không cần hậu xử lý. Model trích đúng trường đơn, 3/3 tiêu đề điều, 8/8 căn cứ và 19/19 nơi nhận; điểm nghiêm ngặt và dung sai đều đạt 83,33%.
- Sai khác `qd_010` nằm ở cấu trúc: model lặp ba tiêu đề điều thành ba clause dư và làm lệch vị trí đoạn trách nhiệm thi hành không đánh số. Gold `structured_06.json` giữ đoạn này thành clause `number=null` của Điều 3, không tự tạo Điều 4; prompt đã được bổ sung quy tắc tương ứng.
- Evaluator hiện cảnh báo có cấu trúc khi tổng số clause lệch và khi heading bị lặp nguyên văn thành clause; báo cáo `qd_010` chỉ rõ 1 clause chuẩn so với 4 clause dự đoán và 3 heading bị lặp.
- Đã xây pipeline `render:docx`: Node kiểm tra JSON Schema và độ tương thích template trước khi gọi renderer Python; renderer dùng DOCX tham chiếu làm nền để giữ styles/theme/numbering rồi dựng header, tiêu đề, căn cứ, điều khoản, bảng dữ liệu, nơi nhận và chữ ký.
- Đã sinh lại `qd_066` từ `structured_01.json` thành `outputs/qd_066.rendered.docx`. Bản cuối có đúng 3 trang như reference, 60/60 nội dung kiểm tra xuất hiện, các package part preserve-only giữ nguyên hash và toàn bộ trang đã qua render QA không cắt chữ/chồng lấn.
- Đã xác minh template `TM-QD-002` cho Quyết định hành chính không có bảng dữ liệu; template từ chối JSON có `data_tables` hoặc `related_table_ids`.
- Đã render mẫu vàng `qd_021` thành `outputs/qd_021.rendered.docx`: bản cuối 2 trang, 40/40 nội dung kiểm tra xuất hiện, không có bảng dữ liệu, 8 package part preserve-only giữ nguyên hash và toàn bộ trang đã qua render QA không cắt chữ/chồng lấn.
- Đã chạy hồi quy `TM-QD-002` với `qd_014`: renderer xuất đủ khoản lồng nhau, không tự tạo nhãn “Nơi nhận” khi `recipients=[]`; DOCX cuối 4 trang, 51/51 nội dung kiểm tra xuất hiện và 8 package part preserve-only giữ nguyên hash.
- Đã chạy hồi quy `TM-QD-002` với `qd_067`: DOCX cuối 3 trang, đủ 61/61 nội dung và 12/12 tham chiếu Phụ lục 2–13 xuất hiện đúng một lần; không bịa nội dung phụ lục, giữ nguyên 8 package part preserve-only và đã sửa va chạm tiêu đề bằng tỷ lệ cột 7/9 cm.
- `render:docx` hiện tự chọn template: ưu tiên `template.id` đã khai báo; nếu chưa khai báo thì chọn `TM-QD-001` khi có `data_tables` hoặc `related_table_ids`, ngược lại chọn `TM-QD-002`. Tham số `--template` vẫn cho phép ghi đè thủ công.
- Đã có lệnh `pipeline:e2e` nối AI trích xuất → lưu raw → chuẩn hóa và kiểm tra schema → tự chọn template → render DOCX → ghi manifest. Chế độ `--raw` chạy lại từ JSON thô đã lưu mà không gọi API.
- Đã chạy hồi quy đầu-cuối `qd_067` từ raw đã lưu: JSON chuẩn hóa không còn lỗi schema, tự chọn `TM-QD-002` và tạo DOCX thành công.
- Đã thay DeepSeek client bằng OpenAI-compatible Responses API tại `api.xingchiapi.com/v1`, model mặc định `gpt-6.1-sol`; request dùng JSON mode, `store=false` và xử lý riêng HTTP error, incomplete, refusal.
- Provider xingchi trả HTTP 200 cho `GET /v1/models` nhưng từ chối `POST /v1/responses` gọi trực tiếp từ script/SDK (chỉ chấp nhận coding client như Codex, Claude Code, Cursor). Vì vậy transport mặc định là `OPENAI_TRANSPORT=codex_cli`: extractor gọi `codex exec` không tương tác thay vì `fetch`.
- Client Codex CLI chạy `--ephemeral`, `--sandbox read-only`, `--output-schema`, `--output-last-message`, trong thư mục làm việc rỗng; token chỉ truyền qua biến môi trường của tiến trình con (`env_key`), không ghi vào `config.toml`; có timeout, ghi file chẩn đoán đã che token và tự xóa thư mục tạm `texmind-codex-*` kể cả khi bị Ctrl+C.
- Kiểm thử tại thời điểm chuyển provider: 47/47; số kiểm thử hiện tại xem trong báo cáo tiến độ mới nhất.
- 19/11/2026: đường Codex CLI chạy thật được. Smoke test đạt; pipeline `qd_067` qua `gpt-6.1-sol` cho raw/normalized 0 lỗi schema, tự chọn `TM-QD-002`, DOCX tạo thành công, manifest `completed`; điểm so gold strict 1.0 / tolerant 1.0 (lưu ý: `qd_067` đã được xem khi viết prompt nên điểm lạc quan). Để chạy được đã phải chuyển schema sang dạng strict cho provider (xem mục "Vì sao dùng `codex_cli`").
- Đã sắp lại dữ liệu theo `dataset/samples/<mã>/` + `dataset/splits/`, thêm chế độ `--sample` ghi vào `runs/<run_id>/` có chấm điểm tự động và lệnh `npm run scoreboard`.
- 19/11/2026 (lần 2): chạy thật qd_014 và qd_021; bộ chấm 2.1 (bắt lỗi dòng ngày thiếu địa danh). Điểm gpt-6.1-sol: qd_067 1.0, qd_014 1.0, qd_021 0.8333 (lệch quy ước tham chiếu phụ lục). 10 mẫu mới có `draft.json` chờ người duyệt (đợt `dataset/selection/batch_2026-11-19.json`). Kiểm thử: 78/78.

## Bước tiếp theo

1. Chọn mẫu thứ bảy có cấu trúc khác và tiếp tục quy trình AI nháp → đối chiếu nguồn → duyệt gold.
2. So sánh provider OpenAI-compatible và Colab trên cùng bộ chấm điểm 2.0 khi cần quyết định mô hình chạy hàng loạt.
3. Chạy `pipeline:e2e` bằng `gpt-6.1-sol` trên mẫu thứ bảy chưa thấy trước, sau đó đối chiếu với gold do người duyệt.
4. Mở rộng lên 20–50 mẫu gold trước khi cân nhắc LoRA/fine-tuning.

Do API miễn phí có thể hết hạn mức, notebook dự phòng cho benchmark `qd_021` có thể được tạo lại bằng:

```powershell
npm run build:colab:qd021
```

Mở `notebooks/TexMind_qd_021_Colab.ipynb` bằng Google Colab, bật GPU T4 và tải lên `input_02.txt`, `structured_02.json`, `texmind-document.schema.json` khi notebook yêu cầu. Gold chỉ được dùng để chấm sau khi model sinh prediction.

## Thử trích xuất bằng provider OpenAI-compatible

```powershell
Copy-Item .env.example .env
# Điền OPENAI_API_KEY trong .env, không commit file này.
npm run smoke:codex   # kiểm tra nhanh đường gọi Codex CLI với schema {"ok": true}
npm run extract:ai
npm run evaluate:ai
```

Biến môi trường:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `OPENAI_API_KEY` | (bắt buộc) | Khóa provider, chỉ đặt trong `.env`. |
| `OPENAI_BASE_URL` | `https://api.xingchiapi.com/v1` | Endpoint OpenAI-compatible. |
| `OPENAI_MODEL` | `gpt-6.1-sol` | Model trích xuất. |
| `OPENAI_ACTOR_AUTHORIZATION` | `local-image-extension` | Giá trị header `x-openai-actor-authorization`. |
| `OPENAI_TRANSPORT` | `codex_cli` | `codex_cli` hoặc `responses_api`. |
| `OPENAI_CODEX_COMMAND` | tự tìm | Đường dẫn Codex CLI. Nếu không đặt: tìm `codex` trong `PATH`, rồi `codex.exe` đi kèm extension VS Code `openai.chatgpt-*` bản mới nhất. |
| `OPENAI_CODEX_TIMEOUT_MS` | `600000` | Thời gian tối đa cho một lần `codex exec`. |
| `OPENAI_CODEX_ATTEMPTS` | `3` | Số lần extractor gọi lại cả lệnh `codex exec` khi gặp lỗi tạm thời của provider (`Upstream request failed`, `Invalid schema`, `stream disconnected`...). Không gọi lại khi quá thời gian. |
| `OPENAI_CODEX_STREAM_MAX_RETRIES` | (mặc định của Codex: 5) | Số lần Codex tự thử lại khi luồng bị ngắt. Lỗi 400 (vd. schema sai) cũng bị thử lại nên đặt `0`–`1` khi gỡ lỗi để đỡ chờ. |
| `TEXMIND_PYTHON` | tự tìm | Python cho renderer DOCX. Nếu không đặt: dùng `.venv` của dự án, rồi `python`/`python3` trong `PATH`. |

### Vì sao dùng `codex_cli`

- `responses_api`: gọi thẳng `POST /responses` bằng `fetch` (JSON mode, `store=false`, xử lý HTTP error/incomplete/refusal). Chỉ dùng được khi provider cho phép SDK/script gọi trực tiếp.
- `codex_cli`: gói xingchi hiện tại chỉ chấp nhận coding client, nên dự án gọi `codex exec` qua Codex CLI với provider `wire_api = "responses"` và `disable_response_storage = true`. Đây là transport mặc định.

Khi dùng `codex_cli`, mỗi lần gọi tạo một `CODEX_HOME` tạm (`texmind-codex-*`) chỉ chứa cấu hình provider, không chứa token; thư mục bị xóa sau khi chạy. stderr của Codex được in trực tiếp ra terminal và lưu bản đã che token tại `<output>.codex-diagnostics.json`.

Provider kiểm tra `--output-schema` theo chế độ Structured Outputs nghiêm ngặt: mọi khóa trong `properties` phải nằm trong `required`. Vì vậy extractor tạo bản schema riêng `<output>.codex-output-schema.json` (khóa tùy chọn như `children`, `attachments` vẫn bắt buộc nhưng được phép `null`; bỏ `minLength`; kiểu "có thể null" viết bằng `anyOf: [{...}, {"type": "null"}]` vì provider từ chối dạng `"type": ["string", "null"]`). Sau khi model trả về, các khóa tùy chọn có giá trị `null` bị bỏ đi và kết quả vẫn được kiểm tra bằng schema gốc `schemas/texmind-document.schema.json`. Code nằm ở `src/strict_output_schema.mjs`.

Provider không ổn định với schema lớn: ngày 19/11/2026 gửi cùng một schema 4 lần thì 3 lần được nhận, 1 lần bị từ chối (các máy chủ phía sau kiểm tra schema khác nhau). Vì vậy schema strict còn tự thêm `type` cho nút `enum`/`const`, và extractor gọi lại tối đa `OPENAI_CODEX_ATTEMPTS` lần.

Ghi chú: Codex CLI 0.169 báo bỏ qua `disable_response_storage` và `network_access` trong config (không còn hỗ trợ); không ảnh hưởng việc chạy.

### Cài Python cho renderer DOCX (Windows)

```powershell
winget install --id Python.Python.3.12 -e --scope user
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m venv .venv
.\.venv\Scripts\python.exe -m pip install python-docx
```

`.venv/` đã nằm trong `.gitignore`; renderer tự dùng `.venv` nếu có.

Pipeline lấy `sample_id` từ tên output (hoặc đối số `--sample-id`) và chuẩn hóa tham chiếu phụ lục đánh số thành `Phụ lục N`. Kết quả dự đoán, bản AI thô và nhật ký hậu xử lý được lưu riêng trong `work/ai_extraction/`. Script không ghi hoặc in khóa API.

## Pipeline đầu-cuối

Chạy từ văn bản nguồn qua provider OpenAI-compatible đến DOCX:

```powershell
npm run pipeline:e2e -- --input dataset/van_ban_hanh_chinh/input_03.txt --sample-id qd_067
```

Pipeline chỉ render khi JSON sau chuẩn hóa hợp lệ theo schema. Các tệp `raw`, `normalized`, `postprocess` và manifest được lưu mặc định trong `work/end_to_end/<sample_id>/`; DOCX được lưu trong `outputs/`.

Chạy lại từ raw đã lưu mà không gọi API:

```powershell
npm run pipeline:e2e -- --raw work/ai_extraction/qd_067.predicted.raw.json --input dataset/van_ban_hanh_chinh/input_03.txt --sample-id qd_067
```

Xem trước kế hoạch và đường dẫn đầu ra mà không chạy AI hoặc render:

```powershell
npm run pipeline:e2e -- --input dataset/van_ban_hanh_chinh/input_03.txt --sample-id qd_067 --dry-run true
```

### Chạy theo mẫu (`--sample`) và thư mục `runs/`

Mỗi văn bản nằm trong `dataset/samples/<mã>/` (`source.txt`, `gold.json`, `metadata.json`, `REVIEW.md`); tập train/dev/test ở `dataset/splits/`. Sao chép lại từ thư mục cũ (không ghi đè, chạy nhiều lần được): `npm run samples:migrate`.

```powershell
npm run pipeline:e2e -- --sample qd_067                     # gọi AI thật
npm run pipeline:e2e -- --sample qd_067 --raw <raw.json>    # chạy lại từ raw đã lưu (nhãn model: replay)
npm run pipeline:e2e -- --sample qd_067 --dry-run true      # chỉ xem kế hoạch
```

Mỗi lần chạy tạo `runs/<YYYY-MM-DD>_<HHMM>_<model>_<mã>/` gồm `raw.json`, `normalized.json`, `postprocess.json`, `rendered.docx`, `pipeline.json` và `score.json` (khi mẫu có `gold.json`, stage `evaluate` chấm điểm sau render). Model lấy theo thứ tự `--model` → `OPENAI_MODEL` → dòng `OPENAI_MODEL` trong `.env` → `gpt-6.1-sol`. `pipeline.json` ghi `sample_id`, `run_id`, `split`, điểm `strict_evaluation.overall_score` / `tolerant_evaluation.overall_score` và ghi chú rằng output AI không phải gold. `runs/` nằm trong `.gitignore`.

Không truyền `--sample` thì pipeline giữ hành vi cũ (`work/end_to_end/<mã>/` và `outputs/`).

### Bảng điểm

```powershell
npm run scoreboard                    # dùng score.json đã có
npm run scoreboard -- --rescore true  # chấm lại mọi lần chạy bằng bộ chấm hiện tại (bản cũ lưu ở score.previous.json)
```

Quét `runs/*/pipeline.json` + `score.json`, ghi `reports/scoreboard.md`: bảng theo từng lần chạy (có cột phiên bản bộ chấm) và điểm trung bình theo model trên tập test (không tính replay).

Bộ chấm 2.1 (19/11/2026) so thêm `header.issue_date_text`. Lý do: AI hay bỏ địa danh ở dòng ngày ("ngày 5 tháng 10 năm 2023" thay vì "Bình Thạnh, ngày 5 tháng 10 năm 2023"), DOCX in thiếu địa danh mà bản 2.0 không phát hiện. Bước chuẩn hóa nay khôi phục dòng ngày đầy đủ khi nguồn có đúng dòng đó.

### Làm gold mới: nháp AI → người duyệt → promote

1. Chọn văn bản và ghi lý do vào `dataset/selection/<đợt>.json`, rồi tạo thư mục mẫu (chỉ sao chép, không ghi đè):

   ```powershell
   npm run samples:prepare -- --batch dataset/selection/batch_2026-11-19.json
   ```

2. Cho AI làm bản nháp `draft.json` (không bao giờ ghi `gold.json`; từ chối nếu mẫu đã có draft hoặc gold):

   ```powershell
   npm run pipeline:e2e -- --sample qd_042 --save-draft true
   ```

3. Người duyệt mở `source.txt`, sửa trực tiếp `draft.json`, tick hết checklist trong `REVIEW.md` (DOCX nháp ở `runs/<run_id>/rendered.docx` để xem nhanh).
4. Chỉ khi người dùng ra lệnh, promote (không có `--confirm true` thì chỉ xem trước):

   ```powershell
   npm run samples:promote -- --sample qd_042 --reviewer "Tên người duyệt"
   npm run samples:promote -- --sample qd_042 --reviewer "Tên người duyệt" --confirm true
   ```

   Script kiểm tra: có `draft.json`, chưa có `gold.json`, draft hợp lệ schema, `sample_id` khớp, checklist đã tick hết. Sau đó đổi `draft.json` → `gold.json`, ghi ngày duyệt vào `REVIEW.md` và `metadata.json`.
5. Thêm mã mẫu vào `dataset/splits/*.txt` theo đề xuất trong file đợt chọn.

## Render DOCX và chọn template tự động

Không truyền `--template` để bộ chọn dùng cấu trúc JSON:

```powershell
npm run render:docx -- --input dataset/van_ban_hanh_chinh/structured_03.json
```

Quy tắc hiện tại:

- Có `data_tables` hoặc `articles[].related_table_ids`: chọn `TM-QD-001`.
- Không có bảng hoặc tham chiếu bảng: chọn `TM-QD-002`.
- Nếu JSON đã có `template.id`, ưu tiên template đó và vẫn kiểm tra tương thích trước khi render.
- Có thể truyền `--template templates/TM-QD-002.json` để ghi đè thủ công.

Chấm `qd_014` bằng bộ chấm điểm 2.0 và tạo báo cáo sai khác chi tiết:

```powershell
npm run evaluate:ai -- --expected dataset/van_ban_hanh_chinh/structured_04.json --actual outputs/qd_014.rerun.normalized.json --report outputs/qd_014.rerun.scoring-v2.json
npm run analyze:diff
```

## Thu thập mẫu từ Hugging Face

Lấy 100 văn bản loại Quyết định mà không tải toàn bộ dataset:

```powershell
node .\src\collect_hf_samples.mjs --count 100 --type "Quyết định"
```

Kết quả được lưu trong `dataset/hf_quyet_dinh/`. Các mẫu tải về mặc định có trạng thái `unreviewed` và chưa được coi là dữ liệu gold.

## Cấu trúc

```text
dataset/samples/<mã>/  Mỗi mẫu: source.txt, metadata.json, REVIEW.md và gold.json (người duyệt) hoặc draft.json (nháp AI chờ duyệt)
dataset/splits/        train.txt, dev.txt, test.txt
dataset/selection/     Các đợt chọn văn bản mới kèm lý do chọn
dataset/               Dữ liệu cũ (van_ban_hanh_chinh/, hf_quyet_dinh/) giữ nguyên
schemas/               JSON Schema cho dữ liệu trung gian
templates/             Đặc tả template
src/                   Mã nguồn
tests/                 Kiểm thử
runs/                  Kết quả từng lần chạy --sample (gitignore)
reports/               Bảng điểm (npm run scoreboard)
outputs/               File được tạo ra để kiểm tra
```
