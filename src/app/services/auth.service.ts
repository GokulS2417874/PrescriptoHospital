import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../models/user.models';
import { AdminApproval } from '../models/common.model';
import { jwtDecode } from 'jwt-decode';
import { DecodedToken } from '../models/jwt.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  

  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoggedIn = signal<boolean>(false);
  

  readonly currentUserSignal = this._currentUser.asReadonly();
  readonly isLoggedInSignal = this._isLoggedIn.asReadonly();
  
 
  readonly welcomeMessage = computed(() => {
    const user = this._currentUser();
    if (user && this._isLoggedIn()) {
      return `Welcome, ${user.name || user.email}! 👋`;
    }
    return null;
  });


  private readonly TOKEN_KEY = 'authToken';
  private readonly EXPIRY_KEY = 'tokenExpiry';
  private readonly ROLE_KEY = 'userRole';
  private readonly USER_ID_KEY = 'userId';
  private readonly USER_NAME_KEY = 'userName';
  private readonly USER_EMAIL_KEY = 'userEmail';
  private readonly USER_KEY = 'currentUser';
  
  constructor(private http: HttpClient) {
    if (this.isBrowser()) {
      this.checkExistingAuth();
    }
  }

 
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

 
  private getStorageItem(key: string): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(key);
  }


  private setStorageItem(key: string, value: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(key, value);
  }

  private removeStorageItem(key: string): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(key);
  }

  private checkExistingAuth(): void {
    const token = this.getStorageItem(this.TOKEN_KEY);
    const userRole = this.getStorageItem(this.ROLE_KEY);
    const userName = this.getStorageItem(this.USER_NAME_KEY);
    const userEmail = this.getStorageItem(this.USER_EMAIL_KEY);

    console.log('checkExistingAuth() values:', {
      token: token ? 'exists' : 'missing',
      userRole,
      userName,
      userEmail,
      isTokenValid: token ? this.isTokenValid(token) : false
    });

    if (token && this.isTokenValid(token) && userRole && userEmail) {
      let name = userName;
      if (token && (!name || /^\d+$/.test(name))) { 
        try {
          const decoded: any = jwtDecode(token);
          name = decoded.userName || 
                 decoded.name || 
                 decoded.unique_name ||
                 decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                 userEmail.split('@')[0];
        } catch (error) {
          name = userEmail.split('@')[0];
        }
      }

      const user: User = {
        name: name || userEmail.split('@')[0],
        email: userEmail,
        role: userRole
      };

      console.log('Setting user in checkExistingAuth:', user);
      this.currentUserSubject.next(user);
      this._currentUser.set(user);
      this._isLoggedIn.set(true);
    } else {
      console.log('checkExistingAuth failed - missing required values');
    }
  }

  /**
   * Login user with email and password
   * @param email User's email
   * @param password User's password
   * @returns Observable with success status and appropriate message
   */
  login(email: string, password: string): Observable<{success: boolean, message: string, user?: User}> {
    const formData = new FormData();
    formData.append('Email', email);
    formData.append('Password', password);

    return this.http.post<any>(`${this.apiUrl}/Login/Login`, formData).pipe(
      map(response => {
        console.log('Backend response:', response);
        
        if (response.token && response.role) {
          const approvalStatus = response.isApprovedByAdmin;
          const responseRole = response.role; 
          
          console.log('User approval status:', approvalStatus);
          console.log('User role:', responseRole);

          const rolesThatNeedApproval = ['Doctor', 'HelpDesk'];
          if (rolesThatNeedApproval.includes(responseRole)) {
            if (approvalStatus !== undefined && approvalStatus !== AdminApproval.Approved) {
              const approvalMessage = this.getApprovalStatusText(approvalStatus, responseRole);
              console.log('Login blocked - User not approved:', approvalMessage);
              return { success: false, message: approvalMessage };
            }
            console.log(`${responseRole} is approved, proceeding with login`);
          } else {
            console.log(`${responseRole} role doesn't require approval, proceeding with login`);
          }
        } else {
          console.log('User is approved, proceeding with login');
        }

        this.storeToken(response.token);
        
        localStorage.setItem(this.ROLE_KEY, response.role);
        localStorage.setItem(this.USER_EMAIL_KEY, response.email || email);
        localStorage.setItem(this.USER_NAME_KEY, response.userName || response.name || email.split('@')[0]);
        console.log('Role stored explicitly from backend response:', response.role);
        
        const user: User = {
          userId: response.userId || response.id,
          userName: response.userName || response.name,
          name: response.userName || response.name || email.split('@')[0], // Make sure name is set
          email: response.email || email,
          role: response.role,
          phoneNumber: response.phoneNumber || '',
          address: response.address || '',
          dateOfBirth: response.dateOfBirth || '',
          emergencyContact: response.emergencyContact || '',
          emergencyContactRelationship: response.emergencyContactRelationship || '',
          medicalHistory: response.medicalHistory || '',
          gender: response.gender || '',
          avatar: response.avatar || '',
          isApprovedByAdmin: response.isApprovedByAdmin
        };

        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        
        this.currentUserSubject.next(user);
        this._currentUser.set(user);
        this._isLoggedIn.set(true);
        
        console.log('Login successful, created user:', user);
        console.log('Welcome message signal:', this.welcomeMessage());
        
        console.log('Post-login verification:');
        console.log('- Current user signal:', this._currentUser());
        console.log('- Is logged in signal:', this._isLoggedIn());
        console.log('- Welcome message:', this.welcomeMessage());
        
        return { success: true, message: 'Login successful', user };
      }),
      catchError(error => {
        console.error('Login error:', error);
        let errorMessage = 'Login failed';
        
        if (error.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid login credentials';
        } else if (error.status === 0) {
          errorMessage = 'Server is unreachable. Please check your connection.';
        }
        
        return of({ success: false, message: errorMessage });
      })
    );
  }

 
  storeToken(token: string): void {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      const expiry = decoded.exp * 1000; 

      this.setStorageItem(this.TOKEN_KEY, token);
      this.setStorageItem(this.EXPIRY_KEY, expiry.toString());
      
      if (decoded.role) {
        this.setStorageItem(this.ROLE_KEY, decoded.role);
        console.log('✅ Role found in JWT token:', decoded.role);
      } else {
        console.log('ℹ️ No role found in JWT token (will be stored from backend response)');
      }
      
      if (decoded.userName || decoded.name) {
        this.setStorageItem(this.USER_NAME_KEY, decoded.userName || decoded.name || '');
      }
      
      if (decoded.userId || decoded.sub) {
        this.setStorageItem(this.USER_ID_KEY, decoded.userId?.toString() || decoded.sub || '');
      }

      console.log('✅ Token stored successfully with decoded info:', {
        role: decoded.role || 'Not in JWT (from backend response)',
        userName: decoded.userName || decoded.name,
        userId: decoded.userId || decoded.sub,
        expires: new Date(expiry).toLocaleString()
      });

    } catch (error) {
      console.error('❌ Error storing token:', error);
    }
  }

 
  extractUserInfoFromToken(token: string): DecodedToken | null {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      console.log('🔓 Decoded JWT payload:', decoded);
      return decoded;
    } catch (error) {
      console.error('❌ Error decoding JWT token:', error);
      return null;
    }
  }

 
  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getStorageItem(this.TOKEN_KEY);
    
    if (!tokenToCheck) {
      return false;
    }

    try {
      const decoded: DecodedToken = jwtDecode(tokenToCheck);
      const currentTime = Date.now() / 1000; // Convert to seconds
      
      if (decoded.exp && decoded.exp < currentTime) {
        console.warn('⚠️ JWT token is expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return false;
    }
  }

  
  getUserRole(): string | null {
    console.log('🔍 getUserRole() called');
    
    if (!this.isLoggedIn()) {
      console.log('❌ User not logged in');
      return null;
    }

    const storedRole = this.getStorageItem(this.ROLE_KEY);
    console.log('🔍 Role from localStorage (ROLE_KEY):', storedRole);
    
    if (storedRole) {
      return storedRole;
    }

    const token = this.getStorageItem(this.TOKEN_KEY);
    console.log('🔍 Token exists for role extraction:', !!token);
    
    if (token) {
      const decoded = this.extractUserInfoFromToken(token);
      console.log('🔍 Role from JWT token:', decoded?.role);
      return decoded?.role || null;
    }

    console.log('❌ No role found anywhere');
    return null;
  }

 
  getUserIdFromToken(): number | null {
    if (!this.isBrowser()) return null;
    
    const token = this.getStorageItem(this.TOKEN_KEY);
    if (!token || !this.isTokenValid(token)) return null;

    try {
      const decoded: DecodedToken = jwtDecode(token);
      const userId = decoded.userId || decoded.sub;
      return userId ? parseInt(userId.toString()) : null;
    } catch (error) {
      console.warn('❌ Could not extract userId from JWT token:', error);
      return null;
    }
  }

  
  getUserNameFromToken(): string | null {
    if (!this.isBrowser()) return null;
    
    const token = this.getStorageItem(this.TOKEN_KEY);
    if (!token || !this.isTokenValid(token)) return null;

    try {
      const decoded: DecodedToken = jwtDecode(token);
      return decoded.userName || decoded.name || null;
    } catch (error) {
      console.warn('❌ Could not extract userName from JWT token:', error);
      return null;
    }
  }

 
  isLoggedIn(): boolean {
    const token = this.getStorageItem(this.TOKEN_KEY);
    const expiry = parseInt(this.getStorageItem(this.EXPIRY_KEY) || '0', 10);

    if (!token || !expiry || Date.now() > expiry) {
      this.clearToken();
      return false;
    }

    return this.isTokenValid(token);
  }


  clearToken(): void {
    this.removeStorageItem(this.TOKEN_KEY);
    this.removeStorageItem(this.EXPIRY_KEY);
    this.removeStorageItem(this.ROLE_KEY);
    this.removeStorageItem(this.USER_ID_KEY);
    this.removeStorageItem(this.USER_NAME_KEY);
    this.removeStorageItem(this.USER_EMAIL_KEY);
    
    this.removeStorageItem('userRole');
    this.removeStorageItem('userName');
  }

 
  getToken(): string | null {
    return this.isLoggedIn() ? this.getStorageItem(this.TOKEN_KEY) : null;
  }

  getUserProfile(): Observable<any> {
    const userId = this.getUserIdFromToken();
    
    if (!userId) {
      return throwError(() => new Error('No user ID found'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const role = this.getUserRole();
    console.log('🔍 Debug getUserProfile - Role from storage:', role);
    console.log('🔍 Debug getUserProfile - User ID:', userId);
    
    const endpoint = `UpdateProfile/GetUserById/${userId}`;
    const fullUrl = `${this.apiUrl}/${endpoint}`;
    
    console.log('🔍 Using universal profile endpoint:', fullUrl);

    return this.http.get(fullUrl, { headers }).pipe(
      map(response => {
        console.log('✅ Profile loaded successfully from backend');
        console.log('📋 Profile data:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Error fetching user profile:', error);
        console.error('🔍 Endpoint used:', fullUrl);
        console.error('🔍 User role was:', role);
        console.error('🔍 User ID was:', userId);
        return throwError(() => error);
      })
    );
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUserSnapshot(): User | null {
    return this.currentUserSubject.value;
  }

  cancelAppointment(email: string): Observable<{success: boolean, message: string}> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('No authorization token'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete<any>(`${this.apiUrl}/Appointment/CancelAppointment/${email}`, { headers }).pipe(
      map(response => ({
        success: true,
        message: response.message || 'Appointment cancelled successfully'
      })),
      catchError(error => {
        console.error('Error canceling appointment:', error);
        return of({
          success: false,
          message: error.error?.message || 'Failed to cancel appointment'
        });
      })
    );
  }

  logout(): Observable<any> {
    this.clearToken();
    
    this.currentUserSubject.next(null);
    this._currentUser.set(null);
    this._isLoggedIn.set(false);
    
    console.log('✅ User logged out successfully');
    
    return of({ success: true, message: 'Logged out successfully' });
  }

  register(userData: any): Observable<{success: boolean, message: string}> {
    const formData = new FormData();
    
    Object.keys(userData).forEach(key => {
      if (userData[key] !== null && userData[key] !== undefined) {
        formData.append(key, userData[key]);
      }
    });

    return this.http.post<any>(`${this.apiUrl}/Register/Register`, formData).pipe(
      map(response => {
        if (response && response.message) {
          return {
            success: true,
            message: response.message
          };
        } else {
          return {
            success: false,
            message: 'Registration failed'
          };
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return of({
          success: false,
          message: error.error?.message || 'Registration failed. Please try again.'
        });
      })
    );
  }

  getUserData(): User | null {
    return this.getCurrentUserSnapshot();
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  debugToken(): void {
    const token = this.getToken();
    
    if (!token) {
      console.log('❌ No token found');
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      
      console.group('🔐 JWT Token Debug Info');
      console.log('📋 Full decoded token:', decoded);
      console.log('👤 User ID:', decoded.userId || decoded.sub);
      console.log('👤 User Name:', decoded.userName || decoded.name);
      console.log('📧 Email:', decoded.email);
      console.log('🔒 Role:', decoded.role);
      console.log('⏰ Issued at:', decoded.iat ? new Date(decoded.iat * 1000).toLocaleString() : 'Not specified');
      console.log('⏰ Expires at:', new Date(decoded.exp * 1000).toLocaleString());
      console.log('✅ Is valid:', this.isTokenValid(token));
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ Error debugging token:', error);
    }
  }

  debugAuthState(): void {
    console.group('🔍 Complete Authentication Debug');
    
    console.log('📦 Storage Keys:');
    console.log('  - TOKEN_KEY:', this.TOKEN_KEY);
    console.log('  - ROLE_KEY:', this.ROLE_KEY);
    console.log('  - USER_EMAIL_KEY:', this.USER_EMAIL_KEY);
    console.log('  - USER_NAME_KEY:', this.USER_NAME_KEY);
    console.log('  - USER_ID_KEY:', this.USER_ID_KEY);
    
    console.log('📦 Storage Values:');
    console.log('  - authToken:', this.getStorageItem(this.TOKEN_KEY) ? 'EXISTS' : 'MISSING');
    console.log('  - userRole:', this.getStorageItem(this.ROLE_KEY));
    console.log('  - userEmail:', this.getStorageItem(this.USER_EMAIL_KEY));
    console.log('  - userName:', this.getStorageItem(this.USER_NAME_KEY));
    console.log('  - userId:', this.getStorageItem(this.USER_ID_KEY));
    
    console.log('👤 Current User State:');
    console.log('  - isLoggedIn():', this.isLoggedIn());
    console.log('  - getUserRole():', this.getUserRole());
    console.log('  - getCurrentUserSnapshot():', this.getCurrentUserSnapshot());
    
    const token = this.getToken();
    if (token) {
      console.log('🔐 JWT Token Info:');
      const decoded = this.extractUserInfoFromToken(token);
      console.log('  - Decoded payload:', decoded);
      console.log('  - Role from token:', decoded?.role);
      console.log('  - User ID from token:', decoded?.userId || decoded?.sub);
    }
    
    console.groupEnd();
  }

 
  isPatient(): boolean {
    const role = this.getUserRole();
    return role === 'Patient';
  }

 
  getPatientAppointments(): Observable<any[]> {
    const userId = this.getUserIdFromToken();
    if (!userId) {
      return throwError(() => new Error('No user ID found'));
    }

    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No authorization token'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<any[]>(`${this.apiUrl}/Appointment/GetAppointmentsByPatientId?PatId=${userId}`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching patient appointments:', error);
        return throwError(() => error);
      })
    );
  }

  downloadMedicalHistory(appointmentId: number, patientId: number): Observable<Blob> {
    const token = this.getToken();

    if (!token) {
      return throwError(() => new Error('No authorization token'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/pdf, application/octet-stream, */*'
    });

    console.log(`🔽 Downloading medical history for appointmentId: ${appointmentId}, patientId: ${patientId}`);

    const endpoint = `${this.apiUrl}/Appointment/GetPatientMedicalHistoriesById?appointmentId=${appointmentId}&patientId=${patientId}`;

    return this.http.get(endpoint, {
      headers,
      responseType: 'blob'
    }).pipe(
      map(response => {
        console.log(`✅ Medical history downloaded successfully for appointment ${appointmentId}`);
        return response;
      }),
      catchError(error => {
        console.error(`❌ Download failed for appointment ${appointmentId}:`, error.status, error.message);
        return throwError(() => error);
      })
    );
  }

  
  rescheduleAppointment(email: string, appointmentDate: string, startTime: string, endTime: string): Observable<{success: boolean, message: string}> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('No authorization token'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const formData = new FormData();
    formData.append('AppointmentDate', appointmentDate);
    formData.append('AppointmentStartTime', startTime);
    formData.append('AppointmentEndTime', endTime);

    console.log('🔄 Rescheduling appointment for:', email);
    console.log('- New date:', appointmentDate);
    console.log('- New time:', startTime, 'to', endTime);

    return this.http.put(`${this.apiUrl}/Appointment/Reschedule?email=${encodeURIComponent(email)}`, formData, { 
      headers,
      responseType: 'text'
    }).pipe(
      map(response => {
        console.log('✅ Appointment rescheduled successfully:', response);
        return {
          success: true,
          message: typeof response === 'string' ? response : 'Appointment rescheduled successfully!'
        };
      }),
      catchError(error => {
        console.error('❌ Reschedule appointment error:', error);
        
        if (error.status === 200) {
          return of({
            success: true,
            message: 'Appointment rescheduled successfully!'
          });
        }
        
        let errorMessage = 'Failed to reschedule appointment.';
        if (error.status === 400) {
          errorMessage = 'Invalid date/time. Please try again.';
        } else if (error.status === 404) {
          errorMessage = 'Appointment not found.';
        }
        
        return of({
          success: false,
          message: errorMessage
        });
      })
    );
  }

 
  forgotPassword(email: string): Observable<{success: boolean, message: string}> {
    const formData = new FormData();
    formData.append('Email', email);

    return this.http.post<any>(`${this.apiUrl}/Login/forgot`, formData).pipe(
      map(response => {
        return {
          success: true,
          message: 'Reset link sent to your email! Please check your inbox.'
        };
      }),
      catchError(error => {
        console.error('Forgot password error:', error);
        return of({
          success: false,
          message: error.error?.message || 'Failed to send reset email. Please try again.'
        });
      })
    );
  }

 
  resetPassword(token: string, newPassword: string): Observable<{success: boolean, message: string}> {
    const formData = new FormData();
    formData.append('Token', token);
    formData.append('NewPassword', newPassword);

    return this.http.post(`${this.apiUrl}/Login/reset`, formData, { 
      responseType: 'text' 
    }).pipe(
      map(response => {
        return {
          success: true,
          message: 'Password updated successfully! You can now login.'
        };
      }),
      catchError(error => {
        console.error('Reset password error:', error);
        let errorMessage = 'Failed to reset password. Please try again.';
        
        if (error.status === 400) {
          errorMessage = 'Invalid or expired token. Please request a new reset token.';
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        return of({
          success: false,
          message: errorMessage
        });
      })
    );
  }

 
  updateProfile(profileData: any): Observable<{success: boolean, message: string, data?: any}> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('No authorization token'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const formData = new FormData();
    
    console.log('🔍 === PROFILE UPDATE DEBUG ===');
    console.log('Input data:', profileData);
    
    Object.keys(profileData).forEach(key => {
      const value = profileData[key];
      console.log(`🔍 Field ${key}:`, value);
      
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
        console.log(`✅ Added: ${key} = "${value}"`);
      }
    });

    if (!profileData.Password) {
      const currentPassword = prompt('For security, please enter your current password to update your profile:');
      
      if (!currentPassword) {
        return throwError(() => new Error('Password required for profile update'));
      }
      
      formData.append('Password', currentPassword);
      console.log('✅ Added password for backend requirement');
    }

    return this.http.put(`${this.apiUrl}/UpdateProfile/UpdateProfile`, formData, { 
      headers,
      responseType: 'text'
    }).pipe(
      map(response => {
        console.log('✅ Profile updated successfully:', response);
        
        if (this.currentUserSubject.value) {
          const updatedUser = {
            ...this.currentUserSubject.value,
            name: profileData.UserName || this.currentUserSubject.value.name,
            email: profileData.Email || this.currentUserSubject.value.email
          };
          this.currentUserSubject.next(updatedUser);
          this._currentUser.set(updatedUser);
        }
        
        return {
          success: true,
          message: typeof response === 'string' ? response : 'Profile updated successfully!',
          data: response
        };
      }),
      catchError(error => {
        console.error('❌ Profile update error:', error);
        
        if (error.status === 200) {
          console.log('✅ Update was actually successful despite parsing error');
          return of({
            success: true,
            message: 'Profile updated successfully!',
            data: error.error
          });
        }
        
        let errorMessage = 'Failed to update profile.';
        
        if (error.status === 400) {
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = 'Invalid data or incorrect password. Please try again.';
          }
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please check your password.';
        }
        
        return of({
          success: false,
          message: errorMessage
        });
      })
    );
  }

  
  registerUser(formData: FormData): Observable<{success: boolean, message: string, data?: any}> {
    const endpoint = `${this.apiUrl}/Registration/register`;
    console.log('📝 Sending registration request to:', endpoint);
    console.log('📝 FormData contents:');
    for (let pair of formData.entries()) {
      console.log(`📝 ${pair[0]}: ${pair[1]}`);
    }
    
    return this.http.post(endpoint, formData).pipe(
      map(response => {
        console.log('✅ Registration response:', response);
        return {
          success: true,
          message: 'Registration successful! Please login with your credentials.',
          data: response
        };
      }),
      catchError(error => {
        console.error('❌ Registration error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error URL:', error.url);
        console.error('❌ Error details:', error.error);
        
        if (error.status === 200 && error.error instanceof SyntaxError && error.error.message.includes('JSON')) {
          console.log('🔄 Backend returned 200 with malformed JSON - treating as success');
          
          const responseText = error.error.message.match(/"([^"]+)"/)?.[1] || 'Registration completed';
          console.log('📝 Extracted response text:', responseText);
          
          return of({
            success: true,
            message: 'Registration successful! Please login with your credentials.',
            data: { 
              message: responseText,
              note: 'Backend returned 200 status with text response'
            }
          });
        }
        
        if (error.status === 404) {
          console.log('🔄 Trying alternative endpoints...');
          return this.tryAlternativeRegistrationEndpoints(formData);
        } else if (error.status === 400) {
          console.log('🔍 400 Bad Request - Detailed error analysis:');
          console.log('🔍 Full error object:', JSON.stringify(error, null, 2));
          console.log('🔍 Error.error:', error.error);
          console.log('🔍 Error.error type:', typeof error.error);
          
          if (error.error && error.error.errors) {
            console.log('🔍 Validation errors found:', error.error.errors);
            const validationErrors = error.error.errors;
            const errorMessages = [];
            
            for (const field in validationErrors) {
              const fieldErrors = validationErrors[field];
              console.log(`🔍 Field '${field}' errors:`, fieldErrors);
              if (Array.isArray(fieldErrors)) {
                fieldErrors.forEach(err => {
                  errorMessages.push(`• ${field}: ${err}`);
                });
              } else {
                errorMessages.push(`• ${field}: ${fieldErrors}`);
              }
            }
            
            const errorMessage = `❌ Registration validation failed:\n\n${errorMessages.join('\n')}\n\nPlease fix these issues and try again.`;
            console.log('🔍 Formatted error message:', errorMessage);
            
            return of({
              success: false,
              message: errorMessage
            });
          }
          
          const errorMessage = error.error?.title || error.error?.message || error.error || 'Invalid registration data. Please check your information.';
          console.log('🔍 General error message:', errorMessage);
          
          return of({
            success: false,
            message: `❌ Registration failed: ${errorMessage}`
          });
        } else if (error.status === 409) {
          return of({
            success: false,
            message: 'Email already exists. Please use a different email or login.'
          });
        } else {
          return of({
            success: false,
            message: error.error?.message || 'Registration failed. Please try again.'
          });
        }
      })
    );
  }

 
  private tryAlternativeRegistrationEndpoints(formData: FormData): Observable<{success: boolean, message: string, data?: any}> {
    console.log('🔄 Trying JSON format before alternative endpoints...');
    return this.tryJsonRegistration(formData).pipe(
      catchError(jsonError => {
        console.log('❌ JSON registration failed, trying alternative endpoints...');
        
        const alternativeEndpoints = [
          `${this.apiUrl}/Register/Register`,
          `${this.apiUrl}/Registration/Register`,
          `${this.apiUrl}/Auth/Register`,
          `${this.apiUrl}/User/Register`,
          `${this.apiUrl}/Account/Register`
        ];

        console.log('🔄 Trying alternative registration endpoints:', alternativeEndpoints);

        const tryEndpoint = (index: number): Observable<{success: boolean, message: string, data?: any}> => {
          if (index >= alternativeEndpoints.length) {
            return of({
              success: false,
              message: 'Registration service not found. Please contact support.'
            });
          }

          const endpoint = alternativeEndpoints[index];
          console.log(`🔄 Trying endpoint ${index + 1}/${alternativeEndpoints.length}: ${endpoint}`);

          return this.http.post(endpoint, formData).pipe(
            map(response => {
              console.log(`✅ Registration successful with endpoint: ${endpoint}`);
              return {
                success: true,
                message: 'Registration successful! Please login with your credentials.',
                data: response
              };
            }),
            catchError(error => {
              console.log(`❌ Endpoint ${endpoint} failed with status: ${error.status}`);
              if (error.status === 404) {
                return tryEndpoint(index + 1);
              } else {
                return of({
                  success: false,
                  message: error.error?.message || `Registration failed (${error.status}). Please try again.`
                });
              }
            })
          );
        };

        return tryEndpoint(0);
      })
    );
  }

 
  private tryJsonRegistration(formData: FormData): Observable<{success: boolean, message: string, data?: any}> {
    const jsonData: any = {};
    for (let pair of formData.entries()) {
      jsonData[pair[0]] = pair[1];
    }

    console.log('🔄 Trying JSON registration with data:', jsonData);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.apiUrl}/Registration/register`, jsonData, { headers }).pipe(
      map(response => {
        console.log('✅ JSON Registration successful:', response);
        return {
          success: true,
          message: 'Registration successful! Please login with your credentials.',
          data: response
        };
      }),
      catchError(error => {
        console.log('❌ JSON Registration failed:', error);
        return throwError(() => error);
      })
    );
  }

  
  getApprovalStatusText(approvalStatus: number, userRole: string = 'User'): string {
    switch (approvalStatus) {
      case AdminApproval.Pending:
        return `Your ${userRole} account is pending admin approval. Please wait for approval before logging in.`;
      case AdminApproval.Approved:
        return `Your ${userRole} account is approved.`;
      case AdminApproval.Rejected:
      case AdminApproval.NotApproved:
        return `Your ${userRole} account has been rejected by admin. Please contact support for more information.`;
      default:
        return `Your ${userRole} account approval status is unknown. Please contact admin for assistance.`;
    }
  }
  doesRoleRequireApproval(role: string): boolean {
    const rolesThatNeedApproval = ['Doctor', 'HelpDesk'];
    return rolesThatNeedApproval.includes(role);
  }

  refreshUserFromStorage(): void {
    const token = this.getStorageItem(this.TOKEN_KEY);
    const userRole = this.getStorageItem(this.ROLE_KEY);
    const userName = this.getStorageItem(this.USER_NAME_KEY);
    const userEmail = this.getStorageItem(this.USER_EMAIL_KEY);
    const userId = this.getStorageItem(this.USER_ID_KEY);

    console.log('refreshUserFromStorage() called with values:', {
      token: token ? 'exists' : 'missing',
      userRole,
      userName,
      userEmail,
      userId
    });

    if (token && this.isTokenValid(token) && userRole) {
      let email = userEmail;
      let name = userName;
      
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          console.log('Decoded JWT for user refresh:', decoded);
          
          if (!email) {
            email = decoded.email || decoded.sub || 'user@example.com';
          }
          
          if (!name || name === userId) { 
            name = decoded.userName || 
                   decoded.name || 
                   decoded.unique_name ||
                   decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                   email?.split('@')[0] || 
                   'User';
                   
            console.log('Extracted name from JWT:', name);
          }
          
        } catch (error) {
          console.log('Could not decode JWT for user info:', error);
          if (!email) email = 'user@example.com';
          if (!name) name = email?.split('@')[0] || 'User';
        }
      }

      const user: User = {
        name: name || email?.split('@')[0] || 'User',
        email: email || 'user@example.com',
        role: userRole
      };

      console.log('Force setting user from storage:', user);
      this.currentUserSubject.next(user);
      this._currentUser.set(user);
      this._isLoggedIn.set(true);
    }
  }
} 