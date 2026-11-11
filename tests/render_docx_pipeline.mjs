import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertTemplateCompatibility,
  rendererCommand,
} from "../src/render_structured_docx.mjs";

const root = new URL("../", import.meta.url);

test("renderer chấp nhận structured_01 với template TM-QD-001", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-001.json", root), "utf8").then(JSON.parse),
  ]);
  assert.doesNotThrow(() => assertTemplateCompatibility(structured, template));
});

test("renderer từ chối sai loại tài liệu hoặc sai template", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-001.json", root), "utf8").then(JSON.parse),
  ]);
  assert.throws(
    () => assertTemplateCompatibility({ ...structured, document_type: "bao_cao" }, template),
    /không tương thích/u,
  );
  assert.throws(
    () =>
      assertTemplateCompatibility(
        { ...structured, template: { id: "TM-KHAC", version: "1" } },
        template,
      ),
    /JSON yêu cầu template/u,
  );
});

test("renderer tạo lệnh Python có đủ bốn đường dẫn", () => {
  const command = rendererCommand({
    inputPath: "input.json",
    templatePath: "template.json",
    referencePath: "reference.docx",
    outputPath: "output.docx",
    python: "python-test",
  });
  assert.equal(command.command, "python-test");
  assert.deepEqual(command.args.slice(-8), [
    "--input",
    "input.json",
    "--template",
    "template.json",
    "--reference",
    "reference.docx",
    "--output",
    "output.docx",
  ]);
});
