export function buildResponsesRequest({ model, messages, maxOutputTokens = 16000 }) {
  return {
    model,
    input: messages.map(({ role, content }) => ({
      role,
      content: [{ type: "input_text", text: content }],
    })),
    text: { format: { type: "json_object" } },
    max_output_tokens: maxOutputTokens,
    store: false,
  };
}

export function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const textParts = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "refusal" && content.refusal) {
        throw new Error(`Model từ chối yêu cầu: ${content.refusal}`);
      }
      if (
        (content?.type === "output_text" || content?.type === "text") &&
        typeof content.text === "string"
      ) {
        textParts.push(content.text);
      }
    }
  }
  return textParts.join("").trim();
}

export async function requestOpenAICompatibleResponse({
  baseUrl,
  apiKey,
  model,
  messages,
  actorAuthorization = null,
  fetchImpl = fetch,
}) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (actorAuthorization) {
    headers["x-openai-actor-authorization"] = actorAuthorization;
  }

  const response = await fetchImpl(`${baseUrl}/responses`, {
    method: "POST",
    headers,
    body: JSON.stringify(buildResponsesRequest({ model, messages })),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? payload?.message ?? `HTTP ${response.status}`;
    throw new Error(`OpenAI-compatible API thất bại: ${message}`);
  }
  if (payload?.status === "incomplete") {
    const reason = payload?.incomplete_details?.reason ?? "không rõ nguyên nhân";
    throw new Error(`Kết quả Responses API chưa hoàn tất: ${reason}.`);
  }

  const content = extractResponseText(payload);
  if (!content) throw new Error("Responses API trả về nội dung JSON rỗng.");
  return content;
}
