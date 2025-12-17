import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Specialization } from '../models/common.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit {
  selectedRole: string = 'Patient';
  isJobCareerFlow: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  registrationForm: FormGroup;

  // UI state for password visibility
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // Dropdown options using exact backend enum values
  genders = ['Male', 'Female', 'Other'];
  
  // Specialization mapping: display name -> backend enum value
  specializationOptions = [
    { display: 'Cardiologist', value: 'Cardiologist' },
    { display: 'Dermatologist', value: 'Dermatologist' },
    { display: 'Neurologist', value: 'Neurologist' }, 
    { display: 'Orthopedic Surgeon', value: 'Orthopedic_Surgeon' },
    { display: 'Pediatrician', value: 'Pediatrician' },
    { display: 'Psychiatrist', value: 'Psychiatrist' },
    { display: 'Ophthalmologist', value: 'Ophthalmologist' },
    { display: 'ENT Specialist', value: 'ENT_Specialist' },
    { display: 'Gastroenterologist', value: 'Gastroenterologist' },
    { display: 'Urologist', value: 'Urologist' },
    { display: 'Endocrinologist', value: 'Endocrinologist' },
    { display: 'Oncologist', value: 'Oncologist' }
  ];
  
  relationships = ['Father', 'Mother', 'Guardian', 'Spouse', 'Others'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.registrationForm = this.fb.group({});
    this.initializeForm();
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      // Basic Information
      userName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      dateOfBirth: [''],
      gender: [''],
      
      // Emergency Contact (required for all roles)
      emergencyContactName: ['', [Validators.required]],
      emergencyContactPhoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      emergencyContactRelationship: ['', [Validators.required]],
      
      // Doctor/HelpDesk specific fields
      specialization: [''],
      qualification: [''],
      experienceYears: [0, [Validators.min(0)]],
      languages: ['']
    }, { validators: this.passwordMatchValidator });
  }

  /**
   * 🔧 Properly disable/enable form during loading
   */
  private setFormLoadingState(loading: boolean): void {
    this.isLoading = loading;
    if (loading) {
      this.registrationForm.disable();
    } else {
      this.registrationForm.enable();
    }
  }

  /**
   * ✅ Check if form should be disabled (for template use)
   */
  get isFormDisabled(): boolean {
    return this.isLoading;
  }

  /**
   * ✅ Check if form can be submitted
   */
  get canSubmitForm(): boolean {
    return this.registrationForm.valid && !this.isLoading;
  }

  /**
   * 🔧 Debug form validity (for development)
   */
  debugFormValidity(): void {
    console.group('🔍 Form Validation Debug');
    console.log('Form valid:', this.registrationForm.valid);
    console.log('Form value:', this.registrationForm.value);
    console.log('Form errors:', this.registrationForm.errors);
    
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      if (control && control.invalid) {
        console.log(`❌ ${key}:`, {
          value: control.value,
          errors: control.errors,
          touched: control.touched,
          dirty: control.dirty
        });
      }
    });
    console.groupEnd();
  }

  /**
   * 📋 Get list of invalid control names for display
   */
  getInvalidControls(): string[] {
    const invalidControls: string[] = [];
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      if (control && control.invalid) {
        invalidControls.push(key);
      }
    });
    return invalidControls;
  }

  // UI helper methods
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  isPasswordMismatch(): boolean {
    return !!(this.registrationForm.errors?.['passwordMismatch'] && 
              this.registrationForm.get('confirmPassword')?.touched);
  }

  // Custom validator for password matching
  passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
    const password = control.get('passwordHash');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  ngOnInit(): void {
    // Check if this is a job career registration flow (for Doctor/HelpDesk)
    this.route.queryParams.subscribe(params => {
      if (params['role'] && (params['role'] === 'Doctor' || params['role'] === 'HelpDesk')) {
        // Only allow Doctor/HelpDesk roles through job career flow
        this.selectedRole = params['role'];
        this.isJobCareerFlow = true;
        this.updateFormValidation();
      } else {
        // Regular registration - allow role selection
        this.selectedRole = 'Patient';
        this.isJobCareerFlow = false;
        this.updateFormValidation();
      }
    });
  }

  /**
   * Handle role change from dropdown
   */
  onRoleChange(): void {
    console.log('Role changed to:', this.selectedRole);
    this.updateFormValidation();
  }

  private updateFormValidation(): void {
    // Clear existing validators first
    this.registrationForm.get('dateOfBirth')?.clearValidators();
    this.registrationForm.get('gender')?.clearValidators();
    this.registrationForm.get('specialization')?.clearValidators();
    this.registrationForm.get('qualification')?.clearValidators();
    this.registrationForm.get('experienceYears')?.clearValidators();

    // Add role-specific validators
    if (this.selectedRole === 'Patient') {
      this.registrationForm.get('dateOfBirth')?.setValidators([Validators.required]);
      this.registrationForm.get('gender')?.setValidators([Validators.required]);
    } else if (this.selectedRole === 'Doctor') {
      this.registrationForm.get('dateOfBirth')?.setValidators([Validators.required]);
      this.registrationForm.get('gender')?.setValidators([Validators.required]);
      this.registrationForm.get('specialization')?.setValidators([Validators.required]);
      this.registrationForm.get('qualification')?.setValidators([Validators.required]);
      this.registrationForm.get('experienceYears')?.setValidators([Validators.required, Validators.min(0)]);
    } else if (this.selectedRole === 'HelpDesk') {
      this.registrationForm.get('dateOfBirth')?.setValidators([Validators.required]);
      this.registrationForm.get('gender')?.setValidators([Validators.required]);
      this.registrationForm.get('qualification')?.setValidators([Validators.required]);
    }

    // Update validity after changing validators
    Object.keys(this.registrationForm.controls).forEach(key => {
      this.registrationForm.get(key)?.updateValueAndValidity();
    });
  }

  submitForm(): void {
    if (!this.registrationForm.valid) {
      this.markAllFieldsAsTouched();
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    // Set loading state and disable form
    this.setFormLoadingState(true);
    this.errorMessage = '';

    const formValues = this.registrationForm.getRawValue(); // Use getRawValue() to get disabled control values
    console.log('Form values:', formValues);

    // Create FormData for multipart/form-data submission
    const formData = new FormData();

    // Add common fields - matching API specification exactly
    formData.append('UserName', formValues.userName || '');
    formData.append('Email', formValues.email || '');
    formData.append('PhoneNumber', formValues.phoneNumber || '');
    formData.append('Password', formValues.passwordHash || ''); // API expects 'Password', not 'PasswordHash'
    formData.append('Role', this.selectedRole);

    // Required fields from API specification
    formData.append('BookedBy', 'Patient'); // Required field
    formData.append('HelpDeskId', '0'); // Required field

    // Emergency contact
    if (formValues.emergencyContactName) formData.append('EmergencyContactName', formValues.emergencyContactName);
    if (formValues.emergencyContactPhoneNumber) formData.append('EmergencyContactPhoneNumber', formValues.emergencyContactPhoneNumber);
    if (formValues.emergencyContactRelationship) formData.append('EmergencyContactRelationship', formValues.emergencyContactRelationship);

    // Gender - send as string, not number (API expects "Male", "Female", "Other")
    const genderMapping: { [key: string]: string } = {
      'Male': 'Male',
      'Female': 'Female', 
      'Other': 'Other'
    };

    // Role-specific fields
    if (this.selectedRole === 'Patient') {
      if (formValues.dateOfBirth) formData.append('DateOfBirth', formValues.dateOfBirth);
      if (formValues.gender) formData.append('Gender', genderMapping[formValues.gender] || 'Other');
    }

    // Doctor specific fields
    if (this.selectedRole === 'Doctor') {
      if (formValues.dateOfBirth) formData.append('DateOfBirth', formValues.dateOfBirth);
      if (formValues.gender) formData.append('Gender', genderMapping[formValues.gender] || 'Other');
      if (formValues.specialization) formData.append('Specialization', formValues.specialization);
      if (formValues.qualification) formData.append('Qualification', formValues.qualification);
      if (formValues.experienceYears !== undefined) formData.append('ExperienceYears', formValues.experienceYears.toString());
      if (formValues.languages) formData.append('Languages', formValues.languages);
      // ProfileImage is optional - would be added here if file upload is implemented
    }

    // HelpDesk specific fields
    if (this.selectedRole === 'HelpDesk') {
      if (formValues.dateOfBirth) formData.append('DateOfBirth', formValues.dateOfBirth);
      if (formValues.gender) formData.append('Gender', genderMapping[formValues.gender] || 'Other');
      if (formValues.qualification) formData.append('Qualification', formValues.qualification);
      if (formValues.languages) formData.append('Languages', formValues.languages);
      // ProfileImage is optional - would be added here if file upload is implemented
    }

    // Debug: Log all FormData entries
    console.log('FormData contents:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    // Submit to backend
    this.authService.registerUser(formData).subscribe({
      next: (response: any) => {
        this.setFormLoadingState(false); // Re-enable form
        console.log('Registration successful:', response);

        // Check if registration was actually successful
        if (response.success) {
          // Show success message
          alert(`✅ Registration successful!\n\nWelcome to Prescripto!\nRole: ${this.selectedRole}\n\nYou can now login with your credentials.`);

          // Reset form
          this.resetForm();

          // Navigate to login page for immediate login
          this.router.navigate(['/login']);
        } else {
          // Registration failed - show error message
          this.errorMessage = response.message || 'Registration failed. Please try again.';
        }
      },
      error: (error: any) => {
        this.setFormLoadingState(false); // Re-enable form on error
        console.error('Registration failed:', error);

        if (error.status === 409) {
          this.errorMessage = 'An account with this email already exists. Please try logging in.';
        } else if (error.status === 400) {
          this.errorMessage = error.message || 'Invalid data provided. Please check your information.';
        } else if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else {
          this.errorMessage = error.message || 'Registration failed. Please try again.';
        }
      }
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      this.registrationForm.get(key)?.markAsTouched();
    });
  }

  resetForm(): void {
    this.registrationForm.reset();
    this.errorMessage = '';
    this.setFormLoadingState(false);
    
    // Reset to default values for specific fields
    this.registrationForm.patchValue({
      experienceYears: 0
    });
    
    // Re-apply validation rules
    this.updateFormValidation();
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return `${fieldName} format is invalid`;
      if (field.errors['min']) return `${fieldName} must be greater than ${field.errors['min'].min}`;
    }
    
    // Password mismatch error
    if (fieldName === 'confirmPassword' && this.registrationForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  getTitle(): string {
    if (this.isJobCareerFlow) {
      return `Join Our ${this.selectedRole} Team`;
    }
    return 'Create Your Account';
  }

  getSubtitle(): string {
    if (this.isJobCareerFlow) {
      return `Start your career as a ${this.selectedRole} with Prescripto Healthcare`;
    }
    return 'Join Prescripto for better healthcare management';
  }
}