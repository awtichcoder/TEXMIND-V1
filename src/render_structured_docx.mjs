import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile } from "node:fs/promises";
import { tableShapeErrors } from "./data_tables.mjs";
import { validateAgainstSchema } from "./validate_json_schema.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const TEMPLATE_PATHS = new Map([
  ["TM-QD-001", "templates/TM-QD-001.json"],
  ["TM-QD-002", "templates/TM-QD-002.json"],
]);

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }
  return args;
};

export function hasDataTableContent(structured) {
  return (
    (structured.data_tables?.length ?? 0) > 0 ||
    (structured.articles ?? []).some((article) => (article.related_table_ids?.length ?? 0) > 0)
  );
}

export function selectTemplate(structured) {
  const declaredTemplateId = structured.template?.id;
  if (declaredTemplateId) {
    const templatePath = TEMPLATE_PATHS.get(declaredTemplateId);
    if (!templatePath) {
      throw new Error(`Không tìm thấy template đã khai báo: ${declaredTemplateId}.`);
    }
    return {
      templateId: declaredTemplateId,
      templatePath,
      reason: "template được khai báo trong JSON",
    };
  }

  if (structured.document_type !== "quyet_dinh") {
    throw new Error(`Chưa có quy tắc chọn template cho loại tài liệu: ${structured.document_type}.`);
  }

  const templateId = hasDataTableContent(structured) ? "TM-QD-001" : "TM-QD-002";
  return {
    templateId,
    templatePath: TEMPLATE_PATHS.get(templateId),
    reason:
      templateId === "TM-QD-001"
        ? "văn bản có bảng dữ liệu hoặc điều khoản tham chiếu bảng"
        : "văn bản không có bảng dữ liệu hoặc tham chiếu bảng",
  };
}

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
  if (template.capabilities?.data_tables === false) {
    const hasDataTables = (structured.data_tables?.length ?? 0) > 0;
    const hasTableReferences = (structured.articles ?? []).some(
      (article) => (article.related_table_ids?.length ?? 0) > 0,
    );
    if (hasDataTables || hasTableReferences) {
      throw new Error(`Template ${template.template_id} không hỗ trợ bảng dữ liệu.`);
    }
  }
  const tableErrors = (structured.data_tables ?? []).flatMap(tableShapeErrors);
  if (tableErrors.length > 0) throw new Error(`Bảng dữ liệu sai hình dạng: ${tableErrors.join(" ")}`);
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

// Python cho renderer: TEXMIND_PYTHON → .venv của dự án (nếu có) → python/python3 trong PATH.
export function resolvePythonCommand({
  env = process.env,
  platform = process.platform,
  projectRoot = resolve(scriptDir, ".."),
} = {}) {
  if (env.TEXMIND_PYTHON) return env.TEXMIND_PYTHON;
  const venvPython =
    platform === "win32"
      ? resolve(projectRoot, ".venv", "Scripts", "python.exe")
      : resolve(projectRoot, ".venv", "bin", "python");
  if (existsSync(venvPython)) return venvPython;
  return platform === "win32" ? "python" : "python3";
}

async function main() {
  const args = parseArgs();
  const inputPath = resolve(
    args.get("--input") ?? "dataset/van_ban_hanh_chinh/structured_01.json",
  );
  const schemaPath = resolve(args.get("--schema") ?? "schemas/texmind-document.schema.json");
  const referencePath = resolve(
    args.get("--reference") ?? "dataset/van_ban_hanh_chinh/output_01.docx",
  );
  const python = resolvePythonCommand();

  const [structured, schema] = await Promise.all([
    readFile(inputPath, "utf8").then(JSON.parse),
    readFile(schemaPath, "utf8").then(JSON.parse),
  ]);
  const schemaErrors = validateAgainstSchema(schema, structured);
  if (schemaErrors.length > 0) {
    throw new Error(`JSON sai schema (${schemaErrors.length} lỗi), không render DOCX.`);
  }

  const explicitTemplatePath = args.get("--template");
  const selection = explicitTemplatePath ? null : selectTemplate(structured);
  const templatePath = resolve(explicitTemplatePath ?? selection.templatePath);
  const outputPath = resolve(
    args.get("--output") ?? `outputs/${structured.sample_id}.rendered.docx`,
  );
  const template = await readFile(templatePath, "utf8").then(JSON.parse);
  assertTemplateCompatibility(structured, template);
  if (!existsSync(referencePath)) throw new Error(`Không tìm thấy DOCX tham chiếu: ${referencePath}`);

  if (selection) {
    console.log(`Đã tự chọn ${selection.templateId}: ${selection.reason}.`);
  } else {
    console.log(`Dùng template chỉ định: ${template.template_id}.`);
  }

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
