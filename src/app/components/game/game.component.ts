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
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, HeaderComponent, ResultComponent, FormsModule],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements AfterViewInit {
  gameState: 'start' | 'playing' | 'gameover' = 'start';
  difficulty: 'easy' | 'medium' | 'hard' | 'survival' = 'medium';
  difficultySettings = {
    easy: { time: 20 },
    medium: { time: 15 },
    hard: { time: 10 },
    survival: { time: 15 },
  };
  private map: any;
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  countries: Country[] = [];
  currentCountry!: Country;
  options: string[] = [];
  score: number = 0;
  lives: number = 3;
  streak: number = 0;
  bestStreak: number = 0;
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
  maxTime: number = 10;
  correctSound = new Audio('assets/sounds/correct.mp3');
  wrongSound = new Audio('assets/sounds/wrong.mp3');
  levelUpSound = new Audio('assets/sounds/level-up.mp3');

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
    this.lives = 3; // Reset lives
    this.streak = 0; // Reset streak
    // this.timeLeft = 15; // 15 seconds timer for Survival mode
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
    this.timer = null;
    this.gameState = 'gameover';
    this.playSound('levelup');
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
    if (this.gameState !== 'playing') return;

    this.answerSelected = true;
    this.feedbackMessage = `⏱️ Time's up! Correct: ${this.currentCountry.name}`;
    this.feedbackColor = 'red';
    this.showFeedback = true;
    if (this.difficulty === 'survival') {
      this.lives -= 1;
      this.streak = 0;
      if (this.lives === 0) {
        this.endGame();
        return;
      }
    }

    setTimeout(() => {
      if (this.gameState !== 'playing') return;
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
    const settings = this.difficultySettings[this.difficulty];
    this.maxTime = settings.time;
    this.timeLeft = this.maxTime;
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
      this.playSound('correct');
      if ((this.difficulty = 'survival')) {
        this.streak += 1;
        this.streak > this.bestStreak
          ? (this.bestStreak = this.streak)
          : this.bestStreak;
      }
    } else {
      this.feedbackMessage = `❌ Wrong! Correct: ${this.currentCountry.name}`;
      this.feedbackColor = 'red';
      this.lastWasCorrect = false;
      this.playSound('wrong');
      if (this.difficulty === 'survival') {
        this.lives -= 1;
        this.streak = 0;
        if (this.lives === 0) {
          this.endGame();
        }
      }
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

  playSound(type: 'correct' | 'wrong' | 'levelup') {
    const sounds = {
      correct: this.correctSound,
      wrong: this.wrongSound,
      levelup: this.levelUpSound,
    };

    sounds[type].currentTime = 0; // reset if already playing
    sounds[type].play();
  }
}
