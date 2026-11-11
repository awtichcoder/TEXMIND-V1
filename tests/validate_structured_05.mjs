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

test("structured_05 giữ cấu trúc rà soát và bốn danh mục tham chiếu của qd_030", async () => {
  const [schema, data, metadata, input, shortlistSource] = await Promise.all([
    loadJson("schemas/texmind-document.schema.json"),
    loadJson("dataset/van_ban_hanh_chinh/structured_05.json"),
    loadJson("dataset/van_ban_hanh_chinh/metadata_05.json"),
    read("dataset/van_ban_hanh_chinh/input_05.txt"),
    read("dataset/hf_quyet_dinh/shortlist_10/clean_text/qd_030.txt"),
  ]);
  const sourceText = input.toString("utf8");

  assert.deepEqual(validateAgainstSchema(schema, data), []);
  assert.equal(sha256(input), sha256(shortlistSource));
  assert.equal(data.sample_id, "qd_030");
  assert.equal(data.source.source_id, "158971");
  assert.equal(data.source.dataset, "th1nhng0/vietnamese-legal-documents");
  assert.equal(data.source.license, "CC BY 4.0");
  assert.equal(data.source.input_file, "input_05.txt");
  assert.equal(data.legal_bases.length, 5);
  assert.deepEqual(data.articles.map((article) => article.number), [1, 2, 3, 4]);
  assert.equal(flattenClauses(data.articles.flatMap((article) => article.clauses)).length, 14);
  assert.equal(data.attachments.length, 4);
  assert.ok(data.attachments.every((item) => item.included_in_source === false));
  assert.deepEqual(data.recipients, []);
  assert.equal(data.signature.delegation, "KT. CHỦ TỊCH");
  assert.equal(data.signature.signer_name, "Võ Văn Cảnh");
  assert.equal(data.legal_effect.effective_from, "2023-01-13");

  for (const basis of data.legal_bases) assert.ok(sourceText.includes(basis));
  for (const article of data.articles) {
    assert.ok(sourceText.includes(`Điều ${article.number}. ${article.heading}`));
    for (const clause of flattenClauses(article.clauses)) assert.ok(sourceText.includes(clause.text));
  }
  for (const attachment of data.attachments) assert.ok(sourceText.includes(attachment.title));
  for (const anomaly of data.provenance.source_anomalies) assert.ok(sourceText.includes(anomaly.source_text));

  assert.equal(metadata.input_file, "input_05.txt");
  assert.equal(metadata.structured_file, "structured_05.json");
  assert.equal(metadata.status, "structured_validated_no_docx");
});
