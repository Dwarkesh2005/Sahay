export type UserRole = 'MIGRANT' | 'VOLUNTEER' | 'NGO' | 'ADMIN';

export type VerificationStatus =
  | 'PENDING'
  | 'GOVERNMENT_VERIFIED'
  | 'CONTACT_VERIFIED'
  | 'MANUALLY_VERIFIED';

export type RequestType = 'FOOD' | 'SHELTER' | 'MEDICAL' | 'EMPLOYMENT' | 'GUIDANCE';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

export type ResponseStatus = 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED';

export type ServiceType =
  | 'FOOD'
  | 'SHELTER'
  | 'MEDICAL'
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'LEGAL'
  | 'GUIDANCE'
  | 'OTHER';

export interface City {
  city_id: number;
  city_name: string;
  district: string;
  state: string;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  role: UserRole;
  city_id?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  profile_photo?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface NGO {
  ngo_id: number;
  user_id: number;
  ngo_name: string;
  registration_number?: string;
  pan?: string;
  ngo_darpan_id?: string;
  contact_person: string;
  phone_number?: string;
  email?: string;
  website?: string;
  city_id: number;
  city?: City;
  cities?: City;
  address: string;
  latitude?: number;
  longitude?: number;
  verification_status: VerificationStatus;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type DocVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'DOCUMENTS_REQUIRED'
  | 'DOCUMENTS_UPLOADED'
  | 'PROCESSING'
  | 'PROCESSING_FAILED'
  | 'AUTO_REVIEW_READY'
  | 'NEEDS_ADMIN_REVIEW'
  | 'NEEDS_CORRECTION'
  | 'APPROVED'
  | 'REJECTED';

export type DocumentType =
  | 'REGISTRATION_CERTIFICATE'
  | 'PAN_DOCUMENT'
  | 'TRUST_REGISTRATION'
  | 'SOCIETY_REGISTRATION'
  | 'SECTION_8_CERTIFICATE'
  | 'TWELVE_A_CERTIFICATE'
  | 'EIGHTY_G_CERTIFICATE'
  | 'ADDRESS_PROOF'
  | 'AUTHORIZED_REPRESENTATIVE_PROOF'
  | 'OTHER';

export type DocumentStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED';

export type MatchResult =
  | 'MATCH'
  | 'PARTIAL_MATCH'
  | 'MISMATCH'
  | 'NOT_FOUND'
  | 'NOT_APPLICABLE'
  | 'LOW_CONFIDENCE';

export interface NGOVerificationDocument {
  document_id: number;
  verification_id: number;
  ngo_id: number;
  document_type: DocumentType;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  version: number;
  is_active: boolean;
  status: DocumentStatus;
  ocr_confidence?: number;
  ocr_raw_text?: string;
  quality_score?: number;
  quality_issues?: string;
  processing_error?: string;
  created_at: string;
}

export interface NGOVerificationField {
  field_id: number;
  verification_id: number;
  document_id?: number;
  field_name: string;
  submitted_value?: string;
  extracted_value?: string;
  normalized_submitted?: string;
  normalized_extracted?: string;
  match_result: MatchResult;
  confidence?: number;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  source_page?: number;
  extraction_notes?: string;
  created_at: string;
}

export interface NGOVerificationIssue {
  issue_id: number;
  verification_id: number;
  document_id?: number;
  issue_type: string;
  severity: string;
  description: string;
  field_name?: string;
  created_at: string;
}

export interface NGOVerificationAuditLog {
  log_id: number;
  verification_id: number;
  ngo_id: number;
  admin_id?: number;
  action: string;
  previous_status?: string;
  new_status?: string;
  reason?: string;
  screening_score?: number;
  metadata?: any;
  created_at: string;
}

export interface NGODocVerification {
  verification_id: number;
  ngo_id: number;
  status: DocVerificationStatus;
  screening_score?: number;
  total_matches: number;
  total_mismatches: number;
  total_not_found: number;
  ocr_confidence_avg?: number;
  admin_notes?: string;
  submitted_at?: string;
  processed_at?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  created_at: string;
  updated_at: string;
  documents?: NGOVerificationDocument[];
  fields?: NGOVerificationField[];
  issues?: NGOVerificationIssue[];
  audit_logs?: NGOVerificationAuditLog[];
  ngos?: NGO;
}

export interface NGOService {
  service_id: number;
  ngo_id: number;
  service: ServiceType;
}

export interface HelpRequest {
  request_id: number;
  user_id: number;
  request_type: RequestType;
  title: string;
  description: string;
  city_id: number;
  latitude?: number;
  longitude?: number;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  // Included relations for UI convenience
  user?: User;
  city?: City;
  responses_count?: number;
}

export interface RequestResponse {
  response_id: number;
  request_id: number;
  responder_id: number;
  response_message: string;
  response_time: string;
  status: ResponseStatus;
  responder?: User;
}

export interface Chat {
  chat_id: number;
  request_id: number;
  responder_id: number;
  created_at: string;
  help_request?: HelpRequest;
  responder?: User;
}

export interface Message {
  message_id: number;
  chat_id: number;
  sender_id: number;
  message: string;
  sent_at: string;
  is_read: boolean;
}
