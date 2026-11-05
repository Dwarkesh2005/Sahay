import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

import config
from services.ocr_engine import PaddleOCREngine
from services.field_extractor import FieldExtractor
from services.text_cleaner import TextCleaner
from models.extraction import DocumentProcessResult

app = Flask(__name__)
CORS(app)

# Global engine instance
ocr_engine = PaddleOCREngine()

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "SAHAY Python OCR Service",
        "engine": ocr_engine.get_engine_name(),
        "ocr_available": ocr_engine.is_available(),
        "paddle_available": ocr_engine.is_available(),
        "timestamp": time.time()
    }), 200

@app.route("/process-document", methods=["POST"])
def process_document():
    data = request.get_json(silent=True) or {}
    file_path = data.get("file_path")
    doc_type = data.get("document_type", "OTHER")
    doc_id = str(data.get("document_id", "unknown"))

    if not file_path:
        return jsonify({"success": False, "error": "file_path is required"}), 400

    if not os.path.exists(file_path):
        return jsonify({"success": False, "error": f"File does not exist: {file_path}"}), 404

    # Security check: Ensure file has an allowed extension
    _, ext = os.path.splitext(file_path)
    if ext.lower() not in config.ALLOWED_EXTENSIONS:
        return jsonify({"success": False, "error": f"Unsupported extension: {ext}"}), 400

    # Log safe event metadata without document text
    file_size_kb = round(os.path.getsize(file_path) / 1024, 2)
    print(f"[OCR-Service] Processing doc_id={doc_id}, type={doc_type}, size={file_size_kb}KB, ext={ext}")

    start_time = time.time()
    try:
        pages = ocr_engine.process_file(file_path)
        extracted_fields = FieldExtractor.extract_fields(pages, doc_type)

        # Calculate quality
        total_conf = sum(p.confidence for p in pages)
        avg_conf = (total_conf / len(pages)) if pages else 0.0
        total_words = sum(p.word_count for p in pages)

        quality_issues = []
        if avg_conf < config.MIN_CONFIDENCE_THRESHOLD and total_words > 0:
            quality_issues.append("OCR confidence is below recommended threshold. Please provide a clearer scan.")
        if total_words == 0:
            quality_issues.append("No text could be detected in this document. It may be empty or unreadable.")

        elapsed = round(time.time() - start_time, 2)
        print(f"[OCR-Service] Finished doc_id={doc_id} in {elapsed}s: {len(pages)} pages, {total_words} words, avg_conf={round(avg_conf, 2)}, {len(extracted_fields)} fields extracted.")

        result = DocumentProcessResult(
            success=True,
            document_id=doc_id,
            pages=pages,
            extracted_fields=extracted_fields,
            quality_score=round(avg_conf, 3),
            quality_issues=quality_issues,
            error=None
        )
        return jsonify(result.to_dict()), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[OCR-Service] Error processing doc_id={doc_id}: {e}")
        return jsonify({
            "success": False,
            "document_id": doc_id,
            "error": "Failed to process document due to internal extraction error.",
            "pages": [],
            "extracted_fields": {},
            "quality": {"overall_confidence": 0.0, "is_readable": False, "issues": ["Processing failed"]}
        }), 500

@app.route("/fuzzy-match", methods=["POST"])
def fuzzy_match():
    """
    Computes rapidfuzz similarity between two strings.
    Supports weighted token match for organization names and address match.
    """
    data = request.get_json(silent=True) or {}
    s1 = str(data.get("text1", "")).strip()
    s2 = str(data.get("text2", "")).strip()
    field_type = data.get("field_type", "text")

    if not s1 or not s2:
        return jsonify({
            "ratio": 0.0,
            "token_sort_ratio": 0.0,
            "token_set_ratio": 0.0,
            "combined_score": 0.0,
            "is_match": False,
            "is_partial": False
        }), 200

    try:
        from rapidfuzz import fuzz
        ratio = fuzz.ratio(s1, s2)
        token_sort = fuzz.token_sort_ratio(s1, s2)
        token_set = fuzz.token_set_ratio(s1, s2)
        partial_ratio = fuzz.partial_ratio(s1, s2)

        # For organization names: token_sort and token_set are especially effective
        # e.g. "ABC Foundation Pvt. Ltd." vs "ABC Foundation Private Limited"
        if field_type == "organization_name":
            combined = (token_sort * 0.45) + (token_set * 0.45) + (ratio * 0.10)
        elif field_type == "address":
            combined = (token_set * 0.60) + (partial_ratio * 0.40)
        else:
            combined = (ratio * 0.4) + (token_sort * 0.6)

        combined_score = round(combined, 2)
        return jsonify({
            "ratio": round(ratio, 2),
            "token_sort_ratio": round(token_sort, 2),
            "token_set_ratio": round(token_set, 2),
            "partial_ratio": round(partial_ratio, 2),
            "combined_score": combined_score,
            "is_match": combined_score >= 90.0,
            "is_partial": (combined_score >= 70.0 and combined_score < 90.0)
        }), 200

    except Exception as e:
        # Fallback if rapidfuzz has an issue
        print(f"[OCR-Service] Error in rapidfuzz match: {e}")
        return jsonify({
            "ratio": 100.0 if s1.lower() == s2.lower() else 0.0,
            "combined_score": 100.0 if s1.lower() == s2.lower() else 0.0,
            "is_match": s1.lower() == s2.lower(),
            "is_partial": False
        }), 200

if __name__ == "__main__":
    print(f"[SAHAY OCR Service] Starting server on port {config.PORT}...")
    app.run(host="0.0.0.0", port=config.PORT, debug=config.DEBUG)
