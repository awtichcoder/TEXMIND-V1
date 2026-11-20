import { suspiciousNumberCells, suspiciousNumberWarning } from "./data_tables.mjs";

const normalizedText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const appendixNumber = (attachment) => {
  const candidates = [attachment?.title, attachment?.id];
  const patterns = [
    /^Phụ\s+lục\s+0*([1-9]\d*)$/iu,
    /^(?:phu_luc_|appendix_|pl)0*([1-9]\d*)$/iu,
  ];

  for (const candidate of candidates) {
    const value = normalizedText(candidate);
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return null;
};

const exactJsonMatch = (left, right) => JSON.stringify(left) === JSON.stringify(right);

// "Điều 1 khoản 1 điểm a", "khoản 2 Điều 4", "Điều 3, khoản 1" → "Điều X, khoản Y, điểm z".
// Trả null nếu chuỗi không chỉ gồm điều/khoản/điểm (vd "Phụ lục 2", "Ban hành kèm theo ...").
export function canonicalLocation(value) {
  const text = normalizedText(value);
  if (!text) return null;
  const article = text.match(/(?:^|[\s,])Điều\s+(\d+)(?=$|[\s,])/iu);
  if (!article) return null;
  const clause = text.match(/(?:^|[\s,])khoản\s+(\d+)(?=$|[\s,])/iu);
  const point = text.match(/(?:^|[\s,])điểm\s+([a-zđ])(?=$|[\s,])/iu);
  const rest = text
    .replace(/Điều\s+\d+/iu, "")
    .replace(/khoản\s+\d+/iu, "")
    .replace(/điểm\s+[a-zđ](?=$|[\s,])/iu, "")
    .replace(/[\s,]+/gu, "");
  if (rest) return null;
  return [`Điều ${article[1]}`, clause && `khoản ${clause[1]}`, point && `điểm ${point[1].toLowerCase()}`]
    .filter(Boolean)
    .join(", ");
}

// Quy ước 20/11/2026: đoạn không số (number=null) đứng ngay sau một khoản có số – trước khoản kế tiếp
// hoặc ở cuối điều – là CON của khoản đó. Đoạn không số trước khoản số đầu tiên, hoặc ở điều không có
// khoản số, giữ ở cấp điều. Trả về số đoạn đã chuyển (sửa trực tiếp mảng clauses của từng điều).
export function nestUnnumberedParagraphs(articles) {
  const moved = [];
  for (const article of articles ?? []) {
    if (!Array.isArray(article.clauses)) continue;
    const kept = [];
    let parent = null;
    for (const clause of article.clauses) {
      if (typeof clause.number === "string" && /^\d+$/u.test(clause.number)) {
        parent = clause;
        kept.push(clause);
      } else if (clause.number === null && parent) {
        parent.children = [...(parent.children ?? []), clause];
        moved.push({ article: article.number, clause: parent.number, text: clause.text });
      } else {
        kept.push(clause);
      }
    }
    article.clauses = kept;
  }
  return moved;
}

// Ghi chú lỗi thời về thông tin quản lý dữ liệu (bộ dữ liệu, giấy phép, tên tệp, source_id)
// – chỉ đúng khi khối source chưa được điền từ metadata.
export function isStaleSourceMetadataNote(text) {
  const value = normalizedText(text);
  const aboutSourceInfo =
    /(bộ dữ liệu|dataset|giấy phép|license|tên tệp|input_file|source_id|mã nguồn riêng|mã định danh)/iu.test(value);
  const saysMissing = /(không\s+(được\s+)?(cung cấp|có|thể hiện)|thiếu)/iu.test(value);
  return aboutSourceInfo && saysMissing;
}

export const SIGNED_STATUS_MISSING_WARNING =
  "Nguồn không có dòng ký (kiểu \"(Đã ký)\"); signature.signed_status = null.";

// Các dòng ký trong nguồn: "(Đã ký)", "(đã ký)", "(Đã ký và đóng dấu)", "Đã ký"... (giá trị khác nhau, nguyên văn).
export function sourceSignedStatusLines(sourceText) {
  const lines = String(sourceText ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^\((?:đã\s+)?ký[^()]{0,40}\)$/iu.test(line) || /^đã\s+ký$/iu.test(line));
  return [...new Set(lines)];
}

// Câu chung chung không chỉ ra văn bản cụ thể: bắt đầu bằng "các/những/mọi/tất cả" và không có số hiệu.
export const isGenericSupersedes = (value) => {
  const text = normalizedText(value);
  return /^(?:các|những|mọi|tất\s+cả)\s/iu.test(text) && !/\d/u.test(text);
};

// "Phụ lục 2" / "Phụ lục V" từ source_reference, title hoặc id (phu_luc_2, appendix_02...).
const appendixLabel = (attachment) => {
  for (const candidate of [attachment?.source_reference, attachment?.title]) {
    const match = normalizedText(candidate).match(/^Phụ\s+lục\s+0*([1-9]\d*|[IVXLC]+)$/iu);
    if (match) return `Phụ lục ${match[1]}`;
  }
  const number = appendixNumber(attachment);
  return number === null ? null : `Phụ lục ${number}`;
};

export function* walkClauses(clauses, location, path) {
  for (const [index, clause] of (clauses ?? []).entries()) {
    const number = clause.number === null || clause.number === undefined ? null : String(clause.number);
    let here = location;
    if (number && /^\d+$/u.test(number)) here = `${location}, khoản ${number}`;
    else if (number && /^[a-zđ]$/iu.test(number)) here = `${location}, điểm ${number.toLowerCase()}`;
    const clausePath = `${path}[${index}]`;
    yield { clause, location: here, path: clausePath };
    yield* walkClauses(clause.children, here, `${clausePath}.children`);
  }
}

const flattenClauses = (clauses, path) => [...walkClauses(clauses, "", path)];

// Vị trí duy nhất (điều/khoản/điểm) nhắc tới nhãn; nhiều chỗ khác nhau hoặc không có → null.
export function locateUniqueMention(document, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`${escaped}(?![\\dA-Za-z])`, "iu");
  const locations = new Set();
  for (const article of document.articles ?? []) {
    const base = `Điều ${article.number}`;
    if (pattern.test(article.heading ?? "")) locations.add(base);
    for (const { clause, location } of walkClauses(article.clauses, base, "")) {
      if (pattern.test(clause.text ?? "")) locations.add(location);
    }
  }
  return locations.size === 1 ? [...locations][0] : null;
}

// Ký hiệu đứng trước đoạn văn trong nguồn ("" nếu không có); null nếu không tìm được đúng một dòng.
const sourcePrefixOf = (sourceLines, text) => {
  const target = normalizedText(text);
  if (!target) return null;
  const matches = sourceLines.filter((line) => line.endsWith(target));
  if (matches.length !== 1) return null;
  return normalizedText(matches[0].slice(0, matches[0].length - target.length));
};

const DEFAULT_REVIEW_NOTE =
  "Trích xuất tự động từ nội dung nguồn; chưa được chuyên gia pháp lý kiểm duyệt và không dùng thay tư vấn pháp lý.";

const sourceMotto = (sourceText) =>
  String(sourceText ?? "").match(/Độc\s+lập\s*[–—-]\s*Tự\s+do\s*[–—-]\s*Hạnh\s+phúc/iu)?.[0] ?? null;

const hasRecipientHeading = (sourceText) =>
  /(?:^|\n)\s*Nơi\s+(?:nhận|gửi)\s*:/imu.test(String(sourceText ?? ""));

const hasDataTableSignal = (sourceText) =>
  /(?:^|\n)\s*(?:Bảng\b|Đơn\s+vị\s+tính\s*:)|<\/?(?:table|thead|tbody|tr|th|td)\b|\|[^\n]+\|/imu.test(
    String(sourceText ?? ""),
  );

// Tìm dòng nguồn có dạng "<địa danh>, <issue_date_text>" (vd. "Bình Thạnh, ngày 5 tháng 10 năm 2023")
// khi AI chỉ giữ phần "ngày ...". Chỉ trả về khi dòng đó có trong nguồn, không tự ghép.
export const sourceDateLineWithPlace = (sourceText, issueDateText) => {
  const dateText = normalizedText(issueDateText);
  if (!sourceText || !dateText || !/^ngày\b/iu.test(dateText)) return null;
  for (const rawLine of String(sourceText).split(/\r?\n/u)) {
    const line = normalizedText(rawLine);
    if (line === dateText || !line.endsWith(dateText)) continue;
    const prefix = line.slice(0, line.length - dateText.length);
    if (/^[^,]{1,60},\s*$/u.test(prefix)) return line;
  }
  return null;
};

const recordChange = (changes, rule, path, before, after) => {
  changes.push({ rule, path, before: before ?? null, after });
};

// Thông tin nguồn của mẫu (không có trong văn bản) lấy từ dataset/samples/<mã>/metadata.json.
export function sourceInfoFromMetadata(metadata) {
  if (!metadata) return null;
  return {
    source_id: metadata.source_id ?? null,
    dataset: metadata.source_dataset ?? null,
    license: metadata.license ?? null,
    input_file: metadata.input_file ?? null,
  };
}

export function normalizeExtraction(candidate, { sampleId = null, sourceText = null, sourceInfo = null } = {}) {
  const normalized = structuredClone(candidate);
  const changes = [];

  // Khối source là thông tin quản lý dữ liệu, không nằm trong văn bản: lấy từ metadata của mẫu.
  if (sourceInfo && normalized.source && typeof normalized.source === "object") {
    for (const key of ["source_id", "dataset", "license", "input_file"]) {
      const value = sourceInfo[key];
      if (typeof value !== "string" || !value || normalized.source[key] === value) continue;
      recordChange(changes, "source_from_sample_metadata", `$.source.${key}`, normalized.source[key], value);
      normalized.source[key] = value;
    }
    // Khối source đã điền từ metadata → cảnh báo/bất thường AI viết kiểu "nguồn không cung cấp
    // bộ dữ liệu/giấy phép/tên tệp/source_id" không còn đúng: xóa.
    if (Array.isArray(normalized.quality?.warnings)) {
      const kept = normalized.quality.warnings.filter((warning) => !isStaleSourceMetadataNote(warning));
      if (kept.length !== normalized.quality.warnings.length) {
        recordChange(changes, "drop_stale_source_metadata_warning", "$.quality.warnings", normalized.quality.warnings, kept);
        normalized.quality.warnings = kept;
      }
    }
    if (Array.isArray(normalized.provenance?.source_anomalies)) {
      const kept = normalized.provenance.source_anomalies.filter(
        (anomaly) => !isStaleSourceMetadataNote(`${anomaly?.note ?? ""} ${anomaly?.source_text ?? ""}`),
      );
      if (kept.length !== normalized.provenance.source_anomalies.length) {
        recordChange(
          changes,
          "drop_stale_source_metadata_anomaly",
          "$.provenance.source_anomalies",
          normalized.provenance.source_anomalies,
          kept,
        );
        normalized.provenance.source_anomalies = kept;
      }
    }
  }

  // Tên cơ quan và trích yếu bị ngắt dòng trong nguồn: nối bằng dấu cách (quy ước gold).
  for (const [path, holder, key] of [
    ["$.header.issuer", normalized.header, "issuer"],
    ["$.title.subject", normalized.title, "subject"],
  ]) {
    const value = holder?.[key];
    if (typeof value !== "string" || !/\n/u.test(value)) continue;
    const joined = value.replace(/[ \t]*\r?\n[ \t]*/gu, " ").trim();
    recordChange(changes, "join_line_breaks_in_heading_text", path, value, joined);
    holder[key] = joined;
  }

  if (sampleId && normalized.sample_id !== sampleId) {
    changes.push({
      rule: "sample_id_from_job_context",
      path: "$.sample_id",
      before: normalized.sample_id ?? null,
      after: sampleId,
    });
    normalized.sample_id = sampleId;
  }

  if (
    sourceText !== null &&
    !Object.hasOwn(normalized, "data_tables") &&
    !hasDataTableSignal(sourceText)
  ) {
    recordChange(changes, "empty_data_tables_when_source_has_no_table_signal", "$.data_tables", null, []);
    normalized.data_tables = [];
  }

  const motto = sourceMotto(sourceText);
  if (motto && normalized.header && !normalizedText(normalized.header.motto)) {
    recordChange(changes, "motto_from_exact_source_phrase", "$.header.motto", normalized.header.motto, motto);
    normalized.header.motto = motto;
  }

  const dateLine = sourceDateLineWithPlace(sourceText, normalized.header?.issue_date_text);
  if (dateLine) {
    recordChange(
      changes,
      "issue_date_text_keeps_place_from_source_line",
      "$.header.issue_date_text",
      normalized.header.issue_date_text,
      dateLine,
    );
    normalized.header.issue_date_text = dateLine;
  }

  if (Array.isArray(normalized.data_tables) && normalized.data_tables.length === 0) {
    for (const [index, article] of (normalized.articles ?? []).entries()) {
      if (Object.hasOwn(article, "related_table_ids")) continue;
      recordChange(
        changes,
        "empty_related_table_ids_when_document_has_no_tables",
        `$.articles[${index}].related_table_ids`,
        null,
        [],
      );
      article.related_table_ids = [];
    }
  }

  if (
    sourceText !== null &&
    !hasRecipientHeading(sourceText) &&
    (!Array.isArray(normalized.recipients) || normalized.recipients.length > 0)
  ) {
    recordChange(
      changes,
      "empty_recipients_when_source_has_no_recipient_heading",
      "$.recipients",
      normalized.recipients,
      [],
    );
    normalized.recipients = [];
  }

  if (normalized.legal_effect && !normalizedText(normalized.legal_effect.review_note)) {
    recordChange(
      changes,
      "default_legal_review_disclaimer",
      "$.legal_effect.review_note",
      normalized.legal_effect.review_note,
      DEFAULT_REVIEW_NOTE,
    );
    normalized.legal_effect.review_note = DEFAULT_REVIEW_NOTE;
  }

  const authority = normalizedText(normalized.signature?.authority);
  const delegation = normalizedText(normalized.signature?.delegation);
  if (authority && /^TM\.?$/iu.test(delegation) && !/^TM\./iu.test(authority)) {
    const canonicalAuthority = `TM. ${authority}`;
    recordChange(
      changes,
      "move_tm_prefix_from_delegation_to_authority",
      "$.signature.authority",
      normalized.signature.authority,
      canonicalAuthority,
    );
    recordChange(
      changes,
      "clear_delegation_after_tm_prefix_move",
      "$.signature.delegation",
      normalized.signature.delegation,
      null,
    );
    normalized.signature.authority = canonicalAuthority;
    normalized.signature.delegation = null;
  }

  // signed_status = NGUYÊN VĂN dòng ký trong nguồn ("(Đã ký)", "(đã ký)"...); không có → null + cảnh báo.
  if (sourceText !== null && normalized.signature && typeof normalized.signature === "object") {
    const signedLines = sourceSignedStatusLines(sourceText);
    const current = normalized.signature.signed_status ?? null;
    if (signedLines.length === 1 && current !== signedLines[0]) {
      recordChange(changes, "signed_status_verbatim_from_source", "$.signature.signed_status", current, signedLines[0]);
      normalized.signature.signed_status = signedLines[0];
    } else if (signedLines.length === 0) {
      if (current !== null) {
        recordChange(changes, "signed_status_null_when_source_has_no_signed_line", "$.signature.signed_status", current, null);
        normalized.signature.signed_status = null;
      }
      if (normalized.quality && typeof normalized.quality === "object") {
        const warnings = Array.isArray(normalized.quality.warnings) ? normalized.quality.warnings : [];
        // Bỏ cảnh báo AI tự viết về signed_status (thường mô tả câu thay thế), thay bằng một câu chuẩn.
        const kept = warnings.filter((warning) => !/signed_status|trạng thái ký/iu.test(warning));
        const next = [...kept, SIGNED_STATUS_MISSING_WARNING];
        if (JSON.stringify(next) !== JSON.stringify(warnings)) {
          recordChange(changes, "warn_missing_signed_line", "$.quality.warnings", warnings, next);
          normalized.quality.warnings = next;
        }
      }
    }
  }

  // supersedes chỉ gồm văn bản cụ thể (có số hiệu hoặc tên rõ ràng); bỏ câu chung chung không cảnh báo.
  if (Array.isArray(normalized.legal_effect?.supersedes)) {
    const before = normalized.legal_effect.supersedes;
    const kept = before.filter((item) => !isGenericSupersedes(item));
    if (kept.length !== before.length) {
      recordChange(changes, "drop_generic_supersedes_without_identifier", "$.legal_effect.supersedes", before, kept);
      normalized.legal_effect.supersedes = kept;
    }
  }

  // Quy ước 19/11/2026: source_reference = vị trí trong văn bản nhắc tới phụ lục,
  // dạng cố định "Điều X" / "Điều X, khoản Y" / "Điều X, khoản Y, điểm z".
  for (const [index, attachment] of (normalized.attachments ?? []).entries()) {
    const before = attachment.source_reference ?? null;
    let after = canonicalLocation(before);
    let rule = "canonical_attachment_location_format";
    if (after === null) {
      const label = appendixLabel(attachment);
      after = label ? locateUniqueMention(normalized, label) : null;
      rule = "attachment_location_from_unique_mention";
    }
    if (after === null || after === before) continue;
    recordChange(changes, rule, `$.attachments[${index}].source_reference`, before, after);
    attachment.source_reference = after;
  }

  // Ô bảng nghi lỗi gõ (vd "1. 200"): giữ nguyên văn, chỉ thêm cảnh báo.
  for (const table of normalized.data_tables ?? []) {
    for (const cell of suspiciousNumberCells(table)) {
      const warnings = Array.isArray(normalized.quality?.warnings) ? normalized.quality.warnings : [];
      if (warnings.some((warning) => warning.includes(`"${cell}"`))) continue;
      if (!normalized.quality) continue;
      const warning = suspiciousNumberWarning(table.table_id, cell);
      recordChange(changes, "warn_suspicious_number_cell_in_table", "$.quality.warnings", null, warning);
      normalized.quality.warnings = [...warnings, warning];
    }
  }

  // Ký hiệu khoản/điểm không chứa dấu đi kèm: "a)" → "a", "1." → "1" (renderer tự thêm dấu).
  for (const [articleIndex, article] of (normalized.articles ?? []).entries()) {
    for (const { clause, path } of flattenClauses(article.clauses, `$.articles[${articleIndex}].clauses`)) {
      const match = typeof clause.number === "string" ? clause.number.trim().match(/^(\d+|[a-zđ])\s*[.)]$/iu) : null;
      if (!match) continue;
      recordChange(changes, "strip_marker_punctuation_from_clause_number", `${path}.number`, clause.number, match[1]);
      clause.number = match[1];
    }
  }

  // Điều không có tiêu đề riêng: toàn bộ nội dung đã nằm trong heading thì không lặp lại thành
  // một đoạn number=null có cùng câu chữ (quy ước gold qd_010; lỗi gặp ở mẫu train qd_068).
  for (const [articleIndex, article] of (normalized.articles ?? []).entries()) {
    if (!Array.isArray(article.clauses)) continue;
    const heading = normalizedText(article.heading);
    const kept = article.clauses.filter(
      (clause) =>
        !(clause.number === null && !(clause.children?.length) && heading && normalizedText(clause.text) === heading),
    );
    if (kept.length === article.clauses.length) continue;
    recordChange(
      changes,
      "remove_clause_duplicating_article_heading",
      `$.articles[${articleIndex}].clauses`,
      article.clauses.length,
      kept.length,
    );
    article.clauses = kept;
  }

  // Đoạn không số ngay sau khoản có số là con của khoản đó (quy ước người dùng chốt 20/11/2026).
  for (const item of nestUnnumberedParagraphs(normalized.articles)) {
    recordChange(
      changes,
      "nest_unnumbered_paragraph_under_preceding_clause",
      `$.articles[Điều ${item.article}].clauses[khoản ${item.clause}].children`,
      null,
      item.text,
    );
  }

  // Đoạn không số: nguồn có gạch đầu dòng → "-", nguồn không có ký hiệu → null.
  if (sourceText !== null) {
    const sourceLines = String(sourceText).split(/\r?\n/u).map(normalizedText).filter(Boolean);
    for (const [articleIndex, article] of (normalized.articles ?? []).entries()) {
      for (const { clause, path } of flattenClauses(article.clauses, `$.articles[${articleIndex}].clauses`)) {
        const prefix = sourcePrefixOf(sourceLines, clause.text);
        if (prefix === null) continue;
        let expected;
        if (clause.number === null && /^[-–]$/u.test(prefix)) expected = prefix;
        else if ((clause.number === "-" || clause.number === "–") && prefix === "") expected = null;
        else continue;
        recordChange(changes, "unnumbered_paragraph_marker_from_source", `${path}.number`, clause.number, expected);
        clause.number = expected;
      }
    }
  }

  // Di chuyển quality từ provenance khi trường gốc hoàn toàn vắng mặt.
  // Nếu quality gốc đã tồn tại, chỉ xóa bản sai vị trí khi hai object giống hệt nhau.
  // Hai object khác nhau vẫn được giữ để schema validator báo lỗi, tránh mất dữ liệu.
  if (normalized.provenance?.quality !== undefined) {
    if (normalized.quality === undefined) {
      const misplacedQuality = normalized.provenance.quality;
      changes.push({
        rule: "move_provenance_quality_to_root_when_missing",
        path: "$.quality",
        before: null,
        after: misplacedQuality,
      });
      normalized.quality = misplacedQuality;
      delete normalized.provenance.quality;
    } else if (exactJsonMatch(normalized.provenance.quality, normalized.quality)) {
      changes.push({
        rule: "remove_exact_duplicate_provenance_quality",
        path: "$.provenance.quality",
        before: normalized.provenance.quality,
        after: null,
      });
      delete normalized.provenance.quality;
    }
  }

  if (
    normalized.provenance?.source_consistency !== undefined &&
    normalized.quality?.source_consistency !== undefined &&
    normalized.provenance.source_consistency === normalized.quality.source_consistency
  ) {
    changes.push({
      rule: "remove_exact_duplicate_provenance_source_consistency",
      path: "$.provenance.source_consistency",
      before: normalized.provenance.source_consistency,
      after: null,
    });
    delete normalized.provenance.source_consistency;
  }

  return { normalized, changes };
}
