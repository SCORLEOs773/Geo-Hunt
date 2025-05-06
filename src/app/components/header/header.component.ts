import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  @Input() score: number = 0;
  @Input() lives: number = 0;
  @Input() streak: number = 0;
  @Input() difficulty: 'easy' | 'medium' | 'hard' | 'survival' = 'easy';
}
