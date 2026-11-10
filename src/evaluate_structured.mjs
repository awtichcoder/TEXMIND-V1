import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

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

const flattenClauses = (articles) =>
  articles.flatMap((article) => {
    const visit = (clauses, prefix = []) =>
      clauses.flatMap((clause) => {
        const key = [...prefix, clause.number ?? "_", clause.text].join(" | ");
        return [key, ...visit(clause.children ?? [], [...prefix, clause.number ?? "_"])];
      });
    return visit(article.clauses ?? [], [`Điều ${article.number}`, article.heading]);
  });

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

  const articleHeadings = setMetrics(
    expected.articles.map((article) => `${article.number}|${article.heading}`),
    (actual.articles ?? []).map((article) => `${article.number}|${article.heading}`),
  );
  const legalBases = setMetrics(expected.legal_bases, actual.legal_bases ?? []);
  const clauses = setMetrics(flattenClauses(expected.articles), flattenClauses(actual.articles ?? []));
  const recipients = setMetrics(expected.recipients, actual.recipients ?? []);
  const attachments = setMetrics(
    (expected.attachments ?? []).map((item) => item.source_reference),
    (actual.attachments ?? []).map((item) => item.source_reference),
  );
  const componentScores = [
    scalarAccuracy,
    articleHeadings.f1,
    legalBases.f1,
    clauses.f1,
    recipients.f1,
    attachments.f1,
  ];

  return {
    schema_valid: schemaErrors.length === 0,
    schema_errors: schemaErrors,
    scalar_accuracy: scalarAccuracy,
    article_headings: articleHeadings,
    legal_bases: legalBases,
    clauses,
    recipients,
    attachments,
    overall_score: componentScores.reduce((sum, value) => sum + value, 0) / componentScores.length,
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
