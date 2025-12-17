import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { LoginRequest } from '../models/user.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  buttonState = 'normal';
  shakeForm = false;
  
  // Email Reset Properties
  showForgotPassword = false;
  forgotPasswordEmail = '';
  isForgotPasswordLoading = false;
  forgotPasswordMessage = '';
  
  // Token Reset Properties
  showTokenReset = false;
  resetToken = '';
  newPassword = '';
  confirmPassword = '';
  isTokenResetLoading = false;
  resetTokenMessage = '';
  isTokenFromUrl = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    // Check for reset token in URL parameters
    this.route.queryParams.subscribe(params => {
      const urlToken = params['token'];
      if (urlToken) {
        this.resetToken = urlToken;
        this.isTokenFromUrl = true;
        this.showTokenResetForm();
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      // Disable the form during loading
      this.loginForm.disable();
      
      const credentials: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      // Use the existing auth service directly since it already works
      this.authService.login(credentials.email, credentials.password).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.loginForm.enable(); // Re-enable form
          
          if (response.success) {
            console.log('✅ Login successful for:', credentials.email);
            console.log('✅ User data:', response.user);
            
            // Navigate to appropriate dashboard based on user role
            setTimeout(() => {
              this.navigateToDashboard(response.user?.role);
            }, 100);
          } else {
            this.errorMessage = response.message || 'Login failed';
            this.shakeForm = true;
            setTimeout(() => this.shakeForm = false, 600);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.loginForm.enable(); // Re-enable form
          console.error('Login error:', error);
          
          if (error.status === 0) {
            this.errorMessage = 'Cannot connect to server. Please check if your backend is running on http://localhost:5294';
          } else if (error.error && typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = `Login failed. Server error: ${error.status || 'Network Error'}`;
          }
          
          this.shakeForm = true;
          setTimeout(() => this.shakeForm = false, 600);
        }
      });
    } else {
      this.markFormGroupTouched();
      this.shakeForm = true;
      setTimeout(() => this.shakeForm = false, 600);
    }
  }

  private navigateToDashboard(role: string | undefined): void {
    if (!role) {
      this.router.navigate(['/']);
      return;
    }

    switch (role.toLowerCase()) {
      case 'patient':
        this.router.navigate(['/patient-dashboard']);
        break;
      case 'doctor':
        this.router.navigate(['/doctor-dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'helpdesk':
        this.router.navigate(['/helpdesk-dashboard']);
        break;
      default:
        this.router.navigate(['/']);
        break;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onButtonMouseEnter(): void {
    this.buttonState = 'hovered';
  }

  onButtonMouseLeave(): void {
    this.buttonState = 'normal';
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
  get isFormDisabled() { return this.loginForm.disabled; }

  showForgotPasswordForm(): void {
    this.showForgotPassword = true;
    this.forgotPasswordEmail = '';
    this.forgotPasswordMessage = '';
    this.errorMessage = '';
  }

  hideForgotPasswordForm(): void {
    this.showForgotPassword = false;
    this.forgotPasswordEmail = '';
    this.forgotPasswordMessage = '';
    this.errorMessage = '';
  }

  onForgotPasswordSubmit(): void {
    if (!this.forgotPasswordEmail || !this.isValidEmail(this.forgotPasswordEmail)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isForgotPasswordLoading = true;
    this.errorMessage = '';

    this.authService.forgotPassword(this.forgotPasswordEmail).subscribe({
      next: (response: {success: boolean, message: string}) => {
        this.isForgotPasswordLoading = false;
        if (response.success) {
          this.forgotPasswordMessage = response.message;
          this.errorMessage = '';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error: any) => {
        this.isForgotPasswordLoading = false;
        console.error('Forgot password error:', error);
        this.errorMessage = 'Failed to send reset email. Please try again.';
      }
    });
  }

  showTokenResetForm(): void {
    this.showForgotPassword = false;
    this.showTokenReset = true;
    if (!this.isTokenFromUrl) {
      this.resetToken = '';
    }
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.resetTokenMessage = '';
  }

  hideTokenResetForm(): void {
    this.showTokenReset = false;
    this.resetToken = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.resetTokenMessage = '';
    this.errorMessage = '';
    this.isTokenFromUrl = false;
  }

  onTokenResetSubmit(): void {
    // Validation
    if (!this.resetToken.trim()) {
      this.errorMessage = 'Please enter the reset token';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isTokenResetLoading = true;
    this.errorMessage = '';

    console.log('Reset Token:', this.resetToken);

    this.authService.resetPassword(this.resetToken, this.newPassword).subscribe({
      next: (response: {success: boolean, message: string}) => {
        this.isTokenResetLoading = false;
        if (response.success) {
          this.resetTokenMessage = response.message;
          this.errorMessage = '';
          // Automatically redirect to login after 3 seconds
          setTimeout(() => {
            this.hideTokenResetForm();
          }, 3000);
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error: any) => {
        this.isTokenResetLoading = false;
        console.error('Token reset error:', error);
        this.errorMessage = 'Failed to reset password. Please try again.';
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
} 