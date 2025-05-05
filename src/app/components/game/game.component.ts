import * as L from 'leaflet';
import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { ResultComponent } from '../result/result.component';
import confetti from 'canvas-confetti';

interface Country {
  name: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ResultComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements AfterViewInit {
  private map: any;
  countries: Country[] = [
    { name: 'India', lat: 20.5937, lng: 78.9629 },
    { name: 'USA', lat: 37.0902, lng: -95.7129 },
    { name: 'Brazil', lat: -14.235, lng: -51.9253 },
    { name: 'Japan', lat: 36.2048, lng: 138.2529 },
    { name: 'Australia', lat: -25.2744, lng: 133.7751 },
  ];
  currentCountry!: Country;
  options: string[] = [];
  score: number = 0;
  showResult = false;
  resultMessage = '';
  lastWasCorrect = true;
  buttonsDisabled = false;
  feedbackMessage: string = '';
  showFeedback: boolean = false;
  feedbackColor: string = '';

  ngAfterViewInit(): void {
    this.initMap();
    this.startGameRound();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [20, 0], // World center
      zoom: 2,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  startGameRound(): void {
    const index = Math.floor(Math.random() * this.countries.length);
    this.currentCountry = this.countries[index];

    // Generate options
    const wrongOptions = this.countries
      .filter((c) => c.name !== this.currentCountry.name)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((c) => c.name);

    this.options = this.shuffle([this.currentCountry.name, ...wrongOptions]);

    // Zoom map
    this.map.setView([this.currentCountry.lat, this.currentCountry.lng], 5);
  }

  triggerCelebration(): void {
    const duration = 1 * 1000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 200);
  }

  checkAnswer(selected: string): void {
    if (this.buttonsDisabled) return;

    this.buttonsDisabled = true;

    if (selected === this.currentCountry.name) {
      this.score += 10;
      this.feedbackMessage = '🎉 Correct!';
      this.feedbackColor = 'green';
      this.triggerCelebration();
    } else {
      this.feedbackMessage = `❌ Wrong! It was ${this.currentCountry.name}`;
      this.feedbackColor = 'red';
    }

    this.showFeedback = true;

    setTimeout(() => {
      this.showFeedback = false;
      this.buttonsDisabled = false;
      this.startGameRound();
    }, 2000);
  }
}
