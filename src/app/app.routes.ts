import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile';
import { AppointmentsComponent } from './appointments/appointments';
import { DoctorsComponent } from './doctors/doctors.component';
import { DoctorDetailComponent } from './doctors/doctor-detail/doctor-detail.component';
import { LoginComponent } from './login/login.component';
import { About } from './about/about.component';
import { Contact } from './contact/contact.component';
import { HelpdeskComponent } from './helpdesk/helpdesk.component';
import { DoctorDashboardComponent } from './doctor-dashboard/doctor-dashboard.component';
import { AdminComponent } from './admin/admin.component';

// Import Guards
import { AuthGuard } from './guards';

export const routes: Routes = [
  // ✅ Public routes (no guards required)
  { path: '', component: HomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'doctors', component: DoctorsComponent },
  { path: 'doctor/:id', component: DoctorDetailComponent },
  
  // 🛡️ Protected routes (require authentication only)
  { 
    path: 'profile', 
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'appointments', 
    component: AppointmentsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'doctor-dashboard', 
    component: DoctorDashboardComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'admin-dashboard', 
    component: AdminComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'admin', 
    component: AdminComponent,
    
  },
  { 
    path: 'helpdesk', 
    component: HelpdeskComponent,
    canActivate: [AuthGuard]
  },
  
  // 🔄 Dashboard redirects (protected)
  { 
    path: 'patient-dashboard', 
    redirectTo: '/appointments', 
    pathMatch: 'full'
  },
  { 
    path: 'helpdesk-dashboard', 
    redirectTo: '/helpdesk', 
    pathMatch: 'full'
  },
  
  // 🔐 Authentication routes (public)
  { path: 'forgot-password', component: LoginComponent },
  { path: 'reset-password', component: LoginComponent },
  { path: 'password-reset', component: LoginComponent }, // For email links from backend
  
  // 🚫 Catch-all route
  { path: '**', redirectTo: '' }
];
