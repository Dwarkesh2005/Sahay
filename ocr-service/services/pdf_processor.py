import os
from typing import List, Tuple, Optional
from PIL import Image
import pypdf

class PDFProcessor:
    @staticmethod
    def is_pdf(file_path: str) -> bool:
        return file_path.lower().endswith(".pdf")

    @staticmethod
    def extract_text_pypdf(file_path: str) -> List[Tuple[int, str]]:
        """Extract text directly from digital PDF pages using PyMuPDF (fitz) or pypdf."""
        results = []
        # 1. Primary: PyMuPDF (fitz) - high accuracy and speed
        try:
            import fitz
            doc = fitz.open(file_path)
            for i, page in enumerate(doc):
                text = page.get_text() or ""
                results.append((i + 1, text.strip()))
            if any(len(t) > 20 for _, t in results):
                return results
        except Exception as e:
            print(f"[PDFProcessor] fitz direct extraction failed: {e}")

        # 2. Fallback: pypdf
        results = []
        try:
            reader = pypdf.PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                results.append((i + 1, text.strip()))
        except Exception as e:
            print(f"[PDFProcessor] pypdf extraction failed or partial: {e}")
        return results

    @staticmethod
    def convert_pdf_to_images(file_path: str, max_pages: int = 5) -> List[Image.Image]:
        """Convert PDF pages to PIL Images using PyMuPDF (fitz) or pdf2image."""
        images = []
        # 1. Primary: PyMuPDF (self-contained, no external poppler binary required)
        try:
            import fitz
            doc = fitz.open(file_path)
            for page_idx in range(min(len(doc), max_pages)):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                images.append(img)
            if images:
                return images
        except Exception as e:
            print(f"[PDFProcessor] fitz pixmap rendering failed: {e}")

        # 2. Fallback: pdf2image
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(file_path, first_page=1, last_page=max_pages)
        except Exception as e:
            print(f"[PDFProcessor] pdf2image conversion failed: {e}")
        return images
