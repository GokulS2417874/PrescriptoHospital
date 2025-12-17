import { Component, OnInit, HostListener, inject, effect } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { JobCareersComponent } from './job-careers/job-careers.component';
import { AuthService } from './services/auth.service';
import { User } from './models/user.models';
import { Footer } from './footer/footer.component';
import { About } from './about/about.component';
import { Contact } from './contact/contact.component';
import { Hero } from './hero/hero.component';
import { HelpdeskComponent } from './helpdesk/helpdesk.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, JobCareersComponent, Footer, About, Contact, Hero, HelpdeskComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  title = 'Registration';
  
  // Navigation state
  activeView: string = 'home';
  showJobCareersModal = false;
  
  // Authentication state (keep for compatibility)
  isLoggedIn: boolean = false;
  currentUser: User | null = null;
  showProfileDropdown: boolean = false;
  
  // 🚀 Signals-based welcome popup
  showWelcomePopup: boolean = false;
  
  // Image handling
  brokenImages = new Set<string>();
  
  private authSubscription: Subscription = new Subscription();
  public authService = inject(AuthService); // Make public for template access

  constructor(
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateActiveViewFromRoute(event.url);
      // Check auth state after each navigation
      console.log('🧭 Navigation completed to:', event.url);
      setTimeout(() => {
        this.checkAuthState();
      }, 100);
    });
    
    // 🚀 Effect to show welcome popup when user logs in using signals
    effect(() => {
      const isLoggedIn = this.authService.isLoggedInSignal();
      const welcomeMessage = this.authService.welcomeMessage();
      
      if (isLoggedIn && welcomeMessage && !this.showWelcomePopup) {
        this.showWelcomePopup = true;
        console.log('🚀 Showing welcome popup:', welcomeMessage);
        
        // Hide popup after 3 seconds
        setTimeout(() => {
          this.showWelcomePopup = false;
          console.log('🚀 Welcome popup hidden');
        }, 3000);
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.authSubscription = this.authService.getCurrentUser().subscribe(user => {
      console.log('🔄 Auth state changed in AppComponent:', user);
      this.isLoggedIn = !!user;
      this.currentUser = user;
      
      // Note: Welcome popup is now handled by signals effect
      console.log('📱 AppComponent updated - isLoggedIn:', this.isLoggedIn, 'currentUser:', this.currentUser);
    });

    // Also check for existing auth on init
    this.checkAuthState();
  }

  // Manual method to check auth state
  checkAuthState(): void {
    const existingUser = this.authService.getCurrentUserSnapshot();
    if (existingUser) {
      console.log('👤 Found existing user on manual check:', existingUser);
      this.isLoggedIn = true;
      this.currentUser = existingUser;
    } else {
      this.isLoggedIn = this.authService.isLoggedIn();
      console.log('🔐 Auth service says logged in:', this.isLoggedIn);
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Don't close dropdown if clicking inside it
    if (target.closest('.profile-section') || target.closest('.profile-dropdown')) {
      return;
    }
    
    // Close dropdown on outside click
    this.showProfileDropdown = false;
  }

  // Navigation methods
  updateActiveViewFromRoute(url: string): void {
    if (url === '/' || url === '') {
      this.activeView = 'home';
    } else if (url.startsWith('/doctors')) {
      this.activeView = 'all-doctors';
    } else if (url.startsWith('/register')) {
      this.activeView = 'register';
    } else if (url.startsWith('/profile')) {
      this.activeView = 'profile';
    } else if (url.startsWith('/appointments')) {
      this.activeView = 'appointments';
    }
  }

  setActiveView(view: string): void {
    this.activeView = view;
    this.showProfileDropdown = false; // Close profile dropdown
    
    switch (view) {
      case 'home':
        this.router.navigate(['/']);
        break;
      case 'all-doctors':
        this.router.navigate(['/doctors']);
        break;
      case 'register':
        this.router.navigate(['/register']);
        break;
      case 'login':
        this.router.navigate(['/login']);
        break;
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      case 'appointments':
        this.router.navigate(['/appointments']);
        break;
      case 'about':
        this.router.navigate(['/about']);
        break;
      case 'contact':
        this.router.navigate(['/contact']);
        break;
      case 'helpdesk':
        this.router.navigate(['/helpdesk']);
        break;
      case 'doctor-dashboard':
        this.router.navigate(['/doctor-dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      default:
        console.warn(`Unknown view: ${view}`);
        break;
    }
  }

  isCurrentView(view: string): boolean {
    return this.activeView === view;
  }

  // Job careers modal methods
  openJobCareers(): void {
    this.showJobCareersModal = true;
  }

  closeJobCareers(): void {
    this.showJobCareersModal = false;
  }

  // Profile dropdown methods
  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  handleProfileAction(action: string): void {
    this.showProfileDropdown = false;
    
    // Role-based navigation:
    // - Patient: Can access profile and appointments
    // - Admin/Doctor/HelpDesk: Can only access profile (appointments hidden in template)
    switch (action) {
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      case 'appointments':
        this.router.navigate(['/appointments']);
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  // Role-based visibility methods
  isPatient(): boolean {
    return this.authService.isPatient();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'Admin';
  }

  isDoctor(): boolean {
    return this.currentUser?.role === 'Doctor';
  }

  isHelpdesk(): boolean {
    return this.currentUser?.role === 'HelpDesk';
  }

  canSeeJobCareers(): boolean {
    return !this.isLoggedIn || (this.isLoggedIn && !this.isPatient());
  }

  canSeeAdminPanel(): boolean {
    return this.isLoggedIn && this.isAdmin();
  }

  canSeeDoctorDashboard(): boolean {
    return this.isLoggedIn && this.isDoctor();
  }

  canSeeHelpdesk(): boolean {
    return this.isLoggedIn && this.isHelpdesk();
  }

  // Image error handling methods
  isImageBroken(imageUrl: string | undefined): boolean {
    return !imageUrl || this.brokenImages.has(imageUrl);
  }

  markImageAsBroken(imageUrl: string | undefined): void {
    if (imageUrl) {
      this.brokenImages.add(imageUrl);
    }
  }
}