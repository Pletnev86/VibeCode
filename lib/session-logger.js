/**
 * Session Logger - управление сессионными логами
 * 
 * Функционал:
 * - Хранение логов текущей сессии в памяти
 * - Очистка при запуске новой сессии
 * - Сохранение в общий лог при закрытии приложения
 * - Разделение логов: интерфейс (сессия) и файл (общий)
 */

const fs = require('fs');
const path = require('path');

class SessionLogger {
  constructor(logger) {
    this.logger = logger; // Основной logger для записи в файл
    this.sessionLogs = []; // Логи текущей сессии в памяти
    this.sessionStartTime = new Date();
    this.sessionId = this.sessionStartTime.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Файл для общего лога всех сессий
    this.generalLogFile = path.join(this.logger.systemLogsDir, 'vibecode-general.log');
    
    // Перехватываем логи из основного logger
    this.interceptLogger();
  }
  
  /**
   * Перехват логов из основного logger
   */
  interceptLogger() {
    const originalLog = this.logger.log.bind(this.logger);
    const self = this;
    
    // Переопределяем метод log для перехвата
    this.logger.log = function(level, message, data = null, error = null) {
      // Вызываем оригинальный метод для записи в файл
      const result = originalLog(level, message, data, error);
      
      // Добавляем в сессионные логи
      const sessionLog = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message,
        data: data,
        error: error ? {
          message: error.message,
          stack: error.stack
        } : null,
        sessionId: self.sessionId
      };
      
      self.sessionLogs.push(sessionLog);
      
      return result;
    };
  }
  
  /**
   * Получение логов текущей сессии
   */
  getSessionLogs(limit = 100) {
    // Возвращаем последние N логов сессии
    return this.sessionLogs.slice(-limit);
  }
  
  /**
   * Очистка логов текущей сессии (при запуске новой сессии)
   */
  clearSession() {
    // Сохраняем текущую сессию перед очисткой (если есть логи)
    if (this.sessionLogs.length > 0) {
      this.saveSessionToGeneralLog();
    }
    
    // Очищаем сессионные логи
    this.sessionLogs = [];
    this.sessionStartTime = new Date();
    this.sessionId = this.sessionStartTime.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }
  
  /**
   * Сохранение логов сессии в общий лог файл
   */
  saveSessionToGeneralLog() {
    if (this.sessionLogs.length === 0) {
      return;
    }
    
    try {
      const sessionEndTime = new Date();
      const sessionDuration = sessionEndTime - this.sessionStartTime;
      
      // Формируем запись о сессии
      const sessionHeader = {
        timestamp: new Date().toISOString(),
        type: 'session',
        sessionId: this.sessionId,
        sessionStart: this.sessionStartTime.toISOString(),
        sessionEnd: sessionEndTime.toISOString(),
        duration: `${(sessionDuration / 1000).toFixed(2)} сек`,
        logCount: this.sessionLogs.length,
        message: `=== Сессия ${this.sessionId} ===`
      };
      
      // Формируем все логи сессии
      const sessionData = [
        JSON.stringify(sessionHeader),
        ...this.sessionLogs.map(log => JSON.stringify(log)),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'session',
          sessionId: this.sessionId,
          message: `=== Конец сессии ${this.sessionId} ===`
        })
      ].join('\n') + '\n';
      
      // Записываем в общий лог файл
      fs.appendFileSync(this.generalLogFile, sessionData, 'utf8');
      
      // Логируем сохранение сессии
      this.logger.info(`Сессия ${this.sessionId} сохранена в общий лог`, {
        logCount: this.sessionLogs.length,
        duration: `${(sessionDuration / 1000).toFixed(2)} сек`
      });
      
    } catch (error) {
      console.error('Ошибка сохранения сессии в общий лог:', error);
    }
  }
  
  /**
   * Получение логов из общего файла (для анализа проблем)
   */
  getGeneralLogs(limit = 1000) {
    try {
      if (!fs.existsSync(this.generalLogFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.generalLogFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: line,
              raw: true
            };
          }
        });
    } catch (error) {
      console.error('Ошибка чтения общего лога:', error);
      return [];
    }
  }
  
  /**
   * Получение информации о сессии
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStartTime.toISOString(),
      logCount: this.sessionLogs.length,
      duration: `${((new Date() - this.sessionStartTime) / 1000).toFixed(2)} сек`
    };
  }
}

module.exports = SessionLogger;

