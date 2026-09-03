import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

  if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
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
