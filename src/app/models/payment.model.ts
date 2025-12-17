// ============================================================================
// PAYMENT DOMAIN MODELS
// ============================================================================

export interface Payment {
  paymentId: number;
  appointmentId: number;
  patientId: number;
  doctorId: number;
  totalAmount: number;       // Backend returns totalAmount
  paidAmount: number;        // Backend returns paidAmount  
  pendingAmount: number;     // Backend returns pendingAmount
  paymentDate: string;
  paymentMethod: string;     // Backend returns string, not enum
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  notes?: string;
  
  // Relational data (might be populated by backend)
  patient?: any;
  appointment?: any;
  patientName?: string;
  doctorName?: string;
  appointmentDate?: string;
}

export enum PaymentMethod {
  CreditCard = 'CreditCard',
  DebitCard = 'DebitCard',
  NetBanking = 'NetBanking',
  UPI = 'UPI',
  Cash = 'Cash',
  Insurance = 'Insurance'
}

export enum PaymentStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed',
  Refunded = 'Refunded',
  Cancelled = 'Cancelled'
}

// ============================================================================
// PAYMENT REQUEST/RESPONSE DTOs
// ============================================================================

export interface CreatePaymentRequest {
  appointmentId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  notes?: string;
}

export interface UpdatePaymentRequest {
  paymentId: number;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  notes?: string;
}

export interface PaymentFilter {
  patientId?: number;
  doctorId?: number;
  appointmentId?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  byMethod: {
    [key in PaymentMethod]: {
      count: number;
      amount: number;
    };
  };
} 