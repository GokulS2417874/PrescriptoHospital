import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { 
  SpecializationEnum, 
  BookingSlot, 
  SlotWithDoctorDto,
  SlotDto,
  AppointmentBooking 
} from '../../models/doctor.model';
import { Doctor } from '../../models/doctor.model'; 
import { ShiftTime } from '../../models/common.model';
import { DoctorService } from '../../services/doctor.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-detail.component.html',
  styleUrl: './doctor-detail.component.css'
})
export class DoctorDetailComponent implements OnInit, OnDestroy {
  doctor: Doctor | null = null;
  relatedDoctors: Doctor[] = [];
  
  doctorSlots: SlotWithDoctorDto[] = [];
  selectedShift: ShiftTime = ShiftTime.Morning;
  selectedTimeSlot: any = null;
  selectedDoctorSlot: SlotWithDoctorDto | null = null;
  
  bookingSlots: BookingSlot[] = [];
  
  showAuthModal: boolean = false;
  showAccessDeniedModal: boolean = false;
  
  selectedFile: File | null = null;
  fileUploadError: string = '';
  
  isLoadingSlots: boolean = false;
  isBookingAppointment: boolean = false;
  
  private brokenImages: Set<string> = new Set();
  
  private routeSubscription: Subscription = new Subscription();

  doctorCurrentShift: ShiftTime | null = null;
  isDetectingShift = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(DoctorService) private doctorService: DoctorService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const doctorId = params.get('id');
      console.log('🔍 Route params - doctorId:', doctorId);
      if (doctorId) {
        this.loadDoctorById(parseInt(doctorId));
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
    this.routeSubscription.unsubscribe();
    }
  }

  loadDoctorDetails(doctorId: string): void {
    this.doctorService.getDoctorById(parseInt(doctorId)).subscribe(doctor => {
      if (doctor) {
        this.doctor = doctor;
        this.loadDoctorSlots(doctor.specialization);
        this.loadRelatedDoctors(doctorId, doctor.specialization);
      }
    });
  }

  loadDoctorById(doctorId: number): void {
    console.log('🔍 Loading doctor by ID:', doctorId);
    
    this.doctorService.getDoctorById(doctorId).subscribe({
      next: (doctor) => {
      if (doctor) {
        this.doctor = doctor;
          console.log('✅ Doctor loaded successfully:', doctor.userName, '-', doctor.specialization);
        
        this.detectDoctorCurrentShift();
        
          this.loadRelatedDoctors(doctorId.toString(), doctor.specialization);
        } else {
          console.error('❌ No doctor data received');
          this.doctor = null;
        }
      },
      error: (error) => {
        console.error('❌ Error loading doctor:', error);
        this.doctor = null;
      }
    });
  }

  loadDoctorSlots(specialization: string): void {
    this.isLoadingSlots = true;
    this.selectedTimeSlot = null;
    this.selectedDoctorSlot = null;
    
    if (!specialization || specialization === 'undefined' || specialization.trim() === '') {
      console.error('❌ Invalid specialization for loading slots:', specialization);
      specialization = 'General Medicine'; // Default fallback
    }
    
    const today = new Date();
    const todayString = today.toDateString();
    
    console.log('Loading TODAY\'S slots only for specialization:', specialization, 'shift:', this.getShiftName(this.selectedShift));
    console.log('📅 Today\'s date:', todayString);
    
    this.doctorService.getDoctorSlotsForReschedule(specialization, this.selectedShift.toString()).subscribe({
      next: (slots: any) => {
        console.log('Received ALL doctor slots for specialization:', slots);
        
        const currentDoctorSlots = slots.filter((doctorSlot: any) => 
          doctorSlot.doctorId === this.doctor?.userId || 
          doctorSlot.doctorId === (this.doctor as any)?.doctorId ||
          doctorSlot.doctorName === this.doctor?.userName ||
          doctorSlot.doctorName === this.doctor?.name
        );
        
        console.log('✅ Filtered slots for current doctor only:', currentDoctorSlots);
        this.doctorSlots = currentDoctorSlots;
        
        this.bookingSlots = this.doctorService.convertSlotsToBookingSlots(currentDoctorSlots);
        
        this.isLoadingSlots = false;
        
        const totalSlots = currentDoctorSlots.reduce((count: any, doctorSlot: any) => count + doctorSlot.slots.length, 0);
        const availableSlots = currentDoctorSlots.reduce((count: any, doctorSlot: any) => 
          count + doctorSlot.slots.filter((slot: any) => slot.status === 'Available').length, 0);
        const busySlots = currentDoctorSlots.reduce((count: any, doctorSlot: any) => 
          count + doctorSlot.slots.filter((slot: any) => slot.status === 'Busy').length, 0);
        const notAvailableSlots = currentDoctorSlots.reduce((count: any, doctorSlot: any) => 
          count + doctorSlot.slots.filter((slot: any) => slot.status === 'Not_Available').length, 0);
        
        console.log(`📅 ${this.doctor?.userName || this.doctor?.name}'s schedule: ${totalSlots} total slots (Available: ${availableSlots}, Busy: ${busySlots}, Not_Available: ${notAvailableSlots})`);
        
        if (slots.length === 0) {
          console.log(`No doctors available for ${specialization} during ${this.getShiftName(this.selectedShift)} shift TODAY`);
        }
      },
      error: (error: any) => {
        console.error('Error loading doctor slots for TODAY:', error);
        this.isLoadingSlots = false;
        this.doctorSlots = [];
        this.bookingSlots = [];
      }
    });
  }

  loadFallbackSlots(): void {
    if (this.doctor) {
      this.doctorService.getBookingSlots(this.doctor.userId.toString()).subscribe((slots: any) => {
        this.bookingSlots = slots;
      });
    }
  }

  loadRelatedDoctors(currentDoctorId: string, specialization: string): void {
    this.doctorService.getRelatedDoctors(parseInt(currentDoctorId), specialization).subscribe((doctors: any) => {
      this.relatedDoctors = doctors;
    });
  }

  getCurrentDateFormatted(): string {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  }

  getSelectedDateFormatted(): string {
    return this.getCurrentDateFormatted();
  }

  getAvailableTimeSlots(): any[] {
    const slots: any[] = [];
    
    this.doctorSlots.forEach(doctorSlot => {
      doctorSlot.slots.forEach((slot: any) => {
        if (slot.status === 'Available' && !slot.isBooked) {
          slots.push({
            time: this.formatTime(slot.startTime),
            startTime: slot.startTime,
            endTime: slot.endTime,
            doctorId: doctorSlot.doctorId,
            doctorName: doctorSlot.doctorName,
            isAvailable: true
          });
        }
      });
    });
    
    return slots;
  }

  hasAvailableSlots(): boolean {
    return this.getAvailableSlotCount() > 0;
  }

  handleBookingClick(): void {
    console.log('=== BOOKING AUTHENTICATION CHECK ===');
    
    const isLoggedIn = this.isUserLoggedIn();
    const isPatientUser = this.isPatient();
    const currentRole = this.getCurrentUserRole();
    
    console.log('User logged in:', isLoggedIn);
    console.log('User role:', currentRole);
    console.log('Is patient:', isPatientUser);
    
    if (!isLoggedIn) {
      console.log('User not logged in - showing login alert');
      
      const userConfirmed = confirm('🔐 Patient Login Required\n\nYou need to login as a Patient to book an appointment.\n\nClick OK to go to the login page.');
      
      if (userConfirmed) {
        console.log('User confirmed - navigating to login page');
        this.router.navigate(['/login']);
      } else {
        console.log('User cancelled - staying on current page');
      }
      return;
    }

    if (!isPatientUser) {
      console.log('User is not a patient - showing access denied alert');
      
      alert('⚠️ Access Denied\n\nOnly Patient accounts can book appointments.\n\nPlease login with a Patient account to book appointments.');
      return;
    }

    console.log('User is authenticated patient - proceeding with booking');
    this.confirmBooking();
  }

  confirmBooking(): void {
    if (!this.doctor || !this.selectedTimeSlot || !this.selectedDoctorSlot) {
      alert('Please select a time slot');
      return;
    }

    if (!this.selectedFile) {
      alert('Please upload your medical history file');
      return;
    }

    if (!this.doctor) {
      alert('❌ Error: Doctor information not found. Please refresh the page and try again.');
      this.isBookingAppointment = false;
      return;
    }

    if (!this.doctor.specialization) {
      alert('❌ Error: Doctor specialization not found. Please contact support.');
      this.isBookingAppointment = false;
      return;
    }

    this.isBookingAppointment = true;

    const currentUser = this.authService.getCurrentUserSnapshot();
    const userEmail = currentUser?.email;
    const userId = this.authService.getUserIdFromToken();
    
    console.log('🔍 BOOKING DEBUG START =================');
    console.log('🔍 Current User:', currentUser);
    console.log('🔍 User Email:', userEmail);
    console.log('🔍 User ID:', userId);
    
    if (!userEmail) {
      alert('❌ Error: User email not found. Please login again.');
      console.log('🔍 ERROR: No user email found');
      return;
    }

    if (!userId) {
      alert('❌ Error: User ID not found. Please login again.');
      console.log('🔍 ERROR: No user ID found');
      return;
    }

    // Debug the selected time slot
    console.log('🔍 this.selectedTimeSlot object:', this.selectedTimeSlot);
    console.log('🔍 this.selectedTimeSlot.startTime:', this.selectedTimeSlot?.startTime);
    console.log('🔍 this.selectedTimeSlot.endTime:', this.selectedTimeSlot?.endTime);
    
    // Ensure we have valid time values
    if (!this.selectedTimeSlot?.startTime) {
      alert('❌ Error: Invalid time slot selected. Please select a valid time slot.');
      this.isBookingAppointment = false;
      return;
    }

    // Use the exact time format from backend (already in HH:mm:ss format)
    const appointmentStartTime = this.selectedTimeSlot.startTime;
    const appointmentEndTime = this.selectedTimeSlot.endTime;
    
    // Format TODAY'S date for backend (yyyy-MM-dd) - ONLY TODAY ALLOWED
    const today = new Date();
    const appointmentDate = today.toISOString().split('T')[0];

    console.log('🔍 ===== FRONTEND DATE DEBUG =====');
    console.log('🔍 Frontend - Raw Today Date:', today);
    console.log('🔍 Frontend - Today ISO String:', today.toISOString());
    console.log('🔍 Frontend - Final Appointment Date:', appointmentDate);
    console.log('🔍 Frontend - User Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('🔍 Frontend - User Locale Date:', today.toLocaleDateString());
    console.log('🔍 Frontend - Is this really today?', today.toDateString());
    console.log('🔍 ===== END FRONTEND DATE DEBUG =====');

    console.log('🔍 Appointment Details:');
    console.log('🔍 - Doctor ID:', this.selectedDoctorSlot.doctorId);
    console.log('🔍 - Doctor Name:', this.selectedDoctorSlot.doctorName);
    console.log('🔍 - Date:', appointmentDate);
    console.log('🔍 - Start Time:', appointmentStartTime);
    console.log('🔍 - End Time:', appointmentEndTime);
    console.log('🔍 - Patient Email:', userEmail);

    // Create appointment booking object for backend
    const appointmentBooking: AppointmentBooking = {
      // Required properties for the interface
      appointmentDate: appointmentDate,
      appointmentStartTime: appointmentStartTime,
      appointmentEndTime: appointmentEndTime,
      patientEmail: userEmail,
      
      // Backend compatibility properties (ensure all required fields)
      DoctorId: this.selectedDoctorSlot?.doctorId,
      DoctorName: this.selectedDoctorSlot?.doctorName || this.doctor?.name || this.doctor?.userName,
      PatientId: userId,
      PatientEmail: userEmail, // Add PatientEmail field for FormData
      AppointmentDate: appointmentDate,
      AppointmentStartTime: appointmentStartTime,
      AppointmentEndTime: appointmentEndTime,
      Submit: true,
      FilePath: this.selectedFile,
      BookedBy: currentUser?.role || 'Patient', // Dynamic based on user role
      HelpDeskId: currentUser?.role === 'HelpDesk' ? userId : 0, // Dynamic based on user role
      
      // Additional parameters for API - Send as strings, not enums
      specialization: this.doctor?.specialization,
      Email: userEmail, // Patient email for booking
      shift: this.getShiftName(this.selectedShift)
    };
    
    // Debug the parameters being sent to backend
    console.log('🔍 BACKEND PARAMETERS DEBUG:');
    console.log('🔍 - this.doctor:', this.doctor);
    console.log('🔍 - this.doctor.specialization:', this.doctor?.specialization);
    console.log('🔍 - this.selectedShift:', this.selectedShift);
    console.log('🔍 - specialization:', this.doctor?.specialization);
    console.log('🔍 - shift:', this.getShiftName(this.selectedShift));
    console.log('🔍 - appointmentBooking object:', {
      DoctorId: this.selectedDoctorSlot?.doctorId,
      DoctorName: this.selectedDoctorSlot?.doctorName || this.doctor?.name || this.doctor?.userName,
      AppointmentDate: appointmentDate,
      AppointmentStartTime: appointmentStartTime,
      AppointmentEndTime: appointmentEndTime,
      specialization: this.doctor?.specialization,
      Email: userEmail,
      shift: this.getShiftName(this.selectedShift),
      Submit: true,
      BookedBy: currentUser?.role || 'Patient',
      HelpDeskId: currentUser?.role === 'HelpDesk' ? userId : 0,
      FilePath: this.selectedFile ? 'File attached' : 'No file'
    });

    console.log('🔍 ===== EMAIL DEBUG =====');
    console.log('🔍 userEmail from JWT:', userEmail);
    console.log('🔍 currentUser:', currentUser);
    console.log('🔍 currentUser.email:', currentUser?.email);
    console.log('🔍 Email fields in booking object:');
    console.log('🔍 - patientEmail:', appointmentBooking.patientEmail);
    console.log('🔍 - PatientEmail:', appointmentBooking.PatientEmail);
    console.log('🔍 - Email:', appointmentBooking.Email);
    console.log('🔍 ===== END EMAIL DEBUG =====');
    
    console.log('🔍 Full Booking Request:', appointmentBooking);
    
    // Validate required fields before sending
    const requiredFields = {
      'Doctor ID': appointmentBooking.DoctorId,
      'Doctor Name': appointmentBooking.DoctorName,
      'Patient Email': appointmentBooking.Email,
      'Patient Email (FormData)': appointmentBooking.PatientEmail,
      'Appointment Date': appointmentBooking.AppointmentDate,
      'Start Time': appointmentBooking.AppointmentStartTime,
      'End Time': appointmentBooking.AppointmentEndTime,
      'Specialization': appointmentBooking.specialization,
      'Shift': appointmentBooking.shift,
      'Booked By': appointmentBooking.BookedBy,
      'Medical History File': appointmentBooking.FilePath
    };
    
    const missingFields = [];
    for (const [fieldName, value] of Object.entries(requiredFields)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(fieldName);
      }
    }
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      alert(`❌ Missing required information:\n${missingFields.join(', ')}\n\nPlease ensure all fields are filled and try again.`);
      this.isBookingAppointment = false;
      return;
    }
    
    console.log('✅ All required fields validated');
    console.log('🔍 Sending to backend...');

    // Extract query parameters from appointmentBooking object
    const specialization = appointmentBooking.specialization;
    const email = appointmentBooking.Email;
    const shift = appointmentBooking.shift;
    
    console.log('🔍 Query params for API:', { specialization, email, shift });
    
    // Debug what will be sent as FormData
    console.log('🔍 ===== FORMDATA DEBUG =====');
    console.log('🔍 appointmentBooking object before FormData creation:', appointmentBooking);
    
    // Log each field that will be added to FormData
    Object.keys(appointmentBooking).forEach(key => {
      const value = appointmentBooking[key as keyof AppointmentBooking];
      console.log(`🔍 FormData field: ${key} = ${value} (type: ${typeof value})`);
    });
    console.log('🔍 ===== END FORMDATA DEBUG =====');
    
    this.doctorService.bookAppointment(appointmentBooking, specialization, email, shift).subscribe({
      next: (response: any) => {
        console.log('🔍 Backend Response:', response);
        console.log('🔍 Response type:', typeof response);
        console.log('🔍 Response keys:', Object.keys(response || {}));
        console.log('🔍 response.appointmentId:', response?.appointmentId);
        console.log('🔍 response.success:', response?.success);
        console.log('🔍 response.message:', response?.message);
        console.log('🔍 response.error:', response?.error);
        
        this.isBookingAppointment = false;
        
        // Check for successful booking - backend returns appointmentId when successful
        if (response && (response.appointmentId || response.success || (typeof response === 'object' && !response.error))) {
          console.log('✅ BOOKING SUCCESS - Appointment ID:', response.appointmentId);
          
          // Store values before clearing them to avoid TypeScript errors
          const doctorName = this.selectedDoctorSlot?.doctorName || response.doctorName || this.doctor?.name || this.doctor?.userName || 'Doctor';
          const startTime = this.selectedTimeSlot?.startTime || response.appointmentStartTime;
          const endTime = this.selectedTimeSlot?.endTime || response.appointmentEndTime;
          
          // Clear the selected slot since it's now booked
          this.selectedTimeSlot = null;
          this.selectedDoctorSlot = null;
          
          alert(`✅ Appointment Booked Successfully!\n\nAppointment ID: ${response.appointmentId}\nDoctor: ${doctorName}\nSpecialization: ${this.doctor?.specialization}\nDate: ${response.appointmentDate}\nTime: ${startTime} - ${endTime}\nStatus: ${response.appointmentStatus}\nFee: ₹${this.doctor?.consultant_fees || this.doctor?.consultantFees}`);
          
          // Navigate to appointments page or reload slots
          this.router.navigate(['/appointments']);
        } else {
          console.log('❌ BOOKING FAILED - Backend returned error:', response?.message || 'Unknown error');
          console.log('🔍 Full response for debugging:', JSON.stringify(response, null, 2));
          
          // Check if appointment might have been created despite the response format
          if (response && typeof response === 'object' && Object.keys(response).length > 0) {
            console.log('⚠️ Response has data but doesn\'t match expected format - appointment might still be created');
            alert(`⚠️ Booking Response Unclear:\nReceived response but format unexpected.\n\nPlease check your appointments list to verify if the booking was successful.\n\nResponse keys: ${Object.keys(response).join(', ')}`);
          } else {
            alert(`❌ Booking Failed:\n${response?.message || 'Unknown error occurred'}`);
          }
        }
        console.log('🔍 BOOKING DEBUG END =================');
      },
      error: (error: any) => {
        console.log('🔍 HTTP ERROR:', error);
        this.isBookingAppointment = false;
        console.error('Booking error:', error);
        
        let errorMessage = 'Failed to book appointment. Please try again.';
        
        // Handle validation errors specifically
        if (error.status === 400 && error.error) {
          console.log('🔍 400 Bad Request - Validation Errors:');
          console.log('🔍 Full error object:', JSON.stringify(error.error, null, 2));
          
          if (error.error.errors) {
            console.log('🔍 Validation errors:', error.error.errors);
            const validationErrors = error.error.errors;
            const errorMessages = [];
            
            for (const field in validationErrors) {
              const fieldErrors = validationErrors[field];
              if (Array.isArray(fieldErrors)) {
                fieldErrors.forEach(err => {
                  errorMessages.push(`${field}: ${err}`);
                });
              } else {
                errorMessages.push(`${field}: ${fieldErrors}`);
              }
            }
            
            errorMessage = `Validation Errors:\n${errorMessages.join('\n')}`;
          } else if (error.error.title) {
            errorMessage = `${error.error.title}\n${error.error.detail || ''}`;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
          console.log('🔍 Backend Error Message:', error.error);
        }
        
        console.log('❌ BOOKING ERROR - Final message:', errorMessage);
        alert(`❌ Booking Error:\n${errorMessage}`);
        console.log('🔍 BOOKING DEBUG END =================');
      }
    });
  }

  // Helper methods
  private calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  }

  private mapSpecializationToEnum(specialization: string): SpecializationEnum {
    const specMap: {[key: string]: SpecializationEnum} = {
      'cardiologist': SpecializationEnum.Cardiologist,
      'dermatologist': SpecializationEnum.Dermatologist,
      'neurologist': SpecializationEnum.Neurologist,
      'orthopedic_surgeon': SpecializationEnum.Orthopedic_Surgeon,
      'pediatrician': SpecializationEnum.Pediatrician,
      'psychiatrist': SpecializationEnum.Psychiatrist,
      'ophthalmologist': SpecializationEnum.Ophthalmologist,
      'ent_specialist': SpecializationEnum.ENT_Specialist,
      'gastroenterologist': SpecializationEnum.Gastroenterologist,
      'urologist': SpecializationEnum.Urologist,
      'endocrinologist': SpecializationEnum.Endocrinologist,
      'oncologist': SpecializationEnum.Oncologist
    };
    
    const key = specialization.toLowerCase().replace(/\s+/g, '_');
    return specMap[key] || SpecializationEnum.Cardiologist;
  }

  // Format time for display
  formatTime(timeString: string): string {
    return this.doctorService.formatTime(timeString);
  }

  // Authentication helper methods
  isUserLoggedIn(): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('Authentication check - isLoggedIn:', isLoggedIn);
    return isLoggedIn;
  }

  isPatient(): boolean {
    const isPatientRole = this.authService.isPatient();
    const userRole = this.authService.getUserRole();
    console.log('Role check - userRole:', userRole, 'isPatient:', isPatientRole);
    return isPatientRole;
  }

  getCurrentUserRole(): string {
    const role = this.authService.getUserRole();
    console.log('Current user role:', role);
    return role || 'Unknown';
  }

  getPatientId(): string {
    const currentUser = this.authService.getCurrentUserSnapshot();
    return currentUser?.email || 'patient-id';
  }

  getUserEmail(): string {
    const currentUser = this.authService.getCurrentUserSnapshot();
    return currentUser?.email || '';
  }

  // Modal methods
  closeAuthModal(): void {
    this.showAuthModal = false;
  }

  closeAccessDeniedModal(): void {
    this.showAccessDeniedModal = false;
  }

  redirectToLogin(): void {
    this.closeAuthModal();
    this.router.navigate(['/login']);
  }

  redirectToRegister(): void {
    this.closeAuthModal();
    this.router.navigate(['/register'], { queryParams: { type: 'patient' } });
  }

  // Utility methods
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  goBack(): void {
    this.router.navigate(['/doctors']);
  }

  // Related doctor actions
  viewRelatedDoctor(doctorId: number): void {
    this.router.navigate(['/doctor', doctorId.toString()]);
  }

  bookWithRelatedDoctor(event: Event, doctorId: number): void {
    event.stopPropagation();
    this.router.navigate(['/doctor', doctorId.toString()]);
  }

  // Image error handling methods
  isImageBroken(imageUrl: string): boolean {
    return !imageUrl || this.brokenImages.has(imageUrl);
  }

  markImageAsBroken(imageUrl: string): void {
    this.brokenImages.add(imageUrl);
  }

  // Slot status helpers for UI
  // Helper method to check if slot is selectable for booking
  isSlotSelectable(slot: any): boolean {
    return slot.status === 'Available' && !slot.isBooked;
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

  // Helper method to count slots by status for a specific doctor
  getSlotCountByStatus(doctorSlots: any, status: string): number {
    if (!doctorSlots || !doctorSlots.slots) return 0;
    return doctorSlots.slots.filter((slot: any) => slot.status === status).length;
  }

  // Check if any doctors are available for the current shift
  hasAvailableDoctors(): boolean {
    return this.doctorSlots.length > 0;
  }

  // Get doctor's working shift name
  getDoctorWorkingShiftName(): string {
    return this.doctorCurrentShift ? this.getShiftName(this.doctorCurrentShift) : 'Not Available Today';
  }

  // Get shift name from enum
  getShiftName(shift: ShiftTime): string {
    switch (shift) {
      case ShiftTime.Morning:
        return 'Morning';
      case ShiftTime.Afternoon:
        return 'Afternoon';
      case ShiftTime.Night:
        return 'Night';
      default:
        return 'Unknown';
    }
  }

  // Shift time enum values for template
  get ShiftTime() {
    return ShiftTime;
  }

  // File upload methods
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

  // Debug helper methods
  getTotalAvailableSlots(): number {
    return this.doctorSlots.reduce((total, doctorSlot) => 
      total + this.getSlotCountByStatus(doctorSlot, 'Available'), 0
    );
  }

  getSlotDebugInfo(doctorSlot: SlotWithDoctorDto): string {
    return JSON.stringify({
      doctorId: doctorSlot.doctorId,
      doctorName: doctorSlot.doctorName,
      shift: doctorSlot.shift,
      totalSlots: doctorSlot.slots.length,
      availableSlots: doctorSlot.slots.filter((s: any) => s.status === 'Available' && this.isToday(new Date(s.startTime))),
      sampleSlots: doctorSlot.slots.slice(0, 3).map((slot: any) => ({
        time: slot.startTime,
        status: slot.status,
        isBooked: slot.isBooked
      }))
    }, null, 2);
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

  // Helper method to convert doctor shift to ShiftTime enum
  private convertToShiftTime(shift: string | number | undefined): ShiftTime {
    if (shift === undefined || shift === null) {
      return ShiftTime.Morning;
    }
    
    if (typeof shift === 'number') {
      if (shift >= 0 && shift <= 2) {
        return shift as ShiftTime;
      }
      return ShiftTime.Morning;
    }
    
    if (typeof shift === 'string') {
      switch (shift.toLowerCase()) {
        case 'morning':
          return ShiftTime.Morning;
        case 'afternoon':
          return ShiftTime.Afternoon;
        case 'night':
        case 'evening':
          return ShiftTime.Night;
        default:
          const parsedShift = parseInt(shift);
          if (!isNaN(parsedShift) && parsedShift >= 0 && parsedShift <= 2) {
            return parsedShift as ShiftTime;
          }
          return ShiftTime.Morning;
      }
    }
    
    return ShiftTime.Morning;
  }



  // Updated selectTimeSlot method - ONLY ALLOW TODAY'S SLOTS
  selectTimeSlot(slot: any): void {
    console.log('🔄 Selecting slot:', slot.startTime, 'Status:', slot.status);
    
    // Check authentication first before allowing slot selection
    const isLoggedIn = this.isUserLoggedIn();
    const isPatientUser = this.isPatient();
    
    if (!isLoggedIn) {
      console.log('User not logged in - showing login alert for slot selection');
      
      // Show alert and navigate to login page when OK is clicked
      const userConfirmed = confirm('🔐 Patient Login Required\n\nYou need to login as a Patient to select appointment slots.\n\nClick OK to go to the login page.');
      
      if (userConfirmed) {
        console.log('User confirmed - navigating to login page');
        this.router.navigate(['/login']);
      }
      return;
    }

    if (!isPatientUser) {
      console.log('User is not a patient - showing access denied alert for slot selection');
      alert('⚠️ Access Denied\n\nOnly Patient accounts can select appointment slots.\n\nPlease login with a Patient account to book appointments.');
      return;
    }
    
    // Only allow Available slots - trust backend validation
    if (slot.status !== 'Available') {
      if (slot.status === 'Busy') {
        alert('This time slot is already booked. Please choose another slot.');
      } else {
        alert('This time slot is not available. Please choose an available slot.');
      }
      return;
    }

    this.selectedTimeSlot = slot;
    
    // Since we're now filtering to only current doctor's slots, just use the first (and only) doctor slot
    if (this.doctorSlots.length > 0) {
      this.selectedDoctorSlot = this.doctorSlots[0]; // Current doctor's slot
      console.log('✅ Using current doctor slot:', this.selectedDoctorSlot?.doctorName);
    } else {
      console.log('⚠️ No doctor slots available');
    }

    console.log('✅ Slot selected successfully:', slot.startTime, '-', slot.endTime);
    console.log('✅ this.selectedTimeSlot now contains:', this.selectedTimeSlot);
    console.log('✅ this.selectedDoctorSlot now contains:', this.selectedDoctorSlot?.doctorName);
  }



  // Updated method to check if slot is selected
  isTimeSlotSelected(slot: any): boolean {
    return this.selectedTimeSlot === slot;
  }

  // Detect doctor's current working shift
  detectDoctorCurrentShift(): void {
    if (!this.doctor) {
      console.error('❌ No doctor data available');
      return;
    }

    console.log('🔍 Setting up shift for doctor:', this.doctor.userName);
    console.log('🔍 Doctor shift data:', this.doctor.shift);
    
    // Use doctor's shift data if available, otherwise default to morning
    const shiftValue = this.convertToShiftTime(this.doctor.shift);
    this.selectedShift = shiftValue;
    this.doctorCurrentShift = shiftValue;
    
    console.log('✅ Doctor shift set to:', this.getShiftName(shiftValue));
            
    // Load slots for this doctor's specialization and shift
    this.loadDoctorSlots(this.doctor.specialization);
  }

  // Check if doctor works in a specific shift
  doctorWorksInShift(shift: ShiftTime): boolean {
    return this.doctorCurrentShift === shift;
  }
} 