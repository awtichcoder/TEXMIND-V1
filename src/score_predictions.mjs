// Chấm dự đoán của một model ngoài pipeline (vd. LoRA Qwen trên Colab) bằng ĐÚNG các bước của pipeline:
// tách JSON → bỏ null ở khóa tùy chọn → chuẩn hóa theo nguồn + metadata → kiểm schema → so gold.
// Kết quả ghi thành runs/<run_id>/ (raw.json, normalized.json, score.json, pipeline.json) để
// `npm run scoreboard` đọc như các lần chạy khác.
//
//   node src/score_predictions.mjs --predictions predictions.jsonl --model qwen2.5-1.5b-lora [--runs-dir runs]
//
// predictions.jsonl: mỗi dòng {"sample_id": "...", "output": "<chuỗi model sinh ra>"}.
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateExtraction } from "./evaluate_structured.mjs";
import { normalizeExtraction, sourceInfoFromMetadata } from "./normalize_extraction.mjs";
import { buildRunId, readSplits, samplePaths, splitOf } from "./samples.mjs";
import { dropNullOptionals } from "./strict_output_schema.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

// Lấy JSON object đầu tiên trong chuỗi model sinh (bỏ ```json ... ``` nếu có).
export function extractJsonObject(text) {
  const cleaned = String(text ?? "").replace(/```(?:json)?/giu, "");
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("không tìm thấy JSON object");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
    }
  }
  throw new Error("JSON bị cắt cụt (thiếu dấu đóng) – có thể do max_new_tokens quá nhỏ");
}

export function scorePrediction({ sampleId, output, root = process.cwd(), schema }) {
  const paths = samplePaths(sampleId, root);
  const gold = JSON.parse(readFileSync(paths.gold, "utf8"));
  const sourceText = readFileSync(paths.source, "utf8");
  const metadata = existsSync(paths.metadata) ? JSON.parse(readFileSync(paths.metadata, "utf8")) : null;
  let raw = null;
  let parseError = null;
  try {
    raw = dropNullOptionals(extractJsonObject(output), schema);
  } catch (error) {
    parseError = error.message;
  }
  if (!raw) {
    return { raw: null, normalized: null, changes: [], schemaErrors: [], score: null, parseError };
  }
  const { normalized, changes } = normalizeExtraction(raw, {
    sampleId,
    sourceText,
    sourceInfo: sourceInfoFromMetadata(metadata),
  });
  const schemaErrors = validateAgainstSchema(schema, normalized);
  const score = evaluateExtraction(gold, normalized, schemaErrors);
  return { raw, normalized, changes, schemaErrors, score, parseError: null };
}

export async function scorePredictionsFile({ predictionsPath, model, runsDir = "runs", root = process.cwd(), date = new Date() }) {
  const schema = JSON.parse(readFileSync(resolve(root, "schemas", "texmind-document.schema.json"), "utf8"));
  const splits = await readSplits(root);
  const lines = readFileSync(resolve(predictionsPath), "utf8").split(/\r?\n/u).filter((line) => line.trim());
  const summary = [];
  for (const line of lines) {
    const { sample_id: sampleId, output } = JSON.parse(line);
    const runId = buildRunId({ date, model, sampleId });
    const dir = resolve(root, runsDir, runId);
    await mkdir(dir, { recursive: true });
    const result = scorePrediction({ sampleId, output, root, schema });
    await writeFile(join(dir, "output.txt"), String(output ?? ""), "utf8");
    if (result.raw) await writeFile(join(dir, "raw.json"), `${JSON.stringify(result.raw, null, 2)}\n`, "utf8");
    if (result.normalized) {
      await writeFile(join(dir, "normalized.json"), `${JSON.stringify(result.normalized, null, 2)}\n`, "utf8");
      await writeFile(
        join(dir, "postprocess.json"),
        `${JSON.stringify({ changes: result.changes, normalized_schema_error_count: result.schemaErrors.length }, null, 2)}\n`,
        "utf8",
      );
    }
    // Không tách được JSON: vẫn ghi điểm 0 để bảng điểm phản ánh trung thực, không bỏ qua mẫu lỗi.
    const score = result.score ?? {
      schema_valid: false,
      strict_evaluation: { overall_score: 0 },
      tolerant_evaluation: { overall_score: 0 },
      parse_error: result.parseError,
    };
    await writeFile(join(dir, "score.json"), `${JSON.stringify(score, null, 2)}\n`, "utf8");
    const pipeline = {
      sample_id: sampleId,
      run_id: runId,
      split: splitOf(sampleId, splits),
      model,
      mode: "external_model",
      status: result.score ? "completed" : "failed_parse",
      parse_error: result.parseError,
      strict_evaluation: { overall_score: score.strict_evaluation.overall_score },
      tolerant_evaluation: { overall_score: score.tolerant_evaluation.overall_score },
      note: "Dự đoán của model ngoài (vd. LoRA trên Colab), chấm bằng chuẩn hóa + bộ chấm của pipeline. Output AI không phải gold.",
    };
    await writeFile(join(dir, "pipeline.json"), `${JSON.stringify(pipeline, null, 2)}\n`, "utf8");
    summary.push({ sampleId, runId, status: pipeline.status, strict: pipeline.strict_evaluation.overall_score, tolerant: pipeline.tolerant_evaluation.overall_score, schemaErrors: result.schemaErrors.length });
  }
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  if (!args.get("--predictions") || !args.get("--model")) {
    console.error("Cách dùng: node src/score_predictions.mjs --predictions <file.jsonl> --model <tên> [--runs-dir runs]");
    process.exit(2);
  }
  const summary = await scorePredictionsFile({
    predictionsPath: args.get("--predictions"),
    model: args.get("--model"),
    runsDir: args.get("--runs-dir") ?? "runs",
  });
  for (const item of summary) {
    console.log(
      `${item.sampleId}: ${item.status} strict ${item.strict.toFixed(4)} tolerant ${item.tolerant.toFixed(4)} (lỗi schema: ${item.schemaErrors}) → ${item.runId}`,
    );
  }
}
