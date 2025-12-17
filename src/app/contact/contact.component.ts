import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class Contact {
  @Output() navigateToAllDoctors = new EventEmitter<string>();

  navigateTo(page: string): void {
    this.navigateToAllDoctors.emit(page);
  }
} 