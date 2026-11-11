import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { analyzeExtractionDiff, classifyTextDifference } from "./analyze_extraction_diff.mjs";

const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const exact = (left, right) => normalize(left) === normalize(right);

const setMetrics = (expectedValues, actualValues) => {
  const expected = new Set(expectedValues.map(normalize));
  const actual = new Set(actualValues.map(normalize));
  const matches = [...expected].filter((value) => actual.has(value)).length;
  const precision = actual.size === 0 ? (expected.size === 0 ? 1 : 0) : matches / actual.size;
  const recall = expected.size === 0 ? 1 : matches / expected.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { expected: expected.size, actual: actual.size, matches, precision, recall, f1 };
};

const metricsFromSummary = (summary, tolerant = false) => {
  const matches = tolerant
    ? summary.exact + summary.formatting_only + summary.near_match
    : summary.exact;
  const precision =
    summary.actual_total === 0
      ? summary.expected_total === 0
        ? 1
        : 0
      : matches / summary.actual_total;
  const recall = summary.expected_total === 0 ? 1 : matches / summary.expected_total;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    expected: summary.expected_total,
    actual: summary.actual_total,
    matches,
    precision,
    recall,
    f1,
  };
};

const isTolerantMatch = (left, right) => {
  const { status } = classifyTextDifference(left, right);
  return status === "exact" || status === "formatting_only" || status === "near_match";
};

const flattenClauseTexts = (clauses = []) =>
  clauses.flatMap((clause) => [clause.text, ...flattenClauseTexts(clause.children ?? [])]);

const findHeadingDuplicatedAsClause = (document) =>
  (document.articles ?? []).flatMap((article) => {
    const heading = normalize(article.heading);
    if (!heading) return [];
    return flattenClauseTexts(article.clauses)
      .filter((text) => normalize(text) === heading)
      .map(() => ({ article_number: article.number, heading: article.heading }));
  });

const buildWarnings = (diff, actual) => {
  const warnings = [];
  const legalIssues = diff.details.legal_bases.filter(
    (item) => item.status === "content_mismatch" || item.status === "missing" || item.status === "extra",
  );
  if (legalIssues.length > 0) {
    warnings.push({
      code: "legal_bases_incomplete_or_changed",
      count: legalIssues.length,
      message: "Có căn cứ pháp lý bị thiếu, rút ngắn hoặc thay đổi nội dung.",
    });
  }
  const headingIssues = diff.details.article_headings.filter(
    (item) => item.status === "content_mismatch" || item.status === "missing" || item.status === "extra",
  );
  if (headingIssues.length > 0) {
    warnings.push({
      code: "article_headings_content_mismatch",
      count: headingIssues.length,
      message: "Có tiêu đề điều sai hoặc thiếu nội dung, không chỉ khác định dạng.",
    });
  }
  const numberMismatches = diff.details.clauses.filter(
    (item) => item.status !== "missing" && item.status !== "extra" && !item.number_matches,
  );
  if (numberMismatches.length > 0) {
    warnings.push({
      code: "clause_number_mismatch",
      count: numberMismatches.length,
      message: "Có khoản/điểm được gán số khác với nguồn.",
    });
  }
  if (diff.summary.clauses.expected_total !== diff.summary.clauses.actual_total) {
    warnings.push({
      code: "clause_count_mismatch",
      count: Math.abs(diff.summary.clauses.actual_total - diff.summary.clauses.expected_total),
      expected: diff.summary.clauses.expected_total,
      actual: diff.summary.clauses.actual_total,
      message: "Số khoản/điểm dự đoán khác dữ liệu chuẩn.",
    });
  }
  const duplicatedHeadingClauses = findHeadingDuplicatedAsClause(actual);
  if (duplicatedHeadingClauses.length > 0) {
    warnings.push({
      code: "heading_duplicated_as_clause",
      count: duplicatedHeadingClauses.length,
      message: "Có nội dung heading bị lặp nguyên văn thành khoản/điểm.",
    });
  }
  const recipientIssues = diff.details.recipients.filter(
    (item) => item.status === "content_mismatch" || item.status === "missing" || item.status === "extra",
  );
  if (recipientIssues.length > 0) {
    warnings.push({
      code: "recipient_content_mismatch",
      count: recipientIssues.length,
      message: "Có nơi nhận bị thiếu, thừa hoặc thay đổi nội dung.",
    });
  }
  const attachmentIssues = diff.details.attachments.filter(
    (item) => item.status === "content_mismatch" || item.status === "missing" || item.status === "extra",
  );
  if (attachmentIssues.length > 0) {
    warnings.push({
      code: "attachment_mismatch",
      count: attachmentIssues.length,
      message: "Có tệp đính kèm bị thiếu, thừa hoặc thay đổi tham chiếu nguồn.",
    });
  }
  return warnings;
};

export function evaluateExtraction(expected, actual, schemaErrors = []) {
  const scalarPairs = [
    [expected.sample_id, actual.sample_id],
    [expected.document_type, actual.document_type],
    [expected.header?.issuer, actual.header?.issuer],
    [expected.header?.document_number, actual.header?.document_number],
    [expected.header?.issue_place, actual.header?.issue_place],
    [expected.header?.issue_date, actual.header?.issue_date],
    [expected.title?.document_name, actual.title?.document_name],
    [expected.title?.subject, actual.title?.subject],
    [expected.enactment, actual.enactment],
    [expected.signature?.authority, actual.signature?.authority],
    [expected.signature?.delegation, actual.signature?.delegation],
    [expected.signature?.position, actual.signature?.position],
    [expected.signature?.signer_name, actual.signature?.signer_name],
    [expected.legal_effect?.effective_from, actual.legal_effect?.effective_from],
  ];
  const scalarMatches = scalarPairs.filter(([left, right]) => exact(left, right)).length;
  const scalarAccuracy = scalarMatches / scalarPairs.length;
  const tolerantScalarMatches = scalarPairs.filter(([left, right]) => isTolerantMatch(left, right)).length;
  const tolerantScalarAccuracy = tolerantScalarMatches / scalarPairs.length;

  const diff = analyzeExtractionDiff(expected, actual);
  const articleHeadings = metricsFromSummary(diff.summary.article_headings);
  const legalBases = metricsFromSummary(diff.summary.legal_bases);
  const clauses = metricsFromSummary(diff.summary.clauses);
  const recipients = metricsFromSummary(diff.summary.recipients);
  const attachments = metricsFromSummary(diff.summary.attachments);
  const strictComponentScores = [
    scalarAccuracy,
    articleHeadings.f1,
    legalBases.f1,
    clauses.f1,
    recipients.f1,
    attachments.f1,
  ];
  const tolerantArticleHeadings = metricsFromSummary(diff.summary.article_headings, true);
  const tolerantLegalBases = metricsFromSummary(diff.summary.legal_bases, true);
  const tolerantClauses = metricsFromSummary(diff.summary.clauses, true);
  const tolerantRecipients = metricsFromSummary(diff.summary.recipients, true);
  const tolerantAttachments = metricsFromSummary(diff.summary.attachments, true);
  const tolerantComponentScores = [
    tolerantScalarAccuracy,
    tolerantArticleHeadings.f1,
    tolerantLegalBases.f1,
    tolerantClauses.f1,
    tolerantRecipients.f1,
    tolerantAttachments.f1,
  ];
  const strictEvaluation = {
    scalar_accuracy: scalarAccuracy,
    article_headings: articleHeadings,
    legal_bases: legalBases,
    clauses,
    recipients,
    attachments,
    overall_score:
      strictComponentScores.reduce((sum, value) => sum + value, 0) / strictComponentScores.length,
  };
  const tolerantEvaluation = {
    scalar_accuracy: tolerantScalarAccuracy,
    article_headings: tolerantArticleHeadings,
    legal_bases: tolerantLegalBases,
    clauses: tolerantClauses,
    recipients: tolerantRecipients,
    attachments: tolerantAttachments,
    overall_score:
      tolerantComponentScores.reduce((sum, value) => sum + value, 0) /
      tolerantComponentScores.length,
  };

  return {
    schema_valid: schemaErrors.length === 0,
    schema_errors: schemaErrors,
    scoring_version: "2.0",
    ...strictEvaluation,
    strict_evaluation: strictEvaluation,
    tolerant_evaluation: tolerantEvaluation,
    diagnostics: {
      clause_count: {
        expected: diff.summary.clauses.expected_total,
        actual: diff.summary.clauses.actual_total,
        difference: diff.summary.clauses.actual_total - diff.summary.clauses.expected_total,
      },
      heading_duplicated_as_clause: findHeadingDuplicatedAsClause(actual),
      clause_number_mismatches: diff.details.clauses
        .filter((item) => item.status !== "missing" && item.status !== "extra" && !item.number_matches)
        .map((item) => ({
          path: item.key,
          expected_number: item.expected_number,
          actual_number: item.actual_number,
        })),
      legal_basis_issues: diff.details.legal_bases
        .filter((item) => item.status !== "exact" && item.status !== "formatting_only")
        .map((item) => ({
          key: item.key,
          status: item.status,
          similarity: item.similarity,
        })),
    },
    warnings: buildWarnings(diff, actual),
  };
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
  const expectedPath = resolve(args.get("--expected") ?? "dataset/van_ban_hanh_chinh/structured_03.json");
  const actualPath = resolve(args.get("--actual") ?? "work/ai_extraction/qd_067.predicted.json");
  const reportPath = resolve(args.get("--report") ?? "work/ai_extraction/qd_067.evaluation.json");
  const [expected, actual] = await Promise.all([
    readFile(expectedPath, "utf8").then(JSON.parse),
    readFile(actualPath, "utf8").then(JSON.parse),
  ]);
  const report = evaluateExtraction(expected, actual);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}
