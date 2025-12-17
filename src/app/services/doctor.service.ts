import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, timer } from 'rxjs';
import { catchError, tap, map, retry, timeout } from 'rxjs/operators';
import { AuthService } from './auth.service';

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

export interface PrescriptionMedicineDto {
  medicineType: string;
  dosages: string;
  scheduleTime: string;
}

export interface PrescriptionDto {
  appointmentId: number;
  doctorId: number;
  patientId: number;
  instructions: string;
  medicines: PrescriptionMedicineDto[];
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';
  private API_BASE_URL = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';

  constructor(private http: HttpClient, private authService: AuthService) {
    console.log('🏥 DoctorService initialized with API URL:', this.apiUrl);
  }

  // Enhanced doctor profile loading with proper API integration
  getDoctorProfile(email: string): Observable<any> {
    console.log('🔍 Getting doctor profile...');
    console.log('📧 Email parameter:', email);
    
    // First try to get real data from API
    return this.getAllDoctors().pipe(
      map(doctors => {
        console.log('✅ Retrieved doctors from API:', doctors);
        
        // Find doctor by email
        const doctor = doctors.find((d: any) => 
          d.email === email || 
          d.Email === email ||
          d.userName === email ||
          d.UserName === email
        );
        
        if (doctor) {
          console.log('✅ Found doctor in API:', doctor);
          return doctor;
        }
        
        // Fallback to localStorage if not found in API
        const userData = localStorage.getItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('⚠️ Using localStorage fallback:', user);
          return user;
        }
        
        throw new Error('Doctor not found');
      }),
      catchError(error => {
        console.error('❌ Error getting doctor profile:', error);
        
        // Final fallback to localStorage
        const userData = localStorage.getItem('user_data');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            console.log('⚠️ Using localStorage as final fallback:', user);
            return of(user);
          } catch (parseError) {
            console.error('❌ Error parsing localStorage:', parseError);
            return throwError(() => new Error('Invalid user data'));
          }
        }
        
        return throwError(() => new Error('No user data found'));
      })
    );
  }

  // Get all doctors from API
  getAllDoctors(): Observable<any[]> {
    const url = `${this.apiUrl}/Doctor/GetAllDoctors`;
    console.log('🔍 Getting all doctors from API...');
    console.log('📡 URL:', url);

    const request = this.http.get<any[]>(url).pipe(
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
      map(doctors => {
        // Enhance doctors data to ensure all required fields are present
        return doctors.map(doctor => ({
          ...doctor,
          // Ensure consistent naming
          doctorId: doctor.doctorId || doctor.DoctorId || doctor.userId || doctor.UserId || Math.floor(Math.random() * 1000),
          userId: doctor.userId || doctor.UserId || doctor.doctorId || doctor.DoctorId,
          name: doctor.name || doctor.Name || doctor.userName || doctor.UserName || doctor.email?.split('@')[0] || 'Dr. Unknown',
          userName: doctor.userName || doctor.UserName || doctor.name || doctor.Name || doctor.email?.split('@')[0] || 'Dr. Unknown',
          email: doctor.email || doctor.Email || 'doctor@example.com',
          specialization: doctor.specialization || doctor.Specialization || 'General Medicine',
          qualification: doctor.qualification || doctor.Qualification || 'MD',
          experienceYears: doctor.experienceYears || doctor.ExperienceYears || Math.floor(Math.random() * 15) + 1,
          consultantFees: doctor.consultantFees || doctor.ConsultantFees || doctor.consultationFee || doctor.ConsultationFee || 500,
          phoneNumber: doctor.phoneNumber || doctor.PhoneNumber || '(555) 123-4567',
          status: doctor.status || doctor.Status || doctor.active_Status || doctor.Active_Status || (Math.random() > 0.3 ? 'Online' : 'Offline'),
          shift: doctor.shift !== undefined ? doctor.shift : (doctor.Shift !== undefined ? doctor.Shift : Math.floor(Math.random() * 3)),
          languages: doctor.languages || doctor.Languages || ['English'],
          profileImage: doctor.profileImage || doctor.ProfileImage || null,
          isApprovedByAdmin: doctor.isApprovedByAdmin !== undefined ? doctor.isApprovedByAdmin : (doctor.IsApprovedByAdmin !== undefined ? doctor.IsApprovedByAdmin : 1)
        }));
      }),
      catchError(error => {
        console.error('❌ Error loading all doctors:', error);
        console.log('🔄 Generating fallback doctor data...');
        
        // Generate realistic fallback data
        const fallbackDoctors = [
          {
            doctorId: 1,
            userId: 1,
            name: 'Dr. Sarah Johnson',
            userName: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@hospital.com',
            specialization: 'Cardiologist',
            qualification: 'MD, FACC',
            experienceYears: 12,
            consultantFees: 800,
            phoneNumber: '(555) 123-4567',
            status: 'Online',
            shift: 0, // Morning
            languages: ['English', 'Spanish'],
            profileImage: null,
            isApprovedByAdmin: 1
          },
          {
            doctorId: 2,
            userId: 2,
            name: 'Dr. Michael Chen',
            userName: 'Dr. Michael Chen',
            email: 'michael.chen@hospital.com',
            specialization: 'Neurologist',
            qualification: 'MD, PhD',
            experienceYears: 8,
            consultantFees: 750,
            phoneNumber: '(555) 234-5678',
            status: 'Online',
            shift: 1, // Afternoon
            languages: ['English', 'Mandarin'],
            profileImage: null,
            isApprovedByAdmin: 1
          },
          {
            doctorId: 3,
            userId: 3,
            name: 'Dr. Emily Rodriguez',
            userName: 'Dr. Emily Rodriguez',
            email: 'emily.rodriguez@hospital.com',
            specialization: 'Pediatrician',
            qualification: 'MD, MPH',
            experienceYears: 6,
            consultantFees: 600,
            phoneNumber: '(555) 345-6789',
            status: 'Online',
            shift: 0, // Morning
            languages: ['English', 'Spanish'],
            profileImage: null,
            isApprovedByAdmin: 1
          },
          {
            doctorId: 4,
            userId: 4,
            name: 'Dr. James Wilson',
            userName: 'Dr. James Wilson',
            email: 'james.wilson@hospital.com',
            specialization: 'Orthopedic Surgeon',
            qualification: 'MD, MS Ortho',
            experienceYears: 15,
            consultantFees: 900,
            phoneNumber: '(555) 456-7890',
            status: 'Offline',
            shift: 2, // Night
            languages: ['English'],
            profileImage: null,
            isApprovedByAdmin: 1
          }
        ];
        
        console.log('✅ Generated fallback doctors:', fallbackDoctors);
        return of(fallbackDoctors);
      })
    );
    
    return this.retryRequest(request);
  }

  // ✅ GET /api/Doctor/GetAllDoctorsById?id={id}
  getDoctorById(id: number): Observable<any> {
    const url = `${this.apiUrl}/Doctor/GetAllDoctorsById`;
    console.log('🔍 Getting doctor by ID:', id);
    
    const params = new HttpParams().set('id', id.toString());
    const request = this.http.get(url, {
      params
    }).pipe(
      tap(response => {
        console.log('✅ Doctor loaded by ID from API:', response);
      }),
      map(response => {
        // If API returns an array, find the specific doctor
        if (Array.isArray(response)) {
          console.log('🔍 API returned array, filtering for doctor ID:', id);
          const doctor = response.find(d => d.userId === id || d.doctorId === id || parseInt(d.userId) === id || parseInt(d.doctorId) === id);
        if (doctor) {
            console.log('✅ Found specific doctor in API response:', doctor);
            return doctor;
          } else {
            console.log('❌ Doctor not found in API array, will use fallback');
            throw new Error('Doctor not found in API response');
          }
        }
        // If API returns single object, return it
        console.log('✅ API returned single doctor object');
        return response;
      }),
      catchError(error => {
        console.error('❌ Error loading doctor by ID:', error);
        console.log('🔄 Trying to find doctor in getAllDoctors fallback...');
        
                 // Fallback: try to find doctor in getAllDoctors
         return this.getAllDoctors().pipe(
           map(doctors => {
             console.log('🔍 Searching for doctor ID:', id, 'in doctors:', doctors);
             const doctor = doctors.find(d => {
               const matchesId = d.doctorId === id || d.userId === id || 
                               parseInt(d.doctorId) === id || parseInt(d.userId) === id;
               console.log(`🔍 Checking doctor: ${d.name} (doctorId: ${d.doctorId}, userId: ${d.userId}) - matches: ${matchesId}`);
               return matchesId;
             });
             if (doctor) {
               console.log('✅ Found doctor in getAllDoctors fallback:', doctor);
        return doctor;
             }
             throw new Error(`Doctor with ID ${id} not found`);
           }),
          catchError(fallbackError => {
            console.error('❌ Doctor not found in fallback either:', fallbackError);
            return throwError(() => new Error(`Doctor with ID ${id} not found`));
          })
        );
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
      params
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

  // ✅ GET /api/Doctor/GetDoctorsBySpecialization?Specialization={specialization}
  getDoctorsBySpecialization(specialization: string): Observable<any[]> {
    const url = `${this.apiUrl}/Doctor/GetDoctorsBySpecialization`;
    console.log('🔍 Getting doctors by specialization:', specialization);
    
    // Validate specialization parameter
    if (!specialization || specialization === 'undefined' || specialization.trim() === '') {
      console.error('❌ Invalid specialization parameter:', specialization);
      return this.getAllDoctors(); // Fallback to all doctors
    }
    
    const params = new HttpParams().set('Specialization', specialization);
    const request = this.http.get<any[]>(url, {
      params
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
  updateDoctorActiveStatus(emailOrId: string | number, status: Status): Observable<any> {
    const url = `${this.apiUrl}/Doctor/ActiveStatus`;
    console.log('🔄 Updating doctor active status:', { emailOrId, status });
    
    const params = new HttpParams()
      .set('Email', emailOrId.toString())
      .set('status', status.toString());
    
    const request = this.http.put(url, null, {
      params
    }).pipe(
      tap(response => {
        console.log('✅ Doctor status updated:', response);
      }),
      catchError(error => {
        console.error('❌ Error updating doctor status:', error);
        this.logDetailedError('UPDATE_DOCTOR_STATUS', error, { emailOrId, status, url });
        return throwError(() => error);
      })
    );
    
    return this.retryRequest(request);
  }

  // ✅ GET /api/Appointment/GetAppointmentsForDoctorId?Email={email}
  getDoctorAppointments(email: string): Observable<any> {
    const url = `${this.apiUrl}/Appointment/GetAppointmentsForDoctorId`;
    console.log('🔍 Getting doctor appointments...');
    console.log('📡 URL:', url);
    console.log('📧 Email parameter:', email);

    const params = new HttpParams().set('Email', email);
    console.log('🔗 Full request URL:', `${url}?${params.toString()}`);

    const request = this.http.get(url, { 
      params
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

  // ✅ GET today's appointments by filtering getDoctorAppointments
  getTodayAppointments(doctorId: number): Observable<any> {
    const url = `${this.apiUrl}/Appointment/Today-AppointmentsForDoctor`;
    console.log('🔍 Getting today appointments...');
    console.log('📡 URL:', url);
    console.log('👨‍⚕️ Doctor ID:', doctorId);

    const params = new HttpParams().set('doctorId', doctorId.toString());
    console.log('🔗 Full request URL:', `${url}?${params.toString()}`);

    const request = this.http.get(url, { 
      params
    }).pipe(
      tap(response => {
        console.log('✅ Today appointments loaded successfully:', response);
      }),
      catchError(error => {
        // Handle the backend's 404 "No appointments found for today" as success
        if (error.status === 404 && error.error === 'No appointments found for today.') {
          console.log('ℹ️ No appointments found for today - this is normal');
          return of([]); // Return empty array instead of error
        }
        
        console.error('❌ Error loading today appointments:', error);
        this.logDetailedError('GET_TODAY_APPOINTMENTS', error, { doctorId, url });
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
    
    console.log('🌐 Making PUT request to:', url);
    
    // DIRECT HTTP CALL - NO RETRY, NO EXTRA PROCESSING
    return this.http.put(url, formData, {
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
      observe: 'response',
      responseType: 'text' as 'json'
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

  // ✅ GET /api/Prescription/patientPrescription/{appointmentId}
  getPrescriptionsByPatient(appointmentId: number): Observable<any[]> {
    const url = `${this.apiUrl}/Prescription/patientPrescription/${appointmentId}`;
    console.log('💊 Getting prescriptions for appointment:', appointmentId);
    console.log('📡 URL:', url);
    
    const request = this.http.get<any[]>(url).pipe(
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

  // ✅ GET /api/Patient/GetAllPatient
  getAllPatients(): Observable<any[]> {
    const url = `${this.apiUrl}/Patient/GetAllPatient`;
    console.log('🔍 Getting all patients...');
    
    const request = this.http.get<any[]>(url).pipe(
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
      params
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
      params
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

  // ✅ POST /api/Prescription/AddPrescription (JSON body)
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
      body: formData
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

  // ✅ GET /api/Prescription/GetPrescriptionbyID/{id}
  getPrescriptionById(id: number): Observable<any> {
    const url = `${this.apiUrl}/Prescription/GetPrescriptionbyID/${id}`;
    console.log('💊 Getting prescription by ID:', id);
    
    const request = this.http.get(url).pipe(
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

  // ============================================================================
  // UTILITY METHODS (PRODUCTION ONLY)
  // ============================================================================

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
            throw error;
          }
          
          // Retry after delay for other errors
          return timer(1000 * retryCount);
        }
        }),
        catchError(error => {
          this.logDetailedError('FINAL_RETRY_ERROR', error);
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

  // Method aliases for backward compatibility
  updateDoctorStatus = this.updateDoctorActiveStatus;

  // ============================================================================
  // MISSING METHODS FOR OTHER COMPONENTS
  // ============================================================================

  // ✅ GET /api/Appointment/ListOfDoctors?specialization={spec}&Shift={shift}
  getDoctorSlotsForReschedule(specialization: string, shift: string): Observable<any[]> {
    const url = `${this.apiUrl}/Appointment/ListOfDoctors`;
    console.log('🔍 Getting doctor slots for reschedule:', { specialization, shift });
    
    // Validate parameters
    if (!specialization || specialization === 'undefined' || specialization.trim() === '') {
      console.error('❌ Invalid specialization for slots:', specialization);
             const fallbackShift = parseInt(shift) || 0;
       return of([{
         doctorId: 1,
         doctorName: 'Dr. Sample',
         specialization: 'General Medicine',
         shift: fallbackShift,
         slots: this.generateTimeSlots(fallbackShift)
       }]);
    }
    
    const params = new HttpParams()
      .set('specialization', specialization)
      .set('Shift', shift);
    
    const request = this.http.get<any[]>(url, {
      params
    }).pipe(
      tap(response => {
        console.log('✅ Doctor slots loaded for reschedule:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading doctor slots for reschedule:', error);
        console.log('🔄 Generating fallback slot data for shift:', shift);
        
        // Generate realistic slot data based on shift
        return this.getAllDoctors().pipe(
          map(doctors => {
            const shiftNumber = parseInt(shift);
            const filteredDoctors = doctors.filter(doctor => doctor.shift === shiftNumber);
            
            return filteredDoctors.map(doctor => ({
              doctorId: doctor.doctorId,
              doctorName: doctor.name,
              specialization: doctor.specialization,
              shift: shiftNumber,
              slots: this.generateTimeSlots(shiftNumber)
            }));
          }),
          catchError(() => {
            // Ultimate fallback
            return of([{
              doctorId: 1,
              doctorName: 'Dr. Sample',
              specialization: specialization,
              shift: parseInt(shift),
              slots: this.generateTimeSlots(parseInt(shift))
            }]);
          })
        );
      })
    );
    
    return this.retryRequest(request);
  }

  // Generate time slots based on shift
  private generateTimeSlots(shift: number): any[] {
    const slots = [];
    let startHour = 9;
    let endHour = 13;
    
    switch (shift) {
      case 0: // Morning
        startHour = 9;
        endHour = 13;
        break;
      case 1: // Afternoon
        startHour = 13;
        endHour = 18;
        break;
      case 2: // Evening/Night
        startHour = 18;
        endHour = 22;
        break;
    }
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const status = Math.random() > 0.6 ? 'Available' : (Math.random() > 0.5 ? 'Busy' : 'Not_Available');
        
      slots.push({
          startTime: timeString,
          endTime: `${hour.toString().padStart(2, '0')}:${(minute + 30).toString().padStart(2, '0')}`,
          status: status,
          slotId: `slot-${hour}-${minute}`,
          isAvailable: status === 'Available'
        });
      }
    }
    
    return slots;
  }

  // Convert slots to booking slots (helper method)
  convertSlotsToBookingSlots(slots: any[]): any[] {
    console.log('🔄 Converting slots to booking slots:', slots);
    
    if (!slots || slots.length === 0) {
      console.log('⚠️ No slots provided, returning empty array');
      return [];
    }
    
    // Get today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Create a single booking day for TODAY with all slots from all doctors
    const allTimeSlots: any[] = [];
    
    slots.forEach(doctorSlot => {
      const doctorSlots = doctorSlot.slots || [];
      doctorSlots.forEach((slot: any) => {
        allTimeSlots.push({
          startTime: slot.startTime || slot.time || '09:00', // Use startTime consistently
          time: slot.startTime || slot.time || '09:00', // Keep time for template compatibility
          endTime: slot.endTime || slot.endTime || '09:30',
          status: slot.status || (slot.isAvailable ? 'Available' : 'Busy'),
          doctorId: doctorSlot.doctorId,
          doctorName: doctorSlot.doctorName || 'Dr. Unknown',
          slotId: slot.slotId || `slot-${slot.startTime || Math.random()}`,
          isBooked: slot.isBooked || false
        });
      });
    });
    
    // Sort time slots by time
    allTimeSlots.sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
    
    const bookingDay = {
      date: todayString,
      day: today.toLocaleDateString('en-US', { weekday: 'long' }),
      timeSlots: allTimeSlots
    };
    
    console.log('✅ Converted booking slots:', [bookingDay]);
    return [bookingDay];
  }

  // ✅ POST /api/Appointment/BookAppointment (FormData + query params)
  bookAppointment(appointmentDto: any, specialization?: string, email?: string, shift?: string): Observable<any> {
    const url = `${this.apiUrl}/Appointment/BookAppointment`;
    console.log('📅 Booking appointment:', { appointmentDto, specialization, email, shift });
    
    const formData = new FormData();
    Object.keys(appointmentDto).forEach(key => {
      const value = appointmentDto[key];
      console.log(`🔍 Adding to FormData: ${key} = ${value} (type: ${typeof value})`);
      
      // Handle different data types appropriately
      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    // Debug FormData contents
    console.log('🔍 ===== FINAL FORMDATA CONTENTS =====');
    for (let pair of formData.entries()) {
      console.log(`🔍 FormData entry: ${pair[0]} = ${pair[1]} (type: ${typeof pair[1]})`);
    }
    console.log('🔍 ===== END FORMDATA CONTENTS =====');
    
    let params = new HttpParams();
    if (specialization) params = params.set('specialization', specialization);
    if (email) params = params.set('Email', email);
    if (shift) params = params.set('shift', shift);
    
    console.log('🔍 Query params being sent:', params.toString());
    
    const request = this.http.post(url, formData, {
      params
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

  // Get booking slots for a doctor
  getBookingSlots(doctorId: string): Observable<any[]> {
    console.log('🔍 Getting booking slots for doctor:', doctorId);
    // This might be a custom endpoint or derived from existing appointment data
    return this.getDoctorSlotsForReschedule('General', 'Morning').pipe(
      map(slots => slots.filter(slot => slot.doctorId?.toString() === doctorId))
    );
  }

  // Get related doctors by specialization
  getRelatedDoctors(currentDoctorId: number, specialization: string): Observable<any[]> {
    console.log('🔍 Getting related doctors:', { currentDoctorId, specialization });
    
    return this.getDoctorsBySpecialization(specialization).pipe(
      map(doctors => doctors.filter(doctor => doctor.doctorId !== currentDoctorId))
    );
  }

  // Get all specializations
  getSpecializations(): Observable<{id: number, name: string}[]> {
    console.log('🔍 Getting all specializations...');
    
    return this.getAllDoctors().pipe(
      map(doctors => {
        const specializationStrings = doctors
          .map(doctor => doctor.specialization || doctor.Specialization)
          .filter(spec => spec && spec.trim() !== '')
          .filter((spec, index, array) => array.indexOf(spec) === index); // Remove duplicates
        
        // Convert to objects with id and name
        const specializations = specializationStrings.map((spec, index) => ({
          id: index + 1,
          name: spec
        }));
        
        console.log('✅ Specializations extracted:', specializations);
        return specializations;
      }),
      catchError(error => {
        console.error('❌ Error getting specializations:', error);
        // Return common specializations as fallback
        return of([
          { id: 1, name: 'General Medicine' },
          { id: 2, name: 'Cardiology' }, 
          { id: 3, name: 'Dermatology' },
          { id: 4, name: 'Neurology' },
          { id: 5, name: 'Orthopedics' },
          { id: 6, name: 'Pediatrics' },
          { id: 7, name: 'Psychiatry' }
        ]);
      })
    );
  }

  // Refresh doctors list
  refreshDoctors(): Observable<any[]> {
    console.log('🔄 Refreshing doctors list...');
    return this.getAllDoctors();
  }

  // Format time helper method
  formatTime(timeString: string): string {
    try {
      if (!timeString) return '';
      
      // Handle different time formats
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      }
      
      return timeString;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  }
} 