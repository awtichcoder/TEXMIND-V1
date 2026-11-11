import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildExtractionSystemPrompt } from "./extraction_prompt.mjs";

const outputPath = resolve("notebooks/TexMind_qd_021_Colab.ipynb");
const systemPrompt = buildExtractionSystemPrompt("qd_021");

const codeCell = (source) => ({
  cell_type: "code",
  execution_count: null,
  metadata: {},
  outputs: [],
  source: source.split("\n").map((line, index, lines) =>
    index === lines.length - 1 ? line : `${line}\n`,
  ),
});

const markdownCell = (source) => ({
  cell_type: "markdown",
  metadata: {},
  source: source.split("\n").map((line, index, lines) =>
    index === lines.length - 1 ? line : `${line}\n`,
  ),
});

const installCell = String.raw`!pip -q install "transformers>=4.46,<5" accelerate bitsandbytes jsonschema`;

const uploadCell = String.raw`from google.colab import files
from pathlib import Path
import json, re

print("Chọn cùng lúc 3 tệp: input_02.txt, structured_02.json, texmind-document.schema.json")
uploaded = files.upload()

def latest_matching(stem, suffix):
    candidates = [p for p in Path(".").glob("*") if p.name.startswith(stem) and p.name.endswith(suffix)]
    if not candidates:
        raise FileNotFoundError("Không tìm thấy tệp bắt đầu bằng {} và kết thúc bằng {}".format(stem, suffix))
    return max(candidates, key=lambda p: p.stat().st_mtime)

INPUT_PATH = latest_matching("input_02", ".txt")
GOLD_PATH = latest_matching("structured_02", ".json")
SCHEMA_PATH = latest_matching("texmind-document.schema", ".json")
print("Input:", INPUT_PATH)
print("Gold:", GOLD_PATH)
print("Schema:", SCHEMA_PATH)`;

const loadCell = String.raw`SOURCE_TEXT = INPUT_PATH.read_text(encoding="utf-8")
GOLD = json.loads(GOLD_PATH.read_text(encoding="utf-8"))
SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

assert GOLD["sample_id"] == "qd_021", "Bạn đã tải nhầm structured gold"
print("Đã nạp {:,} ký tự; gold có {} điều và {} căn cứ".format(
    len(SOURCE_TEXT), len(GOLD.get("articles", [])), len(GOLD.get("legal_bases", []))
))`;

const modelCell = String.raw`import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"
quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=quant_config,
    device_map="auto",
    torch_dtype=torch.float16,
)
print("Đã nạp", MODEL_ID, "trên", torch.cuda.get_device_name(0))`;

const generationCell = [
  `SYSTEM_PROMPT = ${JSON.stringify(systemPrompt)}`,
  String.raw`USER_PROMPT = "JSON SCHEMA:\n\n{}\n\nVĂN BẢN NGUỒN:\n\n{}".format(
    json.dumps(SCHEMA, ensure_ascii=False), SOURCE_TEXT
)
messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": USER_PROMPT},
]
rendered = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tokenizer(rendered, return_tensors="pt").to(model.device)
with torch.inference_mode():
    generated = model.generate(
        **inputs,
        max_new_tokens=12000,
        do_sample=False,
        repetition_penalty=1.02,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.eos_token_id,
    )
response = tokenizer.decode(generated[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()

def parse_json_object(text):
    cleaned = text.strip()
    fence = chr(96) * 3
    if cleaned.startswith(fence):
        cleaned = re.sub(r"^" + re.escape(fence) + r"(?:json)?\s*", "", cleaned, flags=re.I)
    if cleaned.endswith(fence):
        cleaned = cleaned[:-len(fence)].strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end < start:
        Path("qd_021.invalid-response.txt").write_text(text, encoding="utf-8")
        raise ValueError("Model không trả về JSON object")
    return json.loads(cleaned[start:end + 1])

RAW = parse_json_object(response)
Path("qd_021.colab.raw.json").write_text(
    json.dumps(RAW, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print("Đã sinh raw:", RAW.get("sample_id"), "-", len(RAW.get("articles", [])), "điều")`,
].join("\n");

const normalizeCell = String.raw`import copy
from jsonschema import Draft202012Validator

NORMALIZED = copy.deepcopy(RAW)
CHANGES = []

def change(rule, path, before, after):
    CHANGES.append({"rule": rule, "path": path, "before": before, "after": after})

if NORMALIZED.get("sample_id") != "qd_021":
    change("sample_id_from_job_context", "$.sample_id", NORMALIZED.get("sample_id"), "qd_021")
    NORMALIZED["sample_id"] = "qd_021"

quality_in_provenance = NORMALIZED.get("provenance", {}).get("quality")
if quality_in_provenance is not None:
    if "quality" not in NORMALIZED:
        change("move_provenance_quality_to_root_when_missing", "$.quality", None, quality_in_provenance)
        NORMALIZED["quality"] = quality_in_provenance
        del NORMALIZED["provenance"]["quality"]
    elif quality_in_provenance == NORMALIZED["quality"]:
        change("remove_exact_duplicate_provenance_quality", "$.provenance.quality", quality_in_provenance, None)
        del NORMALIZED["provenance"]["quality"]

signature = NORMALIZED.get("signature", {})
authority = str(signature.get("authority") or "").strip()
delegation = str(signature.get("delegation") or "").strip()
if authority and re.fullmatch(r"TM\.?", delegation, flags=re.I) and not re.match(r"^TM\.", authority, flags=re.I):
    new_authority = "TM. " + authority
    change("move_tm_prefix_from_delegation_to_authority", "$.signature.authority", authority, new_authority)
    change("clear_delegation_after_tm_prefix_move", "$.signature.delegation", signature.get("delegation"), None)
    signature["authority"] = new_authority
    signature["delegation"] = None

errors = sorted(Draft202012Validator(SCHEMA).iter_errors(NORMALIZED), key=lambda error: list(error.path))
POSTPROCESS = {
    "raw_schema_error_count": len(list(Draft202012Validator(SCHEMA).iter_errors(RAW))),
    "normalized_schema_error_count": len(errors),
    "normalized_schema_errors": ["{}: {}".format(list(error.path), error.message) for error in errors],
    "changes": CHANGES,
}
Path("qd_021.colab.normalized.json").write_text(
    json.dumps(NORMALIZED, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
Path("qd_021.colab.postprocess.json").write_text(
    json.dumps(POSTPROCESS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print("Schema errors raw/normalized:", POSTPROCESS["raw_schema_error_count"], "/", len(errors))
print("Thay đổi hậu xử lý:", len(CHANGES))`;

const evaluateCell = String.raw`import difflib, unicodedata

def compact(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()

def formatting(value):
    value = unicodedata.normalize("NFKC", compact(value)).lower()
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()

def tolerant_match(expected, actual):
    left, right = formatting(expected), formatting(actual)
    if left == right:
        return True
    return difflib.SequenceMatcher(None, left, right).ratio() >= 0.90

def flatten_by_position(articles):
    result = []
    def visit(article_number, clauses, parent=()):
        for index, clause in enumerate(clauses or [], start=1):
            position = parent + (index,)
            result.append((article_number, position, clause.get("number"), compact(clause.get("text"))))
            visit(article_number, clause.get("children", []), position)
    for article in articles or []:
        visit(article.get("number"), article.get("clauses", []))
    return result

def exact_list(expected, actual):
    expected_set, actual_set = set(map(compact, expected)), set(map(compact, actual))
    return len(expected_set & actual_set), len(expected_set), len(actual_set)

gold_headings = {str(item.get("number")): compact(item.get("heading")) for item in GOLD.get("articles", [])}
actual_headings = {str(item.get("number")): compact(item.get("heading")) for item in NORMALIZED.get("articles", [])}
heading_exact = sum(gold_headings.get(key) == actual_headings.get(key) for key in gold_headings)
heading_tolerant = sum(tolerant_match(gold_headings.get(key), actual_headings.get(key)) for key in gold_headings)

gold_clauses, actual_clauses = flatten_by_position(GOLD.get("articles")), flatten_by_position(NORMALIZED.get("articles"))
clause_exact = sum(left == right for left, right in zip(gold_clauses, actual_clauses)) if len(gold_clauses) == len(actual_clauses) else 0
clause_tolerant = sum(
    left[:3] == right[:3] and tolerant_match(left[3], right[3])
    for left, right in zip(gold_clauses, actual_clauses)
) if len(gold_clauses) == len(actual_clauses) else 0
legal_exact, legal_expected, legal_actual = exact_list(GOLD.get("legal_bases", []), NORMALIZED.get("legal_bases", []))

EVALUATION = {
    "model": MODEL_ID,
    "schema_valid": len(errors) == 0,
    "schema_errors": POSTPROCESS["normalized_schema_errors"],
    "article_headings": {"expected": len(gold_headings), "actual": len(actual_headings), "strict_matches": heading_exact, "tolerant_matches": heading_tolerant},
    "legal_bases": {"expected": legal_expected, "actual": legal_actual, "strict_matches": legal_exact},
    "clauses": {"expected": len(gold_clauses), "actual": len(actual_clauses), "strict_matches": clause_exact, "tolerant_matches": clause_tolerant},
    "recipients": {"expected": len(GOLD.get("recipients", [])), "actual": len(NORMALIZED.get("recipients", []))},
}
Path("qd_021.colab.evaluation.json").write_text(
    json.dumps(EVALUATION, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(EVALUATION, ensure_ascii=False, indent=2))`;

const downloadCell = String.raw`import zipfile
from google.colab import files

artifacts = [
    "qd_021.colab.raw.json",
    "qd_021.colab.normalized.json",
    "qd_021.colab.postprocess.json",
    "qd_021.colab.evaluation.json",
]
zip_name = "texmind_qd_021_colab_results.zip"
with zipfile.ZipFile(zip_name, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for artifact in artifacts:
        archive.write(artifact)
print("Đã tạo", zip_name)
files.download(zip_name)`;

const notebook = {
  cells: [
    markdownCell("# TexMind – benchmark qd_021 trên Colab\n\nGold chỉ được nạp để chấm sau khi model sinh prediction; không đưa gold vào prompt."),
    codeCell(installCell),
    codeCell(uploadCell),
    codeCell(loadCell),
    codeCell(modelCell),
    codeCell(generationCell),
    codeCell(normalizeCell),
    codeCell(evaluateCell),
    codeCell(downloadCell),
  ],
  metadata: {
    accelerator: "GPU",
    colab: { name: "TexMind_qd_021_Colab.ipynb", provenance: [] },
    kernelspec: { display_name: "Python 3", name: "python3" },
    language_info: { name: "python" },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(notebook, null, 2)}\n`, "utf8");
console.log(`PASS: ${outputPath}`);
