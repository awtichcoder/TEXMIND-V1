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

const recordChange = (changes, rule, path, before, after) => {
  changes.push({ rule, path, before: before ?? null, after });
};

export function normalizeExtraction(candidate, { sampleId = null, sourceText = null } = {}) {
  const normalized = structuredClone(candidate);
  const changes = [];

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

  for (const [index, attachment] of (normalized.attachments ?? []).entries()) {
    const number = appendixNumber(attachment);
    if (number === null) continue;
    const canonicalReference = `Phụ lục ${number}`;
    if (normalizedText(attachment.source_reference) === canonicalReference) continue;
    changes.push({
      rule: "canonical_numbered_appendix_reference",
      path: `$.attachments[${index}].source_reference`,
      before: attachment.source_reference ?? null,
      after: canonicalReference,
    });
    attachment.source_reference = canonicalReference;
  }

  // Chỉ xóa trường sai vị trí khi nó là bản sao byte-for-byte của quality gốc.
  // Trường hợp không giống nhau vẫn được giữ để schema validator báo lỗi.
  if (
    normalized.provenance?.quality !== undefined &&
    exactJsonMatch(normalized.provenance.quality, normalized.quality)
  ) {
    changes.push({
      rule: "remove_exact_duplicate_provenance_quality",
      path: "$.provenance.quality",
      before: normalized.provenance.quality,
      after: null,
    });
    delete normalized.provenance.quality;
  }

  return { normalized, changes };
}
