import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tableShapeErrors } from "../src/data_tables.mjs";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

const root = new URL("../", import.meta.url);
const loadJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

test("structured_01 khớp schema và giữ đủ dữ liệu qd_066", async () => {
  const [schema, data, metadata, sourceText] = await Promise.all([
    loadJson("schemas/texmind-document.schema.json"),
    loadJson("dataset/van_ban_hanh_chinh/structured_01.json"),
    loadJson("dataset/van_ban_hanh_chinh/metadata_01.json"),
    readFile(new URL("dataset/van_ban_hanh_chinh/input_01.txt", root), "utf8"),
  ]);

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.deepEqual(validateAgainstSchema(schema, data), []);
  assert.equal(data.schema_version, "1.0");
  assert.equal(data.sample_id, "qd_066");
  assert.equal(data.document_type, "quyet_dinh");
  assert.equal(data.template.id, "TM-QD-001");
  assert.equal(data.source.preserve_original_content, true);
  assert.deepEqual(data.articles.map((article) => article.number), [1, 2, 3, 4]);

  // Bảng dạng tổng quát (19/11/2026): ô là chuỗi nguyên văn, null = ô gộp với ô phía trên.
  const table = data.data_tables.find((item) => item.table_id === "price_framework");
  assert.deepEqual(tableShapeErrors(table), []);
  assert.equal(table.unit, null);
  assert.deepEqual(table.header_rows, [
    ["Stt", "Loại Nhà ở xã hội", "Giá cho thuê tối thiểu", "Giá cho thuê tối đa"],
    [null, null, "(đồng/m² sàn sử dụng/tháng)", "(đồng/m² sàn sử dụng/tháng)"],
  ]);
  const priceRows = table.rows;
  assert.equal(priceRows.length, 8);
  assert.deepEqual(
    priceRows.map((row) => row[0]),
    ["1", "2", "3", "4", "5", null, "6", null],
  );
  assert.deepEqual(
    priceRows.flatMap((row) => [row[2], row[3]]),
    [
      "14.276", "30.915", "21.895", "47.413", "18.523", "40.092",
      "22.004", "47.621", "20.895", "45.250", "24.428", "52.899",
      "26.898", "58.289", "28.770", "62.345",
    ],
  );
  for (const cell of [...table.header_rows, ...table.rows].flat()) {
    if (cell !== null) assert.ok(sourceText.includes(cell), `ô "${cell}" không có nguyên văn trong nguồn`);
  }

  for (const article of data.articles) {
    assert.match(sourceText, new RegExp(`Điều ${article.number}\\. ${article.heading}`));
    for (const clause of article.clauses) assert.ok(sourceText.includes(clause.text));
  }
  for (const recipient of data.recipients) assert.ok(sourceText.includes(recipient));

  assert.equal(data.recipients.length, 9);
  assert.equal(data.signature.signer_name, "Nguyễn Hữu Quế");
  assert.equal(data.legal_effect.effective_from, "2025-12-10");
  assert.equal(data.quality.legal_review_status, "not_expert_reviewed");
  assert.equal(metadata.structured_file, "structured_01.json");
  assert.equal(metadata.schema_file, "../../schemas/texmind-document.schema.json");
});
