import sys
import os
import pdfplumber
import docx
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

# Usage: python extract_resume_text.py <file_path>

def extract_all_text(file_path):
    if file_path.endswith(".pdf"):
        try:
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            if not text.strip():
                raise Exception("Use OCR")
        except:
            # OCR fallback
            text = ""
            images = convert_from_path(file_path)
            for image in images:
                text += pytesseract.image_to_string(image) + "\n"
        return text

    elif file_path.endswith(".docx"):
        doc = docx.Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    else:
        return "Unsupported file format"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_resume_text.py <file_path>", file=sys.stderr)
        sys.exit(1)
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    text = extract_all_text(file_path)
    # Ensure Unicode output regardless of terminal encoding
    try:
        # Only call reconfigure if it exists (Python 3.7+)
        reconfigure = getattr(sys.stdout, 'reconfigure', None)
        if callable(reconfigure):
            reconfigure(encoding='utf-8')
            print(text)
        else:
            # Fallback for older Python versions
            print(text.encode('utf-8', errors='replace').decode('utf-8'))
    except Exception:
        print(text.encode('utf-8', errors='replace').decode('utf-8')) 