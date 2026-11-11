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

test("structured_04 hỗ trợ văn bản không có nơi nhận", async () => {
  const [schema, data, metadata, shortlistMetadata, input, shortlistSource] = await Promise.all([
    loadJson("schemas/texmind-document.schema.json"),
    loadJson("dataset/van_ban_hanh_chinh/structured_04.json"),
    loadJson("dataset/van_ban_hanh_chinh/metadata_04.json"),
    loadJson("dataset/hf_quyet_dinh/shortlist_10/metadata/qd_014.json"),
    read("dataset/van_ban_hanh_chinh/input_04.txt"),
    read("dataset/hf_quyet_dinh/shortlist_10/clean_text/qd_014.txt"),
  ]);
  const sourceText = input.toString("utf8");

  assert.deepEqual(validateAgainstSchema(schema, data), []);
  assert.equal(sha256(input), sha256(shortlistSource));
  assert.equal(data.sample_id, "qd_014");
  assert.equal(data.legal_bases.length, 4);
  assert.deepEqual(data.articles.map((article) => article.number), [1, 2, 3, 4, 5, 6]);
  assert.equal(data.articles.find((article) => article.number === 2).clauses.length, 15);

  const article3 = data.articles.find((article) => article.number === 3);
  assert.equal(article3.clauses.length, 2);
  assert.ok(article3.clauses.every((clause) => clause.children.length === 2));

  const clauses = data.articles.flatMap((article) => flattenClauses(article.clauses));
  assert.equal(clauses.length, 29);
  for (const clause of clauses) assert.ok(sourceText.includes(clause.text));

  assert.deepEqual(data.recipients, []);
  assert.equal(data.signature.signer_name, "Lữ Quang Ngời");
  assert.equal(data.legal_effect.effective_from, "2025-09-03");
  for (const reference of data.legal_effect.supersedes) assert.ok(sourceText.includes(reference));
  for (const anomaly of data.provenance.source_anomalies) assert.ok(sourceText.includes(anomaly.source_text));

  assert.equal(shortlistMetadata.document_number, "'40/2025/QĐ-UBND");
  assert.equal(data.header.document_number, "40/2025/QĐ-UBND");
  assert.equal(metadata.input_file, "input_04.txt");
  assert.equal(metadata.structured_file, "structured_04.json");
});
