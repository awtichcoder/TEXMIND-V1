import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { selectTemplate } from "./render_structured_docx.mjs";
import { buildRunId, readSplits, runPaths, samplePaths, splitOf } from "./samples.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_MODEL = "gpt-6.1-sol";
export const REPLAY_MODEL_LABEL = "replay";
export const NOT_GOLD_NOTE =
  "Output AI (raw/normalized/rendered) KHÔNG phải gold. Gold chỉ ở dataset/samples/<mã>/gold.json và do người duyệt.";

// Đọc đúng MỘT biến từ nội dung .env (không đọc/giữ các dòng khác, ví dụ API key).
export function readEnvValue(content, name) {
  for (const rawLine of String(content ?? "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line.startsWith(`${name}=`)) continue;
    const value = line.slice(name.length + 1).trim().replace(/^(['"])(.*)\1$/u, "$2");
    return value || null;
  }
  return null;
}

// Thứ tự: --model → biến môi trường OPENAI_MODEL → dòng OPENAI_MODEL trong .env → mặc định.
export function resolveModelName({ cliModel = null, env = process.env, envFileModel = null } = {}) {
  return cliModel || env.OPENAI_MODEL || envFileModel || DEFAULT_MODEL;
}

// Chỉ trả về giá trị OPENAI_MODEL; không giữ hay in dòng nào khác của .env.
const readModelFromEnvFile = (path = resolve(".env")) => {
  if (!existsSync(path)) return null;
  return readEnvValue(readFileSync(path, "utf8"), "OPENAI_MODEL");
};

// Rút điểm tổng từ score.json (kết quả evaluate_structured.mjs).
export function summarizeScore(score) {
  if (!score) return null;
  return {
    schema_valid: score.schema_valid ?? null,
    strict_overall_score: score.strict_evaluation?.overall_score ?? null,
    tolerant_overall_score: score.tolerant_evaluation?.overall_score ?? null,
  };
}

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

export function buildPipelineStages({
  mode,
  nodePath,
  sourcePath,
  schemaPath,
  sampleId,
  rawPath,
  normalizedPath,
  postprocessPath,
  documentPath,
  referencePath,
  model = null,
  templatePath = null,
  goldPath = null,
  scorePath = null,
}) {
  if (!new Set(["ai_extract", "saved_raw"]).has(mode)) {
    throw new Error(`Chế độ pipeline không hợp lệ: ${mode}.`);
  }

  const firstStage =
    mode === "ai_extract"
      ? {
          name: "extract_and_normalize",
          command: nodePath,
          args: [
            resolve(scriptDir, "extract_with_ai.mjs"),
            "--input",
            sourcePath,
            "--schema",
            schemaPath,
            "--sample-id",
            sampleId,
            "--output",
            normalizedPath,
            "--raw-output",
            rawPath,
            "--report",
            postprocessPath,
            ...(model ? ["--model", model] : []),
          ],
        }
      : {
          name: "normalize_saved_raw",
          command: nodePath,
          args: [
            resolve(scriptDir, "normalize_saved_extraction.mjs"),
            "--raw",
            rawPath,
            "--source",
            sourcePath,
            "--schema",
            schemaPath,
            "--sample-id",
            sampleId,
            "--output",
            normalizedPath,
            "--report",
            postprocessPath,
          ],
        };

  if (goldPath && !scorePath) {
    throw new Error("Có gold thì phải có đường dẫn score để ghi điểm.");
  }
  const evaluateStage = goldPath
    ? [
        {
          name: "evaluate",
          command: nodePath,
          args: [
            resolve(scriptDir, "evaluate_structured.mjs"),
            "--expected",
            goldPath,
            "--actual",
            normalizedPath,
            "--report",
            scorePath,
          ],
        },
      ]
    : [];

  return [
    firstStage,
    {
      name: "select_template_and_render",
      command: nodePath,
      args: [
        resolve(scriptDir, "render_structured_docx.mjs"),
        "--input",
        normalizedPath,
        "--schema",
        schemaPath,
        "--reference",
        referencePath,
        "--output",
        documentPath,
        ...(templatePath ? ["--template", templatePath] : []),
      ],
    },
    ...evaluateStage,
  ];
}

const runStage = (stage) => {
  console.log(`\n[${stage.name}]`);
  const result = spawnSync(stage.command, stage.args, {
    cwd: process.cwd(),
    env: process.env,
    // evaluate in cả báo cáo dài ra stdout; đã ghi vào score.json nên bỏ stdout.
    stdio: stage.name === "evaluate" ? ["inherit", "ignore", "inherit"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Pipeline dừng ở bước ${stage.name} (exit ${result.status}).`);
  }
};

const formatDateVN = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

// Kiểm tra trước khi gọi AI: chỉ lưu nháp cho mẫu CHƯA có gold và CHƯA có draft.
export function assertCanSaveDraft(paths) {
  if (existsSync(paths.gold)) {
    throw new Error(`Mẫu đã có gold.json (${paths.gold}); không tạo draft đè lên mẫu đã duyệt.`);
  }
  if (existsSync(paths.draft)) {
    throw new Error(`Đã có draft.json (${paths.draft}); xóa/đổi tên tay nếu muốn tạo lại.`);
  }
}

// Chép normalized.json của lần chạy thành draft.json và ghi một dòng vào phần Lịch sử của REVIEW.md.
export async function saveDraftFromRun({ paths, normalizedPath, runId, model, date = new Date() }) {
  assertCanSaveDraft(paths);
  await copyFile(normalizedPath, paths.draft);
  const line = `- ${formatDateVN(date)}: AI (${model}) tạo draft.json từ runs/${runId}/normalized.json. CHƯA DUYỆT.\n`;
  if (existsSync(paths.review)) {
    const review = await readFile(paths.review, "utf8");
    await writeFile(paths.review, `${review}${review.endsWith("\n") ? "" : "\n"}${line}`, "utf8");
  }
  return paths.draft;
}

// Đường dẫn theo cấu trúc mới khi chạy với --sample <mã>: runs/<run_id>/...
export function resolveSampleRun({ sampleId, model, replay = false, date = new Date(), root = process.cwd() }) {
  const sample = samplePaths(sampleId, root);
  const runId = buildRunId({ date, model: replay ? REPLAY_MODEL_LABEL : model, sampleId });
  return { sample, runId, run: runPaths(runId, root) };
}

// Gom các đường dẫn cho cả 2 chế độ: cũ (không --sample) và mới (--sample).
async function resolveConfig(args) {
  const rawArgument = args.get("--raw");
  const mode = rawArgument ? "saved_raw" : "ai_extract";
  const schemaPath = resolve(args.get("--schema") ?? "schemas/texmind-document.schema.json");
  const referencePath = resolve(
    args.get("--reference") ?? "dataset/van_ban_hanh_chinh/output_01.docx",
  );
  const templatePath = args.get("--template") ? resolve(args.get("--template")) : null;
  const sampleArgument = args.get("--sample");

  if (!sampleArgument && args.get("--save-draft") === "true") {
    throw new Error("--save-draft chỉ dùng cùng --sample <mã>.");
  }
  if (!sampleArgument) {
    // Hành vi cũ, giữ nguyên.
    const sampleId = args.get("--sample-id") ?? "qd_067";
    const workDir = resolve(args.get("--work-dir") ?? join("work", "end_to_end", sampleId));
    return {
      mode,
      sampleId,
      schemaPath,
      referencePath,
      templatePath,
      workDir,
      model: args.get("--model") ?? null,
      sourcePath: resolve(args.get("--input") ?? "dataset/van_ban_hanh_chinh/input_03.txt"),
      rawPath: resolve(
        rawArgument ?? args.get("--raw-output") ?? join(workDir, `${sampleId}.raw.json`),
      ),
      replaySourceRaw: null,
      normalizedPath: resolve(
        args.get("--normalized-output") ?? join(workDir, `${sampleId}.normalized.json`),
      ),
      postprocessPath: resolve(
        args.get("--postprocess-report") ?? join(workDir, `${sampleId}.postprocess.json`),
      ),
      documentPath: resolve(args.get("--output") ?? join("outputs", `${sampleId}.rendered.docx`)),
      pipelineReportPath: resolve(
        args.get("--pipeline-report") ?? join(workDir, `${sampleId}.pipeline.json`),
      ),
      goldPath: null,
      scorePath: null,
      sampleInfo: null,
    };
  }

  const model = resolveModelName({
    cliModel: args.get("--model") ?? null,
    envFileModel: readModelFromEnvFile(),
  });
  const { sample, runId, run } = resolveSampleRun({
    sampleId: sampleArgument,
    model,
    replay: mode === "saved_raw",
  });
  if (!existsSync(sample.source)) {
    throw new Error(`Không tìm thấy văn bản nguồn của mẫu ${sampleArgument}: ${sample.source}`);
  }
  const workDir = resolve(args.get("--work-dir") ?? run.dir);
  const inRun = (name) => join(workDir, name);
  const hasGold = existsSync(sample.gold);
  const splits = await readSplits();
  return {
    mode,
    sampleId: sampleArgument,
    schemaPath,
    referencePath,
    templatePath,
    workDir,
    model: mode === "saved_raw" ? null : model,
    sourcePath: sample.source,
    // Chế độ replay: chép raw cũ vào thư mục chạy để mỗi lần chạy tự đủ file.
    rawPath: inRun("raw.json"),
    replaySourceRaw: rawArgument ? resolve(rawArgument) : null,
    normalizedPath: inRun("normalized.json"),
    postprocessPath: inRun("postprocess.json"),
    documentPath: resolve(args.get("--output") ?? inRun("rendered.docx")),
    pipelineReportPath: inRun("pipeline.json"),
    goldPath: hasGold ? sample.gold : null,
    scorePath: hasGold ? inRun("score.json") : null,
    samplePathsForDraft: sample,
    saveDraft: args.get("--save-draft") === "true",
    sampleInfo: {
      sample_id: sampleArgument,
      run_id: runId,
      split: splitOf(sampleArgument, splits),
      model: mode === "saved_raw" ? REPLAY_MODEL_LABEL : model,
      gold: hasGold ? sample.gold : null,
    },
  };
}

async function main() {
  const args = parseArgs();
  const config = await resolveConfig(args);
  const {
    mode,
    sampleId,
    schemaPath,
    referencePath,
    templatePath,
    workDir,
    sourcePath,
    rawPath,
    normalizedPath,
    postprocessPath,
    documentPath,
    pipelineReportPath,
    goldPath,
    scorePath,
    sampleInfo,
  } = config;
  const stages = buildPipelineStages({
    mode,
    nodePath: process.execPath,
    sourcePath,
    schemaPath,
    sampleId,
    rawPath,
    normalizedPath,
    postprocessPath,
    documentPath,
    referencePath,
    model: config.model,
    templatePath,
    goldPath,
    scorePath,
  });

  const plan = {
    ...(sampleInfo ?? { sample_id: sampleId }),
    mode,
    artifacts: {
      source: sourcePath,
      raw: rawPath,
      normalized: normalizedPath,
      postprocess_report: postprocessPath,
      document: documentPath,
      pipeline_report: pipelineReportPath,
      ...(scorePath ? { score: scorePath } : {}),
    },
    stages: stages.map(({ name, command, args: stageArgs }) => ({ name, command, args: stageArgs })),
  };

  if (args.get("--dry-run") === "true") {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  await mkdir(workDir, { recursive: true });
  if (config.replaySourceRaw && config.replaySourceRaw !== rawPath) {
    await copyFile(config.replaySourceRaw, rawPath);
  }
  if (config.saveDraft) assertCanSaveDraft(config.samplePathsForDraft);
  for (const stage of stages) runStage(stage);

  let draftPath = null;
  if (config.saveDraft) {
    draftPath = await saveDraftFromRun({
      paths: config.samplePathsForDraft,
      normalizedPath,
      runId: sampleInfo.run_id,
      model: sampleInfo.model,
    });
  }

  const structured = await readFile(normalizedPath, "utf8").then(JSON.parse);
  let selection;
  if (templatePath) {
    const template = await readFile(templatePath, "utf8").then(JSON.parse);
    selection = {
      templateId: template.template_id,
      templatePath,
      reason: "template được chỉ định bằng --template",
    };
  } else {
    selection = selectTemplate(structured);
  }

  const scoreSummary = scorePath
    ? summarizeScore(await readFile(scorePath, "utf8").then(JSON.parse))
    : null;

  const report = {
    ...plan,
    completed_at: new Date().toISOString(),
    selected_template: selection,
    ...(sampleInfo
      ? {
          strict_evaluation: { overall_score: scoreSummary?.strict_overall_score ?? null },
          tolerant_evaluation: { overall_score: scoreSummary?.tolerant_overall_score ?? null },
          score_schema_valid: scoreSummary?.schema_valid ?? null,
          draft_saved_to: draftPath,
          note: NOT_GOLD_NOTE,
        }
      : {}),
    status: "completed",
  };
  await mkdir(dirname(pipelineReportPath), { recursive: true });
  await writeFile(pipelineReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nPASS: pipeline đầu-cuối hoàn tất.");
  if (sampleInfo) console.log(`Run ID: ${sampleInfo.run_id} (split: ${sampleInfo.split ?? "không thuộc split nào"})`);
  console.log(`JSON chuẩn hóa: ${normalizedPath}`);
  console.log(`Template: ${selection.templateId} (${selection.reason})`);
  console.log(`DOCX: ${documentPath}`);
  if (scoreSummary) {
    const fmt = (value) => (typeof value === "number" ? value.toFixed(4) : "n/a");
    console.log(
      `Điểm so với gold: strict ${fmt(scoreSummary.strict_overall_score)}, tolerant ${fmt(scoreSummary.tolerant_overall_score)}`,
    );
  }
  console.log(`Báo cáo pipeline: ${pipelineReportPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
