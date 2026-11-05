import re
from typing import Dict, List, Optional
from models.extraction import ExtractedField, PageOCRResult

class FieldExtractor:
    PAN_REGEX = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", re.IGNORECASE)
    EMAIL_REGEX = re.compile(r"\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b")
    PHONE_REGEX = re.compile(r"(?:\+91[\s-]?)?(?:[0]?[6-9]\d{9})\b")
    PINCODE_REGEX = re.compile(r"\b([1-9][0-9]{5})\b")

    REGISTRATION_PREFIXES = [
        r"(?:Registration|Register|Regd\.?|Reg\.?|Society|Trust|CIN|DARPAN)[\s\-_]*(?:No\.?|Number|ID|Code|#)[\s:]+([A-Z0-9\/\-_]+)",
        r"(?:Certificate)[\s\-_]+(?:No\.?|Number|ID|#)[\s:]+([A-Z0-9\/\-_]+)",
        r"(?:Book[\s\-_]*No\.?)[\s:]+([A-Z0-9\/\-_]+)",
        r"(?:Registration[\s\-_]*Details?[\s:]+)([A-Z0-9\/\-_]+)",
    ]

    ORG_PREFIXES = [
        r"(?:Name\s+of\s+(?:the\s+)?(?:Trust|Society|Organization|Company|NGO|Association|Foundation|Institution))[\s:]+([^\n]+)",
        r"(?:Organization\s+Name|NGO\s+Name|Company\s+Name)[\s:]+([^\n]+)",
        r"(?:This\s+is\s+to\s+certify\s+that)[\s:]+([^\n]+)",
    ]

    ADDRESS_PREFIXES = [
        r"(?:Registered\s+Office(?:\s+Address)?|Office\s+Address|Address|Location)[\s:]+([^\n]+(?:\n[^\n]+){0,2})",
        r"(?:Situated\s+at|Located\s+at)[\s:]+([^\n]+(?:\n[^\n]+){0,2})",
    ]

    @classmethod
    def extract_fields(cls, pages: List[PageOCRResult], document_type: str) -> Dict[str, ExtractedField]:
        fields: Dict[str, ExtractedField] = {}
        if not pages:
            return fields

        full_text_by_page = {p.page: p.text for p in pages}
        combined_text = "\n".join([f"--- Page {p.page} ---\n" + p.text for p in pages])

        # 1. Extract PAN
        pan_field = cls._extract_pan(pages)
        if pan_field:
            fields["pan"] = pan_field

        # 2. Extract Registration Number
        reg_field = cls._extract_registration_number(pages, document_type)
        if reg_field:
            fields["registration_number"] = reg_field

        # 3. Extract Organization Name
        name_field = cls._extract_organization_name(pages, document_type)
        if name_field:
            fields["organization_name"] = name_field

        # 4. Extract Address
        addr_field = cls._extract_address(pages)
        if addr_field:
            fields["address"] = addr_field

        # 5. Extract Email
        email_field = cls._extract_email(pages)
        if email_field:
            fields["email"] = email_field

        # 6. Extract Phone
        phone_field = cls._extract_phone(pages)
        if phone_field:
            fields["phone"] = phone_field

        return fields

    @classmethod
    def _extract_pan(cls, pages: List[PageOCRResult]) -> Optional[ExtractedField]:
        for page in pages:
            # Check for explicitly labeled PAN first: "PAN: ABCDE1234F" or "Permanent Account Number: ABCDE1234F"
            labeled_match = re.search(r"(?:PAN|Permanent\s+Account\s+Number)[\s\-_:]*([A-Z]{5}[0-9]{4}[A-Z])\b", page.text, re.IGNORECASE)
            if labeled_match:
                val = labeled_match.group(1).upper()
                return ExtractedField(
                    field_name="pan",
                    value=val,
                    confidence=min(0.99, page.confidence + 0.05),
                    page=page.page,
                    raw_snippet=labeled_match.group(0)
                )

            # Standalone regex search
            match = cls.PAN_REGEX.search(page.text)
            if match:
                val = match.group(1).upper()
                return ExtractedField(
                    field_name="pan",
                    value=val,
                    confidence=page.confidence,
                    page=page.page,
                    raw_snippet=match.group(0)
                )
        return None

    @classmethod
    def _extract_registration_number(cls, pages: List[PageOCRResult], document_type: str) -> Optional[ExtractedField]:
        for page in pages:
            lines = page.text.split("\n")
            for pattern in cls.REGISTRATION_PREFIXES:
                match = re.search(pattern, page.text, re.IGNORECASE)
                if match:
                    raw_val = match.group(1).strip()
                    # Filter out garbage matches (e.g. single chars or pure punctuation)
                    clean_val = re.sub(r"[,\.;:]$", "", raw_val).strip()
                    if len(clean_val) >= 3:
                        return ExtractedField(
                            field_name="registration_number",
                            value=clean_val,
                            confidence=min(0.98, page.confidence + 0.04),
                            page=page.page,
                            raw_snippet=match.group(0)
                        )

            # If document type is REGISTRATION_CERTIFICATE and line has "REG" / numbers
            for line in lines:
                if re.search(r"\b(?:REG|F|S|ACT|CIN|MAH|GUJ|DL|UP)[\/-]?\d{3,}\b", line, re.IGNORECASE):
                    m = re.search(r"\b([A-Z0-9\/\-_]{4,25})\b", line)
                    if m and any(char.isdigit() for char in m.group(1)):
                        return ExtractedField(
                            field_name="registration_number",
                            value=m.group(1).strip(),
                            confidence=max(0.75, page.confidence - 0.1),
                            page=page.page,
                            raw_snippet=line
                        )
        return None

    @classmethod
    def _extract_organization_name(cls, pages: List[PageOCRResult], document_type: str) -> Optional[ExtractedField]:
        if not pages:
            return None
        page = pages[0]  # Name is almost always on first page

        # Explicit labeled pattern
        for pattern in cls.ORG_PREFIXES:
            match = re.search(pattern, page.text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean trailing noise
                name = re.sub(r"[\.,;:].*$", "", name).strip()
                if len(name) > 3 and not name.lower().startswith("registration"):
                    return ExtractedField(
                        field_name="organization_name",
                        value=name,
                        confidence=min(0.96, page.confidence + 0.05),
                        page=page.page,
                        raw_snippet=match.group(0)
                    )

        # Look for prominent headers containing common NGO terms
        ngo_keywords = ["foundation", "trust", "society", "samiti", "mandla", "seva", "mission", "association", "ngo", "kalyan", "charitable"]
        lines = page.text.split("\n")
        for line in lines[:10]: # Check top 10 lines of document
            line_str = line.strip()
            if len(line_str) >= 4 and len(line_str) <= 120:
                lower = line_str.lower()
                if any(kw in lower for kw in ngo_keywords):
                    # Clean unwanted prefix words
                    clean_line = re.sub(r"^(?:Certificate of Registration of|Registration of|Welcome to|Government of [^,\n]+|Govt of [^,\n]+)[\s:]*", "", line_str, flags=re.IGNORECASE).strip()
                    if len(clean_line) > 3:
                        return ExtractedField(
                            field_name="organization_name",
                            value=clean_line,
                            confidence=page.confidence,
                            page=page.page,
                            raw_snippet=line
                        )

        # Fallback to the first non-trivial line in top 4 lines
        for line in lines[:4]:
            line_clean = line.strip()
            if len(line_clean) > 5 and not any(skip in line_clean.lower() for skip in ["government", "certificate", "form", "department", "act", "section"]):
                return ExtractedField(
                    field_name="organization_name",
                    value=line_clean,
                    confidence=max(0.65, page.confidence - 0.2),
                    page=page.page,
                    raw_snippet=line
                )
        return None

    @classmethod
    def _extract_address(cls, pages: List[PageOCRResult]) -> Optional[ExtractedField]:
        for page in pages:
            # Labeled address
            for pattern in cls.ADDRESS_PREFIXES:
                match = re.search(pattern, page.text, re.IGNORECASE)
                if match:
                    raw_addr = " ".join(match.group(1).split())
                    raw_addr = re.sub(r"\s+", " ", raw_addr).strip()
                    raw_addr = re.sub(r"^.*?(?:Registered\s+Office\s+Address|Office\s+Address|Registered\s+Office|Address|Location)[\s:]*", "", raw_addr, flags=re.IGNORECASE).strip()
                    raw_addr = re.sub(r"^(?:Address|Location)[\s:]*", "", raw_addr, flags=re.IGNORECASE).strip()
                    if len(raw_addr) > 5:
                        return ExtractedField(
                            field_name="address",
                            value=raw_addr,
                            confidence=min(0.94, page.confidence + 0.02),
                            page=page.page,
                            raw_snippet=match.group(0)
                        )

            # Lines containing pincode
            lines = page.text.split("\n")
            for i, line in enumerate(lines):
                if cls.PINCODE_REGEX.search(line):
                    # Combine with previous line if short
                    addr_parts = []
                    if i > 0 and len(lines[i-1].strip()) > 3 and not re.search(r"(?:name|registration|pan)", lines[i-1], re.IGNORECASE):
                        addr_parts.append(lines[i-1].strip())
                    addr_parts.append(line.strip())
                    addr_str = ", ".join(addr_parts)
                    return ExtractedField(
                        field_name="address",
                        value=addr_str,
                        confidence=max(0.80, page.confidence - 0.05),
                        page=page.page,
                        raw_snippet=addr_str
                    )
        return None

    @classmethod
    def _extract_email(cls, pages: List[PageOCRResult]) -> Optional[ExtractedField]:
        for page in pages:
            m = cls.EMAIL_REGEX.search(page.text)
            if m:
                return ExtractedField(
                    field_name="email",
                    value=m.group(1).lower().strip(),
                    confidence=0.98,
                    page=page.page,
                    raw_snippet=m.group(0)
                )
        return None

    @classmethod
    def _extract_phone(cls, pages: List[PageOCRResult]) -> Optional[ExtractedField]:
        for page in pages:
            m = cls.PHONE_REGEX.search(page.text)
            if m:
                # clean to digits
                digits = re.sub(r"\D", "", m.group(0))
                if len(digits) >= 10:
                    clean_phone = digits[-10:]
                    return ExtractedField(
                        field_name="phone",
                        value=clean_phone,
                        confidence=0.92,
                        page=page.page,
                        raw_snippet=m.group(0)
                    )
        return None
