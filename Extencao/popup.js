
let currentState = {
    isRunning: false,
    isPaused: false,
    stats: { total: 0, success: 0, errors: 0, startTime: null },
    progress: { current: 0, total: 0, percent: 0 }
};

let debugFilter = 'all';
let bgDebugLogger = null;

document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    bindRuntimeUpdates();
    await refreshState();
    initDebugPanel();
    addLog('info', 'Sistema pronto para coletar estagiários.');
});

function bindEvents() {
    document.getElementById('startBtn').addEventListener('click', startAutomation);
    document.getElementById('pauseBtn').addEventListener('click', pauseAutomation);
    document.getElementById('resumeBtn').addEventListener('click', resumeAutomation);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('exportDataBtn').addEventListener('click', exportDataAsCSV);
    document.getElementById('resetBtn').addEventListener('click', resetAutomation);

    // Debug panel events
    document.getElementById('toggleDebug').addEventListener('click', toggleDebugPanel);
    document.getElementById('debugPanel').querySelector('.debug-header').addEventListener('click', toggleDebugPanel);
    document.getElementById('debugTabAll').addEventListener('click', () => setDebugFilter('all'));
    document.getElementById('debugTabErrors').addEventListener('click', () => setDebugFilter('error'));
    document.getElementById('debugTabWarnings').addEventListener('click', () => setDebugFilter('warning'));
    document.getElementById('debugTabSuccess').addEventListener('click', () => setDebugFilter('success'));
    document.getElementById('debugExportJSON').addEventListener('click', () => exportDebugLogs('json'));
    document.getElementById('debugExportCSV').addEventListener('click', () => exportDebugLogs('csv'));
    document.getElementById('debugClear').addEventListener('click', clearDebugLogs);
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
// ── Debug Panel Functions ─────────────────────────────────────────

async function initDebugPanel() {
    try {
        const bg = await chrome.runtime.getBackgroundPage?.() || chrome.extension.getBackgroundPage?.();
        bgDebugLogger = bg?.debugLogger;

        if (bgDebugLogger) {
            updateDebugDisplay();

            // Registra listener para novos logs
            bgDebugLogger.onLog(() => {
                updateDebugDisplay();
            });

            // Auto-atualiza a cada 1s
            setInterval(updateDebugDisplay, 1000);
        }
    } catch (e) {
        console.error('Erro ao inicializar debug panel:', e);
    }
}

function toggleDebugPanel() {
    const content = document.getElementById('debugContent');
    const toggle = document.getElementById('toggleDebug');
    const isHidden = content.style.display === 'none';

    content.style.display = isHidden ? 'block' : 'none';
    toggle.classList.toggle('expanded', isHidden);
}

function setDebugFilter(filter) {
    debugFilter = filter;

    // Atualiza botões ativos
    document.querySelectorAll('.debug-tab').forEach(btn => {
        btn.classList.remove('active');
    });

    const btnMap = {
        'all': 'debugTabAll',
        'error': 'debugTabErrors',
        'warning': 'debugTabWarnings',
        'success': 'debugTabSuccess'
    };

    const btn = document.getElementById(btnMap[filter]);
    if (btn) btn.classList.add('active');

    updateDebugDisplay();
}

function updateDebugDisplay() {
    if (!bgDebugLogger) return;

    const logs = bgDebugLogger.getLogs();
    const stats = bgDebugLogger.getStats();

    // Atualiza estatísticas
    document.getElementById('debugTotal').textContent = stats.total;
    document.getElementById('debugErrors').textContent = stats.error;
    document.getElementById('debugWarnings').textContent = stats.warning;
    document.getElementById('debugSuccess').textContent = stats.success;

    // Filtra logs
    let filtered = logs;
    if (debugFilter !== 'all') {
        filtered = logs.filter(log => log.type === debugFilter);
    }

    // Renderiza logs
    const logsContainer = document.getElementById('debugLogs');
    logsContainer.innerHTML = filtered.slice(0, 100).map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('pt-BR');
        const typeLabel = {
            'info': 'ℹ️ INFO',
            'success': '✅ DONE',
            'warning': '⚠️ WARN',
            'error': '❌ ERROR',
            'debug': '🔍 DBG'
        }[log.type] || log.type;

        return `
      <div class="debug-log-entry ${log.type} visible">
        <span class="debug-log-time">${time}</span>
        <span class="debug-log-type">${typeLabel}</span>
        <span>${log.message}</span>
        ${log.data ? `<br/><span style="opacity: 0.6;">→ ${JSON.stringify(log.data).substring(0, 100)}</span>` : ''}
      </div>
    `;
    }).join('');
}

async function exportDebugLogs(format) {
    if (!bgDebugLogger) return;

    try {
        await bgDebugLogger.downloadLogs(format);
        setStatus('success', `✅ Logs exportados em ${format.toUpperCase()}`);
    } catch (e) {
        setStatus('error', `❌ Erro ao exportar logs: ${e.message}`);
    }
}

async function clearDebugLogs() {
    const ok = confirm('Deseja limpar todos os logs de debug?');
    if (!ok) return;

    try {
        if (bgDebugLogger) {
            await bgDebugLogger.clear();
            updateDebugDisplay();
            setStatus('success', '🧹 Logs de debug limpos');
        }
    } catch (e) {
        setStatus('error', `❌ Erro ao limpar logs: ${e.message}`);
    }
}
// ── Extração de Dados do SUAP ────────────────────────────────────

/**
 * Exporta dados coletados como CSV
 */
async function exportDataAsCSV() {
    try {
        // Obtém dados da página atual via content script
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
            setStatus('error', '❌ Nenhuma aba ativa');
            return;
        }

        const data = await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'extractData'
        }).catch(() => null);

        if (!data) {
            setStatus('warning', '⚠️ Nenhum dado encontrado na página');
            return;
        }

        // Formata como CSV
        const csv = formatDataAsCSV(Array.isArray(data) ? data : [data]);

        // Baixa arquivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        await chrome.downloads.download({
            url,
            filename: `estagiarios_suap_${timestamp}.csv`,
            saveAs: true
        });

        setStatus('success', '✅ Dados exportados como CSV');
        addLog('success', 'Arquivo CSV exportado com sucesso');
    } catch (error) {
        setStatus('error', `❌ Erro ao exportar: ${error.message}`);
        addLog('error', `Erro na exportação: ${error.message}`);
    }
}

/**
 * Formata dados em formato CSV
 */
function formatDataAsCSV(dataArray) {
    if (!dataArray || dataArray.length === 0) return '';

    // Coleta todas as chaves
    const allKeys = new Set();
    dataArray.forEach(row => {
        if (typeof row === 'object') {
            Object.keys(row).forEach(key => allKeys.add(key));
        }
    });

    const headers = Array.from(allKeys).sort();
    const lines = [];

    // Header
    lines.push(headers.map(h => `"${h}"`).join(';'));

    // Dados
    dataArray.forEach(row => {
        const values = headers.map(header => {
            let value = row[header] || '';
            value = String(value)
                .replace(/"/g, '""')
                .replace(/\n/g, ' ')
                .replace(/;/g, ',');
            return `"${value}"`;
        });
        lines.push(values.join(';'));
    });

    return lines.join('\n');
}
