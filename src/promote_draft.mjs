// Đưa một mẫu đã duyệt từ draft.json lên gold.json.
// --review-kind human (mặc định): người duyệt. --review-kind ai: Claude/AI duyệt, ghi rõ
// review_status "ai_reviewed" và "chưa có người duyệt" để không nhầm với gold do người duyệt.
// Chỉ chạy khi người dùng ra lệnh, và chỉ thực hiện khi có --confirm true.
//
//   npm run samples:promote -- --sample qd_042 --reviewer "Tên người duyệt"                 # xem trước, không đổi gì
//   npm run samples:promote -- --sample qd_042 --reviewer "Tên người duyệt" --confirm true  # thực hiện
//
// Điều kiện: có draft.json, CHƯA có gold.json, draft hợp lệ JSON Schema, sample_id khớp, có REVIEW.md
// và mọi ô checklist trong REVIEW.md đã được tick ([x]). Khi thực hiện:
//   - đổi tên draft.json → gold.json (nội dung giữ nguyên, kể cả phần người duyệt đã sửa);
//   - thêm dòng "dd/mm/yyyy: ĐÃ DUYỆT ..." vào cuối REVIEW.md;
//   - cập nhật metadata.json: review_status, reviewed_on, reviewed_by, structured_file, status.
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { samplePaths } from "./samples.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

const pad = (value) => String(value).padStart(2, "0");
const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toVnDate = (iso) => iso.split("-").reverse().join("/");

export function parseReviewDate(value, now = new Date()) {
  if (!value) return toIsoDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Ngày duyệt không hợp lệ: ${value} (dùng dạng YYYY-MM-DD).`);
  }
  return value;
}

// Các ô checklist chưa tick trong REVIEW.md ("- [ ] ...").
export function uncheckedItems(reviewText) {
  return String(reviewText ?? "")
    .split(/\r?\n/u)
    .filter((line) => /^\s*-\s*\[\s\]\s+/u.test(line))
    .map((line) => line.replace(/^\s*-\s*\[\s\]\s+/u, "").trim());
}

// Kiểm tra mọi điều kiện; trả về danh sách lỗi (rỗng = được phép promote).
export async function checkPromotion({ sampleId, root = process.cwd(), schemaPath = null, reviewer = null }) {
  const paths = samplePaths(sampleId, root);
  const problems = [];
  if (!reviewer || !String(reviewer).trim()) problems.push("Thiếu --reviewer (tên người duyệt).");
  if (existsSync(paths.gold)) problems.push(`Đã có gold.json: ${paths.gold}`);
  if (!existsSync(paths.draft)) problems.push(`Không có draft.json: ${paths.draft}`);
  if (!existsSync(paths.review)) problems.push(`Không có REVIEW.md: ${paths.review}`);
  if (!existsSync(paths.metadata)) problems.push(`Không có metadata.json: ${paths.metadata}`);
  if (existsSync(paths.draft)) {
    let draft = null;
    try {
      draft = JSON.parse(await readFile(paths.draft, "utf8"));
    } catch (error) {
      problems.push(`draft.json không phải JSON hợp lệ: ${error.message}`);
    }
    if (draft) {
      if (draft.sample_id !== sampleId) {
        problems.push(`sample_id trong draft.json (${draft.sample_id}) khác ${sampleId}.`);
      }
      const schema = JSON.parse(
        await readFile(schemaPath ?? resolve(root, "schemas", "texmind-document.schema.json"), "utf8"),
      );
      const errors = validateAgainstSchema(schema, draft);
      if (errors.length > 0) {
        problems.push(
          `draft.json sai schema (${errors.length} lỗi), vd: ${errors
            .slice(0, 3)
            .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
            .join("; ")}`,
        );
      }
    }
  }
  if (existsSync(paths.review)) {
    const unchecked = uncheckedItems(await readFile(paths.review, "utf8"));
    if (unchecked.length > 0) {
      problems.push(`REVIEW.md còn ${unchecked.length} mục checklist chưa tick: ${unchecked.join(" | ")}`);
    }
  }
  return { paths, problems };
}

// Loại duyệt: "human" (người duyệt, mặc định) hoặc "ai" (Claude/AI duyệt, CHƯA có người duyệt).
export const REVIEW_KINDS = {
  human: { status: "gold_human_reviewed", review_status: "human_reviewed", label: (reviewer) => reviewer },
  ai: {
    status: "gold_ai_reviewed",
    review_status: "ai_reviewed",
    label: (reviewer) => `${reviewer} – chưa có người duyệt`,
  },
};

export function parseReviewKind(value) {
  const kind = value ?? "human";
  if (!Object.hasOwn(REVIEW_KINDS, kind)) {
    throw new Error(`--review-kind không hợp lệ: ${kind} (chỉ nhận human hoặc ai).`);
  }
  return kind;
}

export async function promoteDraft({
  sampleId,
  reviewer,
  reviewDate,
  reviewKind = "human",
  root = process.cwd(),
  confirm = false,
}) {
  const kind = REVIEW_KINDS[parseReviewKind(reviewKind)];
  const { paths, problems } = await checkPromotion({ sampleId, root, reviewer });
  if (problems.length > 0) return { promoted: false, problems, paths };
  if (!confirm) return { promoted: false, problems: [], paths, dryRun: true };

  await rename(paths.draft, paths.gold);
  const review = await readFile(paths.review, "utf8");
  const line = `- ${toVnDate(reviewDate)}: ĐÃ DUYỆT bởi ${kind.label(reviewer)}; draft.json → gold.json.\n`;
  await writeFile(paths.review, `${review}${review.endsWith("\n") ? "" : "\n"}${line}`, "utf8");
  const metadata = JSON.parse(await readFile(paths.metadata, "utf8"));
  const updated = {
    ...metadata,
    structured_file: "gold.json",
    draft_file: null,
    status: kind.status,
    review_status: kind.review_status,
    reviewed_on: reviewDate,
    reviewed_by: reviewer,
  };
  await writeFile(paths.metadata, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return { promoted: true, problems: [], paths };
}

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs();
  const sampleId = args.get("--sample");
  if (!sampleId) {
    console.error(
      'Cách dùng: npm run samples:promote -- --sample <mã> --reviewer "<tên>" [--review-kind human|ai] [--date YYYY-MM-DD] [--confirm true]',
    );
    process.exit(2);
  }
  try {
    const reviewDate = parseReviewDate(args.get("--date"));
    const reviewKind = parseReviewKind(args.get("--review-kind"));
    const result = await promoteDraft({
      sampleId,
      reviewer: args.get("--reviewer"),
      reviewDate,
      reviewKind,
      confirm: args.get("--confirm") === "true",
    });
    if (result.problems.length > 0) {
      console.error(`CHƯA promote ${sampleId}:`);
      for (const problem of result.problems) console.error(`  - ${problem}`);
      process.exit(1);
    }
    if (result.dryRun) {
      console.log(`XEM TRƯỚC (chưa đổi gì): ${sampleId} đủ điều kiện.`);
      console.log(`  ${result.paths.draft} → ${result.paths.gold}`);
      console.log(`  Ghi ngày duyệt ${toVnDate(reviewDate)} vào REVIEW.md và metadata.json.`);
      console.log("  Thêm --confirm true để thực hiện.");
    } else {
      console.log(
        `ĐÃ promote ${sampleId}: ${result.paths.gold} (ngày duyệt ${toVnDate(reviewDate)}, loại duyệt: ${reviewKind === "ai" ? "AI – chưa có người duyệt" : "người"}).`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
