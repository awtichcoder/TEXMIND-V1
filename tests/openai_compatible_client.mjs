import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResponsesRequest,
  extractResponseText,
  requestOpenAICompatibleResponse,
} from "../src/openai_compatible_client.mjs";

test("Responses API dùng JSON mode, không lưu phản hồi và giới hạn output token", () => {
  const request = buildResponsesRequest({
    model: "gpt-test",
    messages: [{ role: "system", content: "Chỉ trả về JSON." }],
  });

  assert.equal(request.model, "gpt-test");
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, 16000);
  assert.deepEqual(request.text, { format: { type: "json_object" } });
  assert.deepEqual(request.input[0], {
    role: "system",
    content: [{ type: "input_text", text: "Chỉ trả về JSON." }],
  });
});

test("bộ đọc Responses API lấy được output_text ở cả hai dạng phản hồi", () => {
  assert.equal(extractResponseText({ output_text: '{"ok":true}' }), '{"ok":true}');
  assert.equal(
    extractResponseText({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"ok":true}' }],
        },
      ],
    }),
    '{"ok":true}',
  );
});

test("client gọi đúng endpoint responses và gửi header tương thích", async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ output_text: '{"ok":true}' }),
    };
  };

  const result = await requestOpenAICompatibleResponse({
    baseUrl: "https://provider.example/v1",
    apiKey: "test-key",
    model: "gpt-test",
    messages: [{ role: "user", content: "Trả về JSON." }],
    actorAuthorization: "local-image-extension",
    fetchImpl,
  });

  assert.equal(result, '{"ok":true}');
  assert.equal(captured.url, "https://provider.example/v1/responses");
  assert.equal(captured.options.headers.Authorization, "Bearer test-key");
  assert.equal(
    captured.options.headers["x-openai-actor-authorization"],
    "local-image-extension",
  );
});

test("client báo lỗi HTTP và phản hồi incomplete rõ ràng", async () => {
  await assert.rejects(
    requestOpenAICompatibleResponse({
      baseUrl: "https://provider.example/v1",
      apiKey: "test-key",
      model: "gpt-test",
      messages: [],
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "hết hạn mức" } }),
      }),
    }),
    /hết hạn mức/u,
  );

  await assert.rejects(
    requestOpenAICompatibleResponse({
      baseUrl: "https://provider.example/v1",
      apiKey: "test-key",
      model: "gpt-test",
      messages: [],
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        }),
      }),
    }),
    /max_output_tokens/u,
  );
});

test("client báo refusal thay vì cố parse thành JSON", () => {
  assert.throws(
    () =>
      extractResponseText({
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "Không thể xử lý" }],
          },
        ],
      }),
    /Model từ chối yêu cầu/u,
  );
});
