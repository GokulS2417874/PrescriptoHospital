import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔄 AuthInterceptor: Intercepting request to:', req.url);
  
  // Get the current token
  const token = authService.getToken();
  console.log('🔍 AuthInterceptor: Token retrieved:', token ? `Present (${token.substring(0, 20)}...)` : 'MISSING');
  
  // Check if user is logged in
  const isLoggedIn = authService.isLoggedInSignal();
  const currentUser = authService.currentUserSignal();
  console.log('🔍 AuthInterceptor: User state - Logged in:', isLoggedIn, 'User:', currentUser?.email, 'Role:', currentUser?.role);
  
  // Clone the request and add Authorization header if token exists
  let authReq = req;
  if (token) {
    console.log('🔐 AuthInterceptor: Adding JWT token to request');
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🔐 AuthInterceptor: Authorization header set:', authReq.headers.get('Authorization')?.substring(0, 30) + '...');
  } else {
    console.log('⚠️ AuthInterceptor: No token available for request - checking localStorage directly');
    const directToken = localStorage.getItem('authToken');
    console.log('⚠️ AuthInterceptor: Direct localStorage check:', directToken ? 'Token exists' : 'No token');
  }
  
  // Handle the request and catch authentication errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('❌ AuthInterceptor: HTTP Error:', error.status, error.message);
      
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        console.log('🚨 AuthInterceptor: 401 Unauthorized - Token may be expired');
        
        // Clear invalid token and redirect to login
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { 
            returnUrl: router.url,
            message: 'Your session has expired. Please login again.' 
          }
        });
      }
      
      // Handle 403 Forbidden errors
      if (error.status === 403) {
        console.log('🚨 AuthInterceptor: 403 Forbidden - Access denied');
        
        // Redirect to appropriate dashboard based on user role
        const currentUser = authService.currentUserSignal();
        if (currentUser && currentUser.role) {
          redirectToDashboard(currentUser.role, router);
        } else {
          router.navigate(['/login']);
        }
      }
      
      return throwError(() => error);
    })
  );
};

function redirectToDashboard(role: string, router: Router): void {
  switch (role?.toLowerCase()) {
    case 'patient':
      router.navigate(['/appointments']);
      break;
    case 'doctor':
      router.navigate(['/doctor-dashboard']);
      break;
    case 'admin':
      router.navigate(['/admin-dashboard']);
      break;
    case 'helpdesk':
      router.navigate(['/helpdesk']);
      break;
    default:
      router.navigate(['/']);
      break;
  }
} 