import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const normalizeWhitespace = (value) =>
  String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();

export const normalizeFormatting = (value) =>
  normalizeWhitespace(value)
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshteinDistance = (left, right) => {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous = current;
  }
  return previous[right.length];
};

export const textSimilarity = (left, right) => {
  const normalizedLeft = normalizeFormatting(left);
  const normalizedRight = normalizeFormatting(right);
  const longest = Math.max(normalizedLeft.length, normalizedRight.length);
  if (longest === 0) return 1;
  return 1 - levenshteinDistance(normalizedLeft, normalizedRight) / longest;
};

export const classifyTextDifference = (expected, actual) => {
  if (
    (expected === undefined || expected === null) &&
    (actual === undefined || actual === null)
  ) {
    return { status: "exact", similarity: 1 };
  }
  if (actual === undefined || actual === null) {
    return { status: "missing", similarity: 0 };
  }
  if (normalizeWhitespace(expected) === normalizeWhitespace(actual)) {
    return { status: "exact", similarity: 1 };
  }
  if (normalizeFormatting(expected) === normalizeFormatting(actual)) {
    return { status: "formatting_only", similarity: 1 };
  }
  const similarity = textSimilarity(expected, actual);
  return {
    status: similarity >= 0.9 ? "near_match" : "content_mismatch",
    similarity,
  };
};

const compareText = (key, expected, actual) => ({
  key,
  expected: normalizeWhitespace(expected),
  actual: actual === undefined ? null : normalizeWhitespace(actual),
  ...classifyTextDifference(expected, actual),
});

const flattenClausesByPosition = (articles = []) => {
  const flattened = new Map();
  const visit = (articleNumber, clauses, parentPosition = []) => {
    for (const [index, clause] of (clauses ?? []).entries()) {
      const position = [...parentPosition, index + 1];
      const key = `Điều ${articleNumber} / ${position.map((item) => `#${item}`).join(" / ")}`;
      flattened.set(key, { number: clause.number ?? null, text: clause.text });
      visit(articleNumber, clause.children ?? [], position);
    }
  };
  for (const article of articles) {
    visit(article.number, article.clauses ?? []);
  }
  return flattened;
};

const compareKeyedClauses = (expectedMap, actualMap) => {
  const results = [];
  for (const [key, expected] of expectedMap) {
    const actual = actualMap.get(key);
    results.push({
      ...compareText(key, expected.text, actual?.text),
      expected_number: expected.number,
      actual_number: actual?.number ?? null,
      number_matches: actual !== undefined && String(expected.number ?? "") === String(actual.number ?? ""),
    });
  }
  for (const [key, actual] of actualMap) {
    if (!expectedMap.has(key)) {
      results.push({
        key,
        expected: null,
        actual: normalizeWhitespace(actual.text),
        status: "extra",
        similarity: 0,
        expected_number: null,
        actual_number: actual.number,
        number_matches: false,
      });
    }
  }
  return results;
};

const compareKeyedText = (expectedMap, actualMap) => {
  const results = [];
  for (const [key, expected] of expectedMap) {
    results.push(compareText(key, expected, actualMap.get(key)));
  }
  for (const [key, actual] of actualMap) {
    if (!expectedMap.has(key)) {
      results.push({
        key,
        expected: null,
        actual: normalizeWhitespace(actual),
        status: "extra",
        similarity: 0,
      });
    }
  }
  return results;
};

const extractDocumentAnchors = (value) =>
  new Set(
    normalizeWhitespace(value)
      .normalize("NFKC")
      .toLocaleUpperCase("vi")
      .match(/\b\d+(?:\/[0-9A-ZĐ-]+)+\b/gu) ?? [],
  );

const alignUnkeyedText = (expectedValues = [], actualValues = []) => {
  const pairs = [];
  for (let expectedIndex = 0; expectedIndex < expectedValues.length; expectedIndex += 1) {
    for (let actualIndex = 0; actualIndex < actualValues.length; actualIndex += 1) {
      const expectedAnchors = extractDocumentAnchors(expectedValues[expectedIndex]);
      const actualAnchors = extractDocumentAnchors(actualValues[actualIndex]);
      const sharedAnchors = [...expectedAnchors].filter((anchor) => actualAnchors.has(anchor)).length;
      const similarity = textSimilarity(expectedValues[expectedIndex], actualValues[actualIndex]);
      pairs.push({
        expectedIndex,
        actualIndex,
        similarity,
        matchScore: similarity + sharedAnchors * 2,
      });
    }
  }
  pairs.sort((left, right) => right.matchScore - left.matchScore);

  const usedExpected = new Set();
  const usedActual = new Set();
  const matched = [];
  for (const pair of pairs) {
    if (usedExpected.has(pair.expectedIndex) || usedActual.has(pair.actualIndex)) continue;
    usedExpected.add(pair.expectedIndex);
    usedActual.add(pair.actualIndex);
    matched.push(
      compareText(
        `expected_${pair.expectedIndex + 1}_actual_${pair.actualIndex + 1}`,
        expectedValues[pair.expectedIndex],
        actualValues[pair.actualIndex],
      ),
    );
  }

  for (let index = 0; index < expectedValues.length; index += 1) {
    if (!usedExpected.has(index)) {
      matched.push(compareText(`expected_${index + 1}`, expectedValues[index], undefined));
    }
  }
  for (let index = 0; index < actualValues.length; index += 1) {
    if (!usedActual.has(index)) {
      matched.push({
        key: `actual_${index + 1}`,
        expected: null,
        actual: normalizeWhitespace(actualValues[index]),
        status: "extra",
        similarity: 0,
      });
    }
  }
  return matched;
};

const summarize = (items) => {
  const counts = {
    exact: 0,
    formatting_only: 0,
    near_match: 0,
    content_mismatch: 0,
    missing: 0,
    extra: 0,
  };
  for (const item of items) counts[item.status] += 1;
  const expectedTotal = items.filter((item) => item.status !== "extra").length;
  const tolerantMatches = counts.exact + counts.formatting_only + counts.near_match;
  return {
    expected_total: expectedTotal,
    actual_total: items.filter((item) => item.status !== "missing").length,
    ...counts,
    strict_accuracy: expectedTotal === 0 ? 1 : counts.exact / expectedTotal,
    tolerant_accuracy: expectedTotal === 0 ? 1 : tolerantMatches / expectedTotal,
  };
};

const summarizeClauses = (items) => ({
  ...summarize(items),
  number_mismatches: items.filter(
    (item) => item.status !== "missing" && item.status !== "extra" && !item.number_matches,
  ).length,
});

export function analyzeExtractionDiff(expected, actual) {
  const expectedHeadings = new Map(
    (expected.articles ?? []).map((article) => [String(article.number), article.heading]),
  );
  const actualHeadings = new Map(
    (actual.articles ?? []).map((article) => [String(article.number), article.heading]),
  );
  const articleHeadings = compareKeyedText(expectedHeadings, actualHeadings);
  const legalBases = alignUnkeyedText(expected.legal_bases ?? [], actual.legal_bases ?? []);
  const clauses = compareKeyedClauses(
    flattenClausesByPosition(expected.articles),
    flattenClausesByPosition(actual.articles),
  );
  const recipients = alignUnkeyedText(expected.recipients ?? [], actual.recipients ?? []);
  const attachments = alignUnkeyedText(
    (expected.attachments ?? []).map((item) => item.source_reference),
    (actual.attachments ?? []).map((item) => item.source_reference),
  );

  return {
    sample_id: expected.sample_id,
    comparison_rules: {
      strict: "Unicode NFC + chuẩn hóa khoảng trắng",
      formatting_only: "Không phân biệt hoa/thường, dấu câu và ký hiệu",
      near_match: "Độ tương đồng Levenshtein sau chuẩn hóa >= 0.90",
      clause_alignment: "Căn theo đường dẫn Điều/Khoản/Điểm, không ghép tiêu đề điều vào khóa",
    },
    summary: {
      article_headings: summarize(articleHeadings),
      legal_bases: summarize(legalBases),
      clauses: summarizeClauses(clauses),
      recipients: summarize(recipients),
      attachments: summarize(attachments),
    },
    details: {
      article_headings: articleHeadings,
      legal_bases: legalBases,
      clauses,
      recipients,
      attachments,
    },
  };
}

const percent = (value) => `${(value * 100).toFixed(2)}%`;
const preview = (value, limit = 220) => {
  const text = value ?? "—";
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
};
const escapeTable = (value) => preview(value).replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderDiffMarkdown(report) {
  const sections = [
    ["Tiêu đề điều", report.summary.article_headings, report.details.article_headings],
    ["Căn cứ pháp lý", report.summary.legal_bases, report.details.legal_bases],
    ["Khoản/điểm", report.summary.clauses, report.details.clauses],
    ["Nơi nhận", report.summary.recipients, report.details.recipients],
    ["Tệp đính kèm", report.summary.attachments, report.details.attachments],
  ];
  const lines = [
    `# Báo cáo sai khác ${report.sample_id}`,
    "",
    "Báo cáo giữ riêng khớp tuyệt đối và khớp sau chuẩn hóa. Khoản/điểm được căn theo vị trí cấu trúc, vì vậy thay đổi kiểu chữ của tiêu đề điều không còn làm toàn bộ khoản bên dưới bị tính sai.",
    "",
    "| Nhóm | Tổng chuẩn | Khớp tuyệt đối | Chỉ khác định dạng | Gần khớp | Sai nội dung | Thiếu | Thừa | Sai số mục | Điểm nghiêm ngặt | Điểm dung sai |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const [name, summary] of sections) {
    lines.push(
      `| ${name} | ${summary.expected_total} | ${summary.exact} | ${summary.formatting_only} | ${summary.near_match} | ${summary.content_mismatch} | ${summary.missing} | ${summary.extra} | ${summary.number_mismatches ?? 0} | ${percent(summary.strict_accuracy)} | ${percent(summary.tolerant_accuracy)} |`,
    );
  }
  for (const [name, , items] of sections) {
    lines.push("", `## ${name}`, "", "| Vị trí | Phân loại | Tương đồng | Chuẩn | Dự đoán |", "| --- | --- | ---: | --- | --- |");
    for (const item of items) {
      lines.push(
        `| ${escapeTable(item.key)} | ${item.status} | ${percent(item.similarity)} | ${escapeTable(item.expected)} | ${escapeTable(item.actual)} |`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = parseArgs();
  const expectedPath = resolve(
    args.get("--expected") ?? "dataset/van_ban_hanh_chinh/structured_04.json",
  );
  const actualPath = resolve(args.get("--actual") ?? "outputs/qd_014.rerun.normalized.json");
  const reportPath = resolve(args.get("--report") ?? "outputs/qd_014.rerun.diff.json");
  const markdownPath = resolve(args.get("--markdown") ?? "outputs/qd_014.rerun.diff.md");
  const [expected, actual] = await Promise.all([
    readFile(expectedPath, "utf8").then(JSON.parse),
    readFile(actualPath, "utf8").then(JSON.parse),
  ]);
  const report = analyzeExtractionDiff(expected, actual);
  await Promise.all([
    writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderDiffMarkdown(report), "utf8"),
  ]);
  console.log(JSON.stringify(report.summary, null, 2));
}
