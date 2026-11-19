import assert from "node:assert/strict";
import test from "node:test";
import { buildPipelineStages } from "../src/run_end_to_end.mjs";

const baseConfig = {
  nodePath: "node-test",
  sourcePath: "source.txt",
  schemaPath: "schema.json",
  sampleId: "qd_test",
  rawPath: "raw.json",
  normalizedPath: "normalized.json",
  postprocessPath: "postprocess.json",
  documentPath: "output.docx",
  referencePath: "reference.docx",
};

test("pipeline AI nối trích xuất, chuẩn hóa rồi render theo đúng thứ tự", () => {
  const stages = buildPipelineStages({
    ...baseConfig,
    mode: "ai_extract",
    model: "gpt-test",
  });

  assert.deepEqual(stages.map((stage) => stage.name), [
    "extract_and_normalize",
    "select_template_and_render",
  ]);
  assert.match(stages[0].args[0], /extract_with_ai\.mjs$/u);
  assert.deepEqual(stages[0].args.slice(-6), [
    "--raw-output",
    "raw.json",
    "--report",
    "postprocess.json",
    "--model",
    "gpt-test",
  ]);
  assert.match(stages[1].args[0], /render_structured_docx\.mjs$/u);
  assert.equal(stages[1].args.includes("--template"), false);
});

test("pipeline raw đã lưu bỏ qua API nhưng vẫn chuẩn hóa và render", () => {
  const stages = buildPipelineStages({ ...baseConfig, mode: "saved_raw" });

  assert.match(stages[0].args[0], /normalize_saved_extraction\.mjs$/u);
  assert.deepEqual(stages[0].args.slice(1, 3), ["--raw", "raw.json"]);
  assert.match(stages[1].args[0], /render_structured_docx\.mjs$/u);
});

test("pipeline chuyển template ghi đè tới riêng bước render", () => {
  const stages = buildPipelineStages({
    ...baseConfig,
    mode: "saved_raw",
    templatePath: "template.json",
  });

  assert.equal(stages[0].args.includes("--template"), false);
  assert.deepEqual(stages[1].args.slice(-2), ["--template", "template.json"]);
});

test("pipeline từ chối chế độ không xác định trước khi chạy lệnh con", () => {
  assert.throws(
    () => buildPipelineStages({ ...baseConfig, mode: "unknown" }),
    /Chế độ pipeline không hợp lệ/u,
  );
});
