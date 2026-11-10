import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const datasetRoot = resolve(projectRoot, "dataset", "hf_quyet_dinh");

function occurrences(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function yearFrom(value) {
  const match = String(value ?? "").match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function scoreSample(record, text, html) {
  let score = 0;
  const reasons = [];
  const cautions = [];
  const length = text.length;
  const articleCount = occurrences(text, /(?:^|\n)\s*Điều\s+\d+[.:]?/gim);
  const tableCount = occurrences(html, /<table\b/gi);
  const issueYear = yearFrom(record.issuing_date);
  const titleLower = String(record.title ?? "").toLocaleLowerCase("vi");
  const fullLower = `${record.title}\n${text}`.toLocaleLowerCase("vi");

  if (length >= 2000 && length <= 7000) {
    score += 30;
    reasons.push("độ dài phù hợp 2.000–7.000 ký tự");
  } else if (length >= 1000 && length <= 10000) {
    score += 20;
    reasons.push("độ dài có thể xử lý trong MVP");
  } else {
    score += 5;
    cautions.push("độ dài không tối ưu cho mẫu đầu tiên");
  }

  if (/CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/i.test(text)) {
    score += 8;
    reasons.push("có quốc hiệu–tiêu ngữ");
  }
  if (/\bSố\s*:/i.test(text)) {
    score += 6;
    reasons.push("có số/ký hiệu");
  }
  if (/ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i.test(text)) {
    score += 5;
    reasons.push("có ngày ban hành trong nội dung");
  }
  if (/\bQUYẾT ĐỊNH\s*:/i.test(text) || /(?:^|\n)\s*QUYẾT ĐỊNH\s*(?:\n|$)/im.test(text)) {
    score += 8;
    reasons.push("có khối quyết định rõ ràng");
  }

  if (articleCount >= 3 && articleCount <= 6) {
    score += 20;
    reasons.push(`cấu trúc ${articleCount} điều vừa phải`);
  } else if (articleCount >= 2 && articleCount <= 8) {
    score += 12;
    reasons.push(`có cấu trúc ${articleCount} điều`);
  } else if (articleCount > 8) {
    score -= 10;
    cautions.push(`nhiều điều khoản (${articleCount})`);
  } else {
    score -= 8;
    cautions.push("không nhận diện đủ cấu trúc điều khoản");
  }

  if (/Nơi nhận\s*:/i.test(text)) {
    score += 8;
    reasons.push("có phần nơi nhận");
  }
  if (/(?:TM\.|KT\.)?\s*(?:ỦY BAN NHÂN DÂN|CHỦ TỊCH|BỘ TRƯỞNG|GIÁM ĐỐC)/i.test(text.slice(-1800))) {
    score += 8;
    reasons.push("có khối chức danh/ký tên cuối văn bản");
  }

  if (issueYear && issueYear >= 2020) {
    score += 10;
    reasons.push(`văn bản tương đối mới (${issueYear})`);
  } else if (issueYear && issueYear >= 2015) {
    score += 5;
  } else if (issueYear) {
    score -= 5;
    cautions.push(`văn bản cũ (${issueYear})`);
  }

  if (record.effect_status === "Còn hiệu lực") {
    score += 8;
    reasons.push("metadata ghi nhận còn hiệu lực");
  } else if (String(record.effect_status).includes("Hết hiệu lực")) {
    score -= 12;
    cautions.push("metadata ghi nhận hết hiệu lực");
  }

  if (tableCount <= 2) {
    score += 8;
    reasons.push(`ít bảng HTML (${tableCount})`);
  } else if (tableCount <= 4) {
    score += 3;
  } else {
    score -= 10;
    cautions.push(`nhiều bảng HTML (${tableCount})`);
  }

  const titlePenaltyRules = [
    [/sửa đổi|bổ sung/i, 12, "tiêu đề là văn bản sửa đổi/bổ sung"],
    [/đính chính/i, 10, "tiêu đề là văn bản đính chính"],
    [/bãi bỏ/i, 8, "tiêu đề có nội dung bãi bỏ"],
  ];
  for (const [pattern, penalty, label] of titlePenaltyRules) {
    if (pattern.test(titleLower)) {
      score -= penalty;
      cautions.push(label);
    }
  }

  if (/phụ lục/i.test(fullLower)) {
    score -= 10;
    cautions.push("có tham chiếu phụ lục");
  }
  if (/danh sách kèm theo/i.test(fullLower)) {
    score -= 8;
    cautions.push("có danh sách kèm theo");
  }
  if (/\bQ\s+uy định/i.test(text)) {
    score -= 15;
    cautions.push("có lỗi tách chữ trong nội dung sạch");
  }

  return {
    ...record,
    score,
    article_count: articleCount,
    html_table_count: tableCount,
    issue_year: issueYear,
    selection_status: "shortlisted",
    reasons,
    cautions,
  };
}

async function main() {
  const manifest = (await readFile(resolve(datasetRoot, "manifest.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

  const scored = [];
  for (const record of manifest) {
    const [text, html] = await Promise.all([
      readFile(resolve(datasetRoot, record.clean_text_file), "utf8"),
      readFile(resolve(datasetRoot, record.raw_html_file), "utf8"),
    ]);
    scored.push(scoreSample(record, text.trim(), html));
  }

  scored.sort((a, b) => b.score - a.score || a.text_char_count - b.text_char_count);

  const shortlist = [];
  const issuerCounts = new Map();
  for (const candidate of scored) {
    const issuer = candidate.issuer || "Không rõ";
    const issuerCount = issuerCounts.get(issuer) ?? 0;
    if (issuerCount >= 2) continue;
    shortlist.push({ ...candidate, rank: shortlist.length + 1 });
    issuerCounts.set(issuer, issuerCount + 1);
    if (shortlist.length === 10) break;
  }

  const output = {
    generated_at: new Date().toISOString(),
    source_count: manifest.length,
    shortlist_count: shortlist.length,
    method: "Chấm điểm tự động và giới hạn tối đa 2 mẫu/cơ quan ban hành; cần kiểm tra thủ công trước khi chọn dữ liệu gold.",
    recommended_first_sample: shortlist[0]?.sample_id ?? null,
    samples: shortlist,
  };

  const markdownRows = shortlist.map((item) => {
    const title = String(item.title).replaceAll("|", "\\|").replace(/\s+/g, " ");
    const cautions = item.cautions.length ? item.cautions.join(", ") : "không";
    return `| ${item.rank} | ${item.sample_id} | ${item.score} | ${item.text_char_count} | ${item.article_count} | ${item.issue_year ?? "–"} | ${title} | ${cautions} |`;
  });

  const markdown = [
    "# Danh sách 10 mẫu Quyết định",
    "",
    `Tạo lúc: ${output.generated_at}`,
    "",
    "Các mẫu này đã qua lọc tự động nhưng vẫn cần đọc thủ công trước khi trở thành dữ liệu gold.",
    "",
    `Mẫu đề xuất làm đầu tiên: **${output.recommended_first_sample}**`,
    "",
    "| Hạng | Mã | Điểm | Ký tự | Số điều | Năm | Tiêu đề | Lưu ý |",
    "| ---: | --- | ---: | ---: | ---: | ---: | --- | --- |",
    ...markdownRows,
    "",
  ].join("\n");

  const packRoot = resolve(datasetRoot, "shortlist_10");
  const packRawDir = resolve(packRoot, "raw_html");
  const packTextDir = resolve(packRoot, "clean_text");
  const packMetadataDir = resolve(packRoot, "metadata");
  await Promise.all([
    mkdir(packRawDir, { recursive: true }),
    mkdir(packTextDir, { recursive: true }),
    mkdir(packMetadataDir, { recursive: true }),
  ]);

  for (const item of shortlist) {
    const rawName = `${item.sample_id}.html`;
    const textName = `${item.sample_id}.txt`;
    const metadataName = `${item.sample_id}.json`;
    await Promise.all([
      copyFile(resolve(datasetRoot, item.raw_html_file), resolve(packRawDir, rawName)),
      copyFile(resolve(datasetRoot, item.clean_text_file), resolve(packTextDir, textName)),
      writeFile(
        resolve(packMetadataDir, metadataName),
        `${JSON.stringify(item, null, 2)}\n`,
        "utf8",
      ),
    ]);
  }

  await Promise.all([
    writeFile(resolve(datasetRoot, "shortlist_10.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8"),
    writeFile(resolve(datasetRoot, "shortlist_10.md"), markdown, "utf8"),
    writeFile(resolve(packRoot, "manifest.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8"),
    writeFile(
      resolve(packRoot, "README.md"),
      `# Shortlist 10 mẫu Quyết định\n\nMẫu đề xuất đầu tiên: **${output.recommended_first_sample}**.\n\nCác mẫu đã qua lọc tự động và đọc nhanh phần đầu/cuối, nhưng chưa phải dữ liệu gold cho đến khi DOCX đầu ra được kiểm tra.\n`,
      "utf8",
    ),
  ]);

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
