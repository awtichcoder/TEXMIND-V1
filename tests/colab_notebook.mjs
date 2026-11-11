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
