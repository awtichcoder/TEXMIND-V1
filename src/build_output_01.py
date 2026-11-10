from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = ROOT / "dataset" / "van_ban_hanh_chinh"
INPUT_PATH = DATASET_DIR / "input_01.txt"
OUTPUT_PATH = DATASET_DIR / "output_01.docx"

FONT = "Times New Roman"
BODY_SIZE = Pt(14)
TABLE_SIZE = Pt(10.5)


def set_run_font(run, size=BODY_SIZE, bold=None, italic=None):
    run.font.name = FONT
    r_pr = run._element.get_or_add_rPr()
    r_pr.rFonts.set(qn("w:ascii"), FONT)
    r_pr.rFonts.set(qn("w:hAnsi"), FONT)
    r_pr.rFonts.set(qn("w:eastAsia"), FONT)
    run.font.size = size
    run.font.color.rgb = RGBColor(0, 0, 0)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def set_paragraph_format(paragraph, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, before=0, after=0, line=1.15):
    paragraph.alignment = alignment
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line
    fmt.widow_control = True


def set_cell_margins(cell, top=70, start=80, bottom=70, end=80):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_borders(cell, color="000000", size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def remove_table_borders(table):
    tbl_pr = table._tbl.tblPr
    old_borders = tbl_pr.first_child_found_in("w:tblBorders")
    if old_borders is not None:
        tbl_pr.remove(old_borders)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "nil")
        borders.append(element)
    tbl_pr.append(borders)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_keep_with_next(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    p_pr.append(OxmlElement("w:keepNext"))


def set_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    tr_pr.append(OxmlElement("w:cantSplit"))


def add_text(paragraph, text, size=BODY_SIZE, bold=False, italic=False):
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold, italic=italic)
    return run


def replace_cell_text(cell, text, size=TABLE_SIZE, bold=False, alignment=WD_ALIGN_PARAGRAPH.CENTER):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    set_paragraph_format(paragraph, alignment=alignment, line=1.0)
    add_text(paragraph, text, size=size, bold=bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)
    set_cell_borders(cell)


def make_body_paragraph(doc, text, bold=False, italic=False, keep_with_next=False):
    paragraph = doc.add_paragraph()
    set_paragraph_format(paragraph, after=3)
    add_text(paragraph, text, bold=bold, italic=italic)
    if keep_with_next:
        set_keep_with_next(paragraph)
    return paragraph


def build_document():
    source = INPUT_PATH.read_text(encoding="utf-8")
    required = [
        "Số: 60/2025/QĐ-UBND",
        "Điều 1. Phạm vi điều chỉnh",
        "Điều 2. Đối tượng áp dụng",
        "Điều 3. Khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng",
        "Điều 4. Điều khoản thi hành",
        "Nguyễn Hữu Quế",
    ]
    missing = [item for item in required if item not in source]
    if missing:
        raise ValueError(f"Thiếu nội dung bắt buộc trong input_01.txt: {missing}")

    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(2.0)

    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal._element.rPr.rFonts.set(qn("w:ascii"), FONT)
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), FONT)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    normal.font.size = BODY_SIZE
    normal.font.color.rgb = RGBColor(0, 0, 0)

    doc.core_properties.title = "Quyết định số 60 2025 QĐ UBND tỉnh Gia Lai"
    doc.core_properties.subject = "Mẫu thử nghiệm TexMind TM-QD-001"
    doc.core_properties.author = "TexMind R1"
    doc.core_properties.keywords = "quyết định, văn bản hành chính, TM-QD-001"

    header = doc.add_table(rows=2, cols=2)
    header.alignment = WD_TABLE_ALIGNMENT.CENTER
    header.autofit = False
    header.columns[0].width = Cm(7.1)
    header.columns[1].width = Cm(8.9)
    remove_table_borders(header)

    left = header.cell(0, 0)
    right = header.cell(0, 1)
    left.text = ""
    right.text = ""
    p = left.paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, line=1.0)
    add_text(p, "ỦY BAN NHÂN DÂN\nTỈNH GIA LAI\n-------", bold=True)
    p = right.paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, line=1.0)
    add_text(p, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---------------", bold=True)

    p = header.cell(1, 0).paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, line=1.0)
    add_text(p, "Số: 60/2025/QĐ-UBND")
    p = header.cell(1, 1).paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, line=1.0)
    add_text(p, "Gia Lai, ngày 30 tháng 11 năm 2025", italic=True)
    for row in header.rows:
        for cell in row.cells:
            set_cell_margins(cell, top=20, start=40, bottom=20, end=40)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP

    p = doc.add_paragraph()
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, before=6, after=4)
    add_text(p, "QUYẾT ĐỊNH", bold=True)
    set_keep_with_next(p)
    p = doc.add_paragraph()
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, after=1)
    add_text(p, "Quy định khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng", bold=True)
    set_keep_with_next(p)
    p = doc.add_paragraph()
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, after=8)
    add_text(p, "trên địa bàn tỉnh Gia Lai", bold=True)

    recitals = [
        "Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15;",
        "Căn cứ Luật Ban hành văn bản quy phạm pháp luật số 64/2025/QH15;",
        "Căn cứ Luật Sửa đổi, bổ sung một số điều của Luật Ban hành văn bản quy phạm pháp luật số 87/2025/QH15;",
        "Căn cứ Luật Xây dựng số 50/2014/QH13;",
        "Căn cứ Luật Sửa đổi, bổ sung một số điều của Luật Xây dựng số 62/2020/QH14;",
        "Căn cứ Luật Nhà ở số 27/2023/QH15;",
        "Căn cứ Nghị định số 100/2024/NĐ-CP của Chính phủ quy định chi tiết một số điều của Luật Nhà ở về phát triển và quản lý nhà ở xã hội;",
        "Theo đề nghị của Giám đốc Sở Xây dựng;",
        "Ủy ban nhân dân ban hành Quyết định quy định khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng trên địa bàn tỉnh Gia Lai.",
    ]
    for item in recitals:
        make_body_paragraph(doc, item, italic=True)

    articles = [
        ("Điều 1. Phạm vi điều chỉnh", [
            "1. Quyết định này quy định chi tiết khoản 5 Điều 87 Luật Nhà ở số 27/2023/QH15 về khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng.",
            "2. Những nội dung không quy định trong Quyết định này thì thực hiện theo quy định của pháp luật hiện hành có liên quan.",
        ]),
        ("Điều 2. Đối tượng áp dụng", [
            "1. Cá nhân tự đầu tư xây dựng nhà ở xã hội để cho thuê trên địa bàn tỉnh Gia Lai.",
            "2. Các đối tượng được thuê nhà ở xã hội theo quy định của Luật số 27/2023/QH15.",
            "3. Các cơ quan quản lý nhà nước, các tổ chức, cá nhân khác có liên quan.",
        ]),
    ]
    for heading, clauses in articles:
        make_body_paragraph(doc, heading, bold=True, keep_with_next=True)
        for clause in clauses:
            make_body_paragraph(doc, clause)

    make_body_paragraph(
        doc,
        "Điều 3. Khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng",
        bold=True,
        keep_with_next=True,
    )

    price_table = doc.add_table(rows=2, cols=4)
    price_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    price_table.autofit = False
    widths = [Cm(1.0), Cm(9.0), Cm(3.0), Cm(3.0)]
    for row in price_table.rows:
        for idx, width in enumerate(widths):
            row.cells[idx].width = width
    replace_cell_text(price_table.cell(0, 0), "Stt", bold=True)
    replace_cell_text(price_table.cell(0, 1), "Loại nhà ở xã hội", bold=True)
    replace_cell_text(price_table.cell(0, 2), "Giá cho thuê tối thiểu", bold=True)
    replace_cell_text(price_table.cell(0, 3), "Giá cho thuê tối đa", bold=True)
    replace_cell_text(price_table.cell(1, 2), "(đồng/m² sàn sử dụng/tháng)", size=Pt(9.5))
    replace_cell_text(price_table.cell(1, 3), "(đồng/m² sàn sử dụng/tháng)", size=Pt(9.5))
    price_table.cell(0, 0).merge(price_table.cell(1, 0))
    price_table.cell(0, 1).merge(price_table.cell(1, 1))
    set_repeat_table_header(price_table.rows[0])
    set_repeat_table_header(price_table.rows[1])

    rows = [
        ("1", "Nhà 1 tầng, căn hộ khép kín, kết cấu tường gạch chịu lực, mái bê tông cốt thép đổ tại chỗ", "14.276", "30.915"),
        ("2", "Nhà riêng lẻ từ 2 đến 3 tầng, kết cấu khung chịu lực bê tông cốt thép; tường bao xây gạch; sàn, mái bê tông cốt thép đổ tại chỗ không có tầng hầm", "21.895", "47.413"),
        ("3", "Nhà riêng lẻ từ 4 đến 5 tầng, kết cấu khung chịu lực bê tông cốt thép; tường bao xây gạch; sàn, mái bê tông cốt thép đổ tại chỗ không có tầng hầm", "18.523", "40.092"),
        ("4", "Nhà từ 4 đến 5 tầng, kết cấu khung chịu lực bê tông cốt thép; tường bao xây gạch; sàn, mái bê tông cốt thép đổ tại chỗ, có 1 tầng hầm. Diện tích xây dựng từ 180m² trở lên", "22.004", "47.621"),
        ("5", "Nhà chung cư có số tầng ≤ 5 không có tầng hầm", "20.895", "45.250"),
        ("", "Có 1 tầng hầm", "24.428", "52.899"),
        ("6", "Nhà chung cư từ 5 < số tầng ≤ 7 không có tầng hầm", "26.898", "58.289"),
        ("", "Có 1 tầng hầm", "28.770", "62.345"),
    ]
    data_rows = []
    for stt, description, minimum, maximum in rows:
        cells = price_table.add_row().cells
        data_rows.append(cells)
        replace_cell_text(cells[0], stt)
        replace_cell_text(cells[1], description, alignment=WD_ALIGN_PARAGRAPH.LEFT)
        replace_cell_text(cells[2], minimum)
        replace_cell_text(cells[3], maximum)
        set_cant_split(price_table.rows[-1])
    data_rows[4][0].merge(data_rows[5][0])
    data_rows[6][0].merge(data_rows[7][0])

    make_body_paragraph(doc, "Điều 4. Điều khoản thi hành", bold=True, keep_with_next=True)
    article_4 = [
        "1. Quyết định này có hiệu lực kể từ ngày 10 tháng 12 năm 2025.",
        "2. Quyết định số 44/2024/QĐ-UBND ngày 17 tháng 8 năm 2024 của Ủy ban nhân dân tỉnh Bình Định quy định khung giá thuê nhà ở xã hội do cá nhân tự đầu tư xây dựng trên địa bàn tỉnh Bình Định hết hiệu lực kể từ ngày Quyết định này có hiệu lực thi hành.",
        "3. Chánh Văn phòng Ủy ban nhân dân tỉnh; Giám đốc các Sở, Thủ trưởng các ban, ngành; Chủ tịch Ủy ban nhân dân các xã, phường và các tổ chức, cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này./.",
    ]
    for clause in article_4:
        make_body_paragraph(doc, clause)

    sign_table = doc.add_table(rows=1, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_table.autofit = False
    sign_table.columns[0].width = Cm(9.0)
    sign_table.columns[1].width = Cm(7.0)
    remove_table_borders(sign_table)
    left = sign_table.cell(0, 0)
    right = sign_table.cell(0, 1)
    left.text = ""
    right.text = ""
    p = left.paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.LEFT, before=8, line=1.0)
    add_text(p, "Nơi nhận:\n", size=Pt(11), bold=True, italic=True)
    recipients = [
        "- Như khoản 3 Điều 4;",
        "- Vụ pháp chế - Bộ Xây dựng;",
        "- Cục KTVB&QLXLVPHC (Bộ Tư pháp);",
        "- TTTU, TTHĐND tỉnh, Đoàn ĐBQH tỉnh, UBMTTQVN tỉnh;",
        "- CT và các PCT UBND tỉnh;",
        "- Sở Tư pháp;",
        "- LĐ+CV VP UBND tỉnh;",
        "- TTPVHCC tỉnh;",
        "- Lưu: VT, X5.",
    ]
    add_text(p, "\n".join(recipients), size=Pt(11))
    p = right.paragraphs[0]
    set_paragraph_format(p, alignment=WD_ALIGN_PARAGRAPH.CENTER, before=8, line=1.0)
    add_text(p, "TM. ỦY BAN NHÂN DÂN\nKT. CHỦ TỊCH\nPHÓ CHỦ TỊCH", bold=True)
    add_text(p, "\n(Đã ký)", italic=True)
    add_text(p, "\n\n\nNguyễn Hữu Quế", bold=True)
    for cell in sign_table.rows[0].cells:
        set_cell_margins(cell, top=40, start=40, bottom=40, end=40)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP

    doc.save(OUTPUT_PATH)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    build_document()
