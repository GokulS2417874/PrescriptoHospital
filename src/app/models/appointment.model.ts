// ============================================================================
// APPOINTMENT DOMAIN MODELS (Like Appointment DTOs in Backend)
// ============================================================================

export interface Appointment {
  appointmentId: number;
  appointmentDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  appointmentStatus: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  specialization: string;
  isReminderSent: boolean;
  paymentInfo?: PaymentInfo;
}

// ============================================================================
// PAYMENT INFO INTERFACE
// ============================================================================

export interface PaymentInfo {
  paymentId: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentDate: string;
  paymentMethod: number;
  status?: string;
}

// ============================================================================
// APPOINTMENT REQUEST/RESPONSE DTOs
// ============================================================================

export interface CreateAppointmentRequest {
  appointmentDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  patientId: number;
  doctorId: number;
  notes?: string;
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  appointmentId: number;
  appointmentStatus?: AppointmentStatus;
}

export interface AppointmentFileUploadRequest {
  appointmentId: number;
  file: File;
}

// ============================================================================
// APPOINTMENT ENUMS
// ============================================================================

export enum AppointmentStatus {
  Scheduled = 'Scheduled',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Rescheduled = 'Rescheduled'
}

// ============================================================================
// APPOINTMENT FILTER/SEARCH DTOs
// ============================================================================

export interface AppointmentFilter {
  date?: string;
  month?: number;
  year?: number;
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
  specialization?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface AppointmentDateRange {
  startDate: string;
  endDate: string;
}

export interface AppointmentStatistics {
  totalAppointments: number;
  todayAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
  thisYearAppointments: number;
  byStatus: {
    scheduled: number;
    completed: number;
    cancelled: number;
    inProgress: number;
  };
  bySpecialization: {
    [key: string]: number;
  };
}

// ============================================================================
// APPOINTMENT REMINDER DTOs
// ============================================================================

export interface AppointmentReminder {
  appointmentId: number;
  reminderType: ReminderType;
  reminderTime: string;
  isReminderSent: boolean;
}

export enum ReminderType {
  SMS = 'SMS',
  Email = 'Email',
  Push = 'Push'
} 