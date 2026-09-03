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
        """Extract text directly from digitally generated PDF pages. Returns [(page_num, text), ...]."""
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
        """Convert PDF pages to PIL Images using pdf2image if poppler is present, or fallback."""
        images = []
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(file_path, first_page=1, last_page=max_pages)
        except Exception as e:
            print(f"[PDFProcessor] pdf2image conversion failed (poppler might not be installed in system PATH): {e}")
            # Fallback: if pypdf has page images or if conversion is not possible, we return empty list
        return images
