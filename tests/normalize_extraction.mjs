import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeExtraction } from "../src/normalize_extraction.mjs";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

test("chuẩn hóa sample_id và vị trí phụ lục theo dạng 'Điều X, khoản Y, điểm z'", () => {
  const candidate = {
    sample_id: "vi_001",
    articles: [
      {
        number: 3,
        heading: "Nội dung",
        clauses: [
          {
            number: "1",
            text: "Nhóm dịch vụ:",
            children: [
              { number: "a", text: "Dịch vụ A (Phụ lục 2)." },
              { number: "b", text: "Dịch vụ B (Phụ lục 10)." },
            ],
          },
        ],
      },
    ],
    attachments: [
      { id: "pl2", title: "Phụ lục 2", source_reference: "Phụ lục 2" },
      { id: "phu_luc_10", title: "Tên phụ lục", source_reference: "Điều 3 khoản 1 điểm b" },
      { id: "pl_chi_tiet", title: "Phụ lục chi tiết kèm theo", source_reference: "Điều 3" },
      { id: "khong_ro", title: "Phụ lục 7", source_reference: "Phụ lục 7" },
    ],
    provenance: {},
    quality: { extraction_status: "verified" },
  };

  const { normalized, changes } = normalizeExtraction(candidate, { sampleId: "qd_067" });

  assert.equal(normalized.sample_id, "qd_067");
  // "Phụ lục 2" chỉ được nhắc ở Điều 3, khoản 1, điểm a (không nhầm với "Phụ lục 10").
  assert.equal(normalized.attachments[0].source_reference, "Điều 3, khoản 1, điểm a");
  assert.equal(normalized.attachments[1].source_reference, "Điều 3, khoản 1, điểm b");
  assert.equal(normalized.attachments[2].source_reference, "Điều 3");
  // Không có chỗ nào nhắc "Phụ lục 7" → giữ nguyên, không đoán.
  assert.equal(normalized.attachments[3].source_reference, "Phụ lục 7");
  assert.equal(candidate.sample_id, "vi_001", "không được sửa object đầu vào");
  assert.deepEqual(
    changes.map((change) => change.rule),
    [
      "sample_id_from_job_context",
      "attachment_location_from_unique_mention",
      "canonical_attachment_location_format",
    ],
  );
});

test("đoạn không số: nguồn có '-' → number '-', nguồn không ký hiệu → null", () => {
  const sourceText = ["Điều 1. Nội dung", "- Mục có gạch đầu dòng", "Đoạn không ký hiệu"].join("\n");
  const candidate = {
    articles: [
      {
        number: 1,
        heading: "Nội dung",
        clauses: [
          { number: null, text: "Mục có gạch đầu dòng" },
          { number: "-", text: "Đoạn không ký hiệu" },
        ],
      },
    ],
  };
  const { normalized, changes } = normalizeExtraction(candidate, { sourceText });
  assert.equal(normalized.articles[0].clauses[0].number, "-");
  assert.equal(normalized.articles[0].clauses[1].number, null);
  assert.equal(changes.filter((change) => change.rule === "unnumbered_paragraph_marker_from_source").length, 2);
});

test("ô bảng nghi lỗi gõ được giữ nguyên văn và thêm cảnh báo một lần", () => {
  const candidate = {
    quality: { extraction_status: "verified", warnings: [] },
    data_tables: [
      {
        table_id: "t1",
        title: "Bảng",
        unit: null,
        header_rows: [["Loại", "Giá"]],
        rows: [["A", "1. 200"], ["B", "13. 500"], ["C", "1.200"], ["D", "1. 200"]],
      },
    ],
  };
  const { normalized } = normalizeExtraction(candidate);
  assert.deepEqual(normalized.data_tables[0].rows[0], ["A", "1. 200"], "không sửa ô");
  assert.equal(normalized.quality.warnings.length, 2);
  assert.ok(normalized.quality.warnings[0].includes('"1. 200"'));
  assert.ok(normalized.quality.warnings[1].includes('"13. 500"'));
  const again = normalizeExtraction(normalized);
  assert.equal(again.normalized.quality.warnings.length, 2, "không thêm trùng cảnh báo");
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

test("di chuyển provenance.quality khi quality gốc bị thiếu", () => {
  const misplacedQuality = {
    extraction_status: "verified",
    content_status: "source_preserved",
    legal_review_status: "not_expert_reviewed",
    warnings: ["Chưa kiểm duyệt pháp lý."],
  };
  const result = normalizeExtraction({
    sample_id: "qd_014",
    provenance: {
      normalizations: [],
      source_anomalies: [],
      quality: structuredClone(misplacedQuality),
    },
  });

  assert.deepEqual(result.normalized.quality, misplacedQuality);
  assert.equal(Object.hasOwn(result.normalized.provenance, "quality"), false);
  assert.equal(result.changes[0].rule, "move_provenance_quality_to_root_when_missing");
});

test("chuyển TM. từ delegation sang authority theo quy ước dữ liệu", () => {
  const result = normalizeExtraction({
    signature: {
      authority: "ỦY BAN NHÂN DÂN",
      delegation: "TM.",
      position: "CHỦ TỊCH",
    },
  });

  assert.equal(result.normalized.signature.authority, "TM. ỦY BAN NHÂN DÂN");
  assert.equal(result.normalized.signature.delegation, null);
  assert.deepEqual(
    result.changes.map((change) => change.rule),
    ["move_tm_prefix_from_delegation_to_authority", "clear_delegation_after_tm_prefix_move"],
  );
});

test("chỉ xóa provenance.source_consistency khi trùng quality", () => {
  const duplicate = normalizeExtraction({
    provenance: { source_consistency: "warning" },
    quality: { source_consistency: "warning" },
  });
  assert.equal(Object.hasOwn(duplicate.normalized.provenance, "source_consistency"), false);
  assert.equal(duplicate.changes[0].rule, "remove_exact_duplicate_provenance_source_consistency");

  const conflicting = normalizeExtraction({
    provenance: { source_consistency: "passed" },
    quality: { source_consistency: "warning" },
  });
  assert.equal(conflicting.normalized.provenance.source_consistency, "passed");
  assert.equal(conflicting.changes.length, 0);
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
  // 11 = 10 luật cũ + signed_status "Đã ký" → "(Đã ký)" nguyên văn nguồn (quy ước 19/11/2026).
  assert.equal(normalized.signature.signed_status, "(Đã ký)");
  assert.equal(changes.length, 11);
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

test("khôi phục địa danh ở dòng ngày khi nguồn có đúng dòng đó", async () => {
  const [gold, sourceText] = await Promise.all([
    readFile(new URL("../dataset/samples/qd_021/gold.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../dataset/samples/qd_021/source.txt", import.meta.url), "utf8"),
  ]);
  const candidate = structuredClone(gold);
  candidate.header.issue_date_text = "ngày 5 tháng 10 năm 2023";
  const { normalized, changes } = normalizeExtraction(candidate, { sampleId: "qd_021", sourceText });
  assert.equal(normalized.header.issue_date_text, "Bình Thạnh, ngày 5 tháng 10 năm 2023");
  assert.ok(changes.some((change) => change.rule === "issue_date_text_keeps_place_from_source_line"));

  // Đã đúng thì không đổi; nguồn không có dòng khớp thì không tự ghép địa danh.
  assert.equal(
    normalizeExtraction(gold, { sampleId: "qd_021", sourceText }).changes.some(
      (change) => change.rule === "issue_date_text_keeps_place_from_source_line",
    ),
    false,
  );
  const noPlace = normalizeExtraction(candidate, { sampleId: "qd_021", sourceText: "ngày 5 tháng 10 năm 2023" });
  assert.equal(noPlace.normalized.header.issue_date_text, "ngày 5 tháng 10 năm 2023");
});

test("bỏ dấu dính vào ký hiệu khoản/điểm và xóa đoạn lặp nguyên tiêu đề điều", () => {
  const candidate = {
    articles: [
      {
        number: 1,
        heading: "Quyết định này có hiệu lực từ ngày 24 tháng 3 năm 2025.",
        clauses: [{ number: null, text: "Quyết định này có hiệu lực từ ngày 24 tháng 3 năm 2025." }],
      },
      {
        number: 3,
        heading: "Trách nhiệm thi hành",
        clauses: [
          { number: "a)", text: "Chánh Văn phòng thi hành." },
          { number: "2.", text: "Khoản hai.", children: [{ number: "b)", text: "Điểm b." }] },
          { number: null, text: "Đoạn khác tiêu đề." },
        ],
      },
    ],
  };
  const { normalized, changes } = normalizeExtraction(candidate);
  assert.deepEqual(normalized.articles[0].clauses, []);
  assert.equal(normalized.articles[1].clauses[0].number, "a");
  assert.equal(normalized.articles[1].clauses[1].number, "2");
  assert.equal(normalized.articles[1].clauses[1].children[0].number, "b");
  assert.equal(normalized.articles[1].clauses.length, 3, "chỉ xóa đoạn trùng nguyên văn tiêu đề");
  assert.equal(changes.filter((c) => c.rule === "strip_marker_punctuation_from_clause_number").length, 3);
  assert.equal(changes.filter((c) => c.rule === "remove_clause_duplicating_article_heading").length, 1);
});

test("signed_status lấy nguyên văn dòng ký; nguồn không có → null + một cảnh báo chuẩn", async () => {
  const { SIGNED_STATUS_MISSING_WARNING, sourceSignedStatusLines } = await import("../src/normalize_extraction.mjs");
  assert.deepEqual(sourceSignedStatusLines("KT. CHỦ TỊCH\n(đã ký)\nTên"), ["(đã ký)"]);
  assert.deepEqual(sourceSignedStatusLines("Ký hiệu: ABC\nTên"), []);

  const base = { signature: { signed_status: "Đã ký" }, quality: { warnings: [] } };
  const withLine = normalizeExtraction(base, { sourceText: "PHÓ CHỦ TỊCH\n(Đã ký)\nNguyễn Văn A" });
  assert.equal(withLine.normalized.signature.signed_status, "(Đã ký)");

  const noLine = normalizeExtraction(
    {
      signature: { signed_status: "Không được thể hiện trong nguồn" },
      quality: { warnings: ["Nguồn không thể hiện trạng thái ký; signed_status được ghi nhận bằng giá trị khác.", "Cảnh báo khác."] },
    },
    { sourceText: "PHÓ CHỦ TỊCH\nNguyễn Văn A" },
  );
  assert.equal(noLine.normalized.signature.signed_status, null);
  assert.deepEqual(noLine.normalized.quality.warnings, ["Cảnh báo khác.", SIGNED_STATUS_MISSING_WARNING]);
  const again = normalizeExtraction(noLine.normalized, { sourceText: "PHÓ CHỦ TỊCH\nNguyễn Văn A" });
  assert.equal(again.changes.length, 0, "chạy lại không đổi gì");
});

test("supersedes chỉ giữ văn bản cụ thể; bỏ câu chung chung không thêm cảnh báo", () => {
  const { normalized } = normalizeExtraction({
    legal_effect: {
      supersedes: [
        "các quyết định trước đây trái với Quyết định này",
        "Quyết định số 04/2017/QĐ-UBND ngày 23 tháng 01 năm 2017",
        "Những quy định trước đây trái với Quyết định này",
        "Các văn bản số 12/2010/QĐ-UB và 13/2010/QĐ-UB",
      ],
    },
    quality: { warnings: [] },
  });
  assert.deepEqual(normalized.legal_effect.supersedes, [
    "Quyết định số 04/2017/QĐ-UBND ngày 23 tháng 01 năm 2017",
    "Các văn bản số 12/2010/QĐ-UB và 13/2010/QĐ-UB",
  ]);
  assert.deepEqual(normalized.quality.warnings, []);
});
