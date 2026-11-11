import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeExtractionDiff,
  classifyTextDifference,
  normalizeFormatting,
} from "../src/analyze_extraction_diff.mjs";

test("phân biệt khớp tuyệt đối, khác định dạng và sai nội dung", () => {
  assert.equal(classifyTextDifference("Vị trí, chức năng", "Vị trí, chức năng").status, "exact");
  assert.equal(classifyTextDifference("Vị trí, chức năng", "VỊ TRÍ CHỨC NĂNG").status, "formatting_only");
  assert.equal(classifyTextDifference("Vị trí, chức năng", "Cơ cấu tổ chức").status, "content_mismatch");
  assert.equal(classifyTextDifference("Vị trí, chức năng", undefined).status, "missing");
  assert.equal(classifyTextDifference(null, null).status, "exact");
  assert.equal(normalizeFormatting("  QUYẾT ĐỊNH;  "), "quyết định");
});

test("báo cáo trùng gold đạt 100% nghiêm ngặt", async () => {
  const gold = JSON.parse(
    await readFile(new URL("../dataset/van_ban_hanh_chinh/structured_04.json", import.meta.url), "utf8"),
  );
  const report = analyzeExtractionDiff(gold, structuredClone(gold));
  assert.equal(report.summary.article_headings.strict_accuracy, 1);
  assert.equal(report.summary.legal_bases.strict_accuracy, 1);
  assert.equal(report.summary.clauses.strict_accuracy, 1);
  assert.equal(report.summary.clauses.expected_total, 29);
});

test("qd_014 căn khoản theo cấu trúc thay vì tiêu đề điều", async () => {
  const [gold, prediction] = await Promise.all([
    readFile(new URL("../dataset/van_ban_hanh_chinh/structured_04.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../outputs/qd_014.rerun.normalized.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const report = analyzeExtractionDiff(gold, prediction);
  assert.equal(report.summary.article_headings.expected_total, 6);
  assert.equal(report.summary.legal_bases.expected_total, 4);
  assert.equal(report.summary.clauses.expected_total, 29);
  assert.equal(report.summary.clauses.actual_total, 29);
  assert.equal(report.summary.clauses.missing, 0);
  assert.equal(report.summary.clauses.extra, 0);
  assert.ok(report.summary.clauses.exact > 0);
  assert.ok(report.details.legal_bases.some((item) => item.key === "expected_3_actual_3"));
  assert.ok(report.details.legal_bases.some((item) => item.key === "expected_4" && item.status === "missing"));
});
