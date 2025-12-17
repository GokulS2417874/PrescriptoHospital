import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { Employee, AdminApproval, ShiftTime, Appointment, Payment, Prescription, Patient, Specialization } from '../models';
import { AuthService } from '../services/auth.service';
import { PaymentService } from '../services/payment.service';
import { AppointmentService } from '../services/appointment.service';
import { HttpHeaders } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  // Tab state
  currentTab: 'employees' | 'appointments' | 'financial' | 'patients' = 'employees';
  currentEmployeeTab: 'pending' | 'all' | 'notApproved' | 'shiftNotAllocated' | 'shifts' | 'rejected' = 'pending';
  currentAppointmentTab: 'today' | 'analytics' = 'today';

  allEmployeesSubTab: 'All' | 'Doctor' | 'HelpDesk' = 'All';

  // Date filters
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  selectedYearOnly: number = new Date().getFullYear();

  // Data arrays
  pendingEmployees: Employee[] = [];
  allEmployees: Employee[] = [];
  originalAllEmployees: Employee[] = []; // Backup for filtering
  notApprovedEmployees: Employee[] = [];
  shiftNotAllocatedEmployees: Employee[] = [];
  doctorEmployees: Employee[] = [];
  helpDeskEmployees: Employee[] = [];
  
  todayAppointments: Appointment[] = [];
  allAppointments: Appointment[] = [];
  payments: Payment[] = [];
  prescriptions: Prescription[] = [];
  searchResults: Appointment[] = [];

  // Patient data arrays
  allPatients: Patient[] = [];
  originalAllPatients: Patient[] = []; // Backup for filtering

  // Financial Analytics Data
  dailyEarnings: number = 0;
  monthlyEarnings: number = 0;
  yearlyEarnings: number = 0;

  selectedEarningsDate: string = new Date().toISOString().split('T')[0];
  selectedEarningsMonth: number = new Date().getMonth() + 1;
  selectedEarningsYear: number = new Date().getFullYear();



  // Count properties
  todayAppointmentCount: number = 0;
  selectedDateCount: number = 0;
  selectedMonthCount: number = 0;
  selectedYearCount: number = 0;
  pendingEmployeesCount: number = 0;
  totalPatientsCount: number = 0;

  // View mode
  employeeViewMode: 'table' | 'grid' = 'grid';

  // Employee details
  selectedEmployee: Employee | null = null;
  expandedEmployeeDetails: Set<number> = new Set();
  tempShiftSelections: { [employeeId: number]: number } = {};
  showEmployeeDetailsModal: boolean = false;

  // UI state
  isProcessing: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  // Enum references for template
  AdminApproval = AdminApproval;
  ShiftTime = ShiftTime;
  Specialization = Specialization;

  // Filtering properties
  selectedSpecialization: string = '';
  searchName: string = '';
  searchId: string = '';
  isFilterActive: boolean = false;

  // Patient filtering properties
  patientSearchName: string = '';
  patientSearchId: string = '';
  isPatientFilterActive: boolean = false;
  selectedPatient: Patient | null = null;
  showPatientDetailsModal: boolean = false;

  // Appointment details modal properties
  selectedAppointment: Appointment | null = null;
  showAppointmentDetailsModal: boolean = false;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private appointmentService: AppointmentService,
    private http: HttpClient
  ) {}

  // Add this method to test backend connectivity
  testBackendConnection(): void {
    console.log('Testing backend connection...');
    console.log('API Base URL:', this.adminService['API_BASE_URL']);
    
    // Test the basic connectivity
    this.adminService.testAvailableEndpoints();
    
    // Also test authentication
    console.log('Current auth token:', this.authService.getToken());
    console.log('Current user:', this.authService.getCurrentUserSnapshot());
  }

  // Call this when the admin dashboard loads to check connectivity
  ngOnInit(): void {
    console.log('AdminComponent ngOnInit started');
    
    // Force refresh user data from localStorage first
    console.log('Refreshing user data from localStorage...');
    this.authService.refreshUserFromStorage();
    
    // Check authentication first
    if (!this.authService.isLoggedIn()) {
      console.log('User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Small delay to ensure auth state is stable
    setTimeout(() => {
      if (this.authService.isLoggedIn() && this.authService.getCurrentUserSnapshot()?.role === 'Admin') {
        console.log('Authentication confirmed, loading dashboard data');
        this.loadDashboardData();
      } else {
        console.log('Authentication not ready, retrying in 1 second...');
        setTimeout(() => {
          console.log('Second attempt to load dashboard data');
          this.loadDashboardData();
        }, 1000);
      }
    }, 100);
  }



  // Methods accessibility fix
  public loadDashboardData(): void {
    // Load counts
    this.loadYearAppointmentCount();
    this.loadDateAppointmentCount();
    
    // Load employee data
    this.loadPendingEmployees();
    this.loadAllEmployees();
    
    // Load financial data for initial display
    this.loadFinancialData();
    this.loadNotApprovedEmployees();
    this.loadShiftNotAllocatedEmployees();
    this.loadDoctorEmployees();
    this.loadHelpDeskEmployees();

    // Load patient data
    this.loadAllPatients();
    this.loadPatientCount();
    
    // Load appointment data
    this.loadTodayAppointments();
    this.loadTodayAppointmentsCount();
    
    // Load financial data for initial display
    this.loadDailyEarnings();
  }

  private loadYearAppointmentCount(): void {
    this.adminService.getAppointmentCountByYear(this.selectedYear).subscribe({
      next: (data: any) => {
        this.selectedYearCount = data.count || 0;
      },
      error: (error: any) => {
        // Silent error handling
        this.selectedYearCount = 0;
      }
    });
  }

  private loadDateAppointmentCount(): void {
    this.adminService.getAppointmentCountByDate(this.selectedDate).subscribe({
      next: (data: any) => {
        this.selectedDateCount = data.count || 0;
      },
      error: (error: any) => {
        // Silent error handling
        this.selectedDateCount = 0;
      }
    });
  }

  // Fix loadPendingEmployees method
  private loadPendingEmployees(): void {
    this.adminService.getPendingEmployees().subscribe({
      next: (employees: Employee[]) => {
        this.pendingEmployees = employees;
        this.pendingEmployeesCount = employees.length;
      },
      error: (error: any) => {
        // Silent error handling
      }
    });
  }

  // Missing method - loadEmployeeData
  private loadEmployeeData(): void {
    switch (this.currentEmployeeTab) {
      case 'pending':
        this.loadPendingEmployees();
        break;
      case 'all':
        this.loadAllEmployees();
        break;
      case 'notApproved':
        this.loadNotApprovedEmployees();
        break;
      case 'shiftNotAllocated':
        this.loadShiftNotAllocatedEmployees();
        break;
      default:
        // Handle extended types like 'shifts', 'rejected'
        break;
    }
  }

  private loadAllEmployees(): void {
    this.adminService.getAllEmployees().subscribe({
      next: (employees: Employee[]) => {
        console.log('=== EMPLOYEE DATA DEBUG ===');
        console.log('Received employees data:', employees);
        
        if (employees && employees.length > 0) {
          console.log('First employee sample:', employees[0]);
          console.log('First employee approval status:', employees[0].isApprovedByAdmin);
          console.log('First employee shift:', employees[0].shift);
          console.log('First employee role:', employees[0].role);
          
          // Log the types to see what we're getting
          employees.forEach((emp, index) => {
            if (index < 3) { // Log first 3 employees
              console.log(`Employee ${index + 1}:`, {
                name: emp.userName,
                role: emp.role,
                approvalStatus: emp.isApprovedByAdmin,
                approvalType: typeof emp.isApprovedByAdmin,
                shift: emp.shift,
                shiftType: typeof emp.shift
              });
            }
          });
        }
        
        // Convert string values to numeric enum values for display
        const convertedEmployees = employees.map(emp => {
          const convertedApproval = this.convertApprovalStatus(emp.isApprovedByAdmin);
          const convertedShift = this.convertShiftValue(emp.shift);
          
          console.log(`Converting employee ${emp.userName}:`, {
            originalApproval: emp.isApprovedByAdmin,
            convertedApproval: convertedApproval,
            originalShift: emp.shift,
            convertedShift: convertedShift
          });
          
          return {
            ...emp,
            isApprovedByAdmin: convertedApproval,
            shift: convertedShift
          };
        });
        
        // Save both original and current data
        this.originalAllEmployees = [...convertedEmployees];
        this.allEmployees = [...convertedEmployees];
        
        // Also filter doctors and helpdesk from all employees as fallback
        this.filterEmployeesByRole();
      },
      error: (error: any) => {
        console.error('Error loading all employees:', error);
        this.allEmployees = [];
      }
    });
  }

  // Convert approval status from string to enum value
  private convertApprovalStatus(status: any): number {
    if (typeof status === 'number') return status;
    
    switch (status?.toString().toLowerCase()) {
      case 'pending': return 0;
      case 'approved': return 1;
      case 'notapproved':
      case 'rejected': return 2;
      default: return status; // Return as-is if already numeric or unknown
    }
  }
  
  // Convert shift from string to enum value  
  private convertShiftValue(shift: any): number {
    if (typeof shift === 'number') return shift;
    
    const shiftStr = shift?.toString().toLowerCase().trim();
    
    switch (shiftStr) {
      case 'morning': return 0;
      case 'afternoon': return 1;
      case 'night': return 2;
      case 'notallocated':
      case 'not allocated': return 3;
      case '0': return 0;  // Handle string numbers
      case '1': return 1;  // Handle string numbers
      case '2': return 2;  // Handle string numbers
      case '3': return 3;  // Handle string numbers
      default: 
        console.warn('⚠️ Unknown shift value in convertShiftValue:', shift);
        const parsed = parseInt(shift);
        return isNaN(parsed) ? 3 : parsed; // Default to NotAllocated if can't parse
    }
  }

  // Filter employees by role from the main employees list
  private filterEmployeesByRole(): void {
    // Filter doctors from all employees
    this.doctorEmployees = this.allEmployees.filter(emp => 
      emp.role && emp.role.toLowerCase() === 'doctor'
    );
    
    // Filter helpdesk from all employees  
    this.helpDeskEmployees = this.allEmployees.filter(emp => 
      emp.role && (emp.role.toLowerCase() === 'helpdesk' || emp.role.toLowerCase() === 'help desk')
    );
    
    console.log('Filtered doctors from all employees:', this.doctorEmployees);
    console.log('Filtered helpdesk from all employees:', this.helpDeskEmployees);
  }

  private loadNotApprovedEmployees(): void {
    this.adminService.getNotApprovedEmployees().subscribe({
      next: (employees: Employee[]) => {
        this.notApprovedEmployees = employees;
      },
      error: (error: any) => {
        this.notApprovedEmployees = [];
      }
    });
  }

  private loadShiftNotAllocatedEmployees(): void {
    this.adminService.getShiftNotAllocatedEmployees().subscribe({
      next: (employees: Employee[]) => {
        this.shiftNotAllocatedEmployees = employees;
      },
      error: (error: any) => {
        this.shiftNotAllocatedEmployees = [];
      }
    });
  }

  // Filtering Methods
  applyFilters(): void {
    console.log('Applying filters:', {
      selectedSpecialization: this.selectedSpecialization,
      searchName: this.searchName,
      searchId: this.searchId
    });
    
    this.isFilterActive = true;

    // Apply filters based on what's filled
    if (this.selectedSpecialization) {
      this.filterBySpecialization(this.selectedSpecialization);
    } else if (this.searchName) {
      this.filterByName();
    } else if (this.searchId) {
      this.filterById();
    } else {
      // No filters applied, show all employees
      this.loadAllEmployees();
    }
  }

  private filterByName(): void {
    console.log('=== NAME FILTER DEBUG ===');
    console.log('Search name:', this.searchName);
    console.log('Original employees count:', this.originalAllEmployees.length);
    
    // Search in all employees loaded initially by name
    if (this.allEmployees && this.allEmployees.length > 0) {
      const filtered = this.allEmployees.filter(emp => 
        emp.userName && emp.userName.toLowerCase().includes(this.searchName.toLowerCase())
      );
      
      if (filtered.length > 0) {
        console.log('Found employees locally:', filtered);
        this.allEmployees = filtered;
        this.updateFilteredArrays();
        return;
      }
    }
    
    // If not found locally, try API search
    this.adminService.getDoctorsByName(this.searchName).subscribe({
      next: (doctors: Employee[]) => {
        console.log('Got doctors by name from API:', doctors);
        let allResults = this.convertEmployeeData(doctors);
        
        // Also try helpdesk search
        this.adminService.getHelpDeskByName(this.searchName).subscribe({
          next: (helpdesk: Employee[]) => {
            console.log('Got helpdesk by name from API:', helpdesk);
            const convertedHelpdesk = this.convertEmployeeData(helpdesk);
            allResults = [...allResults, ...convertedHelpdesk];
            this.allEmployees = allResults;
            this.updateFilteredArrays();
          },
          error: (error: any) => {
            console.log('No helpdesk found, using only doctors');
            this.allEmployees = allResults;
            this.updateFilteredArrays();
          }
        });
      },
      error: (error: any) => {
        console.error('Error filtering by name:', error);
        this.allEmployees = [];
        this.updateFilteredArrays();
      }
    });
  }

  private filterById(): void {
    console.log('Filtering by ID:', this.searchId);
    const id = parseInt(this.searchId);
    
    // Search locally first
    const filtered = this.allEmployees.filter(emp => emp.userId === id);
    if (filtered.length > 0) {
      console.log('Found employee locally by ID:', filtered);
      this.allEmployees = filtered;
      this.updateFilteredArrays();
      return;
    }
    
    // If not found locally, try API search
    this.adminService.getDoctorsById(id).subscribe({
      next: (doctors: Employee[]) => {
        console.log('Got doctors by ID from API:', doctors);
        let allResults = this.convertEmployeeData(doctors);
        
        // Also try helpdesk search
        this.adminService.getHelpDeskById(id).subscribe({
          next: (helpdesk: Employee[]) => {
            console.log('Got helpdesk by ID from API:', helpdesk);
            const convertedHelpdesk = this.convertEmployeeData(helpdesk);
            allResults = [...allResults, ...convertedHelpdesk];
            this.allEmployees = allResults;
            this.updateFilteredArrays();
          },
          error: (error: any) => {
            console.log('No helpdesk found, using only doctors');
            this.allEmployees = allResults;
            this.updateFilteredArrays();
          }
        });
      },
      error: (error: any) => {
        console.error('Error filtering by ID:', error);
        this.allEmployees = [];
        this.updateFilteredArrays();
      }
    });
  }

  clearFilters(): void {
    console.log('=== CLEARING FILTERS ===');
    console.log('Before clear - current employees:', this.allEmployees.length);
    console.log('Original employees available:', this.originalAllEmployees.length);
    
    this.selectedSpecialization = '';
    this.searchName = '';
    this.searchId = '';
    this.isFilterActive = false;
    
    // Restore original data
    if (this.originalAllEmployees.length > 0) {
      this.allEmployees = [...this.originalAllEmployees];
      this.doctorEmployees = this.allEmployees.filter(emp => emp.role && emp.role.toLowerCase() === 'doctor');
      this.helpDeskEmployees = this.allEmployees.filter(emp => emp.role && (emp.role.toLowerCase() === 'helpdesk' || emp.role.toLowerCase() === 'help desk'));
      console.log('Restored:', {
        all: this.allEmployees.length,
        doctors: this.doctorEmployees.length,
        helpdesk: this.helpDeskEmployees.length
      });
    } else {
      console.log('No original data found, reloading from API...');
      this.loadAllEmployees();
    }
  }

  private convertEmployeeData(employees: Employee[]): Employee[] {
    return employees.map(emp => {
      const convertedApproval = this.convertApprovalStatus(emp.isApprovedByAdmin);
      const convertedShift = this.convertShiftValue(emp.shift);
      
      // Determine role based on API response and data content
      let role = emp.role;
      if (!role) {
        if (emp.specialization || emp.experienceYears || emp.consultantFees) {
          // Has doctor-specific properties
          role = 'Doctor';
        } else if (emp.languages) {
          // Has helpdesk-specific properties
          role = 'HelpDesk';
        } else {
          // Default fallback - most filtered APIs are for doctors
          role = 'Doctor';
        }
      }

      // Ensure required properties exist with defaults for undefined values
      const convertedEmployee = {
        ...emp,
        role: role,
        isApprovedByAdmin: convertedApproval !== undefined ? convertedApproval : 1, // Default to Approved for filtered data
        shift: convertedShift !== undefined ? convertedShift : 0, // Default to Morning shift
        specialization: emp.specialization || 'General Medicine',
        qualification: emp.qualification || 'MBBS',
        experienceYears: emp.experienceYears || 1
      };
      
      console.log(`Converting employee ${emp.userName}:`, {
        originalApproval: emp.isApprovedByAdmin,
        convertedApproval: convertedApproval,
        finalApproval: convertedEmployee.isApprovedByAdmin,
        originalShift: emp.shift,
        convertedShift: convertedShift,
        finalShift: convertedEmployee.shift,
        originalRole: emp.role,
        finalRole: convertedEmployee.role,
        specialization: convertedEmployee.specialization,
        hasAllRequiredProperties: !!(convertedEmployee.role && convertedEmployee.isApprovedByAdmin !== undefined)
      });

      return convertedEmployee;
    });
  }

  getSpecializationDisplayName(specialization: string): string {
    return specialization.replace('_', ' ');
  }

  private updateFilteredArrays(): void {
    this.doctorEmployees = this.allEmployees.filter(emp => 
      emp.role && emp.role.toLowerCase() === 'doctor'
    );
    this.helpDeskEmployees = this.allEmployees.filter(emp => 
      emp.role && (emp.role.toLowerCase() === 'helpdesk' || emp.role.toLowerCase() === 'help desk')
    );
    console.log('Updated filtered arrays:', {
      all: this.allEmployees.length,
      doctors: this.doctorEmployees.length,
      helpdesk: this.helpDeskEmployees.length
    });
  }

  private loadDoctorEmployees(): void {
    console.log('Loading doctor employees...');
    this.adminService.getAllDoctors().subscribe({
      next: (employees: Employee[]) => {
        console.log('Doctors loaded:', employees);
        this.doctorEmployees = employees;
      },
      error: (error: any) => {
        console.error('Error loading doctors:', error);
        if (error.status === 401) {
          console.log('Authentication failed, redirecting to login...');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_data');
          this.router.navigate(['/login']);
          return;
        }
        this.doctorEmployees = [];
      }
    });
  }

  private loadHelpDeskEmployees(): void {
    console.log('Loading helpdesk employees...');
    this.adminService.getAllHelpDesk().subscribe({
      next: (employees: Employee[]) => {
        console.log('HelpDesk employees loaded:', employees);
        this.helpDeskEmployees = employees;
      },
      error: (error: any) => {
        console.error('Error loading helpdesk employees:', error);
        if (error.status === 401) {
          console.log('Authentication failed, redirecting to login...');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user_data');
          this.router.navigate(['/login']);
          return;
        }
        this.helpDeskEmployees = [];
      }
    });
  }

  private loadTodayAppointments(): void {
    this.adminService.getTodayAppointments().subscribe({
      next: (appointments: Appointment[]) => {
        this.todayAppointments = appointments;
      },
      error: (error: any) => {
        this.todayAppointments = [];
      }
    });
  }

  private loadTodayAppointmentsCount(): void {
    this.adminService.getTodayAppointmentsCount().subscribe({
      next: (data: any) => {
        this.todayAppointmentCount = data.count || 0;
      },
      error: (error: any) => {
        this.todayAppointmentCount = 0;
      }
    });
  }

  // Tab switching methods
  switchTab(tab: 'employees' | 'appointments' | 'financial' | 'patients'): void {
    this.currentTab = tab;
    if (tab === 'financial') {
      this.loadFinancialData();
    }
  }

  switchEmployeeTab(tab: 'pending' | 'all' | 'notApproved' | 'shiftNotAllocated' | 'shifts' | 'rejected'): void {
    this.currentEmployeeTab = tab as any; // Allow extended types
    this.selectedEmployee = null;
    this.loadEmployeeData();
  }

  switchEmployeeSubTab(subTab: 'All' | 'Doctor' | 'HelpDesk'): void {
    this.allEmployeesSubTab = subTab;
  }

  showAllEmployees(): void {
    this.switchEmployeeTab('all');
    this.loadAllEmployees();
    this.loadDoctorEmployees();
    this.loadHelpDeskEmployees();
  }

  switchAppointmentTab(tab: 'today' | 'analytics'): void {
    this.currentAppointmentTab = tab;
    
    if (tab === 'analytics') {
      // Load current counts when switching to analytics
      this.loadAnalyticsCounts();
      // Clear previous search results
      this.searchResults = [];

    }
  }



  private loadAnalyticsCounts(): void {
    // Load count for selected date
    if (this.selectedDate) {
      this.adminService.getAppointmentCountByDate(this.selectedDate).subscribe({
        next: (data: any) => {
          this.selectedDateCount = data.count || 0;
        },
        error: (error: any) => {
          this.selectedDateCount = 0;
        }
      });
    }

    // Load count for selected month
    if (this.selectedMonth && this.selectedYear) {
      this.adminService.getAppointmentCountByMonth(this.selectedMonth, this.selectedYear).subscribe({
        next: (data: any) => {
          this.selectedMonthCount = data.count || 0;
        },
        error: (error: any) => {
          this.selectedMonthCount = 0;
        }
      });
    }

    // Load count for selected year
    if (this.selectedYear) {
      this.adminService.getAppointmentCountByYear(this.selectedYear).subscribe({
        next: (data: any) => {
          this.selectedYearCount = data.count || 0;
        },
        error: (error: any) => {
          this.selectedYearCount = 0;
        }
      });
    }
  }

  // Employee methods
  getCurrentEmployees(): Employee[] {
    switch (this.currentEmployeeTab) {
      case 'pending':
        return this.pendingEmployees;
      case 'all':
        switch (this.allEmployeesSubTab) {
          case 'All':
            return this.allEmployees;
          case 'Doctor':
            return this.doctorEmployees;
          case 'HelpDesk':
            return this.helpDeskEmployees;
          default:
            return this.allEmployees;
        }
      case 'notApproved':
        return this.notApprovedEmployees;
      case 'shiftNotAllocated':
        return this.shiftNotAllocatedEmployees;
      default:
        return [];
    }
  }

  // Employee approval method
  approveEmployee(employee: Employee): void {
    if (!employee.userId) return;
    
    this.isProcessing = true;
    this.adminService.approveEmployee(employee.userId, AdminApproval.Approved).subscribe({
      next: (response: string) => {
        this.isProcessing = false;
        this.message = 'Employee approved successfully';
        this.messageType = 'success';
        this.loadDashboardData(); // Refresh data
        setTimeout(() => {
          this.message = '';
          this.messageType = '';
        }, 3000);
      },
      error: (error: any) => {
        this.isProcessing = false;
        this.message = 'Failed to approve employee';
        this.messageType = 'error';
        setTimeout(() => {
          this.message = '';
          this.messageType = '';
        }, 3000);
      }
    });
  }

  // Employee rejection method
  rejectEmployee(employee: Employee): void {
    if (!employee.userId) return;
    
    this.isProcessing = true;
    this.adminService.approveEmployee(employee.userId, AdminApproval.NotApproved).subscribe({
      next: (response: string) => {
        this.isProcessing = false;
        this.message = 'Employee rejected successfully';
        this.messageType = 'success';
        this.loadDashboardData(); // Refresh data
        setTimeout(() => {
          this.message = '';
          this.messageType = '';
        }, 3000);
      },
      error: (error: any) => {
        this.isProcessing = false;
        this.message = 'Failed to reject employee';
        this.messageType = 'error';
        setTimeout(() => {
          this.message = '';
          this.messageType = '';
        }, 3000);
      }
    });
  }

  // Shift allocation method
  allocateShift(employee: Employee): void {
    console.log('allocateShift called with employee:', employee);
    console.log('Employee userId:', employee.userId, 'type:', typeof employee.userId);
    console.log('Current tempShiftSelections:', this.tempShiftSelections);
    console.log('Temp shift for this employee:', this.tempShiftSelections[employee.userId]);
    
    if (!employee.userId) {
      console.log('Cannot allocate shift: Employee userId is missing');
      this.message = 'Error: Employee ID is missing';
      this.messageType = 'error';
      return;
    }
    
    if (this.tempShiftSelections[employee.userId] === undefined) {
      console.log('Cannot allocate shift: No temp shift selection found for employee', employee.userId);
      this.message = 'Error: Please select a shift first';
      this.messageType = 'error';
      return;
    }
    
    const shiftTime = this.tempShiftSelections[employee.userId];
    console.log('Allocating shift:', { 
      employeeId: employee.userId, 
      employeeName: employee.userName, 
      shiftTime, 
      shiftName: this.getShiftText(shiftTime) 
    });
    this.isProcessing = true;
    
    this.adminService.allocateShift(employee.userId, shiftTime).subscribe({
      next: (response: string) => {
        console.log('Shift allocation successful:', response);
        this.isProcessing = false;
        this.message = `Shift allocated to ${employee.userName} successfully`;
        this.messageType = 'success';
        this.loadDashboardData(); // Refresh data
        delete this.tempShiftSelections[employee.userId];
        console.log('Data refresh initiated');
        setTimeout(() => {
          this.message = '';
          this.messageType = '';
        }, 3000);
      },
      error: (error: any) => {
        console.error('Shift allocation failed:', error);
        this.isProcessing = false;
        this.message = `Failed to allocate shift: ${error.message || 'Unknown error'}`;
        this.messageType = 'error';
        setTimeout(() => {
          this.message = '';
          this.messageType = '';
        }, 3000);
      }
    });
  }

  // Shift allocation methods
  onShiftChange(employee: Employee, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const shiftValue = target.value;
    
    if (shiftValue && shiftValue !== '0') {
      // Store the temporary selection
      this.tempShiftSelections[employee.userId] = parseInt(shiftValue);
    }
  }

  confirmShiftAllocation(employee: Employee): void {
    const tempShift = this.tempShiftSelections[employee.userId];
    if (tempShift) {
      this.allocateShiftByNumber(employee.userId, tempShift);
    }
  }

  allocateShiftByNumber(employeeId: number, shiftNumber: number): void {
    // Convert number to ShiftTime enum
    let shiftTime: ShiftTime;
    
    switch (shiftNumber) {
      case 1:
        shiftTime = ShiftTime.Morning;
        break;
      case 2:
        shiftTime = ShiftTime.Afternoon;
        break;
      case 3:
        shiftTime = ShiftTime.Night;
        break;
      default:
        return;
    }

    // Find employee to validate
    const employee = this.shiftNotAllocatedEmployees.find(emp => emp.userId === employeeId);
    if (employee) {
      this.allocateShift(employee);
    }
  }

  // Utility methods for data mapping
  private getEmployeeShiftValue(employee: any): any {
    // Try different possible property names that backend might use
    return employee.shift ?? 
           employee.shiftTime ?? 
           employee.shiftId ?? 
           employee.workShift ?? 
           employee.timeSlot ?? 
           null;
  }

  private getEmployeeApprovalValue(employee: any): any {
    // Try different possible property names that backend might use
    return employee.isApprovedByAdmin ?? 
           employee.isApproved ?? 
           employee.approved ?? 
           employee.status ?? 
           employee.approvalStatus ?? 
           null;
  }

  getShiftText(shift: ShiftTime | any): string {
    // Handle null/undefined/empty string
    if (shift === null || shift === undefined || shift === '' || shift === 'null' || shift === 'undefined') {
      return 'Not Allocated';
    }
    
    // Handle string values
    if (typeof shift === 'string') {
      const lowerShift = shift.toLowerCase().trim();
      
      // Direct string matches (as your backend sends them)
      if (lowerShift === 'morning') return 'Morning';
      if (lowerShift === 'afternoon') return 'Afternoon';
      if (lowerShift === 'evening') return 'Afternoon'; // Evening counts as Afternoon
      if (lowerShift === 'night') return 'Night';
      if (lowerShift === 'not allocated' || lowerShift === 'notallocated') return 'Not Allocated';
      
      // Partial matches for flexibility
      if (lowerShift.includes('morning') || lowerShift === '0') return 'Morning';
      if (lowerShift.includes('afternoon') || lowerShift.includes('evening') || lowerShift === '1') return 'Afternoon';
      if (lowerShift.includes('night') || lowerShift === '2') return 'Night';
      
      // Try parsing as number
      const parsed = parseInt(shift);
      if (!isNaN(parsed)) {
        return this.getShiftText(parsed);
      }
    }
    
    // Handle numeric values
    const shiftValue = typeof shift === 'string' ? parseInt(shift) : shift;
    
    switch (shiftValue) {
      case ShiftTime.Morning:
      case 0:
        return 'Morning';
      case ShiftTime.Afternoon:
      case 1:
        return 'Afternoon';
      case ShiftTime.Night:
      case 2:
        return 'Night';
      case ShiftTime.NotAllocated:
      case 3:
      default:
        return 'Not Allocated';
    }
  }

  getShiftName(shift: ShiftTime): string {
    // Debug logging
    console.log('getShiftName called with:', shift, 'type:', typeof shift);
    return this.getShiftText(shift);
  }

  getShiftClass(shift: ShiftTime | any): string {
    // Use the same robust logic as getShiftText
    const shiftText = this.getShiftText(shift);
    
    switch (shiftText) {
      case 'Morning':
        return 'shift-morning';
      case 'Afternoon':
        return 'shift-afternoon';
      case 'Night':
        return 'shift-night';
      default:
        return 'shift-none';
    }
  }

  getShiftTextByNumber(shiftNumber: number): string {
    switch (shiftNumber) {
      case 1:
        return 'Morning';
      case 2:
        return 'Afternoon';
      case 3:
        return 'Night';
      default:
        return 'Unknown';
    }
  }

  getApprovalText(approval: AdminApproval | any): string {
    
    // Handle null/undefined
    if (approval === null || approval === undefined) {
      return 'Pending';
    }
    
    // Handle string values
    if (typeof approval === 'string') {
      const lowerApproval = approval.toLowerCase();
      if (lowerApproval.includes('approved') || lowerApproval === 'true' || lowerApproval === '1') return 'Active';
      if (lowerApproval.includes('rejected') || lowerApproval.includes('notapproved') || lowerApproval === '2') return 'Inactive';
      if (lowerApproval.includes('pending') || lowerApproval === 'false' || lowerApproval === '0') return 'Pending';
      
      // Try parsing as number
      const parsed = parseInt(approval);
      if (!isNaN(parsed)) {
        return this.getApprovalText(parsed);
      }
    }
    
    // Handle boolean values
    if (typeof approval === 'boolean') {
      return approval ? 'Active' : 'Pending';
    }
    
    // Handle numeric values
    const approvalValue = typeof approval === 'string' ? parseInt(approval) : approval;
    
    switch (approvalValue) {
      case AdminApproval.Approved:
      case 1:
      case true:
        return 'Active';
      case AdminApproval.NotApproved:
      case 2:
        return 'Inactive';
      case AdminApproval.Pending:
      case 0:
      case false:
      default:
        return 'Pending';
    }
  }

  getApprovalClass(approval: AdminApproval | any): string {
    // Use the same robust logic as getApprovalText
    const approvalText = this.getApprovalText(approval);
    
    switch (approvalText) {
      case 'Active':
        return 'active';
      case 'Inactive':
        return 'inactive';
      default:
        return 'pending';
    }
  }

  getAppointmentStatusClass(status: string): string {
    if (!status) return '';
    
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'confirmed' || lowerStatus === 'scheduled') {
      return 'confirmed';
    } else if (lowerStatus === 'pending') {
      return 'pending';
    } else if (lowerStatus === 'cancelled') {
      return 'cancelled';
    }
    return '';
  }

  viewAppointmentDetails(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showAppointmentDetailsModal = true;
    
    // Auto-load payment details for completed appointments
    if (appointment.appointmentStatus === 'Completed') {
      this.loadPaymentForAppointment(appointment);
    }
  }

  closeAppointmentDetailsModal(): void {
    this.showAppointmentDetailsModal = false;
    this.selectedAppointment = null;
  }





  // Missing method - clearMessage
  clearMessage(): void {
    this.message = '';
    this.messageType = '';
  }

  // Missing method - toggleEmployeeViewMode with parameter
  toggleEmployeeViewMode(mode: 'table' | 'grid'): void {
    this.employeeViewMode = mode;
  }

  setEmployeeViewMode(mode: 'table' | 'grid'): void {
    this.employeeViewMode = mode;
  }

  // Fix method signatures with proper typing
  private loadAppointmentCounts(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Load today's count
    this.adminService.getAppointmentCountByDate(todayStr).subscribe({
      next: (data: any) => {
        this.todayAppointmentCount = data.count || 0;
      },
      error: (error: any) => {
        this.todayAppointmentCount = 0;
      }
    });

    // Load current month count
    this.adminService.getAppointmentCountByMonth(currentMonth, currentYear).subscribe({
      next: (data: any) => {
        this.selectedMonthCount = data.count || 0;
      },
      error: (error: any) => {
        this.selectedMonthCount = 0;
      }
    });

    // Load current year count
    this.adminService.getAppointmentCountByYear(currentYear).subscribe({
      next: (data: any) => {
        this.selectedYearCount = data.count || 0;
      },
      error: (error: any) => {
        this.selectedYearCount = 0;
      }
    });
  }

  // Fix search methods with proper typing
  searchAppointmentsByDate(): void {
    if (!this.selectedDate) return;
    
    // Get both count and actual appointments
    this.adminService.getAppointmentCountByDate(this.selectedDate).subscribe({
      next: (data: any) => {
        this.selectedDateCount = data.count || 0;
      },
      error: (error: any) => {
        // Silent error handling
      }
    });

    // Load actual appointments for the selected date
    this.adminService.getAppointmentsByDate(this.selectedDate).subscribe({
      next: (appointments: Appointment[]) => {
        this.searchResults = appointments;
      },
      error: (error: any) => {
        console.error('Error loading appointments by date:', error);
        this.searchResults = [];
      }
    });
  }

  searchAppointmentsByMonth(): void {
    if (!this.selectedMonth || !this.selectedYear) return;
    
    // Get both count and actual appointments
    this.adminService.getAppointmentCountByMonth(this.selectedMonth, this.selectedYear).subscribe({
      next: (data: any) => {
        this.selectedMonthCount = data.count || 0;
      },
      error: (error: any) => {
        // Silent error handling
      }
    });

    // Load actual appointments for the selected month
    this.adminService.getAppointmentsByMonth(this.selectedMonth, this.selectedYear).subscribe({
      next: (appointments: Appointment[]) => {
        this.searchResults = appointments;
      },
      error: (error: any) => {
        console.error('Error loading appointments by month:', error);
        this.searchResults = [];
      }
    });
  }

  searchAppointmentsByYear(): void {
    if (!this.selectedYearOnly) return;
    
    // Get both count and actual appointments
    this.adminService.getAppointmentCountByYear(this.selectedYearOnly).subscribe({
      next: (data: any) => {
        this.selectedYearCount = data.count || 0;
      },
      error: (error: any) => {
        // Silent error handling
      }
    });

    // Load actual appointments for the selected year
    this.adminService.getAppointmentsByYear(this.selectedYearOnly).subscribe({
      next: (appointments: Appointment[]) => {
        this.searchResults = appointments;
      },
      error: (error: any) => {
        console.error('Error loading appointments by year:', error);
        this.searchResults = [];
      }
    });
  }

  // Fix employee tab types
  switchAllEmployeesSubTab(subTab: 'All' | 'Doctor' | 'HelpDesk' | 'all' | 'doctors' | 'helpdesk'): void {
    // Normalize the input
    switch (subTab) {
      case 'all':
        this.allEmployeesSubTab = 'All';
        break;
      case 'doctors':
        this.allEmployeesSubTab = 'Doctor';
        break;
      case 'helpdesk':
        this.allEmployeesSubTab = 'HelpDesk';
        break;
      default:
        this.allEmployeesSubTab = subTab as 'All' | 'Doctor' | 'HelpDesk';
    }
    this.loadEmployeeData();
  }

  showAllEmployeesSubTab(): void {
    this.allEmployeesSubTab = 'All';
  }

  showDoctorEmployees(): void {
    this.allEmployeesSubTab = 'Doctor';
  }

  showHelpDeskEmployees(): void {
    this.allEmployeesSubTab = 'HelpDesk';
  }

  openEmployeeDetails(employee: Employee): void {
    if (this.expandedEmployeeDetails.has(employee.userId)) {
      this.expandedEmployeeDetails.delete(employee.userId);
    } else {
      this.expandedEmployeeDetails.add(employee.userId);
    }
  }

  isEmployeeDetailsExpanded(employee: Employee): boolean {
    return this.expandedEmployeeDetails.has(employee.userId);
  }

  selectEmployee(employee: Employee): void {
    this.selectedEmployee = employee;
  }

  closeEmployeeDetails(): void {
    this.selectedEmployee = null;
  }

  // Utility methods
  getEmployeeStatusClass(status: AdminApproval): string {
    switch (status) {
      case AdminApproval.Approved:
        return 'status-approved';
      case AdminApproval.NotApproved:
        return 'status-rejected';
      case AdminApproval.Pending:
      default:
        return 'status-pending';
    }
  }

  getShiftTimeText(shiftTime: ShiftTime | any): string {
    const shiftValue = typeof shiftTime === 'string' ? parseInt(shiftTime) : shiftTime;
    
    switch (shiftValue) {
      case ShiftTime.Morning:
      case 0:
        return 'Morning (8:00 AM - 4:00 PM)';
      case ShiftTime.Afternoon:
      case 1:
        return 'Evening (4:00 PM - 12:00 AM)';
      case ShiftTime.Night:
      case 2:
        return 'Night (12:00 AM - 8:00 AM)';
      default:
        return 'Not Assigned';
    }
  }

  // Logout method
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Date filter methods
  onDateChange(): void {
    this.loadDateAppointmentCount();
  }

  onYearChange(): void {
    this.loadYearAppointmentCount();
  }

  // Search functionality
  searchAppointments(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.searchResults = [];
      return;
    }
    
    // Search in today's appointments
    this.searchResults = this.todayAppointments.filter(appointment => 
      appointment.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.appointmentDate?.includes(searchTerm)
    );
  }

  // Additional admin-specific methods can be added here
  // All should use this.adminService for API calls

  /**
   * Test method to verify morning button clicks are being detected
   */
  testMorningClick(employee: Employee): void {
    console.log('Morning button clicked for ' + employee.userName + '!');
  }

  // Method to set temporary shift selection
  setTempShift(employeeId: number, shiftTime: number): void {
    console.log('setTempShift called with:', { employeeId, shiftTime });
    console.log('Employee ID type:', typeof employeeId);
    console.log('Shift time type:', typeof shiftTime);
    console.log('Current tempShiftSelections before:', this.tempShiftSelections);
    
    this.tempShiftSelections[employeeId] = shiftTime;
    
    console.log('Updated tempShiftSelections after:', this.tempShiftSelections);
    console.log('Specific selection for employee:', this.tempShiftSelections[employeeId]);
  }

  // Method to allocate the selected shift
  applyTempShift(employee: Employee): void {
    console.log('applyTempShift called for employee:', employee);
    console.log('Employee userId:', employee.userId);
    console.log('Employee userName:', employee.userName);
    console.log('Temp shift for this employee:', this.tempShiftSelections[employee.userId]);
    
    this.allocateShift(employee);
  }

  // Method to delete not approved employee
  deleteEmployee(employee: Employee): void {
    if (!employee.userId) return;
    
    if (confirm('Are you sure you want to delete this employee?')) {
      this.isProcessing = true;
      this.adminService.deleteNotApprovedEmployee(employee.userId).subscribe({
        next: (response: string) => {
          this.isProcessing = false;
          this.message = 'Employee deleted successfully';
          this.messageType = 'success';
          this.loadDashboardData(); // Refresh data
          setTimeout(() => {
            this.message = '';
            this.messageType = '';
          }, 3000);
        },
        error: (error: any) => {
          this.isProcessing = false;
          this.message = 'Failed to delete employee';
          this.messageType = 'error';
          setTimeout(() => {
            this.message = '';
            this.messageType = '';
          }, 3000);
        }
      });
    }
  }

  // Employee details modal methods
  showEmployeeDetails(employee: Employee): void {
    // Convert the selected employee data to ensure consistent display
    this.selectedEmployee = {
      ...employee,
      isApprovedByAdmin: this.convertApprovalStatus(employee.isApprovedByAdmin),
      shift: this.convertShiftValue(employee.shift)
    };
    this.showEmployeeDetailsModal = true;
  }

  closeEmployeeDetailsModal(): void {
    this.showEmployeeDetailsModal = false;
    this.selectedEmployee = null;
  }

  // Check if employee is a doctor
  isDoctor(employee: Employee): boolean {
    return employee.role?.toLowerCase() === 'doctor';
  }

  // Check if employee is helpdesk
  isHelpDesk(employee: Employee): boolean {
    return employee.role?.toLowerCase() === 'helpdesk';
  }

  // Get formatted employee role display
  getEmployeeRoleDisplay(employee: Employee): string {
    switch (employee.role?.toLowerCase()) {
      case 'doctor':
        return 'Doctor';
      case 'helpdesk':
        return 'Help Desk';
      default:
        return employee.role || 'Unknown';
    }
  }

  // Get employee experience text
  getExperienceText(employee: Employee): string {
    if (!employee.experienceYears) return 'Not specified';
    const years = employee.experienceYears;
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  // Get formatted shift text
  getFormattedShift(employee: Employee): string {
    return this.getShiftTimeText(employee.shift);
  }

  // Get approval status text
  getApprovalStatusText(approval: AdminApproval): string {
    switch (approval) {
      case AdminApproval.Approved:
        return 'Approved';
      case AdminApproval.NotApproved:
        return 'Not Approved';
      case AdminApproval.Pending:
      default:
        return 'Pending';
    }
  }

  // Convenience methods for table/grid that handle property name variations
  getEmployeeShiftText(employee: any): string {
    const shiftValue = this.getEmployeeShiftValue(employee);
    return this.getShiftText(shiftValue);
  }

  getEmployeeShiftClass(employee: any): string {
    const shiftValue = this.getEmployeeShiftValue(employee);
    return this.getShiftClass(shiftValue);
  }

  getEmployeeApprovalText(employee: any): string {
    const approvalValue = this.getEmployeeApprovalValue(employee);
    return this.getApprovalText(approvalValue);
  }

  getEmployeeApprovalClass(employee: any): string {
    const approvalValue = this.getEmployeeApprovalValue(employee);
    return this.getApprovalClass(approvalValue);
  }

  // Financial Analytics Methods
  loadFinancialData(): void {
    console.log('Loading financial data from real payment APIs...');
    this.loadDailyEarnings();
    this.loadMonthlyEarnings();
    this.loadYearlyEarnings();
  }

  loadDailyEarnings(): void {
    this.paymentService.getEarningsByDay(this.selectedEarningsDate).subscribe({
      next: (data: {totalEarnings: number}) => {
        this.dailyEarnings = data.totalEarnings || 0;
        console.log(`Daily earnings for ${this.selectedEarningsDate}: $${this.dailyEarnings}`);
      },
      error: (error: any) => {
        console.error('Error loading daily earnings from real API:', error);
        this.dailyEarnings = 0; // Show 0 instead of demo data
        this.showMessage('Failed to load daily earnings. Please check if payment data exists.', 'error');
      }
    });
  }

  loadMonthlyEarnings(): void {
    this.paymentService.getEarningsByMonth(this.selectedEarningsYear, this.selectedEarningsMonth).subscribe({
      next: (data: {totalEarnings: number}) => {
        this.monthlyEarnings = data.totalEarnings || 0;
        console.log(`Monthly earnings for ${this.selectedEarningsMonth}/${this.selectedEarningsYear}: $${this.monthlyEarnings}`);
      },
      error: (error: any) => {
        console.error('Error loading monthly earnings from real API:', error);
        this.monthlyEarnings = 0; // Show 0 instead of demo data
        this.showMessage('Failed to load monthly earnings. Please check if payment data exists.', 'error');
      }
    });
  }

  loadYearlyEarnings(): void {
    this.paymentService.getEarningsByYear(this.selectedEarningsYear).subscribe({
      next: (data: {totalEarnings: number}) => {
        this.yearlyEarnings = data.totalEarnings || 0;
        console.log(`Yearly earnings for ${this.selectedEarningsYear}: $${this.yearlyEarnings}`);
      },
      error: (error: any) => {
        console.error('Error loading yearly earnings from real API:', error);
        this.yearlyEarnings = 0; // Show 0 instead of demo data
        this.showMessage('Failed to load yearly earnings. Please check if payment data exists.', 'error');
      }
    });
  }

  onEarningsDateChange(): void {
    this.loadDailyEarnings();
  }

  onEarningsMonthChange(): void {
    this.loadMonthlyEarnings();
  }

  onEarningsYearChange(): void {
    this.loadMonthlyEarnings();
    this.loadYearlyEarnings();
  }



  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  }

  // ============================================================================
  // PATIENT MANAGEMENT METHODS
  // ============================================================================

  loadAllPatients(): void {
    console.log('Loading all patients...');
    
    // Debug authentication state
    const token = this.authService.getToken();
    const currentUser = this.authService.getCurrentUserSnapshot();
    console.log('Auth state before patient API call:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      userRole: currentUser?.role,
      isAuthenticated: this.authService.isAuthenticated()
    });
    
    this.adminService.getAllPatients().subscribe({
      next: (patients: Patient[]) => {
        console.log('Patients loaded successfully:', patients.length);
        this.allPatients = patients;
        this.originalAllPatients = [...patients];
      },
      error: (error: any) => {
        console.error('Error loading patients:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        if (error.status === 401) {
          console.error('401 Unauthorized - Token may be expired or invalid');
          console.error('Current token:', this.authService.getToken() ? 'EXISTS' : 'MISSING');
          
          // Log authentication issue for debugging
          console.log('Authentication appears to be invalid. User may need to re-login.');
        }
        
        this.allPatients = [];
        this.originalAllPatients = [];
      }
    });
  }

  loadPatientCount(): void {
    console.log('Loading patient count...');
    
    // Debug authentication state
    const token = this.authService.getToken();
    console.log('Token status for patient count:', !!token);
    
    this.adminService.getPatientCount().subscribe({
      next: (data: {count: number}) => {
        this.totalPatientsCount = data.count || 0;
        console.log('Patient count loaded:', this.totalPatientsCount);
      },
      error: (error: any) => {
        console.error('Error loading patient count:', error);
        console.error('Patient count error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        if (error.status === 401) {
          console.error('401 Unauthorized for patient count - checking auth...');
          const currentToken = this.authService.getToken();
          const currentUser = this.authService.getCurrentUserSnapshot();
          console.error('Debug info:', {
            hasToken: !!currentToken,
            userRole: currentUser?.role,
            tokenPreview: currentToken ? currentToken.substring(0, 20) + '...' : 'No token'
          });
        }
        
        this.totalPatientsCount = 0;
      }
    });
  }

  // Patient Filtering Methods
  applyPatientFilters(): void {
    console.log('Applying patient filters:', {
      patientSearchName: this.patientSearchName,
      patientSearchId: this.patientSearchId
    });
    this.isPatientFilterActive = true;

    if (this.patientSearchName) {
      this.filterPatientsByName();
    } else if (this.patientSearchId) {
      this.filterPatientsById();
    } else {
      this.loadAllPatients();
    }
  }

  private filterPatientsByName(): void {
    console.log('Filtering patients by name:', this.patientSearchName);
    
    // Try local filtering first
    const localFiltered = this.originalAllPatients.filter(patient => 
      patient.userName && patient.userName.toLowerCase().includes(this.patientSearchName.toLowerCase())
    );

    if (localFiltered.length > 0) {
      console.log('Local filter results:', localFiltered.length, 'patients');
      this.allPatients = localFiltered;
    } else {
      // Try API if no local results
      console.log('No local results, trying API...');
      this.adminService.getPatientsByName(this.patientSearchName).subscribe({
        next: (patients: Patient[]) => {
          console.log('API returned patients by name:', patients);
          this.allPatients = patients;
        },
        error: (error: any) => {
          console.error('Error filtering patients by name:', error);
          this.allPatients = [];
        }
      });
    }
  }

  private filterPatientsById(): void {
    console.log('Filtering patients by ID:', this.patientSearchId);
    const id = parseInt(this.patientSearchId);
    
    // Try local filtering first
    const localFiltered = this.originalAllPatients.filter(patient => 
      patient.userId === id
    );

    if (localFiltered.length > 0) {
      console.log('Local filter results:', localFiltered.length, 'patients');
      this.allPatients = localFiltered;
    } else {
      // Try API if no local results
      console.log('No local results, trying API...');
      this.adminService.getPatientsById(id).subscribe({
        next: (patients: Patient[]) => {
          console.log('API returned patients by ID:', patients);
          this.allPatients = patients;
        },
        error: (error: any) => {
          console.error('Error filtering patients by ID:', error);
          this.allPatients = [];
        }
      });
    }
  }

  clearPatientFilters(): void {
    console.log('Clearing patient filters...');
    this.patientSearchName = '';
    this.patientSearchId = '';
    this.isPatientFilterActive = false;
    
    // Restore original data
    if (this.originalAllPatients.length > 0) {
      this.allPatients = [...this.originalAllPatients];
      console.log('Restored original patients:', this.allPatients.length);
    } else {
      // If no original data, reload from API
      this.loadAllPatients();
    }
  }

  showPatientDetails(patient: Patient): void {
    console.log('Showing patient details for:', patient.userName);
    this.selectedPatient = patient;
    this.showPatientDetailsModal = true;
  }

  closePatientDetailsModal(): void {
    this.showPatientDetailsModal = false;
    this.selectedPatient = null;
  }

  trackByPatientId(index: number, patient: Patient): number {
    return patient.userId;
  }

  // ============================================================================
  // FINANCIAL SEARCH PROPERTIES AND METHODS
  // ============================================================================

  // Appointment search filters
  appointmentStartDate: string = '';
  appointmentEndDate: string = '';
  selectedAppointmentStatus: string = '';
  appointmentPatientName: string = '';
  appointmentDoctorName: string = '';

  searchAppointmentsAdvanced(): void {
    console.log('Advanced appointment search...');
    
    // Start with all appointments or get them from service
    this.adminService.getTodayAppointments().subscribe({
      next: (appointments: any[]) => {
        console.log('All appointments retrieved:', appointments);
        
        let filtered = appointments;
        
        // Apply date range filter
        if (this.appointmentStartDate) {
          filtered = filtered.filter((a: any) => new Date(a.appointmentDate) >= new Date(this.appointmentStartDate));
        }
        
        if (this.appointmentEndDate) {
          filtered = filtered.filter((a: any) => new Date(a.appointmentDate) <= new Date(this.appointmentEndDate));
        }
        
        // Apply status filter
        if (this.selectedAppointmentStatus) {
          filtered = filtered.filter((a: any) => a.appointmentStatus === this.selectedAppointmentStatus);
        }
        
        // Apply patient name filter
        if (this.appointmentPatientName) {
          filtered = filtered.filter((a: any) => 
            a.patientName?.toLowerCase().includes(this.appointmentPatientName.toLowerCase())
          );
        }
        
        // Apply doctor name filter
        if (this.appointmentDoctorName) {
          filtered = filtered.filter((a: any) => 
            a.doctorName?.toLowerCase().includes(this.appointmentDoctorName.toLowerCase())
          );
        }
        
        this.searchResults = filtered;
        
        // Load payment info for completed appointments
        this.loadPaymentInfoForAppointments();
        
        console.log('Filtered appointments:', this.searchResults.length);
      },
      error: (error: any) => {
        console.error('Error searching appointments:', error);
        this.searchResults = [];
      }
    });
  }

  clearAppointmentFilters(): void {
    console.log('Clearing appointment filters...');
    this.appointmentStartDate = '';
    this.appointmentEndDate = '';
    this.selectedAppointmentStatus = '';
    this.appointmentPatientName = '';
    this.appointmentDoctorName = '';
    this.searchResults = [];
  }

  loadPaymentInfoForAppointments(): void {
    console.log('Loading payment info for completed appointments...');
    
    const completedAppointments = this.searchResults.filter((a: any) => a.appointmentStatus === 'Completed');
    
    completedAppointments.forEach((appointment: any) => {
      this.paymentService.getPaymentsByAppointment(appointment.appointmentId).subscribe({
        next: (payments: any[]) => {
          if (payments && payments.length > 0) {
            // Take the latest payment
            appointment.paymentInfo = payments[payments.length - 1];
            console.log(`Payment loaded for appointment ${appointment.appointmentId}:`, appointment.paymentInfo);
          }
        },
        error: (error: any) => {
          console.error(`Error loading payment for appointment ${appointment.appointmentId}:`, error);
        }
      });
    });
  }

  loadPaymentForAppointment(appointment: any): void {
    console.log('Loading payment for appointment:', appointment.appointmentId);
    
    this.paymentService.getPaymentsByAppointment(appointment.appointmentId).subscribe({
      next: (payments: Payment[]) => {
        if (payments && payments.length > 0) {
          appointment.paymentInfo = payments[payments.length - 1];
          console.log('Payment loaded:', appointment.paymentInfo);
        } else {
          console.log('No payment found for this appointment');
        }
      },
      error: (error: any) => {
        console.error('Error loading payment:', error);
      }
    });
  }

  viewPaymentDetails(payment: any): void {
    console.log('Viewing payment details:', payment);
    // You can implement a payment details modal here
    alert(`Payment Details:\nID: ${payment.paymentId}\nTotal: ₹${payment.totalAmount}\nPaid: ₹${payment.paidAmount}\nMethod: ${this.getPaymentMethodName(payment.paymentMethod)}`);
  }

  getPaymentMethodName(method: number): string {
    const methods = ['Cash', 'Card', 'Online', 'Insurance'];
    return methods[method] || 'Unknown';
  }

 

  hasPaymentInfo(appointment: any): boolean {
    return appointment && appointment.paymentInfo;
  }

  getPaymentAmount(appointment: any, type: 'total' | 'paid'): number {
    if (!appointment?.paymentInfo) return 0;
    return type === 'total' ? appointment.paymentInfo.totalAmount : appointment.paymentInfo.paidAmount;
  }

  isPaymentPaid(appointment: any): boolean {
    if (!appointment?.paymentInfo) return false;
    return appointment.paymentInfo.paidAmount >= appointment.paymentInfo.totalAmount;
  }

  getPaymentStatus(appointment: any): string {
    if (!appointment?.paymentInfo) return 'No Payment';
    return this.isPaymentPaid(appointment) ? 'Paid' : 'Pending';
  }

  getPaymentMethodForAppointment(appointment: any): string {
    if (!appointment?.paymentInfo) return 'N/A';
    return this.getPaymentMethodName(appointment.paymentInfo.paymentMethod);
  }

  viewPaymentDetailsForAppointment(appointment: any): void {
    if (appointment?.paymentInfo) {
      this.viewPaymentDetails(appointment.paymentInfo);
    }
  }

  getPaymentDate(appointment: any): string | null {
    return appointment?.paymentInfo?.paymentDate || null;
  }

  // Debug authentication state
  debugAuthState(): void {
    console.log('AUTH DEBUG:');
    console.log('- Is authenticated:', this.authService.isAuthenticated());
    console.log('- Is logged in:', this.authService.isLoggedIn());
    console.log('- Current user:', this.authService.getCurrentUserSnapshot());
    console.log('- Token exists:', !!this.authService.getToken());
    console.log('- LocalStorage authToken:', localStorage.getItem('authToken'));
    console.log('- LocalStorage user_data:', localStorage.getItem('user_data'));
  }

  // Debug method to test authentication state
  debugAuthenticationState(): void {
    console.log('===== AUTHENTICATION DEBUG =====');
    
    const token = this.authService.getToken();
    const currentUser = this.authService.getCurrentUserSnapshot();
    const isLoggedIn = this.authService.isLoggedIn();
    const isAuthenticated = this.authService.isAuthenticated();
    
    console.log('Token Info:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 30) + '...' : 'No token',
      tokenFromLocalStorage: !!localStorage.getItem('authToken'),
      actualTokenFromStorage: localStorage.getItem('authToken') ? localStorage.getItem('authToken')?.substring(0, 30) + '...' : 'No token in authToken key'
    });
    
    console.log('User Info:', {
      currentUser,
      isLoggedIn,
      isAuthenticated,
      userRole: currentUser?.role,
      userEmail: currentUser?.email
    });
    
    console.log('Browser Storage:', {
      authToken: localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING',
      userRole: localStorage.getItem('userRole') ? localStorage.getItem('userRole') : 'MISSING',
      userName: localStorage.getItem('userName') ? localStorage.getItem('userName') : 'MISSING',
      userEmail: localStorage.getItem('userEmail') ? localStorage.getItem('userEmail') : 'MISSING',
      // Legacy checks
      jwtToken: localStorage.getItem('jwt_token') ? 'EXISTS' : 'MISSING',
      userData: localStorage.getItem('user_data') ? 'EXISTS' : 'MISSING'
    });
    
    // Manual token test - make direct HTTP call to verify interceptor
    if (token) {
      console.log('Testing manual API call with explicit headers...');
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
      
      this.http.get('https://my-dotnet-api-gokul-hyewhaeqgba6ebbm.centralindia-01.azurewebsites.net/api/Patient/count', { headers }).subscribe({
        next: (data) => {
          console.log('Manual API call successful:', data);
        },
        error: (error) => {
          console.error('Manual API call failed:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            message: error.message,
            headers: error.headers
          });
        }
      });
    }
    
    // Test a simple API call to see interceptor behavior
    console.log('Testing API call with interceptor...');
    this.adminService.getAllEmployees().subscribe({
      next: (data) => {
        console.log('Test API call successful:', data.length, 'employees');
      },
      error: (error) => {
        console.error('Test API call failed:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
      }
    });
    
    console.log('===== END AUTHENTICATION DEBUG =====');
  }

  // Call this method when filter buttons are clicked to debug the auth issue
  filterBySpecialization(specialization: string): void {
    console.log('Filter by specialization called:', specialization);
    this.debugAuthState(); // Add debug info
    
    this.selectedSpecialization = specialization;
    
    // First try the main endpoint
    this.adminService.getDoctorsBySpecialization(specialization).subscribe({
      next: (employees: Employee[]) => {
        console.log('Got employees by specialization:', employees);
        this.allEmployees = this.convertEmployeeData(employees);
        this.updateFilteredArrays();
      },
      error: (error: any) => {
        console.error('Primary endpoint failed, trying alternative...', error);
        
        // Try alternative endpoint if main one fails
        this.adminService.getDoctorsBySpecializationAlternative(specialization).subscribe({
          next: (employees: Employee[]) => {
            console.log('Got employees from alternative endpoint:', employees);
            this.allEmployees = this.convertEmployeeData(employees);
            this.updateFilteredArrays();
          },
          error: (altError: any) => {
            console.error('Alternative endpoint also failed:', altError);
            
            // Don't use demo data, show proper error
            this.allEmployees = [];
            this.showMessage('Failed to load employee data. Please check backend connectivity.', 'error');
            console.log('No employee data available - showing empty list');
          }
        });
      }
    });
  }

  // Show message method (missing method)
  showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    
    // Auto clear after 3 seconds
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 3000);
  }
} 