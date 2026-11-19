import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildDraftReviewNote, buildDraftMetadata } from "../src/prepare_draft_samples.mjs";
import { parseReviewDate, promoteDraft, uncheckedItems } from "../src/promote_draft.mjs";
import { assertCanSaveDraft, saveDraftFromRun } from "../src/run_end_to_end.mjs";
import { samplePaths } from "../src/samples.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

// Dựng một dự án giả trong thư mục tạm: có schema thật và một mẫu dùng gold qd_067 làm "draft".
async function makeFixture() {
  const root = await mkdtemp(join(tmpdir(), "texmind-promote-test-"));
  await mkdir(join(root, "schemas"), { recursive: true });
  await copyFile(
    join(repoRoot, "schemas", "texmind-document.schema.json"),
    join(root, "schemas", "texmind-document.schema.json"),
  );
  const paths = samplePaths("qd_067", root);
  await mkdir(paths.dir, { recursive: true });
  await copyFile(join(repoRoot, "dataset", "samples", "qd_067", "gold.json"), paths.draft);
  await writeFile(paths.metadata, `${JSON.stringify({ sample_id: "qd_067", review_status: "unreviewed" })}\n`);
  await writeFile(paths.review, "# Duyệt\n\n- [x] Mục 1\n- [x] Mục 2\n\n## Lịch sử\n\n");
  return { root, paths };
}

test("promote: xem trước không đổi gì; --confirm thì draft → gold và ghi ngày duyệt", async () => {
  const { root, paths } = await makeFixture();
  try {
    const draftText = await readFile(paths.draft, "utf8");
    const preview = await promoteDraft({ sampleId: "qd_067", reviewer: "Người A", reviewDate: "2026-11-20", root });
    assert.equal(preview.dryRun, true);
    assert.equal(existsSync(paths.draft), true);
    assert.equal(existsSync(paths.gold), false);

    const done = await promoteDraft({
      sampleId: "qd_067",
      reviewer: "Người A",
      reviewDate: "2026-11-20",
      root,
      confirm: true,
    });
    assert.equal(done.promoted, true);
    assert.equal(existsSync(paths.draft), false);
    assert.equal(await readFile(paths.gold, "utf8"), draftText, "nội dung giữ nguyên khi đổi tên");
    assert.match(await readFile(paths.review, "utf8"), /- 20\/11\/2026: ĐÃ DUYỆT bởi Người A; draft\.json → gold\.json\.\n$/u);
    const metadata = JSON.parse(await readFile(paths.metadata, "utf8"));
    assert.equal(metadata.review_status, "human_reviewed");
    assert.equal(metadata.reviewed_on, "2026-11-20");
    assert.equal(metadata.reviewed_by, "Người A");

    // Chạy lần nữa: đã có gold, không còn draft → từ chối.
    const again = await promoteDraft({ sampleId: "qd_067", reviewer: "Người A", reviewDate: "2026-11-20", root, confirm: true });
    assert.equal(again.promoted, false);
    assert.ok(again.problems.some((item) => item.includes("Đã có gold.json")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promote từ chối khi checklist chưa tick, thiếu người duyệt hoặc draft sai schema", async () => {
  const { root, paths } = await makeFixture();
  try {
    await writeFile(paths.review, "# Duyệt\n\n- [x] Mục 1\n- [ ] Mục chưa xong\n");
    let result = await promoteDraft({ sampleId: "qd_067", reviewer: "", reviewDate: "2026-11-20", root, confirm: true });
    assert.equal(result.promoted, false);
    assert.ok(result.problems.some((item) => item.includes("--reviewer")));
    assert.ok(result.problems.some((item) => item.includes("Mục chưa xong")));

    await writeFile(paths.review, "- [x] ok\n");
    const draft = JSON.parse(await readFile(paths.draft, "utf8"));
    delete draft.header;
    await writeFile(paths.draft, JSON.stringify(draft));
    result = await promoteDraft({ sampleId: "qd_067", reviewer: "Người A", reviewDate: "2026-11-20", root, confirm: true });
    assert.equal(result.promoted, false);
    assert.ok(result.problems.some((item) => item.includes("sai schema")));
    assert.equal(existsSync(paths.gold), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uncheckedItems và parseReviewDate", () => {
  assert.deepEqual(uncheckedItems("- [ ] a\n- [x] b\n  - [ ]  c\n"), ["a", "c"]);
  assert.equal(parseReviewDate("2026-11-21"), "2026-11-21");
  assert.equal(parseReviewDate(undefined, new Date(2026, 10, 19)), "2026-11-19");
  assert.throws(() => parseReviewDate("21/11/2026"), /YYYY-MM-DD/u);
});

test("save-draft: chép normalized thành draft.json, ghi lịch sử; từ chối khi đã có gold hoặc draft", async () => {
  const { root, paths } = await makeFixture();
  try {
    const normalizedPath = join(root, "normalized.json");
    await writeFile(normalizedPath, '{"x":1}\n');
    assert.throws(() => assertCanSaveDraft(paths), /draft\.json/u);
    await rm(paths.draft);
    await saveDraftFromRun({
      paths,
      normalizedPath,
      runId: "2026-11-19_1000_m_qd_067",
      model: "m",
      date: new Date(2026, 10, 19),
    });
    assert.equal(await readFile(paths.draft, "utf8"), '{"x":1}\n');
    assert.match(await readFile(paths.review, "utf8"), /- 19\/11\/2026: AI \(m\) tạo draft\.json từ runs\/2026-11-19_1000_m_qd_067\/normalized\.json\. CHƯA DUYỆT\.\n$/u);

    await rm(paths.draft);
    await writeFile(paths.gold, "{}");
    assert.throws(() => assertCanSaveDraft(paths), /gold\.json/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("REVIEW.md mẫu mới nhắc rõ draft chưa phải gold và có checklist chưa tick", () => {
  const metadata = buildDraftMetadata(
    {
      sample_id: "qd_999",
      source_id: "1",
      source_dataset: "d",
      source_page: "p",
      license: "CC BY 4.0",
      title: "Quyết định thử",
      clean_text_file: "clean_text/qd_999.txt",
      raw_html_file: "raw_html/qd_999.html",
    },
    { reason: "lý do", features: ["có nơi nhận"], proposed_split: "test" },
    "batch_x",
  );
  assert.equal(metadata.structured_file, null);
  assert.equal(metadata.review_status, "unreviewed");
  const note = buildDraftReviewNote(metadata);
  assert.match(note, /CHƯA phải gold/u);
  assert.ok(uncheckedItems(note).length >= 5);
  assert.match(note, /samples:promote -- --sample qd_999/u);
});
