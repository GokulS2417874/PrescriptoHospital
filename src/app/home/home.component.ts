import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Hero } from '../hero/hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Hero],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateToPage(page: string): void {
    this.router.navigate([`/${page}`]);
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  navigateToDoctors(): void {
    this.router.navigate(['/doctors']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
} 