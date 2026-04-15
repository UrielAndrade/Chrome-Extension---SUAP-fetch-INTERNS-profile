class EstagiariosAutomation {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.loopActive = false;
        this.queue = [];
        this.collected = [];
        this.currentIndex = 0;
        this.tabId = null;
        this.mode = 'complete';
        this.listUrl = '';
        this.stats = {
            total: 0,
            success: 0,
            errors: 0,
            startTime: null
        };
        this.requestDelayMs = 3000;
        this.logger = typeof debugLogger !== 'undefined' ? debugLogger : console;
    }

    async start(tabId, mode = 'complete') {
        if (this.isRunning && !this.isPaused) {
            return;
        }

        this.tabId = tabId;
        this.mode = mode;
        this.isRunning = true;
        this.isPaused = false;
        this.loopActive = false;

        this.logger.info('🚀 Iniciando automação', { mode, tabId });

        await this.resetInternalState(false);

        const tab = await chrome.tabs.get(tabId);
        if (!tab?.url?.includes('/admin/estagios/praticaprofissional')) {
            const errorMsg = 'Abra a listagem de estágios do SUAP para iniciar.';
            this.logger.error(errorMsg, { tabUrl: tab?.url });
            throw new Error(errorMsg);
        }

        this.listUrl = this.normalizeFirstPageUrl(tab.url);
        this.stats.startTime = Date.now();
        this.logger.debug('URL base normalizada', { listUrl: this.listUrl });

        await this.buildQueueFromAllPages();
        this.stats.total = this.queue.length;
        this.logger.info(`✅ Fila construída com ${this.queue.length} estagiários`, { total: this.queue.length });

        if (this.queue.length === 0) {
            this.isRunning = false;
            this.notifyPopup('completed', { reason: 'Nenhum estagiário encontrado.' });
            await this.saveState();
            return;
        }

        this.loopActive = true;
        this.processQueue().finally(async () => {
            this.loopActive = false;
            await this.saveState();
        });
    }

    async buildQueueFromAllPages() {
        const linksMap = new Map();
        const visited = new Set();

        let currentUrl = this.listUrl;
        let page = 0;
        const maxPages = 200;

        while (currentUrl && page < maxPages && !visited.has(currentUrl)) {
            visited.add(currentUrl);
            page += 1;

            await chrome.tabs.update(this.tabId, { url: currentUrl });
            await this.waitForPageLoad();

            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: this.tabId },
                func: extractPageLinksAndNext
            });

            const links = Array.isArray(result?.links) ? result.links : [];
            for (const link of links) {
                if (!linksMap.has(link.url)) {
                    linksMap.set(link.url, {
                        ...link,
                        id: linksMap.size,
                        status: 'pending',
                        retries: 0
                    });
                }
            }

            this.notifyPopup('queueBuilt', { count: linksMap.size, page });

            const nextUrl = result?.nextUrl || '';
            currentUrl = nextUrl && !visited.has(nextUrl) ? nextUrl : '';
            await this.delay(this.requestDelayMs);
        }

        this.queue = Array.from(linksMap.values());
        this.currentIndex = 0;
        await this.saveState();
    }

    async processQueue() {
        while (this.currentIndex < this.queue.length && this.isRunning) {
            if (this.isPaused) {
                await this.waitForResume();
                continue;
            }

            const item = this.queue[this.currentIndex];
            this.notifyPopup('processing', {
                current: this.currentIndex + 1,
                total: this.queue.length,
                name: item.nome || item.matricula || 'Estagiário'
            });

            try {
                // Timeout de 3s antes de cada request
                await this.delay(this.requestDelayMs);

                this.logger.debug(`Carregando perfil ${this.currentIndex + 1}/${this.queue.length}`, {
                    matricula: item.matricula,
                    url: item.url
                });

                await chrome.tabs.update(this.tabId, { url: item.url });
                await this.waitForPageLoad();

                const [{ result }] = await chrome.scripting.executeScript({
                    target: { tabId: this.tabId },
                    func: extractDetailedData,
                    args: [this.mode, item]
                });

                if (!result?.ok || !result?.data) {
                    throw new Error(result?.error || 'Não foi possível extrair os dados do perfil.');
                }

                const merged = this.mergeRecord(this.collected, result.data);
                this.collected = merged;

                item.status = 'completed';
                this.stats.success += 1;

                this.logger.success(`Coletado: ${result.data.nome || result.data.matricula}`, {
                    matricula: result.data.matricula
                });

                this.notifyPopup('collected', result.data);
            } catch (error) {
                item.status = 'error';
                item.error = error.message;
                this.stats.errors += 1;

                if (item.retries < 2) {
                    item.retries += 1;
                    item.status = 'retry';
                    this.logger.warning(`Erro em ${item.nome || item.matricula} (tentativa ${item.retries})`, {
                        matricula: item.matricula,
                        error: error.message
                    });
                    this.notifyPopup('error', {
                        name: item.nome || item.matricula || 'Estagiário',
                        error: `${error.message} (tentando novamente)`
                    });
                    // Timeout antes de retry
                    await this.delay(this.requestDelayMs);
                    continue;
                }

                this.logger.error(`Falha final em ${item.nome || item.matricula}`, {
                    matricula: item.matricula,
                    error: error.message
                });

                this.notifyPopup('error', {
                    name: item.nome || item.matricula || 'Estagiário',
                    error: error.message
                });
            }

            this.currentIndex += 1;
            await this.saveState();
            // Aguarda 3s entre processamentos
            await this.delay(this.requestDelayMs);
        }

        this.isRunning = false;
        this.isPaused = false;
        this.notifyPopup('completed', this.stats);

        if (this.listUrl) {
            await chrome.tabs.update(this.tabId, { url: this.listUrl });
        }
    }

    pause() {
        if (!this.isRunning) return;
        this.isPaused = true;
        this.notifyPopup('paused');
    }

    resume() {
        if (!this.isRunning) return;
        this.isPaused = false;
        this.notifyPopup('resumed');

        if (!this.loopActive) {
            this.loopActive = true;
            this.processQueue().finally(async () => {
                this.loopActive = false;
                await this.saveState();
            });
        }
    }

    async waitForResume() {
        while (this.isPaused && this.isRunning) {
            await this.delay(400);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForPageLoad(timeout = 15000) {
        return new Promise((resolve) => {
            let done = false;

            const finish = () => {
                if (done) return;
                done = true;
                chrome.tabs.onUpdated.removeListener(onUpdated);
                setTimeout(resolve, 800);
            };

            const onUpdated = (tabId, changeInfo) => {
                if (tabId === this.tabId && changeInfo.status === 'complete') {
                    finish();
                }
            };

            chrome.tabs.onUpdated.addListener(onUpdated);
            setTimeout(finish, timeout);
        });
    }

    normalizeFirstPageUrl(url) {
        const u = new URL(url);
        u.searchParams.set('page', '1');
        return u.toString();
    }

    mergeRecord(existing, incoming) {
        const key = (incoming.matricula || '').trim() || (incoming.cpf || '').trim() || (incoming.url || '').trim();
        if (!key) return [...existing, incoming];

        const idx = existing.findIndex(item => {
            const itemKey = (item.matricula || '').trim() || (item.cpf || '').trim() || (item.url || '').trim();
            return itemKey === key;
        });

        if (idx === -1) return [...existing, incoming];

        const clone = [...existing];
        clone[idx] = { ...clone[idx], ...incoming };
        return clone;
    }

    async reset() {
        await this.resetInternalState(true);
        this.notifyPopup('completed', this.stats);
    }

    async resetInternalState(clearStorage = true) {
        this.isRunning = false;
        this.isPaused = false;
        this.loopActive = false;
        this.queue = [];
        this.collected = [];
        this.currentIndex = 0;
        this.stats = { total: 0, success: 0, errors: 0, startTime: null };

        if (clearStorage) {
            await chrome.storage.local.remove(['automationState', 'estagiariosData']);
        } else {
            await this.saveState();
        }
    }

    async saveState() {
        await chrome.storage.local.set({
            automationState: {
                queue: this.queue,
                collected: this.collected,
                currentIndex: this.currentIndex,
                stats: this.stats,
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                mode: this.mode,
                listUrl: this.listUrl
            },
            estagiariosData: this.collected
        });
    }

    async getState() {
        const result = await chrome.storage.local.get(['automationState']);
        const state = result.automationState;

        if (state) {
            this.queue = state.queue || this.queue;
            this.collected = state.collected || this.collected;
            this.currentIndex = state.currentIndex || this.currentIndex;
            this.stats = state.stats || this.stats;
            this.isRunning = !!state.isRunning;
            this.isPaused = !!state.isPaused;
            this.mode = state.mode || this.mode;
            this.listUrl = state.listUrl || this.listUrl;
        }

        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            stats: this.stats,
            progress: {
                current: this.currentIndex,
                total: this.queue.length
            }
        };
    }

    notifyPopup(action, data = {}) {
        chrome.runtime.sendMessage({
            type: 'automationUpdate',
            action,
            data,
            stats: this.stats,
            progress: {
                current: this.currentIndex,
                total: this.queue.length,
                percent: this.queue.length
                    ? Math.min(100, Math.round((this.currentIndex / this.queue.length) * 100))
                    : 0
            }
        }).catch(() => { });
    }
}

const automation = new EstagiariosAutomation();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            switch (request.action) {
                case 'start': {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    const tabId = tabs[0]?.id;
                    if (!tabId) throw new Error('Aba ativa não encontrada.');

                    sendResponse({ success: true });
                    automation.start(tabId, request.mode || 'complete').catch((error) => {
                        automation.isRunning = false;
                        automation.notifyPopup('error', { name: 'Automação', error: error.message });
                    });
                    return;
                }

                case 'pause':
                    automation.pause();
                    sendResponse({ success: true });
                    return;

                case 'resume':
                    automation.resume();
                    sendResponse({ success: true });
                    return;

                case 'reset':
                    await automation.reset();
                    sendResponse({ success: true });
                    return;

                case 'getState': {
                    const state = await automation.getState();
                    sendResponse(state);
                    return;
                }

                case 'export': {
                    await exportToCsv(automation.collected);
                    sendResponse({ success: true });
                    return;
                }

                default:
                    sendResponse({ success: false, error: 'Ação inválida.' });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    })();

    return true;
});

async function exportToCsv(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Não há dados para exportar.');
    }

    const allFields = new Set();
    data.forEach((item) => Object.keys(item).forEach((k) => allFields.add(k)));

    const headers = Array.from(allFields);
    const rows = [headers.join(';')];

    data.forEach((item) => {
        const row = headers.map((h) => {
            const val = item[h] == null ? '' : item[h];
            return `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        });
        rows.push(row.join(';'));
    });

    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await chrome.downloads.download({
        url,
        filename: `estagiarios_suap_${timestamp}.csv`,
        saveAs: true
    });
}

function extractPageLinksAndNext() {
    // Seleciona todas as linhas da tabela de estagiários
    const rows = Array.from(document.querySelectorAll('#result_list tbody tr, #changelist tbody tr, .results tbody tr'));
    const links = [];

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (!cells.length) return;

        // Procura por link de acesso ao estagiário
        const link =
            row.querySelector('th a.icon.view') ||
            row.querySelector('th a[class*="icon"][class*="view"]') ||
            row.querySelector('a[href*="/admin/estagios/praticaprofissional/"]') ||
            row.querySelector('a[href*="praticaprofissional"]') ||
            row.querySelector('a.icon.view') ||
            row.querySelector('a');

        if (!link?.href) return;

        // Extrai status visual (imagem com classe "status")
        let statusVisual = '';
        const statusImg = cells[0]?.querySelector('img, [class*="status"]');
        if (statusImg) {
            statusVisual = statusImg.getAttribute('alt') || statusImg.getAttribute('title') || '';
        }

        links.push({
            url: new URL(link.getAttribute('href'), window.location.href).href,
            matricula: (cells[0]?.textContent || '').trim(),
            nome: (cells[1]?.textContent || link.textContent || '').trim(),
            curso: (cells[2]?.textContent || '').trim(),
            status: (cells[3]?.textContent || '').trim(),
            statusVisual: statusVisual,
            paginaOrigem: window.location.href
        });
    });

    // Procura pelo botão de próxima página
    const nextCandidates = Array.from(
        document.querySelectorAll(
            '.paginator a, .pagination a, a[rel="next"], a.next, a[aria-label*="Próximo"], a[title*="Próximo"]'
        )
    );

    const next = nextCandidates.find((a) => {
        if (!a || !a.getAttribute('href')) return false;
        const txt = (a.textContent || '').toLowerCase();
        const klass = (a.className || '').toLowerCase();

        // Verifica se está desabilitado
        if (klass.includes('disabled') || a.parentElement?.className?.toLowerCase().includes('disabled')) return false;

        // Procura por texto ou classe de próximo
        return klass.includes('next') || txt.includes('próximo') || txt.includes('proximo') || txt.includes('seguinte') || txt.includes('next') || txt.includes('»');
    });

    const nextUrl = next?.getAttribute('href')
        ? new URL(next.getAttribute('href'), window.location.href).href
        : '';

    return { links, nextUrl };
}

function extractDetailedData(mode, baseInfo) {
    const normalize = (txt) => (txt || '').replace(/\s+/g, ' ').trim();

    // Estrutura base de dados
    const data = {
        ...baseInfo,
        url: window.location.href,
        coletadoEm: new Date().toISOString()
    };

    // Modo rápido: retorna apenas dados básicos
    if (mode === 'fast') {
        return { ok: !!(data.nome || data.matricula), data };
    }

    // Mapa de rótulos HTML para nomes de campos
    const labelMap = {
        'Nome': 'nome',
        'Matrícula': 'matricula',
        'Ingresso': 'ingresso',
        'Curso': 'curso',
        'Situação': 'status',
        'Situação Sistêmica': 'statusSistemico',
        'E-mail Acadêmico': 'emailAcademico',
        'E-mail': 'email',
        'E-mail Google Sala de Aula': 'emailGoogleSalaAula',
        'CPF': 'cpf',
        'Período de Referência': 'periodoReferencia',
        'I.R.A.': 'ira',
        'Telefone': 'telefone',
        'Matriz': 'matriz',
        'Qtd. Períodos': 'qtdPeriodos',
        'Concedente': 'concedente',
        'Supervisor': 'supervisor',
        'Orientador': 'orientador',
        'Data Início': 'dataInicio',
        'Data Término': 'dataTermino',
        'Data Fim': 'dataFim',
        'Carga Horária': 'cargaHoraria',
        'Bolsa': 'bolsa',
        'Auxílio Transporte': 'auxilioTransporte',
        'Data da Migração': 'dataMigracao',
        'Impressão Digital': 'impressaoDigital',
        'Emitiu Diploma': 'emitiuDiploma'
    };

    const rawFields = {};

    // Extrai dados de listas de definição (dt/dd)
    document.querySelectorAll('dl.definition-list .list-item, dl .list-item').forEach((item) => {
        const dt = item.querySelector('dt');
        const dd = item.querySelector('dd');
        if (!dt || !dd) return;

        const label = normalize(dt.textContent);
        const value = normalize(dd.textContent);
        if (!label || !value) return;

        rawFields[label] = value;

        // Mapeia campos conforme rótulo
        Object.keys(labelMap).forEach((k) => {
            if (label.includes(k)) {
                data[labelMap[k]] = value;
            }
        });
    });

    // Extrai dados de tabelas
    document.querySelectorAll('table tr').forEach((tr) => {
        const th = tr.querySelector('th');
        const td = tr.querySelector('td');
        if (!th || !td) return;

        const label = normalize(th.textContent);
        const value = normalize(td.textContent);
        if (!label || !value) return;

        rawFields[label] = value;

        // Mapeia campos conforme rótulo
        Object.keys(labelMap).forEach((k) => {
            if (label.includes(k) && !data[labelMap[k]]) {
                data[labelMap[k]] = value;
            }
        });
    });

    // Extrai dados da tabela popup-user (perfil do aluno)
    const popupTable = document.querySelector('table.info');
    if (popupTable) {
        const profileLink = popupTable.querySelector(
            'tbody tr td.estagiario + td .popup-user a[href*="/edu/aluno/"], tbody tr td.estagiario .popup-user a[href*="/edu/aluno/"], .popup-user a[href*="/edu/aluno/"]'
        );

        popupTable.querySelectorAll('tbody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;

            const label = normalize(cells[0]?.textContent || '');
            const value = normalize(cells[1]?.textContent || '');

            if (label && value) {
                rawFields[label] = value;

                Object.keys(labelMap).forEach((k) => {
                    if (label.includes(k) && !data[labelMap[k]]) {
                        data[labelMap[k]] = value;
                    }
                });
            }
        });

        if (profileLink) {
            const href = profileLink.getAttribute('href') || '';
            if (href) {
                data.linkPerfilPessoal = new URL(href, window.location.href).href;

                const match = href.match(/\/edu\/aluno\/(\d+)/);
                if (match) {
                    data.matriculaPopup = match[1];
                    if (!data.matricula) {
                        data.matricula = match[1];
                    }
                }
            }
        }
    }

    // Extrai texto completo da página para buscar dados por regex
    const pageText = normalize(document.body.innerText || '');

    // Busca email acadêmico se não encontrado
    if (!data.emailAcademico) {
        const m = pageText.match(/[a-z0-9._%+-]+@(aluno\.)?ifro\.edu\.br/i);
        data.emailAcademico = m ? m[0] : '';
    }

    // Busca email pessoal se não encontrado
    if (!data.emailPessoal) {
        const m = pageText.match(/[a-z0-9._%+-]+@(gmail|hotmail|yahoo|outlook|live|icloud)\.com/i);
        data.emailPessoal = m ? m[0] : '';
    }

    // Busca CPF se não encontrado
    if (!data.cpf) {
        const m = pageText.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
        data.cpf = m ? m[0].replace(/\D/g, '') : '';
    }

    // Busca telefone se não encontrado
    if (!data.telefone) {
        const m = pageText.match(/\(?\d{2}\)?[\s-]?\d{4,5}[-]?\d{4}/);
        data.telefone = m ? m[0] : '';
    }

    // Modo super: inclui campos brutos e título da página
    if (mode === 'super') {
        data.camposBrutos = rawFields;
        data.tituloPagina = document.title;
    }

    return {
        ok: !!(data.nome || data.matricula),
        data,
        error: data.nome || data.matricula ? '' : 'Não foi possível identificar nome ou matrícula no perfil.'
    };
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('SUAP Coletor PRO instalado');
});
