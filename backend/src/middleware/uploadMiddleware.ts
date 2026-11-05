import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_CONFIG } from '../config/verification';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_CONFIG.UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_CONFIG.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_CONFIG.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension '${ext}'. Allowed: ${UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`));
  }

  // Permissive check for common binary wrappers (e.g. Postman sending application/octet-stream)
  const allowedMime = [
    ...UPLOAD_CONFIG.ALLOWED_MIME_TYPES,
    'application/octet-stream',
    'application/x-pdf',
    'image/pjpeg',
  ];

  if (!allowedMime.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type '${file.mimetype}'. Allowed: ${UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`));
  }

  cb(null, true);
};

export const uploadVerificationDoc = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Flexible middleware that accepts any field name (e.g. 'document', 'file', 'doc')
 * and normalizes the primary uploaded file onto req.file.
 */
export const handleVerificationDocumentUpload = (req: Request, res: Response, next: NextFunction): void => {
  uploadVerificationDoc.any()(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ error: err.message || 'File upload failed' });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 0) {
      req.file =
        files.find((f) => f.fieldname === 'document') ||
        files.find((f) => f.fieldname === 'file') ||
        files.find((f) => f.fieldname === 'doc') ||
        files[0];
    }

    next();
  });
};

