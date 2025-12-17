import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Doctor, SpecializationEnum } from '../models/doctor.model';
import { DoctorService } from '../services/doctor.service';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="doctors-container">
      <div class="container-fluid py-4">
        <!-- Header -->
        <div class="header-section mb-4">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="mb-1">Browse through the doctors specialist.</h2>
              <p class="text-muted mb-0">Simply browse through our extensive list of trusted doctors.</p>
            </div>
            <div>
              <button 
                class="btn btn-outline-primary btn-sm"
                (click)="refreshDoctors()"
                [disabled]="isLoading">
                <i class="fas fa-sync-alt me-2" [class.fa-spin]="isLoading"></i>
                {{ isLoading ? 'Loading...' : 'Refresh from API' }}
              </button>
            </div>
          </div>
        </div>

        <div class="row">
          <!-- Specialization Filter -->
          <div class="col-lg-3 col-md-4 mb-4">
            <div class="filter-section">
              <h5 class="mb-3">Specializations</h5>
              <div class="specialization-filters">
                <div 
                  class="filter-item"
                  [class.active]="selectedSpecialization === ''"
                  (click)="filterBySpecialization('')">
                  All Doctors
                </div>
                <div 
                  *ngFor="let spec of specializations"
                  class="filter-item"
                  [class.active]="selectedSpecialization === spec.name"
                  (click)="filterBySpecialization(spec.name)">
                  {{ spec.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- Doctors Grid -->
          <div class="col-lg-9 col-md-8">
            <div class="row" *ngIf="filteredDoctors.length > 0; else noDoctors">
              <div 
                class="col-xl-3 col-lg-4 col-md-6 col-sm-6 mb-4" 
                *ngFor="let doctor of filteredDoctors">
                <div class="doctor-card" (click)="viewDoctorDetail(doctor.userId.toString())">
                  <!-- Doctor Image -->
                  <div class="doctor-image">
                    <img *ngIf="doctor.image && !isImageBroken(doctor.image)" 
                         [src]="doctor.image" 
                         [alt]="doctor.userName" 
                         class="img-fluid doctor-img"
                         (error)="markImageAsBroken(doctor.image)">
                    <div *ngIf="!doctor.image || isImageBroken(doctor.image)" 
                         class="doctor-image-placeholder">
                      <i class="fas fa-user-md"></i>
                    </div>
                  </div>

                  <!-- Doctor Info -->
                  <div class="doctor-info">
                    <h5 class="doctor-name">{{ doctor.name || doctor.userName }}</h5>
                    <p class="doctor-specialization">{{ doctor.specialization }}</p>
                    
                    <!-- Experience -->
                    <div class="doctor-stats">
                      <span class="experience">{{ doctor.experienceYears }} Years</span>
                    </div>

                    <!-- Consultation Fee -->
                    <div class="consultation-fee">
                      <span class="fee-label">Consultation Fee:</span>
                      <span class="fee-amount">₹{{ doctor.consultantFees || doctor.consultant_fees || doctor.consultationFee || 500 }}</span>
                    </div>
                  </div>

                  <!-- Book Button -->
                  <div class="book-button-container">
                    <button 
                      class="btn btn-primary book-btn"
                      (click)="bookAppointment($event, doctor.userId.toString())">
                      Book Appointment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- No Doctors Found -->
            <ng-template #noDoctors>
              <div class="no-doctors text-center py-5">
                <i class="fas fa-user-md fa-3x text-muted mb-3"></i>
                <h4>No doctors found</h4>
                <p class="text-muted">Try selecting a different specialization</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  // Update the specializations property type
  specializations: {id: number, name: string}[] = [];
  selectedSpecialization: string = '';
  isLoading: boolean = false;
  
  // Track broken images
  private brokenImages: Set<string> = new Set();

  constructor(
    private doctorService: DoctorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.loadSpecializations();
  }

  loadDoctors(): void {
    this.isLoading = true;
    this.doctorService.getAllDoctors().subscribe(doctors => {
      this.doctors = doctors;
      this.filteredDoctors = doctors;
      this.isLoading = false;
      console.log('✅ Loaded doctors for listing:', doctors);
      doctors.forEach((doctor, index) => {
        console.log(`Doctor ${index + 1}: ID=${doctor.userId || doctor.doctorId}, Name=${doctor.name || doctor.userName}, Specialization=${doctor.specialization}`);
      });
    });
  }

  loadSpecializations(): void {
    this.doctorService.getSpecializations().subscribe((specializations: {id: number, name: string}[]) => {
      this.specializations = specializations;
    });
  }

  filterBySpecialization(specialization: string): void {
    this.selectedSpecialization = specialization;
    
    if (specialization === '') {
      this.filteredDoctors = this.doctors;
    } else {
      this.filteredDoctors = this.doctors.filter(
        doctor => doctor.specialization === specialization
      );
    }
  }

  viewDoctorDetail(doctorId: string): void {
    console.log('🔍 Navigating to doctor detail with ID:', doctorId);
    // Navigate to doctor detail page using Angular Router
    this.router.navigate(['/doctor', doctorId]);
  }

  bookAppointment(event: Event, doctorId: string): void {
    event.stopPropagation();
    this.viewDoctorDetail(doctorId);
  }

  refreshDoctors(): void {
    this.isLoading = true;
    this.doctorService.refreshDoctors().subscribe((doctors: any) => {
      this.doctors = doctors;
      this.filteredDoctors = doctors;
      this.isLoading = false;
      this.loadSpecializations(); // Reload specializations too
    });
  }

  // Image error handling methods
  isImageBroken(imageUrl: string): boolean {
    return this.brokenImages.has(imageUrl);
  }

  markImageAsBroken(imageUrl: string): void {
    this.brokenImages.add(imageUrl);
  }
} 