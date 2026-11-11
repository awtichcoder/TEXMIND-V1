import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { buildExtractionSystemPrompt } from "./extraction_prompt.mjs";
import { normalizeExtraction } from "./normalize_extraction.mjs";
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
const apiKey = process.env.DEEPSEEK_API_KEY;
const configuredBaseUrl = new URL(process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com");
configuredBaseUrl.search = "";
configuredBaseUrl.hash = "";
const baseUrl = configuredBaseUrl.toString().replace(/\/$/, "");
const model = args.get("--model") ?? process.env.DEEPSEEK_MODEL ?? "deepseek-flash";

if (!apiKey) {
  console.error("Thiếu DEEPSEEK_API_KEY. Sao chép .env.example thành .env và điền khóa cục bộ.");
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

const requestCompletion = async (messages) => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0,
      max_tokens: 16000,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`DeepSeek API thất bại: ${message}`);
  }
  const choice = payload?.choices?.[0];
  if (!choice?.message?.content?.trim()) throw new Error("DeepSeek trả về nội dung JSON rỗng.");
  if (choice.finish_reason === "length") throw new Error("Kết quả bị cắt do giới hạn token.");
  return choice.message.content;
};

await mkdir(dirname(outputPath), { recursive: true });
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
    throw new Error("DeepSeek vẫn trả về JSON sai cú pháp sau một lần sửa.", { cause: secondError });
  }
}

const siblingPath = (suffix) =>
  outputPath.toLowerCase().endsWith(".json")
    ? `${outputPath.slice(0, -5)}${suffix}`
    : `${outputPath}${suffix}`;
const rawPath = siblingPath(".raw.json");
await writeFile(rawPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");

const rawSchemaErrors = validateAgainstSchema(schema, candidate);
const { normalized, changes } = normalizeExtraction(candidate, { sampleId, sourceText });
const schemaErrors = validateAgainstSchema(schema, normalized);
const postprocessPath = siblingPath(".postprocess.json");
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
