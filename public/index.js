//Aplicação Principal - Relógio Digital, Cronômetro e Alarme (Unificado)

//1. MÓDULO DO RELÓGIO DIGITAL
class DigitalClock {
  constructor() {
    this.clockContainer = document.getElementById("clock-display-container");
    this.toggleSecBtn = document.getElementById("toggle-seconds-btn");
    this.toggleFormatBtn = document.getElementById("toggle-format-btn");
    this.badgeEl = document.getElementById("current-period-badge");

    this.tzBtn = document.getElementById("toggle-tz-btn");
    this.tzMenu = document.getElementById("tz-dropdown-menu");
    this.tzListEl = document.getElementById("tz-dropdown-list");

    this.availableTimezones = [
      { id: "local", name: "Horário Local", tz: null },
      { id: "sp", name: "Brasília (GMT-3)", tz: "America/Sao_Paulo" },
      { id: "ny", name: "Nova York (EST)", tz: "America/New_York" },
      { id: "ldn", name: "Londres (GMT/BST)", tz: "Europe/London" },
      { id: "paris", name: "Paris (CET/CEST)", tz: "Europe/Paris" },
      { id: "tokyo", name: "Tóquio (JST)", tz: "Asia/Tokyo" },
      { id: "sydney", name: "Sydney (AEST)", tz: "Australia/Sydney" },
      { id: "dubai", name: "Dubai (GST)", tz: "Asia/Dubai" },
    ];

    const savedTz = localStorage.getItem("js_clock_selected_tz");
    this.selectedTzIds = savedTz ? JSON.parse(savedTz) : ["local"];
    if (!Array.isArray(this.selectedTzIds) || this.selectedTzIds.length === 0) {
      this.selectedTzIds = ["local"];
    }

    this.showSeconds = true;
    this.is24HourFormat = true;
    this.timerId = null;

    this.init();
  }

  init() {
    this.initTzDropdown();
    this.update();
    this.timerId = setInterval(() => this.update(), 200);

    if (this.toggleSecBtn) {
      this.toggleSecBtn.addEventListener("click", () => {
        this.showSeconds = !this.showSeconds;
        this.toggleSecBtn.classList.toggle("active", this.showSeconds);
        this.update();
      });
    }

    if (this.toggleFormatBtn) {
      this.toggleFormatBtn.addEventListener("click", () => {
        this.is24HourFormat = !this.is24HourFormat;
        this.toggleFormatBtn.classList.toggle("active", !this.is24HourFormat);
        if (this.badgeEl) {
          this.badgeEl.textContent = this.is24HourFormat ? "24H" : "12H";
        }
        this.update();
      });
    }
  }

  initTzDropdown() {
    if (!this.tzBtn || !this.tzMenu || !this.tzListEl) return;

    this.renderTzDropdownList();

    this.tzBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.tzMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!this.tzMenu.contains(e.target) && e.target !== this.tzBtn) {
        this.tzMenu.classList.add("hidden");
      }
    });
  }

  renderTzDropdownList() {
    this.tzListEl.innerHTML = this.availableTimezones
      .map(
        (item) => `
      <label class="tz-option">
        <input type="checkbox" value="${item.id}" ${this.selectedTzIds.includes(item.id) ? "checked" : ""}>
        <span>${item.name}</span>
      </label>
    `,
      )
      .join("");

    this.tzListEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          if (!this.selectedTzIds.includes(id)) {
            this.selectedTzIds.push(id);
          }
        } else {
          if (this.selectedTzIds.length > 1) {
            this.selectedTzIds = this.selectedTzIds.filter((tId) => tId !== id);
          } else {
            e.target.checked = true;
            return;
          }
        }
        localStorage.setItem(
          "js_clock_selected_tz",
          JSON.stringify(this.selectedTzIds),
        );
        this.update();
      });
    });
  }

  update() {
    if (!this.clockContainer) return;
    const now = new Date();

    const selectedTzObjects = this.availableTimezones.filter((item) =>
      this.selectedTzIds.includes(item.id),
    );
    const isMulti = selectedTzObjects.length > 1;

    let html = "";
    for (const item of selectedTzObjects) {
      const formatted = this.getFormattedTimeAndDate(now, item.tz);

      html += `
        <div class="clock-card ${isMulti ? "multi" : "single"}">
          ${isMulti ? `<div class="clock-tz-title">${item.name}</div>` : ""}
          <div class="digital-clock-time">${formatted.timeStr}</div>
          <div class="digital-clock-date">${formatted.dateStr}</div>
        </div>
      `;
    }

    this.clockContainer.innerHTML = html;
  }

  getFormattedTimeAndDate(dateObj, timeZone) {
    const optionsTime = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !this.is24HourFormat,
    };
    if (this.showSeconds) {
      optionsTime.second = "2-digit";
    }
    if (timeZone) {
      optionsTime.timeZone = timeZone;
    }

    const timeStr = dateObj.toLocaleTimeString("pt-BR", optionsTime);

    const optionsDate = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    if (timeZone) {
      optionsDate.timeZone = timeZone;
    }
    let dateStr = dateObj.toLocaleDateString("pt-BR", optionsDate);
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    return { timeStr, dateStr };
  }

  getCurrentTimeHHMM() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  }
}

//2. MÓDULO DO CRONÔMETRO

class Stopwatch {
  constructor() {
    // Elementos do DOM
    this.displayEl = document.getElementById("sw-display");
    this.msDisplayEl = document.getElementById("sw-ms-display");
    this.statusLabelEl = document.getElementById("sw-status-label");
    this.btnPrimary = document.getElementById("btn-sw-primary");
    this.btnSecondary = document.getElementById("btn-sw-secondary");
    this.historyListEl = document.getElementById("sw-history-list");
    this.historyCountEl = document.getElementById("history-count");

    // Estados: 'IDLE' (Inativo), 'RUNNING' (Em Execução), 'PAUSED' (Pausado)
    this.state = "IDLE";

    // Dados de temporização
    this.startTime = 0;
    this.elapsedTime = 0; // tempo decorrido em ms
    this.timerInterval = null;

    // Dados do histórico: array de { index, formattedTime, totalMs, diffSeconds }
    this.laps = [];

    this.init();
  }

  init() {
    if (this.btnPrimary) {
      this.btnPrimary.addEventListener("click", () =>
        this.handlePrimaryClick(),
      );
    }

    if (this.btnSecondary) {
      this.btnSecondary.addEventListener("click", () =>
        this.handleSecondaryClick(),
      );
    }

    this.renderButtons();
    this.updateDisplay(0);
  }

  handlePrimaryClick() {
    if (this.state === "IDLE") {
      this.start();
    } else if (this.state === "RUNNING") {
      this.pause();
    } else if (this.state === "PAUSED") {
      this.finish();
    }
  }

  handleSecondaryClick() {
    if (this.state === "RUNNING") {
      this.printLap();
    } else if (this.state === "PAUSED") {
      this.resume();
    }
  }

  start() {
    this.state = "RUNNING";
    this.startTime = Date.now() - this.elapsedTime;

    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.updateDisplay(this.elapsedTime);
    }, 16);

    if (this.statusLabelEl) this.statusLabelEl.textContent = "EM EXECUÇÃO";
    this.renderButtons();
  }

  pause() {
    this.state = "PAUSED";
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    if (this.statusLabelEl) this.statusLabelEl.textContent = "PAUSADO";
    this.renderButtons();
  }

  resume() {
    this.state = "RUNNING";
    this.startTime = Date.now() - this.elapsedTime;

    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.updateDisplay(this.elapsedTime);
    }, 16);

    if (this.statusLabelEl) this.statusLabelEl.textContent = "EM EXECUÇÃO";
    this.renderButtons();
  }

  finish() {
    if (this.laps.length > 0) {
      this.saveSessionToBackend();
    }

    this.state = "IDLE";
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.elapsedTime = 0;
    this.laps = [];

    this.updateDisplay(0);
    this.renderHistory();

    if (this.statusLabelEl) this.statusLabelEl.textContent = "PRONTO";
    this.renderButtons();
  }

  printLap() {
    const currentMs = this.elapsedTime;
    const lapNumber = this.laps.length + 1;

    const previousMs =
      this.laps.length > 0 ? this.laps[this.laps.length - 1].totalMs : 0;
    const diffMs = currentMs - previousMs;
    const diffSeconds = (diffMs / 1000).toFixed(2);

    const formattedTime = this.formatTime(currentMs);

    const lapRecord = {
      index: lapNumber,
      totalMs: currentMs,
      formattedTime: formattedTime,
      diffSeconds: parseFloat(diffSeconds),
    };

    this.laps.push(lapRecord);
    this.renderHistory();
  }

  updateDisplay(ms) {
    const timeObj = this.formatTimeComponents(ms);
    if (this.displayEl) {
      this.displayEl.textContent = `${timeObj.hours}:${timeObj.minutes}:${timeObj.seconds}`;
    }
  }

  formatTimeComponents(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSecs % 3600) / 60)).padStart(
      2,
      "0",
    );
    const seconds = String(totalSecs % 60).padStart(2, "0");
    return { hours, minutes, seconds };
  }

  formatTime(ms) {
    const c = this.formatTimeComponents(ms);
    return `${c.hours}:${c.minutes}:${c.seconds}`;
  }

  renderButtons() {
    const primaryIcon = this.btnPrimary.querySelector(".btn-icon");
    const primaryText = this.btnPrimary.querySelector(".btn-text");
    const secondaryIcon = this.btnSecondary.querySelector(".btn-icon");
    const secondaryText = this.btnSecondary.querySelector(".btn-text");

    this.btnPrimary.className = "btn-sw";
    this.btnSecondary.className = "btn-sw";

    if (this.state === "IDLE") {
      this.btnPrimary.classList.add("btn-start");
      primaryIcon.textContent = "▶";
      primaryText.textContent = "Iniciar";

      this.btnSecondary.classList.add("btn-print");
      this.btnSecondary.disabled = true;
      secondaryIcon.textContent = "📸";
      secondaryText.textContent = "Imprimir";
    } else if (this.state === "RUNNING") {
      this.btnPrimary.classList.add("btn-stop");
      primaryIcon.textContent = "⏹";
      primaryText.textContent = "Parar";

      this.btnSecondary.classList.add("btn-print");
      this.btnSecondary.disabled = false;
      secondaryIcon.textContent = "📸";
      secondaryText.textContent = "Imprimir";
    } else if (this.state === "PAUSED") {
      this.btnPrimary.classList.add("btn-finish");
      primaryIcon.textContent = "🧹";
      primaryText.textContent = "Finalizar";

      this.btnSecondary.classList.add("btn-continue");
      this.btnSecondary.disabled = false;
      secondaryIcon.textContent = "▶";
      secondaryText.textContent = "Continuar";
    }
  }

  renderHistory() {
    if (!this.historyListEl) return;

    if (this.historyCountEl) {
      this.historyCountEl.textContent = `${this.laps.length} marca${this.laps.length !== 1 ? "s" : ""}`;
    }

    if (this.laps.length === 0) {
      this.historyListEl.innerHTML = `
        <li class="history-empty">
          Nenhum valor impresso ainda.<br>Pressione <strong style="color: #ff8c00;">Imprimir</strong> durante a contagem.
        </li>
      `;
      return;
    }

    const reversedLaps = [...this.laps].reverse();
    this.historyListEl.innerHTML = reversedLaps
      .map(
        (lap) => `
      <li class="history-item">
        <div class="history-item-left">
          <span class="history-num">#${lap.index}</span>
          <span class="history-time-val">${lap.formattedTime}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="history-diff-badge">+${lap.diffSeconds.toFixed(2)}s</div>
          <button class="btn-gcal btn-gcal-lap" data-time="${lap.formattedTime}" data-index="${lap.index}">📅 Agenda</button>
        </div>
      </li>
    `,
      )
      .join("");

    this.historyListEl.querySelectorAll(".btn-gcal-lap").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const timeVal = e.currentTarget.dataset.time;
        const lapIdx = e.currentTarget.dataset.index;
        openGoogleCalendar({
          title: `Cronômetro Marca #${lapIdx} (${timeVal})`,
          details: `Marcação #${lapIdx} registrada no cronômetro: ${timeVal}`,
        });
      });
    });
  }

  async saveSessionToBackend() {
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: this.formatTime(this.elapsedTime),
          laps: this.laps,
        }),
      });
    } catch (err) {
      console.warn("Servidor offline para salvar histórico:", err);
    }
  }
}

// Função Auxiliar de Agendamento no Google Agenda
function openGoogleCalendar({ title, dateStr, timeStr, timeZoneStr, details }) {
  const todayISO = new Date().toISOString().split("T")[0];
  const targetDateStr = dateStr || todayISO;
  const cleanDate = targetDateStr.replace(/-/g, "");

  const timeParts = (timeStr || "08:00").split(":");
  const hh = String(timeParts[0]).padStart(2, "0");
  const mm = String(timeParts[1]).padStart(2, "0");
  const ss = timeParts[2] ? String(timeParts[2]).padStart(2, "0") : "00";

  const startIso = `${cleanDate}T${hh}${mm}${ss}`;

  const startDateObj = new Date(`${targetDateStr}T${hh}:${mm}:${ss}`);
  const endDateObj = isNaN(startDateObj.getTime())
    ? new Date()
    : new Date(startDateObj.getTime() + 30 * 60000);
  const endCleanDate = endDateObj.toISOString().split("T")[0].replace(/-/g, "");
  const endHh = String(endDateObj.getHours()).padStart(2, "0");
  const endMm = String(endDateObj.getMinutes()).padStart(2, "0");
  const endSs = String(endDateObj.getSeconds()).padStart(2, "0");
  const endIso = `${endCleanDate}T${endHh}${endMm}${endSs}`;

  const eventTitle = title || "Compromisso / Alarme";
  const eventDetails = details || "Criado via Aplicativo Relógio Digital JS";

  let gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(eventDetails)}`;

  if (timeZoneStr && timeZoneStr !== "local") {
    gcalUrl += `&ctz=${encodeURIComponent(timeZoneStr)}`;
  }

  window.open(gcalUrl, "_blank");
}

//3. MÓDULO DE ALARME
class AlarmManager {
  constructor(digitalClock) {
    this.digitalClock = digitalClock;
    this.alarms = [];

    this.availableTimezones = [
      { id: "local", name: "Horário Local", tz: null },
      { id: "sp", name: "Brasília (GMT-3)", tz: "America/Sao_Paulo" },
      { id: "ny", name: "Nova York (EST)", tz: "America/New_York" },
      { id: "ldn", name: "Londres (GMT/BST)", tz: "Europe/London" },
      { id: "paris", name: "Paris (CET/CEST)", tz: "Europe/Paris" },
      { id: "tokyo", name: "Tóquio (JST)", tz: "Asia/Tokyo" },
      { id: "sydney", name: "Sydney (AEST)", tz: "Australia/Sydney" },
      { id: "dubai", name: "Dubai (GST)", tz: "Asia/Dubai" },
    ];

    this.formSelectedTzIds = ["local"];

    // Elementos do DOM
    this.formEl = document.getElementById("form-add-alarm");
    this.timeInput = document.getElementById("alarm-time-input");
    this.dateInput = document.getElementById("alarm-date-input");
    this.labelInput = document.getElementById("alarm-label-input");
    this.alarmsListEl = document.getElementById("alarms-list");
    this.badgeEl = document.getElementById("alarm-count-badge");

    // Elementos do DOM do Modal
    this.modalEl = document.getElementById("alarm-modal");
    this.modalTimeEl = document.getElementById("modal-alarm-time");
    this.modalLabelEl = document.getElementById("modal-alarm-label");
    this.btnSnooze = document.getElementById("btn-alarm-snooze");
    this.btnDismiss = document.getElementById("btn-alarm-dismiss");

    // Gerador de Som por Web Audio
    this.audioCtx = null;
    this.alarmOscillator = null;
    this.isPlayingSound = false;
    this.activeRingingAlarm = null;

    this.init();
  }

  async init() {
    if (this.dateInput) {
      this.dateInput.value = new Date().toISOString().split("T")[0];
    }

    this.initAlarmTzDropdown();

    if (this.formEl) {
      this.formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addAlarm();
      });
    }

    if (this.btnDismiss) {
      this.btnDismiss.addEventListener("click", () => this.dismissAlarm());
    }

    if (this.btnSnooze) {
      this.btnSnooze.addEventListener("click", () => this.snoozeAlarm(5));
    }

    await this.fetchAlarms();
    setInterval(() => this.checkAlarms(), 1000);
  }

  initAlarmTzDropdown() {
    this.tzBtn = document.getElementById("alarm-toggle-tz-btn");
    this.tzMenu = document.getElementById("alarm-tz-dropdown-menu");
    this.tzListEl = document.getElementById("alarm-tz-dropdown-list");

    if (!this.tzBtn || !this.tzMenu || !this.tzListEl) return;

    this.renderAlarmTzDropdownList();

    this.tzBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.tzMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!this.tzMenu.contains(e.target) && e.target !== this.tzBtn) {
        this.tzMenu.classList.add("hidden");
      }
    });
  }

  renderAlarmTzDropdownList() {
    if (!this.tzListEl) return;
    this.tzListEl.innerHTML = this.availableTimezones
      .map(
        (item) => `
      <label class="tz-option">
        <input type="checkbox" value="${item.id}" ${this.formSelectedTzIds.includes(item.id) ? "checked" : ""}>
        <span>${item.name}</span>
      </label>
    `,
      )
      .join("");

    this.tzListEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          if (!this.formSelectedTzIds.includes(id)) {
            this.formSelectedTzIds.push(id);
          }
        } else {
          if (this.formSelectedTzIds.length > 1) {
            this.formSelectedTzIds = this.formSelectedTzIds.filter(
              (tId) => tId !== id,
            );
          } else {
            e.target.checked = true;
            return;
          }
        }
        this.renderAlarmTzDropdownList();
      });
    });
  }

  async fetchAlarms() {
    try {
      const res = await fetch("/api/alarms");
      const data = await res.json();
      if (data.success) {
        this.alarms = data.alarms;
        this.render();
      }
    } catch (err) {
      console.warn(
        "Usando armazenamento local para alarmes (Backend offline):",
        err,
      );
      const local = localStorage.getItem("js_clock_alarms");
      if (local) {
        this.alarms = JSON.parse(local);
      }
      this.render();
    }
  }

  async addAlarm() {
    const timeVal = this.timeInput.value;
    const dateVal = this.dateInput ? this.dateInput.value : "";
    const labelVal = this.labelInput.value;

    if (!timeVal) return;

    const alarmPayload = {
      time: timeVal,
      date: dateVal || new Date().toISOString().split("T")[0],
      selectedTzIds: [...this.formSelectedTzIds],
      label: labelVal || "Alarme Sem Título",
    };

    try {
      const res = await fetch("/api/alarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alarmPayload),
      });
      const data = await res.json();
      if (data.success) {
        this.alarms.push(data.alarm);
      }
    } catch (err) {
      const fallbackAlarm = {
        id: Date.now().toString(),
        ...alarmPayload,
        active: true,
      };
      this.alarms.push(fallbackAlarm);
      localStorage.setItem("js_clock_alarms", JSON.stringify(this.alarms));
    }

    this.labelInput.value = "";
    this.render();
  }

  async toggleAlarm(id) {
    const alarm = this.alarms.find((a) => a.id === id);
    if (!alarm) return;

    alarm.active = !alarm.active;
    this.render();

    try {
      await fetch(`/api/alarms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: alarm.active }),
      });
    } catch (err) {
      localStorage.setItem("js_clock_alarms", JSON.stringify(this.alarms));
    }
  }

  async deleteAlarm(id) {
    this.alarms = this.alarms.filter((a) => a.id !== id);
    this.render();

    try {
      await fetch(`/api/alarms/${id}`, { method: "DELETE" });
    } catch (err) {
      localStorage.setItem("js_clock_alarms", JSON.stringify(this.alarms));
    }
  }

  checkAlarms() {
    if (this.isPlayingSound) return;

    const currentTimeStr = this.digitalClock.getCurrentTimeHHMM();
    const now = new Date();
    const currentSeconds = now.getSeconds();
    const todayISO = now.toISOString().split("T")[0];

    if (currentSeconds !== 0) return;

    for (const alarm of this.alarms) {
      if (alarm.active && alarm.time === currentTimeStr) {
        if (!alarm.date || alarm.date === todayISO) {
          this.triggerAlarm(alarm);
          break;
        }
      }
    }
  }

  triggerAlarm(alarm) {
    this.activeRingingAlarm = alarm;
    this.isPlayingSound = true;

    if (this.modalTimeEl) this.modalTimeEl.textContent = alarm.time;
    if (this.modalLabelEl)
      this.modalLabelEl.textContent = alarm.label || "Alarme Programado";
    if (this.modalEl) this.modalEl.classList.remove("hidden");

    this.startAudioSound();
  }

  dismissAlarm() {
    this.stopAudioSound();
    if (this.modalEl) this.modalEl.classList.add("hidden");
    this.isPlayingSound = false;
    this.activeRingingAlarm = null;
  }

  snoozeAlarm(minutes = 5) {
    this.dismissAlarm();

    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const hrs = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    const snoozeTime = `${hrs}:${mins}`;

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

        osc.type = "square";
        osc.frequency.setValueAtTime(
          toneHigh ? 880 : 587.33,
          this.audioCtx.currentTime,
        );
        toneHigh = !toneHigh;

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.audioCtx.currentTime + 0.35,
        );

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      }, 400);
    } catch (e) {
      console.warn("Áudio não permitido sem interação do usuário.", e);
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

  computeConvertedTime(dateStr, timeStr, targetTz) {
    if (!targetTz) return timeStr;
    try {
      const todayISO = dateStr || new Date().toISOString().split("T")[0];
      const baseDate = new Date(`${todayISO}T${timeStr}:00`);
      if (isNaN(baseDate.getTime())) return timeStr;

      return baseDate.toLocaleTimeString("pt-BR", {
        timeZone: targetTz,
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return timeStr;
    }
  }

  render() {
    if (!this.alarmsListEl) return;

    const activeCount = this.alarms.filter((a) => a.active).length;
    if (this.badgeEl) {
      this.badgeEl.textContent = `${activeCount} ativo${activeCount !== 1 ? "s" : ""}`;
    }

    if (this.alarms.length === 0) {
      this.alarmsListEl.innerHTML = `<div class="alarms-empty">Nenhum alarme programado.</div>`;
      return;
    }

    this.alarmsListEl.innerHTML = this.alarms
      .map((a) => {
        const tzIds = a.selectedTzIds || (a.tz ? [a.tz] : ["local"]);
        const selectedObjs = this.availableTimezones.filter(
          (item) => tzIds.includes(item.id) || tzIds.includes(item.tz),
        );
        const isMulti = selectedObjs.length > 1;

        let timeDisplayHtml = "";
        if (!isMulti) {
          // REQUISITO: Quando selecionado um só deixa somente os horário e NÃO tem o nome do fuso
          timeDisplayHtml = `<div class="alarm-item-time">${a.time}</div>`;
        } else {
          // REQUISITO: Quando seleciona mais de um coloca no mesmo alarme os fusos e os NOMES
          const pills = selectedObjs
            .map((item) => {
              const convertedTime = this.computeConvertedTime(
                a.date,
                a.time,
                item.tz,
              );
              return `
            <div class="alarm-tz-pill">
              <span class="alarm-tz-name">${item.name}</span>
              <span class="alarm-tz-time">${convertedTime}</span>
            </div>
          `;
            })
            .join("");
          timeDisplayHtml = `<div class="alarm-multi-tz-wrapper">${pills}</div>`;
        }

        return `
        <div class="alarm-item ${a.active ? "active" : ""}">
          <div>
            ${timeDisplayHtml}
            <div class="alarm-item-label">${a.label}</div>
            <div style="font-size: 0.72rem; color: #8e8e93; margin-top: 4px;">
              📅 ${a.date || "Hoje"}
            </div>
          </div>
          <div class="alarm-item-actions">
            <button class="btn-gcal btn-gcal-alarm" data-id="${a.id}">📅 Agenda</button>
            <label class="switch">
              <input type="checkbox" data-id="${a.id}" class="toggle-alarm-cb" ${a.active ? "checked" : ""}>
              <span class="slider"></span>
            </label>
            <button class="btn-del-alarm" data-id="${a.id}">🗑</button>
          </div>
        </div>
      `;
      })
      .join("");

    this.alarmsListEl.querySelectorAll(".btn-gcal-alarm").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const alarm = this.alarms.find((a) => a.id === id);
        if (alarm) {
          openGoogleCalendar({
            title: `Alarme: ${alarm.label}`,
            dateStr: alarm.date,
            timeStr: alarm.time,
            timeZoneStr: alarm.tz || "local",
            details: `Alarme programado no app Relógio Digital JS (${alarm.label})`,
          });
        }
      });
    });

    this.alarmsListEl.querySelectorAll(".toggle-alarm-cb").forEach((cb) => {
      cb.addEventListener("change", (e) =>
        this.toggleAlarm(e.target.dataset.id),
      );
    });

    this.alarmsListEl.querySelectorAll(".btn-del-alarm").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.deleteAlarm(e.target.dataset.id),
      );
    });
  }
}

//4. INICIALIZAÇÃO DA APLICAÇÃO E GERENCIAMENTO DE NAVEGAÇÃO

document.addEventListener("DOMContentLoaded", () => {
  // Inicializa os Módulos Principais
  const clock = new DigitalClock();
  const stopwatch = new Stopwatch();
  const alarmManager = new AlarmManager(clock);

  // Gerenciamento de Navegação por Abas
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".app-section");

  navItems.forEach((navBtn) => {
    navBtn.addEventListener("click", () => {
      const targetId = navBtn.getAttribute("data-target");

      // Atualiza o botão de navegação ativo (Aplica a Sombra Laranja)
      navItems.forEach((item) => item.classList.remove("active"));
      navBtn.classList.add("active");

      // Atualiza a seção ativa
      sections.forEach((section) => {
        if (section.id === targetId) {
          section.classList.add("active");
        } else {
          section.classList.remove("active");
        }
      });
    });
  });

  // Verificação do status de saúde do servidor
  checkServerHealth();
});

async function checkServerHealth() {
  const statusTextEl = document.getElementById("app-status-text");
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (data.status === "online" && statusTextEl) {
      statusTextEl.textContent = "ONLINE (NODE.JS JS)";
    }
  } catch (e) {
    if (statusTextEl) {
      statusTextEl.textContent = "MODO LOCAL JS";
    }
  }
}
