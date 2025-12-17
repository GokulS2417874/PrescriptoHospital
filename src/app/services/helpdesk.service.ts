import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { 
  HelpdeskAgent, 
  PatientDetails, 
  DoctorDetails, 
  PaymentDetails, 
  AppointmentBookingRequest,
  HelpdeskSearchResult,
  HelpdeskStats,
  PaymentStatus,
  AppointmentUrgency 
} from '../models/helpdesk.model';

@Injectable({
  providedIn: 'root'
})
export class HelpdeskService {
  private apiUrl = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';
  private currentAgentSubject = new BehaviorSubject<HelpdeskAgent | null>(null);
  public currentAgent$ = this.currentAgentSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadCurrentAgent();
  }

  // ===== AGENT MANAGEMENT =====

  // Login helpdesk agent
  loginAgent(email: string, password: string): Observable<{success: boolean, message: string, agent?: HelpdeskAgent}> {
    const loginData = { email, password };
    
    console.log('🔍 Helpdesk Login Request:', loginData);
    
    return this.http.post<any>(`${this.apiUrl}/Helpdesk/Login`, loginData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('🔍 Helpdesk Login Response:', response);
        
        if (response && response.token) {
          // Store token and agent info
          localStorage.setItem('helpdesk_token', response.token);
          localStorage.setItem('helpdesk_agent', JSON.stringify(response.agent));
          
          this.currentAgentSubject.next(response.agent);
          
          return {
            success: true,
            message: 'Login successful',
            agent: response.agent
          };
        } else {
          return {
            success: false,
            message: response.message || 'Login failed'
          };
        }
      }),
      catchError(error => {
        console.error('❌ Helpdesk Login Error:', error);
        return of({
          success: false,
          message: 'Login failed. Please try again.'
        });
      })
    );
  }

  // Update agent availability status
  updateAgentStatus(agentId: number, isAvailable: boolean): Observable<{success: boolean, message: string}> {
    const statusData = { agentId, isAvailable };
    
    console.log('🔍 Updating agent status:', statusData);
    
    return this.http.put<any>(`${this.apiUrl}/Helpdesk/UpdateAgentStatus`, statusData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('✅ Agent status updated:', response);
        
        // Update current agent if it's the same agent
        const currentAgent = this.currentAgentSubject.value;
        if (currentAgent && currentAgent.agentId === agentId) {
          currentAgent.isAvailable = isAvailable;
          this.currentAgentSubject.next(currentAgent);
          localStorage.setItem('helpdesk_agent', JSON.stringify(currentAgent));
        }
        
        return {
          success: true,
          message: 'Status updated successfully'
        };
      }),
      catchError(error => {
        console.error('❌ Agent status update error:', error);
        return of({
          success: false,
          message: 'Failed to update status'
        });
      })
    );
  }

  // Get current agent info
  getCurrentAgent(): HelpdeskAgent | null {
    return this.currentAgentSubject.value;
  }

  // ===== PATIENT & DOCTOR MANAGEMENT =====

  // Get all patients using the actual Patient API
  getAllPatientsFromAPI(): Observable<PatientDetails[]> {
    console.log('🔍 Getting all patients from Patient API');
    
    return this.http.get<PatientDetails[]>(`${this.apiUrl}/Patient/GetAllPatient`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(patients => {
        console.log('✅ All patients received:', patients);
        return patients.map(patient => ({
          ...patient,
          isActive: true, // Default to active since API doesn't provide this
          totalAppointments: 0, // Default values
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          registrationDate: new Date()
        }));
      }),
      catchError(error => {
        console.error('❌ Error getting all patients:', error);
        return of([]);
      })
    );
  }

  // Search patients by name using the actual Patient API
  getPatientByName(name: string): Observable<PatientDetails[]> {
    console.log('🔍 Searching patient by name:', name);
    
    const params = new HttpParams().set('name', name);
    return this.http.get<PatientDetails[]>(`${this.apiUrl}/Patient/GetPatientByName`, { 
      headers: this.getHeaders(), 
      params 
    }).pipe(
      map(patients => {
        console.log('✅ Patients found by name:', patients);
        return patients.map(patient => ({
          ...patient,
          isActive: true,
          totalAppointments: 0,
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          registrationDate: new Date()
        }));
      }),
      catchError(error => {
        console.error('❌ Error searching patient by name:', error);
        return of([]);
      })
    );
  }

  // Get patient by ID using the actual Patient API
  getPatientById(id: number): Observable<PatientDetails | null> {
    console.log('🔍 Getting patient by ID:', id);
    console.log('🔍 API URL:', `${this.apiUrl}/Patient/GetPatientById?id=${id}`);
    console.log('🔍 Auth token available:', !!this.authService.getToken());
    
    const params = new HttpParams().set('id', id.toString());
    const headers = this.getHeaders();
    
    console.log('🔍 Request headers:', headers.keys());
    
    return this.http.get<PatientDetails[]>(`${this.apiUrl}/Patient/GetPatientById`, { 
      headers: headers, 
      params 
    }).pipe(
      map(patients => {
        console.log('✅ Patient API response:', patients);
        if (patients && patients.length > 0) {
          const patient = {
            ...patients[0],
            isActive: true,
            totalAppointments: 0,
            totalPaidAmount: 0,
            totalPendingAmount: 0,
            registrationDate: new Date()
          };
          console.log('✅ Processed patient:', patient);
          return patient;
        }
        console.log('⚠️ No patient found in response');
        return null;
      }),
      catchError(error => {
        console.error('❌ Error getting patient by ID:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error object:', error);
        return of(null);
      })
    );
  }

  // Legacy methods (keeping for backward compatibility but updating to use new APIs)
  searchPatients(query: string): Observable<PatientDetails[]> {
    // Use the new getPatientByName method
    if (query.trim()) {
      return this.getPatientByName(query);
    }
    return of([]);
  }

  getAllPatients(page: number, pageSize: number): Observable<HelpdeskSearchResult<PatientDetails>> {
    // Use the new getAllPatientsFromAPI and implement pagination on frontend
    return this.getAllPatientsFromAPI().pipe(
      map(allPatients => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = allPatients.slice(startIndex, endIndex);
        
        return {
          results: paginatedResults,
          total: allPatients.length,
          page: page,
          pageSize: pageSize
        };
      })
    );
  }

  getPatientDetails(patientId: number): Observable<PatientDetails | null> {
    // Use the new getPatientById method
    return this.getPatientById(patientId);
  }

  // ===== DOCTOR MANAGEMENT =====

  // Get all doctors using the actual Doctor API
  getAllDoctorsFromAPI(): Observable<DoctorDetails[]> {
    console.log('🔍 Getting all doctors from Doctor API');
    
    return this.http.get<any[]>(`${this.apiUrl}/Doctor/GetAllDoctors`, { 
      headers: this.getHeaders() 
    }).pipe(
      map(doctors => {
        console.log('✅ All doctors received:', doctors);
        return doctors.map(doctor => ({
          userId: doctor.userId,
          userName: doctor.userName,
          email: doctor.email || '',
          phoneNumber: doctor.phoneNumber || '',
          specialization: doctor.specialization,
          consultant_fees: doctor.consultant_fees,
          shift: '', // Not provided by API
          isActive: doctor.active_Status === 'Online',
          isAvailable: doctor.active_Status === 'Online',
          rating: 0, // Default rating
          qualification: doctor.qualification || '',
          experience: doctor.experienceYears || 0,
          workingHours: '', // Not provided by API
          department: doctor.specialization, // Use specialization as department
          totalAppointments: 0 // Default value
        }));
      }),
      catchError(error => {
        console.error('❌ Error getting all doctors:', error);
        return of([]);
      })
    );
  }

  // Search doctors by name using the actual Doctor API
  getDoctorByName(name: string): Observable<DoctorDetails[]> {
    console.log('🔍 Searching doctor by name:', name);
    
    const params = new HttpParams().set('name', name);
    return this.http.get<any[]>(`${this.apiUrl}/Doctor/GetDoctorsByName`, { 
      headers: this.getHeaders(), 
      params 
    }).pipe(
      map(doctors => {
        console.log('✅ Doctors found by name:', doctors);
        return doctors.map(doctor => ({
          userId: doctor.userId,
          userName: doctor.userName,
          email: doctor.email || '',
          phoneNumber: doctor.phoneNumber || '',
          specialization: doctor.specialization,
          consultant_fees: doctor.consultant_fees,
          shift: '',
          isActive: doctor.active_Status === 'Online',
          isAvailable: doctor.active_Status === 'Online',
          rating: 0,
          qualification: doctor.qualification || '',
          experience: doctor.experienceYears || 0,
          workingHours: '',
          department: doctor.specialization,
          totalAppointments: 0
        }));
      }),
      catchError(error => {
        console.error('❌ Error searching doctor by name:', error);
        return of([]);
      })
    );
  }

  // Get doctor by ID using the actual Doctor API
  getDoctorById(id: number): Observable<DoctorDetails | null> {
    console.log('🔍 Getting doctor by ID:', id);
    console.log('🔍 API URL:', `${this.apiUrl}/Doctor/GetAllDoctorsById?id=${id}`);
    
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<any[]>(`${this.apiUrl}/Doctor/GetAllDoctorsById`, { 
      headers: this.getHeaders(), 
      params 
    }).pipe(
      map(doctors => {
        console.log('✅ Doctor API response:', doctors);
        if (doctors && doctors.length > 0) {
          const doctor = doctors.find(d => d.userId === id); // Find the specific doctor by ID
          if (doctor) {
            const processedDoctor = {
              userId: doctor.userId,
              userName: doctor.userName,
              email: doctor.email || '',
              phoneNumber: doctor.phoneNumber || '',
              specialization: doctor.specialization,
              consultant_fees: doctor.consultant_fees,
              shift: '',
              isActive: doctor.active_Status === 'Online',
              isAvailable: doctor.active_Status === 'Online',
              rating: 0,
              qualification: doctor.qualification || '',
              experience: doctor.experienceYears || 0,
              workingHours: '',
              department: doctor.specialization,
              totalAppointments: 0
            };
            console.log('✅ Processed doctor:', processedDoctor);
            return processedDoctor;
          }
        }
        console.log('⚠️ No doctor found in response');
        return null;
      }),
      catchError(error => {
        console.error('❌ Error getting doctor by ID:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        return of(null);
      })
    );
  }

  // Search doctors by specialization using the actual Doctor API
  getDoctorsBySpecialization(specialization: string): Observable<DoctorDetails[]> {
    console.log('🔍 Searching doctors by specialization:', specialization);
    
    const params = new HttpParams().set('Specializaition', specialization); // Note: API uses "Specializaition" (typo in backend)
    return this.http.get<any[]>(`${this.apiUrl}/Doctor/GetDoctorsBySpecialization`, { 
      headers: this.getHeaders(), 
      params 
    }).pipe(
      map(doctors => {
        console.log('✅ Doctors found by specialization:', doctors);
        return doctors.map(doctor => ({
          userId: doctor.userId,
          userName: doctor.userName,
          email: doctor.email || '',
          phoneNumber: doctor.phoneNumber || '',
          specialization: doctor.specialization,
          consultant_fees: doctor.consultant_fees,
          shift: '',
          isActive: doctor.active_Status === 'Online',
          isAvailable: doctor.active_Status === 'Online',
          rating: 0,
          qualification: doctor.qualification || '',
          experience: doctor.experienceYears || 0,
          workingHours: '',
          department: doctor.specialization,
          totalAppointments: 0
        }));
      }),
      catchError(error => {
        console.error('❌ Error searching doctors by specialization:', error);
        return of([]);
      })
    );
  }

  // Legacy methods (updating to use new APIs)
  searchDoctors(query: string): Observable<DoctorDetails[]> {
    // Use the new getDoctorByName method
    if (query.trim()) {
      return this.getDoctorByName(query);
    }
    return of([]);
  }

  getAllDoctors(page: number, pageSize: number): Observable<HelpdeskSearchResult<DoctorDetails>> {
    // Use the new getAllDoctorsFromAPI and implement pagination on frontend
    return this.getAllDoctorsFromAPI().pipe(
      map(allDoctors => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = allDoctors.slice(startIndex, endIndex);
        
        return {
          results: paginatedResults,
          total: allDoctors.length,
          page: page,
          pageSize: pageSize
        };
      })
    );
  }

  getDoctorDetails(doctorId: number): Observable<DoctorDetails | null> {
    // Use the new getDoctorById method
    return this.getDoctorById(doctorId);
  }

  // ===== APPOINTMENT MANAGEMENT =====

  // Get doctor available slots (same logic as doctor detail component)
  getDoctorSlotsForBooking(doctorId: number, specialization: string, shift: string): Observable<any[]> {
    console.log('🔍 Getting doctor slots for helpdesk booking:', { doctorId, specialization, shift });
    
    const specializationEnum = this.getSpecializationEnum(specialization);
    const shiftEnum = this.getShiftEnum(shift);
    
    const params = new HttpParams()
      .set('doctorId', doctorId.toString())
      .set('specialization', specializationEnum.toString())
      .set('shift', shiftEnum.toString());

    return this.http.get<any[]>(`${this.apiUrl}/Appointment/GetDoctorSlots`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(slots => {
        console.log('✅ Doctor slots received:', slots);
        return this.convertSlotsToBookingSlots(slots);
      }),
      catchError(error => {
        console.error('❌ Error getting doctor slots:', error);
        return of([]);
      })
    );
  }

  // Convert API slots to booking slots format
  private convertSlotsToBookingSlots(slots: any[]): any[] {
    const today = new Date();
    const timeSlots = [];
    
    // Generate time slots for today with status from API
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        const endHour = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? 0 : 30;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
        
        // Find matching slot from API
        const apiSlot = slots.find(s => s.appointmentStartTime === slotTime);
        
        let status = 'Available';
        let isBooked = false;
        
        if (apiSlot) {
          if (apiSlot.appointmentStatus === 'Scheduled') {
            status = 'Busy';
            isBooked = true;
          } else if (apiSlot.isBlocked) {
            status = 'Not_Available';
          }
        }
        
        timeSlots.push({
          id: `slot-${hour}-${minute}`,
          time: this.formatTimeSlot(slotTime),
          startTime: slotTime,
          endTime: endTime,
          status: status,
          isAvailable: status === 'Available',
          isBooked: isBooked,
          doctorId: apiSlot?.doctorId || 0,
          doctorName: apiSlot?.doctorName || ''
        });
      }
    }
    
    console.log('✅ Converted slots for booking:', timeSlots.length);
    return timeSlots;
  }

  // Helper methods for enums
  private getSpecializationEnum(specialization: string): number {
    const specializationMap: { [key: string]: number } = {
      'Cardiologist': 0,
      'Dermatologist': 1,
      'Neurologist': 2,
      'Pediatrician': 3,
      'Psychiatrist': 4
    };
    return specializationMap[specialization] || 0;
  }

  private getShiftEnum(shift: string): number {
    const shiftMap: { [key: string]: number } = {
      'Morning': 0,
      'Afternoon': 1,
      'Night': 2
    };
    return shiftMap[shift] || 1; // Default to Afternoon
  }

  private formatTimeSlot(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  // Book appointment for patient by helpdesk
  bookAppointmentForPatient(bookingRequest: AppointmentBookingRequest): Observable<{success: boolean, message: string, appointmentId?: number}> {
    console.log('🔍 Helpdesk booking appointment for patient:', bookingRequest);

    // Use the same booking API but include helpdesk information
    const formData = new FormData();
    formData.append('DoctorId', bookingRequest.doctorId.toString());
    formData.append('DoctorName', bookingRequest.doctorName || '');
    formData.append('AppointmentDate', bookingRequest.appointmentDate);
    formData.append('AppointmentStartTime', bookingRequest.appointmentStartTime);
    formData.append('AppointmentEndTime', bookingRequest.appointmentEndTime);
    formData.append('Submit', 'true');
    
    // Add helpdesk specific information
    if (bookingRequest.bookedByAgent) {
      formData.append('HelpdeskId', bookingRequest.bookedByAgent.toString());
    }

    if (bookingRequest.notes) {
      formData.append('Notes', bookingRequest.notes);
    }

    // Add file if provided
    if (bookingRequest.filePath) {
      formData.append('FilePath', bookingRequest.filePath);
    }

    const specializationEnum = this.getSpecializationEnum(bookingRequest.specialization);
    const shiftEnum = 1; // Default to Afternoon shift

    const params = new HttpParams()
      .set('specialization', specializationEnum.toString())
      .set('email', bookingRequest.patientEmail || '') // Patient email
      .set('shift', shiftEnum.toString());

    return this.http.post<any>(`${this.apiUrl}/Appointment/BookAppointment`, formData, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => {
        console.log('✅ Helpdesk booking response:', response);
        
        if (typeof response === 'string') {
          // Handle error responses
          if (response.includes('already Booked') || response.includes('Already Booked')) {
            return { success: false, message: response };
          } else if (response.includes('Slot is Already Booked')) {
            return { success: false, message: 'This time slot is already booked. Please select another slot.' };
          } else {
            return { success: false, message: response };
          }
        } else if (response && response.appointmentId) {
          // Success response
          return {
            success: true,
            message: 'Appointment booked successfully by helpdesk!',
            appointmentId: response.appointmentId
          };
        } else {
          return { success: false, message: 'Unknown response from server' };
        }
      }),
      catchError(error => {
        console.error('❌ Helpdesk booking error:', error);
        return of({
          success: false,
          message: `Booking failed: ${error.message || 'Unknown error'}`
        });
      })
    );
  }

  // Get today's appointments - Use the correct working endpoint
  getTodaysAppointments(): Observable<any[]> {
    console.log('🔍 Getting today\'s appointments using Admin endpoint...');
    
    // Use the Admin endpoint that actually exists and returns real data
    return this.http.get<any[]>(`${this.apiUrl}/Admin/List/Appointments/Today`, {
      headers: this.getHeaders()
    }).pipe(
      map((appointments: any[]) => {
        console.log('✅ Today\'s appointments received from Admin/List/Appointments/Today:', appointments);
        console.log(`📊 Found ${appointments.length} appointments for today`);
        
        // Log appointment details for debugging
        appointments.forEach(apt => {
          console.log(`📋 Appointment ${apt.appointmentId}: ${apt.patientName} → ${apt.doctorName} (${apt.specialization})`);
        });
        
        return appointments || [];
      }),
      catchError(error => {
        console.error('❌ Admin appointments endpoint failed:', error);
        console.log('🔄 This should not happen as Admin endpoint usually works...');
        
        // Return empty array instead of trying more endpoints
        console.log('💡 Falling back to empty appointments list');
        return of([]);
      })
    );
  }

  // ===== PAYMENT MANAGEMENT =====

  // Create new payment
  createPayment(paymentRequest: any): Observable<{success: boolean, message: string, paymentId?: number}> {
    console.log('🔍 Creating payment:', paymentRequest);

    // Debug: Log all the values being sent
    console.log('🔍 Payment Request Details:');
    console.log('  - AppointmentId:', paymentRequest.appointmentId, '(type:', typeof paymentRequest.appointmentId, ')');
    console.log('  - PatientId:', paymentRequest.patientId, '(type:', typeof paymentRequest.patientId, ')');
    console.log('  - DoctorId:', paymentRequest.doctorId, '(type:', typeof paymentRequest.doctorId, ')');
    console.log('  - TotalAmount:', paymentRequest.totalAmount, '(type:', typeof paymentRequest.totalAmount, ')');
    console.log('  - PaidAmount:', paymentRequest.paidAmount, '(type:', typeof paymentRequest.paidAmount, ')');
    console.log('  - PaymentMethod:', paymentRequest.paymentMethod, '(type:', typeof paymentRequest.paymentMethod, ')');

    const formData = new FormData();
    formData.append('AppointmentId', (paymentRequest.appointmentId || 0).toString());
    formData.append('PatientId', (paymentRequest.patientId || 0).toString());
    formData.append('DoctorId', (paymentRequest.doctorId || 0).toString());
    formData.append('TotalAmount', (paymentRequest.totalAmount || 0).toString());
    formData.append('PaidAmount', (paymentRequest.paidAmount || 0).toString());
    formData.append('PaymentMethod', paymentRequest.paymentMethod || '');

    // Debug: Log FormData contents
    console.log('🔍 FormData being sent to API:');
    for (let pair of formData.entries()) {
      console.log(`  ${pair[0]}: ${pair[1]}`);
    }

    console.log('🔍 API URL:', `${this.apiUrl}/Payment/CreatePayment`);
    console.log('🔍 Headers:', this.getHeaders());
    
    // Compare with working Swagger request
    console.log('🔍 COMPARISON WITH WORKING SWAGGER:');
    console.log('  Swagger AppointmentId: 1 (works)');
    console.log('  Frontend AppointmentId:', paymentRequest.appointmentId);
    console.log('  Swagger PatientId: 1 (works)');
    console.log('  Frontend PatientId:', paymentRequest.patientId);
    console.log('  Swagger DoctorId: 2 (works)');
    console.log('  Frontend DoctorId:', paymentRequest.doctorId);

    return this.http.post<any>(`${this.apiUrl}/Payment/CreatePayment`, formData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('✅ Payment created successfully:', response);
        return {
          success: true,
          message: 'Payment created successfully!',
          paymentId: response.paymentId
        };
      }),
      catchError(error => {
        console.error('❌ Error creating payment:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error body:', error.error);
        
        // If auth error, try without headers (like Swagger)
        if (error.status === 401 || error.status === 403 || (error.error && error.error.includes('Appointment not Found'))) {
          console.log('🔄 Trying payment creation without auth headers (like Swagger)...');
          
          return this.http.post<any>(`${this.apiUrl}/Payment/CreatePayment`, formData).pipe(
            map(response => {
              console.log('✅ Payment created successfully WITHOUT auth headers:', response);
              return {
                success: true,
                message: 'Payment created successfully!',
                paymentId: response.paymentId
              };
            }),
            catchError(retryError => {
              console.error('❌ Error even without auth headers:', retryError);
              
              // Try to extract meaningful error message from backend
              let errorMessage = 'Unknown error';
              if (retryError.error && typeof retryError.error === 'string') {
                errorMessage = retryError.error;
              } else if (retryError.message) {
                errorMessage = retryError.message;
              }
              
              return of({
                success: false,
                message: `Failed to create payment: ${errorMessage}`
              });
            })
          );
        }
        
        // Try to extract meaningful error message from backend
        let errorMessage = 'Unknown error';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return of({
          success: false,
          message: `Failed to create payment: ${errorMessage}`
        });
      })
    );
  }

  // Get payment details for appointment
  getPaymentDetails(appointmentId: number): Observable<PaymentDetails | null> {
    console.log('🔍 Getting payment details for appointment:', appointmentId);
    
    return this.http.get<PaymentDetails>(`${this.apiUrl}/Helpdesk/GetPaymentDetails/${appointmentId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(payment => {
        console.log('✅ Payment details:', payment);
        return payment;
      }),
      catchError(error => {
        console.error('❌ Payment details error:', error);
        return of(null);
      })
    );
  }

  // Update payment status
  updatePaymentStatus(paymentId: number, paidAmount: number, paymentMethod: string, transactionId?: string): Observable<{success: boolean, message: string}> {
    const paymentData = {
      paymentId,
      paidAmount,
      paymentMethod,
      transactionId,
      paymentDate: new Date().toISOString()
    };
    
    console.log('🔍 Updating payment:', paymentData);
    
    return this.http.put<any>(`${this.apiUrl}/Helpdesk/UpdatePayment`, paymentData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('✅ Payment updated:', response);
        return {
          success: true,
          message: 'Payment updated successfully'
        };
      }),
      catchError(error => {
        console.error('❌ Payment update error:', error);
        return of({
          success: false,
          message: 'Failed to update payment'
        });
      })
    );
  }

  // Get all payments (simple API call)
  getAllPayments(): Observable<any[]> {
    console.log('🔍 Getting all payments from /api/Payment/Payments');
    
    return this.http.get<any[]>(`${this.apiUrl}/Payment/Payments`, {
      headers: this.getHeaders()
    }).pipe(
      map(payments => {
        console.log('✅ All payments received:', payments);
        return payments || [];
      }),
      catchError(error => {
        console.error('❌ Error getting payments:', error);
        return of([]);
      })
    );
  }

  // Get patient payment history (replaced with getAllPayments)
  getPatientPaymentHistory(patientId: number): Observable<PaymentDetails[]> {
    console.log('🔍 Getting all payments (no patient-specific endpoint available)');
    return this.getAllPayments();
  }

  // ===== DASHBOARD STATS =====

  // Get helpdesk dashboard statistics (using local data since API doesn't exist)
  getHelpdeskStats(): Observable<HelpdeskStats> {
    console.log('🔍 Getting dashboard stats from local data...');
    
    // Since there's no backend API for this, return mock/calculated stats
    return of({
      totalPatients: 0, // This will be updated by the component with real patient count
      totalDoctors: 0,
      totalAppointmentsToday: 0,
      totalPendingPayments: 0,
      totalRevenue: 0,
      activeAgents: 1,
      emergencyAppointments: 0
    }).pipe(
      map(stats => {
        console.log('✅ Mock dashboard stats:', stats);
        return stats;
      })
    );
  }

  // ===== UTILITY METHODS =====

  // Load current agent from localStorage
  private loadCurrentAgent(): void {
    if (typeof localStorage !== 'undefined') {
      const agentData = localStorage.getItem('helpdesk_agent');
      if (agentData) {
        try {
          const agent = JSON.parse(agentData);
          this.currentAgentSubject.next(agent);
        } catch (error) {
          console.error('Error loading agent data:', error);
          localStorage.removeItem('helpdesk_agent');
        }
      }
    }
  }

  // Basic headers for content type only
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // Logout agent
  logout(): void {
    // Use main auth logout instead of separate helpdesk logout
    this.authService.logout();
    this.currentAgentSubject.next(null);
  }

  // Check if agent is logged in
  isLoggedIn(): boolean {
    return this.currentAgentSubject.value !== null;
  }
} 