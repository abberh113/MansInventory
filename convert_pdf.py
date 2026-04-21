import markdown
from fpdf import FPDF
import sys

def md_to_pdf(md_file, pdf_file):
    with open(md_file, 'r', encoding='utf-8') as f:
        md_text = f.read()
    
    html_text = markdown.markdown(md_text, extensions=['tables'])
    
    pdf = FPDF(format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("helvetica", size=12)
    pdf.write_html(html_text)
    
    pdf.output(pdf_file)
    print(f"Successfully converted {md_file} to {pdf_file}")

if __name__ == "__main__":
    md_to_pdf("Developer_Blueprint.md", "Developer_Blueprint.pdf")
    md_to_pdf("End_User_Manual.md", "End_User_Manual.pdf")
