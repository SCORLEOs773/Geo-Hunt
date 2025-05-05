import * as L from 'leaflet';
import {
  Component,
  AfterViewInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { ResultComponent } from '../result/result.component';
import confetti from 'canvas-confetti';
import { HttpClient } from '@angular/common/http';

interface Country {
  name: string;
  lat: number;
  lng: number;
}

interface CountryAPIResponse {
  name: { common: string };
  latlng: [number, number];
  flags: { png: string };
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ResultComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements AfterViewInit {
  gameState: 'start' | 'playing' | 'gameover' = 'start';
  private map: any;
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  countries: Country[] = [];
  currentCountry!: Country;
  options: string[] = [];
  score: number = 0;
  isLoading: boolean = true;
  answerSelected: boolean = false;
  showResult = false;
  resultMessage = '';
  lastWasCorrect = true;
  buttonsDisabled = false;
  feedbackMessage: string = '';
  showFeedback: boolean = false;
  feedbackColor: string = '';
  timer: any;
  timeLeft: number = 10;
  showTimer: boolean = false;
  roundsPlayed: number = 0;
  maxRounds: number = 10;
  correctAnswers: number = 0;
  startTime!: number;
  fastestTime: number = Infinity;

  ngAfterViewInit(): void {
    this.loadCountries();
  }

  private initMap(): void {
    const initialZoom = 8;
    this.map = L.map('map', {
      center: [20, 0],
      zoom: initialZoom,
      minZoom: initialZoom,
      maxZoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.roundsPlayed = 0;
    this.correctAnswers = 0;
    this.fastestTime = Infinity;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.initMap();
      this.startGameRound();
    });
  }

  endGame(): void {
    clearInterval(this.timer);
    this.gameState = 'gameover';
  }

  loadCountries(): void {
    this.isLoading = true;
    this.http
      .get<CountryAPIResponse[]>('https://restcountries.com/v3.1/all')
      .subscribe(
        (data) => {
          this.countries = data
            .filter((c) => c.latlng && c.latlng.length === 2)
            .map((c) => ({
              name: c.name.common,
              lat: c.latlng[0],
              lng: c.latlng[1],
            }));

          this.isLoading = false;

          // Let Angular render the map div before initializing the map
          setTimeout(() => {
            this.initMap();
            this.startGameRound();
          });
        },
        (error) => {
          console.error('Error loading countries:', error);
          this.isLoading = false;
          this.feedbackMessage =
            '❌ Failed to load countries. Please try again.';
          this.feedbackColor = 'red';
          this.showFeedback = true;
        }
      );
  }

  shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  startTimer(): void {
    clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.handleTimeout();
      }
    }, 1000);
  }

  handleTimeout(): void {
    this.answerSelected = true;
    this.feedbackMessage = `⏱️ Time's up! Correct: ${this.currentCountry.name}`;
    this.feedbackColor = 'red';
    this.showFeedback = true;

    setTimeout(() => {
      this.feedbackMessage = '';
      this.showFeedback = false;
      this.startGameRound();
    }, 2000);
  }

  startGameRound(): void {
    if (this.roundsPlayed >= this.maxRounds) {
      this.endGame();
      return;
    }

    this.roundsPlayed++;
    this.answerSelected = false;
    this.timeLeft = 10;
    this.showTimer = true;

    this.answerSelected = false;
    this.timeLeft = 10;
    this.showTimer = true;

    this.startTime = Date.now();
    this.startTimer();

    const index = Math.floor(Math.random() * this.countries.length);
    this.currentCountry = this.countries[index];

    const wrongOptions = this.countries
      .filter((c) => c.name !== this.currentCountry.name)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((c) => c.name);

    this.options = this.shuffle([this.currentCountry.name, ...wrongOptions]);

    // Zoom to selected country
    this.map.setView([this.currentCountry.lat, this.currentCountry.lng], 10);

    // ⛔ Remove existing circles (avoid stacking overlays)
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.Circle) {
        this.map.removeLayer(layer);
      }
    });

    L.marker([this.currentCountry.lat, this.currentCountry.lng]).addTo(
      this.map
    );

    // // ✅ Add white overlay to hide country label
    // L.circle([this.currentCountry.lat, this.currentCountry.lng], {
    //   radius: 100000,
    //   color: 'white',
    //   fillColor: 'white',
    //   fillOpacity: 0.7,
    //   stroke: false,
    // }).addTo(this.map);
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
    if (this.answerSelected) return;
    this.answerSelected = true;

    const timeTaken = Date.now() - this.startTime;
    if (timeTaken < this.fastestTime) {
      this.fastestTime = timeTaken;
    }

    if (selected === this.currentCountry.name) {
      clearInterval(this.timer);
      this.score += 10;
      this.correctAnswers++;
      this.feedbackMessage = '🎉 Correct!';
      this.triggerCelebration();
      this.feedbackColor = 'green';
      this.lastWasCorrect = true;
    } else {
      this.feedbackMessage = `❌ Wrong! Correct: ${this.currentCountry.name}`;
      this.feedbackColor = 'red';
      this.lastWasCorrect = false;
    }

    this.showFeedback = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.showFeedback = false;
      this.answerSelected = false;
      this.feedbackMessage = '';
      this.cdr.detectChanges();
      this.startGameRound();
    }, 2000);
  }
}
