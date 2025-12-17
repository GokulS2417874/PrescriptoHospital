import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoginRequest, LoginResponse, User } from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class AuthManagerComponent {
  constructor(private authService: AuthService) {}

  loginUser(credentials: LoginRequest): Observable<LoginResponse> {
    return this.authService.login(credentials.email, credentials.password).pipe(
      map(response => {
        // Handle the response from the existing auth service
        if (response.success && response.user) {
          // Ensure role is never undefined
          const userRole = response.user.role || 'Patient'; // Default to Patient if role is undefined
          
          // Map the auth service User object to our models User interface
          const user: User = {
            userId: 0, // Default value since auth service doesn't provide this
            userName: response.user.name || credentials.email.split('@')[0],
            email: response.user.email || credentials.email,
            role: userRole,
            avatar: (response.user as any).avatar
          };
          
          return {
            token: '', // Token should be stored by the auth service
            role: userRole,
            user: user,
            success: true,
            message: response.message
          };
        } else {
          return {
            token: '',
            role: '',
            success: false,
            message: response.message || 'Login failed'
          };
        }
      }),
      catchError(error => {
        console.error('AuthManager login error:', error);
        return of({
          token: '',
          role: '',
          success: false,
          message: error.message || 'Authentication failed'
        });
      })
    );
  }
} 