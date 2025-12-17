import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  
  // Track broken images
  private brokenImages: Set<string> = new Set();

  // User profile data from backend
  userProfile: any = null;
  isLoading = true;
  error: string | null = null;

  // Edit mode state
  isEditMode = false;
  isSaving = false;

  // Edit form data (for all user types) - NO PASSWORD NEEDED
  editFormData = {
    Role: 'Patient',
    UserName: '',
    Email: '',
    DateOfBirth: '',
    Gender: '',
    PhoneNumber: '',
    EmergencyContactName: '',
    EmergencyContactRelationship: '',
    EmergencyContactPhoneNumber: '',
    EmergencyContactEmail: '' // Added emergency contact email
  };

  // Gender options
  genderOptions = ['Male', 'Female', 'Other'];

  // Relationship options
  relationshipOptions = ['Father', 'Mother', 'Spouse', 'Sibling', 'Friend', 'Other'];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Force refresh user data from localStorage first
    console.log('🔄 Refreshing user data from localStorage...');
    this.authService.refreshUserFromStorage();
    
    // Small delay to ensure user data is properly set
    setTimeout(() => {
      this.loadUserProfile();
    }, 100);
  }

  getCurrentUserRole(): string {
    // Use role from API response (userProfile.role)
    if (this.userProfile && this.userProfile.role) {
      return this.userProfile.role;
    }
    
    // Fallback to auth service
    const currentUser = this.authService.getCurrentUserSnapshot();
    return currentUser?.role || 'User';
  }

  loadUserProfile() {
    this.isLoading = true;
    this.error = null;

    // Get current user to check role
    const currentUser = this.authService.getCurrentUserSnapshot();
    console.log('🔍 Loading profile for user:', currentUser);

    if (!currentUser) {
      this.error = 'User not found. Please login again.';
      this.isLoading = false;
      return;
    }

    // Use common profile method for all user types
    console.log('✅ Loading profile using common API');
    this.authService.getUserProfile().subscribe({
      next: (profile) => {
        console.log('✅ Profile loaded:', profile);
        if (profile && typeof profile === 'object') {
          console.log('🔍 Profile fields available:', Object.keys(profile));
          this.userProfile = profile;
          this.populateEditForm();
        } else {
          console.warn('⚠️ Profile data is null or invalid:', profile);
          this.error = 'Invalid profile data received.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading profile:', error);
        this.error = 'Failed to load profile. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // Populate edit form with current profile data - IMPROVED MAPPING
  populateEditForm() {
    if (this.userProfile) {
      console.log('🔍 Populating form with profile data:', this.userProfile);
      
      // Get user role from profile data (from API response)
      const userRole = this.userProfile.role || this.getCurrentUserRole();
      
      // Base fields for all user types (common fields from the API)
      this.editFormData = {
        Role: userRole,
        UserName: this.userProfile.userName || '',
        Email: this.userProfile.email || '',
        PhoneNumber: this.userProfile.phoneNumber || '',
        DateOfBirth: this.formatDateForInput(this.userProfile.dateOfBirth || ''),
        Gender: this.userProfile.gender || '',
        EmergencyContactName: this.userProfile.emergencyContactName || '',
        EmergencyContactRelationship: this.userProfile.emergencyContactRelationship || '',
        EmergencyContactPhoneNumber: this.userProfile.emergencyContactPhoneNumber || '',
        EmergencyContactEmail: this.userProfile.emergencyContactEmail || ''
      };
      
      console.log('🔍 Form populated for role:', userRole);
      console.log('🔍 Form data:', this.editFormData);
    } else {
      console.warn('⚠️ No profile data available to populate form');
    }
  }

  // Format date for HTML input (YYYY-MM-DD format)
  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn('Error formatting date:', dateStr, error);
      return '';
    }
  }

  // Enter edit mode
  editProfile() {
    this.isEditMode = true;
    this.populateEditForm();
  }

  // Cancel edit mode
  cancelEdit() {
    this.isEditMode = false;
    this.populateEditForm(); // Reset form data
  }

  // Save profile changes
  saveProfile() {
    if (!this.validateForm()) {
      return;
    }

    console.log('🔄 Saving profile with data:', this.editFormData);
    this.isSaving = true;

    this.authService.updateProfile(this.editFormData).subscribe({
      next: (response: {success: boolean, message: string, data?: any}) => {
        this.isSaving = false;
        
        if (response.success) {
          alert('✅ Profile updated successfully!');
          this.isEditMode = false;
          this.loadUserProfile(); // Reload to get updated data
        } else {
          console.log('❌ Update failed:', response.message);
          alert(response.message);
        }
      },
      error: (error: any) => {
        this.isSaving = false;
        console.error('❌ Error updating profile:');
        console.error('- Status:', error.status);
        console.error('- Status Text:', error.statusText);
        console.error('- Error Body:', error.error);
        console.error('- Form Data Sent:', this.editFormData);
        console.error('- Full Error:', error);
        
        let errorMessage = 'Failed to update profile.';
        
        if (error.status === 400) {
          if (error.error && error.error.message) {
            errorMessage = `Invalid data: ${error.error.message}`;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = `Bad request: ${error.error}`;
          } else {
            errorMessage = 'Invalid data sent to server. Please check all fields.';
          }
        } else if (error.status === 401) {
          errorMessage = 'Session expired. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'Permission denied. You cannot update this profile.';
        }
        
        alert(errorMessage);
      }
    });
  }

  // Form validation (NO PASSWORD VALIDATION)
  validateForm(): boolean {
    if (!this.editFormData.UserName.trim()) {
      alert('User Name is required.');
      return false;
    }

    if (!this.editFormData.Email.trim()) {
      alert('Email is required.');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editFormData.Email)) {
      alert('Please enter a valid email address.');
      return false;
    }

    // Phone validation (if provided)
    if (this.editFormData.PhoneNumber && !/^\d{10}$/.test(this.editFormData.PhoneNumber.replace(/\D/g, ''))) {
      alert('Please enter a valid 10-digit phone number.');
      return false;
    }

    return true;
  }

  goBack() {
    this.router.navigate(['']);
  }

  // Image error handling methods
  isImageBroken(imageUrl: string): boolean {
    return this.brokenImages.has(imageUrl);
  }

  markImageAsBroken(imageUrl: string): void {
    this.brokenImages.add(imageUrl);
  }

  // Utility method to format phone numbers
  formatPhoneNumber(phone: string): string {
    if (!phone) return 'Not provided';
    // Simple formatting for display
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }

  // Format date for display
  formatDate(dateStr: string): string {
    if (!dateStr) return 'Not provided';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Debug method to check data mapping
  debugProfileData() {
    console.log('🔍 === PROFILE DEBUG INFO ===');
    console.log('Backend Profile Data:', this.userProfile);
    console.log('Form Data:', this.editFormData);
    console.log('Available backend fields:', this.userProfile ? Object.keys(this.userProfile) : 'No data');
    
    // Show field mapping
    if (this.userProfile) {
      console.log('🔍 Field Mapping:');
      console.log('- UserName:', this.userProfile.userName || this.userProfile.UserName);
      console.log('- Email:', this.userProfile.email || this.userProfile.Email);
      console.log('- DateOfBirth:', this.userProfile.dateOfBirth || this.userProfile.DateOfBirth);
      console.log('- Gender:', this.userProfile.gender || this.userProfile.Gender);
      console.log('- PhoneNumber:', this.userProfile.phoneNumber || this.userProfile.PhoneNumber);
      console.log('- EmergencyContactName:', this.userProfile.emergencyContactName || this.userProfile.EmergencyContactName);
      console.log('- EmergencyContactRelationship:', this.userProfile.emergencyContactRelationship || this.userProfile.EmergencyContactRelationship);
      console.log('- EmergencyContactPhoneNumber:', this.userProfile.emergencyContactPhoneNumber || this.userProfile.EmergencyContactPhoneNumber);
      console.log('- EmergencyContactEmail:', this.userProfile.emergencyContactEmail || this.userProfile.EmergencyContactEmail);
    }
    
    alert('Check console for detailed profile debug info!');
  }
} 