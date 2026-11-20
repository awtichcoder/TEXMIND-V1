// Sinh notebooks/TexMind_LoRA.ipynb (train LoRA Qwen2.5 trên Colab T4) và, nếu cần, gói zip an toàn để tải lên Colab.
//
//   npm run build:colab:lora              # chỉ sinh notebook
//   npm run build:colab:lora -- --bundle  # thêm work/texmind_colab_bundle.zip (KHÔNG chứa .env)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const NOTEBOOK_PATH = join("notebooks", "TexMind_LoRA.ipynb");
export const REPO_URL = "https://github.com/awtichcoder/TEXMIND-V1.git";
export const REPO_BRANCH = "feature-texmind-codex-samples";

// Danh sách file đưa vào gói zip: chỉ mã nguồn + dữ liệu cần thiết. Tuyệt đối không có .env.
export const BUNDLE_INCLUDE = ["package.json", "src", "schemas", "templates", "dataset/samples", "dataset/splits", "dataset/silver", "notebooks/data"];

const lines = (source) => source.split("\n").map((line, index, all) => (index === all.length - 1 ? line : `${line}\n`));
const md = (source) => ({ cell_type: "markdown", metadata: {}, source: lines(source) });
const code = (source) => ({ cell_type: "code", execution_count: null, metadata: {}, outputs: [], source: lines(source) });

export function buildNotebook() {
  const cells = [
    md(String.raw`# TexMind – Train thử LoRA Qwen2.5 trên Colab

**Mục tiêu:** dạy một mô hình nhỏ (Qwen2.5 1.5B hoặc 3B) cách đọc văn bản Quyết định và trả về JSON TexMind, rồi chấm nó trên 5 mẫu **test** bằng **đúng bộ chấm của pipeline**.

**LoRA là gì?** Thay vì sửa toàn bộ hàng tỉ tham số của mô hình (rất tốn GPU), LoRA chỉ thêm vài "miếng vá" nhỏ (vài triệu tham số) và chỉ train phần vá đó. Nhờ vậy vừa với GPU T4 miễn phí của Colab.

**4-bit là gì?** Mô hình được nén mỗi tham số còn 4 bit để chiếm ít bộ nhớ GPU hơn (độ chính xác giảm rất ít).

**Dữ liệu (đọc kỹ):**
- Train = gold thuộc split **train** + dữ liệu **silver** (do gpt-6.1-sol tạo, **chưa ai duyệt**). Script xuất dữ liệu tự chặn mọi mẫu dev/test.
- Test = 5 văn bản mới (qd_042, qd_096, qd_035, qd_022, qd_072). Gold của chúng do **Claude (AI) duyệt, chưa có người duyệt** → điểm chỉ mang tính tham khảo.
- Gold test được làm từ output của gpt-6.1-sol, nên điểm của LoRA đo "giống gpt-6.1-sol đã sửa đến đâu", không phải đo đúng/sai tuyệt đối.

**Thời gian dự kiến trên T4:** cài thư viện ~5 phút, train ~10–30 phút (tùy số mẫu), sinh 5 dự đoán ~15–25 phút.

Chạy lần lượt từng ô từ trên xuống (Shift + Enter).`),
    md(String.raw`## Bước 1 – Bật GPU và kiểm tra

Vào menu **Runtime → Change runtime type → T4 GPU**, bấm Save. Ô dưới in thông tin GPU; nếu báo lỗi nghĩa là chưa bật GPU.`),
    code(String.raw`!nvidia-smi`),
    md(String.raw`## Bước 2 – Cài thư viện

- **unsloth**: thư viện giúp train LoRA nhanh và tiết kiệm bộ nhớ trên GPU yếu như T4 (tự cài kèm transformers, peft, trl, bitsandbytes).
- Ô này mất vài phút. Nếu Colab yêu cầu **Restart session** thì bấm restart rồi chạy tiếp từ Bước 3.`),
    code(String.raw`%%capture
!pip install unsloth`),
    md(String.raw`## Bước 3 – Lấy mã nguồn và dữ liệu dự án

Cần thư mục dự án để: xuất dữ liệu train (có kiểm tra chống rò rỉ) và chấm điểm bằng bộ chấm của pipeline (viết bằng Node.js).

- **Cách A (mặc định):** tải từ GitHub. Chỉ đúng khi các thay đổi mới nhất **đã được push** lên nhánh dưới đây.
- **Cách B:** đặt ` + "`USE_UPLOAD = True`" + ` rồi tải lên tệp ` + "`texmind_colab_bundle.zip`" + ` (tạo trên máy bằng ` + "`npm run build:colab:lora -- --bundle`" + `). Gói này **không chứa .env/API key**. Đừng tự nén cả thư mục dự án vì sẽ lộ ` + "`.env`" + `.`),
    code(String.raw`import os, subprocess

USE_UPLOAD = False
REPO_URL = "${REPO_URL}"
BRANCH = "${REPO_BRANCH}"
PROJECT = "/content/texmind"

if USE_UPLOAD:
    from google.colab import files
    uploaded = files.upload()  # chọn texmind_colab_bundle.zip
    name = next(iter(uploaded))
    os.makedirs(PROJECT, exist_ok=True)
    subprocess.run(["unzip", "-o", "-q", name, "-d", PROJECT], check=True)
elif not os.path.exists(PROJECT):
    subprocess.run(["git", "clone", "--depth", "1", "--branch", BRANCH, REPO_URL, PROJECT], check=True)

os.chdir(PROJECT)
print("Thư mục dự án:", os.getcwd())
print("Có .env không? (phải là False):", os.path.exists(".env"))`),
    md(String.raw`### Kiểm tra Node.js

Bộ chấm điểm của pipeline viết bằng Node.js. Colab thường có sẵn Node; nếu không có thì ô này tự cài.`),
    code(String.raw`import shutil, subprocess
if shutil.which("node") is None:
    subprocess.run("apt-get -qq update && apt-get -qq install -y nodejs", shell=True, check=True)
print(subprocess.run(["node", "--version"], capture_output=True, text=True).stdout)`),
    md(String.raw`## Bước 4 – Xuất dữ liệu train (có chặn rò rỉ dev/test)

Lệnh này chạy đúng script của dự án: gom gold split **train** + **silver** thành ` + "`notebooks/data/train.jsonl`" + ` và văn bản nguồn của 5 mẫu test thành ` + "`notebooks/data/test_inputs.jsonl`" + ` (**không có gold**). Nếu phát hiện mẫu dev/test lọt vào train, script dừng với lỗi "RÒ RỈ".

Mỗi dòng train là một cuộc hội thoại 3 lượt: **system** (luật trích xuất ngắn) → **user** (văn bản nguồn) → **assistant** (JSON đáp án).`),
    code(String.raw`!node src/export_training_data.mjs

import json
def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]

train_rows = read_jsonl("notebooks/data/train.jsonl")
test_inputs = read_jsonl("notebooks/data/test_inputs.jsonl")
from collections import Counter
print("Số mẫu train:", len(train_rows), Counter(r["origin"] for r in train_rows))
print("Mẫu test (chỉ văn bản nguồn):", [t["sample_id"] for t in test_inputs])
assert all(len(t["messages"]) == 2 for t in test_inputs), "test_inputs không được chứa đáp án"`),
    md(String.raw`## Bước 5 – Nạp mô hình 4-bit

- ` + "`MODEL_NAME`" + `: mặc định Qwen2.5 **1.5B** (an toàn cho T4). Muốn thử **3B** thì đổi sang dòng có chữ 3B (chậm hơn, dễ hết bộ nhớ hơn).
- ` + "`MAX_SEQ_LEN`" + `: độ dài tối đa (tính bằng token) của một mẫu = văn bản nguồn + JSON đáp án. JSON TexMind khá dài nên đặt 8192.`),
    code(String.raw`from unsloth import FastLanguageModel

MODEL_NAME = "unsloth/Qwen2.5-1.5B-Instruct-bnb-4bit"
# MODEL_NAME = "unsloth/Qwen2.5-3B-Instruct-bnb-4bit"   # thử 3B: bỏ dấu # ở đầu dòng này
MAX_SEQ_LEN = 8192

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LEN,
    load_in_4bit=True,   # nén 4-bit cho vừa GPU T4
    dtype=None,          # để unsloth tự chọn (T4 dùng float16)
)
print("Đã nạp:", MODEL_NAME)`),
    md(String.raw`## Bước 6 – Gắn LoRA

- ` + "`r=16`" + `: "độ rộng" của miếng vá LoRA. Lớn hơn = học được nhiều hơn nhưng tốn bộ nhớ hơn.
- ` + "`target_modules`" + `: các lớp bên trong mô hình được gắn miếng vá (các lớp attention và MLP).
- ` + "`use_gradient_checkpointing`" + `: tiết kiệm bộ nhớ bằng cách tính lại một phần thay vì lưu hết.`),
    code(String.raw`model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    lora_alpha=16,
    lora_dropout=0,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)
model.print_trainable_parameters()  # chỉ một phần rất nhỏ tham số được train`),
    md(String.raw`## Bước 7 – Định dạng dữ liệu theo khuôn hội thoại của Qwen

Qwen cần hội thoại ở dạng chữ có các thẻ đặc biệt (` + "`<|im_start|>`" + `...). Hàm ` + "`apply_chat_template`" + ` làm việc này. Sau đó đếm số token mỗi mẫu và **bỏ mẫu quá dài** (dài hơn ` + "`MAX_SEQ_LEN`" + `) để tránh lỗi hết bộ nhớ.`),
    code(String.raw`from datasets import Dataset

texts, lengths, dropped = [], [], []
for row in train_rows:
    text = tokenizer.apply_chat_template(row["messages"], tokenize=False)
    n_tokens = len(tokenizer(text).input_ids)
    if n_tokens > MAX_SEQ_LEN:
        dropped.append((row["sample_id"], n_tokens))
        continue
    texts.append(text)
    lengths.append(n_tokens)

dataset = Dataset.from_dict({"text": texts})
print("Dùng để train:", len(texts), "mẫu; dài nhất", max(lengths), "token; trung bình", sum(lengths) // len(lengths))
print("Bỏ vì quá dài:", dropped)`),
    md(String.raw`## Bước 8 – (Tùy chọn) Thử mô hình gốc trước khi train

Đặt ` + "`RUN_BASELINE = True`" + ` để xem mô hình **chưa train** làm được gì trên 5 mẫu test (để so sánh với sau khi train). Mất thêm ~15–25 phút nên mặc định tắt. Hàm ` + "`generate_all`" + ` cũng được dùng lại ở Bước 10.`),
    code(String.raw`import json, time

MAX_NEW_TOKENS = 6144   # độ dài tối đa của JSON mô hình được sinh ra

def generate_all(model, tokenizer, items, out_path):
    FastLanguageModel.for_inference(model)   # chuyển sang chế độ sinh (nhanh hơn)
    with open(out_path, "w", encoding="utf-8") as f:
        for item in items:
            start = time.time()
            prompt = tokenizer.apply_chat_template(item["messages"], tokenize=False, add_generation_prompt=True)
            inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
            output_ids = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS, do_sample=False, use_cache=True)
            text = tokenizer.decode(output_ids[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
            f.write(json.dumps({"sample_id": item["sample_id"], "output": text}, ensure_ascii=False) + "\n")
            print(item["sample_id"], "xong sau", round(time.time() - start), "giây,", len(text), "ký tự")

RUN_BASELINE = False
if RUN_BASELINE:
    generate_all(model, tokenizer, test_inputs, "predictions_baseline.jsonl")
    FastLanguageModel.for_training(model)    # quay lại chế độ train`),
    md(String.raw`## Bước 9 – Train LoRA

- ` + "`train_on_responses_only`" + `: chỉ tính lỗi trên phần **JSON đáp án** (assistant), không bắt mô hình học thuộc văn bản nguồn.
- ` + "`num_train_epochs=3`" + `: đọc toàn bộ dữ liệu 3 lần. Dữ liệu ít nên không nên để quá cao (dễ "học vẹt").
- ` + "`per_device_train_batch_size=1`" + ` + ` + "`gradient_accumulation_steps=4`" + `: mỗi lần chỉ nạp 1 mẫu cho đỡ tốn bộ nhớ, cộng dồn 4 mẫu rồi mới cập nhật.
- Theo dõi cột **loss** khi chạy: loss giảm dần là mô hình đang học.`),
    code(String.raw`from trl import SFTTrainer, SFTConfig
from unsloth import is_bfloat16_supported
from unsloth.chat_templates import train_on_responses_only

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LEN,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        warmup_steps=5,
        lr_scheduler_type="linear",
        weight_decay=0.01,
        optim="adamw_8bit",
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=1,
        seed=3407,
        output_dir="lora_outputs",
        report_to="none",
    ),
)
trainer = train_on_responses_only(
    trainer,
    instruction_part="<|im_start|>user\n",
    response_part="<|im_start|>assistant\n",
)
stats = trainer.train()
print("Thời gian train (giây):", round(stats.metrics["train_runtime"]))`),
    md(String.raw`## Bước 10 – Sinh dự đoán cho 5 mẫu test

Mô hình đọc **chỉ văn bản nguồn** của từng mẫu test và sinh JSON. Kết quả lưu vào ` + "`predictions_lora.jsonl`" + `. Mỗi mẫu có thể mất vài phút.`),
    code(String.raw`generate_all(model, tokenizer, test_inputs, "predictions_lora.jsonl")`),
    md(String.raw`## Bước 11 – Chấm điểm bằng bộ chấm của pipeline

Script ` + "`src/score_predictions.mjs`" + ` làm **đúng các bước của pipeline**: tách JSON → chuẩn hóa theo nguồn → kiểm JSON Schema → so với gold bằng bộ chấm 2.1 (strict và tolerant). Mẫu nào mô hình sinh JSON hỏng/cụt vẫn bị tính **0 điểm** (không bỏ qua).

Kết quả ghi vào ` + "`runs_colab/<run_id>/`" + ` theo đúng cấu trúc ` + "`runs/`" + ` của dự án.`),
    code(String.raw`MODEL_TAG = "qwen2.5-1.5b-lora" if "1.5B" in MODEL_NAME else "qwen2.5-3b-lora"
!node src/score_predictions.mjs --predictions predictions_lora.jsonl --model {MODEL_TAG} --runs-dir runs_colab
import os
if os.path.exists("predictions_baseline.jsonl"):
    BASE_TAG = MODEL_TAG.replace("-lora", "-base")
    !node src/score_predictions.mjs --predictions predictions_baseline.jsonl --model {BASE_TAG} --runs-dir runs_colab`),
    md(String.raw`## Bước 12 – Tải kết quả về máy và đưa vào bảng điểm

Ô dưới nén ` + "`runs_colab/`" + ` + các file dự đoán + adapter LoRA thành ` + "`texmind_lora_results.zip`" + ` và tải về.

Trên máy (thư mục dự án):
1. Giải nén, chép các thư mục bên trong ` + "`runs_colab/`" + ` vào ` + "`runs/`" + `.
2. Chạy ` + "`npm run scoreboard`" + `. Model LoRA sẽ xuất hiện trong bảng trung bình tập test, cạnh gpt-6.1-sol.`),
    code(String.raw`model.save_pretrained("lora_adapter")      # chỉ lưu miếng vá LoRA (vài chục MB)
tokenizer.save_pretrained("lora_adapter")
!zip -q -r texmind_lora_results.zip runs_colab predictions_*.jsonl lora_adapter
from google.colab import files
files.download("texmind_lora_results.zip")`),
    md(String.raw`## Đọc kết quả thế nào?

- **strict**: so chặt từng chữ; **tolerant**: bỏ qua khác biệt định dạng nhỏ. Thang 0–1.
- Mô hình 1.5B sau ít mẫu train thường **chưa** đạt như gpt-6.1-sol. Mục tiêu đợt này là **học quy trình** train → sinh → chấm, không phải thay thế gpt-6.1-sol.
- Lỗi hay gặp: JSON bị cắt cụt (tăng ` + "`MAX_NEW_TOKENS`" + `), thiếu khoản/điểm, sai cấp lồng nhau, tự sửa câu chữ nguồn.
- Silver chưa ai duyệt nên có thể dạy mô hình cả lỗi của gpt-6.1-sol; gold test do AI duyệt nên điểm chỉ để tham khảo.`),
  ];
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      accelerator: "GPU",
      colab: { provenance: [], gpuType: "T4" },
      kernelspec: { display_name: "Python 3", name: "python3" },
      language_info: { name: "python" },
    },
    cells,
  };
}

async function buildBundle(root) {
  const target = resolve(root, "work", "texmind_colab_bundle.zip");
  await mkdir(dirname(target), { recursive: true });
  if (existsSync(target)) await rm(target);
  const include = BUNDLE_INCLUDE.filter((item) => existsSync(resolve(root, item)));
  const result =
    process.platform === "win32"
      ? spawnSync(
          "powershell",
          ["-NoProfile", "-Command", `Compress-Archive -Path ${include.map((p) => `'${p}'`).join(",")} -DestinationPath '${target}'`],
          { cwd: root, encoding: "utf8" },
        )
      : spawnSync("zip", ["-q", "-r", target, ...include], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Không tạo được gói zip: ${result.stderr}`);
  return target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const path = resolve(root, NOTEBOOK_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(buildNotebook(), null, 1)}\n`, "utf8");
  console.log(`Đã ghi notebook: ${path}`);
  if (process.argv.includes("--bundle")) console.log(`Đã tạo gói (không có .env): ${await buildBundle(root)}`);
}
