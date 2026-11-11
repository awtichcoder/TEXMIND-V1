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
    for row in table.rows:
        row.cells[0].width = Cm(8)
        row.cells[1].width = Cm(8)
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


def add_data_table(document, table_data):
    table = document.add_table(rows=2, cols=4)
    table.autofit = False
    widths = [Cm(1), Cm(9), Cm(3), Cm(3)]
    for index, width in enumerate(widths):
        table.columns[index].width = width
        table._tbl.tblGrid.gridCol_lst[index].w = width
    for row in table.rows:
        for index, cell in enumerate(row.cells):
            cell.width = widths[index]
    set_table_borders(table, "single", "000000", "8")
    columns = table_data["columns"]
    fill_table_cell(table.cell(0, 0), columns[0], bold=True)
    fill_table_cell(table.cell(0, 1), columns[1], bold=True)
    fill_table_cell(table.cell(0, 2), columns[2], bold=True)
    fill_table_cell(table.cell(0, 3), columns[3], bold=True)
    table.cell(0, 0).merge(table.cell(1, 0))
    table.cell(0, 1).merge(table.cell(1, 1))
    unit = f'({table_data["unit"]})'
    fill_table_cell(table.cell(1, 2), unit)
    fill_table_cell(table.cell(1, 3), unit)
    mark_repeat_table_header(table.rows[0])
    mark_repeat_table_header(table.rows[1])

    group_cells = {}
    for row_data in table_data["rows"]:
        cells = table.add_row().cells
        for index, cell in enumerate(cells):
            cell.width = widths[index]
        fill_table_cell(cells[0], row_data["group"])
        fill_table_cell(cells[1], row_data["description"], align=WD_ALIGN_PARAGRAPH.LEFT)
        fill_table_cell(cells[2], row_data["minimum_rent"]["source_text"])
        fill_table_cell(cells[3], row_data["maximum_rent"]["source_text"])
        prevent_row_split(table.rows[-1])
        group_cells.setdefault(str(row_data["group"]), []).append(cells[0])
    for group, cells in group_cells.items():
        if len(cells) > 1:
            for cell in cells[1:]:
                cell.text = ""
            merged = cells[0].merge(cells[-1])
            fill_table_cell(merged, group)
    return table


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
            prefix = f'{clause["number"]}. ' if clause.get("number") is not None else ""
            add_text_paragraph(document, f'{prefix}{clause["text"]}')
        for table_id in article.get("related_table_ids", []):
            if table_id not in tables_by_id:
                raise ValueError(f"Không tìm thấy data_table được tham chiếu: {table_id}")
            add_data_table(document, tables_by_id[table_id])


def add_recipients_and_signature(document, data):
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
    label = left.paragraphs[0]
    format_paragraph(label, WD_ALIGN_PARAGRAPH.LEFT, 8, 0)
    label.paragraph_format.line_spacing = 1.0
    set_run_font(label.add_run("Nơi nhận:"), size=11, bold=True, italic=True)
    for recipient in data.get("recipients", []):
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
    add_recipients_and_signature(document, data)
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
