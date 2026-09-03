import os
import time
from abc import ABC, abstractmethod
from typing import List, Optional, Any
from PIL import Image
import numpy as np

from models.extraction import PageOCRResult
from services.text_cleaner import TextCleaner
from services.pdf_processor import PDFProcessor

class IOCREngine(ABC):
    @abstractmethod
    def process_image(self, image: Image.Image, page_num: int) -> PageOCRResult:
        pass

    @abstractmethod
    def process_file(self, file_path: str) -> List[PageOCRResult]:
        pass

class PaddleOCREngine(IOCREngine):
    def __init__(self, lang: str = "en", use_gpu: bool = False):
        self.lang = lang
        self.use_gpu = use_gpu
        self._ocr = None
        self._init_attempted = False
        self._available = False

    def _ensure_initialized(self):
        if self._init_attempted:
            return
        self._init_attempted = True
        try:
            from paddleocr import PaddleOCR
            print(f"[PaddleOCREngine] Initializing PaddleOCR (lang={self.lang}, gpu={self.use_gpu})...")
            self._ocr = PaddleOCR(use_angle_cls=True, lang=self.lang, show_log=False)
            self._available = True
            print("[PaddleOCREngine] PaddleOCR initialized successfully.")
        except Exception as e:
            print(f"[PaddleOCREngine] PaddleOCR initialization failed or library not present: {e}")
            self._available = False

    def is_available(self) -> bool:
        self._ensure_initialized()
        return self._available

    def process_image(self, image: Image.Image, page_num: int) -> PageOCRResult:
        self._ensure_initialized()
        if not self._available or self._ocr is None:
            return PageOCRResult(
                page=page_num,
                text="",
                confidence=0.0,
                word_count=0,
                lines=[]
            )

        try:
            img_np = np.array(image.convert("RGB"))
            result = self._ocr.ocr(img_np, cls=True)
            lines = []
            confidences = []

            if result and len(result) > 0 and result[0] is not None:
                for line in result[0]:
                    box = line[0]
                    text, conf = line[1]
                    lines.append({
                        "text": text,
                        "confidence": float(conf),
                        "box": box
                    })
                    confidences.append(float(conf))

            full_text = "\n".join([l["text"] for l in lines])
            cleaned_text = TextCleaner.clean_text(full_text)
            avg_conf = float(np.mean(confidences)) if confidences else 0.0

            return PageOCRResult(
                page=page_num,
                text=cleaned_text,
                confidence=round(avg_conf, 4),
                word_count=len(cleaned_text.split()),
                lines=lines
            )
        except Exception as e:
            print(f"[PaddleOCREngine] Error processing image for page {page_num}: {e}")
            return PageOCRResult(
                page=page_num,
                text="",
                confidence=0.0,
                word_count=0,
                lines=[]
            )

    def process_file(self, file_path: str) -> List[PageOCRResult]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        results: List[PageOCRResult] = []

        # 1. Handle PDF
        if PDFProcessor.is_pdf(file_path):
            # First attempt digital text extraction (fast & 100% accurate for digital PDFs)
            digital_pages = PDFProcessor.extract_text_pypdf(file_path)
            has_digital_text = any(len(text) > 20 for _, text in digital_pages)

            if has_digital_text:
                for page_num, text in digital_pages:
                    cleaned = TextCleaner.clean_text(text)
                    results.append(PageOCRResult(
                        page=page_num,
                        text=cleaned,
                        confidence=0.98,  # Digital PDF text has high fidelity
                        word_count=len(cleaned.split()),
                        lines=[{"text": l, "confidence": 0.98} for l in cleaned.split("\n") if l]
                    ))
                return results

            # If scanned PDF (no digital text), convert pages to images
            images = PDFProcessor.convert_pdf_to_images(file_path)
            if images and self.is_available():
                for idx, img in enumerate(images):
                    res = self.process_image(img, page_num=idx + 1)
                    results.append(res)
                return results

            # If conversion was not possible but we got whatever text was there:
            for page_num, text in digital_pages:
                cleaned = TextCleaner.clean_text(text)
                results.append(PageOCRResult(
                    page=page_num,
                    text=cleaned,
                    confidence=0.5 if cleaned else 0.0,
                    word_count=len(cleaned.split()),
                    lines=[]
                ))
            return results

        # 2. Handle Image (JPG, PNG, etc.)
        try:
            img = Image.open(file_path)
            if self.is_available():
                results.append(self.process_image(img, page_num=1))
            else:
                # Fallback image handler: image metadata or basic notice
                results.append(PageOCRResult(
                    page=1,
                    text="",
                    confidence=0.0,
                    word_count=0,
                    lines=[]
                ))
        except Exception as e:
            print(f"[PaddleOCREngine] Failed to open image {file_path}: {e}")
            results.append(PageOCRResult(page=1, text="", confidence=0.0, word_count=0, lines=[]))

        return results
