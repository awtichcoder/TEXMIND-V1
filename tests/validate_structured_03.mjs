import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

const root = new URL("../", import.meta.url);
const read = (relativePath) => readFile(new URL(relativePath, root));
const loadJson = async (relativePath) => JSON.parse((await read(relativePath)).toString("utf8"));
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const flattenClauses = (clauses) =>
  clauses.flatMap((clause) => [clause, ...flattenClauses(clause.children ?? [])]);

test("structured_03 hỗ trợ khoản lồng nhau, phụ lục và cảnh báo nguồn", async () => {
  const [schema, data, metadata, shortlistMetadata, input, shortlistSource] = await Promise.all([
    loadJson("schemas/texmind-document.schema.json"),
    loadJson("dataset/van_ban_hanh_chinh/structured_03.json"),
    loadJson("dataset/van_ban_hanh_chinh/metadata_03.json"),
    loadJson("dataset/hf_quyet_dinh/shortlist_10/metadata/qd_067.json"),
    read("dataset/van_ban_hanh_chinh/input_03.txt"),
    read("dataset/hf_quyet_dinh/shortlist_10/clean_text/qd_067.txt"),
  ]);
  const sourceText = input.toString("utf8");

  assert.deepEqual(validateAgainstSchema(schema, data), []);
  assert.equal(sha256(input), sha256(shortlistSource));
  assert.equal(data.sample_id, "qd_067");
  assert.equal(data.legal_bases.length, 9);
  assert.deepEqual(data.articles.map((article) => article.number), [1, 2, 3, 4, 5]);

  const article3 = data.articles.find((article) => article.number === 3);
  const nestedClauses = flattenClauses(article3.clauses);
  // Quy ước 20/11/2026: "(Phụ lục chi tiết kèm theo)" (không số, sau khoản 3) là con của khoản 3.
  assert.equal(article3.clauses.length, 4);
  assert.equal(article3.clauses.find((clause) => clause.number === "2").children.length, 9);
  assert.equal(
    article3.clauses.find((clause) => clause.number === "3").children.at(-1).text,
    "(Phụ lục chi tiết kèm theo)",
  );
  assert.equal(nestedClauses.length, 17);
  for (const clause of data.articles.flatMap((article) => flattenClauses(article.clauses))) {
    assert.ok(sourceText.includes(clause.text));
  }

  assert.equal(data.attachments.length, 12);
  assert.ok(data.attachments.every((attachment) => attachment.included_in_source === false));
  // Quy ước 19/11/2026: source_reference là vị trí "Điều X, khoản Y, điểm z" nơi nhắc tới phụ lục.
  for (const attachment of data.attachments) {
    assert.match(attachment.source_reference, /^Điều \d+(, khoản \d+(, điểm [a-zđ])?)?$/u);
  }
  assert.equal(data.attachments[0].source_reference, "Điều 3, khoản 1, điểm a");
  assert.equal(data.attachments.at(-1).source_reference, "Điều 3, khoản 3");
  assert.equal(data.recipients.length, 10);
  for (const recipient of data.recipients) assert.ok(sourceText.includes(recipient));
  assert.equal(data.signature.signer_name, "Vũ Thu Hà");

  assert.equal(data.legal_effect.effective_from, "2025-01-08");
  assert.equal(shortlistMetadata.effective_date, "08/01/2026");
  assert.equal(data.quality.source_consistency, "warning");
  assert.equal(data.quality.warnings.length, 3);
  for (const anomaly of data.provenance.source_anomalies) assert.ok(sourceText.includes(anomaly.source_text));

  assert.equal(metadata.input_file, "input_03.txt");
  assert.equal(metadata.structured_file, "structured_03.json");
  assert.equal(metadata.source_metadata_effective_date, "2026-01-08");
  assert.equal(metadata.source_text_effective_date, "2025-01-08");
});
