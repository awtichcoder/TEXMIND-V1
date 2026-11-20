import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateExtraction } from "../src/evaluate_structured.mjs";
import { normalizeExtraction } from "../src/normalize_extraction.mjs";

const goldUrl = new URL("../dataset/van_ban_hanh_chinh/structured_03.json", import.meta.url);
const qd067SourceUrl = new URL("../dataset/van_ban_hanh_chinh/input_03.txt", import.meta.url);
const qd014GoldUrl = new URL("../dataset/van_ban_hanh_chinh/structured_04.json", import.meta.url);
const qd014PredictionUrl = new URL("../outputs/qd_014.rerun.normalized.json", import.meta.url);
const qd067PredictionUrl = new URL("../outputs/qd_067.predicted.normalized.json", import.meta.url);
const qd021GoldUrl = new URL("../dataset/van_ban_hanh_chinh/structured_02.json", import.meta.url);
const qd021PredictionUrl = new URL("../outputs/qd_021.deepseek-v1.predicted.json", import.meta.url);
const qd010GoldUrl = new URL("../dataset/van_ban_hanh_chinh/structured_06.json", import.meta.url);
const qd010PredictionUrl = new URL(
  "../outputs/qd_010.deepseek-draft.predicted.json",
  import.meta.url,
);

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
  assert.equal(report.strict_evaluation.overall_score, 1);
  assert.equal(report.tolerant_evaluation.overall_score, 1);
  assert.deepEqual(report.warnings, []);
});

test("qd_014 giữ riêng điểm nghiêm ngặt và điểm dung sai", async () => {
  const [gold, prediction] = await Promise.all([
    readFile(qd014GoldUrl, "utf8").then(JSON.parse),
    readFile(qd014PredictionUrl, "utf8").then(JSON.parse),
  ]);
  const report = evaluateExtraction(gold, prediction, []);
  assert.equal(report.scoring_version, "2.1");
  assert.equal(report.clauses.matches, 28);
  assert.equal(report.tolerant_evaluation.clauses.matches, 29);
  assert.equal(report.diagnostics.clause_number_mismatches.length, 2);
  assert.ok(report.tolerant_evaluation.overall_score > report.strict_evaluation.overall_score);
  assert.ok(report.warnings.some((item) => item.code === "legal_bases_incomplete_or_changed"));
  assert.ok(report.warnings.some((item) => item.code === "clause_number_mismatch"));
});

test("qd_067: bộ chấm 2.1 bắt lỗi dòng ngày thiếu địa danh; chuẩn hóa theo nguồn sửa được", async () => {
  const [gold, prediction, sourceText] = await Promise.all([
    readFile(goldUrl, "utf8").then(JSON.parse),
    readFile(qd067PredictionUrl, "utf8").then(JSON.parse),
    readFile(qd067SourceUrl, "utf8"),
  ]);
  const report = evaluateExtraction(gold, prediction, []);
  assert.equal(prediction.header.issue_date_text, "ngày 29 tháng 12 năm 2025");
  assert.ok(report.strict_evaluation.overall_score < 1);
  // Bản dự đoán cũ ghi source_reference "Phụ lục N" (quy ước cũ) → lệch 12 phụ lục.
  assert.ok(report.warnings.some((item) => item.code === "attachment_mismatch" && item.count === 12));

  // Chuẩn hóa: khôi phục địa danh ở dòng ngày + đổi "Phụ lục N" thành vị trí duy nhất nhắc tới nó.
  const { normalized } = normalizeExtraction(prediction, { sampleId: "qd_067", sourceText });
  const fixed = evaluateExtraction(gold, normalized, []);
  assert.equal(fixed.strict_evaluation.overall_score, 1);
  assert.equal(fixed.tolerant_evaluation.overall_score, 1);
});

test("qd_021 tách riêng khác biệt dấu câu ở nơi nhận", async () => {
  const [gold, prediction] = await Promise.all([
    readFile(qd021GoldUrl, "utf8").then(JSON.parse),
    readFile(qd021PredictionUrl, "utf8").then(JSON.parse),
  ]);
  const report = evaluateExtraction(gold, prediction, []);
  assert.equal(report.recipients.matches, 2);
  assert.equal(report.tolerant_evaluation.recipients.matches, 12);
  // Bản DeepSeek cũ ghi source_reference theo quy ước cũ ("Ban hành kèm theo Quyết định này"),
  // gold nay là "Điều 1" → lệch phụ lục.
  assert.equal(prediction.attachments[0].source_reference, "Ban hành kèm theo Quyết định này");
  assert.equal(report.attachments.matches, 0);
  // Lệch dòng ngày (thiếu "Bình Thạnh, ") – lỗi mà bộ chấm 2.0 bỏ sót.
  assert.equal(report.tolerant_evaluation.scalar_accuracy, 14 / 15);
  assert.ok(report.warnings.some((item) => item.code === "attachment_mismatch"));
});

test("2.1: dòng ngày thiếu địa danh bị trừ điểm trường đơn", async () => {
  const gold = JSON.parse(await readFile(goldUrl, "utf8"));
  const prediction = structuredClone(gold);
  prediction.header.issue_date_text = prediction.header.issue_date_text.replace(/^[^,]+,\s*/u, "");
  assert.notEqual(prediction.header.issue_date_text, gold.header.issue_date_text);
  const report = evaluateExtraction(gold, prediction, []);
  assert.ok(report.strict_evaluation.scalar_accuracy < 1);
  assert.ok(report.strict_evaluation.overall_score < 1);
});

test("qd_010 cảnh báo số clause lệch và heading bị lặp thành clause", async () => {
  const [gold, prediction] = await Promise.all([
    readFile(qd010GoldUrl, "utf8").then(JSON.parse),
    readFile(qd010PredictionUrl, "utf8").then(JSON.parse),
  ]);
  const report = evaluateExtraction(gold, prediction, []);
  assert.deepEqual(report.diagnostics.clause_count, { expected: 1, actual: 4, difference: 3 });
  assert.equal(report.diagnostics.heading_duplicated_as_clause.length, 3);
  assert.ok(report.warnings.some((item) => item.code === "clause_count_mismatch"));
  assert.ok(report.warnings.some((item) => item.code === "heading_duplicated_as_clause"));
});
