import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DoctorService } from '../services/doctor.service';
import { Doctor } from '../models/doctor.model';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class Hero implements OnInit {
  @Output() navigateToAllDoctors = new EventEmitter<string>();

  // Doctors data
  topDoctors: Doctor[] = [];
  isLoadingDoctors: boolean = false;

  // Image handling
  brokenImages = new Set<string>();

  constructor(
    private router: Router,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadTopDoctors();
  }

  navigateTo(page: string): void {
    this.navigateToAllDoctors.emit(page);
  }

  navigateToDoctor(doctorId: number): void {
    this.router.navigate(['/doctor', doctorId]);
  }

  private loadTopDoctors(): void {
    this.isLoadingDoctors = true;
    
    this.doctorService.refreshDoctors().subscribe({
      next: (doctors: Doctor[]) => {
        // Get top 3 doctors (preferably active ones)
        const activeDoctors = doctors.filter((doctor: Doctor) => doctor.active_Status);
        const inactiveDoctors = doctors.filter((doctor: Doctor) => !doctor.active_Status);
        
        // Prioritize active doctors, then inactive ones
        const sortedDoctors = [...activeDoctors, ...inactiveDoctors];
        this.topDoctors = sortedDoctors.slice(0, 3);
        
        this.isLoadingDoctors = false;
      },
      error: (error: any) => {
        console.error('Error loading doctors:', error);
        this.isLoadingDoctors = false;
        // Fallback to empty array
        this.topDoctors = [];
      }
    });
  }

  // Image handling methods
  isImageBroken(imageUrl: string): boolean {
    return this.brokenImages.has(imageUrl);
  }

  markImageAsBroken(imageUrl: string): void {
    if (imageUrl) {
      this.brokenImages.add(imageUrl);
    }
  }
} 