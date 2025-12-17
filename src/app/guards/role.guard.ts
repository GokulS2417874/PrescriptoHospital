import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    console.log('🛡️ RoleGuard: Checking role authorization for route:', state.url);
    
    const requiredRoles = route.data['expectedRoles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('✅ RoleGuard: No specific roles required for this route');
      return true;
    }

    // Check if user is authenticated first
    const isLoggedIn = this.authService.isLoggedInSignal();
    const currentUser = this.authService.currentUserSignal();
    
    if (!isLoggedIn || !currentUser) {
      console.log('❌ RoleGuard: User not authenticated, redirecting to login');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }

    // Check if user has required role
    const userRole = currentUser.role;
    console.log('🔍 RoleGuard: User role:', userRole, 'Required roles:', requiredRoles);
    
    // Ensure userRole is not undefined
    if (!userRole) {
      console.log('❌ RoleGuard: User role is undefined, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }
    
    if (requiredRoles.includes(userRole)) {
      console.log('✅ RoleGuard: User has required role, access granted');
      return true;
    } else {
      console.log('❌ RoleGuard: User does not have required role, redirecting to appropriate dashboard');
      this.redirectToDashboard(userRole);
      return false;
    }
  }

  private redirectToDashboard(role: string): void {
    console.log('🚀 RoleGuard: Redirecting user to dashboard based on role:', role);
    
    switch (role?.toLowerCase()) {
      case 'patient':
        this.router.navigate(['/appointments']);
        break;
      case 'doctor':
        this.router.navigate(['/doctor-dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'helpdesk':
        this.router.navigate(['/helpdesk']);
        break;
      default:
        console.log('⚠️ RoleGuard: Unknown role, redirecting to home');
        this.router.navigate(['/']);
        break;
    }
  }
} 