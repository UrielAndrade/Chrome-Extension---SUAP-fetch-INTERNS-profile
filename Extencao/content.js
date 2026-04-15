
const observer = new MutationObserver((mutations) => {
    // Notifica o background sobre mudanças na página
    chrome.runtime.sendMessage({
        action: 'pageUpdated',
        url: window.location.href,
        hasData: document.querySelector('#changelist table, .results table') !== null
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Escuta mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageInfo') {
        const info = {
            url: window.location.href,
            title: document.title,
            hasTable: document.querySelector('#changelist table, .results table, #result_list') !== null,
            rowCount: document.querySelectorAll('#changelist table tbody tr, .results table tbody tr').length
        };
        sendResponse(info);
    }

    if (request.action === 'scrapeData') {
        const data = scrapeDetailedData();
        sendResponse(data);
    }

    if (request.action === 'getStageStatus') {
        // Extrai o status visual do estágio (imagem/classe status)
        const statusData = extractStageStatus();
        sendResponse(statusData);
    }

    return true;
});

// Aguarda delay de 1 segundo
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Coleta status visual do estágio pela imagem ou classe
function extractStageStatus() {
    const statusElement = document.querySelector('.status-alert, [class*="status"], [class*="icon"]');

    if (!statusElement) {
        return { status: 'desconhecido' };
    }

    // Tenta pegar da classe CSS
    const classList = statusElement.className || '';

    // Tenta pegar de atributo title ou alt
    const title = statusElement.getAttribute('title') || statusElement.getAttribute('alt') || '';

    // Tenta pegar de span dentro
    const statusText = statusElement.querySelector('span')?.textContent?.trim() || '';

    return {
        status: statusText || title || classList,
        classe: classList,
        titulo: title
    };
}

// Coleta dados detalhados com mais precisão
function scrapeDetailedData() {
    const data = [];

    // Múltiplos seletores para compatibilidade
    const selectors = [
        '#changelist table tbody tr',
        '.results table tbody tr',
        '#result_list tbody tr',
        'table tbody tr'
    ];

    let rows = [];
    for (const selector of selectors) {
        rows = document.querySelectorAll(selector);
        if (rows.length > 0) break;
    }

    rows.forEach(row => {
        const estagiario = extractRowData(row);
        if (estagiario.matricula || estagiario.nome) {
            data.push(estagiario);
        }
    });

    return data;
}

function extractRowData(row) {
    const cells = row.querySelectorAll('td, th');
    const data = {
        matricula: '',
        nome: '',
        curso: '',
        statusEstaggio: '',
        statusVisual: '',
        telefone: '',
        emailAcademico: '',
        emailPessoal: '',
        cpf: '',
        dataInicio: '',
        dataFim: '',
        concedente: '',
        supervisor: '',
        orientador: '',
        linkPerfil: '',
        coletadoEm: new Date().toISOString()
    };

    // Percorre células da tabela
    cells.forEach((cell, index) => {
        const text = cell.textContent.trim();

        // Padrões para identificar dados
        const patterns = [
            {
                test: () => index === 0 && /^\d+$/.test(text),
                action: () => { data.matricula = text; }
            },
            {
                test: () => index === 1 || (index === 0 && !data.matricula),
                action: () => {
                    data.nome = text;
                    // Extrai matrícula do link
                    const link = row.querySelector('th a.icon.view, th a[class*="icon"][class*="view"], a.icon.view, a');
                    if (link) {
                        const href = link.getAttribute('href') || '';
                        const match = href.match(/(\d{6,})/);
                        if (match) data.matricula = match[1];
                        data.linkPerfil = href;
                    }
                }
            },
            {
                test: () => text.includes('@'),
                action: () => {
                    if (text.includes('ifro.edu.br') || text.includes('edu.br')) {
                        data.emailAcademico = text;
                    } else {
                        data.emailPessoal = text;
                    }
                }
            },
            {
                test: () => /\(?\d{2}\)?[\s-]?\d{4,5}[-]?\d{4}/.test(text),
                action: () => {
                    data.telefone = text.match(/\(?\d{2}\)?[\s-]?\d{4,5}[-]?\d{4}/)[0];
                }
            },
            {
                test: () => /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(text),
                action: () => {
                    data.cpf = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/)[0].replace(/\D/g, '');
                }
            },
            {
                test: () => text.match(/\d{2}\/\d{2}\/\d{4}/),
                action: () => {
                    if (!data.dataInicio) data.dataInicio = text;
                    else data.dataFim = text;
                }
            },
            {
                test: () => index === 2,
                action: () => { data.curso = text; }
            },
            {
                test: () => index === 3 || (cell.querySelector('img, .status-alert')),
                action: () => {
                    data.statusEstaggio = text;
                    // Tenta pegar status visual (imagem com classe status)
                    const statusIcon = cell.querySelector('img, [class*="status"]');
                    if (statusIcon) {
                        const imgAlt = statusIcon.getAttribute('alt') || '';
                        const imgTitle = statusIcon.getAttribute('title') || '';
                        const imgClass = statusIcon.className || '';
                        data.statusVisual = imgAlt || imgTitle || imgClass;
                    }
                }
            },
            {
                test: () => index > 3,
                action: () => {
                    if (!data.concedente) data.concedente = text;
                    else if (!data.supervisor) data.supervisor = text;
                    else if (!data.orientador) data.orientador = text;
                }
            }
        ];

        for (const pattern of patterns) {
            if (pattern.test()) {
                pattern.action();
                break;
            }
        }
    });

    // Extrai status visual (ícone/imagem) da primeira célula
    const firstCell = cells[0];
    if (firstCell) {
        const statusImg = firstCell.querySelector('img, [class*="status"]');
        if (statusImg) {
            data.statusVisual = statusImg.getAttribute('title') || statusImg.getAttribute('alt') || '';
        }
    }

    return data;
}

// Extrai dados do popup-user (perfil do aluno)
function extractPopupUserData(profileHtml) {
    const data = {
        nome: '',
        matricula: '',
        ingresso: '',
        email: '',
        emailAcademico: '',
        emailGoogleSalaAula: '',
        telefone: '',
        cpf: '',
        dataNascimento: '',
        periodoReferencia: '',
        ira: '',
        curso: '',
        matriz: '',
        qtdPeriodos: '',
        situacaoSistemica: '',
        dataMigracao: '',
        impressaoDigital: '',
        emitiuDiploma: '',
        endereco: '',
        cidade: '',
        estado: '',
        linkPerfilPessoal: ''
    };

    // Procura por tabela com class "info"
    const table = profileHtml.querySelector('table.info');
    if (!table) return data;

    // Percorre linhas da tabela de informações
    table.querySelectorAll('tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        const label = cells[0]?.textContent?.trim().replace(/:$/, '').toLowerCase() || '';
        const value = cells[1]?.textContent?.trim() || '';

        if (label.includes('nome')) data.nome = value;
        if (label.includes('matrícula')) data.matricula = value;
        if (label.includes('ingresso')) data.ingresso = value;
        if (label.includes('email')) data.email = value;
        if (label.includes('e-mail acadêmico')) data.emailAcademico = value;
        if (label.includes('e-mail google sala de aula')) data.emailGoogleSalaAula = value;
        if (label.includes('telefone')) data.telefone = value;
        if (label.includes('cpf')) data.cpf = value;
        if (label.includes('nascimento')) data.dataNascimento = value;
        if (label.includes('período de referência')) data.periodoReferencia = value;
        if (label.includes('i.r.a')) data.ira = value;
        if (label.includes('curso')) data.curso = value;
        if (label.includes('matriz')) data.matriz = value;
        if (label.includes('qtd. períodos')) data.qtdPeriodos = value;
        if (label.includes('situação sistêmica')) data.situacaoSistemica = value;
        if (label.includes('data da migração')) data.dataMigracao = value;
        if (label.includes('impressão digital')) data.impressaoDigital = value;
        if (label.includes('emitiu diploma')) data.emitiuDiploma = value;
        if (label.includes('endereço')) data.endereco = value;
        if (label.includes('cidade')) data.cidade = value;
        if (label.includes('estado')) data.estado = value;
    });

    // Trata popup-user (modal ou popup aberto)
    const popupUserLink = profileHtml.querySelector(
        'table.info tbody tr td.estagiario + td .popup-user a[href*="/edu/aluno/"], table.info tbody tr td.estagiario .popup-user a[href*="/edu/aluno/"], .popup-user a[href*="/edu/aluno/"]'
    );

    if (popupUserLink) {
        const href = popupUserLink.getAttribute('href') || '';
        if (href) {
            data.linkPerfilPessoal = new URL(href, window.location.href).href;

            const match = href.match(/\/edu\/aluno\/(\d+)/);
            if (match) data.matricula = match[1];
        }
    }

    return data;
}
