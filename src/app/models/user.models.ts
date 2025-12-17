// UserRole enum definition
export enum UserRole {
  Patient = 'Patient',
  Doctor = 'Doctor',
  Admin = 'Admin',
  HelpDesk = 'HelpDesk'
}

export interface User {
  userId?: number;
  userName?: string;
  name?: string; // For compatibility with auth service
  email?: string;
  role?: string;
  isApprovedByAdmin?: number; // AdminApproval enum: 0=Pending, 1=Approved, 2=Rejected
  phoneNumber?: number | string;
  emergencyContactName?: string;
  emergencyContactPhoneNumber?: string;
  emergencyContact?: string; // For compatibility with auth service
  emergencyContactRelationship?: string; // For compatibility with auth service
  dateOfBirth?: string;
  gender?: string;
  address?: string; // For compatibility with auth service
  medicalHistory?: string; // For compatibility with auth service
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  consultantFees?: number;
  languages?: string[];
  createdAt?: string;
  avatar?: string; // For compatibility with auth service
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  user?: User;
  success?: boolean;
  message?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
} 