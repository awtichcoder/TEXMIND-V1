import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const tomlString = (value) => JSON.stringify(String(value));

// Tên biến môi trường mà Codex CLI đọc token. Token chỉ đi qua biến môi trường
// của tiến trình con, không bao giờ được ghi xuống config.toml trên đĩa.
export const CODEX_TOKEN_ENV = "TEXMIND_CODEX_API_KEY";
export const DEFAULT_CODEX_TIMEOUT_MS = 10 * 60 * 1000;

const listDirs = (path) => {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

// Tìm lệnh Codex CLI theo thứ tự:
// 1) biến OPENAI_CODEX_COMMAND; 2) codex trong PATH;
// 3) codex.exe đi kèm extension VS Code "openai.chatgpt-*" (bản mới nhất);
// 4) "codex" (để spawn báo ENOENT rõ ràng nếu vẫn không có).
export function resolveCodexCommand({
  env = process.env,
  platform = process.platform,
  homeDir = homedir(),
} = {}) {
  if (env.OPENAI_CODEX_COMMAND) return env.OPENAI_CODEX_COMMAND;
  const executable = platform === "win32" ? "codex.exe" : "codex";
  for (const dir of String(env.PATH ?? env.Path ?? "").split(delimiter)) {
    if (dir && existsSync(join(dir, executable))) return join(dir, executable);
  }
  const extensionsRoot = join(homeDir, ".vscode", "extensions");
  const extensions = listDirs(extensionsRoot)
    .filter((name) => name.startsWith("openai.chatgpt-"))
    .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  for (const extension of extensions) {
    const binRoot = join(extensionsRoot, extension, "bin");
    for (const platformDir of listDirs(binRoot)) {
      const candidate = join(binRoot, platformDir, executable);
      if (existsSync(candidate)) return candidate;
    }
  }
  return "codex";
}

export function buildCodexProviderConfig({
  baseUrl,
  model,
  actorAuthorization = "local-image-extension",
  tokenEnv = CODEX_TOKEN_ENV,
  streamMaxRetries = null,
}) {
  // Số lần Codex tự thử lại khi luồng bị ngắt. Lỗi 400 (vd. schema sai) cũng bị coi là
  // "stream disconnected" nên mặc định 5 lần sẽ tốn vài phút vô ích; cho phép giảm.
  const retries = Number.isInteger(streamMaxRetries) && streamMaxRetries >= 0
    ? [`stream_max_retries = ${streamMaxRetries}`, `request_max_retries = ${streamMaxRetries}`]
    : [];
  return [
    'model_provider = "OpenAI"',
    `model = ${tomlString(model)}`,
    "disable_response_storage = true",
    "network_access = \"enabled\"",
    "",
    "[model_providers.OpenAI]",
    'name = "OpenAI"',
    `base_url = ${tomlString(baseUrl)}`,
    `model_catalog_url = ${tomlString(`${baseUrl}/models`)}`,
    'wire_api = "responses"',
    "requires_openai_auth = false",
    `env_key = ${tomlString(tokenEnv)}`,
    `http_headers = { "x-openai-actor-authorization" = ${tomlString(actorAuthorization)} }`,
    ...retries,
    "",
    "[features]",
    "api_key_model_discovery = true",
    "",
  ].join("\n");
}

export function buildCodexExecArgs({ schemaPath, outputPath, model }) {
  return [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-rules",
    "--color",
    "never",
    "--sandbox",
    "read-only",
    "--model",
    model,
    "--output-schema",
    schemaPath,
    "--output-last-message",
    outputPath,
    "-",
  ];
}

// Thay mọi lần xuất hiện của các giá trị bí mật bằng [REDACTED].
export function redactSecrets(text, secrets = []) {
  let result = String(text ?? "");
  for (const secret of secrets) {
    if (typeof secret !== "string" || secret.length < 4) continue;
    result = result.split(secret).join("[REDACTED]");
  }
  return result.replace(/(Bearer\s+)[A-Za-z0-9._\-]{8,}/gu, "$1[REDACTED]");
}

const tail = (text, limit = 4000) => (text.length > limit ? `…${text.slice(-limit)}` : text);

// Dừng cả cây tiến trình: trên Windows child.kill() chỉ dừng codex.exe, các tiến trình con
// của nó có thể vẫn giữ file trong CODEX_HOME tạm.
function killProcessTree(child) {
  if (process.platform === "win32" && child.pid) {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", () => child.kill());
    return;
  }
  child.kill();
}

// Lỗi mà gọi lại có thể hết: provider chia request qua nhiều máy chủ, có máy từ chối
// schema lớn hoặc lỗi upstream trong khi máy khác chấp nhận cùng request (đo 19/11/2026: 3/4 lần đạt).
const TRANSIENT_CODEX_ERRORS = [
  /Upstream request failed/u,
  /upstream_error/u,
  /request could not be processed/u,
  /Invalid schema for response_format/u,
  /stream disconnected before completion/u,
];

export function isTransientCodexError(message) {
  return TRANSIENT_CODEX_ERRORS.some((pattern) => pattern.test(String(message ?? "")));
}

// Gọi Codex CLI, thử lại khi gặp lỗi tạm thời. attempts = tổng số lần gọi tối đa.
export async function requestCodexCliResponseWithRetry({
  attempts = Number(process.env.OPENAI_CODEX_ATTEMPTS) || 3,
  onRetry = null,
  request = requestCodexCliResponse,
  ...options
}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await request(options);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientCodexError(error.message)) throw error;
      if (onRetry) onRetry({ attempt, attempts, error });
    }
  }
  throw lastError;
}

export async function requestCodexCliResponse({
  apiKey,
  baseUrl,
  model,
  messages,
  schemaPath,
  actorAuthorization = "local-image-extension",
  codexCommand = resolveCodexCommand(),
  timeoutMs = Number(process.env.OPENAI_CODEX_TIMEOUT_MS) || DEFAULT_CODEX_TIMEOUT_MS,
  diagnosticsPath = null,
  onStderr = null,
}) {
  const temporaryHome = await mkdtemp(join(tmpdir(), "texmind-codex-"));
  const outputPath = join(temporaryHome, "response.json");
  const workDir = join(temporaryHome, "workspace");
  const prompt = [
    "Không sử dụng công cụ, không đọc hoặc ghi tệp, không chạy lệnh. Chỉ tạo JSON theo yêu cầu và JSON Schema đã cung cấp.",
    ...messages.map(({ role, content }) => `${role.toUpperCase()}:\n${content}`),
  ].join("\n\n");

  // Dọn thư mục tạm cả khi tiến trình cha bị ngắt (Ctrl+C) trước khi finally chạy.
  const emergencyCleanup = () => {
    try {
      rmSync(temporaryHome, { recursive: true, force: true });
    } catch {
      // bỏ qua
    }
  };
  const onSignal = (signal) => {
    emergencyCleanup();
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.once("exit", emergencyCleanup);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";

  try {
    await writeFile(
      join(temporaryHome, "config.toml"),
      buildCodexProviderConfig({
        baseUrl,
        model,
        actorAuthorization,
        streamMaxRetries:
          process.env.OPENAI_CODEX_STREAM_MAX_RETRIES === undefined ||
          process.env.OPENAI_CODEX_STREAM_MAX_RETRIES === ""
            ? null
            : Number(process.env.OPENAI_CODEX_STREAM_MAX_RETRIES),
      }),
      "utf8",
    );
    await mkdir(workDir, { recursive: true });

    const exitCode = await new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(codexCommand, buildCodexExecArgs({ schemaPath, outputPath, model }), {
        // Thư mục làm việc rỗng: agent không có repo nào để tự đi đọc.
        cwd: workDir,
        env: { ...process.env, CODEX_HOME: temporaryHome, [CODEX_TOKEN_ENV]: apiKey },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      let timedOut = false;
      const timeoutError = () =>
        new Error(
          `Codex CLI quá thời gian ${Math.round(timeoutMs / 1000)} giây và đã bị dừng. ` +
            `stderr cuối: ${tail(redactSecrets(stderr, [apiKey]))}`,
        );
      const timer = setTimeout(() => {
        timedOut = true;
        killProcessTree(child);
        // Chờ tiến trình thoát (sự kiện close) để nó nhả file trong CODEX_HOME;
        // nếu 10 giây vẫn chưa thoát thì báo lỗi luôn.
        setTimeout(() => rejectPromise(timeoutError()), 10_000).unref();
      }, timeoutMs);
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
        if (onStderr) onStderr(redactSecrets(chunk, [apiKey]));
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        rejectPromise(new Error(redactSecrets(error.message, [apiKey])));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) rejectPromise(timeoutError());
        else resolvePromise(code);
      });
      child.stdin.end(prompt, "utf8");
    });

    if (exitCode !== 0) {
      const details = redactSecrets(String(stderr || stdout || "").trim(), [apiKey]);
      throw new Error(`Codex CLI thất bại (exit ${exitCode}): ${tail(details)}`);
    }
    const content = await readFile(outputPath, "utf8");
    if (!content.trim()) throw new Error("Codex CLI trả về nội dung JSON rỗng.");
    return content.trim();
  } finally {
    if (diagnosticsPath) {
      const report = {
        command: codexCommand,
        model,
        elapsed_ms: Date.now() - startedAt,
        timeout_ms: timeoutMs,
        stdout_tail: tail(redactSecrets(stdout, [apiKey])),
        stderr_tail: tail(redactSecrets(stderr, [apiKey])),
      };
      await writeFile(diagnosticsPath, `${JSON.stringify(report, null, 2)}\n`, "utf8").catch(() => {});
    }
    // Có thử lại vì trên Windows file có thể còn bị khóa ngay sau khi tiến trình thoát.
    // Lỗi xóa không được che lỗi gốc; trình dọn khẩn cấp lúc thoát vẫn còn.
    const removed = await rm(temporaryHome, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 300,
    }).then(
      () => true,
      () => false,
    );
    // Nếu chưa xóa được thì giữ listener "exit" để xóa lại khi tiến trình cha kết thúc.
    if (removed) process.removeListener("exit", emergencyCleanup);
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}
