import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { AppointmentService } from '../services/appointment.service';
import { PrescriptionService } from '../services/prescription.service';
import { HttpClient } from '@angular/common/http';

// Import models
import { User } from '../models/user.models';
import { Doctor } from '../models/doctor.model';
import { Appointment } from '../models/appointment.model';
import { Prescription, MedicineType, DosageType, TabletScheduleTime } from '../models/prescription.model';
import { Status, AppointmentStatus } from '../models/common.model';

// Define interfaces matching backend exactly like working project
export interface DoctorProfile {
  doctorId?: number;
  userId?: number;
  name?: string;
  userName?: string;
  email: string;
  role?: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  consultantFees?: number;
  languages?: string[];
  status?: Status;
  shift?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isApprovedByAdmin?: number | boolean;
  createdAt?: string;
}

export interface DoctorAppointment {
  appointmentId: number;
  patientId: number;
  patientName?: string;
  patientEmail?: string;
  doctorId: number;
  doctorName?: string;
  appointmentDate: string;
  startTime?: string;
  endTime?: string;
  appointmentStartTime?: string;
  appointmentEndTime?: string;
  status?: AppointmentStatus;
  appointmentStatus?: AppointmentStatus;
  consultantFees?: number;
  notes?: string;
  prescriptionId?: number;
  specialization?: string;
  isReminderSent?: boolean;
}

export interface PrescriptionDto {
  appointmentId: number;
  doctorId: number;
  patientId: number;
  instructions: string;
  medicines: PrescriptionMedicineDto[];
}

export interface PrescriptionMedicineDto {
  medicineType: string;
  dosages: string;
  scheduleTime: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private prescriptionService = inject(PrescriptionService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  // Component state - ensure arrays are always initialized
  doctorProfile: DoctorProfile | null = null;
  appointments: DoctorAppointment[] = [];
  todayAppointments: DoctorAppointment[] = [];
  isLoading = false;
  isUpdatingStatus = false;
  isUpdatingAppointment = false;
  isAddingPrescription = false;
  message = '';
  messageType: 'success' | 'error' | 'warning' | 'info' = 'success';
  currentTab = 'dashboard';
  
  // Track appointments that have prescriptions added
  appointmentsWithPrescriptions = new Set<number>();
  
  // Track which appointment is being updated
  updatingAppointmentId: number | null = null;
  
  // Prescription modal state
  showPrescriptionModal = false;
  selectedAppointment: DoctorAppointment | null = null;
  prescriptionForm: FormGroup;
  
  // View prescriptions modal state
  showViewPrescriptionsModal = false;
  viewingPrescriptions: any[] = [];
  loadingPrescriptions = false;

  // Enums for template
  Status = Status;
  AppointmentStatus = AppointmentStatus;
  MedicineType = MedicineType;
  DosageType = DosageType;
  TabletScheduleTime = TabletScheduleTime;

  // Appointment management properties
  private updatingAppointments = new Set<number>();
  private shiftMonitorInterval: any;

  constructor() {
    this.prescriptionForm = this.fb.group({
      instructions: ['', [Validators.required, Validators.minLength(10)]],
      medicines: this.fb.array([])
    });
    
    // Initialize empty arrays to prevent undefined errors
    this.appointments = [];
    this.todayAppointments = [];
    
    // Initialize dropdown options
    this.initializeDropdownOptions();
  }

  ngOnInit(): void {
    // Force refresh user data from localStorage first
    console.log('🔄 Refreshing user data from localStorage...');
    this.authService.refreshUserFromStorage();
    
    // Initialize form first
    this.initializeDropdownOptions();
    
    // Check authentication
    if (!this.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Debug current user data  
    const currentUser = this.authService.getCurrentUserSnapshot();
    const token = this.authService.getToken();
    const userData = this.authService.getCurrentUser();
    
    console.log('DEBUG: Current user data:', userData);
    console.log('DEBUG: JWT Token present:', !!token);
    console.log('DEBUG: Is authenticated:', this.authService.isAuthenticated());

    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        console.log('DEBUG: JWT Payload:', payload);
        console.log('DEBUG: User Role:', payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
      } catch (error) {
        console.error('Error decoding JWT:', error);
      }
    }

    // Start shift monitoring
    this.startShiftStatusMonitoring();
    
    // Small delay to ensure user data is properly set
    setTimeout(() => {
      // Load doctor data
      this.loadDoctorData();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.shiftMonitorInterval) {
      clearInterval(this.shiftMonitorInterval);
    }
  }

  // Monitor shift status and auto-refresh
  startShiftStatusMonitoring(): void {
    // Check shift status every 10 minutes to detect when shift ends
    console.log('Starting shift monitoring - will check every 10 minutes');
    this.shiftMonitorInterval = setInterval(() => {
      console.log('Checking if shift has ended...');
      this.validateShiftStatus();
    }, 10 * 60 * 1000); // 10 minutes
  }

  // Prescription form getters
  get medicines(): FormArray {
    return this.prescriptionForm.get('medicines') as FormArray;
  }

  // Create medicine form group
  createMedicineFormGroup(): FormGroup {
    const group = this.fb.group({
      medicineType: ['', Validators.required],
      dosages: ['', Validators.required], 
      scheduleTime: ['', Validators.required]
    });
    
    // Mark as pristine and untouched initially to prevent validation errors
    group.markAsPristine();
    group.markAsUntouched();
    
    return group;
  }

  // Add medicine to prescription
  addMedicine(): void {
    this.medicines.push(this.createMedicineFormGroup());
  }

  // Remove medicine from prescription
  removeMedicine(index: number): void {
    if (this.medicines.length > 1) {
      this.medicines.removeAt(index);
    }
  }

  // Open prescription modal
  openPrescriptionModal(appointment: DoctorAppointment): void {
    this.selectedAppointment = appointment;
    this.showPrescriptionModal = true;
    
    // Reset form
    this.prescriptionForm.reset();
    this.medicines.clear();
    this.addMedicine(); // Start with one medicine
    
    // Set form values
    this.prescriptionForm.patchValue({
      instructions: ''
    });
  }

  // Close prescription modal
  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
    this.selectedAppointment = null;
    this.prescriptionForm.reset();
    this.medicines.clear();
  }

  // Submit prescription using real API (matching working project)
  submitPrescription(): void {
    console.log('DEBUG: submitPrescription called');
    console.log('DEBUG: selectedAppointment:', this.selectedAppointment);
    console.log('DEBUG: doctorProfile:', this.doctorProfile);
    console.log('DEBUG: prescriptionForm.value:', this.prescriptionForm.value);
    console.log('DEBUG: prescriptionForm.valid:', this.prescriptionForm.valid);
    
    if (!this.selectedAppointment || !this.doctorProfile) {
      console.log('DEBUG: Missing appointment or doctor information');
      this.showMessage('Missing appointment or doctor information', 'error');
      return;
    }

    if (this.prescriptionForm.invalid) {
      console.log('DEBUG: Form is invalid');
      this.showMessage('Please fill all required fields correctly', 'error');
      this.markPrescriptionFormTouched();
      return;
    }

    // Additional validation: Check if valid medicine options are selected
    const medicines = this.prescriptionForm.value.medicines;
    const hasInvalidMedicine = medicines.some((medicine: any) => 
      !medicine.medicineType || medicine.medicineType === '' || 
      !medicine.dosages || medicine.dosages === '' ||
      !medicine.scheduleTime || medicine.scheduleTime === ''
    );

    if (hasInvalidMedicine) {
      console.log('DEBUG: Invalid medicine selections detected');
      this.showMessage('Please select valid options for all medicine fields', 'error');
      return;
    }

    this.isAddingPrescription = true;
    console.log('DEBUG: Creating prescriptionDto...');

    // Backend expects medicine fields as strings, ensure they're not empty
    const prescriptionDto = {
      appointmentId: this.selectedAppointment.appointmentId,
      doctorId: this.doctorProfile.userId || this.doctorProfile.doctorId || 1,
      patientId: this.selectedAppointment.patientId,
      instructions: this.prescriptionForm.value.instructions,
      medicines: this.prescriptionForm.value.medicines.map((medicine: any) => {
        return {
          medicineType: medicine.medicineType?.toString() || '',
          dosages: medicine.dosages?.toString() || '',
          scheduleTime: medicine.scheduleTime?.toString() || ''
        };
      })
    };

    console.log('DEBUG: Final prescriptionDto:', prescriptionDto);

    // Use real prescription service
    this.prescriptionService.addPrescription(prescriptionDto).subscribe({
      next: (response) => {
        console.log('Prescription added successfully:', response);
        this.isAddingPrescription = false;
        
        // Mark appointment as having prescription
        if (this.selectedAppointment) {
          this.appointmentsWithPrescriptions.add(this.selectedAppointment.appointmentId);
          console.log('Marked appointment', this.selectedAppointment.appointmentId, 'as having prescription');
        }
        
        const patientName = this.selectedAppointment?.patientName || 'the patient';
        this.showMessage(`Prescription added successfully for ${patientName}!`, 'success');
        this.closePrescriptionModal();
        
        // Force a UI refresh to update button visibility
        setTimeout(() => {
          console.log('Forcing UI refresh after prescription addition');
          this.appointments = [...this.appointments];
          this.todayAppointments = [...this.todayAppointments];
        }, 100);
        
        // Reload appointments to get updated data
        this.loadTodayAppointments();
      },
      error: (error) => {
        console.error('Error adding prescription:', error);
        this.isAddingPrescription = false;
        
        let errorMessage = 'Error adding prescription';
        if (error.status === 0) {
          errorMessage = 'Cannot connect to backend server';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized - Please login again';
        } else if (error.status === 400) {
          errorMessage = 'Invalid prescription data';
        } else if (error.status === 404) {
          errorMessage = 'Appointment not found';
        } else {
          errorMessage = `Prescription failed: ${error.status} - ${error.error || error.message}`;
        }
        
        this.showMessage(errorMessage, 'error');
      }
    });
  }

  // Mark form as touched for validation
  private markPrescriptionFormTouched(): void {
    this.markFormAsTouched(this.prescriptionForm);
  }

  private markFormAsTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormAsTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Cached dropdown options to prevent infinite change detection
  medicineTypeOptions: Array<{value: number, label: string}> = [];
  dosageTypeOptions: Array<{value: number, label: string}> = [];
  scheduleTimeOptions: Array<{value: number, label: string}> = [];

  // Initialize dropdown options once to prevent infinite change detection
  private initializeDropdownOptions(): void {
    console.log('Initializing dropdown options...');
    
    this.medicineTypeOptions = [
      { value: MedicineType.Paracetamol, label: 'Paracetamol' },
      { value: MedicineType.Ibuprofen, label: 'Ibuprofen' },
      { value: MedicineType.Aspirin, label: 'Aspirin' },
      { value: MedicineType.Naproxen, label: 'Naproxen' },
      { value: MedicineType.Diclofenac, label: 'Diclofenac' },
      { value: MedicineType.Tramadol, label: 'Tramadol' },
      { value: MedicineType.Morphine, label: 'Morphine' },
      { value: MedicineType.Codeine, label: 'Codeine' },
      { value: MedicineType.Amitriptyline, label: 'Amitriptyline' },
      { value: MedicineType.Effervescent, label: 'Effervescent' },
      { value: MedicineType.GelForm, label: 'Gel Form' },
      { value: MedicineType.SyrupForm, label: 'Syrup Form' },
      { value: MedicineType.Inhaler, label: 'Inhaler' },
      { value: MedicineType.Suppository, label: 'Suppository' }
    ];

    this.dosageTypeOptions = [
      { value: DosageType.Mg_100, label: '100mg' },
      { value: DosageType.Mg_200, label: '200mg' },
      { value: DosageType.Mg_300, label: '300mg' },
      { value: DosageType.Mg_400, label: '400mg' },
      { value: DosageType.Mg_500, label: '500mg' },
      { value: DosageType.Mg_600, label: '600mg' },
      { value: DosageType.Mg_700, label: '700mg' },
      { value: DosageType.Mg_800, label: '800mg' },
      { value: DosageType.Mg_900, label: '900mg' },
      { value: DosageType.Mg_1000, label: '1000mg' }
    ];

    this.scheduleTimeOptions = [
      { value: TabletScheduleTime.Morning, label: 'Morning' },
      { value: TabletScheduleTime.Afternoon, label: 'Afternoon' },
      { value: TabletScheduleTime.Evening, label: 'Evening' },
      { value: TabletScheduleTime.Night, label: 'Night' }
    ];

    console.log('Dropdown options initialized');
  }

  // Check if appointment can have prescription added
  canAddPrescription(appointment: DoctorAppointment): boolean {
    const isCompleted = appointment.appointmentStatus === this.AppointmentStatus.Completed;
    const hasNoPrescription = !this.hasPrescription(appointment);
    return isCompleted && hasNoPrescription;
  }

  // Check if appointment already has prescription
  hasPrescription(appointment: DoctorAppointment): boolean {
    return this.appointmentsWithPrescriptions.has(appointment.appointmentId);
  }

  // View prescriptions for a patient/appointment (using real API)
  viewPrescriptions(appointment: DoctorAppointment): void {
    console.log('Viewing prescriptions for appointment:', appointment.appointmentId);
    
    if (!appointment.patientId) {
      console.log('No patientId found!');
      this.showMessage('Patient ID not available for prescription lookup', 'error');
      return;
    }

    console.log('Starting prescription lookup for appointmentId:', appointment.appointmentId);
    this.loadingPrescriptions = true;
    this.selectedAppointment = appointment;
    this.showViewPrescriptionsModal = true;

    // Use the real prescription service to get prescriptions
    this.prescriptionService.getPrescriptionsByPatient?.(appointment.appointmentId)?.subscribe({
      next: (prescriptions) => {
        console.log('Successfully retrieved prescriptions:', prescriptions);
        this.loadingPrescriptions = false;
        
        if (prescriptions && prescriptions.length > 0) {
          this.viewingPrescriptions = prescriptions;
        } else {
          this.viewingPrescriptions = [];
        }
      },
      error: (error) => {
        console.error('Error retrieving prescriptions:', error);
        this.loadingPrescriptions = false;
        this.viewingPrescriptions = [];
        
        if (error.status === 404) {
          this.showMessage('No prescriptions found for this patient', 'info');
        } else {
          this.showMessage('Error retrieving prescriptions from database', 'error');
        }
      }
    }) || (() => {
      // Fallback if method doesn't exist
      this.loadingPrescriptions = false;
      this.viewingPrescriptions = [];
      this.showMessage('Prescription viewing not available', 'warning');
    })();
  }

  // Close prescription viewing modal
  closeViewPrescriptionsModal(): void {
    this.showViewPrescriptionsModal = false;
    this.viewingPrescriptions = [];
    this.selectedAppointment = null;
    this.loadingPrescriptions = false;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  // Get current user for display
  getCurrentUser() {
    return this.authService.getUserData();
  }

  // Load all doctor data (using real API)
  loadDoctorData(): void {
    if (!this.isAuthenticated()) {
      this.showMessage('Please login to access the dashboard', 'error');
      return;
    }

    this.isLoading = true;
    
    try {
      this.loadDoctorProfileInternal();
    } catch (error) {
      console.error('Error loading doctor data:', error);
      this.isLoading = false;
      this.showMessage('Error loading dashboard data', 'error');
    }
  }

  // Reload doctor profile (called from template)
  loadDoctorProfile(): void {
    this.isLoading = true;
    this.doctorProfile = null;
    this.loadDoctorData();
  }

  // Load doctor profile using same pattern as helpdesk - get current user and find in API
  private loadDoctorProfileInternal(): void {
    // Use same pattern as helpdesk - get current user and match with API data
    const currentUser = this.authService.getCurrentUserSnapshot();
    const userRole = this.authService.getUserRole();
    
    console.log('Current user from auth:', currentUser);
    console.log('User role:', userRole);
    
    if (currentUser && userRole === 'Doctor') {
      console.log('User is logged in as Doctor - finding doctor profile in API');
      
      // Get all doctors from API and find the current user
      this.doctorService.getAllDoctors().subscribe({
        next: (allDoctors) => {
          console.log('All doctors loaded from API:', allDoctors);
          
          // Find current user in the doctors list by email
          const doctorProfile = allDoctors.find((doctor: any) => 
            doctor.email === currentUser.email ||
            doctor.Email === currentUser.email ||
            doctor.userName === currentUser.email ||
            doctor.UserName === currentUser.email
          );
          
          if (doctorProfile) {
            console.log('Found current doctor in API:', doctorProfile);
            
            // Create comprehensive doctor profile from API data
            const shiftValue = this.convertShiftToNumber(doctorProfile.shift);
            const shiftTimes = this.calculateShiftTimes(shiftValue);
            
            this.doctorProfile = {
              doctorId: doctorProfile.doctorId || doctorProfile.userId || currentUser.userId || 1,
              userId: doctorProfile.userId || currentUser.userId || 1,
              name: doctorProfile.name || doctorProfile.userName || currentUser.name || currentUser.userName || 'Dr. ' + ((currentUser.email && currentUser.email.split('@')[0]) || 'Doctor'),
              userName: doctorProfile.userName || currentUser.userName || 'Dr. ' + ((currentUser.email && currentUser.email.split('@')[0]) || 'Doctor'),
              email: doctorProfile.email || currentUser.email || 'doctor@example.com',
              role: 'Doctor',
              phoneNumber: doctorProfile.phoneNumber || doctorProfile.PhoneNumber || '(555) 123-4567',
              specialization: doctorProfile.specialization || doctorProfile.Specialization || 'General Medicine',
              qualification: doctorProfile.qualification || doctorProfile.Qualification || 'MD from Medical University',
              experienceYears: doctorProfile.experienceYears || doctorProfile.ExperienceYears || 10,
              consultantFees: doctorProfile.consultantFees || doctorProfile.consultant_fees || doctorProfile.ConsultantFees || 500,
              languages: doctorProfile.languages || doctorProfile.Languages || ['English'],
              status: this.parseStatus(doctorProfile.status || doctorProfile.active_Status || doctorProfile.Active_Status) || Status.Offline,
              shift: shiftValue,
              shiftStartTime: doctorProfile.shiftStartTime || doctorProfile.ShiftStartTime || shiftTimes.start,
              shiftEndTime: doctorProfile.shiftEndTime || doctorProfile.ShiftEndTime || shiftTimes.end,
              isApprovedByAdmin: doctorProfile.isApprovedByAdmin || doctorProfile.IsApprovedByAdmin || 1,
              createdAt: doctorProfile.createdAt || doctorProfile.dateCreated || new Date().toISOString()
            };
            
            console.log('Doctor profile created from API:', this.doctorProfile);
            console.log('Doctor userId for appointments:', this.doctorProfile.userId);
            this.validateShiftStatus();
            this.isLoading = false;
            this.loadTodayAppointments();
          } else {
            console.error('Doctor not found in API for email:', currentUser.email);
            this.handleDoctorNotFound(currentUser);
          }
          },
          error: (error) => {
          console.error('Error loading doctors from API:', error);
            this.isLoading = false;
          this.handleDoctorNotFound(currentUser);
          }
        });
      } else {
      console.error('User not logged in as Doctor');
        this.isLoading = false;
      this.showMessage('Please login as a doctor to access this dashboard', 'error');
    }
  }

  // Handle when doctor is not found in API
  private handleDoctorNotFound(currentUser: any): void {
    console.error('Doctor profile not found - creating fallback profile');
    
    // Create a basic profile from current user data
    this.doctorProfile = {
      doctorId: currentUser.userId || 1,
      userId: currentUser.userId || 1,
      name: currentUser.name || currentUser.userName || 'Dr. ' + ((currentUser.email && currentUser.email.split('@')[0]) || 'Doctor'),
      userName: currentUser.userName || 'Dr. ' + ((currentUser.email && currentUser.email.split('@')[0]) || 'Doctor'),
      email: currentUser.email || 'doctor@example.com',
      role: 'Doctor',
      phoneNumber: '(555) 123-4567',
      specialization: 'General Medicine',
      qualification: 'MD from Medical University',
      experienceYears: 10,
      consultantFees: 500,
      languages: ['English'],
      status: Status.Offline,
      shift: 1, // Morning
      shiftStartTime: '05:00',
      shiftEndTime: '13:00',
      isApprovedByAdmin: 1,
      createdAt: new Date().toISOString()
    };
    
    console.log('Using fallback doctor profile:', this.doctorProfile);
    this.showMessage('Doctor profile not found in database. Using basic profile.', 'warning');
    this.isLoading = false;
  }

  // Load today's appointments using real API
  loadTodayAppointments(): void {
    if (!this.doctorProfile) {
      this.showMessage('Doctor profile not loaded', 'error');
      this.isLoading = false;
      return;
    }

    console.log('Loading today\'s appointments from API for doctor:', this.doctorProfile.userId);
    
    // Use the corrected getTodayAppointments method with doctorId
    this.doctorService.getTodayAppointments?.(this.doctorProfile.userId || this.doctorProfile.doctorId || 1)?.subscribe({
      next: (todayAppointments) => {
        this.todayAppointments = todayAppointments || [];
        this.isLoading = false;
        console.log('Today\'s appointments loaded:', todayAppointments);
        
        if (todayAppointments && todayAppointments.length > 0) {
          this.showMessage(`Loaded ${todayAppointments.length} appointments for today`, 'success');
        } else {
          this.showMessage('No appointments scheduled for today', 'info');
        }
      },
      error: (error) => {
        console.error('Error loading today\'s appointments:', error);
        this.isLoading = false;
        this.todayAppointments = [];
        
        // Don't show error for 404 "No appointments found" as it's now handled in service
        if (error.status === 404) {
          console.log('No appointments found for today - this is normal');
          this.showMessage('No appointments scheduled for today', 'info');
          return;
        }
        
        let errorMessage = 'Error loading today\'s appointments';
        if (error.status === 0) {
          errorMessage = 'Cannot connect to backend server. Please check if it\'s running on port 5294';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized - Please login again';
        } else {
          errorMessage = `API Error: ${error.status} - ${error.error || error.message}`;
        }
        
        this.showMessage(errorMessage, 'error');
      }
    }) || (() => {
      // Fallback if method doesn't exist
      this.isLoading = false;
      this.todayAppointments = [];
      this.showMessage('Appointments API not available', 'warning');
    })();
  }

  // Load all appointments using real API
  loadAllAppointments(): void {
    if (!this.doctorProfile) {
      this.showMessage('Doctor profile not loaded', 'error');
      return;
    }

    console.log('Loading all appointments from API for doctor:', this.doctorProfile.email);
    
    // Use real appointment service
    this.doctorService.getDoctorAppointments?.(this.doctorProfile.email)?.subscribe({
      next: (appointments) => {
        this.appointments = appointments || [];
        console.log('All appointments loaded from API:', appointments);
        
        if (appointments && appointments.length > 0) {
          this.showMessage(`Loaded ${appointments.length} total appointments`, 'success');
        } else {
          this.showMessage('No appointments found', 'info');
        }
      },
      error: (error) => {
        console.error('Error loading all appointments:', error);
        this.appointments = [];
        
        let errorMessage = 'Error loading appointments';
        if (error.status === 0) {
          errorMessage = 'Cannot connect to backend server';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized - Please login again';
        } else if (error.status === 404) {
          errorMessage = 'No appointments found';
        } else {
          errorMessage = `API Error: ${error.status} - ${error.error || error.message}`;
        }
        
        this.showMessage(errorMessage, 'error');
      }
    }) || (() => {
      // Fallback if method doesn't exist
      this.appointments = [];
      this.showMessage('Appointments API not available', 'warning');
    })();
  }

  /**
   * Test method to verify button clicks are working
   */
  testButtonClick(buttonName: string): void {
    console.log(`BUTTON CLICKED: ${buttonName}`);
    console.log('Doctor Profile:', this.doctorProfile);
    console.log('Current Status:', this.doctorProfile?.status);
    console.log('Is Updating:', this.isUpdatingStatus);
    console.log('DoctorService available:', !!this.doctorService);
    console.log('updateDoctorActiveStatus method exists:', !!this.doctorService.updateDoctorActiveStatus);
    console.log('Is within shift hours:', this.isWithinShiftHours());
    console.log('Online button disabled:', this.isOnlineButtonDisabled());
    
    // Show visual feedback
    const alertMessage = `${buttonName} button clicked!\n\nCurrent Status: ${this.getStatusText(this.doctorProfile?.status)}\nIs Updating: ${this.isUpdatingStatus}\nWithin Shift: ${this.isWithinShiftHours()}`;
    alert(alertMessage);
  }

  /**
   * Reset updating status flag (for debugging)
   */
  resetUpdatingStatus(): void {
    console.log('Resetting updating status flag');
    this.isUpdatingStatus = false;
    this.showMessage('Updating status flag reset', 'info');
  }

  // Update active status using real API
  updateActiveStatus(status: Status): void {
    console.log('updateActiveStatus called with:', status);
    console.log('Doctor profile available:', !!this.doctorProfile);
    console.log('Doctor email:', this.doctorProfile?.email);
    console.log('Current status:', this.doctorProfile?.status);
    console.log('Is updating status:', this.isUpdatingStatus);
    
    if (!this.doctorProfile) {
      console.error('No doctor profile loaded');
      this.showMessage('No doctor profile loaded', 'error');
      return;
    }

    if (!this.doctorProfile.email) {
      console.error('Doctor email is missing');
      this.showMessage('Doctor email is missing', 'error');
      return;
    }

    if (this.isUpdatingStatus) {
      console.warn('Status update already in progress');
      return;
    }

    this.isUpdatingStatus = true;
    
    console.log('Updating doctor active status:', { 
      email: this.doctorProfile.email, 
      status, 
      currentStatus: this.doctorProfile.status 
    });
    
    // Check if the method exists
    if (!this.doctorService.updateDoctorActiveStatus) {
      console.error('updateDoctorActiveStatus method not found on doctorService');
      this.showMessage('Status update service not available', 'error');
      this.isUpdatingStatus = false;
      return;
    }
    
    // Make the API call with proper error handling
    this.doctorService.updateDoctorActiveStatus(this.doctorProfile.email, status).subscribe({
      next: (response: any) => {
        console.log('Backend response for status update:', response);
        
        if (this.doctorProfile) {
          let actualStatus = status;
          
          // Parse response to get actual status
          if (response && typeof response === 'object') {
            actualStatus = this.parseStatus(response.active_Status || response.Active_Status || response.status) || status;
          } else if (typeof response === 'string') {
            actualStatus = this.parseStatus(response) || status;
          }
          
          // Update the profile status
          this.doctorProfile.status = actualStatus;
          
          const requestedText = this.getStatusText(status);
          const actualText = this.getStatusText(actualStatus);
          
          console.log('Status update completed:', {
            requested: status,
            actual: actualStatus,
            requestedText,
            actualText
          });
          
          // Show appropriate message based on result
          if (actualStatus !== status) {
            if (status === Status.Online && actualStatus === Status.Offline) {
              this.showMessage(`Cannot go online - outside shift hours. Status remains ${actualText}`, 'warning');
            } else {
              this.showMessage(`Status changed to ${actualText} (adjusted by system)`, 'info');
            }
          } else {
            this.showMessage(`Status updated to ${actualText}`, 'success');
          }
        }
        this.isUpdatingStatus = false;
      },
      error: (error: any) => {
        console.error('Error updating status:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        
        let errorMessage = 'Failed to update status';
        if (error.status === 404) {
          errorMessage = 'Status update endpoint not found';
        } else if (error.status === 401) {
          errorMessage = 'Not authorized to update status';
        } else if (error.status === 400) {
          errorMessage = 'Invalid status update request';
        } else if (error.message) {
          errorMessage = `Failed to update status: ${error.message}`;
        }
        
        this.showMessage(errorMessage, 'error');
        this.isUpdatingStatus = false;
      }
    });
  }

  // Update appointment status using real API
  updateAppointmentStatus(appointmentId: number, isCompleted: boolean): void {
    console.log('updateAppointmentStatus called:', { appointmentId, isCompleted });
    
    if (this.updatingAppointments.has(appointmentId)) {
      console.log('Already updating appointment:', appointmentId);
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No authentication token found');
      this.showMessage('Please login again - session expired', 'error');
      return;
    }

    this.updatingAppointments.add(appointmentId);
    const newStatus = isCompleted ? AppointmentStatus.Completed : AppointmentStatus.NotAttended;
    const statusText = isCompleted ? 'completed' : 'not attended';

    console.log(`Updating appointment ${appointmentId} to ${statusText}...`);

    // Use real doctor service method for updating appointment status
    this.doctorService.updateAppointmentStatusSimple?.(appointmentId, isCompleted)?.subscribe({
      next: (response) => {
        console.log(`Appointment ${appointmentId} marked as ${statusText}:`, response);
        this.showMessage(`Appointment marked as ${statusText}`, 'success');
        
        // Update the appointment in the local arrays
        this.updateLocalAppointmentStatus(appointmentId, newStatus);
        this.updatingAppointments.delete(appointmentId);
      },
      error: (error) => {
        console.error(`Error updating appointment ${appointmentId}:`, error);
        this.showMessage('Error updating appointment status', 'error');
            this.updatingAppointments.delete(appointmentId);
      }
    }) || (() => {
      // Fallback if method doesn't exist
            this.updatingAppointments.delete(appointmentId);
      this.showMessage('Appointment update API not available', 'warning');
    })();
  }

  // Check if appointment is currently being updated
  isAppointmentUpdating(appointmentId: number): boolean {
    return this.updatingAppointments.has(appointmentId);
  }

  // Update appointment status in local arrays
  private updateLocalAppointmentStatus(appointmentId: number, newStatus: AppointmentStatus): void {
    const todayIndex = this.todayAppointments.findIndex(app => app.appointmentId === appointmentId);
    if (todayIndex !== -1) {
      this.todayAppointments[todayIndex].appointmentStatus = newStatus;
    }

    const allIndex = this.appointments.findIndex(app => app.appointmentId === appointmentId);
    if (allIndex !== -1) {
      this.appointments[allIndex].appointmentStatus = newStatus;
    }
  }

  // Get completed appointments count for stats display
  getCompletedAppointmentsCount(): number {
    return this.todayAppointments.filter(apt => apt.appointmentStatus === AppointmentStatus.Completed).length;
  }

  // Get pending appointments count for stats display
  getPendingAppointmentsCount(): number {
    return this.todayAppointments.filter(apt => apt.appointmentStatus === AppointmentStatus.Scheduled).length;
  }

  // Template method aliases
  getTodayCompletedCount(): number {
    return this.getCompletedAppointmentsCount();
  }

  getTodayPendingCount(): number {
    return this.getPendingAppointmentsCount();
  }

  getShiftStatusMessage(): string {
    if (this.doctorProfile?.shift === undefined || this.doctorProfile?.shift === null || this.doctorProfile?.shift === 3) return 'Shift not allocated - Contact admin';
    
    const isWithin = this.isWithinShiftHours();
    const shiftName = this.getShiftText(this.doctorProfile.shift);
    
    return isWithin 
      ? `Status: ${shiftName}`
      : `Status: ${shiftName}`;
  }

  // Debug and test methods for template
  testPrescriptionEndpoint(): void {
    console.log('Testing prescription endpoint...');
    
    const testData = {
      appointmentId: 1,
      doctorId: 1,
      patientId: 1,
      instructions: "Test prescription instructions",
      medicines: [
        {
          medicineType: "1",
          dosages: "1",
          scheduleTime: "1"
        }
      ]
    };

    this.prescriptionService.addPrescription(testData).subscribe({
      next: (response) => {
        console.log('Test prescription successful:', response);
        this.showMessage('Test prescription successful', 'success');
      },
      error: (error) => {
        console.error('Test prescription failed:', error);
        this.showMessage(`Test prescription failed: ${error.status} - ${error.message}`, 'error');
      }
    });
  }

  testViewPrescriptions(): void {
    console.log('Testing prescription viewing...');
    
    if (this.todayAppointments.length > 0) {
      const firstAppointment = this.todayAppointments[0];
      this.viewPrescriptions(firstAppointment);
    } else {
      this.showMessage('No appointments available for testing', 'warning');
    }
  }

  debugPrescriptionService(): void {
    console.log('Testing prescription service connectivity...');
    
    this.prescriptionService.testPrescriptionConnectivity?.()?.subscribe({
      next: (response) => {
        console.log('Prescription service is working:', response);
        this.showMessage('Prescription service connectivity test passed', 'success');
      },
      error: (error) => {
        console.error('Prescription service failed:', error);
        this.showMessage(`Prescription service test failed: ${error.status}`, 'error');
      }
    }) || this.showMessage('Prescription service test method not available', 'warning');
  }

  testPrescriptionFunctionality(): void {
    console.log('Testing prescription functionality...');
    
    const completedAppointments = this.todayAppointments.filter(
      apt => apt.appointmentStatus === AppointmentStatus.Completed
    );
    
    if (completedAppointments.length === 0) {
      this.showMessage('No completed appointments found for testing', 'warning');
      return;
    }

    const testAppointment = completedAppointments[0];
    console.log('Testing with appointment:', testAppointment);
    
    this.viewPrescriptions(testAppointment);
  }

  testPrescriptionAPIWithPatient(): void {
    console.log('Testing prescription API with patient...');
    
    if (this.todayAppointments.length > 0) {
      const appointment = this.todayAppointments[0];
      this.prescriptionService.getPrescriptionsByPatient(appointment.appointmentId).subscribe({
        next: (prescriptions) => {
          console.log('Prescription API working:', prescriptions);
          this.showMessage(`Found ${prescriptions?.length || 0} prescriptions`, 'success');
        },
        error: (error) => {
          console.error('Prescription API failed:', error);
          this.showMessage(`API failed: ${error.status} ${error.statusText}`, 'error');
        }
      });
        } else {
      this.showMessage('No appointments available for testing', 'warning');
    }
  }

  debugAuthToken(): void {
    console.log('Debugging authentication...');
    const token = this.authService.getToken();
    const userData = this.authService.getUserData();
    console.log('Token exists:', !!token);
    console.log('User data:', userData);
    console.log('Is authenticated:', this.authService.isAuthenticated());
    
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('JWT Payload:', payload);
          this.showMessage('Authentication token is valid', 'success');
        }
      } catch (e) {
        console.error('Could not decode JWT token:', e);
        this.showMessage('Invalid JWT token format', 'error');
      }
    } else {
      this.showMessage('No authentication token found', 'error');
    }
  }

  testManualPrescriptionCall(): void {
    console.log('Testing manual prescription API call...');
    const token = this.authService.getToken();
    
    if (!token) {
      this.showMessage('No token found - please login first', 'error');
      return;
    }

    this.http.get('https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api/Prescription/patientPrescription/1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        console.log('Manual API call succeeded:', response);
        this.showMessage('Manual API call worked!', 'success');
      },
      error: (error) => {
        console.error('Manual API call failed:', error);
        this.showMessage(`Manual API failed: ${error.status} ${error.statusText}`, 'error');
      }
    });
  }

  /**
   * Get current time for debugging
   */
  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  // ===== UTILITY METHODS FOR TEMPLATE =====
  
  // Status display methods
  getStatusClass(status: Status | undefined): string {
    if (!status) return 'offline';
    switch (status) {
      case Status.Online: return 'online';
      case Status.Busy: return 'busy';
      case Status.Offline: return 'offline';
      case Status.Not_Available: return 'not-available';
      default: return 'offline';
    }
  }

  getStatusText(status: Status | undefined): string {
    if (!status) return 'Offline';
    switch (status) {
      case Status.Online: return 'Online';
      case Status.Busy: return 'Busy';
      case Status.Offline: return 'Offline';
      case Status.Not_Available: return 'Not Available';
      default: return 'Offline';
    }
  }

  // Appointment status methods
  getAppointmentStatusClass(status: AppointmentStatus | undefined): string {
    if (!status) return 'scheduled';
    switch (status) {
      case AppointmentStatus.Scheduled: return 'scheduled';
      case AppointmentStatus.Completed: return 'completed';
      case AppointmentStatus.NotAttended: return 'not-attended';
      case AppointmentStatus.Cancelled: return 'cancelled';
      default: return 'scheduled';
    }
  }

  getAppointmentStatusText(status: AppointmentStatus | undefined): string {
    if (!status) return 'Scheduled';
    switch (status) {
      case AppointmentStatus.Scheduled: return 'Scheduled';
      case AppointmentStatus.Completed: return 'Completed';
      case AppointmentStatus.NotAttended: return 'Not Attended';
      case AppointmentStatus.Cancelled: return 'Cancelled';
      default: return 'Scheduled';
    }
  }

  // Date and time formatting
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'Date not set';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  }

  formatTime(timeStr: string | undefined): string {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '';
    }
  }

  // Navigation methods
  switchTab(tab: string): void {
    this.currentTab = tab;
    console.log('Switched to tab:', tab);
  }

  // Message handling
  showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    this.message = message;
    this.messageType = type;
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.clearMessage();
      }, 3000);
    }
  }

  clearMessage(): void {
    this.message = '';
    console.log('Message cleared');
  }

  // Shift information methods
  convertShiftToNumber(shiftValue: any): number {
    if (typeof shiftValue === 'number') {
      return shiftValue;
    }
    
    if (typeof shiftValue === 'string') {
      switch (shiftValue.toLowerCase()) {
        case 'morning': 
        case '0': 
          return 0;
        case 'afternoon':
        case '1':
          return 1;
        case 'night':
        case '2':
          return 2;
        case 'notallocated':
        case 'not_allocated':
        case '3':
          return 3;
        default:
          console.warn('Unknown shift string value:', shiftValue);
          return 3;
      }
    }
    
    if (typeof shiftValue === 'object' && shiftValue !== null) {
      if (shiftValue.hasOwnProperty('Morning')) return 0;
      if (shiftValue.hasOwnProperty('Afternoon')) return 1;
      if (shiftValue.hasOwnProperty('Night')) return 2;
    }
    
    console.warn('Could not convert shift value:', shiftValue);
    return 3;
  }

  getShiftText(shift: number | undefined): string {
    switch (shift) {
      case 0: return 'Morning (9:00 AM - 1:00 PM)';
      case 1: return 'Afternoon (1:00 PM - 9:00 PM)';
      case 2: return 'Night (9:00 PM - 5:00 AM)';
      case 3: return 'Not Allocated - Contact Admin';
      case null:
      case undefined:
        return 'Shift not configured';
      default: 
        return 'Not Set';
    }
  }

  isWithinShiftHours(): boolean {
    if (this.doctorProfile?.shift === undefined || this.doctorProfile?.shift === null || this.doctorProfile?.shift === 3) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    switch (this.doctorProfile.shift) {
      case 0: // Morning: 9 AM - 1 PM
        return currentHour >= 9 && currentHour < 13;
      case 1: // Afternoon: 1 PM - 9 PM
        return currentHour >= 13 && currentHour < 21;
      case 2: // Night: 9 PM - 5 AM
        return currentHour >= 21 || currentHour < 5;
      default:
        return false;
    }
  }

  isOnlineButtonDisabled(): boolean {
    // Basic checks
    if (!this.doctorProfile) {
      console.log('Online button disabled: No doctor profile');
      return true;
    }
    
    if (this.isUpdatingStatus) {
      console.log('Online button disabled: Status update in progress');
      return false; // Don't disable, let the general [disabled] handle this
    }
    
    // If already online, allow clicking (it won't change anything but won't be disabled)
    if (this.doctorProfile.status === Status.Online) {
      console.log('Online button: Already online, allowing click');
      return false;
    }
    
    // Check shift hours - but make it less restrictive
    const withinShift = this.isWithinShiftHours();
    console.log('Online button shift check:', {
      shift: this.doctorProfile.shift,
      withinShift,
      currentHour: new Date().getHours()
    });
    
    // Only disable if shift is not allocated (3) or null/undefined
    if (this.doctorProfile.shift === 3 || this.doctorProfile.shift === null || this.doctorProfile.shift === undefined) {
      console.log('Online button disabled: No shift allocated');
      return true;
    }
    
    // For now, allow going online even outside shift hours (doctor can override)
    // The backend will handle the business logic
    return false;
  }

  // Appointment management
  canUpdateAppointment(appointment: DoctorAppointment): boolean {
    return appointment.appointmentStatus === AppointmentStatus.Scheduled;
  }

  // Shift calculation helper
  calculateShiftTimes(shift: number): { start: string; end: string } {
    switch (shift) {
      case 0: return { start: '09:00', end: '13:00' };
      case 1: return { start: '13:00', end: '21:00' };
      case 2: return { start: '21:00', end: '05:00' };
      case 3: return { start: 'N/A', end: 'N/A' };
      default: return { start: 'N/A', end: 'N/A' };
    }
  }

  // Validate shift status
  validateShiftStatus(): void {
    if (!this.doctorProfile) {
      console.log('No doctor profile available for shift validation');
      return;
    }

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinutes;

    let shiftStart: number | null = null;
    let shiftEnd: number | null = null;

    switch (this.doctorProfile.shift) {
      case 0:
        shiftStart = 9 * 60;
        shiftEnd = 13 * 60;
        break;
      case 1:
        shiftStart = 13 * 60;
        shiftEnd = 21 * 60;
        break;
      case 2:
        shiftStart = 21 * 60;
        shiftEnd = 5 * 60;
        break;
      default:
        console.warn('Unknown shift value:', this.doctorProfile.shift);
        return;
    }

    if (shiftStart !== null && shiftEnd !== null) {
      let isWithinShift = false;

      if (shiftEnd > shiftStart) {
        isWithinShift = currentTotalMinutes >= shiftStart && currentTotalMinutes <= shiftEnd;
      } else {
        isWithinShift = currentTotalMinutes >= shiftStart || currentTotalMinutes <= shiftEnd;
      }

      if (!isWithinShift && this.doctorProfile.status === Status.Online) {
        console.log('Setting doctor offline - shift has ended');
        this.doctorProfile.status = Status.Offline;
        this.showMessage('You have been set offline - shift hours have ended', 'warning');
      }
    }
  }

  // Parse status from various possible formats
  private parseStatus(status: any): Status | null {
    if (!status) return null;
    
    if (typeof status === 'string') {
      switch (status.toLowerCase()) {
        case 'online': return Status.Online;
        case 'busy': return Status.Busy;
        case 'offline': return Status.Offline;
        case 'not_available':
        case 'notavailable':
        case 'not available': return Status.Not_Available;
        default: return null;
      }
    }
    
    if (Object.values(Status).includes(status)) {
      return status as Status;
    }
    
    return null;
  }

  // Format medicine type based on actual backend enum
  formatMedicineType(medicineType: number | string): string {
    const type = typeof medicineType === 'string' ? parseInt(medicineType) : medicineType;
    switch (type) {
      case 0: return 'None';
      case 1: return 'Paracetamol';
      case 2: return 'Ibuprofen'; 
      case 4: return 'Aspirin';
      case 8: return 'Naproxen';
      case 16: return 'Diclofenac';
      case 32: return 'Tramadol';
      case 64: return 'Morphine';
      case 128: return 'Codeine';
      case 256: return 'Amitriptyline';
      case 512: return 'Effervescent';
      case 1024: return 'Gel Form';
      case 2048: return 'Syrup Form';
      case 4096: return 'Inhaler';
      case 8192: return 'Suppository';
      default: return `Medicine Type ${type}`;
    }
  }

  // Format dosage type based on actual backend enum
  formatDosageType(dosageType: number | string): string {
    const dosage = typeof dosageType === 'string' ? parseInt(dosageType) : dosageType;
    switch (dosage) {
      case 0: return 'None';
      case 1: return '100mg';
      case 2: return '200mg';
      case 4: return '300mg';
      case 8: return '400mg';
      case 16: return '500mg';
      case 32: return '600mg';
      case 64: return '700mg';
      case 128: return '800mg';
      case 256: return '900mg';
      case 512: return '1000mg';
      default: return `${dosage}mg`;
    }
  }

  // Format schedule time for display
  formatScheduleTime(scheduleTime: number | string): string {
    const time = typeof scheduleTime === 'string' ? parseInt(scheduleTime) : scheduleTime;
    switch (time) {
      case 0: return 'Morning';
      case 1: return 'Afternoon';
      case 2: return 'Evening';
      case 4: return 'Night';
      default: return 'As directed';
    }
  }
} 