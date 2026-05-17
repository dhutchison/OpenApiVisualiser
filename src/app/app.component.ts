import { DOCUMENT } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private document = inject(DOCUMENT);

  title = 'OpenAPIVisualiser';
  darkMode = false;

  ngOnInit() {
    const storedPreference = localStorage.getItem('openapi-visualiser-theme');

    if (storedPreference) {
      this.darkMode = storedPreference === 'dark';
    } else {
      this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.applyTheme();
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('openapi-visualiser-theme', this.darkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    this.document.documentElement.classList.toggle('dark-mode', this.darkMode);
  }
}
