import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Appointment, AppointmentStatus } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly API_BASE_URL = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';


  getTodayAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/Today`).pipe(
      tap(appointments => console.log('Fetched today appointments:', appointments.length)),
      catchError(error => {
        console.error('Error fetching today appointments:', error);
        throw error;
      })
    );
  }

  // GET: api/Admin/List/Appointments/ByDate
  getAppointmentsByDate(date: string): Observable<Appointment[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/ByDate`, { params }).pipe(
      tap(appointments => console.log(`Fetched appointments for ${date}:`, appointments.length)),
      catchError(error => {
        console.error(`Error fetching appointments for ${date}:`, error);
        throw error;
      })
    );
  }

  // GET: api/Admin/Count/Appointments/Today
  getTodayAppointmentsCount(): Observable<{count: number}> {
    const params = new HttpParams().set('date', new Date().toISOString().split('T')[0]);
    return this.http.get<{count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/Today`, { params }).pipe(
      tap(result => console.log('Today appointments count:', result.count)),
      catchError(error => {
        console.error('Error fetching today appointments count:', error);
        throw error;
      })
    );
  }

  // GET: api/Admin/Count/Appointments/ByMonth
  getMonthlyAppointmentsCount(month: number, year: number): Observable<{count: number}> {
    const params = new HttpParams().set('month', month.toString()).set('year', year.toString());
    return this.http.get<{count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/ByMonth`, { params });
  }

  // GET: api/Admin/List/Appointments
  getAllAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments`);
  }

  // GET: api/Admin/List/Appointments/ByMonth  
  getAppointmentsByMonth(month: number, year: number): Observable<Appointment[]> {
    const params = new HttpParams().set('month', month.toString()).set('year', year.toString());
    return this.http.get<Appointment[]>(`${this.API_BASE_URL}/Admin/List/Appointments/ByMonth`, { params }).pipe(
      tap(appointments => console.log(`Fetched appointments for ${month}/${year}:`, appointments.length)),
      catchError(error => {
        console.error(`Error fetching appointments for ${month}/${year}:`, error);
        throw error;
      })
    );
  }

  // GET: api/Admin/Count/Appointments/ByDate
  getAppointmentsCountByDate(date: string): Observable<{count: number}> {
    const params = new HttpParams().set('date', date);
    return this.http.get<{count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/ByDate`, { params }).pipe(
      tap(result => console.log(`Appointments count for ${date}:`, result.count)),
      catchError(error => {
        console.error(`Error fetching appointments count for ${date}:`, error);
        throw error;
      })
    );
  }

  // GET: api/Admin/Count/Appointments/ByYear
  getAppointmentsCountByYear(year: number): Observable<{count: number}> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<{count: number}>(`${this.API_BASE_URL}/Admin/Count/Appointments/ByYear`, { params });
  }
} 