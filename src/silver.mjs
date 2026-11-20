// Dữ liệu "silver": văn bản lấy từ dataset/hf_quyet_dinh, do AI (gpt-6.1-sol) trích xuất, CHƯA ai duyệt.
// Chỉ dùng để TRAIN (cùng gold thuộc split train). KHÔNG BAO GIỜ dùng để chấm điểm hay coi là gold.
//
//   node src/silver.mjs --select 20            # in danh sách văn bản đủ điều kiện (không ghi gì)
//   node src/silver.mjs --prepare 20           # tạo dataset/silver/<mã>/{source.txt, metadata.json}
//   node src/silver.mjs --extract              # gọi AI cho mẫu chưa có silver.json (bỏ bản sai schema)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SILVER_DIR = join("dataset", "silver");
const HF_DIR = join("dataset", "hf_quyet_dinh");
const scriptDir = dirname(fileURLToPath(import.meta.url));

export const SILVER_NOTE = "silver: AI tạo, chưa duyệt – chỉ dùng để train, không phải gold, không dùng để chấm điểm.";

// Tiêu chí chọn: chưa có trong dataset/samples; không có "Chương"; độ dài vừa phải;
// có số hiệu, quốc hiệu, chức danh/khối ký và ít nhất 2 điều (để làm được JSON hợp lệ mà không bịa).
export function silverEligibility(text) {
  const reasons = [];
  if (text.length < 1200) reasons.push("quá ngắn");
  if (text.length > 7000) reasons.push("quá dài");
  if (/^Chương\s+[IVXLC\d]+/mu.test(text)) reasons.push("có Chương");
  if (!/^Số\s*:/mu.test(text)) reasons.push("thiếu số hiệu");
  if (!/CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/u.test(text)) reasons.push("thiếu quốc hiệu");
  if (!/^(TM\.|KT\.|Q\.|TL\.)|^\((?:đã\s+)?ký[^()]{0,40}\)$|^(CHỦ TỊCH|PHÓ CHỦ TỊCH|BỘ TRƯỞNG|THỦ TƯỚNG|GIÁM ĐỐC)\s*$/mu.test(text)) {
    reasons.push("thiếu khối chữ ký");
  }
  if ((text.match(/^Điều\s+\d+[.:]/gmu) ?? []).length < 2) reasons.push("ít hơn 2 điều");
  return reasons;
}

export function selectSilverCandidates({ root = process.cwd(), limit = 20 } = {}) {
  const used = new Set(readdirSync(resolve(root, "dataset", "samples")));
  const manifest = readFileSync(resolve(root, HF_DIR, "manifest.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/u)
    .map((line) => JSON.parse(line));
  const picked = [];
  const rejected = [];
  for (const item of manifest.sort((a, b) => a.sample_id.localeCompare(b.sample_id))) {
    if (used.has(item.sample_id)) continue;
    const text = readFileSync(resolve(root, HF_DIR, item.clean_text_file), "utf8");
    const reasons = silverEligibility(text);
    if (reasons.length) rejected.push({ sample_id: item.sample_id, reasons });
    else if (picked.length < limit) picked.push(item);
  }
  return { picked, rejected };
}

export function buildSilverMetadata(item) {
  return {
    sample_id: item.sample_id,
    source_id: item.source_id,
    document_type: "quyet_dinh",
    language: "vi",
    source_dataset: item.source_dataset,
    source_page: item.source_page,
    license: item.license,
    input_file: "source.txt",
    silver_file: "silver.json",
    data_quality: "silver",
    note: SILVER_NOTE,
    review_status: "unreviewed",
    usage: "train_only",
    source_metadata: { title: item.title, document_number: item.document_number, issuing_date: item.issuing_date },
    hf_files: { clean_text: `dataset/hf_quyet_dinh/${item.clean_text_file}` },
  };
}

export async function prepareSilver({ root = process.cwd(), limit = 20 } = {}) {
  const { picked } = selectSilverCandidates({ root, limit });
  for (const item of picked) {
    const dir = resolve(root, SILVER_DIR, item.sample_id);
    await mkdir(dir, { recursive: true });
    const sourcePath = join(dir, "source.txt");
    if (!existsSync(sourcePath)) await copyFile(resolve(root, HF_DIR, item.clean_text_file), sourcePath);
    const metadataPath = join(dir, "metadata.json");
    if (!existsSync(metadataPath)) {
      await writeFile(metadataPath, `${JSON.stringify(buildSilverMetadata(item), null, 2)}\n`, "utf8");
    }
  }
  return picked.map((item) => item.sample_id);
}

// Gọi extract_with_ai cho từng mẫu silver chưa có silver.json. File phụ (raw, chẩn đoán) nằm ở work/silver/.
export async function extractSilver({ root = process.cwd() } = {}) {
  const ids = readdirSync(resolve(root, SILVER_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const results = [];
  for (const id of ids) {
    const dir = resolve(root, SILVER_DIR, id);
    const target = join(dir, "silver.json");
    if (existsSync(target)) {
      results.push({ id, status: "đã có" });
      continue;
    }
    const workDir = resolve(root, "work", "silver", id);
    await mkdir(workDir, { recursive: true });
    const output = join(workDir, `${id}.normalized.json`);
    const run = spawnSync(
      process.execPath,
      [
        resolve(scriptDir, "extract_with_ai.mjs"),
        "--input", join(dir, "source.txt"),
        "--sample-id", id,
        "--output", output,
        "--raw-output", join(workDir, `${id}.raw.json`),
        "--report", join(workDir, `${id}.postprocess.json`),
        "--source-metadata", join(dir, "metadata.json"),
      ],
      { cwd: root, encoding: "utf8", env: process.env },
    );
    if (run.status === 0 && existsSync(output)) {
      await copyFile(output, target);
      results.push({ id, status: "đạt" });
    } else {
      const reason = /sai schema/u.test(run.stderr) ? "sai schema – bỏ" : `lỗi (exit ${run.status})`;
      results.push({ id, status: reason });
    }
    console.log(`${id}: ${results.at(-1).status}`);
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [flag, value] = process.argv.slice(2);
  if (flag === "--select") {
    const { picked, rejected } = selectSilverCandidates({ limit: Number(value) || 20 });
    console.log(`Chọn ${picked.length}: ${picked.map((item) => `${item.sample_id}(${item.text_char_count})`).join(", ")}`);
    console.log(`Loại ${rejected.length}:`);
    for (const item of rejected) console.log(`  ${item.sample_id}: ${item.reasons.join(", ")}`);
  } else if (flag === "--prepare") {
    console.log(`Đã chuẩn bị: ${(await prepareSilver({ limit: Number(value) || 20 })).join(", ")}`);
  } else if (flag === "--extract") {
    const results = await extractSilver();
    console.log(`Đạt: ${results.filter((r) => r.status !== "sai schema – bỏ" && !r.status.startsWith("lỗi")).length}/${results.length}`);
  } else {
    console.error("Cách dùng: node src/silver.mjs --select 20 | --prepare 20 | --extract");
    process.exit(2);
  }
}
