// Chuyển JSON Schema của dự án sang dạng "strict" mà Structured Outputs của OpenAI
// (Codex CLI --output-schema) chấp nhận, và chuyển kết quả trả về ngược lại.
//
// Quy tắc strict mode:
// - Mọi object phải có additionalProperties: false và `required` chứa TẤT CẢ khóa trong properties.
//   => Khóa tùy chọn được đưa vào required nhưng cho phép giá trị null.
// - Một số từ khóa không được hỗ trợ (minLength, maxLength, $schema, $id...) => bỏ đi.
// - Kiểu "có thể null" phải viết bằng anyOf, không dùng mảng `type` (provider báo Invalid schema).
// - Mọi nút enum/const phải có `type` (suy ra từ giá trị).
//   Schema gốc vẫn được dùng để kiểm tra kết quả sau cùng nên không mất ràng buộc.

const UNSUPPORTED_KEYWORDS = new Set(["$schema", "$id", "minLength", "maxLength"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const isNullSchema = (schema) => isPlainObject(schema) && schema.type === "null";
const acceptsNull = (schema) =>
  isPlainObject(schema) &&
  ((Array.isArray(schema.anyOf) && schema.anyOf.some(isNullSchema)) || isNullSchema(schema));

// Provider từ chối dạng `type: ["string", "null"]` (đã thử 19/11/2026: "Invalid schema ...")
// nhưng chấp nhận `anyOf: [{type: "string"}, {type: "null"}]`. Đổi mọi kiểu mảng có null sang anyOf.
export function typeArrayToAnyOf(schema) {
  if (!isPlainObject(schema) || !Array.isArray(schema.type) || !schema.type.includes("null")) {
    return schema;
  }
  const { type, enum: enumValues, ...rest } = schema;
  const nonNull = type.filter((item) => item !== "null");
  const main = { ...rest, type: nonNull.length === 1 ? nonNull[0] : nonNull };
  if (Array.isArray(enumValues)) main.enum = enumValues.filter((item) => item !== null);
  return { anyOf: [main, { type: "null" }] };
}

const jsonTypeOf = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value; // string, boolean, object
};

// Một số máy chủ của provider đòi mọi nút phải có `type` (lỗi 19/11/2026:
// "schema must have a 'type' key"), kể cả nút chỉ có `enum` hoặc `const`. Suy ra type từ giá trị.
export function addMissingType(schema) {
  if (!isPlainObject(schema) || schema.type || schema.$ref || schema.anyOf || schema.oneOf || schema.allOf) {
    return schema;
  }
  const values = Array.isArray(schema.enum) ? schema.enum : Object.hasOwn(schema, "const") ? [schema.const] : null;
  if (!values || values.length === 0) return schema;
  let types = [...new Set(values.map(jsonTypeOf))];
  if (types.includes("number")) types = types.filter((type) => type !== "integer");
  return { ...schema, type: types.length === 1 ? types[0] : types };
}

// Cho phép thêm null vào một schema con (dùng cho khóa tùy chọn).
export function makeNullable(schema) {
  if (!isPlainObject(schema)) return schema;
  if (acceptsNull(schema)) return schema;
  if (Array.isArray(schema.type) && schema.type.includes("null")) return typeArrayToAnyOf(schema);
  return { anyOf: [schema, { type: "null" }] };
}

export function toStrictOutputSchema(schema) {
  const convert = (node) => {
    if (Array.isArray(node)) return node.map(convert);
    if (!isPlainObject(node)) return node;
    const result = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_KEYWORDS.has(key)) continue;
      if (key === "properties" && isPlainObject(value)) {
        result.properties = Object.fromEntries(
          Object.entries(value).map(([name, child]) => [name, convert(child)]),
        );
      } else if (key === "$defs" && isPlainObject(value)) {
        result.$defs = Object.fromEntries(
          Object.entries(value).map(([name, child]) => [name, convert(child)]),
        );
      } else {
        result[key] = convert(value);
      }
    }
    if (isPlainObject(result.properties)) {
      const required = new Set(node.required ?? []);
      for (const name of Object.keys(result.properties)) {
        if (!required.has(name)) result.properties[name] = makeNullable(result.properties[name]);
      }
      result.required = Object.keys(result.properties);
      result.additionalProperties = false;
    }
    return typeArrayToAnyOf(addMissingType(result));
  };
  return convert(schema);
}

const resolveRef = (rootSchema, ref) => {
  if (!ref.startsWith("#/")) return null;
  return ref
    .slice(2)
    .split("/")
    .reduce((current, part) => (current ? current[part.replace(/~1/gu, "/").replace(/~0/gu, "~")] : null), rootSchema);
};

// Xóa các khóa TÙY CHỌN (theo schema gốc) mà model trả về null, đi đệ quy theo schema.
// Khóa bắt buộc giữ nguyên kể cả khi null (để schema gốc báo lỗi nếu null không hợp lệ).
export function dropNullOptionals(value, schema, rootSchema = schema) {
  if (!isPlainObject(schema)) return value;
  if (schema.$ref) {
    const target = resolveRef(rootSchema, schema.$ref);
    return target ? dropNullOptionals(value, target, rootSchema) : value;
  }
  if (Array.isArray(value)) {
    return isPlainObject(schema.items)
      ? value.map((item) => dropNullOptionals(item, schema.items, rootSchema))
      : value;
  }
  if (!isPlainObject(value) || !isPlainObject(schema.properties)) return value;
  const required = new Set(schema.required ?? []);
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === null && !required.has(key) && Object.hasOwn(schema.properties, key)) continue;
    result[key] = Object.hasOwn(schema.properties, key)
      ? dropNullOptionals(child, schema.properties[key], rootSchema)
      : child;
  }
  return result;
}
