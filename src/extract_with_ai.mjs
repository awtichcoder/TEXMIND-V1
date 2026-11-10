import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
const apiKey = process.env.DEEPSEEK_API_KEY;
const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
const model = args.get("--model") ?? process.env.DEEPSEEK_MODEL ?? "deepseek-flash";

if (!apiKey) {
  console.error("Thiếu DEEPSEEK_API_KEY. Sao chép .env.example thành .env và điền khóa cục bộ.");
  process.exit(2);
}

const [sourceText, schema] = await Promise.all([
  readFile(inputPath, "utf8"),
  readFile(schemaPath, "utf8").then(JSON.parse),
]);

const systemPrompt = [
  "Bạn là bộ trích xuất dữ liệu văn bản hành chính tiếng Việt.",
  "Chỉ trả về đúng một JSON object, không Markdown, không giải thích.",
  "JSON phải tuân thủ schema được cung cấp, không thêm trường ngoài schema.",
  "Giữ nguyên câu chữ nguồn; không sửa lỗi nghi OCR và không bịa dữ liệu thiếu.",
  "Nếu chưa chọn template thì đặt template=null.",
  "Nếu khoản không có số/ký hiệu thì đặt number=null.",
  "Dùng children cho khoản/điểm lồng nhau.",
  "Phụ lục chỉ được tham chiếu nhưng không có nội dung phải có included_in_source=false.",
  "Ghi mâu thuẫn hoặc lỗi nghi ngờ vào provenance.source_anomalies và quality.warnings.",
].join("\n");

const userPrompt = [
  "JSON SCHEMA:",
  JSON.stringify(schema),
  "VĂN BẢN NGUỒN:",
  sourceText,
].join("\n\n");

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    stream: false,
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

let candidate;
try {
  candidate = JSON.parse(choice.message.content);
} catch (error) {
  throw new Error("DeepSeek không trả về JSON hợp lệ.", { cause: error });
}

const schemaErrors = validateAgainstSchema(schema, candidate);
await mkdir(dirname(outputPath), { recursive: true });
if (schemaErrors.length > 0) {
  const invalidPath = outputPath.replace(/\.json$/i, ".invalid.json");
  const errorPath = outputPath.replace(/\.json$/i, ".schema-errors.json");
  await writeFile(invalidPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  await writeFile(errorPath, `${JSON.stringify(schemaErrors, null, 2)}\n`, "utf8");
  throw new Error(`Kết quả AI sai schema (${schemaErrors.length} lỗi). Xem ${errorPath}`);
}

await writeFile(outputPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
console.log(`PASS: AI extraction hợp lệ theo schema -> ${outputPath}`);
console.log(`Model: ${model}`);
