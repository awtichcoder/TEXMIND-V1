import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile } from "node:fs/promises";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

export function assertTemplateCompatibility(structured, template) {
  if (structured.document_type !== template.document_type) {
    throw new Error(
      `Loại tài liệu ${structured.document_type} không tương thích template ${template.document_type}.`,
    );
  }
  if (structured.template?.id && structured.template.id !== template.template_id) {
    throw new Error(
      `JSON yêu cầu template ${structured.template.id}, nhưng renderer nhận ${template.template_id}.`,
    );
  }
  for (const field of template.required_fields ?? []) {
    const present = {
      issuer: structured.header?.issuer,
      document_number: structured.header?.document_number,
      issuing_place_and_date: structured.header?.issue_date_text,
      title: structured.title?.document_name && structured.title?.subject,
      legal_bases: structured.legal_bases?.length,
      articles: structured.articles?.length,
      recipients: Array.isArray(structured.recipients),
      signer_title: structured.signature?.position,
      signer: structured.signature?.signer_name,
    }[field];
    if (!present) throw new Error(`Thiếu trường bắt buộc của template: ${field}.`);
  }
}

export function rendererCommand({ inputPath, templatePath, referencePath, outputPath, python }) {
  return {
    command: python,
    args: [
      resolve(scriptDir, "render_structured_docx.py"),
      "--input",
      inputPath,
      "--template",
      templatePath,
      "--reference",
      referencePath,
      "--output",
      outputPath,
    ],
  };
}

async function main() {
  const args = parseArgs();
  const inputPath = resolve(
    args.get("--input") ?? "dataset/van_ban_hanh_chinh/structured_01.json",
  );
  const schemaPath = resolve(args.get("--schema") ?? "schemas/texmind-document.schema.json");
  const templatePath = resolve(args.get("--template") ?? "templates/TM-QD-001.json");
  const referencePath = resolve(
    args.get("--reference") ?? "dataset/van_ban_hanh_chinh/output_01.docx",
  );
  const outputPath = resolve(args.get("--output") ?? "outputs/qd_066.rendered.docx");
  const python = process.env.TEXMIND_PYTHON ?? (process.platform === "win32" ? "python" : "python3");

  const [structured, schema, template] = await Promise.all([
    readFile(inputPath, "utf8").then(JSON.parse),
    readFile(schemaPath, "utf8").then(JSON.parse),
    readFile(templatePath, "utf8").then(JSON.parse),
  ]);
  const schemaErrors = validateAgainstSchema(schema, structured);
  if (schemaErrors.length > 0) {
    throw new Error(`JSON sai schema (${schemaErrors.length} lỗi), không render DOCX.`);
  }
  assertTemplateCompatibility(structured, template);
  if (!existsSync(referencePath)) throw new Error(`Không tìm thấy DOCX tham chiếu: ${referencePath}`);

  await mkdir(dirname(outputPath), { recursive: true });
  const command = rendererCommand({
    inputPath,
    templatePath,
    referencePath,
    outputPath,
    python,
  });
  const result = spawnSync(command.command, command.args, {
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (result.status !== 0) {
    throw new Error(`Renderer Python thất bại:\n${result.stderr || result.stdout}`);
  }
  if (!existsSync(outputPath)) throw new Error("Renderer kết thúc nhưng không tạo DOCX.");
  console.log(result.stdout.trim());
  console.log(`PASS: ${structured.sample_id} -> ${outputPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
