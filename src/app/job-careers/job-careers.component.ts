import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-careers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-careers.component.html',
  styleUrls: ['./job-careers.component.css']
})
export class JobCareersComponent {
  @Output() close = new EventEmitter<void>();
  
  selectedJobRole: string = '';
  showModal: boolean = true; // Changed to true since this component is only shown when modal should be open

  constructor(private router: Router) {}

  openJobCareersModal() {
    console.log('Job careers modal opening...');
    this.showModal = true;
  }

  closeModal() {
    console.log('Closing job careers modal. Selected role was:', this.selectedJobRole);
    this.showModal = false;
    this.selectedJobRole = '';
    this.close.emit(); // Emit close event to parent component
  }

  onJobRoleSelect() {
    console.log('Job role selected:', this.selectedJobRole);
    
    if (this.selectedJobRole) {
      // 🔧 FIX: Store the role before closing modal (which clears it)
      const selectedRole = this.selectedJobRole;
      console.log('Stored role before closing modal:', selectedRole);
      
      this.closeModal();
      
      // Debug: Log the navigation parameters
      const navigationParams = { 
        type: 'job-career', 
        role: selectedRole  // Use stored role, not this.selectedJobRole
      };
      console.log('Navigating with params:', navigationParams);
      console.log('Using stored role value:', `"${selectedRole}"`);
      console.log('Navigation params stringified:', JSON.stringify(navigationParams));
      
      // Try alternative navigation method
      const urlWithParams = `/register?type=job-career&role=${selectedRole}`;
      console.log('Alternative URL construction:', urlWithParams);
      
      // Navigate to registration with the selected role
      this.router.navigate(['/register'], { 
        queryParams: navigationParams 
      }).then((success) => {
        console.log('Navigation completed successfully:', success);
        console.log('Current URL after navigation:', this.router.url);
        
        // If standard navigation fails, try navigateByUrl
        if (!success || !this.router.url.includes('role=')) {
          console.log('Standard navigation may have failed, trying navigateByUrl...');
          this.router.navigateByUrl(urlWithParams);
        }
      }).catch((error) => {
        console.error('Navigation failed:', error);
        console.log('Falling back to navigateByUrl...');
        this.router.navigateByUrl(urlWithParams);
      });
    } else {
      console.error('No job role selected!');
    }
  }

  // Debug method to track role selection
  selectRole(role: string) {
    console.log('Role selected:', role);
    console.log('Previous role was:', this.selectedJobRole);
    this.selectedJobRole = role;
    console.log('New role is:', this.selectedJobRole);
  }

  // Debug method to check current state
  getCurrentState() {
    console.log('Current job careers state:', {
      showModal: this.showModal,
      selectedJobRole: this.selectedJobRole
    });
  }
} 