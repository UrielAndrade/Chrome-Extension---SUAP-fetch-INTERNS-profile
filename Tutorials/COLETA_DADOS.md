# Fluxo de Coleta de Dados de Estagiários

## Resumo das Mudanças

O código foi otimizado para coletar dados dos estagiários seguindo o percurso exato descrito:

### 1. **Timeout de 1 segundo entre requests**
- Implementado em `background.js` na função `processQueue()`
- Delay de 1000ms antes de cada request: `await this.delay(1000)`
- Respeita limite de requisições do servidor

### 2. **Estrutura HTML de Navegação**

#### Listagem de estagiários:
```
tbody (lista de estagiários)
  └── tr (cada estagiário)
      ├── td[0] (com imagem/ícone status)
      ├── th.icon.view (link para acessar)
      └── outras informações (curso, status, etc)
```

#### Perfil do aluno (popup-user):
```
table.info
  └── tbody
      └── tr (dados do perfil)
          ├── td[0] (rótulo: Nome, Email, etc)
          └── td[1] (valor)

.popup-user
  └── a[href="/edu/aluno/MATRICULA"] (link de perfil)
```

### 3. **Dados Capturados**

#### Da listagem (extractPageLinksAndNext):
- `matricula` - número da matrícula
- `nome` - nome do estagiário
- `curso` - curso do aluno
- `status` - status do estágio
- `statusVisual` - classe/alt da imagem de status (ex: "Pendências")
- `paginaOrigem` - URL da listagem

#### Do perfil (extractDetailedData):
- `nome`
- `matricula` / `matriculaPopup`
- `curso`
- `emailAcademico` - email @ifro.edu.br
- `emailPessoal` - email pessoal
- `cpf`
- `telefone`
- `dataInicio` - data início do estágio
- `dataFim` - data fim do estágio
- `concedente` - empresa onde estagia
- `supervisor` - supervisor no local
- `orientador` - professor orientador
- `statusVisual` - status visual (imagem)
- `linkPerfil` - URL do perfil no SUAP
- `coletadoEm` - timestamp da coleta

### 4. **Funções Principais**

#### content.js
- `delay(ms)` - aguarda tempo especificado
- `extractStageStatus()` - extrai status visual do estágio
- `extractRowData(row)` - extrai dados de uma linha da tabela
- `extractPopupUserData()` - extrai dados do popup-user

#### background.js
- `extractPageLinksAndNext()` - coleta links e status visual de todos os estagiários
- `extractDetailedData(mode, baseInfo)` - extrai dados completos do perfil
- `processQueue()` - processa fila com timeout de 1s entre requisições

### 5. **Fluxo de Execução**

1. **Inicialização**: Clica em "Iniciar" no popup
2. **Coleta de links**: Percorre todas as páginas da listagem de estagiários
3. **Para cada estagiário**:
   - Aguarda 1 segundo
   - Acessa a página do estagiário
   - Extrai dados pessoais (nome, email, CPF, telefone)
   - Extrai dados do estágio (empresa, supervisor, orientador)
   - Extrai link do perfil no sistema
   - Coleta status visual (pendências, etc)
4. **Exportação**: Ao final, exporta todos os dados em CSV

### 6. **Modo de Execução**

Há 3 modos disponíveis:
- `fast` - apenas dados básicos (rápido)
- `complete` - todos os dados (padrão)
- `super` - inclui campos brutos e metadados

### 7. **Status Visual (Imagem)**

O status é capturado de:
- `<img class="status-alert" alt="Pendências..."`
- `<img title="Status do estágio"`
- Classe CSS que indica situação visual

Este valor é armazenado em `statusVisual` nos dados coletados.

## Exemplo de Dados Coletados

```json
{
  "matricula": "202301001",
  "nome": "João Silva",
  "curso": "Técnico em Informática",
  "emailAcademico": "joao.silva@aluno.ifro.edu.br",
  "emailPessoal": "joao@gmail.com",
  "cpf": "12345678901",
  "telefone": "(69) 99999-9999",
  "dataInicio": "01/02/2024",
  "dataFim": "30/06/2024",
  "concedente": "Empresa XYZ LTDA",
  "supervisor": "Carlos Manager",
  "orientador": "Prof. Ana Silva",
  "status": "Ativo",
  "statusVisual": "Pendências: Assinatura do Termo",
  "linkPerfil": "https://suap.ifro.edu.br/edu/aluno/202301001",
  "coletadoEm": "2026-04-04T10:30:45.123Z"
}
```

## Notas Importantes

- Timeout de 1s garante não sobrecarregar o servidor
- Os dados são salvos em cache durante a coleta
- Falhas em requisições fazem até 2 tentativas automáticas
- Sistema pronto para retomar de onde parou se necessário
