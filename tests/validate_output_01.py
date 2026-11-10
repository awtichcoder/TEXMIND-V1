from pathlib import Path
import re

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
DOCX_PATH = ROOT / "dataset" / "van_ban_hanh_chinh" / "output_01.docx"


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


document = Document(DOCX_PATH)
parts = [paragraph.text for paragraph in document.paragraphs]
for table in document.tables:
    for row in table.rows:
        parts.extend(cell.text for cell in row.cells)

content = normalize("\n".join(parts))

required_fragments = [
    "Số: 60/2025/QĐ-UBND",
    "Gia Lai, ngày 30 tháng 11 năm 2025",
    "Quy định khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng trên địa bàn tỉnh Gia Lai",
    "Điều 1. Phạm vi điều chỉnh",
    "Điều 2. Đối tượng áp dụng",
    "Điều 3. Khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng",
    "Điều 4. Điều khoản thi hành",
    "Quyết định này có hiệu lực kể từ ngày 10 tháng 12 năm 2025.",
    "Nguyễn Hữu Quế",
]

table_values = [
    "14.276", "30.915", "21.895", "47.413", "18.523", "40.092",
    "22.004", "47.621", "20.895", "45.250", "24.428", "52.899",
    "26.898", "58.289", "28.770", "62.345",
]

missing = [fragment for fragment in required_fragments + table_values if normalize(fragment) not in content]
assert not missing, f"Thiếu nội dung trong output_01.docx: {missing}"
assert len(document.tables) >= 3, "Thiếu bảng bố cục hoặc bảng dữ liệu"
assert len(document.sections) == 1, "Tài liệu không đúng cấu trúc một section"

section = document.sections[0]
width_cm = section.page_width.cm
height_cm = section.page_height.cm
assert abs(width_cm - 21.0) < 0.1 and abs(height_cm - 29.7) < 0.1, "Khổ giấy không phải A4"

print("PASS: output_01.docx content, 16 table values, tables, and A4 page verified.")
