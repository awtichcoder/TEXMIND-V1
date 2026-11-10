const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const resolveLocalRef = (rootSchema, ref) => {
  if (!ref.startsWith("#/")) throw new Error(`Chỉ hỗ trợ local $ref, nhận được: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], rootSchema);
};

const isIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export function validateAgainstSchema(rootSchema, value) {
  const errors = [];

  const visit = (schema, current, path) => {
    if (schema.$ref) {
      const resolved = resolveLocalRef(rootSchema, schema.$ref);
      if (!resolved) errors.push(`${path}: không tìm thấy $ref ${schema.$ref}`);
      else visit(resolved, current, path);
      return;
    }

    if (Object.hasOwn(schema, "const") && current !== schema.const) {
      errors.push(`${path}: phải bằng ${JSON.stringify(schema.const)}`);
    }
    if (schema.enum && !schema.enum.includes(current)) {
      errors.push(`${path}: không thuộc enum ${JSON.stringify(schema.enum)}`);
    }

    if (Array.isArray(schema.type)) {
      const matches = (type) =>
        (type === "null" && current === null) ||
        (type === "object" && isObject(current)) ||
        (type === "array" && Array.isArray(current)) ||
        (type === "string" && typeof current === "string") ||
        (type === "integer" && Number.isInteger(current)) ||
        (type === "boolean" && typeof current === "boolean");
      const matchedType = schema.type.find(matches);
      if (!matchedType) {
        errors.push(`${path}: phải thuộc kiểu ${schema.type.join(" | ")}`);
        return;
      }
      if (matchedType === "null") return;
      schema = { ...schema, type: matchedType };
    }

    if (schema.type === "object") {
      if (!isObject(current)) {
        errors.push(`${path}: phải là object`);
        return;
      }
      for (const key of schema.required ?? []) {
        if (!Object.hasOwn(current, key)) errors.push(`${path}.${key}: thiếu trường bắt buộc`);
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(current)) {
          if (!Object.hasOwn(schema.properties ?? {}, key)) errors.push(`${path}.${key}: trường không được phép`);
        }
      }
      for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
        if (Object.hasOwn(current, key)) visit(childSchema, current[key], `${path}.${key}`);
      }
      return;
    }

    if (schema.type === "array") {
      if (!Array.isArray(current)) {
        errors.push(`${path}: phải là array`);
        return;
      }
      if (schema.minItems !== undefined && current.length < schema.minItems) {
        errors.push(`${path}: cần ít nhất ${schema.minItems} phần tử`);
      }
      if (schema.items) current.forEach((item, index) => visit(schema.items, item, `${path}[${index}]`));
      return;
    }

    if (schema.type === "string") {
      if (typeof current !== "string") {
        errors.push(`${path}: phải là string`);
        return;
      }
      if (schema.minLength !== undefined && current.length < schema.minLength) {
        errors.push(`${path}: độ dài nhỏ hơn ${schema.minLength}`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(current)) {
        errors.push(`${path}: không khớp pattern ${schema.pattern}`);
      }
      if (schema.format === "date" && !isIsoDate(current)) errors.push(`${path}: ngày không hợp lệ`);
      return;
    }

    if (schema.type === "integer") {
      if (!Number.isInteger(current)) {
        errors.push(`${path}: phải là integer`);
        return;
      }
      if (schema.minimum !== undefined && current < schema.minimum) {
        errors.push(`${path}: phải >= ${schema.minimum}`);
      }
    }

    if (schema.type === "boolean" && typeof current !== "boolean") {
      errors.push(`${path}: phải là boolean`);
    }
  };

  visit(rootSchema, value, "$");
  return errors;
}
