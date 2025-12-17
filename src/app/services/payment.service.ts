import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Payment, PaymentMethod, PaymentStatus, CreatePaymentRequest, UpdatePaymentRequest, PaymentFilter } from '../models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_BASE_URL = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';

  // Check if user is authenticated
  private checkAuthentication(): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    const user = this.authService.getCurrentUserSnapshot();
    
    console.log('Payment service auth check:', {
      isLoggedIn,
      user,
      userRole: user?.role
    });
    
    return isLoggedIn;
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  // GET: api/Payment/Payments (AuthInterceptor adds JWT automatically)
  getAllPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/Payments`);
  }

  // GET: api/Payment/GetPaymentById
  getPaymentById(paymentId: number): Observable<Payment> {
    const params = new HttpParams().set('paymentId', paymentId.toString());
    return this.http.get<Payment>(`${this.API_BASE_URL}/Payment/GetPaymentById`, { params });
  }

  // GET: api/Payment/GetPaymentsByPatient
  getPaymentsByPatient(patientId: number): Observable<Payment[]> {
    const params = new HttpParams().set('patientId', patientId.toString());
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/GetPaymentsByPatient`, { params });
  }

  // GET: api/Payment/GetPaymentsByDoctor
  getPaymentsByDoctor(doctorId: number): Observable<Payment[]> {
    const params = new HttpParams().set('doctorId', doctorId.toString());
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/GetPaymentsByDoctor`, { params });
  }

  // GET: Get payments by appointment ID (required by AdminComponent)
  getPaymentsByAppointment(appointmentId: number): Observable<Payment[]> {
    // If there's no specific endpoint, filter from all payments
    return this.getAllPayments().pipe(
      map(payments => payments.filter(payment => payment.appointmentId === appointmentId)),
      catchError(error => {
        console.error('❌ Error getting payments by appointment:', error);
        return of([]);
      })
    );
  }

  // POST: api/Payment/CreatePayment
  createPayment(paymentRequest: CreatePaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.API_BASE_URL}/Payment/CreatePayment`, paymentRequest);
  }

  // PUT: api/Payment/UpdatePayment
  updatePayment(updateRequest: UpdatePaymentRequest): Observable<string> {
    return this.http.put(`${this.API_BASE_URL}/Payment/UpdatePayment`, updateRequest, {
      responseType: 'text'
    });
  }

  // GET: api/Payment/GetPaymentStatistics
  getPaymentStatistics(): Observable<any> {
    return this.http.get<any>(`${this.API_BASE_URL}/Payment/GetPaymentStatistics`);
  }

  // GET: api/Payment/GetPaymentsByDateRange
  getPaymentsByDateRange(startDate: string, endDate: string): Observable<Payment[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/GetPaymentsByDateRange`, { params });
  }

  // ============================================================================
  // EARNINGS CALCULATION METHODS (Required by AdminComponent)
  // ============================================================================

  // GET: Calculate daily earnings from actual payments
  getEarningsByDay(date: string): Observable<{totalEarnings: number}> {
    console.log(`💰 Calculating daily earnings for ${date} from real payment data...`);
    
    // Use the actual payment endpoint that exists: /Payment/Payments (not /Payment/GetAllPayments)
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/Payments`).pipe(
      map((payments: Payment[]) => {
        // Filter payments for the specific date and calculate total
        const dailyPayments = payments.filter(payment => {
          const paymentDate = new Date(payment.paymentDate || '').toISOString().split('T')[0];
          return paymentDate === date;
        });
        
        const totalEarnings = dailyPayments.reduce((sum, payment) => {
          return sum + (payment.paidAmount || 0);  // Use paidAmount from backend
        }, 0);
        
        console.log(`💰 Found ${dailyPayments.length} payments for ${date}, total: ₹${totalEarnings}`);
        return { totalEarnings };
      }),
      catchError(error => {
        console.error('❌ Error fetching payment data for daily earnings:', error);
        throw error; // Don't return demo data, let the error propagate
      })
    );
  }

  // GET: Calculate monthly earnings from actual payments
  getEarningsByMonth(year: number, month: number): Observable<{totalEarnings: number}> {
    console.log(`💰 Calculating monthly earnings for ${month}/${year} from real payment data...`);
    
    // Use the actual payment endpoint that exists: /Payment/Payments (not /Payment/GetAllPayments)
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/Payments`).pipe(
      map((payments: Payment[]) => {
        // Filter payments for the specific month/year and calculate total
        const monthlyPayments = payments.filter(payment => {
          const paymentDate = new Date(payment.paymentDate || '');
          return paymentDate.getFullYear() === year && (paymentDate.getMonth() + 1) === month;
        });
        
        const totalEarnings = monthlyPayments.reduce((sum, payment) => {
          return sum + (payment.paidAmount || 0);  // Use paidAmount from backend
        }, 0);
        
        console.log(`💰 Found ${monthlyPayments.length} payments for ${month}/${year}, total: ₹${totalEarnings}`);
        return { totalEarnings };
      }),
      catchError(error => {
        console.error('❌ Error fetching payment data for monthly earnings:', error);
        throw error; // Don't return demo data, let the error propagate
      })
    );
  }

  // GET: Calculate yearly earnings from actual payments
  getEarningsByYear(year: number): Observable<{totalEarnings: number}> {
    console.log(`💰 Calculating yearly earnings for ${year} from real payment data...`);
    
    // Use the actual payment endpoint that exists: /Payment/Payments (not /Payment/GetAllPayments)
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/Payments`).pipe(
      map((payments: Payment[]) => {
        // Filter payments for the specific year and calculate total
        const yearlyPayments = payments.filter(payment => {
          const paymentDate = new Date(payment.paymentDate || '');
          return paymentDate.getFullYear() === year;
        });
        
        const totalEarnings = yearlyPayments.reduce((sum, payment) => {
          return sum + (payment.paidAmount || 0);  // Use paidAmount from backend
        }, 0);
        
        console.log(`💰 Found ${yearlyPayments.length} payments for ${year}, total: ₹${totalEarnings}`);
        return { totalEarnings };
      }),
      catchError(error => {
        console.error('❌ Error fetching payment data for yearly earnings:', error);
        throw error; // Don't return demo data, let the error propagate
      })
    );
  }
}