import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, timer } from 'rxjs';
import { catchError, tap, map, retry,} from 'rxjs/operators';
import { AuthService } from './auth.service'; // Added import for AuthService

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

export enum TabletScheduleTime {
  Morning = 0,
  Afternoon = 1,
  Evening = 2,
  Night = 3,
  AfterMeal = 4,
  BeforeMeal = 5
}

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

export interface PrescriptionMedicineDto {
  medicineType: MedicineType;
  dosages: DosageType;
  scheduleTime: TabletScheduleTime;
}

export interface PrescriptionDto {
  appointmentId: number;
  doctorId: number;
  patientId: number;
  instructions: string;
  medicines: PrescriptionMedicineDto[];
}

export interface PrescriptionResponse {
  success: boolean;
  message: string;
}

export interface DoctorProfile {
  userId: number;
  userName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  languages?: string[];
  status?: Status;
  shift?: number;
  shiftStartTime?: string | any;
  shiftEndTime?: string | any;
  isApprovedByAdmin?: number;
  createdAt?: string;
}

export interface DoctorAppointment {
  appointmentId: number;
  appointmentDate: string;
  appointmentStartTime?: string;
  appointmentEndTime?: string;
  appointmentStatus: AppointmentStatus;
  patientId: number;
  patientName?: string;
  doctorId: number;
  doctorName?: string;
  specialization?: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  isReminderSent?: boolean;
  hasPrescription?: boolean;
  prescriptionAdded?: boolean;
}

export interface DoctorAppointmentUpdateDto {
  isAttended: boolean;
}

export interface UpdateStatusRequest {
  status: Status;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';
  private API_BASE_URL = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';

  constructor(private http: HttpClient, private authService: AuthService) { // Added AuthService to constructor
    console.log('🏥 DoctorService initialized with API URL:', this.apiUrl);
  }



  
  getDoctorProfile(email: string): Observable<any> {
    console.log('🔍 Getting doctor profile...');
    console.log('📧 Email parameter:', email);
    
    // Try to get doctor profile from API first, fallback to localStorage
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('✅ Doctor profile loaded from localStorage:', user);
        
        // Enhance with additional doctor-specific data from GetAllDoctors endpoint
        return this.getAllDoctors().pipe(
          tap(doctors => {
            const currentDoctor = doctors.find((d: any) => d.email === email || d.userId === user.userId);
            if (currentDoctor) {
              console.log('✅ Found doctor details from API:', currentDoctor);
              console.log('🔍 Doctor shift data from API:', {
                shift: currentDoctor.shift,
                Shift: currentDoctor.Shift,
                shiftTime: currentDoctor.shiftTime,
                ShiftTime: currentDoctor.ShiftTime
              });
              Object.assign(user, currentDoctor);
            }
          }),
          catchError(error => {
            console.warn('⚠️ Could not enhance profile from API, using localStorage only:', error);
            return of(user);
          }),
          map(() => user)
        );
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return throwError(() => new Error('Invalid user data'));
      }
    } else {
      console.error('❌ No user data found in localStorage');
      return throwError(() => new Error('No user data found'));
    }
  }

  // Get all doctors from API
  getAllDoctors(): Observable<any[]> {
    const url = `${this.apiUrl}/Doctor/GetAllDoctors`;
    console.log('🔍 Getting all doctors from API...');
    console.log('📡 URL:', url);

    const request = this.http.get<any[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ All doctors loaded successfully:', response);
        if (response && response.length > 0) {
          console.log('🔍 First doctor data structure:', response[0]);
          console.log('🔍 Shift properties:', {
            'shift': response[0].shift,
            'Shift': response[0].Shift,
            'shiftStartTime': response[0].shiftStartTime,
            'ShiftStartTime': response[0].ShiftStartTime
          });
        }
      }),
      catchError(error => {
        console.error('❌ Error loading all doctors:', error);
        this.logDetailedError('GET_ALL_DOCTORS', error, { url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }

  // ===========================================
  // COMPREHENSIVE API INTEGRATION
  // ===========================================
  
  // 1. DOCTOR CONTROLLER ENDPOINTS
  // ===========================================
  
  // ✅ GET /api/Doctor/GetAllDoctors - Working (already implemented)
  // ✅ Kept existing getAllDoctors() method
  
  // ✅ GET /api/Doctor/GetAllDoctorsById?id={id}
  getDoctorById(id: number): Observable<any> {
    const url = `${this.apiUrl}/Doctor/GetAllDoctorsById`;
    console.log('🔍 Getting doctor by ID:', id);
    
    const params = new HttpParams().set('id', id.toString());
    const request = this.http.get(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Doctor loaded by ID:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading doctor by ID:', error);
        this.logDetailedError('GET_DOCTOR_BY_ID', error, { id, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Doctor/GetDoctorsByName?name={name}
  getDoctorsByName(name: string): Observable<any[]> {
    const url = `${this.apiUrl}/Doctor/GetDoctorsByName`;
    console.log('🔍 Getting doctors by name:', name);
    
    const params = new HttpParams().set('name', name);
    const request = this.http.get<any[]>(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Doctors loaded by name:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading doctors by name:', error);
        this.logDetailedError('GET_DOCTORS_BY_NAME', error, { name, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Doctor/GetDoctorsBySpecialization?Specializaition={specialization}
  getDoctorsBySpecialization(specialization: string): Observable<any[]> {
    const url = `${this.apiUrl}/Doctor/GetDoctorsBySpecialization`;
    console.log('🔍 Getting doctors by specialization:', specialization);
    
    const params = new HttpParams().set('Specializaition', specialization);
    const request = this.http.get<any[]>(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Doctors loaded by specialization:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading doctors by specialization:', error);
        this.logDetailedError('GET_DOCTORS_BY_SPECIALIZATION', error, { specialization, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ PUT /api/Doctor/ActiveStatus?Email={email}&status={status}
  updateDoctorActiveStatus(email: string, status: Status): Observable<any> {
    const url = `${this.apiUrl}/Doctor/ActiveStatus`;
    console.log('🔄 Updating doctor active status:', { email, status });
    
    const params = new HttpParams()
      .set('Email', email)
      .set('status', status.toString());
    
    const request = this.http.put(url, null, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Doctor status updated:', response);
      }),
      catchError(error => {
        console.error('❌ Error updating doctor status:', error);
        this.logDetailedError('UPDATE_DOCTOR_STATUS', error, { email, status, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }

  // ===========================================
  // 2. APPOINTMENT CONTROLLER ENDPOINTS
  // ===========================================
  
  // ✅ GET /api/Appointment/ListOfDoctors?specialization={spec}&Shift={shift}
  getDoctorSlots(specialization: string, shift: string): Observable<any[]> {
    const url = `${this.apiUrl}/Appointment/ListOfDoctors`;
    console.log('🔍 Getting doctor slots:', { specialization, shift });
    
    const params = new HttpParams()
      .set('specialization', specialization)
      .set('Shift', shift);
    
    const request = this.http.get<any[]>(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Doctor slots loaded:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading doctor slots:', error);
        this.logDetailedError('GET_DOCTOR_SLOTS', error, { specialization, shift, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ POST /api/Appointment/BookAppointment (FormData + query params)
  bookAppointment(appointmentDto: any, specialization: string, email: string, shift: string): Observable<any> {
    const url = `${this.apiUrl}/Appointment/BookAppointment`;
    console.log('📅 Booking appointment:', { appointmentDto, specialization, email, shift });
    
    const formData = new FormData();
    Object.keys(appointmentDto).forEach(key => {
      formData.append(key, appointmentDto[key]);
    });
    
    const params = new HttpParams()
      .set('specialization', specialization)
      .set('Email', email)
      .set('shift', shift);
    
    const request = this.http.post(url, formData, {
      params,
      headers: this.getAuthHeadersForFormData()
    }).pipe(
      tap(response => {
        console.log('✅ Appointment booked:', response);
      }),
      catchError(error => {
        console.error('❌ Error booking appointment:', error);
        this.logDetailedError('BOOK_APPOINTMENT', error, { appointmentDto, specialization, email, shift, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ PUT /api/Appointment/Reschedule (FormData + query params)
  rescheduleAppointment(email: string, rescheduleDto: any): Observable<any> {
    const url = `${this.apiUrl}/Appointment/Reschedule`;
    console.log('🔄 Rescheduling appointment:', { email, rescheduleDto });
    
    const formData = new FormData();
    Object.keys(rescheduleDto).forEach(key => {
      formData.append(key, rescheduleDto[key]);
    });
    
    const params = new HttpParams().set('email', email);
    
    const request = this.http.put(url, formData, {
      params,
      headers: this.getAuthHeadersForFormData()
    }).pipe(
      tap(response => {
        console.log('✅ Appointment rescheduled:', response);
      }),
      catchError(error => {
        console.error('❌ Error rescheduling appointment:', error);
        this.logDetailedError('RESCHEDULE_APPOINTMENT', error, { email, rescheduleDto, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ PUT /api/Appointment/Cancelled (FormData)
  cancelAppointment(email: string): Observable<any> {
    const url = `${this.apiUrl}/Appointment/Cancelled`;
    console.log('❌ Cancelling appointment for:', email);
    
    const formData = new FormData();
    formData.append('Email', email);
    
    const request = this.http.put(url, formData, {
      headers: this.getAuthHeadersForFormData()
    }).pipe(
      tap(response => {
        console.log('✅ Appointment cancelled:', response);
      }),
      catchError(error => {
        console.error('❌ Error cancelling appointment:', error);
        this.logDetailedError('CANCEL_APPOINTMENT', error, { email, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Appointment/GetAppointmentsForDoctorId?Email={email} - Fixed
  getDoctorAppointments(email: string): Observable<any> {
    const url = `${this.apiUrl}/Appointment/GetAppointmentsForDoctorId`;
    console.log('🔍 Getting doctor appointments...');
    console.log('📡 URL:', url);
    console.log('📧 Email parameter:', email);

    const params = new HttpParams().set('Email', email);
    console.log('🔗 Full request URL:', `${url}?${params.toString()}`);

    const request = this.http.get(url, { 
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Doctor appointments loaded successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading doctor appointments:', error);
        this.logDetailedError('GET_DOCTOR_APPOINTMENTS', error, { email, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ PUT /api/Appointment/UpdateAppointmentStatus-NotAttended-NotCompleted (FormData)
  updateAppointmentStatus(appointmentId: number, updateDto: any): Observable<string> {
    const url = `${this.apiUrl}/Appointment/UpdateAppointmentStatus-NotAttended-NotCompleted`;
    console.log('🔄 DoctorService: Updating appointment status:', { appointmentId, updateDto, url });
    
    const formData = new FormData();
    formData.append('AppointmentId', appointmentId.toString());
    console.log('📎 Added AppointmentId to FormData:', appointmentId.toString());
    
    Object.keys(updateDto).forEach(key => {
      const value = updateDto[key];
      formData.append(key, value);
      console.log(`📎 Added to FormData: ${key} = ${value} (type: ${typeof value})`);
    });
    
    // Log all FormData contents
    console.log('📋 Complete FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    console.log('🌐 Making PUT request to:', url);
    console.log('🔐 Auth headers being used...');
    
    // DIRECT HTTP CALL - NO RETRY, NO EXTRA PROCESSING
    return this.http.put(url, formData, {
      headers: this.getAuthHeadersForFormData(),
      responseType: 'text' // Backend returns text, not JSON
    }).pipe(
      tap(response => {
        console.log('✅ DoctorService: Appointment status updated successfully:', response);
      }),
      catchError(error => {
        console.error('❌ DoctorService: DIRECT ERROR (no retry):', error);
        
        // Handle timeout specifically
        if (error.name === 'TimeoutError') {
          console.error('⏰ Request timed out after 30 seconds');
          error.message = 'Request timed out - please try again';
        }
        
        console.error('❌ Direct error details:', {
          status: error.status,
          message: error.message,
          url: error.url
        });
        
        return throwError(() => error);
      })
    );
  }
  
  // SIMPLE VERSION - Direct update without complex handling
  updateAppointmentStatusSimple(appointmentId: number, isCompleted: boolean): Observable<any> {
    const url = `${this.apiUrl}/Appointment/UpdateAppointmentStatus-NotAttended-NotCompleted`;
    console.log('🔄 SIMPLE: Updating appointment:', appointmentId, 'isCompleted:', isCompleted);
    
    const formData = new FormData();
    formData.append('AppointmentId', appointmentId.toString());
    formData.append('IsCompleted', isCompleted.toString());
    formData.append('IsAttended', isCompleted.toString());
    
    console.log('📋 SIMPLE FormData:', {
      AppointmentId: appointmentId.toString(),
      IsCompleted: isCompleted.toString(),
      IsAttended: isCompleted.toString()
    });
    
    return this.http.put(url, formData, {
      headers: this.getAuthHeadersForFormData(),
      observe: 'response', // Get full response
      responseType: 'text' as 'json' // Force text handling
    }).pipe(
      map((response: any) => {
        console.log('✅ SIMPLE SUCCESS - Full response:', response);
        console.log('✅ SIMPLE SUCCESS - Status:', response.status);
        console.log('✅ SIMPLE SUCCESS - Body:', response.body);
        return response.body || 'Success';
      }),
      catchError(error => {
        console.error('❌ SIMPLE ERROR:', error);
        // Even if parsing fails, if status is 200, consider it success
        if (error.status === 200) {
          console.log('✅ SIMPLE: Status 200 but parsing failed - treating as success');
          return of('Success - parsing issue but update worked');
        }
        return throwError(() => error);
      })
    );
  }
  
  // RAW XMLHttpRequest method - ultimate fallback
  updateAppointmentStatusRaw(appointmentId: number, isCompleted: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.apiUrl}/Appointment/UpdateAppointmentStatus-NotAttended-NotCompleted`;
      
      console.log('🔧 RAW: Using XMLHttpRequest for appointment:', appointmentId);
      
      xhr.open('PUT', url, true);
      
      // Set headers
      const token = this.authService.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = function() {
        console.log('🔧 RAW: Status:', xhr.status);
        console.log('🔧 RAW: Response:', xhr.responseText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ RAW: Success!');
          resolve(xhr.responseText || 'Success');
        } else {
          console.error('❌ RAW: HTTP Error:', xhr.status, xhr.statusText);
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        console.error('❌ RAW: Network error');
        reject(new Error('Network error'));
      };
      
      // Prepare form data
      const formData = new FormData();
      formData.append('AppointmentId', appointmentId.toString());
      formData.append('IsCompleted', isCompleted.toString());
      formData.append('IsAttended', isCompleted.toString());
      
      console.log('🔧 RAW: Sending request...');
      xhr.send(formData);
    });
  }
  
  // ✅ GET /api/Appointment/GetAppointmentsByPatientId?PatId={patientId}
  getAppointmentsByPatientId(patientId: number): Observable<any[]> {
    const url = `${this.apiUrl}/Appointment/GetAppointmentsByPatientId`;
    console.log('🔍 Getting appointments for patient:', patientId);
    
    const params = new HttpParams().set('PatId', patientId.toString());
    
    const request = this.http.get<any[]>(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Patient appointments loaded:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading patient appointments:', error);
        this.logDetailedError('GET_PATIENT_APPOINTMENTS', error, { patientId, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Appointment/GetPatientMedicalHistoriesById?id={id}
  getPatientMedicalHistory(patientId: number): Observable<Blob> {
    const url = `${this.apiUrl}/Appointment/GetPatientMedicalHistoriesById`;
    console.log('🔍 Getting patient medical history:', patientId);
    
    const params = new HttpParams().set('id', patientId.toString());
    
    const request = this.http.get(url, {
      params,
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(
      tap(response => {
        console.log('✅ Patient medical history loaded:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading patient medical history:', error);
        this.logDetailedError('GET_PATIENT_MEDICAL_HISTORY', error, { patientId, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Appointment/Today-AppointmentsForDoctor?doctorId={doctorId} - Fixed
  getTodayAppointments(doctorId: number): Observable<any> {
    const url = `${this.apiUrl}/Appointment/Today-AppointmentsForDoctor`;
    console.log('🔍 Getting today appointments...');
    console.log('📡 URL:', url);
    console.log('👨‍⚕️ Doctor ID:', doctorId);

    const params = new HttpParams().set('doctorId', doctorId.toString());
    console.log('🔗 Full request URL:', `${url}?${params.toString()}`);

    const request = this.http.get(url, { 
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Today appointments loaded successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading today appointments:', error);
        this.logDetailedError('GET_TODAY_APPOINTMENTS', error, { doctorId, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }

  // ===========================================
  // 6. UTILITY METHODS (PRODUCTION ONLY)
  // ===========================================

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();  // Use AuthService instead of localStorage
    console.log('🔑 JWT Token for API request:', token ? 'Present (length: ' + token.length + ')' : 'Missing');
    
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
    
    console.log('📡 Request headers prepared');
    return headers;
  }

  private getAuthHeadersForFormData(): HttpHeaders {
    const token = this.authService.getToken();  // Use AuthService instead of localStorage
    console.log('🔐 Getting token for FormData headers:', token ? 'Token found' : 'No token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Retry mechanism for failed requests (production)
  private retryRequest<T>(request: Observable<T>, retries: number = 2): Observable<T> {
    return request.pipe(
      retry({
        count: retries,
        delay: (error, retryCount) => {
          console.log(`🔄 Retrying request (attempt ${retryCount + 1}):`, error.status);
          
          // If 401, don't retry - authentication issue
          if (error.status === 401) {
            console.log('🚨 401 Unauthorized - stopping retries');
            console.log('⚠️ NOT clearing tokens automatically to prevent unwanted logout');
            // REMOVED: Automatic token clearing that causes logout
            // localStorage.removeItem('jwt_token');
            // localStorage.removeItem('user_data');
            throw error;
          }
          
          // Retry after delay for other errors
          return timer(1000 * retryCount);
        }
      }),
      catchError(error => {
        console.log('❌ Request failed after retries:', error);
        return throwError(() => error);
      })
    );
  }

  // Comprehensive error logging method
  private logDetailedError(operation: string, error: any, context?: any): void {
    console.log('🚨 DETAILED ERROR ANALYSIS -', operation);
    console.log('📍 Operation:', operation);
    if (context) {
      Object.keys(context).forEach(key => {
        console.log(`🔗 ${key}:`, context[key]);
      });
    }
    console.log('📊 Status Code:', error.status);
    console.log('📊 Status Text:', error.statusText);
    console.log('🔍 Error Name:', error.name);
    console.log('💬 Error Message:', error.message);
    if (error.error) {
      console.log('📝 Error Details:', error.error);
    }
    console.log('🕒 Timestamp:', new Date().toISOString());
  }



  // Patient Management Methods
  // ===========================================
  // 3. PATIENT CONTROLLER ENDPOINTS
  // ===========================================
  
  // ✅ GET /api/Patient/GetAllPatient
  getAllPatients(): Observable<any[]> {
    const url = `${this.apiUrl}/Patient/GetAllPatient`;
    console.log('🔍 Getting all patients...');
    
    const request = this.http.get<any[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ All patients loaded:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading all patients:', error);
        this.logDetailedError('GET_ALL_PATIENTS', error, { url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Patient/GetPatientByName?name={name}
  getPatientsByName(name: string): Observable<any[]> {
    const url = `${this.apiUrl}/Patient/GetPatientByName`;
    console.log('🔍 Getting patients by name:', name);
    
    const params = new HttpParams().set('name', name);
    const request = this.http.get<any[]>(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Patients loaded by name:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading patients by name:', error);
        this.logDetailedError('GET_PATIENTS_BY_NAME', error, { name, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Patient/GetPatientById?id={id}
  getPatientById(id: number): Observable<any> {
    const url = `${this.apiUrl}/Patient/GetPatientById`;
    console.log('🔍 Getting patient by ID:', id);
    
    const params = new HttpParams().set('id', id.toString());
    const request = this.http.get(url, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Patient loaded by ID:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading patient by ID:', error);
        this.logDetailedError('GET_PATIENT_BY_ID', error, { id, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }

  // ===========================================
  // 4. PRESCRIPTION CONTROLLER ENDPOINTS
  // ===========================================
  
  // ✅ POST /api/Prescription/AddPrescription (JSON body) - Updated
  addPrescription(prescriptionDto: any): Observable<any> {
    const url = `${this.apiUrl}/Prescription/AddPrescription`;
    console.log('💊 Adding prescription:', prescriptionDto);
    
    const request = this.http.post(url, prescriptionDto, {
      responseType: 'text'
    }).pipe(
      tap(response => {
        console.log('✅ Prescription added:', response);
      }),
      catchError(error => {
        console.error('❌ Error adding prescription:', error);
        this.logDetailedError('ADD_PRESCRIPTION', error, { prescriptionDto, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ DELETE /api/Prescription/deletePrescription/{id} (FormData)
  deletePrescription(id: number): Observable<any> {
    const url = `${this.apiUrl}/Prescription/deletePrescription/${id}`;
    console.log('🗑️ Deleting prescription:', id);
    
    const formData = new FormData();
    formData.append('id', id.toString());
    
    const request = this.http.delete(url, {
      body: formData,
      headers: this.getAuthHeadersForFormData()
    }).pipe(
      tap(response => {
        console.log('✅ Prescription deleted:', response);
      }),
      catchError(error => {
        console.error('❌ Error deleting prescription:', error);
        this.logDetailedError('DELETE_PRESCRIPTION', error, { id, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Prescription/patientPrescription/{appointmentId}
  getPrescriptionsByPatient(appointmentId: number): Observable<any[]> {
    const url = `${this.apiUrl}/Prescription/patientPrescription/${appointmentId}`;
    console.log('💊 Getting prescriptions for appointment:', appointmentId);
    console.log('📡 URL:', url);
    
    const request = this.http.get<any[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Patient prescriptions loaded:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading patient prescriptions:', error);
        this.logDetailedError('GET_PATIENT_PRESCRIPTIONS', error, { appointmentId, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }
  
  // ✅ GET /api/Prescription/GetPrescriptionbyID/{id}
  getPrescriptionById(id: number): Observable<any> {
    const url = `${this.apiUrl}/Prescription/GetPrescriptionbyID/${id}`;
    console.log('💊 Getting prescription by ID:', id);
    
    const request = this.http.get(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('✅ Prescription loaded by ID:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading prescription by ID:', error);
        this.logDetailedError('GET_PRESCRIPTION_BY_ID', error, { id, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }



  // Enhanced Prescription Management
  // This method is now handled by getPrescriptionsByPatient

  // Medical History Management
  // This method is now handled by getPatientMedicalHistory

  // Appointment Analytics and Statistics
  getAppointmentStatistics(doctorEmail: string): Observable<any> {
    console.log('🔍 Getting appointment statistics for doctor:', doctorEmail);
    
    return this.getDoctorAppointments(doctorEmail).pipe(
      tap(appointments => {
        const stats = this.calculateAppointmentStatistics(appointments);
        console.log('✅ Appointment statistics calculated:', stats);
      }),
      catchError(error => {
        console.error('❌ Error getting appointment statistics:', error);
        return throwError(() => error);
      })
    );
  }

  private calculateAppointmentStatistics(appointments: any[]): any {
    if (!appointments || appointments.length === 0) {
      return {
        total: 0,
        completed: 0,
        scheduled: 0,
        notAttended: 0,
        cancelled: 0,
        completionRate: 0,
        attendanceRate: 0
      };
    }

    const stats = {
      total: appointments.length,
      completed: appointments.filter(a => a.appointmentStatus === 'Completed').length,
      scheduled: appointments.filter(a => a.appointmentStatus === 'Scheduled').length,
      notAttended: appointments.filter(a => a.appointmentStatus === 'NotAttended').length,
      cancelled: appointments.filter(a => a.appointmentStatus === 'Cancelled').length,
      completionRate: 0,
      attendanceRate: 0
    };

    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    stats.attendanceRate = stats.total > 0 ? ((stats.completed + stats.scheduled) / stats.total) * 100 : 0;

    return stats;
  }

  // Enhanced Doctor Profile Management

  // This method is now handled by getDoctorProfile

  // Enhanced error handling with fallback to mock data
  private handleApiErrorWithFallback<T>(error: any, fallbackData: T, operationName: string): Observable<T> {
    console.log(`⚠️ ${operationName} failed, using fallback data:`, error.status);
    
    if (error.status === 401) {
      console.log('🚨 Unauthorized - token may be expired');
      // In a real app, you might want to redirect to login here
    }
    
    console.log(`🔄 Providing mock data for ${operationName}`);
    
    // Add a visual notification to the user
    this.showFallbackNotification(operationName);
    
    return of(fallbackData);
  }

  private showFallbackNotification(operationName: string): void {
    // Create a simple notification for the user
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 9999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 300px;
    `;
    notification.innerHTML = `
      <strong>🔄 Development Mode</strong><br>
      Using demo data for ${operationName.replace(/_/g, ' ').toLowerCase()}
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

} 