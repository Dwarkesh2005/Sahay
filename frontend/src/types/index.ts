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
  ngo_darpan_id?: string;
  contact_person: string;
  phone_number?: string;
  email?: string;
  website?: string;
  city_id: number;
  address: string;
  latitude?: number;
  longitude?: number;
  verification_status: VerificationStatus;
  description?: string;
  created_at: string;
  updated_at: string;
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
