
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

// Escuta mensagens do popup
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

  return true;
});

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
  const cells = row.querySelectorAll('td');
  const data = {
    matricula: '',
    nome: '',
    curso: '',
    status: '',
    telefone: '',
    emailAcademico: '',
    emailPessoal: '',
    cpf: '',
    dataInicio: '',
    dataFim: '',
    concedente: '',
    supervisor: '',
    orientador: '',
    coletadoEm: new Date().toISOString()
  };

  // Tenta identificar cada célula baseado no conteúdo
  cells.forEach((cell, index) => {
    const text = cell.textContent.trim();

    // Mapear padrões para funções de extração
    const patterns = [
      {
        test: () => index === 0 && /^\d+$/.test(text),
        action: () => { data.matricula = text; }
      },
      {
        test: () => index === 1 || (index === 0 && !data.matricula),
        action: () => {
          data.nome = text;
          // Tenta extrair matrícula de link
          const link = cell.querySelector('a');
          if (link) {
            const href = link.getAttribute('href') || '';
            const match = href.match(/(\d{6,})/);
            if (match) data.matricula = match[1];
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
        test: () => index === 3,
        action: () => { data.status = text; }
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

  return data;
}

// Tenta acessar dados adicionais via API se disponível
async function fetchAdditionalData(matricula) {
  try {
    const response = await fetch(`/api/estagios/aluno/${matricula}/`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log('API não disponível');
  }
  return null;
}
