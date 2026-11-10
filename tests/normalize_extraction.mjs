import assert from "node:assert/strict";
import test from "node:test";
import { normalizeExtraction } from "../src/normalize_extraction.mjs";

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
