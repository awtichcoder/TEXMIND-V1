// Smoke test nhỏ cho đường gọi Codex CLI: yêu cầu model trả {"ok": true} theo schema tí hon.
// Mục đích: xác nhận provider chấp nhận Codex CLI, --output-schema/--output-last-message hoạt động,
// đo thời gian phản hồi và chắc chắn tiến trình không bị treo. Không bao giờ in token.
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requestCodexCliResponse } from "./codex_cli_client.mjs";

const envPath = resolve(".env");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!Object.hasOwn(process.env, name)) process.env[name] = value;
  }
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Thiếu OPENAI_API_KEY trong .env.");
  process.exit(2);
}
const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.xingchiapi.com/v1").replace(/\/$/, "");
const model = process.env.OPENAI_MODEL ?? "gpt-6.1-sol";
const timeoutMs = Number(process.env.OPENAI_CODEX_SMOKE_TIMEOUT_MS) || 180_000;

const workDir = resolve("work", "codex_smoke");
await mkdir(workDir, { recursive: true });
const schemaPath = resolve(workDir, "smoke.schema.json");
await writeFile(
  schemaPath,
  `${JSON.stringify(
    {
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
      additionalProperties: false,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Model: ${model}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Timeout: ${Math.round(timeoutMs / 1000)} giây`);
const startedAt = Date.now();
const summary = { model, base_url: baseUrl, started_at: new Date(startedAt).toISOString() };
try {
  const content = await requestCodexCliResponse({
    apiKey,
    baseUrl,
    model,
    schemaPath,
    timeoutMs,
    actorAuthorization: process.env.OPENAI_ACTOR_AUTHORIZATION ?? "local-image-extension",
    diagnosticsPath: resolve(workDir, "smoke.codex-diagnostics.json"),
    onStderr: (chunk) => process.stderr.write(chunk),
    messages: [
      { role: "system", content: "Bạn chỉ trả về JSON hợp lệ." },
      { role: "user", content: 'Trả về đúng JSON {"ok": true}.' },
    ],
  });
  const parsed = JSON.parse(content);
  summary.elapsed_ms = Date.now() - startedAt;
  summary.response = parsed;
  summary.status = parsed?.ok === true ? "passed" : "unexpected_response";
} catch (error) {
  summary.elapsed_ms = Date.now() - startedAt;
  summary.status = "failed";
  summary.error = error.message;
}
await writeFile(resolve(workDir, "smoke.result.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.status === "passed" ? 0 : 1);
