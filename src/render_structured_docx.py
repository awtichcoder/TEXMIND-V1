import argparse
import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


def set_run_font(run, size=14, bold=None, italic=None):
    run.font.name = "Times New Roman"
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), "Times New Roman")
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), "Times New Roman")
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor(0, 0, 0)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def format_paragraph(paragraph, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, before=0, after=3, keep=False):
    paragraph.alignment = alignment
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = 1.15
    fmt.keep_with_next = keep


def add_text_paragraph(doc, text, *, bold=False, italic=False, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY,
                       before=0, after=3, keep=False, size=14):
    paragraph = doc.add_paragraph()
    format_paragraph(paragraph, alignment, before, after, keep)
    set_run_font(paragraph.add_run(text), size=size, bold=bold, italic=italic)
    return paragraph


def clear_body(document):
    body = document._element.body
    for child in list(body):
        if child.tag != qn("w:sectPr"):
            body.remove(child)


def set_table_borders(table, value="nil", color="000000", size="4"):
    props = table._tbl.tblPr
    borders = props.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        props.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = borders.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), value)
        if value != "nil":
            element.set(qn("w:color"), color)
            element.set(qn("w:sz"), size)


def set_cell_margins(cell, top=70, start=90, bottom=70, end=90):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def clear_cell(cell):
    cell.text = ""
    return cell.paragraphs[0]


def add_cell_lines(cell, lines, *, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.CENTER,
                   size=14, name_gap_before=0):
    cell.text = ""
    for index, line in enumerate(lines):
        paragraph = cell.paragraphs[0] if index == 0 else cell.add_paragraph()
        format_paragraph(paragraph, align, name_gap_before if index == len(lines) - 1 else 0, 0)
        set_run_font(paragraph.add_run(line), size=size, bold=bold, italic=italic)


def split_issuer(value):
    for marker in (" TỈNH ", " THÀNH PHỐ "):
        if marker in value:
            left, right = value.split(marker, 1)
            if marker == " THÀNH PHỐ ":
                return [left, "THÀNH PHỐ", right]
            return [left, f"{marker.strip()} {right}"]
    return [value]


def split_national_heading(value):
    marker = " VIỆT NAM"
    if marker in value:
        left, right = value.split(marker, 1)
        return [left, f"VIỆT NAM{right}"]
    return [value]


def split_subject(value):
    marker = " trên địa bàn "
    if marker in value:
        left, right = value.split(marker, 1)
        return [left, f"trên địa bàn {right}"]
    return [value]


def add_header_block(document, data):
    table = document.add_table(rows=2, cols=2)
    table.autofit = False
    set_table_borders(table, "nil")
    table.columns[0].width = Cm(7)
    table.columns[1].width = Cm(9)
    for row in table.rows:
        row.cells[0].width = Cm(7)
        row.cells[1].width = Cm(9)
        for cell in row.cells:
            set_cell_margins(cell, 0, 0, 0, 0)
    add_cell_lines(table.cell(0, 0), [*split_issuer(data["header"]["issuer"]), "-------"], bold=True)
    add_cell_lines(
        table.cell(0, 1),
        [*split_national_heading(data["header"]["national_heading"]), data["header"]["motto"], "---------------"],
        bold=True,
    )
    add_cell_lines(table.cell(1, 0), [f'Số: {data["header"]["document_number"]}'], align=WD_ALIGN_PARAGRAPH.LEFT)
    add_cell_lines(table.cell(1, 1), [data["header"]["issue_date_text"]], italic=True)


def mark_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    tr_pr.append(OxmlElement("w:cantSplit"))


def fill_table_cell(cell, text, *, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5):
    paragraph = clear_cell(cell)
    format_paragraph(paragraph, align, 0, 0)
    set_run_font(paragraph.add_run(str(text)), size=size, bold=bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)


TABLE_TOTAL_WIDTH_CM = 16.0  # A4 21 cm trừ lề trái 3 cm, lề phải 2 cm


def table_column_widths(all_rows, total=TABLE_TOTAL_WIDTH_CM):
    """Chia bề rộng cột theo độ dài chữ: cột rất ngắn (TT, Stt) hẹp, cột số vừa, cột mô tả rộng."""
    count = len(all_rows[0])
    longest = [max((len(row[i] or "") for row in all_rows), default=0) for i in range(count)]
    widths = [None] * count
    for i, length in enumerate(longest):
        if length <= 4:
            widths[i] = 1.2
        elif length <= 30:
            widths[i] = 3.0
    fixed = sum(width for width in widths if width is not None)
    flexible = [i for i, width in enumerate(widths) if width is None]
    if flexible:
        share = max((total - fixed) / len(flexible), 3.0)
        for i in flexible:
            widths[i] = share
    scale = total / sum(widths) if sum(widths) > total else 1.0
    return [Cm(width * scale) for width in widths]


def column_alignments(body_rows):
    """Cột có ô dữ liệu dài (> 30 ký tự) căn trái toàn cột; cột ngắn (số, STT) căn giữa."""
    count = len(body_rows[0])
    return [
        WD_ALIGN_PARAGRAPH.LEFT
        if max((len(row[i] or "") for row in body_rows), default=0) > 30
        else WD_ALIGN_PARAGRAPH.CENTER
        for i in range(count)
    ]


def merge_null_cells_vertically(table, rows, first_row_index, size, alignments=None):
    """Ô null gộp với ô gần nhất phía trên có chữ trong cùng nhóm dòng (tiêu đề hoặc dữ liệu)."""
    for column in range(len(rows[0])):
        anchor = None
        for offset, row in enumerate(rows):
            if row[column] is not None:
                anchor = offset
                continue
            if anchor is None:
                continue
            top = table.cell(first_row_index + anchor, column)
            text = rows[anchor][column]
            merged = top.merge(table.cell(first_row_index + offset, column))
            align = alignments[column] if alignments else WD_ALIGN_PARAGRAPH.CENTER
            fill_table_cell(merged, text, bold=first_row_index == 0, size=size, align=align)


def add_data_table(document, table_data, size=10.5):
    header_rows = table_data["header_rows"]
    body_rows = table_data["rows"]
    all_rows = [*header_rows, *body_rows]
    if table_data.get("unit"):
        add_text_paragraph(document, f'Đơn vị tính: {table_data["unit"]}', italic=True,
                           alignment=WD_ALIGN_PARAGRAPH.RIGHT, after=2, keep=True, size=size + 1)
    count = len(header_rows[0])
    table = document.add_table(rows=len(all_rows), cols=count)
    table.autofit = False
    widths = table_column_widths(all_rows)
    for index, width in enumerate(widths):
        table.columns[index].width = width
        table._tbl.tblGrid.gridCol_lst[index].w = width
    set_table_borders(table, "single", "000000", "8")
    body_alignments = column_alignments(body_rows)
    for row_index, row in enumerate(all_rows):
        is_header = row_index < len(header_rows)
        for column, value in enumerate(row):
            cell = table.cell(row_index, column)
            cell.width = widths[column]
            align = WD_ALIGN_PARAGRAPH.CENTER if is_header else body_alignments[column]
            fill_table_cell(cell, value or "", bold=is_header, align=align, size=size)
        if is_header:
            mark_repeat_table_header(table.rows[row_index])
        else:
            prevent_row_split(table.rows[row_index])
    merge_null_cells_vertically(table, header_rows, 0, size)
    merge_null_cells_vertically(table, body_rows, len(header_rows), size, body_alignments)
    return table


def clause_prefix(number, level):
    """Ký hiệu đứng trước khoản/điểm: số → '1. ', chữ → 'a) ', gạch đầu dòng → '- '."""
    if number is None:
        return ""
    number = str(number)
    if number in ("-", "–"):
        return f"{number} "
    if number[:1].isdigit():
        return f"{number}. " if level == 0 else f"{number}) "
    return f"{number}) "


def add_clause(document, clause, level=0):
    prefix = clause_prefix(clause.get("number"), level)
    paragraph = add_text_paragraph(document, f'{prefix}{clause["text"]}')
    if level > 0:
        paragraph.paragraph_format.left_indent = Cm(0.75 * level)
        paragraph.paragraph_format.first_line_indent = Cm(-0.5)
    for child in clause.get("children", []):
        add_clause(document, child, level + 1)


def add_articles(document, data):
    tables_by_id = {item["table_id"]: item for item in data.get("data_tables", [])}
    for article in data["articles"]:
        add_text_paragraph(
            document,
            f'Điều {article["number"]}. {article["heading"]}',
            bold=True,
            keep=True,
        )
        for clause in article.get("clauses", []):
            add_clause(document, clause)
        for table_id in article.get("related_table_ids", []):
            if table_id not in tables_by_id:
                raise ValueError(f"Không tìm thấy data_table được tham chiếu: {table_id}")
            add_data_table(document, tables_by_id[table_id])


def add_recipients_and_signature(document, data, template):
    if template.get("layout", {}).get("signature_new_page", True):
        document.add_page_break()
    table = document.add_table(rows=1, cols=2)
    table.autofit = False
    set_table_borders(table, "nil")
    for index, cell in enumerate(table.rows[0].cells):
        table.columns[index].width = Cm(8)
        table._tbl.tblGrid.gridCol_lst[index].w = Cm(8)
        cell.width = Cm(8)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
        set_cell_margins(cell, 0, 60, 0, 60)
    prevent_row_split(table.rows[0])

    left = table.cell(0, 0)
    left.text = ""
    recipients = data.get("recipients", [])
    if recipients:
        label = left.paragraphs[0]
        format_paragraph(label, WD_ALIGN_PARAGRAPH.LEFT, 8, 0)
        label.paragraph_format.line_spacing = 1.0
        set_run_font(label.add_run("Nơi nhận:"), size=11, bold=True, italic=True)
        for recipient in recipients:
            run = label.add_run(f"\n- {recipient}")
            set_run_font(run, size=11)

    signature = data["signature"]
    lines = [signature["authority"]]
    if signature.get("delegation"):
        lines.append(signature["delegation"])
    if signature.get("position"):
        lines.append(signature["position"])
    right = table.cell(0, 1)
    right.text = ""
    paragraph = right.paragraphs[0]
    format_paragraph(paragraph, WD_ALIGN_PARAGRAPH.CENTER, 8, 0)
    paragraph.paragraph_format.line_spacing = 1.0
    for index, line in enumerate(lines):
        run = paragraph.add_run(("\n" if index else "") + line)
        set_run_font(run, bold=True)
    if signature.get("signed_status"):
        run = paragraph.add_run(f'\n{signature["signed_status"]}')
        set_run_font(run, italic=True)
    name = paragraph.add_run(f'\n\n\n{signature["signer_name"]}')
    set_run_font(name, bold=True)


def build_document(data, template, reference_path):
    document = Document(reference_path)
    clear_body(document)
    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    margins = template["page"]["margins_cm"]
    section.top_margin = Cm(margins["top"])
    section.bottom_margin = Cm(margins["bottom"])
    section.left_margin = Cm(margins["left"])
    section.right_margin = Cm(margins["right"])
    normal = document.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    normal.font.size = Pt(template["typography"]["body_size_pt"])

    add_header_block(document, data)
    add_text_paragraph(document, data["title"]["document_name"], bold=True,
                       alignment=WD_ALIGN_PARAGRAPH.CENTER, before=6, after=4, keep=True)
    subject_lines = split_subject(data["title"]["subject"])
    for index, line in enumerate(subject_lines):
        add_text_paragraph(document, line, bold=True, alignment=WD_ALIGN_PARAGRAPH.CENTER,
                           after=8 if index == len(subject_lines) - 1 else 1,
                           keep=index < len(subject_lines) - 1)
    for basis in data["legal_bases"]:
        add_text_paragraph(document, basis, italic=True)
    add_text_paragraph(document, data["enactment"], italic=True)
    add_articles(document, data)
    add_recipients_and_signature(document, data, template)
    return document


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--template", required=True)
    parser.add_argument("--reference", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    template = json.loads(Path(args.template).read_text(encoding="utf-8"))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    document = build_document(data, template, args.reference)
    document.save(output)
    print(f"Đã tạo DOCX từ {data['sample_id']} bằng template {template['template_id']}.")


if __name__ == "__main__":
    main()
