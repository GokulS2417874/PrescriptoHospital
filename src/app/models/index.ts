// Export all models from this directory with specific exports to avoid conflicts
export * from './common.model';
export * from './doctor.model';
export * from './employee.model';
export * from './patient.model';
export * from './payment.model';
export * from './jwt.model';

// Specific exports to avoid conflicts
export type { Appointment } from './appointment.model';
export type { Prescription as PrescriptionModel } from './prescription.model';
export type { EmployeeDoctor as AdminDoctor } from './employee.model';

// User models - specific export to avoid UserRole conflict
export type { User, LoginRequest, LoginResponse } from './user.models';

// Helpdesk models - specific export to avoid PaymentStatus conflict
export type { 
  HelpdeskAgent, 
  HelpdeskSearchResult, 
  HelpdeskStats 
} from './helpdesk.model'; 