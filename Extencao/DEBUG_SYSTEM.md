# 🐛 Sistema de Debug - SUAP Coletor de Estagiários

## Overview

O sistema de debug foi implementado para oferecer visibilidade completa dos erros, avisos e eventos de execução da extensão durante a coleta de estagiários.

## Componentes

### 1. **logger.js**
Arquivo centralizado que contém a classe `DebugLogger` responsável por:
- Capturar e armazenar logs em tempo real
- Gerenciar listeners para novos eventos
- Salvar logs em storage do Chrome
- Exportar logs em JSON e CSV

### 2. **background.js** (modificado)
Integração do logger em todos os pontos críticos:
- Início da automação
- Construção da fila de estagiários
- Processamento de cada perfil
- Captura de erros com retry
- Finalizações e pausas

### 3. **popup.js** (modificado)
Painel interativo de debug com:
- Visualização em tempo real de logs
- Filtros por tipo (Todos, Erros, Avisos, Sucesso)
- Estatísticas de execução
- Exportação de logs

### 4. **popup.html & popup.css** (modificados)
Interface visual do painel de debug com tabs, botões e área de exibição.

## Como Usar

### Acessar o Painel de Debug

1. Abra o popup da extensão (ícone no Chrome)
2. Clique em **"🐛 Painel de Debug"** para expandir
3. O painel mostrará em tempo real:
   - Total de logs capturados
   - Contador de erros, avisos, sucessos
   - Timestamp de cada evento
   - Dados detalhados quando disponíveis

### Filtrar Logs

Use os botões dentro do painel:
- **Todos** - Mostra todos os logs
- **❌ Erros** - Apenas erros
- **⚠️ Avisos** - Apenas avisos/retries
- **✅ Sucesso** - Apenas coletados com sucesso

### Exportar Logs

Clique em um dos botões de exportação:
- **📥 JSON** - Exporta como arquivo JSON estruturado
- **📊 CSV** - Exporta como CSV (compatível com Excel)

Os arquivos serão salvos com timestamp: `suap-debug-logs_2026-04-15T10-30-45.json`

### Limpar Logs

Clique em **🗑️ Limpar** para remover todos os logs armazenados.

## Níveis de Log

### `info` (ℹ️)
Eventos informativos gerais:
- Sistema pronto
- Fila construída
- Início/fim de processos

### `success` (✅)
Operações bem-sucedidas:
- Estagiários coletados
- Dados extraídos com sucesso

### `warning` (⚠️)
Situações que requerem atenção:
- Tentativas de retry
- Falhas temporárias

### `error` (❌)
Erros críticos:
- Falha ao extrair dados
- URL inválida
- Exceções não tratadas

### `debug` (🔍)
Informações detalhadas para diagnóstico:
- URLs carregadas
- Índices de processamento
- Dados de contexto

## Exemplo de Log

```
[10:30:45] ℹ️ INFO     Iniciando automação
           → {"mode": "complete", "tabId": 123456}

[10:30:50] 🔍 DBG      Carregando perfil 1/50
           → {"matricula": "202310005", "url": "https://..."}

[10:30:55] ✅ DONE     Coletado: Maria Santos Silva
           → {"matricula": "202310005"}

[10:31:00] ⚠️ WARN     Erro em João Alves (tentativa 1)
           → {"matricula": "202310008", "error": "..."}

[10:31:05] ❌ ERROR    Falha final em João Alves
           → {"matricula": "202310008"}
```

## Limites e Armazenamento

- **Máximo em memória**: 500 logs (últimos eventos)
- **Máximo no storage**: 200 logs (persistência)
- **Limite de tamanho**: 1MB no Chrome Storage
- **Atualização**: Em tempo real com auto-refresh a cada segundo

## Exportação de Dados

### JSON
Formato estruturado com:
```json
{
  "exported": "2026-04-15T10:30:45.123Z",
  "stats": {
    "total": 150,
    "errors": 5,
    "warnings": 12,
    "success": 100,
    "info": 30,
    "debug": 3
  },
  "logs": [...]
}
```

### CSV
Formato tabulado para análise em planilhas:
```
Timestamp;Tipo;Mensagem;Dados
2026-04-15T10:30:45.123Z;info;Iniciando automação;{"mode":"complete"}
```

## Integração com Console

O logger também registra automaticamente no console do navegador:
- Abra Developer Tools (F12)
- Aba **Console**
- Todos os logs (especialmente erros) aparecem com prefixo `[DEBUG]`

## Troubleshooting

### Logs não aparecem
1. Verifique se o logger.js está carregado no manifest
2. Recarregue a extensão (chrome://extensions/)
3. Abra uma nova aba do popup

### Exportação não funciona
1. Verifique permissão de downloads
2. Tente exportar em CSV em vez de JSON
3. Confira o espaço em disco

### Painel não expande
1. Recarregue o popup (feche e abra novamente)
2. Verifique o console (F12) para erros

## Monitorar em Tempo Real

Para monitorar a execução:
1. Abra o popup da extensão
2. Expanda o painel de debug
3. Inicie a automação - os logs aparecem em tempo real
4. Filtre por erros para investigar problemas rapidamente

## Desenvolvedor

Código adicionado em April 2026 para melhorar observabilidade da automação.
