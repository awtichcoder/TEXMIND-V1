// Sao chép (KHÔNG di chuyển) các mẫu gold cũ trong dataset/van_ban_hanh_chinh/
// sang cấu trúc mới dataset/samples/<mã>/. File cũ được giữ nguyên.
// Nếu file đích đã tồn tại với nội dung khác, script dừng thay vì ghi đè.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { samplePaths } from "./samples.mjs";

const LEGACY_DIR = join("dataset", "van_ban_hanh_chinh");

export function buildReviewNote(metadata) {
  const anomalies = (metadata.source_anomalies ?? [])
    .map((item) => `- \`${item.source_text}\`: ${item.note}`)
    .join("\n");
  return [
    `# Duyệt mẫu ${metadata.sample_id}`,
    "",
    `- Nguồn: ${metadata.source_page ?? "không rõ"} (source_id ${metadata.source_id ?? "?"})`,
    `- Trạng thái duyệt: ${metadata.review_status ?? "chưa ghi"}`,
    `- Kiểm tra gần nhất: ${metadata.quality_assurance?.verified_on ?? "chưa ghi"}`,
    "",
    "## Bất thường trong văn bản nguồn",
    "",
    anomalies || "- Không ghi nhận.",
    "",
    "## Checklist khi duyệt gold",
    "",
    "- [ ] Trường đơn (số hiệu, ngày, cơ quan, trích yếu) khớp nguồn",
    "- [ ] Đủ căn cứ pháp lý, giữ nguyên câu chữ",
    "- [ ] Đủ điều, khoản, khoản con; không tự đánh số đoạn không có ký hiệu",
    "- [ ] Nơi nhận và chữ ký khớp nguồn",
    "- [ ] Phụ lục chỉ tham chiếu, không bịa nội dung",
    "",
    "## Ghi chú",
    "",
    "",
  ].join("\n");
}

async function writeIfSafe(path, content, report) {
  if (existsSync(path)) {
    const current = await readFile(path, "utf8");
    if (current === content) {
      report.unchanged.push(path);
      return;
    }
    report.conflicts.push(path);
    return;
  }
  await writeFile(path, content, "utf8");
  report.written.push(path);
}

export async function migrateLegacySamples(root = process.cwd()) {
  const legacyDir = resolve(root, LEGACY_DIR);
  const metadataFiles = (await readdir(legacyDir))
    .filter((name) => /^metadata_\d+\.json$/u.test(name))
    .sort();
  const report = { samples: [], written: [], unchanged: [], conflicts: [], skipped_review: [] };

  for (const metadataFile of metadataFiles) {
    const metadataText = await readFile(join(legacyDir, metadataFile), "utf8");
    const metadata = JSON.parse(metadataText);
    const sampleId = metadata.sample_id;
    const sourceText = await readFile(join(legacyDir, metadata.input_file), "utf8");
    const goldText = await readFile(join(legacyDir, metadata.structured_file), "utf8");
    const gold = JSON.parse(goldText);
    if (gold.sample_id !== sampleId) {
      throw new Error(
        `${metadataFile}: sample_id trong metadata (${sampleId}) khác gold (${gold.sample_id}).`,
      );
    }

    const paths = samplePaths(sampleId, root);
    await mkdir(paths.dir, { recursive: true });
    const newMetadata = {
      ...metadata,
      input_file: "source.txt",
      structured_file: "gold.json",
      schema_file: "../../../schemas/texmind-document.schema.json",
      legacy_files: {
        input: `${LEGACY_DIR.replaceAll("\\", "/")}/${metadata.input_file}`,
        structured: `${LEGACY_DIR.replaceAll("\\", "/")}/${metadata.structured_file}`,
        metadata: `${LEGACY_DIR.replaceAll("\\", "/")}/${metadataFile}`,
      },
    };

    // source.txt và gold.json là bản sao nguyên byte của file cũ.
    await writeIfSafe(paths.source, sourceText, report);
    await writeIfSafe(paths.gold, goldText, report);
    await writeIfSafe(paths.metadata, `${JSON.stringify(newMetadata, null, 2)}\n`, report);
    // REVIEW.md là ghi chú do người viết tiếp: chỉ tạo nếu chưa có, không bao giờ ghi đè.
    if (existsSync(paths.review)) report.skipped_review.push(paths.review);
    else await writeIfSafe(paths.review, buildReviewNote(metadata), report);
    report.samples.push(sampleId);
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await migrateLegacySamples();
  console.log(`Mẫu: ${report.samples.join(", ")}`);
  console.log(`Đã ghi mới: ${report.written.length} file`);
  console.log(`Không đổi: ${report.unchanged.length} file`);
  if (report.conflicts.length > 0) {
    console.error("XUNG ĐỘT (không ghi đè, cần xem tay):");
    for (const path of report.conflicts) console.error(`  ${path}`);
    process.exit(1);
  }
}
