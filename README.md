# SUAP - Coletor de Estagiários PRO

Extensão Chrome (Manifest V3) para coletar dados de estagiários no SUAP de forma automatizada, com navegação entre páginas da listagem e entrada em cada perfil.

## Funcionalidades

- Coleta automática de todos os estagiários da listagem (incluindo paginação).
- Navegação automática em cada perfil para extração de campos detalhados.
- Três modos de coleta:
	- `fast`: coleta somente os dados visíveis na listagem/perfil.
	- `complete`: coleta detalhada padrão.
	- `super`: coleta detalhada + campos brutos identificados na página.
- Controles de execução:
	- Iniciar
	- Pausar
	- Continuar
	- Resetar estado/dados
- Exportação para CSV com `;` como separador e BOM UTF-8 (compatível com Excel).
- Progresso em tempo real no popup (itens processados, estimativa e log de atividade).
- Reprocessamento automático em caso de erro (até 2 tentativas por registro).

## Estrutura do projeto

- `manifest.json`: configuração da extensão e permissões.
- `background.js`: orquestra toda a automação e exportação CSV.
- `content.js`: utilitários de leitura de informações da página.
- `popup.html`: interface do popup.
- `popup.css`: estilos da interface.
- `popup.js`: lógica da UI e comunicação com o service worker.

## Requisitos

- Google Chrome (ou navegador Chromium compatível com extensões MV3).
- Acesso ao domínio do SUAP:
	- `https://suap.ifro.edu.br/*`

## Instalação (modo desenvolvedor)

1. Abra o Chrome em `chrome://extensions/`.
2. Ative o modo desenvolvedor.
3. Clique em `Carregar sem compactação`.
4. Selecione a pasta deste projeto (`SUAP-estagios`).

## Como usar

1. Entre no SUAP e abra a listagem de estágios em uma URL com:
	 - `/admin/estagios/praticaprofissional`
2. Abra o popup da extensão.
3. Escolha o modo de coleta (`fast`, `complete` ou `super`).
4. Clique em `Iniciar Automação`.
5. Acompanhe o progresso pelo log e pela barra de progresso.
6. Ao finalizar, clique em `Exportar CSV`.

## Formato da saída

O CSV é gerado com nome no padrão:

- `estagiarios_suap_YYYY-MM-DDTHH-mm-ss-sssZ.csv`

Os campos podem variar conforme o que estiver disponível no perfil, por exemplo:

- `matricula`, `nome`, `curso`, `status`
- `emailAcademico`, `emailPessoal`, `email`
- `cpf`, `telefone`
- `concedente`, `supervisor`, `orientador`
- `dataInicio`, `dataTermino`/`dataFim`
- `cargaHoraria`, `bolsa`, `auxilioTransporte`
- `camposBrutos` e `tituloPagina` (modo `super`)

## Permissões utilizadas

- `activeTab`: atuar na aba ativa do SUAP.
- `scripting`: executar scripts para extração de dados.
- `storage`: persistir estado da automação e dados coletados.
- `downloads`: salvar o arquivo CSV.
- `tabs`: navegar entre páginas/perfis durante a coleta.
- `host_permissions` em `https://suap.ifro.edu.br/*`: limitar atuação ao domínio do SUAP.

## Comportamento importante

- A automação só inicia se a aba ativa estiver na listagem de estágios do SUAP.
- Ao concluir, a aba volta para a URL inicial da listagem (página 1 normalizada).
- Não feche o navegador durante a execução.

## Limitações conhecidas

- Alterações no HTML do SUAP podem exigir ajustes nos seletores de extração.
- Campos não padronizados podem aparecer vazios no CSV.
- A performance depende da latência da rede e do tempo de carregamento das páginas.

## Solução de problemas

- `Abra a listagem de estágios do SUAP para iniciar.`
	- Verifique se a URL contém `/admin/estagios/praticaprofissional`.
- `Não há dados para exportar.`
	- Execute a coleta antes de exportar.
- Coleta lenta
	- Use o modo `fast` para reduzir a profundidade de extração.

## Versão

- `2.0.0`
