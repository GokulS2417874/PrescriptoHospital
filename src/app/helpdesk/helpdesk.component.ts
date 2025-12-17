import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
// Import services
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.models';
import { DoctorService } from '../services/doctor.service';
import { HelpdeskService } from '../services/helpdesk.service';

// Import models
import { 
  HelpdeskAgent, 
  PatientDetails, 
  DoctorDetails, 
  PaymentDetails,
  PaymentStatus,
  AppointmentBookingRequest,
  PaymentCreationRequest,
  AppointmentUrgency 
} from '../models/helpdesk.model';

@Component({
  selector: 'app-helpdesk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './helpdesk.component.html',
  styleUrls: ['./helpdesk.component.css']
})
export class HelpdeskComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  // Authentication and user management
  isLoggedIn = false;
  currentAgent: HelpdeskAgent | null = null;

  // UI state management
  activeTab: 'dashboard' | 'patients' | 'doctors' | 'appointments' | 'todaysAppointments' | 'payments' = 'dashboard';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Data properties
  allPatients: PatientDetails[] = [];
  allDoctors: DoctorDetails[] = [];
  todaysAppointments: any[] = [];
  allPayments: PaymentDetails[] = [];

  // Search properties
  patientSearchName = '';
  patientSearchId = '';
  doctorSearchName = '';
  doctorSearchId = '';
  doctorSearchSpecialization = '';
  selectedPatient: PatientDetails | null = null;
  selectedDoctor: DoctorDetails | null = null;

  // Appointment booking properties
  selectedPatientForBooking: PatientDetails | null = null;
  selectedDoctorForBooking: DoctorDetails | null = null;
  bookingDoctorSlots: any[] = [];
  selectedTimeSlot: any = null;
  selectedFile: File | null = null;
  appointmentNotes = '';
  selectedUrgency: AppointmentUrgency = AppointmentUrgency.Low;
  AppointmentUrgency = AppointmentUrgency;
  isBookingAppointment = false;

  // Missing appointment booking properties
  appointmentDate = '';
  availableSlots: any[] = [];
  bookingSlots: any[] = [];
  slotsLoaded = false;
  isLoadingSlots = false;
  fileUploadError = '';

  // Missing search properties
  searchedPatients: PatientDetails[] = [];
  searchedDoctors: DoctorDetails[] = [];
  patientSearchTerm = '';
  doctorSearchTerm = '';

  // Missing payment properties
  patientPaymentHistory: PaymentDetails[] = [];

  // Payment management
  showPaymentForm = false;
  isCreatingPayment = false;
  paymentCreationForm: PaymentCreationRequest = {
    appointmentId: 0,
    patientId: 0,
    doctorId: 0,
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: ''
  };

  // Form validation
  formTouched: any = {};
  formSubmitAttempted = false;

  // Dashboard stats
  dashboardStats: any = {
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointmentsToday: 0,
    totalPayments: 0
  };

  // Pagination
  totalPatients = 0;
  totalDoctors = 0;

  constructor(
    public authService: AuthService, // Made public to access from template
    private helpdeskService: HelpdeskService,
    private doctorService: DoctorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔍 Helpdesk component initialized');
    
    // Simple check for current auth state
    this.checkAuthState();
    
    // Subscribe to auth changes (if available)
    if (this.authService.getCurrentUser) {
      this.subscriptions.add(
        this.authService.getCurrentUser().subscribe(() => {
          console.log('🔍 Auth state changed, rechecking...');
          this.checkAuthState();
        })
      );
    }
  }

  private checkAuthState(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const currentUser = this.authService.getCurrentUserSnapshot();
    
    console.log('🔍 Checking auth state:', { isLoggedIn, currentUser });
    
    if (isLoggedIn && currentUser && currentUser.role === 'HelpDesk') {
      // User is authenticated with helpdesk role
      this.currentAgent = {
        agentId: 1,
        agentName: currentUser.name || currentUser.userName || 'Helpdesk Agent',
        email: currentUser.email || '',
        phoneNumber: '0000000000',
        department: 'General',
        isActive: true,
        isAvailable: true,
        createdDate: new Date()
      };
      
      this.errorMessage = '';
      console.log('✅ Helpdesk user authenticated:', this.currentAgent);
      this.loadDashboardData();
    } else if (isLoggedIn && currentUser && currentUser.role !== 'HelpDesk') {
      // Wrong role
      this.currentAgent = null;
      this.errorMessage = `Access denied. Current role: ${currentUser.role}`;
      console.log('❌ Wrong role:', currentUser.role);
    } else {
      // Not logged in
      this.currentAgent = null;
      this.errorMessage = 'Please login first.';
      console.log('❌ Not logged in');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ===== AUTHENTICATION =====

  checkLoginStatus(): void {
    console.log('🔍 Checking helpdesk login status...');
    
    // Check if user is logged in via main AuthService with HelpDesk role
    const currentUser = this.authService.getCurrentUserSnapshot();
    const userRole = this.authService.getUserRole();
    
    console.log('🔍 Current user:', currentUser);
    console.log('🔍 User role:', userRole);
    
    if (currentUser && userRole === 'HelpDesk') {
      // User is logged in with HelpDesk role - auto login
      console.log('✅ User is already logged in as HelpDesk');
      this.currentAgent = {
        agentId: 1, // Default ID since User interface doesn't have id
        agentName: currentUser.name || currentUser.userName || 'Helpdesk Agent',
        email: currentUser.email || '',
        phoneNumber: '0000000000', // Default since not in User interface
        department: 'General', // Default
        isActive: true,
        isAvailable: true, // Add missing required property
        createdDate: new Date() // Fix: Use Date object instead of string
      };
      
      this.loadDashboardData();
      
      console.log('✅ Helpdesk agent auto-logged in:', this.currentAgent);
    } else {
      console.log('❌ User not logged in as HelpDesk or not logged in at all');
      this.currentAgent = null;
    }
  }

  // Remove separate login - users should use main login
  login(): void {
    this.errorMessage = 'Please use the main login system. Click "Login" in the top navigation.';
  }

  // Use main auth system logout
  logout(): void {
    this.authService.logout();
    this.currentAgent = null;
    this.errorMessage = 'You have been logged out. Please login again to access helpdesk.';
  }

  // Helper method to check if user is authenticated with helpdesk role
  isAuthenticated(): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    const currentUser = this.authService.getCurrentUserSnapshot();
    const hasHelpdeskRole = currentUser?.role === 'HelpDesk';
    
    console.log('🔍 isAuthenticated check:', {
      isLoggedIn,
      currentUser,
      hasHelpdeskRole,
      currentAgent: this.currentAgent
    });
    
    return isLoggedIn && hasHelpdeskRole;
  }

  // ===== DASHBOARD =====

  loadDashboardData(): void {
    if (!this.currentAgent) return; // Use currentAgent to check if logged in
    
    console.log('🔍 Loading helpdesk dashboard data...');
    
    // Load patients and doctors first, then update dashboard stats
    this.loadAllPatients();
    this.loadAllDoctors();
    
    this.subscriptions.add(
      this.helpdeskService.getHelpdeskStats().subscribe({
        next: (stats: any) => {
          this.dashboardStats = {
            ...stats,
            // These will be updated by loadAllPatients() and loadAllDoctors()
            totalPatients: this.totalPatients,
            totalDoctors: this.totalDoctors
          };
          console.log('✅ Dashboard stats loaded:', this.dashboardStats);
        },
        error: (error: any) => {
          console.error('❌ Error loading dashboard stats:', error);
          // Use default stats if API fails
          this.dashboardStats = {
            totalPatients: this.totalPatients,
            totalDoctors: this.totalDoctors,
            totalAppointmentsToday: 0,
            totalPendingPayments: 0,
            totalRevenue: 0,
            activeAgents: 1,
            emergencyAppointments: 0
          };
        }
      })
    );
  }

  setActiveTab(tab: string) {
    this.activeTab = tab as 'dashboard' | 'patients' | 'doctors' | 'appointments' | 'todaysAppointments' | 'payments';
    console.log('🔍 Setting active tab to:', tab);
    
    if (tab === 'patients') {
      this.loadAllPatients();
    } else if (tab === 'doctors') {
      this.loadAllDoctors();
    } else if (tab === 'payments') {
      // Load all payments when payments tab is accessed
      this.loadPatientPaymentHistory(0); // Pass 0 to load all payments
    }
  }

  // ===== PATIENT MANAGEMENT =====

  loadAllPatients(): void {
    console.log('🔍 Loading all patients...');
    this.isLoading = true;
    
    this.subscriptions.add(
      this.helpdeskService.getAllPatientsFromAPI().subscribe({
        next: (patients: PatientDetails[]) => {
          this.allPatients = patients; // Store all patients
          this.totalPatients = patients.length;
          this.isLoading = false;
          
          // Update dashboard stats
          this.dashboardStats.totalPatients = this.totalPatients;
          
          console.log('✅ All patients loaded:', patients.length);
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('❌ Error loading patients:', error);
          this.showError('Failed to load patients');
        }
      })
    );
  }

  searchPatients(): void {
    if (!this.patientSearchName.trim()) {
      this.showError('Please enter a patient name to search');
      return;
    }

    console.log('🔍 Searching patients by name:', this.patientSearchName);
    this.isLoading = true;
    this.clearMessages();

    this.subscriptions.add(
      this.helpdeskService.getPatientByName(this.patientSearchName.trim()).subscribe({
        next: (patients) => {
          this.isLoading = false;
          this.searchedPatients = patients; // Update searchedPatients for search results
          
          if (patients.length === 0) {
            this.showError('No patients found with this name');
          } else {
            this.showSuccess(`Found ${patients.length} patient(s)`);
          }
          
          console.log('✅ Patient search results:', patients);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error searching patients:', error);
          this.showError('Failed to search patients');
        }
      })
    );
  }

  // Get patient by ID
  getPatientById(id: number): void {
    if (!id) {
      this.showError('Please enter a valid patient ID');
      return;
    }

    console.log('🔍 Searching for patient by ID:', id);
    this.isLoading = true;
    this.clearMessages();

    this.subscriptions.add(
      this.helpdeskService.getPatientById(id).subscribe({
        next: (patient) => {
          this.isLoading = false;
          if (patient) {
            this.allPatients = [patient]; // Update allPatients
            this.selectedPatient = patient;
            this.loadPatientPaymentHistory();
            
            console.log('✅ Patient found by ID:', patient);
            this.showSuccess(`Patient found: ${patient.userName}`);
          } else {
            this.allPatients = [];
            this.showError('No patient found with this ID');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error searching patient by ID:', error);
          this.showError('Failed to search patient by ID');
        }
      })
    );
  }

  // Select patient for appointment booking
  selectPatient(patient: PatientDetails): void {
    this.selectedPatient = patient;
    
    // Load payment history for selected patient
    this.loadPatientPaymentHistory();
    
    console.log('🔍 Patient selected:', patient.userName);
  }

  clearPatientSelection(): void {
    this.selectedPatient = null;
    // The appointmentForm.patientId is now handled by the new appointmentDate and availableSlots
  }

  clearSearch(): void {
    this.patientSearchName = '';
    this.loadAllPatients(); // Show all patients again
    console.log('🔍 Patient search cleared');
  }

  // Handle patient search input changes
  onPatientSearchInput(): void {
    // If search input is empty, clear search results to show all patients
    if (!this.patientSearchName || this.patientSearchName.trim() === '') {
      this.searchedPatients = [];
      this.clearMessages();
      console.log('🔍 Patient search cleared - showing all patients');
    }
  }

  // Clear search results and show all patients
  clearPatientSearch(): void {
    this.patientSearchName = '';
    this.searchedPatients = [];
    this.clearMessages();
    console.log('🔍 Cleared patient search - showing all patients');
  }

  // Handle doctor search input changes
  onDoctorSearchInput(): void {
    // If search input is empty, clear search results to show all doctors
    if (!this.doctorSearchName || this.doctorSearchName.trim() === '') {
      this.searchedDoctors = [];
      this.clearMessages();
      console.log('🔍 Doctor search cleared - showing all doctors');
    }
  }

  // Clear search results and show all doctors  
  clearDoctorSearch(): void {
    this.doctorSearchName = '';
    this.searchedDoctors = [];
    this.clearMessages();
    console.log('🔍 Cleared doctor search - showing all doctors');
  }

  // ===== DOCTOR MANAGEMENT =====

  loadAllDoctors(): void {
    console.log('🔍 Loading all doctors...');
    
    this.subscriptions.add(
      this.helpdeskService.getAllDoctorsFromAPI().subscribe({
        next: (doctors: DoctorDetails[]) => {
          this.searchedDoctors = doctors;
          this.allDoctors = doctors; // Store all doctors
          this.totalDoctors = doctors.length;
          
          // Update dashboard stats
          const availableDoctors = this.getAvailableDoctorsCount();
          this.dashboardStats.totalDoctors = availableDoctors;
          
          console.log('✅ All doctors loaded:', doctors.length);
          console.log('✅ Available doctors:', availableDoctors);
        },
        error: (error: any) => {
          console.error('❌ Error loading doctors:', error);
          this.showError('Failed to load doctors');
        }
      })
    );
  }

  searchDoctors(): void {
    if (!this.doctorSearchName.trim()) {
      this.showError('Please enter a doctor name to search');
      return;
    }

    console.log('🔍 Searching doctors by name:', this.doctorSearchName);
    this.isLoading = true;
    this.clearMessages();

    this.subscriptions.add(
      this.helpdeskService.getDoctorByName(this.doctorSearchName.trim()).subscribe({
        next: (doctors) => {
          this.isLoading = false;
          this.searchedDoctors = doctors; // Keep this for search results
          
          if (doctors.length === 0) {
            this.showError('No doctors found with this name');
          } else {
            this.showSuccess(`Found ${doctors.length} doctor(s)`);
          }
          
          console.log('✅ Doctor search results:', doctors);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error searching doctors:', error);
          this.showError('Failed to search doctors');
        }
      })
    );
  }

  // Get doctor by ID
  getDoctorById(id: number): void {
    if (!id) {
      this.showError('Please enter a valid doctor ID');
      return;
    }

    console.log('🔍 Searching for doctor by ID:', id);
    this.isLoading = true;
    this.clearMessages();

    this.subscriptions.add(
      this.helpdeskService.getDoctorById(id).subscribe({
        next: (doctor) => {
          this.isLoading = false;
          if (doctor) {
            this.searchedDoctors = [doctor];
            this.selectedDoctor = doctor;
            // The appointmentForm.doctorId is now handled by the new appointmentDate and availableSlots
            
            console.log('✅ Doctor found by ID:', doctor);
            this.showSuccess(`Doctor found: Dr. ${doctor.userName}`);
          } else {
            this.searchedDoctors = [];
            this.showError('No doctor found with this ID');
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error searching doctor by ID:', error);
          this.showError('Failed to search doctor by ID');
        }
      })
    );
  }

  // Get doctors by specialization
  getDoctorsBySpecialization(specialization: string): void {
    if (!specialization.trim()) {
      this.showError('Please enter a specialization to search');
      return;
    }

    console.log('🔍 Searching doctors by specialization:', specialization);
    this.isLoading = true;
    this.clearMessages();

    this.subscriptions.add(
      this.helpdeskService.getDoctorsBySpecialization(specialization.trim()).subscribe({
        next: (doctors) => {
          this.isLoading = false;
          this.searchedDoctors = doctors;
          
          if (doctors.length === 0) {
            this.showError('No doctors found with this specialization');
          } else {
            this.showSuccess(`Found ${doctors.length} doctor(s) in ${specialization}`);
          }
          
          console.log('✅ Doctor specialization search results:', doctors);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error searching doctors by specialization:', error);
          this.showError('Failed to search doctors by specialization');
        }
      })
    );
  }

  selectDoctor(doctor: DoctorDetails): void {
    this.selectedDoctor = doctor;
    console.log('🔍 Doctor selected:', doctor.userName);
    
    // Automatically load slots when doctor is selected (same as doctor-detail)
    this.loadDoctorSlots();
  }

  clearDoctorSelection(): void {
    this.selectedDoctor = null;
    this.availableSlots = [];
    this.bookingSlots = [];
    this.selectedTimeSlot = null;
    this.slotsLoaded = false;
    console.log('🔍 Doctor selection and slots cleared');
  }

  getAvailableDoctorsCount(): number {
    return this.searchedDoctors.filter(doctor => doctor.isAvailable).length;
  }

  // ===== APPOINTMENT BOOKING (REUSE EXISTING LOGIC) =====

  // Load doctor slots (EXACT SAME LOGIC AS DOCTOR-DETAIL)
  loadDoctorSlots(): void {
    if (!this.selectedDoctor) {
      this.showError('Please select a doctor first');
      return;
    }

    console.log('🔍 Loading doctor slots for helpdesk booking...');
    this.isLoadingSlots = true;
    this.availableSlots = [];
    this.selectedTimeSlot = null;
    this.slotsLoaded = false;
    this.bookingSlots = []; // Reset booking slots

    // DETECT DOCTOR'S WORKING SHIFT (same as doctor-detail)
    const specialization = this.selectedDoctor.specialization;
    console.log('🔍 Detecting doctor\'s current working shift...');

    const shifts = [0, 1, 2]; // Morning, Afternoon, Night
    const shiftChecks = shifts.map(shift => 
      this.doctorService.getDoctorSlotsForReschedule(specialization, shift.toString()).toPromise()
    );

    Promise.all(shiftChecks).then(results => {
      let foundSlots = false;
      
      // Find which shift has slots for this doctor
      for (let i = 0; i < results.length; i++) {
        const shiftSlots = results[i];
        if (shiftSlots && shiftSlots.length > 0) {
          // Check if any of the doctors in this shift matches our doctor
                      const doctorSlot = shiftSlots.find((docSlot: any) => docSlot.doctorId === this.selectedDoctor?.userId);
          if (doctorSlot && doctorSlot.slots && doctorSlot.slots.length > 0) {
            const shiftNames = ['Morning', 'Afternoon', 'Night'];
            console.log(`✅ Doctor works in ${shiftNames[i]} shift`);
            
            // Convert to the format expected by helpdesk UI
            const convertedSlots = doctorSlot.slots.map((slot: any) => ({
              id: `slot-${slot.startTime.replace(/:/g, '-')}`,
              time: this.formatTimeSlot(slot.startTime),
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: slot.status,
              isAvailable: slot.status === 'Available',
              isBooked: slot.status === 'Busy',
              doctorId: doctorSlot.doctorId,
              doctorName: doctorSlot.doctorName
            }));

            // Create booking slots structure (same as doctor-detail)
            this.bookingSlots = [{
              date: this.getCurrentDateFormatted(),
              timeSlots: convertedSlots
            }];
            
            this.availableSlots = convertedSlots;
            this.slotsLoaded = true;
            this.isLoadingSlots = false;
            foundSlots = true;
            
            console.log('✅ Doctor slots loaded for helpdesk booking:', convertedSlots.length);
            console.log('Available slots:', convertedSlots.filter((s: any) => s.status === 'Available').length);
            console.log('Busy slots:', convertedSlots.filter((s: any) => s.status === 'Busy').length);
            console.log('Not available slots:', convertedSlots.filter((s: any) => s.status === 'Not_Available').length);
            break; // Found the working shift, stop looking
          }
        }
      }
      
      if (!foundSlots) {
        console.log('❌ No slots found for this doctor in any shift');
        this.isLoadingSlots = false;
        this.slotsLoaded = false;
        this.bookingSlots = [];
        this.availableSlots = [];
        this.showError(`No slots available for Dr. ${this.selectedDoctor?.userName || 'Unknown'} today`);
      }
    }).catch(error => {
      this.isLoadingSlots = false;
      this.slotsLoaded = false;
      this.bookingSlots = [];
      this.availableSlots = [];
      console.error('❌ Error detecting doctor shift or loading slots:', error);
      this.showError('Failed to load doctor slots');
    });
  }

  // Helper method to format time slots
  formatTimeSlot(time: string): string {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return time;
    }
  }

  // Book appointment using existing doctor service
  bookAppointmentForPatient(): void {
    if (!this.selectedPatient || !this.selectedDoctor || !this.selectedTimeSlot) {
      this.showError('Please select patient, doctor, and time slot');
      return;
    }

    console.log('🔍 Helpdesk booking appointment for patient...');
    this.isBookingAppointment = true;
    this.clearMessages();

    // Create appointment booking object (same format as doctor detail)
    const appointmentBooking = {
      DoctorId: this.selectedDoctor.userId,
      DoctorName: this.selectedDoctor.userName,
      AppointmentDate: this.appointmentDate,
      AppointmentStartTime: this.selectedTimeSlot.startTime,
      AppointmentEndTime: this.selectedTimeSlot.endTime,
      Submit: true,
      FilePath: this.selectedFile,
      specialization: this.mapSpecializationToEnum(this.selectedDoctor.specialization),
      Email: this.selectedPatient.email, // Patient email for booking
      shift: 1 // Default to Afternoon shift
    };

    console.log('🔍 Helpdesk booking request:', appointmentBooking);
    console.log('🔍 Current Agent (Helpdesk ID):', this.currentAgent?.agentId);
    console.log('🔍 Will pass helpdeskId:', this.currentAgent?.agentId, 'to booking API');
    
    // 🚨 IMPORTANT: If HelpdeskId appears as NULL in database, the backend needs to be updated
    // The backend BookAppointment method should accept and save the HelpdeskId from FormData
    console.log('🚨 Backend Note: Ensure BookAppointment method saves HelpdeskId from FormData');

    // Use doctor service with helpdesk ID
    this.subscriptions.add(
              this.doctorService.bookAppointment(appointmentBooking, undefined, undefined, this.currentAgent?.agentId?.toString()).subscribe({
        next: (response: any) => {
          this.isBookingAppointment = false;
          
          if (response.success) {
            this.showSuccess(`✅ Appointment booked successfully for ${this.selectedPatient?.userName}!`);
            
            // Clear only the selected slot and file, but keep doctor selected
            this.selectedTimeSlot = null;
            this.selectedFile = null;
            this.fileUploadError = '';
            
            // Reload slots to show updated availability (newly booked slot will show as Busy)
            this.loadDoctorSlots();
            
            // Refresh today's appointments list
            this.loadTodaysAppointments();
            
            console.log('✅ Helpdesk appointment booked successfully:', response);
          } else {
            // Handle specific error messages for helpdesk
            if (response.message.includes('Patient already Booked an Appointment')) {
              // Show detailed error message with options
              const errorMessage = `❌ BOOKING CONFLICT: ${this.selectedPatient?.userName} already has an appointment today.\n\n` +
                `🔒 SYSTEM RULE: Only one appointment per patient per day is allowed.\n\n` +
                `📋 OPTIONS:\n` +
                `1. Check "Today's Appointments" tab to view existing appointment\n` +
                `2. Contact the patient to reschedule existing appointment\n` +
                `3. If urgent, cancel existing appointment first (if system allows)\n\n` +
                `💡 TIP: Switch to "Today's Appointments" tab to see all appointments for today.`;
              
              this.showError(errorMessage);
              
              // Automatically switch to Today's Appointments tab to show existing appointments
              setTimeout(() => {
                this.setActiveTab('todaysAppointments');
                this.loadTodaysAppointments(); // Refresh the list
              }, 3000); // Switch after 3 seconds
              
              console.log(`❌ Patient ${this.selectedPatient?.userName} already has appointment today`);
              console.log('🔄 Auto-switching to Today\'s Appointments tab in 3 seconds...');
              
            } else if (response.message.includes('Slot is Already Booked')) {
              this.showError(`❌ TIME SLOT CONFLICT: This time slot is already taken by another patient.\n\n` +
                `🔄 SOLUTION: Please select a different available time slot (green slots).\n\n` +
                `💡 TIP: The slot grid will refresh to show current availability.`);
              
              // Reload slots to show updated availability
              this.loadDoctorSlots();
              
            } else {
              this.showError(`❌ Booking failed: ${response.message}`);
            }
            console.error('❌ Helpdesk booking failed:', response.message);
            console.error('❌ Full response:', response);
          }
        },
        error: (error: any) => {
          this.isBookingAppointment = false;
          this.showError('Failed to book appointment');
          console.error('❌ Helpdesk booking error:', error);
        }
      })
    );
  }

  // Map specialization to enum (same as doctor detail)
  private mapSpecializationToEnum(specialization: string): number {
    const specMap: { [key: string]: number } = {
      'cardiologist': 0,
      'dermatologist': 1,
      'neurologist': 2,
      'orthopedic_surgeon': 3,
      'pediatrician': 4,
      'psychiatrist': 5,
      'ophthalmologist': 6,
      'ent_specialist': 7,
      'gastroenterologist': 8,
      'urologist': 9,
      'endocrinologist': 10,
      'oncologist': 11
    };
    
    const key = specialization.toLowerCase().replace(/\s+/g, '_');
    return specMap[key] || 0;
  }

  // Clear booking form
  clearBookingForm(): void {
    this.appointmentDate = '';
    this.selectedTimeSlot = null;
    this.availableSlots = [];
    this.selectedFile = null;
    this.isBookingAppointment = false;
    this.isLoadingSlots = false;
    this.slotsLoaded = false;
    this.bookingSlots = [];
    this.fileUploadError = '';
    
    console.log('🔍 Booking form cleared');
  }

  // Load today's appointments
  loadTodaysAppointments(): void {
    console.log('🔍 Loading today\'s appointments...');
    
    this.subscriptions.add(
      this.helpdeskService.getTodaysAppointments().subscribe({
        next: (appointments: any[]) => {
          this.todaysAppointments = appointments;
          
          // Update dashboard stats
          this.dashboardStats.totalAppointmentsToday = appointments.length;
          
          console.log('✅ Today\'s appointments loaded:', appointments.length);
          console.log('📋 Appointments data:', appointments);
        },
        error: (error: any) => {
          console.error('❌ Error loading today\'s appointments:', error);
          console.log('💡 This is expected if appointment endpoints are not implemented in your backend.');
          
          // Set empty array and show helpful message
          this.todaysAppointments = [];
          this.dashboardStats.totalAppointmentsToday = 0;
          
          // Show user-friendly message instead of generic error
          this.showError(`
            📅 Today's Appointments feature requires appointment endpoints in your backend.
            
            🔧 Current Status: Appointment APIs are not available (404 errors)
            ✅ Payment creation still works with manual appointment ID entry
            
            💡 You can still create payments by going to the Payments tab and entering appointment details manually.
          `);
        }
      })
    );
  }

  // Helper methods for Today's Appointments
  formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  formatPaymentDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  // Payment statistics helpers
  getTotalPaidAmount(): number {
    return this.allPayments.reduce((total, payment) => total + (payment.paidAmount || 0), 0);
  }

  getTotalPendingAmount(): number {
    return this.allPayments.reduce((total, payment) => total + (payment.pendingAmount || 0), 0);
  }

  getTotalAmount(): number {
    return this.allPayments.reduce((total, payment) => total + (payment.totalAmount || 0), 0);
  }

  // TrackBy function for payment list performance
  trackByPaymentId(index: number, payment: any): number {
    return payment.paymentId;
  }

  getAppointmentStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'status-scheduled';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      case 'not attended':
      case 'notattended':
        return 'status-not-attended';
      default:
        return 'status-scheduled';
    }
  }

  // ===== PAYMENT MANAGEMENT =====

  // Load patient payment history (now loads all payments)
  loadPatientPaymentHistory(patientId: number = 0): void {
    console.log('🔍 Loading all payments...');
    
    this.subscriptions.add(
      this.helpdeskService.getAllPayments().subscribe({
        next: (payments: any[]) => {
          this.allPayments = payments;
          this.patientPaymentHistory = payments; // Show all payments for now
          console.log('✅ All payments loaded:', payments.length);
          console.log('📋 Payments data:', payments);
        },
        error: (error: any) => {
          console.error('❌ Error loading payments:', error);
          this.showError('Failed to load payments');
          this.allPayments = [];
          this.patientPaymentHistory = [];
        }
      })
    );
  }

  // ===== PAYMENT CREATION =====

  // Show payment creation form
  showCreatePaymentForm(): void {
    console.log('📝 Showing payment creation form...');
    this.showPaymentForm = true;
    this.resetPaymentCreationForm();
  }

  // Hide payment creation form
  hideCreatePaymentForm(): void {
    this.showPaymentForm = false;
    this.resetPaymentCreationForm();
  }

  // Reset payment creation form
  resetPaymentCreationForm(): void {
    this.paymentCreationForm = {
      appointmentId: 0,
      patientId: 0,
      doctorId: 0,
      totalAmount: 0,
      paidAmount: 0,
      paymentMethod: ''
    };
    this.isCreatingPayment = false;
    console.log('🔍 Payment form reset with defaults:', this.paymentCreationForm);
  }

  // Load actual appointment IDs from the system
  loadActualAppointmentIds(): void {
    console.log('🔍 Loading actual appointment IDs from today\'s appointments...');
    
    // Try to get today's appointments to see what IDs actually exist
    this.subscriptions.add(
      this.helpdeskService.getTodaysAppointments().subscribe({
        next: (appointments: any[]) => {
          if (appointments && appointments.length > 0) {
            const appointmentIds = appointments.map(app => app.appointmentId).filter(id => id);
            console.log('✅ Available Appointment IDs:', appointmentIds);
            console.log('💡 Use one of these IDs for payment creation:', appointmentIds.join(', '));
            
            // Show user-friendly message with available IDs
            if (appointmentIds.length > 0) {
              this.showSuccess(`📋 Available Appointment IDs: ${appointmentIds.join(', ')}\n\nUse one of these IDs in the form below.`);
            }
          } else {
            console.log('⚠️ No appointments found today. Try using a different Appointment ID.');
            this.showError('No appointments found today. Please check if there are any scheduled appointments.');
          }
        },
        error: (error: any) => {
          console.error('❌ Error loading appointment IDs:', error);
          console.log('💡 Try using Appointment IDs: 1, 2, 3, 4, 5...');
        }
      })
    );
  }

  // ===== PAYMENT METHODS =====

  // Create new payment (simplified - no complex validation)
  createPayment(): void {
    console.log('🔍 Creating payment with form data:', this.paymentCreationForm);

    // Mark form as submit attempted
    this.formSubmitAttempted = true;

    // Enhanced validation with specific error messages
    const validationErrors = this.validatePaymentForm();
    if (validationErrors.length > 0) {
      this.showError(validationErrors.join(' '));
      return;
    }

    this.isCreatingPayment = true;

    const paymentData = {
      appointmentId: Number(this.paymentCreationForm.appointmentId),
      patientId: Number(this.paymentCreationForm.patientId),
      doctorId: Number(this.paymentCreationForm.doctorId),  // Added missing doctorId
      totalAmount: Number(this.paymentCreationForm.totalAmount),
      paidAmount: Number(this.paymentCreationForm.paidAmount),
      paymentMethod: this.paymentCreationForm.paymentMethod,
      
      // Optional fields
      amount: Number(this.paymentCreationForm.amount) || 0,
      transactionId: this.paymentCreationForm.transactionId || ''
    };

    console.log('🔍 Sending payment data to API:', paymentData);

    this.helpdeskService.createPayment(paymentData).subscribe({
      next: (response) => {
        console.log('✅ Payment creation response:', response);
        
        if (response.success) {
          this.showSuccess(`Payment created successfully! Payment ID: ${response.paymentId || 'Generated'}`);
          this.hideCreatePaymentForm();
          this.resetPaymentForm();
          this.loadPatientPaymentHistory(0); // Reload all payments
        } else {
          this.handlePaymentError(response.message);
        }
        
        this.isCreatingPayment = false;
      },
      error: (error) => {
        console.error('❌ Payment creation error:', error);
        this.handlePaymentError(error);
        this.isCreatingPayment = false;
      }
    });
  }

  // Enhanced validation for payment form
  validatePaymentForm(): string[] {
    const errors: string[] = [];

    // Check for empty/null values - only for fields that exist in the form
    if (!this.paymentCreationForm.appointmentId || this.paymentCreationForm.appointmentId <= 0) {
      errors.push('❌ Appointment ID is required and must be a positive number.');
    }

    if (!this.paymentCreationForm.patientId || this.paymentCreationForm.patientId <= 0) {
      errors.push('❌ Patient ID is required and must be a positive number.');
    }

    if (!this.paymentCreationForm.doctorId || this.paymentCreationForm.doctorId <= 0) {
      errors.push('❌ Doctor ID is required and must be a positive number.');
    }

    if (!this.paymentCreationForm.totalAmount || this.paymentCreationForm.totalAmount <= 0) {
      errors.push('❌ Total Amount is required and must be greater than 0.');
    }

    if (this.paymentCreationForm.paidAmount === null || this.paymentCreationForm.paidAmount === undefined || this.paymentCreationForm.paidAmount < 0) {
      errors.push('❌ Paid Amount is required and cannot be negative.');
    }

    if (!this.paymentCreationForm.paymentMethod || this.paymentCreationForm.paymentMethod.trim() === '') {
      errors.push('❌ Payment Method is required.');
    }

    // Logical validation
    if (this.paymentCreationForm.paidAmount > this.paymentCreationForm.totalAmount) {
      errors.push('❌ Paid Amount cannot be greater than Total Amount.');
    }

    return errors;
  }

  // Handle specific payment errors
  handlePaymentError(error: any): void {
    let errorMessage = 'An error occurred while creating the payment.';

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Check for specific backend error messages
    if (errorMessage.toLowerCase().includes('appointment not found')) {
      this.showError(`❌ Appointment Not Found: No appointment exists with ID ${this.paymentCreationForm.appointmentId}. Please verify the appointment ID and try again.`);
    } else if (errorMessage.toLowerCase().includes('patient not found')) {
      this.showError(`❌ Patient Not Found: No patient exists with ID ${this.paymentCreationForm.patientId}. Please verify the patient ID and try again.`);
    } else if (errorMessage.toLowerCase().includes('invalid amount')) {
      this.showError(`❌ Invalid Amount: Please check your amount values. Total: ₹${this.paymentCreationForm.totalAmount}, Paid: ₹${this.paymentCreationForm.paidAmount}`);
    } else if (errorMessage.toLowerCase().includes('duplicate payment')) {
      this.showError(`❌ Duplicate Payment: A payment already exists for this appointment. Please check existing payments.`);
    } else {
      this.showError(`❌ Payment Creation Failed: ${errorMessage}`);
    }
  }

  // Reset payment form
  resetPaymentForm(): void {
    this.paymentCreationForm = {
      appointmentId: 0,
      patientId: 0,
      doctorId: 0,
      totalAmount: 0,
      paidAmount: 0,
      paymentMethod: ''
    };
  }

  // Check if payment form is invalid
  isPaymentFormInvalid(): boolean {
    const errors = this.validatePaymentForm();
    return errors.length > 0;
  }

  // Track field interaction
  markFieldAsTouched(fieldName: string): void {
    if (this.formTouched.hasOwnProperty(fieldName)) {
      (this.formTouched as any)[fieldName] = true;
    }
  }

  // Check if validation error should be shown for a field
  shouldShowFieldError(fieldName: string): boolean {
    return this.formSubmitAttempted || (this.formTouched as any)[fieldName];
  }

  // Validate payment creation form

  // ===== UTILITY METHODS =====

  showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  getPaymentStatusClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.Paid:
        return 'status-paid';
      case PaymentStatus.Pending:
        return 'status-pending';
      case PaymentStatus.Partial:
        return 'status-partial';
      case PaymentStatus.Failed:
        return 'status-failed';
      case PaymentStatus.Refunded:
        return 'status-refunded';
      default:
        return 'status-pending';
    }
  }

  getUrgencyClass(urgency: AppointmentUrgency): string {
    switch (urgency) {
      case AppointmentUrgency.Emergency:
        return 'urgency-emergency';
      case AppointmentUrgency.High:
        return 'urgency-high';
      case AppointmentUrgency.Normal:
        return 'urgency-normal';
      case AppointmentUrgency.Low:
        return 'urgency-low';
      default:
        return 'urgency-normal';
    }
  }

  // Clear all data on logout
  clearAllData(): void {
    // Reset login state
    this.currentAgent = null;
    
    // Reset search results
    this.allPatients = [];
    this.searchedDoctors = [];
    this.selectedPatient = null;
    this.selectedDoctor = null;
    
    // Reset appointment form
    this.appointmentDate = '';
    this.selectedTimeSlot = null;
    this.availableSlots = [];
    this.selectedFile = null;
    this.isBookingAppointment = false;
    this.isLoadingSlots = false;
    this.slotsLoaded = false;
    this.bookingSlots = [];
    this.fileUploadError = '';
    
    // Reset payment data
    this.patientPaymentHistory = [];
    
    // Reset dashboard stats
    this.dashboardStats = {
      totalPatients: 0,
      totalDoctors: 0,
      totalAppointmentsToday: 0,
      totalPendingPayments: 0,
      totalRevenue: 0,
      activeAgents: 0,
      emergencyAppointments: 0
    };
    
    // Reset appointments
    this.todaysAppointments = [];
    
    console.log('🔍 All helpdesk data cleared');
  }

  // ===== EXACT SAME SLOT DISPLAY METHODS AS DOCTOR-DETAIL =====

  // Get current date formatted for display  
  getCurrentDateFormatted(): string {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  }

  // Helper method to check if there are any slots (regardless of status)
  hasAnySlots(): boolean {
    return this.bookingSlots.some(day => day.timeSlots.length > 0);
  }

  // Get ALL time slots (Available, Busy, Not_Available)
  getAllTimeSlots(): any[] {
    if (this.bookingSlots.length === 0) return [];
    return this.bookingSlots[0].timeSlots || [];
  }

  // Count available slots
  getAvailableSlotCount(): number {
    return this.getAllTimeSlots().filter(slot => slot.status === 'Available').length;
  }

  // Count busy slots
  getBusySlotCount(): number {
    return this.getAllTimeSlots().filter(slot => slot.status === 'Busy').length;
  }

  // Count not available slots
  getNotAvailableSlotCount(): number {
    return this.getAllTimeSlots().filter(slot => slot.status === 'Not_Available').length;
  }

  // Helper method to get slot status class for styling
  getSlotStatusClass(slot: any): string {
    const baseClass = 'time-slot';
    const isSelected = this.selectedTimeSlot === slot;
    
    switch (slot.status) {
      case 'Available':
        return `${baseClass} slot-available ${isSelected ? 'selected' : ''}`;
      case 'Busy':
        return `${baseClass} slot-busy`;
      case 'Not_Available':
        return `${baseClass} slot-not-available`;
      default:
        return `${baseClass} slot-unknown`;
    }
  }

  // Helper method to get slot status text
  getSlotStatusText(slot: any): string {
    switch (slot.status) {
      case 'Available':
        return 'Available';
      case 'Busy':
        return 'Booked';
      case 'Not_Available':
        return 'Not Available';
      default:
        return 'Unknown';
    }
  }

  // Helper method to get slot status icon
  getSlotStatusIcon(slot: any): string {
    switch (slot.status) {
      case 'Available':
        return 'fas fa-check-circle';
      case 'Busy':
        return 'fas fa-user-clock';
      case 'Not_Available':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-question-circle';
    }
  }

  // File upload methods (exact same as doctor-detail)
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        this.fileUploadError = 'Please select a PDF file only.';
        this.selectedFile = null;
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.fileUploadError = 'File size must be less than 5MB.';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.fileUploadError = '';
      console.log('File selected:', file.name, this.getFileSize(file.size));
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileUploadError = '';
    
    // Reset file input
    const fileInput = document.getElementById('medicalHistoryFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Check if slot is selectable
  isSlotSelectable(slot: any): boolean {
    return slot.status === 'Available';
  }

  // Updated selectTimeSlot method (exact same as doctor-detail)
  selectTimeSlot(slot: any): void {
    console.log('🔄 Attempting to select slot for TODAY booking');
    
    // Only allow selection of Available slots
    if (!this.isSlotSelectable(slot)) {
      if (slot.status === 'Busy') {
        alert('⚠️ This time slot is already booked by another patient. Please choose an available slot.');
      } else if (slot.status === 'Not_Available') {
        alert('⚠️ This time slot is not available (time has passed). Please choose an available slot.');
      }
      return; // Don't select the slot
    }

    this.selectedTimeSlot = slot;
    console.log('✅ Selected available slot for helpdesk booking:', slot);
  }

  // Handle booking click (modified for helpdesk)
  handleBookingClick(): void {
    console.log('🔍 Helpdesk booking click - validating...');
    
    if (!this.selectedPatient) {
      this.showError('Please select a patient first');
      return;
    }

    if (!this.selectedDoctor) {
      this.showError('Please select a doctor first');
      return;
    }

    if (!this.selectedTimeSlot) {
      this.showError('Please select a time slot');
      return;
    }

    if (!this.selectedFile) {
      this.showError('Please upload a medical history file');
      return;
    }

    console.log('✅ All validations passed - proceeding with helpdesk booking');
    this.bookAppointmentForPatient();
  }

  // Get today's date in YYYY-MM-DD format
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  toggleAgentAvailability(): void {
    if (!this.currentAgent) {
      this.showError('No agent logged in.');
      return;
    }

    // Simple toggle without backend call
    this.currentAgent.isAvailable = !this.currentAgent.isAvailable;
    
    console.log('🔄 Agent availability toggled:', this.currentAgent.isAvailable);
    this.showSuccess(`Agent status: ${this.currentAgent.isAvailable ? 'Available' : 'Not Available'}`);
  }

  // Helper method to find existing appointment for a patient
  findPatientAppointmentToday(patientName: string): any | null {
    return this.todaysAppointments.find(appointment => 
      appointment.patientName.toLowerCase() === patientName.toLowerCase()
    ) || null;
  }

  // Helper method to check if patient has appointment today
  hasAppointmentToday(patientName: string): boolean {
    return this.findPatientAppointmentToday(patientName) !== null;
  }

  // Download medical file
  downloadFile(base64Data: string, fileName: string): void {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ File downloaded:', fileName);
      this.showSuccess(`File downloaded: ${fileName}`);
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      this.showError('Failed to download file');
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
} 