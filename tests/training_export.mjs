import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertNoLeak,
  buildTestInputs,
  buildTrainingRecords,
  sourceFingerprint,
  toChatLine,
} from "../src/export_training_data.mjs";
import { readSplits, samplePaths } from "../src/samples.mjs";
import { SILVER_DIR, silverEligibility } from "../src/silver.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const schema = JSON.parse(readFileSync(join(root, "schemas", "texmind-document.schema.json"), "utf8"));

test("dữ liệu train chỉ gồm gold split train + silver, không có mẫu dev/test", async () => {
  const splits = await readSplits(root);
  const { records } = buildTrainingRecords({ root, splits, schema });
  const forbidden = new Set([...splits.dev, ...splits.test]);
  for (const record of records) {
    assert.equal(forbidden.has(record.sampleId), false, `${record.sampleId} là dev/test`);
    if (record.origin === "gold") assert.ok(splits.train.includes(record.sampleId), `${record.sampleId} không thuộc train`);
  }
  assert.doesNotThrow(() => assertNoLeak(records, { splits, root }));
  for (const record of records) {
    const line = JSON.parse(toChatLine(record));
    assert.deepEqual(line.messages.map((m) => m.role), ["system", "user", "assistant"]);
    assert.deepEqual(JSON.parse(line.messages[2].content), record.target);
  }
});

test("chặn rò rỉ: mã dev/test hoặc văn bản trùng nội dung dev/test đều bị từ chối", async () => {
  const splits = await readSplits(root);
  const testId = splits.test[0];
  const testSource = readFileSync(samplePaths(testId, root).source, "utf8");
  assert.throws(
    () => assertNoLeak([{ sampleId: testId, origin: "gold", source: "x", target: {} }], { splits, root }),
    /RÒ RỈ/u,
  );
  // Cùng văn bản nhưng đổi mã và thêm khoảng trắng: vẫn bị bắt nhờ so dấu vân tay nội dung.
  assert.throws(
    () =>
      assertNoLeak([{ sampleId: "qd_999", origin: "silver", source: `  ${testSource.replace(/\n/gu, "\n\n")}  `, target: {} }], {
        splits,
        root,
      }),
    /trùng văn bản nguồn/u,
  );
  const devId = splits.dev[0];
  assert.throws(() => assertNoLeak([{ sampleId: devId, origin: "gold", source: "y", target: {} }], { splits, root }), /dev\/test/u);
  assert.equal(sourceFingerprint("a  b\nc"), sourceFingerprint("a b c"));
});

test("silver không trùng mẫu trong dataset/samples và ghi rõ là AI tạo, chưa duyệt", () => {
  const silverRoot = join(root, SILVER_DIR);
  if (!existsSync(silverRoot)) return;
  const samples = new Set(readdirSync(join(root, "dataset", "samples")));
  for (const id of readdirSync(silverRoot)) {
    if (!/^qd_\d+$/u.test(id)) continue;
    assert.equal(samples.has(id), false, `${id} vừa là silver vừa là mẫu trong dataset/samples`);
    const metadata = JSON.parse(readFileSync(join(silverRoot, id, "metadata.json"), "utf8"));
    assert.equal(metadata.data_quality, "silver");
    assert.equal(metadata.review_status, "unreviewed");
    assert.match(metadata.note, /AI tạo, chưa duyệt/u);
    assert.equal(existsSync(join(silverRoot, id, "gold.json")), false, `${id}: silver không được có gold.json`);
  }
});

test("đầu vào test cho notebook chỉ có văn bản nguồn, không chứa gold", async () => {
  const splits = await readSplits(root);
  const inputs = buildTestInputs({ root, splits });
  assert.deepEqual(inputs.map((item) => item.sample_id), splits.test);
  for (const item of inputs) {
    assert.deepEqual(item.messages.map((m) => m.role), ["system", "user"]);
    const gold = readFileSync(samplePaths(item.sample_id, root).gold, "utf8");
    assert.equal(JSON.stringify(item).includes(JSON.parse(gold).legal_effect.review_note), false, "lộ nội dung gold");
  }
});

test("tiêu chí chọn silver loại văn bản thiếu quốc hiệu/số hiệu/chữ ký hoặc có Chương", () => {
  const good = [
    "ỦY BAN NHÂN DÂN", "Số: 1/2024/QĐ-UBND", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "QUYẾT ĐỊNH",
    "Điều 1. Nội dung một.", "Điều 2. Nội dung hai.", "TM. ỦY BAN NHÂN DÂN", "CHỦ TỊCH", "(Đã ký)", "Nguyễn Văn A",
  ].join("\n").padEnd(1500, " x");
  assert.deepEqual(silverEligibility(good), []);
  assert.ok(silverEligibility(good.replace("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "")).includes("thiếu quốc hiệu"));
  assert.ok(silverEligibility(`${good}\nChương I`).includes("có Chương"));
});

test("chấm dự đoán model ngoài: tách JSON, chuẩn hóa, chấm như pipeline; JSON cụt → điểm 0", async () => {
  const { mkdtemp, rm, writeFile, readFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { extractJsonObject, scorePredictionsFile } = await import("../src/score_predictions.mjs");
  assert.deepEqual(extractJsonObject('Đây là kết quả:\n```json\n{"a": "x}y", "b": {"c": 1}}\n```'), { a: "x}y", b: { c: 1 } });
  assert.throws(() => extractJsonObject('{"a": 1, "b": {'), /cắt cụt/u);

  const gold = readFileSync(samplePaths("qd_042", root).gold, "utf8");
  const work = await mkdtemp(join(tmpdir(), "texmind-score-"));
  try {
    const predictions = join(work, "pred.jsonl");
    await writeFile(
      predictions,
      [
        JSON.stringify({ sample_id: "qd_042", output: `\`\`\`json\n${gold}\n\`\`\`` }),
        JSON.stringify({ sample_id: "qd_096", output: gold.slice(0, 500) }),
      ].join("\n"),
    );
    const summary = await scorePredictionsFile({
      predictionsPath: predictions,
      model: "lora-test",
      runsDir: join(work, "runs"),
      root,
      date: new Date(2026, 10, 20, 9, 0),
    });
    assert.equal(summary[0].status, "completed");
    assert.equal(summary[0].strict, 1);
    assert.equal(summary[1].status, "failed_parse");
    assert.equal(summary[1].strict, 0);
    const pipeline = JSON.parse(await readFile(join(work, "runs", "2026-11-20_0900_lora-test_qd_042", "pipeline.json"), "utf8"));
    assert.equal(pipeline.split, "test");
    assert.equal(pipeline.model, "lora-test");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
