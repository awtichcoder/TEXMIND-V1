import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(projectRoot, "dataset", "hf_quyet_dinh");

test("bộ mẫu Hugging Face có đủ 100 văn bản Quyết định hợp lệ", async () => {
  const summary = JSON.parse(await readFile(resolve(root, "summary.json"), "utf8"));
  const manifestLines = (await readFile(resolve(root, "manifest.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const htmlFiles = (await readdir(resolve(root, "raw_html"))).filter((name) => name.endsWith(".html"));
  const textFiles = (await readdir(resolve(root, "clean_text"))).filter((name) => name.endsWith(".txt"));
  const metadataFiles = (await readdir(resolve(root, "metadata"))).filter((name) => name.endsWith(".json"));

  assert.equal(summary.collected_count, 100);
  assert.equal(htmlFiles.length, 100);
  assert.equal(textFiles.length, 100);
  assert.equal(metadataFiles.length, 100);
  assert.equal(manifestLines.length, 100);
  assert.equal(new Set(manifestLines.map((item) => item.source_id)).size, 100);

  for (const record of manifestLines) {
    assert.equal(record.document_type, "Quyết định");
    assert.equal(record.review_status, "unreviewed");
    assert.equal(record.license, "CC BY 4.0");
    assert.equal(record.expected_output_file, null);

    const text = (await readFile(resolve(root, record.clean_text_file), "utf8")).trim();
    const html = (await readFile(resolve(root, record.raw_html_file), "utf8")).trim();
    assert.ok(text.length >= summary.min_chars);
    assert.ok(text.length <= summary.max_chars);
    assert.equal(text.length, record.text_char_count);
    assert.ok(html.length > 0);
  }
});

test("shortlist có đúng 10 mẫu và đề xuất qd_021", async () => {
  const shortlistRoot = resolve(root, "shortlist_10");
  const manifest = JSON.parse(await readFile(resolve(shortlistRoot, "manifest.json"), "utf8"));
  const htmlFiles = (await readdir(resolve(shortlistRoot, "raw_html"))).filter((name) => name.endsWith(".html"));
  const textFiles = (await readdir(resolve(shortlistRoot, "clean_text"))).filter((name) => name.endsWith(".txt"));
  const metadataFiles = (await readdir(resolve(shortlistRoot, "metadata"))).filter((name) => name.endsWith(".json"));

  assert.equal(manifest.source_count, 100);
  assert.equal(manifest.shortlist_count, 10);
  assert.equal(manifest.recommended_first_sample, "qd_021");
  assert.equal(manifest.samples.length, 10);
  assert.equal(new Set(manifest.samples.map((item) => item.sample_id)).size, 10);
  assert.equal(htmlFiles.length, 10);
  assert.equal(textFiles.length, 10);
  assert.equal(metadataFiles.length, 10);
});
