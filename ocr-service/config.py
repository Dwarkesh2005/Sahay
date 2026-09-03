import os

PORT = int(os.environ.get("OCR_PORT", 5001))
DEBUG = os.environ.get("FLASK_ENV", "development") == "development"
MIN_CONFIDENCE_THRESHOLD = float(os.environ.get("MIN_CONFIDENCE_THRESHOLD", 0.5))
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB limit
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
USE_PADDLE_FALLBACK = os.environ.get("USE_PADDLE_FALLBACK", "true").lower() == "true"
