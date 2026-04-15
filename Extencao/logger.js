/**
 * Sistema centralizado de logging para a extensão SUAP
 * Captura, armazena e gerencia logs em tempo real
 */

class DebugLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 500; // Máximo de logs em memória
        this.listeners = new Set();
        this.maxStorageSize = 1048576; // 1MB limite
        this.loadLogsFromStorage();
    }

    /**
     * Log de nível info
     */
    info(message, data = null) {
        this.log('info', message, data);
    }

    /**
     * Log de nível success
     */
    success(message, data = null) {
        this.log('success', message, data);
    }

    /**
     * Log de nível warning
     */
    warning(message, data = null) {
        this.log('warning', message, data);
    }

    /**
     * Log de nível error
     */
    error(message, data = null) {
        this.log('error', message, data);
        console.error(`[DEBUG] ${message}`, data);
    }

    /**
     * Log de nível debug
     */
    debug(message, data = null) {
        this.log('debug', message, data);
        console.log(`[DEBUG] ${message}`, data);
    }

    /**
     * Registra um log com timestamp, tipo e dados
     */
    log(type, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            type,
            message,
            data,
            timestamp,
            id: Date.now() + Math.random()
        };

        // Adiciona à memória
        this.logs.unshift(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Salva no storage
        this.saveLogsToStorage();

        // Notifica listeners
        this.notifyListeners(logEntry);
    }

    /**
     * Notifica todos os listeners sobre novo log
     */
    notifyListeners(logEntry) {
        this.listeners.forEach(callback => {
            try {
                callback(logEntry);
            } catch (e) {
                console.error('Erro ao notificar listener:', e);
            }
        });
    }

    /**
     * Registra um listener para novos logs
     */
    onLog(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Retorna todos os logs
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * Retorna logs filtrados por tipo
     */
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }

    /**
     * Retorna logs dos últimos N minutos
     */
    getRecentLogs(minutes = 60) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.logs.filter(log => new Date(log.timestamp).getTime() > cutoff);
    }

    /**
     * Retorna apenas erros
     */
    getErrors() {
        return this.getLogsByType('error');
    }

    /**
     * Retorna estatísticas de logs
     */
    getStats() {
        return {
            total: this.logs.length,
            errors: this.getLogsByType('error').length,
            warnings: this.getLogsByType('warning').length,
            success: this.getLogsByType('success').length,
            info: this.getLogsByType('info').length,
            debug: this.getLogsByType('debug').length
        };
    }

    /**
     * Salva logs no storage (limitado a tamanho máximo)
     */
    async saveLogsToStorage() {
        try {
            const data = {
                logs: this.logs.slice(0, 200), // Mantém últimos 200 logs
                timestamp: new Date().toISOString()
            };
            const jsonStr = JSON.stringify(data);

            if (jsonStr.length > this.maxStorageSize) {
                console.warn('Logs excedendo tamanho máximo de storage');
                return;
            }

            await chrome.storage.local.set({ debugLogs: data });
        } catch (e) {
            console.error('Erro ao salvar logs no storage:', e);
        }
    }

    /**
     * Carrega logs do storage
     */
    async loadLogsFromStorage() {
        try {
            const result = await chrome.storage.local.get(['debugLogs']);
            if (result.debugLogs && result.debugLogs.logs) {
                this.logs = result.debugLogs.logs;
            }
        } catch (e) {
            console.error('Erro ao carregar logs do storage:', e);
        }
    }

    /**
     * Exporta logs como JSON
     */
    exportAsJSON() {
        const data = {
            exported: new Date().toISOString(),
            stats: this.getStats(),
            logs: this.logs
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Exporta logs como CSV
     */
    exportAsCSV() {
        const headers = ['Timestamp', 'Tipo', 'Mensagem', 'Dados'];
        const rows = this.logs.map(log => [
            log.timestamp,
            log.type,
            `"${log.message.replace(/"/g, '""')}"`,
            `"${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`
        ]);

        const csv = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        return '\ufeff' + csv; // BOM para UTF-8
    }

    /**
     * Exporta logs como arquivo
     */
    async downloadLogs(format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let content, filename, mimeType;

        if (format === 'csv') {
            content = this.exportAsCSV();
            filename = `suap-debug-logs_${timestamp}.csv`;
            mimeType = 'text/csv;charset=utf-8;';
        } else {
            content = this.exportAsJSON();
            filename = `suap-debug-logs_${timestamp}.json`;
            mimeType = 'application/json;charset=utf-8;';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        await chrome.downloads.download({
            url,
            filename,
            saveAs: true
        });
    }

    /**
     * Limpa todos os logs
     */
    async clear() {
        this.logs = [];
        await chrome.storage.local.remove(['debugLogs']);
        this.notifyListeners({ type: 'cleared', message: 'Logs limpos' });
    }

    /**
     * Gera um relatório de debug
     */
    generateDebugReport() {
        const errors = this.getErrors();
        const recent = this.getRecentLogs(5);

        return {
            timestamp: new Date().toISOString(),
            stats: this.getStats(),
            recentErrors: errors.slice(0, 10),
            recentLogs: recent.slice(0, 20)
        };
    }
}

// Instancia global
const debugLogger = new DebugLogger();

// Expõe para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = debugLogger;
}
