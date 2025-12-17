import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
import { AuthService } from './auth.service';

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
export class PrescriptionService {
  private apiUrl = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';

  constructor(private http: HttpClient, private authService: AuthService) {
    console.log('💊 PrescriptionService initialized with API URL:', this.apiUrl);
  }

  // 📋 GET /api/Prescription/patientPrescription/{appointmentId}
  getPatientPrescription(appointmentId: number): Observable<any> {
    const url = `${this.apiUrl}/Prescription/patientPrescription/${appointmentId}`;
    console.log('📋 Getting patient prescription for appointment:', appointmentId);
    
    return this.http.get(url).pipe(
      tap(response => {
        console.log('✅ Prescription loaded successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading prescription:', error);
        if (error.status === 404) {
          console.log('ℹ️ No prescription found for this appointment');
        }
        return throwError(() => error);
      })
    );
  }

  // ✅ POST /api/Prescription/AddPrescription (JSON body)
  addPrescription(prescriptionDto: PrescriptionDto): Observable<any> {
    const url = `${this.apiUrl}/Prescription/AddPrescription`;
    console.log('💊 Adding prescription via PrescriptionService:', prescriptionDto);
    console.log('📡 URL:', url);
    
    return this.http.post(url, prescriptionDto, {
      responseType: 'text'
    }).pipe(
      tap(response => {
        console.log('✅ Prescription added successfully via PrescriptionService:', response);
      }),
      catchError(error => {
        console.error('❌ Error adding prescription via PrescriptionService:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error object:', error);
        
        // Enhanced error details for debugging
        if (error.status === 400) {
          console.error('❌ 400 Bad Request - Check prescription data format:', prescriptionDto);
        } else if (error.status === 401) {
          console.error('❌ 401 Unauthorized - Check JWT token and role permissions');
        } else if (error.status === 500) {
          console.error('❌ 500 Internal Server Error - Backend processing issue');
        }
        
        return throwError(() => error);
      }),
      retry({
        count: 1,
        delay: 1000
      })
    );
  }

  // ✅ GET /api/Prescription/patientPrescription/{appointmentId}
  getPrescriptionsByPatient(appointmentId: number): Observable<any[]> {
    const url = `${this.apiUrl}/Prescription/patientPrescription/${appointmentId}`;
    console.log('💊 Getting prescriptions for appointment via PrescriptionService:', appointmentId);
    console.log('📡 URL:', url);
    
    return this.http.get<any[]>(url).pipe(
      tap(response => {
        console.log('✅ Patient prescriptions loaded via PrescriptionService:', response);
        console.log('✅ Total prescriptions found:', response?.length || 0);
        
        if (response && response.length > 0) {
          console.log('✅ First prescription structure:', response[0]);
          console.log('✅ Prescription keys:', Object.keys(response[0]));
        }
      }),
      catchError(error => {
        console.error('❌ Error loading patient prescriptions via PrescriptionService:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        
        if (error.status === 404) {
          console.log('ℹ️ No prescriptions found for appointment ID:', appointmentId, '- this is normal');
        } else if (error.status === 401) {
          console.error('❌ 401 Unauthorized - Check JWT token and role permissions');
        } else if (error.status === 500) {
          console.error('❌ 500 Internal Server Error - Backend issue retrieving prescriptions');
        }
        
        return throwError(() => error);
      }),
      retry({
        count: 1,
        delay: 1000
      })
    );
  }

  // ✅ DELETE /api/Prescription/deletePrescription/{id}
  deletePrescription(id: number): Observable<any> {
    const url = `${this.apiUrl}/Prescription/deletePrescription/${id}`;
    console.log('🗑️ Deleting prescription via PrescriptionService:', id);
    
    const formData = new FormData();
    formData.append('id', id.toString());
    
    return this.http.delete(url, {
      body: formData
    }).pipe(
      tap(response => {
        console.log('✅ Prescription deleted via PrescriptionService:', response);
      }),
      catchError(error => {
        console.error('❌ Error deleting prescription via PrescriptionService:', error);
        return throwError(() => error);
      }),
      retry({
        count: 1,
        delay: 1000
      })
    );
  }

  // ✅ GET /api/Prescription/GetPrescriptionbyID/{id}
  getPrescriptionById(id: number): Observable<any> {
    const url = `${this.apiUrl}/Prescription/GetPrescriptionbyID/${id}`;
    console.log('💊 Getting prescription by ID via PrescriptionService:', id);
    
    return this.http.get(url).pipe(
      tap(response => {
        console.log('✅ Prescription loaded by ID via PrescriptionService:', response);
      }),
      catchError(error => {
        console.error('❌ Error loading prescription by ID via PrescriptionService:', error);
        return throwError(() => error);
      }),
      retry({
        count: 1,
        delay: 1000
      })
    );
  }

  // Get all prescriptions - placeholder method for potential future use
  getAllPrescriptions(): Observable<any[]> {
    console.log('⚠️ getAllPrescriptions called but not implemented - returning empty array');
    return of([]);
  }

  // ============================================================================
  // UTILITY METHODS (AuthInterceptor handles JWT automatically)
  // ============================================================================

  // Test connectivity to prescription API
  testPrescriptionConnectivity(): Observable<any> {
    console.log('🧪 Testing prescription API connectivity...');
    
    // Test with a simple GET request to see if API is reachable
    const url = `${this.apiUrl}/Prescription/GetPrescriptionbyID/1`;
    
    return this.http.get(url).pipe(
      tap(response => {
        console.log('✅ Prescription API connectivity test successful:', response);
      }),
      catchError(error => {
        console.error('❌ Prescription API connectivity test failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Enhanced prescription validation
  validatePrescriptionData(prescriptionDto: PrescriptionDto): string[] {
    const errors: string[] = [];
    
    if (!prescriptionDto.appointmentId || prescriptionDto.appointmentId <= 0) {
      errors.push('Valid appointment ID is required');
    }
    
    if (!prescriptionDto.doctorId || prescriptionDto.doctorId <= 0) {
      errors.push('Valid doctor ID is required');
    }
    
    if (!prescriptionDto.patientId || prescriptionDto.patientId <= 0) {
      errors.push('Valid patient ID is required');
    }
    
    if (!prescriptionDto.instructions || prescriptionDto.instructions.trim().length < 10) {
      errors.push('Instructions must be at least 10 characters long');
    }
    
    if (!prescriptionDto.medicines || prescriptionDto.medicines.length === 0) {
      errors.push('At least one medicine is required');
    } else {
      prescriptionDto.medicines.forEach((medicine, index) => {
        if (!medicine.medicineType || medicine.medicineType.trim() === '') {
          errors.push(`Medicine ${index + 1}: Medicine type is required`);
        }
        if (!medicine.dosages || medicine.dosages.trim() === '') {
          errors.push(`Medicine ${index + 1}: Dosage is required`);
        }
        if (!medicine.scheduleTime || medicine.scheduleTime.trim() === '') {
          errors.push(`Medicine ${index + 1}: Schedule time is required`);
        }
      });
    }
    
    return errors;
  }
} 