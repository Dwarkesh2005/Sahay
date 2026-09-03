import { match_result } from '@prisma/client';
import { NormalizationService } from './normalizationService';
import { OCR_CONFIG, FUZZY_THRESHOLDS } from '../config/verification';

export interface FieldComparisonInput {
  fieldName: string;
  submittedValue: string | null | undefined;
  extractedValue: string | null | undefined;
  ocrConfidence?: number;
}

export interface FieldComparisonResult {
  fieldName: string;
  submittedValue: string | null;
  extractedValue: string | null;
  normalizedSubmitted: string | null;
  normalizedExtracted: string | null;
  result: match_result;
  confidence: number;
  matchScore: number; // 0 to 100
  notes: string;
}

export class MatchingService {
  /**
   * Compares an NGO-submitted value against a document-extracted value.
   */
  public static async compareField(input: FieldComparisonInput): Promise<FieldComparisonResult> {
    const { fieldName, submittedValue, extractedValue, ocrConfidence = 1.0 } = input;

    const sub = submittedValue?.trim() || null;
    const ext = extractedValue?.trim() || null;

    // Both missing
    if (!sub && !ext) {
      return {
        fieldName,
        submittedValue: null,
        extractedValue: null,
        normalizedSubmitted: null,
        normalizedExtracted: null,
        result: 'NOT_APPLICABLE',
        confidence: 1.0,
        matchScore: 100,
        notes: 'Field not applicable or not submitted by NGO.',
      };
    }

    // Submitted but not found in document
    if (sub && !ext) {
      return {
        fieldName,
        submittedValue: sub,
        extractedValue: null,
        normalizedSubmitted: sub,
        normalizedExtracted: null,
        result: 'NOT_FOUND',
        confidence: 0.0,
        matchScore: 0,
        notes: 'Submitted value not detected in uploaded document.',
      };
    }

    // Extracted but NGO didn't provide it
    if (!sub && ext) {
      return {
        fieldName,
        submittedValue: null,
        extractedValue: ext,
        normalizedSubmitted: null,
        normalizedExtracted: ext,
        result: 'NOT_APPLICABLE',
        confidence: ocrConfidence,
        matchScore: 100,
        notes: 'Document contains field but NGO did not provide this in initial profile.',
      };
    }

    // Check low OCR confidence
    if (ocrConfidence < OCR_CONFIG.MIN_CONFIDENCE) {
      return {
        fieldName,
        submittedValue: sub,
        extractedValue: ext,
        normalizedSubmitted: sub,
        normalizedExtracted: ext,
        result: 'LOW_CONFIDENCE',
        confidence: ocrConfidence,
        matchScore: 50,
        notes: `OCR confidence (${Math.round(ocrConfidence * 100)}%) is below threshold. Manual verification required.`,
      };
    }

    // Compare based on field rules
    switch (fieldName) {
      case 'pan':
        return this.comparePan(sub!, ext!, ocrConfidence);

      case 'registration_number':
        return this.compareRegistrationNumber(sub!, ext!, ocrConfidence);

      case 'organization_name':
        return await this.compareOrgName(sub!, ext!, ocrConfidence);

      case 'address':
        return await this.compareAddress(sub!, ext!, ocrConfidence);

      case 'phone':
        return this.comparePhone(sub!, ext!, ocrConfidence);

      case 'email':
        return this.compareEmail(sub!, ext!, ocrConfidence);

      default:
        return this.compareGeneric(fieldName, sub!, ext!, ocrConfidence);
    }
  }

  /**
   * PAN: Exact normalized match ONLY. Never fuzzy match.
   */
  private static comparePan(sub: string, ext: string, ocrConfidence: number): FieldComparisonResult {
    const normSub = NormalizationService.normalizePan(sub);
    const normExt = NormalizationService.normalizePan(ext);

    const isMatch = normSub.length > 0 && normSub === normExt;

    return {
      fieldName: 'pan',
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: normSub,
      normalizedExtracted: normExt,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      confidence: ocrConfidence,
      matchScore: isMatch ? 100 : 0,
      notes: isMatch
        ? 'PAN exact match verified.'
        : `PAN does not match: submitted '${normSub}' vs document '${normExt}'.`,
    };
  }

  /**
   * Registration Number: Exact normalized comparison.
   */
  private static compareRegistrationNumber(sub: string, ext: string, ocrConfidence: number): FieldComparisonResult {
    const normSub = NormalizationService.normalizeRegistrationNumber(sub);
    const normExt = NormalizationService.normalizeRegistrationNumber(ext);

    const isMatch = normSub.length > 0 && normSub === normExt;

    return {
      fieldName: 'registration_number',
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: normSub,
      normalizedExtracted: normExt,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      confidence: ocrConfidence,
      matchScore: isMatch ? 100 : 0,
      notes: isMatch
        ? 'Registration number exact match verified.'
        : `Registration number differs: submitted '${normSub}' vs document '${normExt}'.`,
    };
  }

  /**
   * Organization Name: Normalized string comparison with RapidFuzz support.
   */
  private static async compareOrgName(sub: string, ext: string, ocrConfidence: number): Promise<FieldComparisonResult> {
    const normSub = NormalizationService.normalizeOrgName(sub);
    const normExt = NormalizationService.normalizeOrgName(ext);

    if (normSub === normExt) {
      return {
        fieldName: 'organization_name',
        submittedValue: sub,
        extractedValue: ext,
        normalizedSubmitted: normSub,
        normalizedExtracted: normExt,
        result: 'MATCH',
        confidence: ocrConfidence,
        matchScore: 100,
        notes: 'Organization name exact normalized match.',
      };
    }

    // Call RapidFuzz on OCR service or use local token comparison
    const score = await this.getFuzzyScore(normSub, normExt, 'organization_name');

    let result: match_result = 'MISMATCH';
    let notes = `Organization name does not match adequately (similarity: ${score}%).`;

    if (score >= FUZZY_THRESHOLDS.MATCH) {
      result = 'MATCH';
      notes = `Organization name matches with high similarity (${score}%).`;
    } else if (score >= FUZZY_THRESHOLDS.PARTIAL) {
      result = 'PARTIAL_MATCH';
      notes = `Organization name partially matches (${score}%). Review minor differences.`;
    }

    return {
      fieldName: 'organization_name',
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: normSub,
      normalizedExtracted: normExt,
      result,
      confidence: ocrConfidence,
      matchScore: score,
      notes,
    };
  }

  /**
   * Address: Token and substring similarity.
   */
  private static async compareAddress(sub: string, ext: string, ocrConfidence: number): Promise<FieldComparisonResult> {
    const normSub = NormalizationService.normalizeAddress(sub);
    const normExt = NormalizationService.normalizeAddress(ext);

    if (normSub === normExt) {
      return {
        fieldName: 'address',
        submittedValue: sub,
        extractedValue: ext,
        normalizedSubmitted: normSub,
        normalizedExtracted: normExt,
        result: 'MATCH',
        confidence: ocrConfidence,
        matchScore: 100,
        notes: 'Address exact normalized match.',
      };
    }

    const score = await this.getFuzzyScore(normSub, normExt, 'address');

    let result: match_result = 'MISMATCH';
    let notes = `Address differs significantly (similarity: ${score}%).`;

    if (score >= FUZZY_THRESHOLDS.MATCH) {
      result = 'MATCH';
      notes = `Address matches with high consistency (${score}%).`;
    } else if (score >= FUZZY_THRESHOLDS.PARTIAL) {
      result = 'PARTIAL_MATCH';
      notes = `Address partially matches (${score}%). Review details.`;
    }

    return {
      fieldName: 'address',
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: normSub,
      normalizedExtracted: normExt,
      result,
      confidence: ocrConfidence,
      matchScore: score,
      notes,
    };
  }

  /**
   * Phone: Normalized 10-digit exact comparison.
   */
  private static comparePhone(sub: string, ext: string, ocrConfidence: number): FieldComparisonResult {
    const normSub = NormalizationService.normalizePhone(sub);
    const normExt = NormalizationService.normalizePhone(ext);

    const isMatch = normSub.length >= 10 && normSub === normExt;

    return {
      fieldName: 'phone',
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: normSub,
      normalizedExtracted: normExt,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      confidence: ocrConfidence,
      matchScore: isMatch ? 100 : 0,
      notes: isMatch ? 'Phone number verified.' : 'Phone numbers do not match.',
    };
  }

  /**
   * Email: Lowercase exact comparison.
   */
  private static compareEmail(sub: string, ext: string, ocrConfidence: number): FieldComparisonResult {
    const normSub = NormalizationService.normalizeEmail(sub);
    const normExt = NormalizationService.normalizeEmail(ext);

    const isMatch = normSub.length > 0 && normSub === normExt;

    return {
      fieldName: 'email',
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: normSub,
      normalizedExtracted: normExt,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      confidence: ocrConfidence,
      matchScore: isMatch ? 100 : 0,
      notes: isMatch ? 'Email address verified.' : 'Email addresses do not match.',
    };
  }

  private static compareGeneric(field: string, sub: string, ext: string, ocrConfidence: number): FieldComparisonResult {
    const s1 = sub.toLowerCase().trim();
    const s2 = ext.toLowerCase().trim();
    const isMatch = s1 === s2;

    return {
      fieldName: field,
      submittedValue: sub,
      extractedValue: ext,
      normalizedSubmitted: s1,
      normalizedExtracted: s2,
      result: isMatch ? 'MATCH' : 'MISMATCH',
      confidence: ocrConfidence,
      matchScore: isMatch ? 100 : 0,
      notes: isMatch ? `${field} matches.` : `${field} does not match.`,
    };
  }

  /**
   * Computes fuzzy score via OCR service (RapidFuzz) with a local token-set fallback.
   */
  private static async getFuzzyScore(text1: string, text2: string, fieldType: string): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${OCR_CONFIG.SERVICE_URL}/fuzzy-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text1, text2, field_type: fieldType }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        return typeof data.combined_score === 'number' ? data.combined_score : 0;
      }
    } catch {
      // Fallback: local token overlap computation
    }

    return this.localTokenOverlap(text1, text2);
  }

  /**
   * Local token overlap calculation as fallback when OCR service is temporarily offline.
   */
  public static localTokenOverlap(s1: string, s2: string): number {
    const t1 = new Set(s1.split(/\s+/).filter(Boolean));
    const t2 = new Set(s2.split(/\s+/).filter(Boolean));

    if (t1.size === 0 || t2.size === 0) return 0;

    let intersection = 0;
    for (const word of t1) {
      if (t2.has(word)) intersection++;
    }

    const union = new Set([...t1, ...t2]).size;
    const jaccard = (intersection / union) * 100;
    return Math.round(jaccard);
  }
}
