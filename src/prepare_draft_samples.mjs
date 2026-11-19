// Tạo dataset/samples/<mã>/ cho các văn bản MỚI chọn từ dataset/hf_quyet_dinh.
// Mỗi mẫu: source.txt (bản sao nguyên byte của clean_text), metadata.json, REVIEW.md.
// KHÔNG tạo gold.json. Bản nháp AI (draft.json) được tạo riêng bằng:
//   npm run pipeline:e2e -- --sample <mã> --save-draft true
// File đã tồn tại với nội dung khác thì dừng, không ghi đè. REVIEW.md không bao giờ bị ghi đè.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { samplePaths } from "./samples.mjs";

const HF_DIR = join("dataset", "hf_quyet_dinh");

export function buildDraftMetadata(hf, selection, batchId) {
  return {
    sample_id: hf.sample_id,
    source_id: hf.source_id,
    document_type: "quyet_dinh",
    template_id: null,
    language: "vi",
    source_dataset: hf.source_dataset,
    source_page: hf.source_page,
    license: hf.license,
    input_file: "source.txt",
    structured_file: null,
    draft_file: "draft.json",
    schema_file: "../../../schemas/texmind-document.schema.json",
    expected_output_file: null,
    preserve_original_content: true,
    selection_batch: batchId,
    selection_reason: selection.reason,
    selection_features: selection.features ?? [],
    proposed_split: selection.proposed_split ?? null,
    source_metadata: {
      title: hf.title,
      document_number: hf.document_number,
      issuing_date: hf.issuing_date,
      effective_date: hf.effective_date,
      issuer: hf.issuer,
      signer_title: hf.signer_title,
      signer: hf.signer,
      legal_field: hf.legal_field,
      effect_status: hf.effect_status,
    },
    status: "draft_pending_review",
    review_status: "unreviewed",
    reviewed_on: null,
    hf_files: {
      clean_text: `${HF_DIR.replaceAll("\\", "/")}/${hf.clean_text_file}`,
      raw_html: `${HF_DIR.replaceAll("\\", "/")}/${hf.raw_html_file}`,
    },
  };
}

export function buildDraftReviewNote(metadata) {
  const features = metadata.selection_features.map((item) => `- ${item}`).join("\n");
  return [
    `# Duyệt mẫu ${metadata.sample_id}`,
    "",
    "> TRẠNG THÁI: CHỜ DUYỆT. `draft.json` là bản nháp do AI tạo, CHƯA phải gold.",
    "> Sửa trực tiếp `draft.json` theo `source.txt`, tick checklist, rồi chạy:",
    `> \`npm run samples:promote -- --sample ${metadata.sample_id} --reviewer "<tên>" --confirm true\``,
    "",
    `- Nguồn: ${metadata.source_page} (source_id ${metadata.source_id})`,
    `- Tiêu đề (metadata HF): ${metadata.source_metadata.title}`,
    `- Đợt chọn: ${metadata.selection_batch}; đề xuất split: ${metadata.proposed_split ?? "chưa có"}`,
    "",
    "## Lý do chọn",
    "",
    metadata.selection_reason,
    "",
    "## Đặc điểm cấu trúc",
    "",
    features || "- (chưa ghi)",
    "",
    "## Checklist khi duyệt",
    "",
    "- [ ] Trường đơn (cơ quan, số hiệu, nơi + ngày ban hành, trích yếu) khớp nguồn",
    "- [ ] `issue_date_text` giữ nguyên cả địa danh (vd. \"Hà Nội, ngày ...\")",
    "- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ (kể cả lỗi chính tả của nguồn)",
    "- [ ] Đủ điều, khoản, điểm; đúng cấp lồng nhau; không tự đánh số đoạn không có ký hiệu",
    "- [ ] Nơi nhận và chữ ký khớp nguồn (không có nơi nhận thì `recipients` = [])",
    "- [ ] Phụ lục/văn bản kèm theo chỉ tham chiếu, không bịa nội dung",
    "- [ ] Bất thường của nguồn ghi vào `provenance.source_anomalies`",
    "",
    "## Ghi chú của người duyệt",
    "",
    "",
    "## Lịch sử",
    "",
    "",
  ].join("\n");
}

async function writeIfSafe(path, content, report) {
  if (existsSync(path)) {
    const current = await readFile(path);
    if (current.equals(Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"))) {
      report.unchanged.push(path);
      return;
    }
    report.conflicts.push(path);
    return;
  }
  await writeFile(path, content);
  report.written.push(path);
}

export async function prepareDraftSamples(batchPath, root = process.cwd()) {
  const batch = JSON.parse(await readFile(resolve(root, batchPath), "utf8"));
  const hfDir = resolve(root, HF_DIR);
  const manifest = new Map(
    (await readFile(join(hfDir, "manifest.jsonl"), "utf8"))
      .trim()
      .split(/\r?\n/u)
      .map((line) => JSON.parse(line))
      .map((item) => [item.sample_id, item]),
  );
  const report = { samples: [], written: [], unchanged: [], conflicts: [], skipped_review: [] };
  for (const selection of batch.samples) {
    const hf = manifest.get(selection.sample_id);
    if (!hf) throw new Error(`Không thấy ${selection.sample_id} trong ${HF_DIR}/manifest.jsonl`);
    const paths = samplePaths(selection.sample_id, root);
    if (existsSync(paths.gold)) {
      throw new Error(`${selection.sample_id} đã có gold.json; không dùng làm mẫu nháp mới.`);
    }
    await mkdir(paths.dir, { recursive: true });
    // source.txt: bản sao nguyên byte.
    await writeIfSafe(paths.source, await readFile(join(hfDir, hf.clean_text_file)), report);
    const metadata = buildDraftMetadata(hf, selection, batch.batch_id);
    await writeIfSafe(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`, report);
    if (existsSync(paths.review)) report.skipped_review.push(paths.review);
    else await writeIfSafe(paths.review, buildDraftReviewNote(metadata), report);
    report.samples.push(selection.sample_id);
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const batchIndex = process.argv.indexOf("--batch");
  if (batchIndex < 2) {
    console.error("Cách dùng: node src/prepare_draft_samples.mjs --batch dataset/selection/<đợt>.json");
    process.exit(2);
  }
  const report = await prepareDraftSamples(process.argv[batchIndex + 1]);
  console.log(`Mẫu: ${report.samples.join(", ")}`);
  console.log(`Đã ghi mới: ${report.written.length} file; không đổi: ${report.unchanged.length} file`);
  if (report.conflicts.length > 0) {
    console.error("XUNG ĐỘT (không ghi đè, cần xem tay):");
    for (const path of report.conflicts) console.error(`  ${path}`);
    process.exit(1);
  }
}
