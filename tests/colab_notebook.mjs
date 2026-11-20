import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("notebook qd_021 có đủ luồng và không đưa gold vào prompt", async () => {
  const notebook = JSON.parse(
    await readFile(new URL("../notebooks/TexMind_qd_021_Colab.ipynb", import.meta.url), "utf8"),
  );
  assert.equal(notebook.nbformat, 4);
  assert.equal(notebook.cells.length, 9);

  const code = notebook.cells
    .filter((cell) => cell.cell_type === "code")
    .map((cell) => cell.source.join(""));
  const generationCell = code.find((source) => source.includes("SYSTEM_PROMPT ="));
  assert.ok(generationCell);
  assert.match(code.join("\n"), /Qwen\/Qwen2\.5-3B-Instruct/u);
  assert.doesNotMatch(generationCell, /GOLD/u);
  assert.ok(code.some((source) => source.includes("Draft202012Validator")));
  assert.ok(code.some((source) => source.includes("texmind_qd_021_colab_results.zip")));
});

test("notebook LoRA: đủ các bước, dùng bộ chấm pipeline, không đưa gold vào lúc sinh, gói zip không có .env", async () => {
  const { BUNDLE_INCLUDE, buildNotebook } = await import("../src/build_colab_lora.mjs");
  const saved = JSON.parse(await readFile(new URL("../notebooks/TexMind_LoRA.ipynb", import.meta.url), "utf8"));
  assert.deepEqual(saved, JSON.parse(JSON.stringify(buildNotebook())), "notebook đã lưu phải khớp script sinh (chạy npm run build:colab:lora)");
  assert.equal(saved.nbformat, 4);
  const code = saved.cells.filter((cell) => cell.cell_type === "code").map((cell) => cell.source.join(""));
  const all = code.join("\n");
  assert.match(all, /unsloth\/Qwen2\.5-1\.5B-Instruct-bnb-4bit/u);
  assert.match(all, /load_in_4bit=True/u);
  assert.match(all, /node src\/export_training_data\.mjs/u);
  assert.match(all, /node src\/score_predictions\.mjs/u);
  assert.match(all, /train_on_responses_only/u);
  const generation = code.find((source) => source.includes("def generate_all"));
  assert.ok(generation);
  assert.doesNotMatch(generation, /gold/iu, "lúc sinh dự đoán không được đọc gold");
  assert.ok(code.some((source) => source.includes('len(t["messages"]) == 2')), "phải kiểm test_inputs không có đáp án");
  // Mỗi ô code đều có ô giải thích tiếng Việt đứng trước.
  saved.cells.forEach((cell, index) => {
    if (cell.cell_type === "code") assert.equal(saved.cells[index - 1]?.cell_type, "markdown", `ô code ${index} thiếu giải thích`);
  });
  assert.equal(BUNDLE_INCLUDE.some((item) => item.includes(".env")), false);
  assert.equal(BUNDLE_INCLUDE.includes("."), false, "không nén cả thư mục dự án");
});
