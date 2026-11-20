// Kiểm tra và hỗ trợ cho data_tables dạng tổng quát (schema 19/11/2026):
//   { table_id, title, unit, header_rows: [[ô...]...], rows: [[ô...]...] }
// Ô là chuỗi nguyên văn nguồn, hoặc null = gộp với ô ngay phía trên.

// Lỗi hình dạng mà JSON Schema không diễn đạt được. Trả về danh sách chuỗi (rỗng = hợp lệ).
export function tableShapeErrors(table) {
  const errors = [];
  const id = table?.table_id ?? "?";
  const allRows = [...(table?.header_rows ?? []), ...(table?.rows ?? [])];
  if (allRows.length === 0) return [`Bảng ${id}: không có dòng nào.`];
  const width = allRows[0].length;
  allRows.forEach((row, index) => {
    if (row.length !== width) {
      errors.push(`Bảng ${id}: dòng ${index + 1} có ${row.length} ô, khác ${width} ô của dòng tiêu đề đầu.`);
    }
  });
  (table.header_rows?.[0] ?? []).forEach((cell, column) => {
    if (cell === null) errors.push(`Bảng ${id}: ô tiêu đề đầu tiên ở cột ${column + 1} không được là null.`);
  });
  (table.rows?.[0] ?? []).forEach((cell, column) => {
    if (cell === null) {
      errors.push(`Bảng ${id}: dòng dữ liệu đầu tiên ở cột ${column + 1} là null (không được gộp lên dòng tiêu đề).`);
    }
  });
  return errors;
}

// Ô dạng số có khoảng trắng sau dấu chấm phân cách nghìn, vd "1. 200", "13. 500": nghi lỗi gõ.
export const SUSPICIOUS_NUMBER_CELL = /^\s*\d{1,3}(?:\.\s*\d{3})*\.\s+\d{3}(?:\.\s*\d{3})*\s*$/u;

export function suspiciousNumberCells(table) {
  const cells = [];
  for (const row of [...(table?.header_rows ?? []), ...(table?.rows ?? [])]) {
    if (!Array.isArray(row)) continue; // định dạng bảng cũ/sai: để kiểm tra schema báo lỗi
    for (const cell of row) {
      if (typeof cell === "string" && SUSPICIOUS_NUMBER_CELL.test(cell) && !cells.includes(cell)) cells.push(cell);
    }
  }
  return cells;
}

export const suspiciousNumberWarning = (tableId, cell) =>
  `Bảng ${tableId}: ô "${cell}" có khoảng trắng sau dấu chấm phân cách hàng nghìn (nghi lỗi gõ trong nguồn); giữ nguyên văn, không sửa.`;
