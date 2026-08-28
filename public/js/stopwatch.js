/**
 * Módulo do Cronômetro com Marcas e Cálculo de Diferença em Segundos
 */

export class Stopwatch {
  constructor() {
    // Elementos do DOM
    this.displayEl = document.getElementById('sw-display');
    this.msDisplayEl = document.getElementById('sw-ms-display');
    this.statusLabelEl = document.getElementById('sw-status-label');
    this.btnPrimary = document.getElementById('btn-sw-primary');
    this.btnSecondary = document.getElementById('btn-sw-secondary');
    this.historyListEl = document.getElementById('sw-history-list');
    this.historyCountEl = document.getElementById('history-count');

    // Estados: 'IDLE' (Inativo), 'RUNNING' (Em Execução), 'PAUSED' (Pausado)
    this.state = 'IDLE';

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
      this.btnPrimary.addEventListener('click', () => this.handlePrimaryClick());
    }

    if (this.btnSecondary) {
      this.btnSecondary.addEventListener('click', () => this.handleSecondaryClick());
    }

    this.renderButtons();
    this.updateDisplay(0);
  }

  /**
   * Manipulador do Botão Principal
   * IDLE: 'Iniciar' -> Inicia o cronômetro
   * RUNNING: 'Parar' -> Pausa o cronômetro & altera os botões para 'Finalizar' / 'Continuar'
   * PAUSED: 'Finalizar' -> Reinicia o cronômetro para 0
   */
  handlePrimaryClick() {
    if (this.state === 'IDLE') {
      this.start();
    } else if (this.state === 'RUNNING') {
      this.pause();
    } else if (this.state === 'PAUSED') {
      this.finish();
    }
  }

  /**
   * Manipulador do Botão Secundário
   * RUNNING: 'Imprimir' -> Imprime o tempo atual & diferença em segundos
   * PAUSED: 'Continuar' -> Retoma a contagem do cronômetro
   */
  handleSecondaryClick() {
    if (this.state === 'RUNNING') {
      this.printLap();
    } else if (this.state === 'PAUSED') {
      this.resume();
    }
  }

  start() {
    this.state = 'RUNNING';
    this.startTime = Date.now() - this.elapsedTime;
    
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.updateDisplay(this.elapsedTime);
    }, 16); // Renderização suave em ~60fps

    if (this.statusLabelEl) this.statusLabelEl.textContent = 'EM EXECUÇÃO';
    this.renderButtons();
  }

  pause() {
    this.state = 'PAUSED';
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    if (this.statusLabelEl) this.statusLabelEl.textContent = 'PAUSADO';
    this.renderButtons();
  }

  resume() {
    this.state = 'RUNNING';
    this.startTime = Date.now() - this.elapsedTime;
    
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.updateDisplay(this.elapsedTime);
    }, 16);

    if (this.statusLabelEl) this.statusLabelEl.textContent = 'EM EXECUÇÃO';
    this.renderButtons();
  }

  finish() {
    // Salva a sessão no backend se houver marcas registradas
    if (this.laps.length > 0) {
      this.saveSessionToBackend();
    }

    this.state = 'IDLE';
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.elapsedTime = 0;
    this.laps = [];

    this.updateDisplay(0);
    this.renderHistory();

    if (this.statusLabelEl) this.statusLabelEl.textContent = 'PRONTO';
    this.renderButtons();
  }

  /**
   * Impressão (Lap) do tempo atual e cálculo da diferença em segundos
   */
  printLap() {
    const currentMs = this.elapsedTime;
    const lapNumber = this.laps.length + 1;

    // Calcula a diferença em segundos relativa à marcação anterior
    const previousMs = this.laps.length > 0 ? this.laps[this.laps.length - 1].totalMs : 0;
    const diffMs = currentMs - previousMs;
    const diffSeconds = (diffMs / 1000).toFixed(2); // Diferença em segundos (ex: 4.25)

    const formattedTime = this.formatTime(currentMs);

    const lapRecord = {
      index: lapNumber,
      totalMs: currentMs,
      formattedTime: formattedTime,
      diffSeconds: parseFloat(diffSeconds)
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
    const hours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSecs % 60).padStart(2, '0');
    return { hours, minutes, seconds };
  }

  formatTime(ms) {
    const c = this.formatTimeComponents(ms);
    return `${c.hours}:${c.minutes}:${c.seconds}`;
  }

  /**
   * Alterna dinamicamente a aparência dos botões segundo os requisitos:
   * - Em execução: Botão 1 é PARAR (Vermelho), Botão 2 é IMPRIMIR
   * - Ao pausar: Botão 1 vira FINALIZAR (Cinza/Vermelho), Botão 2 vira CONTINUAR (Laranja)
   */
  renderButtons() {
    const primaryIcon = this.btnPrimary.querySelector('.btn-icon');
    const primaryText = this.btnPrimary.querySelector('.btn-text');
    const secondaryIcon = this.btnSecondary.querySelector('.btn-icon');
    const secondaryText = this.btnSecondary.querySelector('.btn-text');

    // Limpa as classes dinâmicas
    this.btnPrimary.className = 'btn-sw';
    this.btnSecondary.className = 'btn-sw';

    if (this.state === 'IDLE') {
      // Principal: Iniciar (Verde)
      this.btnPrimary.classList.add('btn-start');
      primaryIcon.textContent = '▶';
      primaryText.textContent = 'Iniciar';

      // Secundário: Imprimir (Desativado)
      this.btnSecondary.classList.add('btn-print');
      this.btnSecondary.disabled = true;
      secondaryIcon.textContent = '📸';
      secondaryText.textContent = 'Imprimir';

    } else if (this.state === 'RUNNING') {
      // Principal: PARAR (VERMELHO SOLICITADO)
      this.btnPrimary.classList.add('btn-stop');
      primaryIcon.textContent = '⏹';
      primaryText.textContent = 'Parar';

      // Secundário: IMPRIMIR (Ativo)
      this.btnSecondary.classList.add('btn-print');
      this.btnSecondary.disabled = false;
      secondaryIcon.textContent = '📸';
      secondaryText.textContent = 'Imprimir';

    } else if (this.state === 'PAUSED') {
      // Requisito: onde estava PARAR vira FINALIZAR, onde estava IMPRIMIR vira CONTINUAR
      
      // Principal: FINALIZAR
      this.btnPrimary.classList.add('btn-finish');
      primaryIcon.textContent = '🧹';
      primaryText.textContent = 'Finalizar';

      // Secundário: CONTINUAR
      this.btnSecondary.classList.add('btn-continue');
      this.btnSecondary.disabled = false;
      secondaryIcon.textContent = '▶';
      secondaryText.textContent = 'Continuar';
    }
  }

  /**
   * Renderiza a lista de histórico de impressões abaixo do display
   */
  renderHistory() {
    if (!this.historyListEl) return;

    if (this.historyCountEl) {
      this.historyCountEl.textContent = `${this.laps.length} marca${this.laps.length !== 1 ? 's' : ''}`;
    }

    if (this.laps.length === 0) {
      this.historyListEl.innerHTML = `
        <li class="history-empty">
          Nenhum valor impresso ainda.<br>Pressione <strong style="color: #ff8c00;">Imprimir</strong> durante a contagem.
        </li>
      `;
      return;
    }

    // Renderiza as marcas em ordem reversa (mais recente primeiro)
    const reversedLaps = [...this.laps].reverse();
    this.historyListEl.innerHTML = reversedLaps.map(lap => `
      <li class="history-item">
        <div class="history-item-left">
          <span class="history-num">#${lap.index}</span>
          <span class="history-time-val">${lap.formattedTime}</span>
        </div>
        <div class="history-diff-badge">
          +${lap.diffSeconds.toFixed(2)}s
        </div>
      </li>
    `).join('');
  }

  async saveSessionToBackend() {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: this.formatTime(this.elapsedTime),
          laps: this.laps
        })
      });
    } catch (err) {
      console.warn('Servidor offline para salvar histórico:', err);
    }
  }
}
