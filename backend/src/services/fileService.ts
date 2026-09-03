import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UPLOAD_CONFIG } from '../config/verification';

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_nature_secret_key_2026';

export interface SignedDocToken {
  documentId: number;
  ngoId: number;
  userId: number;
  role: string;
}

export class FileService {
  /**
   * Computes SHA-256 hash of file content for duplicate detection.
   */
  public static calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Generates a signed temporary view token for a document.
   */
  public static generateSignedDocToken(payload: SignedDocToken): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: UPLOAD_CONFIG.SIGNED_URL_EXPIRY_SECONDS,
    });
  }

  /**
   * Verifies a signed document token.
   */
  public static verifySignedDocToken(token: string): SignedDocToken | null {
    try {
      return jwt.verify(token, JWT_SECRET) as SignedDocToken;
    } catch {
      return null;
    }
  }

  /**
   * Safely deletes a file from disk if it exists.
   */
  public static deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`[FileService] Failed to delete file at ${filePath}:`, error);
    }
  }
}
