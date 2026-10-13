from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen import canvas


OUTPUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "toriai-demo-invoice.pdf"
FONT = "ArialUnicode"
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


def yen(value: int) -> str:
    return f"{value:,} 円"


def draw_paragraph(c: canvas.Canvas, text: str, style: ParagraphStyle, x: float, y: float, width: float) -> float:
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, 100 * mm)
    paragraph.drawOn(c, x, y - height)
    return height


def build_pdf() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont(FONT, FONT_PATH))

    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    page_width, page_height = A4
    left = 18 * mm
    right = page_width - 18 * mm
    usable = right - left

    c.setTitle("Toriai 適格請求書サンプル")
    c.setAuthor("株式会社MoMo")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont(FONT, 24)
    c.drawCentredString(page_width / 2, page_height - 25 * mm, "請求書")

    normal = ParagraphStyle("normal", fontName=FONT, fontSize=9, leading=14, textColor=colors.HexColor("#334155"))
    small = ParagraphStyle("small", fontName=FONT, fontSize=7.5, leading=11, textColor=colors.HexColor("#475569"))
    issuer_style = ParagraphStyle("issuer", fontName=FONT, fontSize=9, leading=14, textColor=colors.HexColor("#0F172A"))

    top_y = page_height - 42 * mm
    c.setFont(FONT, 8)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(left, top_y, "請求先")
    c.setFont(FONT, 14)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawString(left, top_y - 8 * mm, "株式会社デモ商事 御中")
    c.setStrokeColor(colors.HexColor("#0F172A"))
    c.setLineWidth(0.8)
    c.line(left, top_y - 11 * mm, left + 75 * mm, top_y - 11 * mm)
    c.setFont(FONT, 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(left, top_y - 17 * mm, "山田 太郎 様")
    c.setFont(FONT, 7.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(left, top_y - 22 * mm, "demo-customer@example.com")
    c.drawString(left, top_y - 27 * mm, "03-1234-5678")

    issuer_x = page_width - 92 * mm
    issuer_y = top_y + 4 * mm
    issuer_w = 74 * mm
    issuer_h = 36 * mm
    c.setStrokeColor(colors.HexColor("#475569"))
    c.setLineWidth(0.8)
    c.rect(issuer_x, issuer_y - issuer_h, issuer_w, issuer_h)
    draw_paragraph(
        c,
        "<font size='7' color='#64748B'>適格請求書発行事業者</font><br/>"
        "<b>株式会社MoMo</b><br/>"
        "代表 伊藤 翔<br/>"
        "<font size='7'>福岡県福岡市中央区天神1-11-1<br/>ONE FUKUOKA BLDG. 7F</font><br/>"
        "<b>登録番号 T1234567890123</b>",
        issuer_style,
        issuer_x + 4 * mm,
        issuer_y - 3 * mm,
        issuer_w - 8 * mm,
    )

    info_y = top_y - 57 * mm
    info = [
        ["請求書番号", "INV-DEMO-20260723-01"],
        ["請求日（取引年月日）", "2026-07-23"],
        ["支払期日", "2026-08-31"],
    ]
    info_table = Table(info, colWidths=[42 * mm, 42 * mm], rowHeights=[6 * mm] * 3)
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#64748B")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#0F172A")),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    info_table.wrapOn(c, 84 * mm, 20 * mm)
    info_table.drawOn(c, page_width - 102 * mm, info_y)

    amount_y = info_y - 14 * mm
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.setStrokeColor(colors.HexColor("#94A3B8"))
    c.rect(left, amount_y - 14 * mm, usable, 14 * mm, fill=1, stroke=1)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont(FONT, 11)
    c.drawString(left + 5 * mm, amount_y - 9 * mm, "ご請求金額")
    c.setFont(FONT, 16)
    c.drawString(left + 42 * mm, amount_y - 9.5 * mm, yen(164000))

    item_y = amount_y - 23 * mm
    items = [
        ["納品日", "品目", "単価", "数量", "単位", "税率区分", "金額"],
        ["2026-07-20", "Toriai 月額利用料", "100,000", "1", "式", "10%", "100,000"],
        ["2026-07-21", "軽減税率対象サンプル商品 ※", "50,000", "1", "個", "8%", "50,000"],
    ]
    item_table = Table(items, colWidths=[24*mm, 59*mm, 23*mm, 12*mm, 12*mm, 20*mm, 26*mm], rowHeights=[8*mm, 9*mm, 9*mm])
    item_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#475569")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#F8FAFC")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#475569")),
        ("LINEBELOW", (0, -1), (-1, -1), 0.8, colors.HexColor("#475569")),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    item_table.wrapOn(c, usable, 30 * mm)
    item_table.drawOn(c, left, item_y - 26 * mm)

    c.setFont(FONT, 7)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(left, item_y - 31 * mm, "「※」は軽減税率対象品目です。")

    breakdown_y = item_y - 44 * mm
    tax_rows = [
        ["税率別内訳", "税抜金額", "消費税額", "税込金額"],
        ["10%", "100,000", "10,000", "110,000"],
        ["8%（軽減税率）", "50,000", "4,000", "54,000"],
    ]
    tax_table = Table(tax_rows, colWidths=[30*mm, 23*mm, 23*mm, 24*mm], rowHeights=[8*mm, 8*mm, 8*mm])
    tax_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#94A3B8")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    tax_table.wrapOn(c, 100 * mm, 24 * mm)
    tax_table.drawOn(c, left, breakdown_y - 24 * mm)

    totals = [["小計", "150,000 円"], ["消費税額合計", "14,000 円"], ["合計", "164,000 円"]]
    total_table = Table(totals, colWidths=[34 * mm, 35 * mm], rowHeights=[8 * mm, 8 * mm, 10 * mm])
    total_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -2), 8.5),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.HexColor("#94A3B8")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("LINEBELOW", (0, -1), (-1, -1), 0.8, colors.HexColor("#475569")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    total_table.wrapOn(c, 69 * mm, 26 * mm)
    total_table.drawOn(c, right - 69 * mm, breakdown_y - 26 * mm)

    c.setFont(FONT, 7)
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.drawCentredString(page_width / 2, 10 * mm, "1 / 1")
    c.save()


if __name__ == "__main__":
    build_pdf()
