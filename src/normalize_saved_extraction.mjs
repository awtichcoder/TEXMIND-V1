import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { normalizeExtraction } from "./normalize_extraction.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

const args = parseArgs();
const rawArgument = args.get("--raw");
if (!rawArgument) throw new Error("Thiếu --raw trỏ đến JSON thô đã lưu.");

const rawPath = resolve(rawArgument);
const sourcePath = resolve(
  args.get("--source") ?? "dataset/van_ban_hanh_chinh/input_04.txt",
);
const schemaPath = resolve(args.get("--schema") ?? "schemas/texmind-document.schema.json");
const outputPath = resolve(
  args.get("--output") ?? rawPath.replace(/\.raw\.json$/iu, ".normalized.json"),
);
const reportPath = resolve(
  args.get("--report") ?? outputPath.replace(/\.json$/iu, ".postprocess.json"),
);
const sampleId = args.get("--sample-id") ?? null;

const [candidate, sourceText, schema] = await Promise.all([
  readFile(rawPath, "utf8").then(JSON.parse),
  readFile(sourcePath, "utf8"),
  readFile(schemaPath, "utf8").then(JSON.parse),
]);
const rawSchemaErrors = validateAgainstSchema(schema, candidate);
const { normalized, changes } = normalizeExtraction(candidate, { sampleId, sourceText });
const normalizedSchemaErrors = validateAgainstSchema(schema, normalized);

await Promise.all([mkdir(dirname(outputPath), { recursive: true }), mkdir(dirname(reportPath), { recursive: true })]);
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      raw_path: rawPath,
      sample_id_from_job_context: sampleId,
      raw_schema_error_count: rawSchemaErrors.length,
      normalized_schema_error_count: normalizedSchemaErrors.length,
      normalized_schema_errors: normalizedSchemaErrors,
      changes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (normalizedSchemaErrors.length > 0) {
  throw new Error(
    `Kết quả sau chuẩn hóa vẫn sai schema (${normalizedSchemaErrors.length} lỗi). Xem ${reportPath}`,
  );
}

await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`PASS: JSON đã lưu được chuẩn hóa hợp lệ -> ${outputPath}`);
console.log(`Hậu xử lý: ${reportPath} (${changes.length} thay đổi)`);
