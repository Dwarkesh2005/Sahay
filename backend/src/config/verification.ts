import path from 'path';

export const FIELD_WEIGHTS: Record<string, number> = {
  registration_number: 30,
  pan: 25,
  organization_name: 20,
  address: 10,
  email: 5,
  phone: 5,
  other: 5,
};

export const SCORE_THRESHOLDS = {
  STRONG: 95, // 95–100 → Strong Consistency
  GOOD: 80,   // 80–94  → Good Consistency
  REVIEW: 60, // 60–79  → Needs Review
  // 0–59  → Significant Mismatch
};

export const FIELD_IMPORTANCE: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
  registration_number: 'HIGH',
  pan: 'HIGH',
  organization_name: 'HIGH',
  address: 'MEDIUM',
  phone: 'MEDIUM',
  email: 'MEDIUM',
  website: 'LOW',
  description: 'LOW',
};

export const FUZZY_THRESHOLDS = {
  MATCH: 90,
  PARTIAL: 70,
};

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png'],
  UPLOAD_DIR: path.join(process.cwd(), 'uploads', 'verification'),
  SIGNED_URL_EXPIRY_SECONDS: 900, // 15 minutes
};

export const OCR_CONFIG = {
  SERVICE_URL: process.env.OCR_SERVICE_URL || 'http://localhost:5001',
  TIMEOUT_MS: 120000, // 2 minutes
  MIN_CONFIDENCE: 0.50,
};
