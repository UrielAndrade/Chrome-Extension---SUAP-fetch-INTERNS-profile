/**
 * SUAPDataExtractor - Extrator de dados de estagiários e estágios do SUAP
 *
 * Extrai dados estruturados de duas fontes principais:
 * 1. Página de listagem: #result_list (tabela com múltiplos registros)
 * 2. Página de detalhes: table.info (pares label-value)
 *
 * Baseado na análise dos HTMLs em Base_scrap/
 */

class SUAPDataExtractor {
    constructor() {
        this.data = [];
        this.fieldMappings = {
            // Mapeamento de labels encontrados nos table.info para chaves estruturadas
            'Situação': 'situacao',
            'Estagiário': 'estagiario',
            'Representante IFRO': 'representanteIfro',
            'Obrigatório': 'obrigatorio',
            'Turno': 'turno',
            'Convênio': 'convenio',
            'Remunerada': 'remunerada',
            'Tipo de Remuneração': 'tipoRemuneracao',
            'Valor (R$)': 'valor',
            'Auxílio Transporte (R$)': 'auxilioTransporte',
            'Outros Benefícios (R$)': 'outrosBeneficios',
            'Descrição de Outros Benefícios': 'descricaoBeneficios',
            'Data de Início': 'dataInicio',
            'Data Prevista para Encerramento': 'dataPrevistFim',
            'Data do Encerramento / Entrega da Pasta': 'dataEncerramento',
            'C.H. Semanal': 'cargaHorariaSemanal',
            'Nome da Seguradora': 'nomeSeguradora',
            'Número da Apólice do Seguro': 'numeroApolice',
            'Nome': 'nomeSupervisor',
            'Telefone': 'telefoneSupervisor',
            'Cargo': 'cargoSupervisor',
            'E-mail': 'emailSupervisor',
            'Observação': 'observacaoSupervisor'
        };
    }

    /**
     * Extrai dados da página de listagem (table#result_list)
     * @returns {Array} Array de objetos com dados de cada estágio
     */
    extractFromListingPage() {
        const rows = [];
        const table = document.querySelector('#result_list');

        if (!table) {
            console.warn('Tabela #result_list não encontrada');
            return rows;
        }

        // Obtém headers
        const headers = [];
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell, index) => {
            if (index > 0) { // Ignora a primeira coluna (#)
                const headerText = cell.textContent.trim();
                headers.push(headerText);
            }
        });

        // Processa cada linha
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = {};

                // Primeira célula contém o link para detalhes
                const firstCell = row.querySelector('th');
                if (firstCell) {
                    const link = firstCell.querySelector('a[href*="change/"], a[href*="/estagios/"]');
                    if (link) {
                        rowData.detailsUrl = link.href;
                        rowData.id = this.extractIdFromUrl(link.href);
                    }
                }

                // Processa células de dados (td)
                const dataCells = row.querySelectorAll('td');
                dataCells.forEach((cell, index) => {
                    if (index < headers.length) {
                        const headerKey = headers[index].toLowerCase().replace(/\s+/g, '_');
                        rowData[headerKey] = cell.textContent.trim();
                    }
                });

                if (Object.keys(rowData).length > 0) {
                    rows.push(rowData);
                }
            }
        });

        return rows;
    }

    /**
     * Extrai dados da página de detalhes (table.info)
     * Usa o DOM atual da página
     * @returns {Object} Objeto com todos os dados extraídos
     */
    extractFromDetailPage() {
        const data = {};

        // Encontra todas as tables com class="info"
        const infoTables = document.querySelectorAll('table.info');

        infoTables.forEach((table) => {
            const rows = table.querySelectorAll('tbody tr');

            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');

                // Processa pares label-value
                // Estrutura: [label], [value], [label], [value] ou apenas [label], [value]
                for (let i = 0; i < cells.length; i++) {
                    const cellText = cells[i].textContent.trim();
                    const label = cellText.replace(':', '');

                    // Se encontra um label mapeado, processa
                    if (this.fieldMappings[label] && i + 1 < cells.length) {
                        const nextCell = cells[i + 1];
                        let value = nextCell.textContent.trim();

                        // Remove badges de status (e.g., "Sim", "Não" dentro de span.status)
                        const statusSpan = nextCell.querySelector('span.status');
                        if (statusSpan) {
                            value = statusSpan.textContent.trim();
                        }

                        // Remove parênteses com IDs
                        value = value.replace(/\s*\([^)]*\)/g, '').trim();

                        const key = this.fieldMappings[label];
                        data[key] = value || '-';
                    }
                }
            });
        });

        return data;
    }

    /**
     * Extrai HTML como string e processa
     * Para uso em conteúdo recebido via fetch/message
     * @param {string} htmlString - Conteúdo HTML
     * @returns {Object} Dados extraídos
     */
    extractFromDetailPageHTML(htmlString) {
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = htmlString;

        const data = {};
        const tables = tempContainer.querySelectorAll('table.info');

        tables.forEach((table) => {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');

                for (let i = 0; i < cells.length; i++) {
                    const cellText = cells[i].textContent.trim();
                    const label = cellText.replace(':', '');

                    if (this.fieldMappings[label] && i + 1 < cells.length) {
                        let value = cells[i + 1].textContent.trim();
                        value = value.replace(/\s*\([^)]*\)/g, '').trim();

                        const key = this.fieldMappings[label];
                        data[key] = value || '-';
                    }
                }
            });
        });

        return data;
    }

    /**
     * Extrai ID ou matrícula da URL
     * @param {string} url - URL do estágio ou aluno
     * @returns {string} ID extraído
     */
    extractIdFromUrl(url) {
        const match = url.match(/\/(\d+)\/?(?:change|\/)?$/);
        return match ? match[1] : '';
    }

    /**
     * Extrai dados completos da página atual (listagem ou detalhes)
     * @returns {Array|Object} Dados extraídos (array para listagem, objeto para detalhes)
     */
    extractComprehensiveData() {
        // Detecta qual tipo de página está
        const isListingPage = !!document.querySelector('#result_list');
        const isDetailPage = !!document.querySelector('table.info');

        if (isListingPage) {
            return this.extractFromListingPage();
        } else if (isDetailPage) {
            return this.extractFromDetailPage();
        } else {
            console.warn('Nenhuma estrutura esperada encontrada na página');
            return [];
        }
    }

    /**
     * Formata dados como CSV com escape adequado
     * @param {Array} dataArray - Array de objetos com dados
     * @returns {string} CSV formatado com BOM UTF-8
     */
    formatAsCSV(dataArray) {
        if (!dataArray || dataArray.length === 0) return '';

        // Garante que é sempre um array
        const data = Array.isArray(dataArray) ? dataArray : [dataArray];

        // Coleta todas as chaves possíveis
        const allKeys = new Set();
        data.forEach(row => {
            if (typeof row === 'object' && row !== null) {
                Object.keys(row).forEach(key => allKeys.add(key));
            }
        });

        const headers = Array.from(allKeys).sort();
        const lines = [];

        // Linha de headers
        lines.push(headers.map(h => `"${h}"`).join(';'));

        // Linhas de dados
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header] || '';
                // Escapa valores especiais para CSV
                value = String(value)
                    .replace(/"/g, '""')  // Duplica aspas para escape
                    .replace(/\n/g, ' ') // Newline → espaço
                    .replace(/\r/g, ' ') // Carriage return → espaço
                    .replace(/;/g, ',');  // Ponto-vírgula → vírgula (caso necessário)
                return `"${value}"`;
            });
            lines.push(values.join(';'));
        });

        return lines.join('\n');
    }

    /**
     * Dispara download do CSV
     * @param {Array|Object} dataArray - Dados a exportar
     * @param {string} filename - Nome do arquivo (opcional)
     */
    async downloadAsCSV(dataArray, filename = null) {
        const csv = this.formatAsCSV(Array.isArray(dataArray) ? dataArray : [dataArray]);

        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `estagiarios_suap_${timestamp}.csv`;
        }

        // Cria blob com BOM UTF-8 para compatibilidade com Excel
        const blob = new Blob(['\ufeff' + csv], {
            type: 'text/csv;charset=utf-8;'
        });

        // Usa chrome.downloads API se disponível (em content script)
        if (typeof chrome !== 'undefined' && chrome.downloads) {
            const url = URL.createObjectURL(blob);
            try {
                await chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: true
                });
            } catch (e) {
                console.error('Erro ao usar chrome.downloads:', e);
                this._fallbackDownload(blob, filename);
            }
        } else {
            // Fallback: link element (para ambiente de página)
            this._fallbackDownload(blob, filename);
        }
    }

    /**
     * Fallback para download quando chrome.downloads não está disponível
     * @private
     */
    _fallbackDownload(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Extrai headers da tabela de listagem
     * @returns {Array} Array com nomes dos headers
     */
    getListingHeaders() {
        const headers = [];
        const headerCells = document.querySelectorAll('#result_list thead th');
        headerCells.forEach((cell, index) => {
            if (index > 0) {
                headers.push(cell.textContent.trim());
            }
        });
        return headers;
    }

    /**
     * Obtém estatísticas dos dados extraídos
     * @returns {Object} Contagem e resumo dos dados
     */
    getStatistics(data) {
        if (!Array.isArray(data)) {
            return {
                type: 'detail',
                fields: Object.keys(data).length,
                fieldNames: Object.keys(data)
            };
        }

        return {
            type: 'listing',
            totalRows: data.length,
            fieldsPerRow: data.length > 0 ? Object.keys(data[0]).length : 0,
            fieldNames: data.length > 0 ? Object.keys(data[0]) : []
        };
    }
}
