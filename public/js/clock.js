/**
 * Módulo do Relógio Digital
 */

export class DigitalClock {
  constructor() {
    this.timeEl = document.getElementById('clock-time');
    this.dateEl = document.getElementById('clock-date');
    this.toggleSecBtn = document.getElementById('toggle-seconds-btn');
    this.toggleFormatBtn = document.getElementById('toggle-format-btn');
    this.badgeEl = document.getElementById('current-period-badge');

    this.showSeconds = true;
    this.is24HourFormat = true;
    this.timerId = null;

    this.init();
  }

  init() {
    this.update();
    this.timerId = setInterval(() => this.update(), 200);

    if (this.toggleSecBtn) {
      this.toggleSecBtn.addEventListener('click', () => {
        this.showSeconds = !this.showSeconds;
        this.toggleSecBtn.classList.toggle('active', this.showSeconds);
      });
    }

    if (this.toggleFormatBtn) {
      this.toggleFormatBtn.addEventListener('click', () => {
        this.is24HourFormat = !this.is24HourFormat;
        this.toggleFormatBtn.classList.toggle('active', !this.is24HourFormat);
        if (this.badgeEl) {
          this.badgeEl.textContent = this.is24HourFormat ? '24H' : '12H';
        }
      });
    }
  }

  update() {
    const now = new Date();
    
    // Formata o Horário
    let hours = now.getHours();
    let period = '';

    if (!this.is24HourFormat) {
      period = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const hrsStr = String(hours).padStart(2, '0');
    const minStr = String(now.getMinutes()).padStart(2, '0');
    const secStr = String(now.getSeconds()).padStart(2, '0');

    if (this.showSeconds) {
      this.timeEl.textContent = `${hrsStr}:${minStr}:${secStr}${period}`;
    } else {
      this.timeEl.textContent = `${hrsStr}:${minStr}${period}`;
    }

    // Formata a Data em Português
    if (this.dateEl) {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      let dateString = now.toLocaleDateString('pt-BR', options);
      // Capitaliza a primeira letra do dia da semana
      dateString = dateString.charAt(0).toUpperCase() + dateString.slice(1);
      this.dateEl.textContent = dateString;
    }
  }

  getCurrentTimeHHMM() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  }
}
