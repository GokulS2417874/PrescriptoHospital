import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    console.log('🛡️ AuthGuard: Checking authentication for route:', state.url);
    
    // Check if user is logged in using signals
    const isLoggedIn = this.authService.isLoggedInSignal();
    const currentUser = this.authService.currentUserSignal();
    
    if (isLoggedIn && currentUser) {
      console.log('✅ AuthGuard: User is authenticated:', currentUser.email);
      return true;
    } else {
      console.log('❌ AuthGuard: User not authenticated, redirecting to login');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }
  }
} 