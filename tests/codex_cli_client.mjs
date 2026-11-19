import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CODEX_TOKEN_ENV,
  buildCodexExecArgs,
  buildCodexProviderConfig,
  isTransientCodexError,
  redactSecrets,
  requestCodexCliResponse,
  requestCodexCliResponseWithRetry,
  resolveCodexCommand,
} from "../src/codex_cli_client.mjs";

test("gọi lại Codex khi lỗi tạm thời, dừng ngay khi lỗi không tạm thời", async () => {
  let calls = 0;
  const retries = [];
  const flaky = async () => {
    calls += 1;
    if (calls < 3) throw new Error('ERROR: {"error":{"message":"Upstream request failed"}}');
    return '{"ok":true}';
  };
  assert.equal(
    await requestCodexCliResponseWithRetry({ attempts: 3, request: flaky, onRetry: (info) => retries.push(info.attempt) }),
    '{"ok":true}',
  );
  assert.equal(calls, 3);
  assert.deepEqual(retries, [1, 2]);

  let fatalCalls = 0;
  const fatal = async () => {
    fatalCalls += 1;
    throw new Error("spawn codex ENOENT");
  };
  await assert.rejects(requestCodexCliResponseWithRetry({ attempts: 3, request: fatal }), /ENOENT/u);
  assert.equal(fatalCalls, 1);

  let alwaysCalls = 0;
  const always = async () => {
    alwaysCalls += 1;
    throw new Error("Invalid schema for response_format 'codex_output_schema'");
  };
  await assert.rejects(requestCodexCliResponseWithRetry({ attempts: 2, request: always }), /Invalid schema/u);
  assert.equal(alwaysCalls, 2);
  assert.equal(isTransientCodexError("Upstream request failed"), true);
  assert.equal(isTransientCodexError("Thiếu OPENAI_API_KEY"), false);
});

test("cấu hình Codex chỉ ghi số lần thử lại khi được đặt rõ", () => {
  const base = { baseUrl: "https://provider.example/v1", model: "gpt-test" };
  assert.equal(buildCodexProviderConfig(base).includes("stream_max_retries"), false);
  const config = buildCodexProviderConfig({ ...base, streamMaxRetries: 1 });
  assert.match(config, /stream_max_retries = 1/u);
  assert.match(config, /request_max_retries = 1/u);
  // Các dòng thử lại phải nằm trong bảng provider, trước [features].
  assert.ok(config.indexOf("stream_max_retries") < config.indexOf("[features]"));
  assert.equal(buildCodexProviderConfig({ ...base, streamMaxRetries: Number.NaN }).includes("retries"), false);
});

test("tìm Codex CLI: biến OPENAI_CODEX_COMMAND → PATH → codex.exe trong extension VS Code mới nhất", async () => {
  const home = await mkdtemp(join(tmpdir(), "texmind-resolve-test-"));
  try {
    assert.equal(
      resolveCodexCommand({ env: { OPENAI_CODEX_COMMAND: "C:/tool/codex.exe" }, platform: "win32", homeDir: home }),
      "C:/tool/codex.exe",
    );
    // Không có gì: trả về "codex" để spawn báo ENOENT rõ ràng.
    assert.equal(resolveCodexCommand({ env: { PATH: "" }, platform: "win32", homeDir: home }), "codex");

    const extensions = join(home, ".vscode", "extensions");
    for (const version of ["26.900.1", "26.1111.21308"]) {
      const bin = join(extensions, `openai.chatgpt-${version}-win32-x64`, "bin", "windows-x86_64");
      await mkdir(bin, { recursive: true });
      await writeFile(join(bin, "codex.exe"), "");
    }
    assert.equal(
      resolveCodexCommand({ env: { PATH: "" }, platform: "win32", homeDir: home }),
      join(extensions, "openai.chatgpt-26.1111.21308-win32-x64", "bin", "windows-x86_64", "codex.exe"),
    );

    const pathDir = join(home, "path-bin");
    await mkdir(pathDir);
    await writeFile(join(pathDir, "codex.exe"), "");
    assert.equal(
      resolveCodexCommand({ env: { Path: pathDir }, platform: "win32", homeDir: home }),
      join(pathDir, "codex.exe"),
    );
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("cấu hình Codex CLI dùng provider Responses, tắt lưu phản hồi và không chứa token", () => {
  const config = buildCodexProviderConfig({
    baseUrl: "https://provider.example/v1",
    model: "gpt-test",
  });

  assert.match(config, /model_provider = "OpenAI"/u);
  assert.match(config, /wire_api = "responses"/u);
  assert.match(config, /disable_response_storage = true/u);
  assert.match(config, /requires_openai_auth = false/u);
  assert.match(config, new RegExp(`env_key = "${CODEX_TOKEN_ENV}"`, "u"));
  assert.doesNotMatch(config, /experimental_bearer_token/u);
  assert.match(config, /x-openai-actor-authorization/u);
});

test("Codex exec chạy ephemeral, read-only và ghi final JSON theo schema", () => {
  const args = buildCodexExecArgs({
    schemaPath: "schema.json",
    outputPath: "response.json",
    model: "gpt-test",
  });

  assert.ok(args.includes("--ephemeral"));
  assert.ok(!args.includes("--ask-for-approval"));
  assert.ok(!args.includes("--dangerously-bypass-approvals-and-sandbox"));
  assert.deepEqual(args.slice(args.indexOf("--sandbox"), args.indexOf("--sandbox") + 2), [
    "--sandbox",
    "read-only",
  ]);
  assert.deepEqual(args.slice(args.indexOf("--output-schema"), args.indexOf("--output-schema") + 2), [
    "--output-schema",
    "schema.json",
  ]);
  assert.deepEqual(
    args.slice(args.indexOf("--output-last-message"), args.indexOf("--output-last-message") + 2),
    ["--output-last-message", "response.json"],
  );
  assert.equal(args.at(-1), "-");
});

test("redactSecrets che token và header Bearer", () => {
  const text = "lỗi với khóa sk-abc123456789 và Authorization: Bearer xyzXYZ0123456789";
  const redacted = redactSecrets(text, ["sk-abc123456789"]);
  assert.doesNotMatch(redacted, /sk-abc123456789/u);
  assert.doesNotMatch(redacted, /xyzXYZ0123456789/u);
  assert.match(redacted, /\[REDACTED\]/u);
});

test("Codex CLI lỗi vẫn xóa thư mục tạm và không lộ token trong thông báo", async () => {
  const listTemp = async () =>
    new Set((await readdir(tmpdir())).filter((name) => name.startsWith("texmind-codex-")));
  const before = await listTemp();
  const fakeKey = "fake-secret-token-for-test";

  await assert.rejects(
    requestCodexCliResponse({
      apiKey: fakeKey,
      baseUrl: "https://provider.example/v1",
      model: "gpt-test",
      messages: [{ role: "user", content: "{}" }],
      schemaPath: "schema.json",
      // Node sẽ thoát lỗi ngay vì không có script "exec": giả lập Codex thất bại.
      codexCommand: process.execPath,
      timeoutMs: 30_000,
    }),
    (error) => {
      assert.match(error.message, /Codex CLI thất bại/u);
      assert.doesNotMatch(error.message, new RegExp(fakeKey, "u"));
      return true;
    },
  );

  const after = await listTemp();
  const leftovers = [...after].filter((name) => !before.has(name));
  assert.deepEqual(leftovers, []);
});
