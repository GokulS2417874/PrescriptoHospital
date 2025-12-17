import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { PrescriptionService } from '../services/prescription.service';
import { ShiftTime } from '../models/common.model';

// Updated interface to match backend response
export interface BackendAppointment {
  appointmentId: number;
  appointmentDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  appointmentStatus: string;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName?: string;
  specialization?: string;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.css']
})
export class AppointmentsComponent implements OnInit {
  allAppointments: BackendAppointment[] = [];
  upcomingAppointments: BackendAppointment[] = [];
  pastAppointments: BackendAppointment[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Track broken images
  private brokenImages: Set<string> = new Set();

  // Reschedule modal state
  showRescheduleModal = false;
  selectedAppointmentForReschedule: BackendAppointment | null = null;
  rescheduleForm = {
    date: '',
    startTime: '',
    endTime: ''
  };

  // Doctor slots for reschedule
  availableSlots: any[] = [];
  loadingSlots = false;
  selectedDate = '';

  // Time options for reschedule (fallback)
  timeOptions: string[] = [];

  // Prescription viewing
  showPrescriptionModal = false;
  currentPrescription: any = null;
  prescriptionLoading = false;

  constructor(
    public authService: AuthService,
    private doctorService: DoctorService,
    private prescriptionService: PrescriptionService
  ) {
    this.timeOptions = this.generateTimeOptions();
  }

  ngOnInit(): void {
    this.loadAppointments();
  }

  // 📋 View prescription for completed appointment
  viewPrescription(appointment: BackendAppointment): void {
    if (appointment.appointmentStatus !== 'Completed') {
      alert('Prescription is only available for completed appointments.');
      return;
    }

    this.prescriptionLoading = true;
    this.showPrescriptionModal = true;
    this.currentPrescription = null;

    this.prescriptionService.getPatientPrescription(appointment.appointmentId).subscribe({
      next: (prescriptionData) => {
        console.log('✅ Prescription loaded:', prescriptionData);
        if (prescriptionData && prescriptionData.length > 0) {
          this.currentPrescription = prescriptionData[0]; // API returns array
        } else {
          this.currentPrescription = null;
        }
        this.prescriptionLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading prescription:', error);
        this.prescriptionLoading = false;
        if (error.status === 404) {
          alert('No prescription found for this appointment.');
        } else {
          alert('Failed to load prescription. Please try again.');
        }
        this.closePrescriptionModal();
      }
    });
  }

  // Close prescription modal
  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
    this.currentPrescription = null;
    this.prescriptionLoading = false;
  }

  // Get medicine type name
  getMedicineTypeName(type: string): string {
    const types: {[key: string]: string} = {
      '0': 'Tablet',
      '1': 'Capsule', 
      '2': 'Syrup',
      '3': 'Injection',
      '4': 'Cream',
      '5': 'Drops'
    };
    return types[type] || 'Unknown';
  }

  // Get dosage name
  getDosageName(dosage: string): string {
    const dosages: {[key: string]: string} = {
      '0': 'Once a day',
      '1': 'Twice a day',
      '2': 'Three times a day',
      '3': 'Four times a day',
      '4': 'As needed'
    };
    return dosages[dosage] || 'Unknown';
  }

  // Get schedule time name
  getScheduleTimeName(schedule: string): string {
    const schedules: {[key: string]: string} = {
      '0': 'Before Breakfast',
      '1': 'After Breakfast', 
      '2': 'Before Lunch',
      '3': 'After Lunch',
      '4': 'Before Dinner',
      '5': 'After Dinner',
      '6': 'At Bedtime'
    };
    return schedules[schedule] || 'Unknown';
  }

  loadAppointments() {
    this.isLoading = true;
    this.error = null;

    this.authService.getPatientAppointments().subscribe({
      next: (appointments: any[]) => {
        console.log('✅ Appointments loaded:', appointments);
        this.allAppointments = appointments;
        this.categorizeAppointments();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading appointments:', error);
        this.error = 'Failed to load appointments. Please try again.';
        this.isLoading = false;
      }
    });
  }

  categorizeAppointments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter upcoming appointments - only show scheduled/confirmed appointments that are today or in the future
    this.upcomingAppointments = this.allAppointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      
      // Exclude completed, cancelled appointments from upcoming
      const isActiveStatus = apt.appointmentStatus !== 'Cancelled' && 
                            apt.appointmentStatus !== 'Completed' && 
                            apt.appointmentStatus !== 'No Show';
      
      return aptDate >= today && isActiveStatus;
    });

    // Filter past appointments - include past dates, completed, cancelled, and no-show appointments
    this.pastAppointments = this.allAppointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      
      // Include appointments that are:
      // 1. In the past (date before today)
      // 2. Completed (regardless of date)
      // 3. Cancelled (regardless of date)
      // 4. No Show (regardless of date)
      const isPastDate = aptDate < today;
      const isCompletedStatus = apt.appointmentStatus === 'Completed' ||
                               apt.appointmentStatus === 'Cancelled' ||
                               apt.appointmentStatus === 'No Show';
      
      return isPastDate || isCompletedStatus;
    });

    console.log('🔍 Appointments categorized:');
    console.log('📅 Upcoming appointments:', this.upcomingAppointments.length);
    console.log('📚 Past appointments:', this.pastAppointments.length);
    console.log('🔍 Completed appointments moved to past:', this.allAppointments.filter(apt => apt.appointmentStatus === 'Completed').length);
  }

  // Format date for display
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format time for display
  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Get status badge class
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'status-scheduled';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'rescheduled': return 'status-rescheduled';
      default: return 'status-default';
    }
  }

  // Download medical history file for specific appointment
  downloadMedicalHistory(appointment: BackendAppointment) {
    if (!appointment.filePath) {
      alert('No medical history file available for this appointment.');
      return;
    }

    const currentUserId = this.authService.getUserIdFromToken();
    
    if (!currentUserId) {
      alert('Cannot determine your user ID. Please login again.');
      return;
    }
    
    console.log('🔽 Downloading medical history for appointment:', appointment.appointmentId, 'patient:', currentUserId);
    
    // Call with BOTH appointmentId and patientId to match backend API
    this.authService.downloadMedicalHistory(appointment.appointmentId, currentUserId).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          alert('The medical history file appears to be empty.');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = appointment.fileName || `medical-history-${appointment.appointmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Medical history downloaded successfully');
      },
      error: (error: any) => {
        console.error('❌ Medical history download error:', error);
        let errorMessage = '';
        
        if (error.status === 403) {
          errorMessage = 'Permission denied. You can only download your own medical history.';
        } else if (error.status === 404) {
          errorMessage = 'No medical history file found for this appointment.';
        } else if (error.status === 401) {
          errorMessage = 'Your session has expired. Please login again.';
        } else if (error.status === 500) {
          errorMessage = 'Server error occurred. Please contact support.';
        } else {
          errorMessage = 'Download failed. Please try again or contact support.';
        }
        
        alert(errorMessage);
      }
    });
  }

  // Real Cancel appointment implementation
  cancelAppointment(appointment: BackendAppointment) {
    const userEmail = this.authService.getCurrentUserSnapshot()?.email;
    
    if (!userEmail) {
      alert('User email not found. Please login again.');
      return;
    }

    if (confirm(`Are you sure you want to cancel your appointment with ${appointment.doctorName || 'the doctor'} on ${this.formatDate(appointment.appointmentDate)}?`)) {
      console.log('🔄 Canceling appointment:', appointment.appointmentId);
      
      this.authService.cancelAppointment(userEmail).subscribe({
        next: (response) => {
          if (response.success) {
            alert('✅ ' + response.message);
            // Reload appointments to show updated status
            this.loadAppointments();
          } else {
            alert('❌ ' + response.message);
          }
        },
        error: (error) => {
          console.error('❌ Cancel appointment error:', error);
          alert('Failed to cancel appointment. Please try again.');
        }
      });
    }
  }

  // Reschedule appointment with modal - TODAY ONLY
  rescheduleAppointment(appointment: BackendAppointment) {
    this.selectedAppointmentForReschedule = appointment;
    this.showRescheduleModal = true;
    
    // Set default values - FORCE TODAY'S DATE
    const today = new Date().toISOString().split('T')[0];
    this.rescheduleForm = {
      date: today, // Always set to today
      startTime: '', // Clear previous selection
      endTime: ''    // Clear previous selection
    };

    // Reset slots and load slots for TODAY only
    this.availableSlots = [];
    this.selectedDate = today;
    this.loadDoctorSlots(appointment.doctorId, today);
    
    console.log('🔄 Opening reschedule modal for TODAY only:', today);
  }

  // Load doctor slots for reschedule - SHOW ALL SLOTS WITH STATUS
  loadDoctorSlots(doctorId: number, date: string) {
    if (!doctorId) {
      console.log('❌ Missing doctorId for slot loading');
      return;
    }

    this.loadingSlots = true;
    console.log('🔄 Loading ALL slots (Available/Busy/Not_Available) for doctor:', doctorId);

    // Get the doctor's specialization from the appointment
    const doctorSpecialization = this.selectedAppointmentForReschedule?.specialization || 'GeneralMedicine';
    
    // Get slots for ALL shifts that the doctor works (Morning, Afternoon, Night)
    const shifts = [ShiftTime.Morning, ShiftTime.Afternoon, ShiftTime.Night];
    const allSlotPromises = shifts.map(shift => 
      this.doctorService.getDoctorSlotsForReschedule(doctorSpecialization, shift.toString()).toPromise()
    );

    Promise.all(allSlotPromises).then(allShiftResults => {
      let allSlots: any[] = [];
      
      // Find slots for this specific doctor across ALL their working shifts
      for (const shiftResult of allShiftResults) {
        if (shiftResult) {
          const doctorInShift = shiftResult.find((docSlot: any) => docSlot.doctorId === doctorId);
          if (doctorInShift && doctorInShift.slots && doctorInShift.slots.length > 0) {
            // Add ALL slots (Available, Busy, Not_Available) - DON'T FILTER
            allSlots = [...allSlots, ...doctorInShift.slots];
            console.log(`✅ Found ${doctorInShift.slots.length} total slots in shift for doctor ${doctorId}`);
          }
        }
      }

      // Sort slots by time
      allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // Show ALL slots - user will see complete schedule
      this.availableSlots = allSlots;
      this.loadingSlots = false;
      
      // Count different statuses for user info
      const availableCount = allSlots.filter(s => s.status === 'Available').length;
      const busyCount = allSlots.filter(s => s.status === 'Busy').length;
      const notAvailableCount = allSlots.filter(s => s.status === 'Not_Available').length;
      
      console.log(`🎯 Total slots: ${allSlots.length} (Available: ${availableCount}, Busy: ${busyCount}, Not_Available: ${notAvailableCount})`);
      
      if (allSlots.length === 0) {
        console.log('⚠️ No slots found for this doctor across all shifts');
      }
    }).catch(error => {
      console.error('❌ Error loading slots for reschedule:', error);
      this.availableSlots = [];
      this.loadingSlots = false;
    });
  }

  // Called when date changes in reschedule modal - RESTRICT TO TODAY ONLY
  onRescheduleDateChange() {
    // Validate that selected date is TODAY
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (this.rescheduleForm.date !== today) {
      alert('⚠️ Appointments can only be rescheduled for today. Future date booking is not allowed.');
      this.rescheduleForm.date = today; // Reset to today
      return;
    }
    
    if (this.rescheduleForm.date && this.selectedAppointmentForReschedule) {
      // Clear selected times when date changes
      this.rescheduleForm.startTime = '';
      this.rescheduleForm.endTime = '';
      
      // Load new slots for TODAY only
      this.loadDoctorSlots(this.selectedAppointmentForReschedule.doctorId, this.rescheduleForm.date);
    }
  }

  // Get available time slots for dropdown
  getAvailableTimeSlots(): string[] {
    if (this.availableSlots.length > 0) {
      // Return actual doctor slots
      return this.availableSlots.map(slot => slot.startTime);
    }
    // Fallback to generic options if no slots loaded
    return this.timeOptions;
  }

  // Handle time selection in reschedule - ONLY ALLOW AVAILABLE SLOTS
  onRescheduleTimeSelect(selectedStartTime: string) {
    const selectedSlot = this.availableSlots.find(slot => slot.startTime === selectedStartTime);
    
    if (!selectedSlot) {
      alert('Slot not found. Please try again.');
      return;
    }
    
    // Only allow selection of Available slots
    if (selectedSlot.status !== 'Available') {
      if (selectedSlot.status === 'Busy') {
        alert('⚠️ This time slot is already booked by another patient.');
      } else if (selectedSlot.status === 'Not_Available') {
        alert('⚠️ This time slot is not available (time has passed or doctor not working).');
      }
      return; // Don't select the slot
    }
    
    // Set the selected times for Available slots only
    this.rescheduleForm.startTime = selectedSlot.startTime;
    this.rescheduleForm.endTime = selectedSlot.endTime;
    
    console.log('✅ Selected available slot:', selectedSlot);
  }

  // Helper method to check if slot is selectable
  isSlotSelectable(slot: any): boolean {
    return slot.status === 'Available';
  }

  // Helper method to get slot status class for styling
  getSlotStatusClass(slot: any): string {
    const baseClass = 'slot-btn';
    const isSelected = this.rescheduleForm.startTime === slot.startTime;
    
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

  // Helper method to count slots by status
  getSlotCountByStatus(status: string): number {
    return this.availableSlots.filter(slot => slot.status === status).length;
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

  // Save rescheduled appointment
  saveReschedule() {
    const userEmail = this.authService.getCurrentUserSnapshot()?.email;
    
    if (!userEmail) {
      alert('User email not found. Please login again.');
      return;
    }

    if (!this.validateRescheduleForm()) {
      return;
    }

    console.log('🔄 Rescheduling appointment with new details:', this.rescheduleForm);
    
    this.authService.rescheduleAppointment(
      userEmail,
      this.rescheduleForm.date,
      this.rescheduleForm.startTime,
      this.rescheduleForm.endTime
    ).subscribe({
      next: (response: {success: boolean, message: string}) => {
        if (response.success) {
          alert('✅ ' + response.message);
          this.showRescheduleModal = false;
          this.loadAppointments(); // Reload to show updated appointment
        } else {
          alert('❌ ' + response.message);
        }
      },
      error: (error: any) => {
        console.error('❌ Reschedule appointment error:', error);
        alert('Failed to reschedule appointment. Please try again.');
      }
    });
  }

  // Validate reschedule form - TODAY ONLY
  validateRescheduleForm(): boolean {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayDate = new Date();
    
    if (!this.rescheduleForm.date) {
      alert('Please select a date.');
      return false;
    }

    // CRITICAL: Only allow TODAY's date
    if (this.rescheduleForm.date !== today) {
      alert('⚠️ Appointments can only be rescheduled for TODAY. Future date booking is not allowed.');
      return false;
    }

    if (!this.rescheduleForm.startTime) {
      alert('Please select a time slot.');
      return false;
    }

    if (!this.rescheduleForm.endTime) {
      alert('Please select an end time.');
      return false;
    }

    // Validate slot is available (using correct property names)
    if (this.availableSlots.length > 0) {
      const selectedSlot = this.availableSlots.find(slot => 
        slot.startTime === this.rescheduleForm.startTime && 
        slot.endTime === this.rescheduleForm.endTime
      );
      
      if (!selectedSlot) {
        alert('Selected time slot not found. Please choose another slot.');
        return false;
      }
      
      // Check using correct property name 'status' (not 'slotStatus')
      if (selectedSlot.status !== 'Available') {
        if (selectedSlot.status === 'Busy') {
          alert('This time slot is already booked. Please choose an available slot.');
        } else if (selectedSlot.status === 'Not_Available') {
          alert('This time slot is not available (time has passed). Please choose an available slot.');
        } else {
          alert('Selected time slot is not available. Please choose another slot.');
        }
        return false;
      }
      
      // Additional validation: Check if time is not in the past
      const [hours, minutes] = this.rescheduleForm.startTime.split(':');
      const slotDateTime = new Date(todayDate);
      slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (slotDateTime < new Date()) {
        alert('Cannot reschedule to a time that has already passed today.');
        return false;
      }
      
      console.log('✅ Slot validation passed for TODAY:', selectedSlot);
    }

    return true;
  }

  // Close reschedule modal and reset state
  closeRescheduleModal() {
    this.showRescheduleModal = false;
    this.selectedAppointmentForReschedule = null;
    this.availableSlots = [];
    this.loadingSlots = false;
    this.selectedDate = '';
    this.rescheduleForm = {
      date: '',
      startTime: '',
      endTime: ''
    };
  }

  // Generate time options for reschedule dropdown
  generateTimeOptions(): string[] {
    const times = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
        times.push(timeString);
      }
    }
    return times;
  }

  // Format time for display (HH:MM AM/PM)
  formatTimeForDisplay(timeStr: string): string {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Get today's date in YYYY-MM-DD format for date input
  getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Get formatted today's date for display
  getTodayFormatted(): string {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Method to handle appointment status updates
  onAppointmentStatusChange(appointmentId: number, newStatus: string) {
    console.log(`🔄 Appointment ${appointmentId} status changed to: ${newStatus}`);
    
    // Update the appointment status in the local array
    const appointment = this.allAppointments.find(apt => apt.appointmentId === appointmentId);
    if (appointment) {
      const oldStatus = appointment.appointmentStatus;
      appointment.appointmentStatus = newStatus;
      
      // Re-categorize appointments to move completed ones to past
      this.categorizeAppointments();
      
      // Show notification if appointment was moved to past
      if (newStatus === 'Completed' && oldStatus !== 'Completed') {
        this.showAppointmentMovedNotification(appointment);
      }
    }
  }

  // Show notification when appointment is moved to past
  private showAppointmentMovedNotification(appointment: BackendAppointment) {
    const message = `✅ Appointment with ${appointment.doctorName} has been completed and moved to Past Appointments.`;
    
    // You can replace this with a toast notification or modal
    console.log('📋 ' + message);
    
    // Optional: Show browser notification (you can implement this)
    // this.showToastNotification(message);
  }

  // Method to manually refresh appointments (useful for real-time updates)
  refreshAppointments() {
    console.log('🔄 Manually refreshing appointments...');
    this.loadAppointments();
  }
} 