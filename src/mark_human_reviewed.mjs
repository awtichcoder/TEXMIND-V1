// Đổi một gold do AI duyệt (review_status "ai_reviewed") thành NGƯỜI duyệt ("human_reviewed")
// sau khi người dùng tự kiểm xong. Chỉ chạy khi người dùng ra lệnh, và chỉ thực hiện khi có --confirm true.
//
//   npm run samples:mark-human -- --sample qd_042 --reviewer "Tên người duyệt"                 # xem trước
//   npm run samples:mark-human -- --sample qd_042 --reviewer "Tên người duyệt" --confirm true  # thực hiện
//
// Điều kiện: có gold.json hợp lệ schema; metadata đang là "ai_reviewed"; REVIEW.md có mục
// "## Checklist người duyệt" và mọi ô trong mục đó đã tick ([x]).
// Khi thực hiện: metadata review_status "human_reviewed", status "gold_human_reviewed", reviewed_by/on mới,
// lưu lại lần duyệt AI trước ở previous_reviews; thêm một dòng lịch sử vào cuối REVIEW.md. Không sửa gold.json.
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseReviewDate, uncheckedItems } from "./promote_draft.mjs";
import { samplePaths } from "./samples.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

export const HUMAN_CHECKLIST_HEADING = "## Checklist người duyệt";

// Lấy nội dung mục "## Checklist người duyệt ..." (tới tiêu đề ## kế tiếp).
export function humanChecklistSection(reviewText) {
  const text = String(reviewText ?? "");
  const start = text.indexOf(HUMAN_CHECKLIST_HEADING);
  if (start < 0) return null;
  const next = text.indexOf("\n## ", start + HUMAN_CHECKLIST_HEADING.length);
  return text.slice(start, next < 0 ? undefined : next);
}

export async function checkHumanReview({ sampleId, reviewer, root = process.cwd() }) {
  const paths = samplePaths(sampleId, root);
  const problems = [];
  if (!reviewer || !String(reviewer).trim()) problems.push("Thiếu --reviewer (tên người duyệt).");
  if (/claude|\bai\b/iu.test(String(reviewer ?? ""))) problems.push("--reviewer phải là tên NGƯỜI duyệt, không phải AI.");
  const missing = [
    [paths.gold, "gold.json"],
    [paths.metadata, "metadata.json"],
    [paths.review, "REVIEW.md"],
  ].filter(([path]) => !existsSync(path));
  for (const [path, name] of missing) problems.push(`Không có ${name}: ${path}`);
  if (missing.length) return { paths, problems };

  const metadata = JSON.parse(await readFile(paths.metadata, "utf8"));
  if (metadata.review_status === "human_reviewed") problems.push("Mẫu này đã là human_reviewed.");
  else if (metadata.review_status !== "ai_reviewed") problems.push(`review_status hiện là ${metadata.review_status}, không phải ai_reviewed.`);

  const schema = JSON.parse(await readFile(resolve(root, "schemas", "texmind-document.schema.json"), "utf8"));
  const errors = validateAgainstSchema(schema, JSON.parse(await readFile(paths.gold, "utf8")));
  if (errors.length) problems.push(`gold.json sai schema (${errors.length} lỗi) – sửa trước khi đánh dấu.`);

  const section = humanChecklistSection(await readFile(paths.review, "utf8"));
  if (!section) problems.push(`REVIEW.md chưa có mục "${HUMAN_CHECKLIST_HEADING}".`);
  else {
    const unchecked = uncheckedItems(section);
    if (unchecked.length) problems.push(`Checklist người duyệt còn ${unchecked.length} mục chưa tick: ${unchecked.join(" | ")}`);
  }
  return { paths, problems, metadata };
}

export async function markHumanReviewed({ sampleId, reviewer, reviewDate, root = process.cwd(), confirm = false }) {
  const { paths, problems, metadata } = await checkHumanReview({ sampleId, reviewer, root });
  if (problems.length) return { marked: false, problems, paths };
  if (!confirm) return { marked: false, problems: [], paths, dryRun: true };
  const previous = {
    kind: "ai",
    review_status: metadata.review_status,
    reviewed_by: metadata.reviewed_by ?? null,
    reviewed_on: metadata.reviewed_on ?? null,
  };
  const updated = {
    ...metadata,
    status: "gold_human_reviewed",
    review_status: "human_reviewed",
    reviewed_by: reviewer,
    reviewed_on: reviewDate,
    previous_reviews: [...(metadata.previous_reviews ?? []), previous],
  };
  await writeFile(paths.metadata, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  const review = await readFile(paths.review, "utf8");
  const vnDate = reviewDate.split("-").reverse().join("/");
  const line = `- ${vnDate}: NGƯỜI DUYỆT ${reviewer} đã tự kiểm theo checklist; review_status ai_reviewed → human_reviewed (gold.json không đổi bởi script).\n`;
  await writeFile(paths.review, `${review}${review.endsWith("\n") ? "" : "\n"}${line}`, "utf8");
  return { marked: true, problems: [], paths };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const sampleId = args.get("--sample");
  if (!sampleId) {
    console.error('Cách dùng: npm run samples:mark-human -- --sample <mã> --reviewer "<tên>" [--date YYYY-MM-DD] [--confirm true]');
    process.exit(2);
  }
  try {
    const reviewDate = parseReviewDate(args.get("--date"));
    const result = await markHumanReviewed({
      sampleId,
      reviewer: args.get("--reviewer"),
      reviewDate,
      confirm: args.get("--confirm") === "true",
    });
    if (result.problems.length) {
      console.error(`CHƯA đổi ${sampleId}:`);
      for (const problem of result.problems) console.error(`  - ${problem}`);
      process.exit(1);
    }
    if (result.dryRun) console.log(`XEM TRƯỚC: ${sampleId} đủ điều kiện đổi sang human_reviewed. Thêm --confirm true để thực hiện.`);
    else console.log(`ĐÃ đổi ${sampleId} sang human_reviewed (người duyệt: ${args.get("--reviewer")}).`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
