import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// Cấu trúc mới: mỗi văn bản một thư mục, đặt tên theo mã (vd. dataset/samples/qd_067/).
export const SAMPLES_DIR = join("dataset", "samples");
export const SPLITS_DIR = join("dataset", "splits");
export const RUNS_DIR = "runs";
export const SPLIT_NAMES = ["train", "dev", "test"];

const SAMPLE_ID_PATTERN = /^[a-z0-9_]+$/u;

export function assertSampleId(sampleId) {
  if (typeof sampleId !== "string" || !SAMPLE_ID_PATTERN.test(sampleId)) {
    throw new Error(`Mã mẫu không hợp lệ: ${sampleId}. Chỉ dùng chữ thường, số và dấu gạch dưới.`);
  }
  return sampleId;
}

export function samplePaths(sampleId, root = process.cwd()) {
  const dir = resolve(root, SAMPLES_DIR, assertSampleId(sampleId));
  return {
    dir,
    source: join(dir, "source.txt"),
    metadata: join(dir, "metadata.json"),
    gold: join(dir, "gold.json"),
    // Bản nháp AI chờ người duyệt; chỉ thành gold.json qua src/promote_draft.mjs.
    draft: join(dir, "draft.json"),
    review: join(dir, "REVIEW.md"),
  };
}

export async function listSamples(root = process.cwd()) {
  const base = resolve(root, SAMPLES_DIR);
  if (!existsSync(base)) return [];
  const entries = await readdir(base, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && SAMPLE_ID_PATTERN.test(entry.name))
    .filter((entry) => existsSync(join(base, entry.name, "source.txt")))
    .map((entry) => entry.name)
    .sort();
}

export function parseSplitFile(content) {
  return content
    .split(/\r?\n/u)
    .map((line) => line.replace(/#.*$/u, "").trim())
    .filter(Boolean);
}

export async function readSplits(root = process.cwd()) {
  const splits = {};
  for (const name of SPLIT_NAMES) {
    const path = resolve(root, SPLITS_DIR, `${name}.txt`);
    splits[name] = existsSync(path) ? parseSplitFile(await readFile(path, "utf8")) : [];
  }
  return splits;
}

export function splitOf(sampleId, splits) {
  return SPLIT_NAMES.find((name) => (splits[name] ?? []).includes(sampleId)) ?? null;
}

const pad = (value) => String(value).padStart(2, "0");

// Tên thư mục chạy: <ngày>_<giờphút>_<model>_<mã>, theo giờ máy cục bộ.
// Có cả giờ phút để hai lần chạy trong cùng ngày không ghi đè nhau.
export function buildRunId({ date = new Date(), model, sampleId }) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  const safeModel = String(model || "unknown").replace(/[^A-Za-z0-9._-]+/gu, "-");
  return `${day}_${time}_${safeModel}_${assertSampleId(sampleId)}`;
}

export function runPaths(runId, root = process.cwd()) {
  const dir = resolve(root, RUNS_DIR, runId);
  return {
    dir,
    raw: join(dir, "raw.json"),
    normalized: join(dir, "normalized.json"),
    postprocess: join(dir, "postprocess.json"),
    document: join(dir, "rendered.docx"),
    score: join(dir, "score.json"),
    pipeline: join(dir, "pipeline.json"),
  };
}
