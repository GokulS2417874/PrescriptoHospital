// ============================================================================
// PATIENT DOMAIN MODELS
// ============================================================================

import { UserRole } from './common.model';

export interface Patient {
  userId: number;
  userName: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt?: string;
}

// ============================================================================
// PATIENT REQUEST/RESPONSE DTOs
// ============================================================================

export interface PatientSearchRequest {
  name?: string;
  id?: number;
}

export interface PatientCountResponse {
  count: number;
} 