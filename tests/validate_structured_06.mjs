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

test("structured_06 giữ nguyên đoạn thi hành không có số điều của qd_010", async () => {
  const [schema, data, metadata, input, shortlistSource] = await Promise.all([
    loadJson("schemas/texmind-document.schema.json"),
    loadJson("dataset/van_ban_hanh_chinh/structured_06.json"),
    loadJson("dataset/van_ban_hanh_chinh/metadata_06.json"),
    read("dataset/van_ban_hanh_chinh/input_06.txt"),
    read("dataset/hf_quyet_dinh/shortlist_10/clean_text/qd_010.txt"),
  ]);
  const sourceText = input.toString("utf8");

  assert.deepEqual(validateAgainstSchema(schema, data), []);
  assert.equal(sha256(input), sha256(shortlistSource));
  assert.equal(data.sample_id, "qd_010");
  assert.equal(data.source.source_id, "168554");
  assert.equal(data.source.dataset, "th1nhng0/vietnamese-legal-documents");
  assert.equal(data.source.license, "CC BY 4.0");
  assert.equal(data.source.input_file, "input_06.txt");
  assert.equal(data.legal_bases.length, 8);
  assert.deepEqual(data.articles.map((article) => article.number), [1, 2, 3]);

  const clauses = data.articles.flatMap((article) => flattenClauses(article.clauses));
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].number, null);
  assert.match(clauses[0].text, /^Bộ trưởng các Bộ:/u);
  assert.ok(sourceText.includes(clauses[0].text));

  assert.equal(data.recipients.length, 19);
  assert.equal(data.signature.signer_name, "Nguyễn Xuân Phúc");
  assert.equal(data.legal_effect.effective_from, "2017-11-15");
  assert.equal(data.attachments.length, 0);
  for (const basis of data.legal_bases) assert.ok(sourceText.includes(basis));
  for (const article of data.articles) assert.ok(sourceText.includes(`Điều ${article.number}. ${article.heading}`));
  for (const recipient of data.recipients) assert.ok(sourceText.includes(recipient));
  for (const anomaly of data.provenance.source_anomalies) assert.ok(sourceText.includes(anomaly.source_text));

  assert.equal(metadata.input_file, "input_06.txt");
  assert.equal(metadata.structured_file, "structured_06.json");
  assert.equal(metadata.status, "structured_validated_no_docx");
});
