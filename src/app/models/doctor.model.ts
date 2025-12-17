import { ShiftTime } from './common.model';

// Add missing slot interfaces
export interface SlotWithDoctorDto {
  doctorId: number;
  doctorName: string;
  specialization: string;
  shift: string;
  slots: SlotDto[];
}

export interface SlotDto {
  slotId: number;
  startTime: string;
  endTime: string;
  status: string;
  time?: string;
}

// Re-export ShiftTime for backward compatibility
export { ShiftTime } from './common.model';

export interface Doctor {
  // Backend properties
  userId: number;
  doctorId?: number; // Alternative ID field
  userName: string;
  name?: string; // Alternative name field
  email: string;
  phoneNumber: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultantFees?: number;
  consultationFee?: number; // Alternative fee field
  consultant_fees?: number; // Backend field name variant
  
  // Admin fields
  isApprovedByAdmin: boolean;
  shift: ShiftTime | number | string;
  
  // Additional properties for enhanced functionality
  status?: 'Online' | 'Offline';
  languages?: string;
  active_Status?: boolean; // Backend field for active status
  image?: string; // Doctor profile image
  avatar?: string; // Alternative image field for hero component
  about?: string; // Doctor bio and description
  bio?: string; // Alternative field for about
  
  // Optional metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface DoctorProfile {
  userId: number;
  userName?: string;
  doctorId: number;
  name: string;
  email: string;
  phoneNumber: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  consultantFees: number;
  languages: string;
  shift?: ShiftTime | number | string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  createdAt?: string;
}

export interface DoctorAppointment {
  appointmentId: number;
  patientName: string;
  patientEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  startTime?: string;
  endTime?: string;
  appointmentStartTime?: string;
  appointmentEndTime?: string;
  status: string;
  appointmentStatus?: string;
  specialization?: string;
  notes?: string;
  consultantFees?: number;
  isReminderSent?: boolean;
}

export interface AppointmentBooking {
  // Primary properties (required for backend)
  appointmentDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  patientEmail: string;
  
  // Backend compatibility properties
  DoctorId?: number;
  DoctorName?: string;
  PatientId?: number;
  PatientEmail?: string;
  AppointmentDate?: string;
  AppointmentStartTime?: string;
  AppointmentEndTime?: string;
  Submit?: boolean;
  FilePath?: File;
  BookedBy?: string;
  HelpDeskId?: number;
  specialization?: string;
  Email?: string;
  shift?: string;
}

export interface Prescription {
  prescriptionId: number;
  appointmentId: number;
  patientName: string;
  doctorName: string;
  prescriptionDate: string;
  medicines: string;
  instructions: string;
  filePath?: File; // Medical history file
}

// Backend enums
export enum SlotStatus {
  Available = 0,
  Busy = 1,
  Not_Available = 2
}

// Helper function to convert shift enum to string
export function getShiftString(shift: ShiftTime): string {
  switch (shift) {
    case ShiftTime.Morning: return 'Morning';
    case ShiftTime.Afternoon: return 'Afternoon';
    case ShiftTime.Evening: return 'Evening';
    case ShiftTime.Night: return 'Night';
    default: return 'Morning';
  }
}

export enum SpecializationEnum {
  Cardiologist = 0,
  Dermatologist = 1,
  Neurologist = 2,
  Orthopedic_Surgeon = 3,
  Pediatrician = 4,
  Psychiatrist = 5,
  Ophthalmologist = 6,
  ENT_Specialist = 7,
  Gastroenterologist = 8,
  Urologist = 9,
  Endocrinologist = 10,
  Oncologist = 11
}

// Frontend display models (keeping for compatibility but adding status info)
export interface TimeSlot {
  id: string;
  time: string;
  isAvailable: boolean;
  // Add status properties for visual indicators
  status?: string;         // "Available", "Busy", "Not_Available"
  isBooked?: boolean;      // Whether the slot is booked
  startTime?: string;      // Backend time format
  endTime?: string;        // Backend time format
  doctorId?: number;       // Which doctor owns this slot
  doctorName?: string;     // Doctor name for reference
}

export interface BookingSlot {
  date: Date;
  day: string;
  dayNumber: number;
  timeSlots: TimeSlot[];
} 