// Helpdesk Models for Hospital Management System

export interface HelpdeskAgent {
  agentId: number;
  agentName: string;
  email: string;
  phoneNumber: string;
  department: string;
  isActive: boolean;
  isAvailable: boolean;
  lastLoginTime?: Date;
  createdDate: Date;
}

export interface PatientDetails {
  userId: number;
  userName: string;
  email: string;
  phoneNumber: string;
  emergencyContactName?: string;
  emergencyContactPhoneNumber?: string;
  emergencyContactRelationship?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  medicalHistorySummary?: string;
  profileImageUrl?: string;
  
  // Additional properties for admin interface
  isActive?: boolean;
  registrationDate?: Date | string;
  totalAppointments?: number;
  totalPaidAmount?: number;
  totalPendingAmount?: number;
}

export interface DoctorDetails {
  userId: number;
  userName: string;
  email: string;
  phoneNumber: string;
  specialization: string;
  consultant_fees: number;
  shift: string;
  isActive: boolean;
  isAvailable: boolean;
  rating: number;
  image?: string;
  avatar?: string;
  
  // Additional properties for admin interface
  consultationFee?: number; // alias for consultant_fees
  qualification?: string;
  experience?: number;
  workingHours?: string;
  department?: string;
  totalAppointments?: number;
}

export enum PaymentStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Partial = 'Partial',
  Refunded = 'Refunded',
  Failed = 'Failed'
}

export enum AppointmentUrgency {
  Normal = 'Normal',
  Low = 'Low',
  High = 'High',
  Emergency = 'Emergency'
}

export interface PaymentDetails {
  paymentId: number;
  appointmentId: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number; // Changed from remainingAmount to match backend
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface PaymentCreationRequest {
  appointmentId: number;
  patientId: number;
  doctorId: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string; // Card, Cash, UPI, etc.
  
  // Optional fields that may not be used in all forms
  amount?: number;           // Optional legacy field
  transactionId?: string;    // Optional - not required for all payment methods
}

export interface AppointmentBookingRequest {
  patientId: number;
  doctorId: number;
  doctorName?: string; // Doctor name for the appointment
  patientEmail?: string; // Patient email for booking
  appointmentDate: string; // YYYY-MM-DD
  appointmentStartTime: string; // HH:mm:ss
  appointmentEndTime: string; // HH:mm:ss
  specialization: string;
  notes?: string;
  bookedByAgent: number; // Helpdesk agent ID
  urgency: AppointmentUrgency;
  filePath?: File; // Optional medical history file
}

export interface HelpdeskSearchResult<T> {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HelpdeskStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointmentsToday: number;
  totalPendingPayments: number;
  totalRevenue: number;
  activeAgents: number;
  emergencyAppointments: number;
} 