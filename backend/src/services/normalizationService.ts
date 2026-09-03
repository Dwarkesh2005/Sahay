export class NormalizationService {
  /**
   * Normalizes an organization name for intelligent comparison.
   */
  public static normalizeOrgName(name: string | null | undefined): string {
    if (!name) return '';
    let normalized = name.toLowerCase().trim();

    // Replace '&' with 'and'
    normalized = normalized.replace(/&/g, ' and ');

    // Normalize common legal suffixes and abbreviations
    normalized = normalized
      .replace(/\bpvt\.?\b/g, 'private')
      .replace(/\bltd\.?\b/g, 'limited')
      .replace(/\bsoc\.?\b/g, 'society')
      .replace(/\binst\.?\b/g, 'institution')
      .replace(/\bfdn\.?\b/g, 'foundation')
      .replace(/\bassoc\.?\b/g, 'association')
      .replace(/\bdept\.?\b/g, 'department')
      .replace(/\bgov\.?\b/g, 'government')
      .replace(/\bgovt\.?\b/g, 'government')
      .replace(/\bco\.?\b/g, 'company');

    // Remove punctuation
    normalized = normalized.replace(/[.,\/#!$%\^*;:{}=\-_`~()]/g, ' ');

    // Collapse multiple whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Normalizes a PAN identifier: uppercase, alphanumeric only, strictly trimmed.
   */
  public static normalizePan(pan: string | null | undefined): string {
    if (!pan) return '';
    return pan.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  }

  /**
   * Normalizes an official Registration Number: uppercase, collapse punctuation/spaces.
   */
  public static normalizeRegistrationNumber(regNum: string | null | undefined): string {
    if (!regNum) return '';
    return regNum
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9\/\-_]/g, '')
      .trim();
  }

  /**
   * Normalizes an Indian phone number to standard 10 digits.
   */
  public static normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    // Strip all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // If starts with 91 and has 12 digits, strip 91
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    // If starts with 0 and has 11 digits, strip 0
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    // Return last 10 digits if at least 10 digits exist
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  /**
   * Normalizes an email address: lowercase and whitespace-trimmed.
   */
  public static normalizeEmail(email: string | null | undefined): string {
    if (!email) return '';
    return email.toLowerCase().trim();
  }

  /**
   * Normalizes an address without aggressive distortion of meaning.
   */
  public static normalizeAddress(address: string | null | undefined): string {
    if (!address) return '';
    let normalized = address.toLowerCase().trim();

    // Standardize common road/unit terms
    normalized = normalized
      .replace(/\brd\.?\b/g, 'road')
      .replace(/\bst\.?\b/g, 'street')
      .replace(/\bave\.?\b/g, 'avenue')
      .replace(/\bflr\.?\b/g, 'floor')
      .replace(/\bapt\.?\b/g, 'apartment')
      .replace(/\boff\.?\b/g, 'office')
      .replace(/\bbldg\.?\b/g, 'building')
      .replace(/\bhwy\.?\b/g, 'highway')
      .replace(/\bnr\.?\b/g, 'near')
      .replace(/\bopp\.?\b/g, 'opposite');

    // Remove punctuation, retain alphanumeric and spaces
    normalized = normalized.replace(/[.,\/#!$%\^*;:{}=\-_`~()]/g, ' ');

    // Collapse whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }
}
