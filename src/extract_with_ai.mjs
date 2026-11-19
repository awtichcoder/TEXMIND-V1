import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { requestCodexCliResponseWithRetry } from "./codex_cli_client.mjs";
import { buildExtractionSystemPrompt } from "./extraction_prompt.mjs";
import { normalizeExtraction } from "./normalize_extraction.mjs";
import { requestOpenAICompatibleResponse } from "./openai_compatible_client.mjs";
import { dropNullOptionals, toStrictOutputSchema } from "./strict_output_schema.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

const loadLocalEnv = () => {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!Object.hasOwn(process.env, name)) process.env[name] = value;
  }
};

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

loadLocalEnv();
const args = parseArgs();
const inputPath = resolve(args.get("--input") ?? "dataset/van_ban_hanh_chinh/input_03.txt");
const schemaPath = resolve(args.get("--schema") ?? "schemas/texmind-document.schema.json");
const outputPath = resolve(args.get("--output") ?? "work/ai_extraction/qd_067.predicted.json");
const outputName = basename(outputPath);
const inferredSampleId = outputName.match(/^(.+?)\.predicted(?:\.|$)/u)?.[1] ?? null;
const sampleId = args.get("--sample-id") ?? inferredSampleId;
const apiKey = process.env.OPENAI_API_KEY;
const configuredBaseUrl = new URL(
  process.env.OPENAI_BASE_URL ?? "https://api.xingchiapi.com/v1",
);
configuredBaseUrl.search = "";
configuredBaseUrl.hash = "";
const baseUrl = configuredBaseUrl.toString().replace(/\/$/, "");
const model = args.get("--model") ?? process.env.OPENAI_MODEL ?? "gpt-6.1-sol";
const actorAuthorization =
  process.env.OPENAI_ACTOR_AUTHORIZATION ?? "local-image-extension";
const transport = process.env.OPENAI_TRANSPORT ?? "codex_cli";

if (!apiKey) {
  console.error("Thiếu OPENAI_API_KEY. Sao chép .env.example thành .env và điền khóa cục bộ.");
  process.exit(2);
}

const [sourceText, schema] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(schemaPath, "utf8").then(JSON.parse),
]);

const systemPrompt = buildExtractionSystemPrompt(sampleId);

const userPrompt = [
  "JSON SCHEMA:",
  JSON.stringify(schema),
  "VĂN BẢN NGUỒN:",
  sourceText,
].join("\n\n");

const siblingPath = (suffix) =>
  outputPath.toLowerCase().endsWith(".json")
    ? `${outputPath.slice(0, -5)}${suffix}`
    : `${outputPath}${suffix}`;
const codexDiagnosticsPath = resolve(
  args.get("--codex-diagnostics") ?? siblingPath(".codex-diagnostics.json"),
);
// Provider (Structured Outputs strict) bắt mọi khóa phải nằm trong `required`,
// nên Codex nhận bản schema strict riêng; schema gốc vẫn dùng để kiểm tra cuối.
const codexSchemaPath = resolve(siblingPath(".codex-output-schema.json"));

await mkdir(dirname(outputPath), { recursive: true });
if (transport === "codex_cli") {
  await writeFile(
    codexSchemaPath,
    `${JSON.stringify(toStrictOutputSchema(schema), null, 2)}\n`,
    "utf8",
  );
}

const requestCompletion = (messages) => {
  if (transport === "codex_cli") {
    return requestCodexCliResponseWithRetry({
      baseUrl,
      apiKey,
      model,
      messages,
      schemaPath: codexSchemaPath,
      actorAuthorization,
      diagnosticsPath: codexDiagnosticsPath,
      onStderr: (chunk) => process.stderr.write(chunk),
      onRetry: ({ attempt, attempts, error }) =>
        console.error(
          `\n[codex] Lần ${attempt}/${attempts} lỗi tạm thời, gọi lại: ${error.message.split("\n").filter((line) => line.includes("ERROR")).pop() ?? error.message.slice(0, 200)}`,
        ),
    });
  }
  if (transport === "responses_api") {
    return requestOpenAICompatibleResponse({
      baseUrl,
      apiKey,
      model,
      messages,
      actorAuthorization,
    });
  }
  throw new Error(`OPENAI_TRANSPORT không hợp lệ: ${transport}.`);
};

let rawContent = await requestCompletion([
  { role: "system", content: systemPrompt },
  { role: "user", content: userPrompt },
]);
let candidate;
try {
  candidate = JSON.parse(rawContent);
} catch (firstError) {
  const rawPath = outputPath.replace(/\.json$/i, ".invalid-response.txt");
  await writeFile(rawPath, rawContent, "utf8");
  const repairPrompt = [
    "Sửa nội dung bên dưới thành đúng một JSON object hợp lệ theo JSON Schema.",
    "Không thêm Markdown hoặc giải thích. Không thay đổi dữ kiện đã trích xuất.",
    `Lỗi parse: ${firstError.message}`,
    "JSON SCHEMA:",
    JSON.stringify(schema),
    "NỘI DUNG JSON BỊ LỖI:",
    rawContent,
  ].join("\n\n");
  rawContent = await requestCompletion([
    { role: "system", content: "Bạn là bộ sửa JSON. Chỉ trả về JSON object hợp lệ." },
    { role: "user", content: repairPrompt },
  ]);
  try {
    candidate = JSON.parse(rawContent);
  } catch (secondError) {
    const retryPath = outputPath.replace(/\.json$/i, ".repair-failed.txt");
    await writeFile(retryPath, rawContent, "utf8");
    throw new Error("Model vẫn trả về JSON sai cú pháp sau một lần sửa.", { cause: secondError });
  }
}

// Schema strict cho phép null ở khóa tùy chọn; bỏ các null đó để khớp schema gốc.
candidate = dropNullOptionals(candidate, schema);

const rawPath = resolve(args.get("--raw-output") ?? siblingPath(".raw.json"));
await mkdir(dirname(rawPath), { recursive: true });
await writeFile(rawPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");

const rawSchemaErrors = validateAgainstSchema(schema, candidate);
const { normalized, changes } = normalizeExtraction(candidate, { sampleId, sourceText });
const schemaErrors = validateAgainstSchema(schema, normalized);
const postprocessPath = resolve(args.get("--report") ?? siblingPath(".postprocess.json"));
await mkdir(dirname(postprocessPath), { recursive: true });
await writeFile(
  postprocessPath,
  `${JSON.stringify(
    {
      sample_id_from_job_context: sampleId,
      raw_schema_error_count: rawSchemaErrors.length,
      normalized_schema_error_count: schemaErrors.length,
      changes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (schemaErrors.length > 0) {
  const invalidPath = outputPath.replace(/\.json$/i, ".invalid.json");
  const errorPath = outputPath.replace(/\.json$/i, ".schema-errors.json");
  await writeFile(invalidPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await writeFile(errorPath, `${JSON.stringify(schemaErrors, null, 2)}\n`, "utf8");
  throw new Error(`Kết quả AI sai schema (${schemaErrors.length} lỗi). Xem ${errorPath}`);
}

await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`PASS: AI extraction hợp lệ theo schema -> ${outputPath}`);
console.log(`Bản thô: ${rawPath}`);
console.log(`Hậu xử lý: ${postprocessPath} (${changes.length} thay đổi)`);
console.log(`Model: ${model}`);
console.log(`Transport: ${transport}`);
