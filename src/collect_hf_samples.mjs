import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DuckDBInstance } from "@duckdb/node-api";

const DATASET = "th1nhng0/vietnamese-legal-documents";
const LICENSE = "CC BY 4.0";
const SOURCE_PAGE = `https://huggingface.co/datasets/${DATASET}`;
const METADATA_PARQUET =
  "https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents/resolve/refs%2Fconvert%2Fparquet/metadata/data/0000.parquet";
const CONTENT_PARQUET =
  "https://huggingface.co/datasets/th1nhng0/vietnamese-legal-documents/resolve/refs%2Fconvert%2Fparquet/content/data/0000.parquet";

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const requestedCount = Number(readArg("--count", "100"));
const documentType = readArg("--type", "Quyết định");
const minChars = Number(readArg("--min-chars", "500"));
const maxChars = Number(readArg("--max-chars", "30000"));

if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 1000) {
  throw new Error("--count phải là số nguyên từ 1 đến 1000.");
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "dataset", "hf_quyet_dinh");
const rawDir = resolve(outputRoot, "raw_html");
const textDir = resolve(outputRoot, "clean_text");
const metadataDir = resolve(outputRoot, "metadata");

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function htmlToText(html) {
  return decodeHtmlEntities(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|head|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|h[1-6]|li|tr|table|section|article)\s*>/gi, "\n")
      .replace(/<\/\s*(td|th)\s*>/gi, "\t")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function loadCandidates() {
  const extensionDir = resolve(projectRoot, ".duckdb", "extensions");
  await mkdir(extensionDir, { recursive: true });
  const instance = await DuckDBInstance.create(":memory:", {
    threads: "4",
    extension_directory: extensionDir,
  });
  const connection = await instance.connect();
  const candidateLimit = Math.max(requestedCount * 5, 200);

  try {
    const metadataSql = `
      SELECT *
      FROM read_parquet('${METADATA_PARQUET}')
      WHERE loai_van_ban = '${escapeSql(documentType)}'
      LIMIT ${candidateLimit}
    `;
    const metadataReader = await connection.runAndReadAll(metadataSql);
    const metadataRows = metadataReader.getRowObjectsJson();
    const ids = metadataRows.map((row) => String(row.id));

    if (ids.length === 0) return [];

    const idList = ids.map((id) => `'${escapeSql(id)}'`).join(", ");
    const contentSql = `
      SELECT id, content_html
      FROM read_parquet('${CONTENT_PARQUET}')
      WHERE id IN (${idList})
    `;
    const contentReader = await connection.runAndReadAll(contentSql);
    const contentRows = contentReader.getRowObjectsJson();
    const contentById = new Map(
      contentRows.map((row) => [String(row.id), row.content_html]),
    );

    return metadataRows.map((metadata) => ({
      metadata,
      html: contentById.get(String(metadata.id)) ?? null,
    }));
  } finally {
    connection.closeSync();
  }
}

async function main() {
  await Promise.all([
    mkdir(rawDir, { recursive: true }),
    mkdir(textDir, { recursive: true }),
    mkdir(metadataDir, { recursive: true }),
  ]);

  const accepted = [];
  let skippedMissingContent = 0;
  let skippedByLength = 0;
  const candidates = await loadCandidates();

  for (const candidate of candidates) {
    if (accepted.length >= requestedCount) break;
    if (!candidate.html) {
      skippedMissingContent += 1;
      continue;
    }

    const text = htmlToText(candidate.html);
    if (text.length < minChars || text.length > maxChars) {
      skippedByLength += 1;
      continue;
    }

    accepted.push({ metadata: candidate.metadata, html: candidate.html, text });
  }

  if (accepted.length < requestedCount) {
    throw new Error(`Chỉ thu được ${accepted.length}/${requestedCount} mẫu hợp lệ.`);
  }

  const manifestLines = [];
  for (let index = 0; index < accepted.length; index += 1) {
    const sequence = String(index + 1).padStart(3, "0");
    const stem = `qd_${sequence}`;
    const item = accepted[index];
    const sourceId = String(item.metadata.id);
    const record = {
      sample_id: stem,
      source_id: sourceId,
      source_dataset: DATASET,
      source_page: SOURCE_PAGE,
      license: LICENSE,
      document_type: item.metadata.loai_van_ban,
      title: item.metadata.title,
      document_number: item.metadata.so_ky_hieu,
      issuing_date: item.metadata.ngay_ban_hanh,
      effective_date: item.metadata.ngay_co_hieu_luc,
      expiry_date: item.metadata.ngay_het_hieu_luc,
      issuer: item.metadata.co_quan_ban_hanh,
      signer_title: item.metadata.chuc_danh,
      signer: item.metadata.nguoi_ky,
      scope: item.metadata.pham_vi,
      legal_field: item.metadata.linh_vuc,
      effect_status: item.metadata.tinh_trang_hieu_luc,
      raw_html_file: `raw_html/${stem}.html`,
      clean_text_file: `clean_text/${stem}.txt`,
      expected_output_file: null,
      text_char_count: item.text.length,
      review_status: "unreviewed",
      collected_at: new Date().toISOString(),
    };

    await Promise.all([
      writeFile(resolve(rawDir, `${stem}.html`), item.html, "utf8"),
      writeFile(resolve(textDir, `${stem}.txt`), `${item.text}\n`, "utf8"),
      writeFile(resolve(metadataDir, `${stem}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8"),
    ]);
    manifestLines.push(JSON.stringify(record));
  }

  const summary = {
    source_dataset: DATASET,
    source_page: SOURCE_PAGE,
    license: LICENSE,
    requested_document_type: documentType,
    requested_count: requestedCount,
    collected_count: accepted.length,
    min_chars: minChars,
    max_chars: maxChars,
    metadata_rows_examined: candidates.length,
    skipped_missing_content: skippedMissingContent,
    skipped_by_length: skippedByLength,
    review_status: "unreviewed",
    collected_at: new Date().toISOString(),
  };

  await Promise.all([
    writeFile(resolve(outputRoot, "manifest.jsonl"), `${manifestLines.join("\n")}\n`, "utf8"),
    writeFile(resolve(outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeFile(
      resolve(outputRoot, "README.md"),
      `# Hugging Face sample: ${documentType}\n\n` +
        `Nguồn: ${SOURCE_PAGE}\n\n` +
        `Giấy phép: ${LICENSE}\n\n` +
        `Số mẫu: ${accepted.length}\n\n` +
        "Các mẫu hiện ở trạng thái `unreviewed`. Không dùng làm dữ liệu gold hoặc tư vấn pháp lý trước khi kiểm tra thủ công.\n",
      "utf8",
    ),
  ]);

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
