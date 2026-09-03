import re

class TextCleaner:
    @staticmethod
    def clean_text(raw_text: str) -> str:
        if not raw_text:
            return ""
        # Normalize various unicode spaces and linebreaks
        text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace non-breaking spaces and zero-width spaces
        text = re.sub(r"[\u200B-\u200D\uFEFF\u00A0]", " ", text)
        # Normalize dashes/hyphens
        text = re.sub(r"[\u2010-\u2015\u2212]", "-", text)
        # Normalize quotes
        text = re.sub(r"[\u2018\u2019\u201B]", "'", text)
        text = re.sub(r"[\u201C\u201D\u201F]", '"', text)
        # Strip excessive inline spaces (more than 2 to single space, but keep newlines)
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
        # Remove multiple empty lines
        cleaned_lines = []
        last_empty = False
        for line in lines:
            if line:
                cleaned_lines.append(line)
                last_empty = False
            elif not last_empty:
                cleaned_lines.append("")
                last_empty = True
        return "\n".join(cleaned_lines).strip()

    @staticmethod
    def sanitize_for_logging(text: str) -> str:
        """Sanitize text for safe logging without leaking sensitive document content."""
        if not text:
            return "<empty>"
        length = len(text)
        words = len(text.split())
        return f"<text content: {length} chars, {words} words>"
