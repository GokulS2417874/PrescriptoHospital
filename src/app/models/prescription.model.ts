// ============================================================================
// PRESCRIPTION DOMAIN MODELS (Like Prescription DTOs in Backend)
// ============================================================================

export interface Prescription {
  prescriptionId: number;
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  medications?: string; // Keep for backward compatibility
  medicines?: PrescriptionMedicine[]; // Add for doctor dashboard compatibility
  instructions: string;
  dateCreated?: string;
  createdAt?: string; // Add alternative date field
  validUntil?: string;
  prescriptionStatus?: PrescriptionStatus;
}

// Medicine structure expected by doctor dashboard
export interface PrescriptionMedicine {
  medicineType: number | string;
  dosages: number | string;
  scheduleTime: number | string;
  medicineName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

// ============================================================================
// PRESCRIPTION ENUMS
// ============================================================================

export enum PrescriptionStatus {
  Active = 'Active',
  Completed = 'Completed',
  Expired = 'Expired',
  Cancelled = 'Cancelled'
}

// Medicine enums for doctor dashboard compatibility
export enum MedicineType {
  None = 0,
  Paracetamol = 1,
  Ibuprofen = 2,
  Aspirin = 4,
  Naproxen = 8,
  Diclofenac = 16,
  Tramadol = 32,
  Morphine = 64,
  Codeine = 128,
  Amitriptyline = 256,
  Effervescent = 512,
  GelForm = 1024,
  SyrupForm = 2048,
  Inhaler = 4096,
  Suppository = 8192
}

export enum DosageType {
  None = 0,
  Mg_100 = 1,
  Mg_200 = 2,
  Mg_300 = 4,
  Mg_400 = 8,
  Mg_500 = 16,
  Mg_600 = 32,
  Mg_700 = 64,
  Mg_800 = 128,
  Mg_900 = 256,
  Mg_1000 = 512
}

export enum TabletScheduleTime {
  Morning = 0,
  Afternoon = 1,
  Evening = 2,
  Night = 4
}

// ============================================================================
// PRESCRIPTION REQUEST/RESPONSE DTOs
// ============================================================================

export interface CreatePrescriptionRequest {
  patientId: number;
  doctorId: number;
  appointmentId?: number;
  medications: Medication[];
  instructions: string;
  validUntil?: string;
}

export interface UpdatePrescriptionRequest {
  prescriptionId: number;
  medications?: Medication[];
  instructions?: string;
  validUntil?: string;
  prescriptionStatus?: PrescriptionStatus;
}

// ============================================================================
// MEDICATION MODELS
// ============================================================================

export interface Medication {
  medicationId?: number;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  beforeFood?: boolean;
  afterFood?: boolean;
}

export interface MedicationTemplate {
  templateId: number;
  name: string;
  medications: Medication[];
  specialization?: string;
  createdBy: number;
}

// ============================================================================
// PRESCRIPTION FILTER/SEARCH DTOs
// ============================================================================

export interface PrescriptionFilter {
  patientId?: number;
  doctorId?: number;
  appointmentId?: number;
  prescriptionStatus?: PrescriptionStatus;
  dateFrom?: string;
  dateTo?: string;
  medicationName?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface PrescriptionStatistics {
  totalPrescriptions: number;
  activePrescriptions: number;
  completedPrescriptions: number;
  expiredPrescriptions: number;
  byDoctor: {
    [doctorId: number]: number;
  };
  commonMedications: {
    [medicationName: string]: number;
  };
} 