import assert from "node:assert/strict";
import test from "node:test";
import { buildExtractionSystemPrompt } from "../src/extraction_prompt.mjs";

test("prompt yêu cầu giữ nguyên tiêu đề và toàn bộ căn cứ pháp lý", () => {
  const prompt = buildExtractionSystemPrompt("qd_014");
  assert.match(prompt, /heading của mỗi điều phải được chép nguyên văn/u);
  assert.match(prompt, /toàn bộ một căn cứ/u);
  assert.match(prompt, /không rút gọn/u);
  assert.match(prompt, /Theo đề nghị/u);
  assert.match(prompt, /sample_id bắt buộc là 'qd_014'/u);
});

test("prompt cấm tự đánh số khoản không có ký hiệu nguồn", () => {
  const prompt = buildExtractionSystemPrompt();
  assert.match(prompt, /nếu nguồn không in số hoặc ký hiệu thì đặt number=null/u);
  assert.match(prompt, /Không tự gán number='1'/u);
  assert.match(prompt, /cụm 'TM\.' đi cùng tên cơ quan trong authority/u);
  assert.match(prompt, /'được lập thành N danh mục'/u);
  assert.match(prompt, /included_in_source=false/u);
  assert.doesNotMatch(prompt, /sample_id bắt buộc/u);
});

test("prompt không lặp nội dung điều thành khoản và không bịa điều mới", () => {
  const prompt = buildExtractionSystemPrompt();
  assert.match(prompt, /không lặp lại cùng văn bản thành một clause/u);
  assert.match(prompt, /clause number=null của điều trước đó/u);
  assert.match(prompt, /không tự tạo điều mới/u);
});
