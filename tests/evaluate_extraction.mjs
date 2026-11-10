import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateExtraction } from "../src/evaluate_structured.mjs";

const goldUrl = new URL("../dataset/van_ban_hanh_chinh/structured_03.json", import.meta.url);

test("bộ chấm điểm trả 100% khi dự đoán trùng mẫu chuẩn", async () => {
  const gold = JSON.parse(await readFile(goldUrl, "utf8"));
  const report = evaluateExtraction(gold, structuredClone(gold), []);
  assert.equal(report.schema_valid, true);
  assert.equal(report.scalar_accuracy, 1);
  assert.equal(report.article_headings.f1, 1);
  assert.equal(report.legal_bases.f1, 1);
  assert.equal(report.clauses.f1, 1);
  assert.equal(report.recipients.f1, 1);
  assert.equal(report.attachments.f1, 1);
  assert.equal(report.overall_score, 1);
});
