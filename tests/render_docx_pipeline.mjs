import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertTemplateCompatibility,
  hasDataTableContent,
  rendererCommand,
  resolvePythonCommand,
  selectTemplate,
} from "../src/render_structured_docx.mjs";

const root = new URL("../", import.meta.url);

test("chọn Python cho renderer: TEXMIND_PYTHON → .venv của dự án → python trong PATH", async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), "texmind-python-test-"));
  try {
    assert.equal(resolvePythonCommand({ env: { TEXMIND_PYTHON: "py-x" }, platform: "win32", projectRoot }), "py-x");
    assert.equal(resolvePythonCommand({ env: {}, platform: "win32", projectRoot }), "python");
    assert.equal(resolvePythonCommand({ env: {}, platform: "linux", projectRoot }), "python3");
    const venvPython = join(projectRoot, ".venv", "Scripts", "python.exe");
    await mkdir(join(projectRoot, ".venv", "Scripts"), { recursive: true });
    await writeFile(venvPython, "");
    assert.equal(resolvePythonCommand({ env: {}, platform: "win32", projectRoot }), venvPython);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("renderer chấp nhận structured_01 với template TM-QD-001", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-001.json", root), "utf8").then(JSON.parse),
  ]);
  assert.doesNotThrow(() => assertTemplateCompatibility(structured, template));
});

test("renderer chấp nhận qd_021 với template TM-QD-002 không có bảng", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_02.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-002.json", root), "utf8").then(JSON.parse),
  ]);
  assert.equal(structured.data_tables.length, 0);
  assert.doesNotThrow(() => assertTemplateCompatibility(structured, template));
});

test("renderer chấp nhận qd_014 không nơi nhận và có khoản lồng nhau", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_04.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-002.json", root), "utf8").then(JSON.parse),
  ]);
  assert.equal(structured.recipients.length, 0);
  assert.equal(structured.articles[2].clauses[0].children.length, 2);
  assert.doesNotThrow(() => assertTemplateCompatibility(structured, template));
});

test("renderer chấp nhận qd_067 có 12 phụ lục tham chiếu và khoản lồng nhau", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_03.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-002.json", root), "utf8").then(JSON.parse),
  ]);
  assert.equal(structured.data_tables.length, 0);
  assert.equal(structured.attachments.length, 12);
  assert.ok(structured.articles.some((article) => article.clauses.some((clause) => clause.children?.length)));
  assert.doesNotThrow(() => assertTemplateCompatibility(structured, template));
});

test("bộ chọn tự động dùng TM-QD-001 khi có bảng và TM-QD-002 khi không có bảng", async () => {
  const [withTable, withoutTable, withAttachmentReferences] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8").then(JSON.parse),
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_02.json", root), "utf8").then(JSON.parse),
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_03.json", root), "utf8").then(JSON.parse),
  ]);

  assert.equal(selectTemplate({ ...withTable, template: null }).templateId, "TM-QD-001");
  assert.equal(selectTemplate(withoutTable).templateId, "TM-QD-002");
  assert.equal(selectTemplate(withAttachmentReferences).templateId, "TM-QD-002");
});

test("bộ chọn nhận diện tham chiếu bảng ngay cả khi data_tables đang rỗng", async () => {
  const structured = await readFile(
    new URL("dataset/van_ban_hanh_chinh/structured_02.json", root),
    "utf8",
  ).then(JSON.parse);
  const candidate = {
    ...structured,
    template: null,
    articles: [{ ...structured.articles[0], related_table_ids: ["missing_table"] }],
  };

  assert.equal(hasDataTableContent(candidate), true);
  assert.equal(selectTemplate(candidate).templateId, "TM-QD-001");
});

test("bộ chọn ưu tiên template khai báo và báo lỗi khi template không tồn tại", async () => {
  const structured = await readFile(
    new URL("dataset/van_ban_hanh_chinh/structured_02.json", root),
    "utf8",
  ).then(JSON.parse);
  assert.equal(
    selectTemplate({ ...structured, template: { id: "TM-QD-001", version: "0.1" } }).templateId,
    "TM-QD-001",
  );
  assert.throws(
    () => selectTemplate({ ...structured, template: { id: "TM-KHONG-TON-TAI", version: "0.1" } }),
    /Không tìm thấy template đã khai báo/u,
  );
});

test("bộ chọn báo lỗi rõ ràng cho loại tài liệu chưa có quy tắc", async () => {
  const structured = await readFile(
    new URL("dataset/van_ban_hanh_chinh/structured_02.json", root),
    "utf8",
  ).then(JSON.parse);
  assert.throws(
    () => selectTemplate({ ...structured, document_type: "bao_cao", template: null }),
    /Chưa có quy tắc chọn template/u,
  );
});

test("TM-QD-002 từ chối dữ liệu có bảng hoặc tham chiếu bảng", async () => {
  const [withTable, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-002.json", root), "utf8").then(JSON.parse),
  ]);
  assert.throws(
    () => assertTemplateCompatibility({ ...withTable, template: null }, template),
    /không hỗ trợ bảng dữ liệu/u,
  );
});

test("renderer từ chối sai loại tài liệu hoặc sai template", async () => {
  const [structured, template] = await Promise.all([
    readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8").then(JSON.parse),
    readFile(new URL("templates/TM-QD-001.json", root), "utf8").then(JSON.parse),
  ]);
  assert.throws(
    () => assertTemplateCompatibility({ ...structured, document_type: "bao_cao" }, template),
    /không tương thích/u,
  );
  assert.throws(
    () =>
      assertTemplateCompatibility(
        { ...structured, template: { id: "TM-KHAC", version: "1" } },
        template,
      ),
    /JSON yêu cầu template/u,
  );
});

test("renderer tạo lệnh Python có đủ bốn đường dẫn", () => {
  const command = rendererCommand({
    inputPath: "input.json",
    templatePath: "template.json",
    referencePath: "reference.docx",
    outputPath: "output.docx",
    python: "python-test",
  });
  assert.equal(command.command, "python-test");
  assert.deepEqual(command.args.slice(-8), [
    "--input",
    "input.json",
    "--template",
    "template.json",
    "--reference",
    "reference.docx",
    "--output",
    "output.docx",
  ]);
});

test("renderer Python vẽ được bảng 3 cột (thiếu cột nhóm) bằng cách thêm cột TT", async (t) => {
  const { spawnSync } = await import("node:child_process");
  const python = resolvePythonCommand();
  const probe = spawnSync(python, ["-c", "import docx"], { encoding: "utf8" });
  if (probe.status !== 0) {
    t.skip("máy chưa có Python + python-docx");
    return;
  }
  const workDir = await mkdtemp(join(tmpdir(), "texmind-table3-"));
  try {
    const structured = JSON.parse(
      await readFile(new URL("dataset/van_ban_hanh_chinh/structured_01.json", root), "utf8"),
    );
    structured.data_tables[0].columns = structured.data_tables[0].columns.slice(1);
    assert.equal(structured.data_tables[0].columns.length, 3);
    const inputPath = join(workDir, "input.json");
    const outputPath = join(workDir, "out.docx");
    await writeFile(inputPath, JSON.stringify(structured));
    const command = rendererCommand({
      inputPath,
      templatePath: fileURLToPath(new URL("templates/TM-QD-001.json", root)),
      referencePath: fileURLToPath(new URL("dataset/van_ban_hanh_chinh/output_01.docx", root)),
      outputPath,
      python,
    });
    const result = spawnSync(command.command, command.args, {
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    assert.equal(result.status, 0, result.stderr);
    const check = spawnSync(
      python,
      [
        "-c",
        "import docx,sys; print('|'.join(t.cell(0,0).text for t in docx.Document(sys.argv[1]).tables if len(t.columns)==4))",
        outputPath,
      ],
      { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
    );
    assert.equal(check.status, 0, check.stderr);
    assert.ok(check.stdout.trim().split("|").includes("TT"), check.stdout);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});
