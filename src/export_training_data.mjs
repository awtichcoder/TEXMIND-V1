// Xuất dữ liệu train LoRA dạng JSONL (định dạng chat: system / user / assistant).
//
//   node src/export_training_data.mjs                 # ghi notebooks/data/train.jsonl + test_inputs.jsonl
//
// Nguồn dữ liệu train: gold.json của mẫu thuộc split TRAIN + silver.json trong dataset/silver/.
// TUYỆT ĐỐI không lấy mẫu dev/test: assertNoLeak() kiểm tra cả mã mẫu lẫn nội dung văn bản nguồn.
// test_inputs.jsonl chỉ chứa văn bản nguồn của mẫu test (KHÔNG có gold) để notebook sinh dự đoán.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSplits, samplePaths } from "./samples.mjs";
import { SILVER_DIR } from "./silver.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

// Prompt ngắn dùng chung khi train và khi sinh dự đoán (notebook đọc từ train.jsonl).
export const LORA_SYSTEM_PROMPT = [
  "Bạn là bộ trích xuất văn bản Quyết định hành chính tiếng Việt sang JSON theo schema TexMind.",
  "Chỉ trả về đúng một JSON object, không Markdown, không giải thích.",
  "Giữ NGUYÊN VĂN câu chữ nguồn (kể cả lỗi chính tả), không bịa dữ liệu thiếu.",
  "Khoản/điểm lồng đúng cấp bằng children; đoạn không ký hiệu number=null, gạch đầu dòng number='-'.",
  "Vị trí phụ lục dạng 'Điều X, khoản Y, điểm z'; dòng ký chép nguyên văn hoặc null.",
].join("\n");

export const buildUserMessage = (sampleId, sourceText) =>
  `sample_id: ${sampleId}\n\nVĂN BẢN NGUỒN:\n${sourceText.trim()}`;

const normalizeSource = (text) => String(text ?? "").replace(/\s+/gu, " ").trim();
export const sourceFingerprint = (text) => createHash("sha256").update(normalizeSource(text)).digest("hex");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

// Trả về các bản ghi train (chưa ghi đĩa) và thống kê. Không đọc dev/test vào bản ghi.
export function buildTrainingRecords({ root = process.cwd(), splits, schema } = {}) {
  const records = [];
  const skipped = [];
  for (const sampleId of splits.train) {
    const paths = samplePaths(sampleId, root);
    if (!existsSync(paths.gold)) {
      skipped.push({ sampleId, reason: "chưa có gold.json" });
      continue;
    }
    records.push({ sampleId, origin: "gold", source: readFileSync(paths.source, "utf8"), target: readJson(paths.gold) });
  }
  const silverRoot = resolve(root, SILVER_DIR);
  const silverIds = existsSync(silverRoot)
    ? readdirSync(silverRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    : [];
  for (const sampleId of silverIds) {
    const dir = join(silverRoot, sampleId);
    const silverPath = join(dir, "silver.json");
    if (!existsSync(silverPath)) {
      skipped.push({ sampleId, reason: "silver chưa có silver.json (AI lỗi hoặc sai schema)" });
      continue;
    }
    records.push({ sampleId, origin: "silver", source: readFileSync(join(dir, "source.txt"), "utf8"), target: readJson(silverPath) });
  }
  const valid = [];
  for (const record of records) {
    const errors = schema ? validateAgainstSchema(schema, record.target) : [];
    if (errors.length) skipped.push({ sampleId: record.sampleId, reason: `sai schema (${errors.length} lỗi)` });
    else valid.push(record);
  }
  return { records: valid, skipped };
}

// Chặn rò rỉ: không mã mẫu nào thuộc dev/test, không văn bản nguồn nào trùng nội dung với dev/test.
export function assertNoLeak(records, { splits, root = process.cwd() }) {
  const forbidden = new Set([...(splits.dev ?? []), ...(splits.test ?? [])]);
  const forbiddenSources = new Map();
  for (const sampleId of forbidden) {
    const sourcePath = samplePaths(sampleId, root).source;
    if (existsSync(sourcePath)) forbiddenSources.set(sourceFingerprint(readFileSync(sourcePath, "utf8")), sampleId);
  }
  const problems = [];
  for (const record of records) {
    if (forbidden.has(record.sampleId)) problems.push(`${record.sampleId} thuộc dev/test`);
    const twin = forbiddenSources.get(sourceFingerprint(record.source));
    if (twin) problems.push(`${record.sampleId} (${record.origin}) trùng văn bản nguồn với ${twin} (dev/test)`);
  }
  if (problems.length) throw new Error(`RÒ RỈ dữ liệu dev/test vào train: ${problems.join("; ")}`);
}

export const toChatLine = (record) =>
  JSON.stringify({
    sample_id: record.sampleId,
    origin: record.origin,
    messages: [
      { role: "system", content: LORA_SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(record.sampleId, record.source) },
      { role: "assistant", content: JSON.stringify(record.target) },
    ],
  });

// Đầu vào cho mẫu test: chỉ văn bản nguồn, KHÔNG gold.
export function buildTestInputs({ root = process.cwd(), splits }) {
  return splits.test.map((sampleId) => ({
    sample_id: sampleId,
    messages: [
      { role: "system", content: LORA_SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(sampleId, readFileSync(samplePaths(sampleId, root).source, "utf8")) },
    ],
  }));
}

export async function exportTrainingData({ root = process.cwd(), outDir = join("notebooks", "data") } = {}) {
  const splits = await readSplits(root);
  const schema = readJson(resolve(root, "schemas", "texmind-document.schema.json"));
  const { records, skipped } = buildTrainingRecords({ root, splits, schema });
  assertNoLeak(records, { splits, root });
  const target = resolve(root, outDir);
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "train.jsonl"), `${records.map(toChatLine).join("\n")}\n`, "utf8");
  const tests = buildTestInputs({ root, splits });
  await writeFile(join(target, "test_inputs.jsonl"), `${tests.map((t) => JSON.stringify(t)).join("\n")}\n`, "utf8");
  return {
    gold: records.filter((r) => r.origin === "gold").map((r) => r.sampleId),
    silver: records.filter((r) => r.origin === "silver").map((r) => r.sampleId),
    skipped,
    test: tests.map((t) => t.sample_id),
    outDir: target,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await exportTrainingData();
    console.log(`train.jsonl: ${result.gold.length} gold (train) + ${result.silver.length} silver`);
    console.log(`  gold: ${result.gold.join(", ")}`);
    console.log(`  silver: ${result.silver.join(", ")}`);
    for (const item of result.skipped) console.log(`  bỏ qua ${item.sampleId}: ${item.reason}`);
    console.log(`test_inputs.jsonl (chỉ văn bản nguồn, không gold): ${result.test.join(", ")}`);
    console.log(`Thư mục: ${result.outDir}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
