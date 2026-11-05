from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
import numpy as np

def to_serializable(val: Any) -> Any:
    if isinstance(val, (np.integer,)):
        return int(val)
    elif isinstance(val, (np.floating,)):
        return float(val)
    elif isinstance(val, np.ndarray):
        return val.tolist()
    elif isinstance(val, dict):
        return {k: to_serializable(v) for k, v in val.items()}
    elif isinstance(val, (list, tuple)):
        return [to_serializable(v) for v in val]
    return val

@dataclass
class ExtractedField:
    field_name: str
    value: str
    confidence: float
    page: int = 1
    raw_snippet: Optional[str] = None

@dataclass
class PageOCRResult:
    page: int
    text: str
    confidence: float
    word_count: int
    lines: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class DocumentProcessResult:
    success: bool
    document_id: str
    pages: List[PageOCRResult] = field(default_factory=list)
    extracted_fields: Dict[str, ExtractedField] = field(default_factory=dict)
    quality_score: float = 1.0
    quality_issues: List[str] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "success": self.success,
            "document_id": self.document_id,
            "pages": [
                {
                    "page": int(p.page),
                    "text": p.text,
                    "confidence": float(p.confidence),
                    "word_count": int(p.word_count),
                    "lines": p.lines
                }
                for p in self.pages
            ],
            "extracted_fields": {
                k: {
                    "field_name": v.field_name,
                    "value": v.value,
                    "confidence": float(v.confidence),
                    "page": int(v.page),
                    "raw_snippet": v.raw_snippet
                }
                for k, v in self.extracted_fields.items()
            },
            "quality": {
                "overall_confidence": float(self.quality_score),
                "is_readable": self.quality_score >= 0.5,
                "issues": self.quality_issues
            },
            "error": self.error
        }
        return to_serializable(data)
