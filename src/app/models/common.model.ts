// ============================================================================
// COMMON DOMAIN MODELS & ENUMS
// ============================================================================

export enum UserRole {
  Patient = 'Patient',
  Doctor = 'Doctor',
  Admin = 'Admin',
  HelpDesk = 'HelpDesk'
}

export enum Status {
  Online = 'Online',
  Busy = 'Busy',
  Offline = 'Offline',
  Not_Available = 'Not_Available'
}

export enum AppointmentStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  NotAttended = 'NotAttended',
  Cancelled = 'Cancelled'
}

export enum AdminApproval {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  NotApproved = 2  // Alias for Rejected to maintain backward compatibility
}

export enum ShiftTime {
  Morning = 0,
  Afternoon = 1,
  Evening = 2,
  Night = 3,
  NotAllocated = -1  // For employees without assigned shift
}

export enum Specialization {
  Cardiologist = 'Cardiologist',
  Dermatologist = 'Dermatologist',
  Gynecologist = 'Gynecologist',
  Pediatrician = 'Pediatrician',
  Neurologist = 'Neurologist',
  Orthopedic = 'Orthopedic',
  Psychiatrist = 'Psychiatrist',
  Ophthalmologist = 'Ophthalmologist',
  ENT = 'ENT',
  Urologist = 'Urologist',
  Gastroenterologist = 'Gastroenterologist',
  Pulmonologist = 'Pulmonologist'
}

export interface BaseUser {
  userId?: number;
  userName?: string;
  email: string;
  role: UserRole | string;
  phoneNumber?: string;
  createdAt?: string;
} 