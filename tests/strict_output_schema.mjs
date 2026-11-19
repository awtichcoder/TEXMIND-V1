import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addMissingType,
  dropNullOptionals,
  makeNullable,
  toStrictOutputSchema,
} from "../src/strict_output_schema.mjs";
import { validateAgainstSchema } from "../src/validate_json_schema.mjs";

const loadJson = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

const visitObjects = (node, visitor, path = "#") => {
  if (Array.isArray(node)) return node.forEach((item, index) => visitObjects(item, visitor, `${path}[${index}]`));
  if (!node || typeof node !== "object") return;
  visitor(node, path);
  for (const [key, value] of Object.entries(node)) visitObjects(value, visitor, `${path}/${key}`);
};

test("schema strict: mọi object có required đủ khóa, additionalProperties false, không còn minLength", async () => {
  const schema = await loadJson("schemas/texmind-document.schema.json");
  const strict = toStrictOutputSchema(schema);
  visitObjects(strict, (node, path) => {
    assert.equal(Object.hasOwn(node, "minLength"), false, `${path} còn minLength`);
    assert.equal(Array.isArray(node.type), false, `${path} còn type dạng mảng`);
    if (Object.hasOwn(node, "enum") || Object.hasOwn(node, "const")) {
      assert.ok(node.type, `${path} có enum/const nhưng thiếu type`);
    }
    if (node.properties && typeof node.properties === "object" && !Array.isArray(node.properties)) {
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${path} thiếu required`);
      assert.equal(node.additionalProperties, false, `${path} thiếu additionalProperties`);
    }
  });
  assert.equal(Object.hasOwn(strict, "$schema"), false);
  // Khóa tùy chọn được phép null (viết bằng anyOf).
  assert.equal(strict.$defs.clause.properties.children.anyOf[0].type, "array");
  assert.deepEqual(strict.$defs.clause.properties.children.anyOf[1], { type: "null" });
  assert.equal(strict.properties.attachments.anyOf[0].type, "array");
  // Kiểu mảng có sẵn trong schema gốc cũng được đổi sang anyOf.
  assert.equal(strict.properties.signature.properties.delegation.anyOf[0].type, "string");
  assert.equal(strict.properties.template.anyOf[0].type, "object");
  assert.deepEqual(strict.properties.template.anyOf[0].required, ["id", "version"]);
  // Schema gốc không bị sửa.
  assert.equal(schema.$defs.clause.required.includes("children"), false);
});

test("addMissingType suy ra type cho enum/const", () => {
  assert.deepEqual(addMissingType({ const: "vi" }), { const: "vi", type: "string" });
  assert.deepEqual(addMissingType({ enum: [1, 2] }), { enum: [1, 2], type: "integer" });
  assert.deepEqual(addMissingType({ enum: [1, 2.5] }), { enum: [1, 2.5], type: "number" });
  assert.deepEqual(addMissingType({ enum: ["a", null] }), { enum: ["a", null], type: ["string", "null"] });
  const ref = { $ref: "#/$defs/x" };
  assert.equal(addMissingType(ref), ref);
});

test("makeNullable bọc $ref bằng anyOf và thêm null vào enum", () => {
  assert.deepEqual(makeNullable({ $ref: "#/$defs/x" }), { anyOf: [{ $ref: "#/$defs/x" }, { type: "null" }] });
  assert.deepEqual(makeNullable({ type: "string", enum: ["a"] }), {
    anyOf: [{ type: "string", enum: ["a"] }, { type: "null" }],
  });
  assert.deepEqual(makeNullable({ type: ["string", "null"], enum: ["a", null] }), {
    anyOf: [{ type: "string", enum: ["a"] }, { type: "null" }],
  });
  const already = { anyOf: [{ type: "string" }, { type: "null" }] };
  assert.equal(makeNullable(already), already);
});

test("dropNullOptionals bỏ null ở khóa tùy chọn (kể cả trong $ref đệ quy), giữ khóa bắt buộc", async () => {
  const schema = await loadJson("schemas/texmind-document.schema.json");
  const gold = await loadJson("dataset/samples/qd_067/gold.json");
  const addNullChildren = (clauses) =>
    clauses.map((clause) => ({
      ...clause,
      children: clause.children ? addNullChildren(clause.children) : null,
    }));
  const fromModel = {
    ...gold,
    articles: gold.articles.map((article) => ({ ...article, clauses: addNullChildren(article.clauses ?? []) })),
    quality: { ...gold.quality, warnings: gold.quality?.warnings ?? null, source_consistency: gold.quality?.source_consistency ?? null },
  };
  assert.notDeepEqual(validateAgainstSchema(schema, fromModel), [], "bản có null phải sai schema gốc");
  const cleaned = dropNullOptionals(fromModel, schema);
  assert.deepEqual(validateAgainstSchema(schema, cleaned), []);
  assert.deepEqual(cleaned, gold);

  // Khóa bắt buộc có null thì giữ nguyên để schema gốc báo lỗi.
  const requiredNull = dropNullOptionals({ ...gold, header: null }, schema);
  assert.equal(requiredNull.header, null);
});
