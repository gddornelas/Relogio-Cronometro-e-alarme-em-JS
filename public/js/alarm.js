/**
 * Módulo de Alarmes com Sincronização em Back-End Node.js & Web Audio API
 */

export class AlarmManager {
  constructor(digitalClock) {
    this.digitalClock = digitalClock;
    this.alarms = [];
    
    // Elementos do DOM
    this.formEl = document.getElementById('form-add-alarm');
    this.timeInput = document.getElementById('alarm-time-input');
    this.labelInput = document.getElementById('alarm-label-input');
    this.alarmsListEl = document.getElementById('alarms-list');
    this.badgeEl = document.getElementById('alarm-count-badge');

    // Elementos do DOM do Modal
    this.modalEl = document.getElementById('alarm-modal');
    this.modalTimeEl = document.getElementById('modal-alarm-time');
    this.modalLabelEl = document.getElementById('modal-alarm-label');
    this.btnSnooze = document.getElementById('btn-alarm-snooze');
    this.btnDismiss = document.getElementById('btn-alarm-dismiss');

    // Gerador de Som por Web Audio
    this.audioCtx = null;
    this.alarmOscillator = null;
    this.isPlayingSound = false;
    this.activeRingingAlarm = null;

    this.init();
  }

  async init() {
    // Ouvinte de envio do formulário
    if (this.formEl) {
      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addAlarm();
      });
    }

    // Ouvinte dos botões do modal
    if (this.btnDismiss) {
      this.btnDismiss.addEventListener('click', () => this.dismissAlarm());
    }

    if (this.btnSnooze) {
      this.btnSnooze.addEventListener('click', () => this.snoozeAlarm(5));
    }

    // Busca alarmes existentes no backend Node.js
    await this.fetchAlarms();

    // Inicia o monitor de alarme em segundo plano (verifica a cada segundo)
    setInterval(() => this.checkAlarms(), 1000);
  }

  async fetchAlarms() {
    try {
      const res = await fetch('/api/alarms');
      const data = await res.json();
      if (data.success) {
        this.alarms = data.alarms;
        this.render();
      }
    } catch (err) {
      console.warn('Usando armazenamento local para alarmes (Backend offline):', err);
      const local = localStorage.getItem('js_clock_alarms');
      if (local) {
        this.alarms = JSON.parse(local);
      }
      this.render();
    }
  }

  async addAlarm() {
    const timeVal = this.timeInput.value;
    const labelVal = this.labelInput.value;

    if (!timeVal) return;

    try {
      const res = await fetch('/api/alarms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: timeVal, label: labelVal })
      });
      const data = await res.json();
      if (data.success) {
        this.alarms.push(data.alarm);
      }
    } catch (err) {
      const fallbackAlarm = {
        id: Date.now().toString(),
        time: timeVal,
        label: labelVal || 'Alarme Sem Título',
        active: true
      };
      this.alarms.push(fallbackAlarm);
      localStorage.setItem('js_clock_alarms', JSON.stringify(this.alarms));
    }

    this.labelInput.value = '';
    this.render();
  }

  async toggleAlarm(id) {
    const alarm = this.alarms.find(a => a.id === id);
    if (!alarm) return;

    alarm.active = !alarm.active;
    this.render();

    try {
      await fetch(`/api/alarms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: alarm.active })
      });
    } catch (err) {
      localStorage.setItem('js_clock_alarms', JSON.stringify(this.alarms));
    }
  }

  async deleteAlarm(id) {
    this.alarms = this.alarms.filter(a => a.id !== id);
    this.render();

    try {
      await fetch(`/api/alarms/${id}`, { method: 'DELETE' });
    } catch (err) {
      localStorage.setItem('js_clock_alarms', JSON.stringify(this.alarms));
    }
  }

  checkAlarms() {
    if (this.isPlayingSound) return; // Já está tocando

    const currentTimeStr = this.digitalClock.getCurrentTimeHHMM();
    const now = new Date();
    const currentSeconds = now.getSeconds();

    // Dispara apenas no segundo 0 de um minuto correspondente
    if (currentSeconds !== 0) return;

    for (const alarm of this.alarms) {
      if (alarm.active && alarm.time === currentTimeStr) {
        this.triggerAlarm(alarm);
        break;
      }
    }
  }

  triggerAlarm(alarm) {
    this.activeRingingAlarm = alarm;
    this.isPlayingSound = true;

    // Exibe o modal
    if (this.modalTimeEl) this.modalTimeEl.textContent = alarm.time;
    if (this.modalLabelEl) this.modalLabelEl.textContent = alarm.label || 'Alarme Programado';
    if (this.modalEl) this.modalEl.classList.remove('hidden');

    // Inicia o Tom de Áudio do Alarme
    this.startAudioSound();
  }

  dismissAlarm() {
    this.stopAudioSound();
    if (this.modalEl) this.modalEl.classList.add('hidden');
    this.isPlayingSound = false;
    this.activeRingingAlarm = null;
  }

  snoozeAlarm(minutes = 5) {
    this.dismissAlarm();

    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const snoozeTime = `${hrs}:${mins}`;

    // Adiciona o alarme adiado
    this.timeInput.value = snoozeTime;
    this.labelInput.value = `(Adiado) ${this.modalLabelEl.textContent}`;
    this.addAlarm();
  }

  startAudioSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      this.audioCtx = new AudioCtx();
      let toneHigh = true;

      this.alarmOscillator = setInterval(() => {
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(toneHigh ? 880 : 587.33, this.audioCtx.currentTime); // Tom A5 / D5
        toneHigh = !toneHigh;

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      }, 400);

    } catch (e) {
      console.warn('Áudio não permitido sem interação do usuário.', e);
    }
  }

  stopAudioSound() {
    if (this.alarmOscillator) {
      clearInterval(this.alarmOscillator);
      this.alarmOscillator = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  render() {
    if (!this.alarmsListEl) return;

    const activeCount = this.alarms.filter(a => a.active).length;
    if (this.badgeEl) {
      this.badgeEl.textContent = `${activeCount} ativo${activeCount !== 1 ? 's' : ''}`;
    }

    if (this.alarms.length === 0) {
      this.alarmsListEl.innerHTML = `<div class="alarms-empty">Nenhum alarme programado.</div>`;
      return;
    }

    this.alarmsListEl.innerHTML = this.alarms.map(a => `
      <div class="alarm-item ${a.active ? 'active' : ''}">
        <div>
          <div class="alarm-item-time">${a.time}</div>
          <div class="alarm-item-label">${a.label}</div>
        </div>
        <div class="alarm-item-actions">
          <label class="switch">
            <input type="checkbox" data-id="${a.id}" class="toggle-alarm-cb" ${a.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="btn-del-alarm" data-id="${a.id}">🗑</button>
        </div>
      </div>
    `).join('');

    // Anexa ouvintes de eventos aos alternadores e botões de exclusão gerados
    this.alarmsListEl.querySelectorAll('.toggle-alarm-cb').forEach(cb => {
      cb.addEventListener('change', (e) => this.toggleAlarm(e.target.dataset.id));
    });

    this.alarmsListEl.querySelectorAll('.btn-del-alarm').forEach(btn => {
      btn.addEventListener('click', (e) => this.deleteAlarm(e.target.dataset.id));
    });
  }
}
