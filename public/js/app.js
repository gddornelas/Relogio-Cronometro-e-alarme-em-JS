/**
 * Aplicação Principal - Gerenciador de Navegação e Inicialização de Módulos
 */

import { DigitalClock } from './clock.js';
import { Stopwatch } from './stopwatch.js';
import { AlarmManager } from './alarm.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializa os Módulos Principais
  const clock = new DigitalClock();
  const stopwatch = new Stopwatch();
  const alarmManager = new AlarmManager(clock);

  // Gerenciamento de Navegação por Abas
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.app-section');

  navItems.forEach(navBtn => {
    navBtn.addEventListener('click', () => {
      const targetId = navBtn.getAttribute('data-target');

      // Atualiza o botão de navegação ativo (Aplica o Brilho de Sombra Laranja!)
      navItems.forEach(item => item.classList.remove('active'));
      navBtn.classList.add('active');

      // Atualiza a seção ativa
      sections.forEach(section => {
        if (section.id === targetId) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });
    });
  });

  // Verificação do status de saúde do servidor
  checkServerHealth();
});

async function checkServerHealth() {
  const statusTextEl = document.getElementById('app-status-text');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.status === 'online' && statusTextEl) {
      statusTextEl.textContent = 'ONLINE (NODE.JS JS)';
    }
  } catch (e) {
    if (statusTextEl) {
      statusTextEl.textContent = 'MODO LOCAL JS';
    }
  }
}
