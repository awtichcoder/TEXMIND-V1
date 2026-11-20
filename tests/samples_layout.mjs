import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  averageByModel,
  buildScoreboardRow,
  renderScoreboard,
} from "../src/build_scoreboard.mjs";
import {
  buildPipelineStages,
  readEnvValue,
  resolveModelName,
  resolveSampleRun,
  summarizeScore,
} from "../src/run_end_to_end.mjs";
import {
  SPLIT_NAMES,
  buildRunId,
  listSamples,
  readSplits,
  samplePaths,
  splitOf,
} from "../src/samples.mjs";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const readText = (path) => readFile(path, "utf8");
const readJson = async (path) => JSON.parse(await readText(path));

// Ánh xạ cũ → mới đã chốt khi sao chép mẫu.
const LEGACY_MAP = {
  qd_066: "01",
  qd_021: "02",
  qd_067: "03",
  qd_014: "04",
  qd_030: "05",
  qd_010: "06",
};

test("mỗi mẫu có source, metadata, REVIEW; mẫu cũ có gold; không mẫu nào vừa draft vừa gold", async () => {
  const samples = await listSamples(root);
  for (const sampleId of Object.keys(LEGACY_MAP)) {
    assert.ok(samples.includes(sampleId), `thiếu mẫu cũ ${sampleId}`);
    assert.ok(existsSync(samplePaths(sampleId, root).gold), `${sampleId} thiếu gold`);
  }
  for (const sampleId of samples) {
    const paths = samplePaths(sampleId, root);
    for (const key of ["source", "metadata", "review"]) {
      assert.ok(existsSync(paths[key]), `${sampleId} thiếu ${key}`);
    }
    assert.equal(
      existsSync(paths.gold) && existsSync(paths.draft),
      false,
      `${sampleId} có cả draft.json và gold.json`,
    );
    const metadata = await readJson(paths.metadata);
    assert.equal(metadata.sample_id, sampleId);
  }
});

test("mẫu đợt mới: source giống hệt clean_text HF, chưa tự có gold, lý do chọn đầy đủ", async () => {
  const batch = await readJson(join(root, "dataset", "selection", "batch_2026-11-19.json"));
  assert.equal(batch.samples.length, 10);
  const ids = batch.samples.map((item) => item.sample_id);
  assert.equal(new Set(ids).size, 10);
  for (const item of batch.samples) {
    assert.equal(Object.hasOwn(LEGACY_MAP, item.sample_id), false, `${item.sample_id} là mẫu đã dùng`);
    assert.ok(item.reason.length > 40, `${item.sample_id} thiếu lý do chọn`);
    assert.ok(["train", "test"].includes(item.proposed_split));
    const paths = samplePaths(item.sample_id, root);
    const metadata = await readJson(paths.metadata);
    assert.equal(
      await readText(paths.source),
      await readText(join(root, metadata.hf_files.clean_text)),
      `${item.sample_id}: source khác clean_text`,
    );
    // Có gold.json thì metadata phải ghi rõ ai duyệt (người hoặc AI); chưa duyệt thì không được có gold.
    if (existsSync(paths.gold)) {
      assert.ok(
        ["human_reviewed", "ai_reviewed"].includes(metadata.review_status),
        `${item.sample_id} có gold nhưng review_status = ${metadata.review_status}`,
      );
      assert.ok(metadata.reviewed_on && metadata.reviewed_by, `${item.sample_id} thiếu ngày/người duyệt`);
    }
  }
});

test("source và gold mới giống hệt bản cũ, gold hợp lệ JSON Schema", async () => {
  const schema = await readJson(join(root, "schemas", "texmind-document.schema.json"));
  for (const [sampleId, legacyNumber] of Object.entries(LEGACY_MAP)) {
    const paths = samplePaths(sampleId, root);
    const legacyDir = join(root, "dataset", "van_ban_hanh_chinh");
    assert.equal(
      await readText(paths.source),
      await readText(join(legacyDir, `input_${legacyNumber}.txt`)),
      `${sampleId}: source khác bản cũ`,
    );
    const goldText = await readText(paths.gold);
    assert.equal(
      goldText,
      await readText(join(legacyDir, `structured_${legacyNumber}.json`)),
      `${sampleId}: gold khác bản cũ`,
    );
    const gold = JSON.parse(goldText);
    assert.equal(gold.sample_id, sampleId);
    assert.deepEqual(validateAgainstSchema(schema, gold), [], `${sampleId}: gold sai schema`);
  }
});

test("các split train/dev/test không giao nhau và chỉ chứa mẫu có thật", async () => {
  const splits = await readSplits(root);
  const samples = new Set(await listSamples(root));
  const seen = new Map();
  for (const name of SPLIT_NAMES) {
    for (const sampleId of splits[name]) {
      assert.ok(samples.has(sampleId), `${name}: mẫu ${sampleId} không tồn tại`);
      assert.equal(seen.has(sampleId), false, `${sampleId} nằm ở cả ${seen.get(sampleId)} và ${name}`);
      seen.set(sampleId, name);
    }
  }
  assert.ok(splits.test.length > 0, "tập test không được rỗng");
  assert.equal(splitOf("qd_067", splits), "dev");
  assert.equal(splitOf("qd_042", splits), "test");
  // Quy ước 19/11/2026: test chỉ gồm văn bản mới, không chứa 6 mẫu đã xem khi viết prompt.
  for (const sampleId of Object.keys(LEGACY_MAP)) {
    assert.notEqual(splitOf(sampleId, splits), "test", `${sampleId} đã xem khi phát triển, không được ở test`);
  }
  assert.equal(splitOf("qd_khong_co", splits), null);
});

test("buildRunId theo dạng <ngày>_<giờphút>_<model>_<mã> và làm sạch tên model", () => {
  const date = new Date(2026, 10, 19, 8, 5);
  assert.equal(
    buildRunId({ date, model: "gpt-6.1-sol", sampleId: "qd_067" }),
    "2026-11-19_0805_gpt-6.1-sol_qd_067",
  );
  assert.equal(
    buildRunId({ date, model: "Qwen/Qwen2.5 3B", sampleId: "qd_014" }),
    "2026-11-19_0805_Qwen-Qwen2.5-3B_qd_014",
  );
  assert.throws(() => buildRunId({ date, model: "x", sampleId: "../qd" }), /Mã mẫu không hợp lệ/u);
});

test("chế độ --sample đặt đường dẫn trong runs/<run_id>/ và replay dùng nhãn replay", () => {
  const date = new Date(2026, 10, 19, 9, 30);
  const live = resolveSampleRun({ sampleId: "qd_067", model: "gpt-6.1-sol", date, root });
  assert.equal(live.runId, "2026-11-19_0930_gpt-6.1-sol_qd_067");
  assert.equal(live.run.dir, join(root, "runs", live.runId));
  assert.equal(live.run.score, join(live.run.dir, "score.json"));
  assert.equal(live.sample.source, join(root, "dataset", "samples", "qd_067", "source.txt"));

  const replay = resolveSampleRun({ sampleId: "qd_067", model: "gpt-6.1-sol", replay: true, date, root });
  assert.equal(replay.runId, "2026-11-19_0930_replay_qd_067");
});

test("chọn model: --model → OPENAI_MODEL → dòng trong .env → mặc định", () => {
  assert.equal(resolveModelName({ cliModel: "a", env: { OPENAI_MODEL: "b" }, envFileModel: "c" }), "a");
  assert.equal(resolveModelName({ env: { OPENAI_MODEL: "b" }, envFileModel: "c" }), "b");
  assert.equal(resolveModelName({ env: {}, envFileModel: "c" }), "c");
  assert.equal(resolveModelName({ env: {} }), "gpt-6.1-sol");

  const envFile = ["OPENAI_API_KEY=khong-duoc-dung", 'OPENAI_MODEL="gpt-x"', "# OPENAI_MODEL=bo-qua"].join("\n");
  assert.equal(readEnvValue(envFile, "OPENAI_MODEL"), "gpt-x");
  assert.equal(readEnvValue("OPENAI_MODEL_EXTRA=z", "OPENAI_MODEL"), null);
});

test("có gold thì pipeline thêm stage evaluate sau render", () => {
  const base = {
    mode: "ai_extract",
    nodePath: "node-test",
    sourcePath: "source.txt",
    schemaPath: "schema.json",
    sampleId: "qd_test",
    rawPath: "raw.json",
    normalizedPath: "normalized.json",
    postprocessPath: "postprocess.json",
    documentPath: "rendered.docx",
    referencePath: "reference.docx",
  };
  const withGold = buildPipelineStages({ ...base, goldPath: "gold.json", scorePath: "score.json" });
  assert.deepEqual(withGold.map((stage) => stage.name), [
    "extract_and_normalize",
    "select_template_and_render",
    "evaluate",
  ]);
  assert.match(withGold[2].args[0], /evaluate_structured\.mjs$/u);
  assert.deepEqual(withGold[2].args.slice(1), [
    "--expected",
    "gold.json",
    "--actual",
    "normalized.json",
    "--report",
    "score.json",
  ]);

  const withoutGold = buildPipelineStages(base);
  assert.equal(withoutGold.some((stage) => stage.name === "evaluate"), false);
  assert.throws(() => buildPipelineStages({ ...base, goldPath: "gold.json" }), /score/u);
});

test("summarizeScore rút điểm strict/tolerant từ score.json", () => {
  assert.deepEqual(
    summarizeScore({
      schema_valid: true,
      strict_evaluation: { overall_score: 0.8 },
      tolerant_evaluation: { overall_score: 0.9 },
    }),
    { schema_valid: true, strict_overall_score: 0.8, tolerant_overall_score: 0.9 },
  );
  assert.equal(summarizeScore(null), null);
});

test("renderScoreboard tạo bảng theo lần chạy và trung bình theo model trên tập test", () => {
  const rows = [
    { run_id: "2026-11-19_0900_m1_qd_067", sample_id: "qd_067", split: "test", model: "m1", mode: "ai_extract", template_id: "TM-QD-002", status: "completed", schema_valid: true, strict: 0.8, tolerant: 0.9 },
    { run_id: "2026-11-19_0910_m1_qd_014", sample_id: "qd_014", split: "test", model: "m1", mode: "ai_extract", template_id: "TM-QD-002", status: "completed", schema_valid: true, strict: 0.6, tolerant: 0.7 },
    { run_id: "2026-11-19_0920_m2_qd_067", sample_id: "qd_067", split: "test", model: "m2", mode: "ai_extract", template_id: "TM-QD-002", status: "completed", schema_valid: false, strict: 0.5, tolerant: 0.6 },
    { run_id: "2026-11-19_0930_m1_qd_021", sample_id: "qd_021", split: "dev", model: "m1", mode: "ai_extract", template_id: "TM-QD-002", status: "completed", schema_valid: true, strict: 0.1, tolerant: 0.1 },
    { run_id: "2026-11-19_0940_replay_qd_067", sample_id: "qd_067", split: "test", model: "replay", mode: "saved_raw", template_id: "TM-QD-002", status: "completed", schema_valid: true, strict: 1, tolerant: 1 },
  ];
  const averages = averageByModel(rows);
  assert.deepEqual(averages.map((item) => item.model), ["m1", "m2"], "replay không vào bảng trung bình");
  assert.equal(averages[0].runs, 2);
  assert.equal(averages[0].samples, 2);
  assert.ok(Math.abs(averages[0].strict - 0.7) < 1e-9, "mẫu dev không được tính vào trung bình test");

  const markdown = renderScoreboard(rows, { generatedAt: "2026-11-19T00:00:00Z" });
  assert.match(markdown, /^# Bảng điểm TexMind/u);
  assert.match(markdown, /\| m1 \| 2 \| 2 \| 0\.7000 \| 0\.8000 \|/u);
  assert.match(markdown, /\| 2026-11-19_0920_m2_qd_067 \| qd_067 \| test \| m2 .*\| LỖI \| – \| – \| 0\.5000 \| 0\.6000 \|/u);
  assert.match(markdown, /không phải gold/u);
  // Bảng theo lần chạy sắp theo run_id.
  assert.ok(markdown.indexOf("0900_m1_qd_067") < markdown.indexOf("0930_m1_qd_021"));

  assert.match(renderScoreboard([]), /Chưa có lần chạy nào/u);
});

test("buildScoreboardRow ưu tiên score.json, dự phòng điểm trong pipeline.json", () => {
  const pipeline = {
    run_id: "r1",
    sample_id: "qd_067",
    split: "test",
    model: "m1",
    mode: "ai_extract",
    status: "completed",
    selected_template: { templateId: "TM-QD-002" },
    strict_evaluation: { overall_score: 0.5 },
    tolerant_evaluation: { overall_score: 0.6 },
  };
  const fromPipeline = buildScoreboardRow("dir", pipeline, null);
  assert.equal(fromPipeline.strict, 0.5);
  assert.equal(fromPipeline.template_id, "TM-QD-002");
  const fromScore = buildScoreboardRow("dir", pipeline, {
    schema_valid: true,
    strict_evaluation: { overall_score: 0.9 },
    tolerant_evaluation: { overall_score: 0.95 },
  });
  assert.equal(fromScore.strict, 0.9);
  assert.equal(fromScore.schema_valid, true);
});

test("chế độ --sample truyền metadata để điền khối source; normalizer lấy đúng giá trị", async () => {
  const { normalizeExtraction, sourceInfoFromMetadata } = await import("../src/normalize_extraction.mjs");
  const stages = buildPipelineStages({
    mode: "ai_extract",
    nodePath: "node",
    sourcePath: "s.txt",
    schemaPath: "schema.json",
    sampleId: "qd_042",
    rawPath: "raw.json",
    normalizedPath: "n.json",
    postprocessPath: "p.json",
    documentPath: "d.docx",
    referencePath: "r.docx",
    sourceMetadataPath: "metadata.json",
  });
  assert.deepEqual(stages[0].args.slice(-2), ["--source-metadata", "metadata.json"]);
  const metadata = await readJson(samplePaths("qd_042", root).metadata);
  const { normalized } = normalizeExtraction(
    { source: { source_id: "qd_042", dataset: "Không được cung cấp", license: "x", input_file: "y", preserve_original_content: true } },
    { sourceInfo: sourceInfoFromMetadata(metadata) },
  );
  assert.deepEqual(normalized.source, {
    source_id: metadata.source_id,
    dataset: "th1nhng0/vietnamese-legal-documents",
    license: "CC BY 4.0",
    input_file: "source.txt",
    preserve_original_content: true,
  });
});

test("bảng điểm dùng split hiện tại thay cho split cũ ghi trong pipeline.json", () => {
  const pipeline = { run_id: "r", sample_id: "qd_067", split: "test", model: "m", status: "completed" };
  assert.equal(buildScoreboardRow("r", pipeline, null, "dev").split, "dev");
  assert.equal(buildScoreboardRow("r", pipeline, null, null).split, null);
  assert.equal(buildScoreboardRow("r", pipeline, null).split, "test");
});

test("bảng điểm: nhãn loại duyệt gold (người / AI / gold cũ)", async () => {
  const { reviewKindLabel } = await import("../src/build_scoreboard.mjs");
  assert.equal(reviewKindLabel({ review_status: "ai_reviewed" }), "AI");
  assert.equal(reviewKindLabel({ review_status: "human_reviewed" }), "người");
  assert.equal(reviewKindLabel({ review_status: "not_expert_reviewed" }), "gold cũ");
  assert.equal(reviewKindLabel(null), null);
  const row = buildScoreboardRow("r", { sample_id: "qd_042", status: "completed" }, { strict_evaluation: { overall_score: 1 } }, "test", "AI");
  assert.equal(row.review_kind, "AI");
  assert.match(renderScoreboard([{ ...row, run_id: "r", model: "m", mode: "ai_extract" }]), /| AI | 1.0000 |/u);
});

test("trung bình theo model chỉ tính lần chạy mới nhất của mỗi mẫu", () => {
  const base = { split: "test", model: "m", mode: "ai_extract", status: "completed" };
  const averages = averageByModel([
    { ...base, run_id: "2026-11-19_0947_m_qd_042", sample_id: "qd_042", strict: 0.2, tolerant: 0.2 },
    { ...base, run_id: "2026-11-19_1017_m_qd_042", sample_id: "qd_042", strict: 0.9, tolerant: 0.9 },
    { ...base, run_id: "2026-11-19_1018_m_qd_096", sample_id: "qd_096", strict: 0.7, tolerant: 0.8 },
  ]);
  assert.equal(averages[0].runs, 2);
  assert.equal(averages[0].samples, 2);
  assert.ok(Math.abs(averages[0].strict - 0.8) < 1e-9, "lần 0947 (cũ) không được tính");
});

test("rescore --renormalize: áp normalizer hiện tại lên raw.json, giữ normalized cũ ở normalized.previous.json", async () => {
  const { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { rescoreRuns } = await import("../src/build_scoreboard.mjs");
  const work = await mkdtemp(join(tmpdir(), "texmind-renorm-"));
  try {
    const sampleDir = join(work, "dataset", "samples", "qd_096");
    await mkdir(sampleDir, { recursive: true });
    for (const name of ["gold.json", "source.txt", "metadata.json"]) {
      await copyFile(join(root, "dataset", "samples", "qd_096", name), join(sampleDir, name));
    }
    // raw cũ: đoạn không số còn nằm ngang hàng sau khoản 5 (trước quy ước 20/11).
    const gold = JSON.parse(await readFile(join(sampleDir, "gold.json"), "utf8"));
    const raw = structuredClone(gold);
    const article = raw.articles.find((item) => item.number === 3);
    const clause5 = article.clauses.find((item) => item.number === "5");
    const moved = clause5.children.pop();
    if (clause5.children.length === 0) delete clause5.children;
    article.clauses.push(moved);
    const runDir = join(work, "runs", "2026-11-19_1018_m_qd_096");
    await mkdir(runDir, { recursive: true });
    await writeFile(join(runDir, "pipeline.json"), JSON.stringify({ sample_id: "qd_096", run_id: "r", model: "m", mode: "ai_extract" }));
    await writeFile(join(runDir, "raw.json"), JSON.stringify(raw));
    await writeFile(join(runDir, "normalized.json"), JSON.stringify(raw));

    await rescoreRuns(work);
    const before = JSON.parse(await readFile(join(runDir, "score.json"), "utf8"));
    assert.ok(before.strict_evaluation.overall_score < 1, "chưa chuẩn hóa lại thì lệch cấu trúc");
    await rescoreRuns(work, { renormalize: true });
    const after = JSON.parse(await readFile(join(runDir, "score.json"), "utf8"));
    assert.equal(after.strict_evaluation.overall_score, 1);
    assert.ok(existsSync(join(runDir, "normalized.previous.json")));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
