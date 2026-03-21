
let currentState = {
  isRunning: false,
  isPaused: false,
  stats: { total: 0, success: 0, errors: 0, startTime: null },
  progress: { current: 0, total: 0, percent: 0 }
};

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  bindRuntimeUpdates();
  await refreshState();
  addLog('info', 'Sistema pronto para coletar estagiários.');
});

function bindEvents() {
  document.getElementById('startBtn').addEventListener('click', startAutomation);
  document.getElementById('pauseBtn').addEventListener('click', pauseAutomation);
  document.getElementById('resumeBtn').addEventListener('click', resumeAutomation);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('resetBtn').addEventListener('click', resetAutomation);
}

function bindRuntimeUpdates() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'automationUpdate') return;

    currentState.stats = message.stats || currentState.stats;
    currentState.progress = message.progress || currentState.progress;

    handleUpdateEvent(message.action, message.data || {});
    updateUI();
  });
}

async function refreshState() {
  try {
    const response = await sendMessage({ action: 'getState' });
    if (response) {
      currentState.isRunning = !!response.isRunning;
      currentState.isPaused = !!response.isPaused;
      currentState.stats = response.stats || currentState.stats;
      currentState.progress = {
        current: response.progress?.current || 0,
        total: response.progress?.total || 0,
        percent: response.progress?.total
          ? Math.round(((response.progress.current || 0) / response.progress.total) * 100)
          : 0
      };
    }
  } catch (error) {
    console.error('Falha ao carregar estado:', error);
  }

  updateUI();
}

async function startAutomation() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('/admin/estagios/praticaprofissional')) {
      setStatus('error', '❌ Abra a listagem de estágios do SUAP antes de iniciar.');
      return;
    }

    const mode = document.getElementById('collectMode').value;
    setStatus('processing', '🚀 Iniciando automação...');
    addLog('info', `Iniciando coleta no modo: ${mode}`);

    await sendMessage({ action: 'start', mode });

    currentState.isRunning = true;
    currentState.isPaused = false;
    updateUI();
  } catch (error) {
    setStatus('error', `❌ ${error.message || 'Erro ao iniciar automação.'}`);
    addLog('error', error.message || 'Erro ao iniciar automação.');
  }
}

async function pauseAutomation() {
  try {
    await sendMessage({ action: 'pause' });
    currentState.isPaused = true;
    setStatus('warning', '⏸️ Automação pausada.');
    addLog('warning', 'Automação pausada.');
    updateUI();
  } catch (error) {
    setStatus('error', `❌ ${error.message || 'Erro ao pausar.'}`);
  }
}

async function resumeAutomation() {
  try {
    await sendMessage({ action: 'resume' });
    currentState.isPaused = false;
    setStatus('processing', '▶️ Automação retomada.');
    addLog('info', 'Automação retomada.');
    updateUI();
  } catch (error) {
    setStatus('error', `❌ ${error.message || 'Erro ao continuar.'}`);
  }
}

async function exportData() {
  try {
    await sendMessage({ action: 'export' });
    setStatus('success', '✅ Exportação concluída.');
    addLog('success', 'Arquivo CSV exportado.');
  } catch (error) {
    setStatus('error', `❌ ${error.message || 'Erro ao exportar.'}`);
  }
}

async function resetAutomation() {
  const ok = confirm('Deseja resetar o processo e apagar os dados coletados?');
  if (!ok) return;

  try {
    await sendMessage({ action: 'reset' });
    currentState = {
      isRunning: false,
      isPaused: false,
      stats: { total: 0, success: 0, errors: 0, startTime: null },
      progress: { current: 0, total: 0, percent: 0 }
    };
    setStatus('success', '🧹 Estado e dados limpos com sucesso.');
    addLog('info', 'Reset concluído.');
    document.getElementById('previewSection').style.display = 'none';
    updateUI();
  } catch (error) {
    setStatus('error', `❌ ${error.message || 'Erro ao resetar.'}`);
  }
}

function handleUpdateEvent(action, data) {
  switch (action) {
    case 'queueBuilt':
      currentState.isRunning = true;
      currentState.isPaused = false;
      setStatus('processing', `🔎 ${data.count || 0} estagiários encontrados na listagem.`);
      addLog('info', `Fila criada com ${data.count || 0} estagiários.`);
      break;

    case 'processing':
      currentState.isRunning = true;
      currentState.isPaused = false;
      setStatus('processing', `Processando ${data.current || 0}/${data.total || 0}: ${data.name || 'Estagiário'}`);
      addLog('info', `Coletando: ${data.name || 'Estagiário'}`);
      break;

    case 'collected':
      setStatus('success', `✅ Coletado: ${data.nome || data.matricula || 'registro sem nome'}`);
      addLog('success', `Coletado: ${data.nome || data.matricula || 'registro sem nome'}`);
      renderPreview(data);
      break;

    case 'error':
      setStatus('error', `❌ Falha em ${data.name || 'registro'}: ${data.error || 'erro desconhecido'}`);
      addLog('error', `${data.name || 'Registro'}: ${data.error || 'erro desconhecido'}`);
      break;

    case 'paused':
      currentState.isPaused = true;
      setStatus('warning', '⏸️ Automação pausada.');
      addLog('warning', 'Automação pausada.');
      break;

    case 'resumed':
      currentState.isPaused = false;
      setStatus('processing', '▶️ Automação retomada.');
      addLog('info', 'Automação retomada.');
      break;

    case 'completed':
      currentState.isRunning = false;
      currentState.isPaused = false;
      setStatus('success', `🎉 Finalizado: ${currentState.stats.success} sucesso(s), ${currentState.stats.errors} erro(s).`);
      addLog('success', 'Coleta finalizada com sucesso.');
      break;
  }
}

function updateUI() {
  const totalCollected = currentState.stats.success || 0;
  const totalPending = Math.max((currentState.progress.total || 0) - (currentState.progress.current || 0), 0);
  const currentPage = currentState.progress.current || 0;

  document.getElementById('recordCount').textContent = String(totalCollected);
  document.getElementById('pendingCount').textContent = String(totalPending);
  document.getElementById('currentPage').textContent = String(currentPage);

  const percent = currentState.progress.percent || 0;
  document.getElementById('progressFill').style.width = `${percent}%`;
  document.getElementById('progressPercent').textContent = `${percent}%`;

  document.getElementById('startBtn').disabled = currentState.isRunning && !currentState.isPaused;
  document.getElementById('pauseBtn').disabled = !currentState.isRunning || currentState.isPaused;
  document.getElementById('resumeBtn').disabled = !currentState.isRunning || !currentState.isPaused;
  document.getElementById('exportBtn').disabled = (currentState.stats.success || 0) === 0;

  if (currentState.isRunning && currentState.stats.startTime) {
    const elapsedSec = Math.max(1, Math.floor((Date.now() - currentState.stats.startTime) / 1000));
    const done = Math.max(1, currentState.progress.current || 1);
    const perItem = elapsedSec / done;
    const remaining = Math.max(0, (currentState.progress.total || 0) - done);
    const estimate = Math.round(remaining * perItem);
    document.getElementById('timeEstimate').textContent = formatTime(estimate);
    document.getElementById('progressDetail').textContent =
      `Processados ${currentState.progress.current || 0} de ${currentState.progress.total || 0}`;
  } else {
    document.getElementById('timeEstimate').textContent = '--';
    if ((currentState.progress.total || 0) === 0) {
      document.getElementById('progressDetail').textContent = 'Aguardando início...';
    }
  }
}

function renderPreview(data) {
  const section = document.getElementById('previewSection');
  const card = document.getElementById('previewCard');
  section.style.display = 'block';

  const fields = [
    ['Matrícula', data.matricula],
    ['Nome', data.nome],
    ['Curso', data.curso],
    ['Status', data.status],
    ['E-mail Acadêmico', data.emailAcademico],
    ['Concedente', data.concedente],
    ['Supervisor', data.supervisor],
    ['Orientador', data.orientador]
  ];

  card.innerHTML = fields
    .map(([label, value]) => `
      <div class="preview-row">
        <span class="preview-label">${label}</span>
        <span class="preview-value">${value || '-'}</span>
      </div>
    `)
    .join('');
}

function setStatus(type, message) {
  const statusEl = document.getElementById('status');
  const textEl = document.getElementById('statusText');
  statusEl.className = `status ${type}`;
  textEl.textContent = message;
}

function addLog(type, message) {
  const log = document.getElementById('logContent');
  const line = document.createElement('p');
  line.className = `log-entry ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] ${message}`;
  log.prepend(line);
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      if (!response?.success && response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
}
