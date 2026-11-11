import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeExtraction } from "../src/normalize_extraction.mjs";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

test("chuẩn hóa sample_id và tham chiếu phụ lục theo quy tắc xác định", () => {
  const candidate = {
    sample_id: "vi_001",
    attachments: [
      {
        id: "pl2",
        title: "Phụ lục 2",
        source_reference: "Điều 3 khoản 1 điểm a",
      },
      {
        id: "phu_luc_03",
        title: "Tên phụ lục",
        source_reference: "Điều 3 khoản 1 điểm b",
      },
      {
        id: "pl_chi_tiet",
        title: "Phụ lục chi tiết kèm theo",
        source_reference: "Điều 3",
      },
    ],
    provenance: {},
    quality: { extraction_status: "verified" },
  };

  const { normalized, changes } = normalizeExtraction(candidate, { sampleId: "qd_067" });

  assert.equal(normalized.sample_id, "qd_067");
  assert.equal(normalized.attachments[0].source_reference, "Phụ lục 2");
  assert.equal(normalized.attachments[1].source_reference, "Phụ lục 3");
  assert.equal(normalized.attachments[2].source_reference, "Điều 3");
  assert.equal(candidate.sample_id, "vi_001", "không được sửa object đầu vào");
  assert.deepEqual(
    changes.map((change) => change.rule),
    [
      "sample_id_from_job_context",
      "canonical_numbered_appendix_reference",
      "canonical_numbered_appendix_reference",
    ],
  );
});

test("chỉ xóa provenance.quality khi trùng chính xác quality gốc", () => {
  const quality = { extraction_status: "verified", warnings: [] };
  const duplicate = normalizeExtraction({
    sample_id: "qd_067",
    provenance: { quality: structuredClone(quality) },
    quality,
  });
  assert.equal(Object.hasOwn(duplicate.normalized.provenance, "quality"), false);
  assert.equal(duplicate.changes[0].rule, "remove_exact_duplicate_provenance_quality");

  const different = normalizeExtraction({
    sample_id: "qd_067",
    provenance: { quality: { extraction_status: "different" } },
    quality,
  });
  assert.equal(Object.hasOwn(different.normalized.provenance, "quality"), true);
  assert.equal(different.changes.length, 0);
});

test("sửa có kiểm soát các lỗi schema của bản raw qd_014 từ ngữ cảnh nguồn", async () => {
  const [candidate, schema, sourceText] = await Promise.all([
    readFile("outputs/qd_014.predicted.raw.json", "utf8").then(JSON.parse),
    readFile("schemas/texmind-document.schema.json", "utf8").then(JSON.parse),
    readFile("dataset/van_ban_hanh_chinh/input_04.txt", "utf8"),
  ]);

  const { normalized, changes } = normalizeExtraction(candidate, {
    sampleId: "qd_014",
    sourceText,
  });

  assert.deepEqual(validateAgainstSchema(schema, normalized), []);
  assert.deepEqual(normalized.data_tables, []);
  assert.deepEqual(normalized.recipients, []);
  assert.equal(normalized.header.motto, "Độc lập – Tự do – Hạnh phúc");
  assert.ok(normalized.legal_effect.review_note.includes("chưa được chuyên gia pháp lý kiểm duyệt"));
  assert.ok(normalized.articles.every((article) => Array.isArray(article.related_table_ids)));
  assert.equal(changes.length, 10);
  assert.equal(candidate.recipients.length, 4, "không được sửa object đầu vào");
});

test("không tự đoán mảng rỗng khi nguồn có tín hiệu bảng hoặc nơi nhận", () => {
  const candidate = {
    articles: [{ number: 1, heading: "Bảng giá", clauses: [] }],
    recipients: ["Sở Tài chính"],
  };
  const sourceText = "BẢNG GIÁ DỊCH VỤ\nĐơn vị tính: đồng\nNơi nhận:\n- Sở Tài chính;";

  const { normalized, changes } = normalizeExtraction(candidate, { sourceText });

  assert.equal(Object.hasOwn(normalized, "data_tables"), false);
  assert.equal(Object.hasOwn(normalized.articles[0], "related_table_ids"), false);
  assert.deepEqual(normalized.recipients, ["Sở Tài chính"]);
  assert.deepEqual(changes, []);
});
