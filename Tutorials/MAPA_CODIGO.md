# 🗺️ Mapa Visual do Código

## 📁 Estrutura de Arquivos

```
Chrome-Extension---SUAP-fetch-INTERNS-profile/
├── manifest.json              # Configuração da extensão
├── background.js              # 🎯 Lógica principal (571 linhas)
├── content.js                 # 🔍 Extração de dados (271 linhas)
├── popup.js                   # 🖥️ Interface (283 linhas)
├── popup.html                 # 📋 HTML do popup
├── popup.css                  # 🎨 Estilos
├── README.md                  # Documentação geral
├── COLETA_DADOS.md           # 📊 Guia de coleta (NOVO)
├── RESUMO_ALTERACOES.md      # ✅ Resumo (NOVO)
└── EXEMPLOS_DADOS.md         # 📝 Exemplos (NOVO)
```

---

## 🔄 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                      EXTENSÃO CHROME                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐       ┌──────────────┐                 │
│  │  popup.html  │       │  popup.js    │                 │
│  │   (UI/UX)    │───────│  (eventos)   │                 │
│  └──────────────┘       └──────┬───────┘                 │
│                                │                          │
│                         ┌──────▼───────┐                 │
│                         │background.js │                 │
│                         │ (automação)  │                 │
│                         └──────┬───────┘                 │
│                                │                          │
│                  ┌─────────────▼──────────────┐           │
│                  │  Script Content Injection  │           │
│                  │     (content.js)           │           │
│                  │  (extração dados SUAP)     │           │
│                  └─────────────┬──────────────┘           │
│                                │                          │
│                         ┌──────▼───────────┐             │
│                         │  SUAP Website    │             │
│                         │ (suap.ifro...)   │             │
│                         └──────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 background.js - Fluxo Principal

```
class EstagiariosAutomation
│
├─ start(tabId, mode)
│  ├─ buildQueueFromAllPages()
│  │  ├─ Loop por todas as páginas
│  │  │  ├─ chrome.tabs.update(URL)
│  │  │  ├─ waitForPageLoad()
│  │  │  ├─ executeScript(extractPageLinksAndNext)
│  │  │  │  └─ Retorna: {links[], nextUrl}
│  │  │  └─ delay(500)
│  │  └─ this.queue = Array.from(linksMap.values())
│  │
│  └─ processQueue()  ⭐ PRINCIPAL
│     ├─ Loop: for each item in queue
│     │  ├─ delay(1000)  ⏱️ TIMEOUT 1s
│     │  ├─ chrome.tabs.update(item.url)
│     │  ├─ waitForPageLoad()
│     │  ├─ executeScript(extractDetailedData)
│     │  │  └─ Retorna: {ok, data, error}
│     │  ├─ mergeRecord(collected, data)
│     │  ├─ notifyPopup('collected', data)
│     │  └─ delay(1000)  ⏱️ TIMEOUT 1s
│     │
│     └─ notifyPopup('completed', stats)
│
├─ pause()
├─ resume()
├─ reset()
├─ getState()
└─ saveState()

Functions:
├─ extractPageLinksAndNext()
│  ├─ document.querySelectorAll('tbody tr')
│  ├─ Extrai: matricula, nome, curso, status, statusVisual
│  └─ Retorna: {links: [], nextUrl: string}
│
└─ extractDetailedData(mode, baseInfo)
   ├─ Procura: dl.definition-list (dados estruturados)
   ├─ Procura: table tr (dados tabulares)
   ├─ Procura: table.info (perfil aluno)
   ├─ Procura: .popup-user a[href="/edu/aluno/MATRICULA"]
   ├─ Regex: email, cpf, telefone
   └─ Retorna: {ok: bool, data: object, error: string}
```

---

## 🔍 content.js - Extração de Dados

```
Message Listeners
├─ 'getPageInfo'
│  └─ Retorna: {url, title, hasTable, rowCount}
│
├─ 'scrapeData'
│  └─ scrapeDetailedData()
│     ├─ Múltiplos seletores (compatibilidade)
│     ├─ Para each tbody tr
│     │  └─ extractRowData(row)
│     │     ├─ Padrões de identificação
│     │     ├─ Extrai: matricula, nome, curso
│     │     ├─ Captura: statusVisual (imagem)
│     │     └─ Retorna: {matricula, nome, ...}
│     └─ Retorna: []
│
└─ 'getStageStatus'
   └─ extractStageStatus()
      ├─ document.querySelector('.status-alert')
      ├─ Coleta: className, alt, title
      └─ Retorna: {status, classe, titulo}

Helper Functions
├─ delay(ms)
│  └─ return new Promise(resolve => setTimeout(...))
│
├─ extractStageStatus()
│  └─ Busca: .status-alert, [class*="status"]
│
├─ scrapeDetailedData()
│  └─ Coleta todas as linhas da tabela
│
├─ extractRowData(row)
│  ├─ Analisa cada célula
│  ├─ Padrões regex (email, cpf, telefone, datas)
│  └─ Retorna: {matricula, nome, curso, statusEstaggio, statusVisual, ...}
│
└─ extractPopupUserData(profileHtml)
   ├─ table.info → tr → td (pares label/valor)
   ├─ .popup-user → a[href="/edu/aluno/MATRICULA"]
   └─ Retorna: {nome, matricula, email, telefone, ...}
```

---

## 📊 Seletores CSS Utilizados

### Listagem de Estagiários
```javascript
// Linhas da tabela
'#result_list tbody tr'        // Admin Django
'.results table tbody tr'       // Alternativo
'#changelist tbody tr'         // Alternativo

// Link de acesso
'a[href*="/admin/estagios/praticaprofissional/"]'
'a[href*="praticaprofissional"]'
'a.icon.view'                  // Botão visualizar

// Status visual (imagem)
'.status-alert'                // Classe de alerta
'img[class*="status"]'         // Imagem com status
```

### Perfil do Aluno
```javascript
// Dados estruturados
'dl.definition-list .list-item'
'dl .list-item'
'table tr'                     // Tabelas gerais

// Tabela de informações
'table.info tbody tr'          // Tabela com class "info"

// Link de perfil
'.popup-user a[href*="/edu/aluno/"]'

// Popup
'.popup-user'                  // Div com dados do popup
```

---

## ⏱️ Timeline de Execução

```
┌─────────────────────────────────────────────────────────────┐
│                  PROCESSAMENTO DE FILA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Estagiário 1:                                              │
│   delay(1000ms) ─────┐                                    │
│   chrome.tabs.update │ ~500ms                             │
│   waitForPageLoad    │                                    │
│   extractDetailedData│ ~200ms                             │
│   ────────────────────                                    │
│   Total: ~1700ms                                           │
│                                                             │
│ Estagiário 2:                                              │
│   delay(1000ms) ─────┐                                    │
│   chrome.tabs.update │ ~500ms                             │
│   waitForPageLoad    │                                    │
│   extractDetailedData│ ~200ms                             │
│   ────────────────────                                    │
│   Total: ~1700ms                                           │
│                                                             │
│ ... (repetir para cada estagiário)                         │
│                                                             │
│ Total para 100 estagiários: ~170 segundos (~3 min)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Estrutura de Dados

```javascript
// Dados coletados por estagiário
{
  // Dados da listagem
  matricula: string,          // De: tbody → tr → td[0]
  nome: string,               // De: tbody → tr → th
  curso: string,              // De: tbody → tr → td[2]
  status: string,             // De: tbody → tr → td[3]
  statusVisual: string,       // De: <img class="status">

  // Dados do perfil
  emailAcademico: string,     // De: table.info | regex
  emailPessoal: string,       // De: table.info | regex
  cpf: string,                // De: table.info | regex
  telefone: string,           // De: table.info | regex
  dataInicio: string,         // De: table.info | dl
  dataFim: string,            // De: table.info | dl
  concedente: string,         // De: table.info | dl
  supervisor: string,         // De: table.info | dl
  orientador: string,         // De: table.info | dl

  // Referências
  linkPerfil: string,         // De: .popup-user a[href]
  paginaOrigem: string,       // URL da listagem
  url: string,                // URL do perfil

  // Metadados
  coletadoEm: timestamp       // Gerado automaticamente
}
```

---

## 🎛️ Modos de Operação

```javascript
// Modo FAST (rápido)
mode = 'fast'
├─ Coleta apenas: nome, matricula
├─ Tempo: ~0.5s por estagiário
└─ Uso: Validação rápida

// Modo COMPLETE (padrão)
mode = 'complete'
├─ Coleta todos os campos
├─ Tempo: ~1.5s por estagiário
└─ Uso: Coleta normal

// Modo SUPER (completo)
mode = 'super'
├─ Coleta todos os campos
├─ Inclui: camposBrutos, tituloPagina
├─ Tempo: ~1.5s por estagiário
└─ Uso: Debug/análise detalhada
```

---

## ✅ Pontos-Chave Implementados

```
✅ Timeout 1s entre requests        (processQueue linha ~155)
✅ Navegação table → tbody → tr      (extractPageLinksAndNext)
✅ Coleta de statusVisual (imagem)   (extração de <img>)
✅ Extração de popup-user            (table.info tbody tr)
✅ Link href="/edu/aluno/MATRICULA"  (querySelector)
✅ Comentários diretos e simples      (todo arquivo)
✅ Retry automático (até 2x)         (processQueue linha ~175)
✅ Exportação CSV                     (exportToCsv)
```
