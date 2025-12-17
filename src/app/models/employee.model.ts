// ============================================================================
// EMPLOYEE DOMAIN MODELS (Like Employee DTOs in Backend)
// ============================================================================

import { AdminApproval, ShiftTime, UserRole } from './common.model';

export interface Employee {
  userId: number;
  userName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  isApprovedByAdmin: AdminApproval;
  shift: ShiftTime;
  createdAt: string;
  emergencyContactName?: string;
  emergencyContactPhoneNumber?: string;
  emergencyContactRelationship?: string;
  dateOfBirth?: string;
  gender?: string;
  consultantFees?: number;
  languages?: string; // For HelpDesk staff
}

// ============================================================================
// DOCTOR-SPECIFIC MODEL
// ============================================================================

export interface EmployeeDoctor extends Employee {
  specialization: string;
  qualification: string;
  experienceYears: number;
  role: 'Doctor';
}

// ============================================================================
// HELPDESK-SPECIFIC MODEL
// ============================================================================

export interface HelpDesk extends Employee {
  languages: string;
  qualification: string;
  role: 'HelpDesk';
}

// ============================================================================
// EMPLOYEE REQUEST/RESPONSE DTOs
// ============================================================================

export interface CreateEmployeeRequest {
  userName: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  emergencyContactName?: string;
  emergencyContactPhoneNumber?: string;
  emergencyContactRelationship?: string;
  dateOfBirth?: string;
  gender?: string;
  consultantFees?: number;
  languages?: string; // For HelpDesk staff
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  userId: number;
}

export interface EmployeeApprovalRequest {
  userId: number;
  approvalStatus: AdminApproval;
  rejectionReason?: string;
}

export interface EmployeeShiftRequest {
  userId: number;
  shift: ShiftTime;
}

// ============================================================================
// EMPLOYEE FILTER/SEARCH DTOs
// ============================================================================

export interface EmployeeFilter {
  role?: UserRole;
  approvalStatus?: AdminApproval;
  shift?: ShiftTime;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface EmployeeStatistics {
  totalEmployees: number;
  pendingApprovals: number;
  approvedEmployees: number;
  rejectedEmployees: number;
  shiftNotAllocated: number;
  byRole: {
    doctors: number;
    helpDesk: number;
    nurses: number;
  };
} 