import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class About {
  @Output() navigateToAllDoctors = new EventEmitter<string>();

  navigateTo(page: string): void {
    this.navigateToAllDoctors.emit(page);
  }
} 