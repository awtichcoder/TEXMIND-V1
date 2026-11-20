// Tạo bảng điểm reports/scoreboard.md từ các lần chạy trong runs/<run_id>/.
// Mỗi lần chạy cần pipeline.json; score.json là tùy chọn (chỉ có khi mẫu có gold).
// Lưu ý: điểm là so output AI với gold do người duyệt; output AI không bao giờ là gold.
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateExtraction } from "./evaluate_structured.mjs";
import { normalizeExtraction, sourceInfoFromMetadata } from "./normalize_extraction.mjs";
import { RUNS_DIR, readSplits, samplePaths, splitOf } from "./samples.mjs";

const readJson = async (path) => (existsSync(path) ? JSON.parse(await readFile(path, "utf8")) : null);
const toNumber = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

// Ghép pipeline.json + score.json của một lần chạy thành một dòng bảng điểm.
// split lấy theo dataset/splits HIỆN TẠI (currentSplit) nếu có; split ghi trong pipeline.json
// chỉ là split lúc chạy và có thể đã cũ (vd qd_067 chuyển test → dev ngày 19/11/2026).
// Loại duyệt của gold dùng để chấm: "người" (human_reviewed), "AI" (ai_reviewed),
// "gold cũ" (6 mẫu làm trước khi có trường này, review_status khác), null nếu không có metadata.
export function reviewKindLabel(metadata) {
  const status = metadata?.review_status;
  if (status === "ai_reviewed") return "AI";
  if (status === "human_reviewed") return "người";
  return metadata ? "gold cũ" : null;
}

export function buildScoreboardRow(runId, pipeline, score, currentSplit = undefined, reviewKind = null) {
  return {
    run_id: pipeline?.run_id ?? runId,
    sample_id: pipeline?.sample_id ?? null,
    split: currentSplit === undefined ? (pipeline?.split ?? null) : currentSplit,
    model: pipeline?.model ?? null,
    mode: pipeline?.mode ?? null,
    template_id: pipeline?.selected_template?.templateId ?? null,
    status: pipeline?.status ?? "unknown",
    schema_valid: score?.schema_valid ?? null,
    scoring_version: score?.scoring_version ?? null,
    review_kind: score ? reviewKind : null,
    strict: toNumber(score?.strict_evaluation?.overall_score ?? pipeline?.strict_evaluation?.overall_score),
    tolerant: toNumber(
      score?.tolerant_evaluation?.overall_score ?? pipeline?.tolerant_evaluation?.overall_score,
    ),
    completed_at: pipeline?.completed_at ?? null,
  };
}

// Chấm lại normalized.json của mọi lần chạy có gold bằng bộ chấm hiện tại.
// score.json cũ được giữ một bản ở score.previous.json (chỉ lần đầu). Không đụng normalized/raw.
// renormalize=true: áp normalizer HIỆN TẠI lên raw.json đã lưu (không gọi AI) trước khi chấm, để điểm
// phản ánh "output model + pipeline hiện tại". normalized.json cũ được giữ ở normalized.previous.json.
export async function rescoreRuns(root = process.cwd(), { renormalize = false } = {}) {
  const runsDir = resolve(root, RUNS_DIR);
  if (!existsSync(runsDir)) return [];
  const updated = [];
  for (const entry of await readdir(runsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(runsDir, entry.name);
    const pipeline = await readJson(join(dir, "pipeline.json"));
    const normalizedPath = join(dir, "normalized.json");
    if (!pipeline?.sample_id || !existsSync(normalizedPath)) continue;
    const goldPath = samplePaths(pipeline.sample_id, root).gold;
    if (!existsSync(goldPath)) continue;
    if (renormalize && existsSync(join(dir, "raw.json"))) {
      try {
        const sample = samplePaths(pipeline.sample_id, root);
        const metadata = await readJson(sample.metadata);
        const { normalized } = normalizeExtraction(await readJson(join(dir, "raw.json")), {
          sampleId: pipeline.sample_id,
          sourceText: await readFile(sample.source, "utf8"),
          sourceInfo: sourceInfoFromMetadata(metadata),
        });
        const previousNormalized = join(dir, "normalized.previous.json");
        if (!existsSync(previousNormalized)) await copyFile(normalizedPath, previousNormalized);
        await writeFile(normalizedPath, `${JSON.stringify(normalized, null, 2)}
`, "utf8");
      } catch (error) {
        console.error(`Bỏ qua chuẩn hóa lại ${entry.name}: ${error.message}`);
      }
    }
    const scorePath = join(dir, "score.json");
    const previousPath = join(dir, "score.previous.json");
    if (existsSync(scorePath) && !existsSync(previousPath)) await copyFile(scorePath, previousPath);
    const report = evaluateExtraction(await readJson(goldPath), await readJson(normalizedPath));
    await writeFile(scorePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    updated.push(entry.name);
  }
  return updated;
}

export async function collectScoreboardRows(root = process.cwd()) {
  const runsDir = resolve(root, RUNS_DIR);
  if (!existsSync(runsDir)) return [];
  const entries = await readdir(runsDir, { withFileTypes: true });
  const splits = await readSplits(root);
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(runsDir, entry.name);
    const pipeline = await readJson(join(dir, "pipeline.json"));
    if (!pipeline) continue;
    const currentSplit = pipeline.sample_id ? splitOf(pipeline.sample_id, splits) : undefined;
    const metadata = pipeline.sample_id ? await readJson(samplePaths(pipeline.sample_id, root).metadata) : null;
    rows.push(
      buildScoreboardRow(entry.name, pipeline, await readJson(join(dir, "score.json")), currentSplit, reviewKindLabel(metadata)),
    );
  }
  return rows;
}

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

// Điểm trung bình theo model, chỉ trên các lần chạy thuộc tập test và có điểm.
// Bỏ qua lần chạy replay (chấm lại raw cũ) vì không biết chắc model nào đã tạo raw đó.
// Chỉ lấy lần chạy MỚI NHẤT (run_id lớn nhất) của mỗi cặp (model, mẫu): lần chạy cũ có thể dùng
// prompt/quy ước cũ nên chấm theo gold hiện tại sẽ thấp oan. Mỗi mẫu đóng góp đúng một điểm.
export function averageByModel(rows, split = "test") {
  const latest = new Map();
  for (const row of rows) {
    if (row.split !== split || row.strict === null || row.mode === "saved_raw") continue;
    const key = `${row.model ?? "unknown"}\u0000${row.sample_id}`;
    const current = latest.get(key);
    if (!current || String(row.run_id) > String(current.run_id)) latest.set(key, row);
  }
  const groups = new Map();
  for (const row of latest.values()) {
    const key = row.model ?? "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .map(([model, items]) => ({
      model,
      runs: items.length,
      samples: new Set(items.map((item) => item.sample_id)).size,
      strict: average(items.map((item) => item.strict)),
      tolerant: average(items.map((item) => item.tolerant).filter((value) => value !== null)),
    }))
    .sort((a, b) => (b.strict ?? -1) - (a.strict ?? -1) || a.model.localeCompare(b.model));
}

const fmt = (value) => (typeof value === "number" ? value.toFixed(4) : "–");
const cell = (value) => (value === null || value === undefined || value === "" ? "–" : String(value).replace(/\|/gu, "\\|"));

// Hàm thuần: nhận danh sách dòng, trả về Markdown. Không đọc đĩa để dễ test.
export function renderScoreboard(rows, { generatedAt = null } = {}) {
  const sorted = [...rows].sort((a, b) => String(a.run_id).localeCompare(String(b.run_id)));
  const lines = [
    "# Bảng điểm TexMind",
    "",
    ...(generatedAt ? [`Tạo lúc: ${generatedAt}`, ""] : []),
    "Điểm = so `normalized.json` của mỗi lần chạy với `dataset/samples/<mã>/gold.json` (gold do người duyệt).",
    "Output AI không phải gold. `strict` chấm chặt câu chữ; `tolerant` bỏ qua khác biệt định dạng nhỏ.",
    "Cột \"Gold duyệt bởi\": \"người\" = gold do người duyệt; \"AI\" = gold do Claude (AI) duyệt, CHƯA có người duyệt (điểm chỉ mang tính tham khảo); \"gold cũ\" = 6 gold làm trước 19/11/2026.",
    "",
    "## Điểm trung bình theo model (tập test)",
    "",
    "Mỗi mẫu chỉ tính lần chạy MỚI NHẤT của model đó; không tính lần chạy replay (`--raw`, chấm lại raw đã lưu).",
    "",
  ];
  const averages = averageByModel(sorted);
  if (averages.length) {
    lines.push("| Model | Số lần chạy tính | Số mẫu | Strict TB | Tolerant TB |", "|---|---:|---:|---:|---:|");
    for (const item of averages) {
      lines.push(
        `| ${cell(item.model)} | ${item.runs} | ${item.samples} | ${fmt(item.strict)} | ${fmt(item.tolerant)} |`,
      );
    }
  } else {
    lines.push("Chưa có lần chạy nào trên tập test có điểm.");
  }
  // Dev: mẫu đã xem khi phát triển prompt/normalizer → chỉ để theo dõi, không phải điểm cuối.
  const devAverages = averageByModel(sorted, "dev");
  lines.push("", "## Điểm trung bình theo model (tập dev – chỉ để theo dõi)", "");
  if (devAverages.length) {
    lines.push("| Model | Số lần chạy tính | Số mẫu | Strict TB | Tolerant TB |", "|---|---:|---:|---:|---:|");
    for (const item of devAverages) {
      lines.push(
        `| ${cell(item.model)} | ${item.runs} | ${item.samples} | ${fmt(item.strict)} | ${fmt(item.tolerant)} |`,
      );
    }
  } else {
    lines.push("Chưa có lần chạy nào trên tập dev có điểm.");
  }
  lines.push("", "## Tất cả lần chạy", "");
  if (sorted.length) {
    lines.push(
      "| Run ID | Mẫu | Split | Model | Chế độ | Template | Trạng thái | Schema | Bộ chấm | Gold duyệt bởi | Strict | Tolerant |",
      "|---|---|---|---|---|---|---|---|---|---|---:|---:|",
    );
    for (const row of sorted) {
      const schema = row.schema_valid === null ? "–" : row.schema_valid ? "hợp lệ" : "LỖI";
      lines.push(
        `| ${cell(row.run_id)} | ${cell(row.sample_id)} | ${cell(row.split)} | ${cell(row.model)} | ${cell(row.mode)} | ${cell(row.template_id)} | ${cell(row.status)} | ${schema} | ${cell(row.scoring_version)} | ${cell(row.review_kind)} | ${fmt(row.strict)} | ${fmt(row.tolerant)} |`,
      );
    }
  } else {
    lines.push("Chưa có lần chạy nào trong `runs/`. Chạy: `npm run pipeline:e2e -- --sample qd_067`.");
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const outputPath = resolve(outputIndex > 1 ? process.argv[outputIndex + 1] : join("reports", "scoreboard.md"));
  const rescoreIndex = process.argv.indexOf("--rescore");
  if (rescoreIndex > 1 && process.argv[rescoreIndex + 1] === "true") {
    const renormalizeIndex = process.argv.indexOf("--renormalize");
    const renormalize = renormalizeIndex > 1 && process.argv[renormalizeIndex + 1] === "true";
    const updated = await rescoreRuns(process.cwd(), { renormalize });
    console.log(
      `Đã chấm lại ${updated.length} lần chạy bằng bộ chấm hiện tại${renormalize ? " (chuẩn hóa lại từ raw.json bằng normalizer hiện tại)" : ""}.`,
    );
  }
  const rows = await collectScoreboardRows();
  const markdown = renderScoreboard(rows, { generatedAt: new Date().toISOString() });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
  console.log(`Đã ghi bảng điểm (${rows.length} lần chạy): ${outputPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
