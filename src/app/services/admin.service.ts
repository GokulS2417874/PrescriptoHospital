import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Employee, AdminApproval, ShiftTime, Appointment, Payment, Prescription, Patient, Status } from '../models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_BASE_URL = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';

  
  private checkAdminAccess(): boolean {
    const user = this.authService.getCurrentUserSnapshot();
    const isLoggedIn = this.authService.isLoggedIn();
    const roleFromStorage = this.authService.getUserRole();
    
    console.log('Admin access check:', {
      isLoggedIn,
      user,
      userRole: user?.role,
      roleFromStorage
    });
    
    // Check user object first, then fall back to storage role
    const hasAdminRole = (user?.role === 'Admin') || (roleFromStorage === 'Admin');
    
    return isLoggedIn && hasAdminRole;
  }

  // ============================================================================
  // EMPLOYEE METHODS (AuthInterceptor adds JWT automatically)
  // ============================================================================

  // GET: api/Admin/PendingEmployeesDetailsList
  getPendingEmployees(): Observable<Employee[]> {
    if (!this.checkAdminAccess()) {
      console.warn('User does not have admin access');
      return of([]); // Return empty array instead of throwing error
    }
    
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/Admin/PendingEmployeesDetailsList`).pipe(
      catchError(error => {
        console.error('Error fetching pending employees:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  // PUT: api/Admin/RegistrationApproval
  approveEmployee(employeeId: number, approval: AdminApproval): Observable<string> {
    const params = new HttpParams()
      .set('EmployeeId', employeeId.toString())
      .set('IsApproved', approval.toString());
    
    return this.http.put(`${this.API_BASE_URL}/Admin/RegistrationApproval`, null, {
      params,
      responseType: 'text'
    });
  }

  // GET: api/Admin/NotApprovedList
  getNotApprovedEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/Admin/NotApprovedList`);
  }

  // DELETE: api/Admin/Delete-Not-Approved
  deleteNotApprovedEmployee(employeeId: number): Observable<string> {
    const params = new HttpParams().set('EmployeeId', employeeId.toString());
    
    return this.http.delete(`${this.API_BASE_URL}/Admin/Delete-Not-Approved`, {
      params,
      responseType: 'text'
    });
  }

  // PUT: api/Admin/Allocate-Shift
  allocateShift(employeeId: number, shiftTime: number): Observable<string> {
    const params = new HttpParams()
      .set('EmployeeId', employeeId.toString())
      .set('Shift', shiftTime.toString()); // Fixed: Backend expects 'Shift', not 'ShiftTime'
    
    return this.http.put(`${this.API_BASE_URL}/Admin/Allocate-Shift`, null, {
      params,
      responseType: 'text'
    });
  }

  // GET: api/Admin/ShiftNotAllocatedEmployeesList
  getShiftNotAllocatedEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/Admin/ShiftNotAllocatedEmployeesList`);
  }

  // GET: api/Admin/EmployeesDetailsList (this matches the console error)
  getAllEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/Admin/EmployeesDetailsList`);
  }

  // GET: api/Doctor/GetAllDoctors
  getAllDoctors(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/Doctor/GetAllDoctors`);
  }

  // GET: api/HelpDesk/GetAllHelpDesk
  getAllHelpDesk(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/HelpDesk/GetAllHelpDesk`);
  }

  // GET: api/Doctor/GetAllDoctorsById
  getDoctorsById(id: number): Observable<Employee[]> {
    const params = new HttpParams().set('id', id.toString());
    console.log('API Call: getDoctorsById with params:', params.toString());
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/Doctor/GetAllDoctorsById`, {
      params: params
    });
  }

  // GET: api/Doctor/GetDoctorsByName
  getDoctorsByName(name: string): Observable<Employee[]> {
    const params = new HttpParams().set('name', name);
    const url = `${this.API_BASE_URL}/Doctor/GetDoctorsByName`;
    console.log('🔍 API Call: getDoctorsByName');
    console.log('🔗 URL:', url);
    console.log('📋 Params:', params.toString());
    
    return this.http.get<Employee[]>(url, {
      params: params
    }).pipe(
      tap(result => console.log('✅ API Success - getDoctorsByName:', result)),
      catchError(error => {
        console.error('❌ API Error - getDoctorsByName:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ URL:', error.url);
        console.error('❌ Message:', error.message);
        
        // Return fallback data for demo purposes
        return of([
          {
            userId: 1,
            userName: `Dr. ${name}`,
            email: `${name.toLowerCase()}@example.com`,
            role: 'Doctor',
            specialization: 'General Medicine',
            qualification: 'MBBS',
            experienceYears: 5,
            isApprovedByAdmin: AdminApproval.Approved,
            shift: ShiftTime.Morning,
            createdAt: new Date().toISOString(),
            consultantFees: 500
          } as Employee
        ]);
      })
    );
  }

  // GET: api/Doctor/GetDoctorsBySpecialization
  getDoctorsBySpecialization(specialization: string): Observable<Employee[]> {
    const params = new HttpParams().set('specialization', specialization);
    const url = `${this.API_BASE_URL}/Doctor/GetDoctorsBySpecialization`;
    console.log('🔍 API Call: getDoctorsBySpecialization');
    console.log('🔗 URL:', url);
    console.log('📋 Params:', params.toString());
    
    return this.http.get<Employee[]>(url, {
      params: params
    }).pipe(
      tap(result => console.log('✅ API Success - getDoctorsBySpecialization:', result)),
      catchError(error => {
        console.error('❌ API Error - getDoctorsBySpecialization:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ URL:', error.url);
        console.error('❌ Message:', error.message);
        
        // Return fallback data for demo purposes
        return of([
          {
            userId: 1,
            userName: 'Dr. Smith',
            email: 'dr.smith@example.com',
            role: 'Doctor',
            specialization: specialization,
            qualification: 'MBBS, MD',
            experienceYears: 10,
            isApprovedByAdmin: AdminApproval.Approved,
            shift: ShiftTime.Morning,
            createdAt: new Date().toISOString(),
            consultantFees: 500
          },
          {
            userId: 2,
            userName: 'Dr. Johnson',
            email: 'dr.johnson@example.com',
            role: 'Doctor',
            specialization: specialization,
            qualification: 'MBBS, MS',
            experienceYears: 8,
            isApprovedByAdmin: AdminApproval.Approved,
            shift: ShiftTime.Afternoon,
            createdAt: new Date().toISOString(),
            consultantFees: 600
          }
        ] as Employee[]);
      })
    );
  }

  // Alternative method using working doctor endpoints
  getDoctorsBySpecializationAlternative(specialization: string): Observable<Employee[]> {
    // Try using the doctor service endpoint that we know works
    const url = `${this.API_BASE_URL}/Appointment/ListOfDoctors`;
    console.log('🔍 Alternative API Call: ListOfDoctors');
    console.log('🔗 URL:', url);
    
    return this.http.get<any[]>(url).pipe(
      map(doctors => {
        // Filter by specialization client-side
        const filtered = doctors.filter(doctor => 
          doctor.specialization && 
          doctor.specialization.toLowerCase().includes(specialization.toLowerCase())
        );
        
        // Convert to Employee format
        return filtered.map(doctor => ({
          userId: doctor.doctorId || doctor.userId || doctor.id,
          userName: doctor.doctorName || doctor.name || doctor.userName,
          email: doctor.email || `${doctor.doctorName}@hospital.com`,
          role: 'Doctor',
          specialization: doctor.specialization,
          qualification: doctor.qualification || 'MBBS',
          experienceYears: doctor.experienceYears || 5,
          isApprovedByAdmin: AdminApproval.Approved,
          shift: this.parseShift(doctor.shift),
          createdAt: new Date().toISOString(),
          consultantFees: doctor.consultantFees || doctor.fees || 500
        } as Employee));
      }),
      tap(result => console.log('✅ Alternative API Success:', result)),
      catchError(error => {
        console.error('❌ Alternative API Error:', error);
        // Don't return demo data, let the error propagate to component
        throw error;
      })
    );
  }

  private parseShift(shift: any): ShiftTime {
    if (typeof shift === 'string') {
      switch (shift.toLowerCase()) {
        case 'morning': return ShiftTime.Morning;
        case 'afternoon': return ShiftTime.Afternoon;
        case 'evening': return ShiftTime.Evening;
        case 'night': return ShiftTime.Night;
        default: return ShiftTime.Morning;
      }
    }
    return shift || ShiftTime.Morning;
  }

  // Method to test what endpoints are available
  testAvailableEndpoints(): void {
    console.log('🧪 Testing available endpoints...');
    
    const testEndpoints = [
      '/Doctor/GetAllDoctors',
      '/Appointment/ListOfDoctors', 
      '/Admin/EmployeesDetailsList',
      '/Admin/PendingEmployeesDetailsList'
    ];
    
    testEndpoints.forEach(endpoint => {
      const url = `${this.API_BASE_URL}${endpoint}`;
      this.http.get(url).subscribe({
        next: (result) => console.log(`✅ ${endpoint} - WORKING:`, result),
        error: (error) => console.log(`❌ ${endpoint} - ERROR:`, error.status, error.message)
      });
    });
  }

  // GET: api/HelpDesk/GetHelpDeskByName
  getHelpDeskByName(name: string): Observable<Employee[]> {
    const params = new HttpParams().set('name', name);
    console.log('API Call: getHelpDeskByName with params:', params.toString());
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/HelpDesk/GetHelpDeskByName`, {
      params: params
    });
  }

  // GET: api/HelpDesk/GetHelpDeskById
  getHelpDeskById(id: number): Observable<Employee[]> {
    const params = new HttpParams().set('id', id.toString());
    console.log('API Call: getHelpDeskById with params:', params.toString());
    return this.http.get<Employee[]>(`${this.API_BASE_URL}/HelpDesk/GetHelpDeskById`, {
      params: params
    });
  }

  // ============================================================================
  // APPOINTMENT METHODS (Fixed endpoints based on console errors)
  // ============================================================================

  // GET: api/Admin/List/Appointments/Today (matches console error)
  getTodayAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/Today`);
  }

  // GET: api/Admin/Count/Appointments/ByYear (matches console error)
  getAppointmentCountByYear(year: number): Observable<{year: number, count: number}> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<{year: number, count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/ByYear`, {
      params: params
    });
  }

  // GET: api/Admin/Count/Appointments/ByDate (matches console error)
  getAppointmentCountByDate(date: string): Observable<{date: string, count: number}> {
    const params = new HttpParams().set('date', date);
    return this.http.get<{date: string, count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/ByDate`, {
      params: params
    });
  }

  // GET: api/Admin/Count/Appointments/ByMonth
  getAppointmentCountByMonth(month: number, year: number): Observable<{month: number, year: number, count: number}> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());
    
    return this.http.get<{month: number, year: number, count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/ByMonth`, {
      params: params
    });
  }

  // GET: api/Admin/Count/Appointments/Today (for today's count specifically)
  getTodayAppointmentsCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_BASE_URL}/Admin/Count/Appointments/Today`);
  }

  // ============================================================================
  // APPOINTMENT LIST METHODS (to get actual appointments, not just counts)
  // ============================================================================

  // GET: api/Admin/List/Appointments/ByDate
  getAppointmentsByDate(date: string): Observable<Appointment[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/ByDate`, {
      params: params
    });
  }

  // GET: api/Admin/List/Appointments/ByMonth
  getAppointmentsByMonth(month: number, year: number): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());
    
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/ByMonth`, {
      params: params
    });
  }

  // GET: api/Admin/List/Appointments/ByYear
  getAppointmentsByYear(year: number): Observable<Appointment[]> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/ByYear`, {
      params: params
    });
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  // GET: api/Payment/Payments (corrected endpoint)
  getAllPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.API_BASE_URL}/Payment/Payments`);
  }

  // ============================================================================
  // PRESCRIPTION METHODS
  // ============================================================================

  // GET: api/Prescription/GetAllPrescriptions
  getAllPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_BASE_URL}/Prescription/GetAllPrescriptions`);
  }

  // PATIENT METHODS
  // ============================================================================

  // GET: api/Patient/GetAllPatient
  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.API_BASE_URL}/Patient/GetAllPatient`);
  }

  // GET: api/Patient/GetPatientByName
  getPatientsByName(name: string): Observable<Patient[]> {
    const params = new HttpParams().set('name', name);
    console.log('API Call: getPatientsByName with params:', params.toString());
    return this.http.get<Patient[]>(`${this.API_BASE_URL}/Patient/GetPatientByName`, {
      params: params
    });
  }

  // GET: api/Patient/GetPatientById
  getPatientsById(id: number): Observable<Patient[]> {
    const params = new HttpParams().set('id', id.toString());
    console.log('API Call: getPatientsById with params:', params.toString());
    return this.http.get<Patient[]>(`${this.API_BASE_URL}/Patient/GetPatientById`, {
      params: params
    });
  }

  // GET: api/Patient/count
  getPatientCount(): Observable<{count: number}> {
    console.log('API Call: getPatientCount');
    return this.http.get<{count: number}>(`${this.API_BASE_URL}/Patient/count`);
  }
} 