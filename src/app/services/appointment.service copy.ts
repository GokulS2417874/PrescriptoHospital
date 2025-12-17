import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment, Status } from '../models';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly API_BASE_URL = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';

  
  getAllAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/GetAllAppointments`);
  }

  // GET: api/Appointment/GetAppointmentsByDate
  getAppointmentsByDate(date: string): Observable<Appointment[]> {
    const params = new HttpParams().set('Date', date);
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/GetAppointmentsByDate`, { params });
  }

  // GET: api/Appointment/GetAppointmentsByMonth  
  getAppointmentsByMonth(month: number, year: number): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('Month', month.toString())
      .set('Year', year.toString());
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/GetAppointmentsByMonth`, { params });
  }

  // GET: api/Appointment/GetAppointmentsByYear
  getAppointmentsByYear(year: number): Observable<Appointment[]> {
    const params = new HttpParams().set('Year', year.toString());
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/GetAppointmentsByYear`, { params });
  }

  // COUNT METHODS (return array length)
  getAppointmentCountByDate(date: string): Observable<{count: number}> {
    return this.getAppointmentsByDate(date).pipe(
      map(appointments => ({ count: appointments.length }))
    );
  }

  getAppointmentCountByMonth(month: number, year: number): Observable<{count: number}> {
    return this.getAppointmentsByMonth(month, year).pipe(
      map(appointments => ({ count: appointments.length }))
    );
  }

  getAppointmentCountByYear(year: number): Observable<{count: number}> {
    return this.getAppointmentsByYear(year).pipe(
      map(appointments => ({ count: appointments.length }))
    );
  }

  // GET: api/Appointment/GetAppointmentsForDoctorId
  getAppointmentsForDoctor(email: string): Observable<Appointment[]> {
    const params = new HttpParams().set('Email', email);
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/GetAppointmentsForDoctorId`, { params });
  }

  // GET: api/Appointment/GetAppointmentsByPatientId
  getAppointmentsByPatientId(patId: number): Observable<Appointment[]> {
    const params = new HttpParams().set('PatId', patId.toString());
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/GetAppointmentsByPatientId`, { params });
  }

  // GET: api/Appointment/Today-AppointmentsForDoctor
  getTodayAppointmentsForDoctor(doctorId: number): Observable<Appointment[]> {
    const params = new HttpParams().set('DoctorId', doctorId.toString());
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Appointment/Today-AppointmentsForDoctor`, { params });
  }

  // PUT: api/Appointment/Reschedule
  rescheduleAppointment(dto: any, email: string): Observable<any> {
    const formData = new FormData();
    Object.keys(dto).forEach(key => {
      formData.append(key, dto[key]);
    });
    
    const params = new HttpParams().set('Email', email);
    return this.http.put(`${this.API_BASE_URL}/Appointment/Reschedule`, formData, { params });
  }

  // PUT: api/Appointment/Cancelled
  cancelAppointment(email: string): Observable<any> {
    const formData = new FormData();
    formData.append('Email', email);
    
    return this.http.put(`${this.API_BASE_URL}/Appointment/Cancelled`, formData);
  }

  // POST: api/Appointment/AddAppointment
  addAppointment(dto: any): Observable<Appointment> {
    const formData = new FormData();
    Object.keys(dto).forEach(key => {
      formData.append(key, dto[key]);
    });
    
    return this.http.post<Appointment>(`${this.API_BASE_URL}/Appointment/AddAppointment`, formData);
  }

  // GET: api/Appointment/GetTodayAppointmentsCount
  getTodayAppointmentsCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_BASE_URL}/Appointment/GetTodayAppointmentsCount`);
  }

  // GET: api/Appointment/GetMonthlyAppointmentsCount
  getMonthlyAppointmentsCount(month: number, year: number): Observable<{ count: number }> {
    const params = new HttpParams()
      .set('Month', month.toString())
      .set('Year', year.toString());
    return this.http.get<{ count: number }>(`${this.API_BASE_URL}/Appointment/GetMonthlyAppointmentsCount`, { params });
  }

  // GET: api/Appointment/GetYearlyAppointmentsCount
  getYearlyAppointmentsCount(year: number): Observable<{ count: number }> {
    const params = new HttpParams().set('Year', year.toString());
    return this.http.get<{ count: number }>(`${this.API_BASE_URL}/Appointment/GetYearlyAppointmentsCount`, { params });
  }

  // PUT: api/Appointment/UpdateAppointmentStatus
  updateAppointmentStatus(appointmentId: number, status: Status): Observable<string> {
    const params = new HttpParams()
      .set('AppointmentId', appointmentId.toString())
      .set('Status', status.toString());
    
    return this.http.put(`${this.API_BASE_URL}/Appointment/UpdateAppointmentStatus`, null, { 
      params,
      responseType: 'text' 
    });
  }

  // DELETE: api/Appointment/DeleteAppointment
  deleteAppointment(appointmentId: number): Observable<string> {
    const params = new HttpParams().set('AppointmentId', appointmentId.toString());
    return this.http.delete(`${this.API_BASE_URL}/Appointment/DeleteAppointment`, { 
      params,
      responseType: 'text' 
    });
  }
} 