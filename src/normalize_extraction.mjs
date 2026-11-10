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

export function normalizeExtraction(candidate, { sampleId = null } = {}) {
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
