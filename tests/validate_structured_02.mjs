import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

const root = new URL("../", import.meta.url);
const read = (relativePath) => readFile(new URL(relativePath, root));
const loadJson = async (relativePath) => JSON.parse((await read(relativePath)).toString("utf8"));
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

test("structured_02 tổng quát hóa schema và giữ nguyên qd_021", async () => {
  const [schema, data, metadata, input, shortlistSource] = await Promise.all([
    loadJson("schemas/texmind-document.schema.json"),
    loadJson("dataset/van_ban_hanh_chinh/structured_02.json"),
    loadJson("dataset/van_ban_hanh_chinh/metadata_02.json"),
    read("dataset/van_ban_hanh_chinh/input_02.txt"),
    read("dataset/hf_quyet_dinh/shortlist_10/clean_text/qd_021.txt"),
  ]);
  const sourceText = input.toString("utf8");

  assert.deepEqual(validateAgainstSchema(schema, data), []);
  assert.equal(sha256(input), sha256(shortlistSource));
  assert.equal(data.sample_id, "qd_021");
  assert.equal(data.template, null);
  assert.equal(data.legal_bases.length, 10);
  assert.deepEqual(data.articles.map((article) => article.number), [1, 2, 3]);
  assert.ok(data.articles.every((article) => article.clauses.length === 1));
  assert.ok(data.articles.every((article) => article.clauses[0].number === null));
  assert.deepEqual(data.data_tables, []);
  assert.equal(data.recipients.length, 12);
  assert.equal(data.signature.delegation, null);
  assert.equal(data.signature.signer_name, "Đinh Khắc Huy");
  assert.equal(data.legal_effect.effective_from, "2023-10-12");

  for (const basis of data.legal_bases) assert.ok(sourceText.includes(basis));
  for (const article of data.articles) {
    assert.ok(sourceText.includes(`Điều ${article.number}. ${article.heading}`));
    assert.ok(sourceText.includes(article.clauses[0].text));
  }
  for (const recipient of data.recipients) assert.ok(sourceText.includes(recipient));
  for (const anomaly of data.provenance.source_anomalies) assert.ok(sourceText.includes(anomaly.source_text));

  assert.equal(metadata.input_file, "input_02.txt");
  assert.equal(metadata.structured_file, "structured_02.json");
  assert.equal(metadata.status, "structured_validated_no_docx");
});
