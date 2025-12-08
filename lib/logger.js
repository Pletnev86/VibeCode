/**
 * Централизованная система логирования
 * 
 * Функционал:
 * - Уровни логирования (error, warn, info, debug)
 * - Сохранение логов в файлы с ротацией
 * - Полная информация об ошибках (файл, строка, стек)
 * - Структурированные логи с timestamp
 * - Автоматическая очистка старых логов
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Уровни логирования
 */
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Класс Logger для централизованного логирования
 */
class Logger {
  constructor(options = {}) {
    // Определяем корневую директорию проекта
    this.projectRoot = this.findProjectRoot();
    
    // Директория для системных логов VibeCode
    this.systemLogsDir = path.join(this.projectRoot, 'logs', 'system');
    
    // Директория для логов проектов
    this.projectLogsDir = path.join(this.projectRoot, 'logs', 'projects');
    
    // Создаем директории для логов если их нет
    if (!fs.existsSync(this.systemLogsDir)) {
      fs.mkdirSync(this.systemLogsDir, { recursive: true });
    }
    if (!fs.existsSync(this.projectLogsDir)) {
      fs.mkdirSync(this.projectLogsDir, { recursive: true });
    }
    
    // Старая директория для обратной совместимости
    this.logsDir = path.join(this.projectRoot, 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Текущий проект (для разделения логов)
    this.currentProject = options.currentProject || null;
    
    // Минимальный уровень логирования (по умолчанию INFO)
    this.minLevel = options.minLevel || LogLevel.INFO;
    
    // Максимальный размер файла лога (10MB)
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    
    // Количество файлов для ротации (5 файлов)
    this.maxFiles = options.maxFiles || 5;
    
    // Включить вывод в консоль
    this.consoleOutput = options.consoleOutput !== false;
    
    // Включить сохранение в файл
    this.fileOutput = options.fileOutput !== false;
    
    // Текущий файл лога (системный)
    this.currentLogFile = this.getLogFileName('system');
    
    // Кодировка для Windows
    this.encoding = 'utf8';
    
    // База знаний для сохранения логов (опционально)
    this.knowledgeBase = null;
    this.initKnowledgeBase();
    
    // Инициализация кодировки консоли для Windows
    this.initConsoleEncoding();
  }
  
  /**
   * Установка текущего проекта для разделения логов
   */
  setCurrentProject(projectPath) {
    this.currentProject = projectPath;
    // Обновляем файл лога для проекта
    if (projectPath) {
      const projectName = path.basename(projectPath);
      this.currentProjectLogFile = this.getLogFileName('project', projectName);
    } else {
      this.currentProjectLogFile = null;
    }
  }
  
  /**
   * Инициализация базы знаний для сохранения логов
   */
  initKnowledgeBase() {
    try {
      const KnowledgeBase = require('./knowledge-base');
      this.knowledgeBase = new KnowledgeBase();
      if (!this.knowledgeBase.available) {
        this.knowledgeBase = null;
      }
    } catch (error) {
      // База знаний недоступна, работаем только с файлами
      this.knowledgeBase = null;
    }
  }

  /**
   * Поиск корневой директории проекта
   */
  findProjectRoot() {
    let currentDir = __dirname;
    
    // Поднимаемся вверх пока не найдем package.json с name: "vibecode"
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name === 'vibecode') {
            return currentDir;
          }
        } catch (error) {
          // Игнорируем ошибки парсинга
        }
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Если не нашли, используем директорию lib
    return path.dirname(__dirname);
  }

  /**
   * Инициализация кодировки консоли для Windows
   */
  initConsoleEncoding() {
    if (process.platform === 'win32') {
      try {
        // Устанавливаем кодировку через переменные окружения
        process.env.CHCP = '65001';
      } catch (error) {
        // Игнорируем ошибки
      }
    }
  }

  /**
   * Получение имени файла лога на основе текущей даты
   * @param {string} type - 'system' для системных логов, 'project' для логов проекта
   * @param {string} projectName - имя проекта (только для type='project')
   */
  getLogFileName(type = 'system', projectName = null) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (type === 'project' && projectName) {
      // Логи проекта: logs/projects/project-name-YYYY-MM-DD.log
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
      return path.join(this.projectLogsDir, `${safeProjectName}-${dateStr}.log`);
    } else {
      // Системные логи: logs/system/vibecode-YYYY-MM-DD.log
      return path.join(this.systemLogsDir, `vibecode-${dateStr}.log`);
    }
  }

  /**
   * Получение информации о месте вызова (файл и строка)
   */
  getCallerInfo() {
    const stack = new Error().stack;
    if (!stack) return { file: 'unknown', line: 0 };
    
    const stackLines = stack.split('\n');
    // Пропускаем первые 3 строки (Error, getCallerInfo, log метод)
    // Ищем первый вызов не из logger.js
    for (let i = 3; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (!line.includes('logger.js') && !line.includes('node_modules')) {
        // Извлекаем путь к файлу и номер строки
        const match = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/);
        if (match) {
          const filePath = match[1];
          const lineNumber = match[2];
          // Получаем относительный путь от корня проекта
          const relativePath = path.relative(this.projectRoot, filePath);
          return {
            file: relativePath || path.basename(filePath),
            line: parseInt(lineNumber, 10)
          };
        }
      }
    }
    
    return { file: 'unknown', line: 0 };
  }

  /**
   * Форматирование сообщения лога
   */
  formatMessage(level, message, data = null, error = null) {
    const timestamp = new Date().toISOString();
    const caller = this.getCallerInfo();
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: String(message),
      file: caller.file,
      line: caller.line,
      ...(data && { data }),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };
    
    return logEntry;
  }

  /**
   * Запись в консоль с правильной кодировкой
   */
  writeToConsole(level, formattedMessage) {
    if (!this.consoleOutput) return;
    
    // Для Windows используем только ASCII символы и английский текст
    const isWindows = process.platform === 'win32';
    
    const prefix = `[${formattedMessage.timestamp}] [${formattedMessage.level}]`;
    const location = `${formattedMessage.file}:${formattedMessage.line}`;
    
    // Формируем сообщение только из ASCII символов для Windows
    let message = formattedMessage.message;
    if (isWindows) {
      // Убираем эмодзи и не-ASCII символы для Windows
      message = message.replace(/[^\x00-\x7F]/g, '').trim();
    }
    
    const logLine = `${prefix} ${message} (${location})`;
    
    try {
      if (isWindows) {
        // Используем Buffer для гарантированной UTF-8 кодировки
        // Но выводим только ASCII для избежания кракозябр
        const buffer = Buffer.from(logLine + '\n', 'utf8');
        if (level === LogLevel.ERROR) {
          process.stderr.write(buffer);
        } else {
          process.stdout.write(buffer);
        }
      } else {
        // Для других платформ используем цветной вывод
        const levelColors = {
          [LogLevel.ERROR]: '\x1b[31m', // Красный
          [LogLevel.WARN]: '\x1b[33m',  // Желтый
          [LogLevel.INFO]: '\x1b[36m',  // Голубой
          [LogLevel.DEBUG]: '\x1b[90m'  // Серый
        };
        const resetColor = '\x1b[0m';
        const color = levelColors[level] || '';
        const output = level === LogLevel.ERROR ? console.error : console.log;
        output(`${color}${logLine}${resetColor}`);
      }
      
      // Выводим данные если есть (только для не-Windows или в файл)
      if (formattedMessage.data && !isWindows) {
        const dataStr = JSON.stringify(formattedMessage.data, null, 2);
        console.log(dataStr);
      }
      
      // Выводим ошибку если есть
      if (formattedMessage.error) {
        const errorStr = isWindows 
          ? `Error: ${formattedMessage.error.message}\n${formattedMessage.error.stack}`
          : `Error: ${formattedMessage.error.message}\n${formattedMessage.error.stack}`;
        const buffer = Buffer.from(errorStr + '\n', 'utf8');
        if (isWindows) {
          process.stderr.write(buffer);
        } else {
          console.error(errorStr);
        }
      }
    } catch (error) {
      // Fallback на обычный console.log если что-то пошло не так
      try {
        console.log(logLine);
        if (formattedMessage.data && !isWindows) console.log(formattedMessage.data);
        if (formattedMessage.error) console.error(formattedMessage.error);
      } catch (e) {
        // Игнорируем ошибки вывода
      }
    }
  }

  /**
   * Запись в файл
   */
  writeToFile(formattedMessage) {
    if (!this.fileOutput) return;
    
    try {
      // Определяем тип лога по файлу источника
      const isSystemLog = !formattedMessage.file || 
        formattedMessage.file.startsWith('src/') ||
        formattedMessage.file.startsWith('lib/') ||
        formattedMessage.file.startsWith('ai/') ||
        formattedMessage.file.startsWith('agents/');
      
      let logFile;
      if (isSystemLog || !this.currentProject) {
        // Системный лог
        logFile = this.currentLogFile;
      } else {
        // Лог проекта
        if (!this.currentProjectLogFile) {
          const projectName = path.basename(this.currentProject);
          this.currentProjectLogFile = this.getLogFileName('project', projectName);
        }
        logFile = this.currentProjectLogFile;
      }
      
      // Проверяем размер файла и делаем ротацию если нужно
      this.rotateLogIfNeeded(logFile);
      
      // Форматируем как JSON строку
      const logLine = JSON.stringify(formattedMessage) + '\n';
      
      // Записываем в файл
      fs.appendFileSync(logFile, logLine, this.encoding);
      
      // Также сохраняем в БД если доступна
      if (this.knowledgeBase && this.knowledgeBase.available) {
        try {
          this.knowledgeBase.saveLog(
            formattedMessage.level,
            formattedMessage.message,
            formattedMessage.file,
            formattedMessage.line,
            formattedMessage.data
          );
        } catch (dbError) {
          // Игнорируем ошибки БД, чтобы не ломать логирование
          console.warn('Не удалось сохранить лог в БД:', dbError.message);
        }
      }
    } catch (error) {
      // Если не удалось записать в файл, выводим в консоль
      console.error('Ошибка записи в лог файл:', error.message);
    }
  }

  /**
   * Ротация логов при превышении размера
   * @param {string} logFile - путь к файлу лога (опционально)
   */
  rotateLogIfNeeded(logFile = null) {
    try {
      const fileToCheck = logFile || this.currentLogFile;
      if (!fileToCheck || !fs.existsSync(fileToCheck)) return;
      
      const stats = fs.statSync(fileToCheck);
      if (stats.size >= this.maxFileSize) {
        // Переименовываем существующие файлы
        for (let i = this.maxFiles - 1; i >= 1; i--) {
          const oldFile = `${fileToCheck}.${i}`;
          const newFile = `${fileToCheck}.${i + 1}`;
          if (fs.existsSync(oldFile)) {
            fs.renameSync(oldFile, newFile);
          }
        }
        
        // Переименовываем текущий файл
        fs.renameSync(fileToCheck, `${fileToCheck}.1`);
        
        // Создаем новый файл
        if (logFile && logFile.includes('projects')) {
          // Для проектов
          const projectName = path.basename(this.currentProject);
          this.currentProjectLogFile = this.getLogFileName('project', projectName);
        } else {
          // Для системных
          this.currentLogFile = this.getLogFileName('system');
        }
      }
    } catch (error) {
      console.error('Ошибка ротации логов:', error.message);
    }
  }

  /**
   * Проверка уровня логирования
   */
  shouldLog(level) {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Основной метод логирования
   */
  log(level, message, data = null, error = null) {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, data, error);
    
    // Записываем в консоль
    this.writeToConsole(level, formattedMessage);
    
    // Записываем в файл
    this.writeToFile(formattedMessage);
    
    return formattedMessage;
  }

  /**
   * Логирование ошибки
   */
  error(message, error = null, data = null) {
    return this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Логирование предупреждения
   */
  warn(message, data = null) {
    return this.log(LogLevel.WARN, message, data);
  }

  /**
   * Логирование информации
   */
  info(message, data = null) {
    return this.log(LogLevel.INFO, message, data);
  }

  /**
   * Логирование отладки
   */
  debug(message, data = null) {
    return this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Очистка старых логов (старше N дней)
   */
  cleanOldLogs(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      
      files.forEach(file => {
        if (file.startsWith('vibecode-') && file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;
          
          if (age > maxAge) {
            fs.unlinkSync(filePath);
            this.info(`Удален старый лог файл: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Ошибка очистки старых логов', error);
    }
  }

  /**
   * Получение последних N записей из лога
   */
  getRecentLogs(count = 100) {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.currentLogFile, this.encoding);
      const lines = content.split('\n').filter(line => line.trim());
      const logs = lines
        .slice(-count)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return null;
          }
        })
        .filter(log => log !== null);
      
      return logs;
    } catch (error) {
      this.error('Ошибка чтения логов', error);
      return [];
    }
  }

  /**
   * Перехват всех выводов в консоль и сохранение в лог
   */
  interceptConsole() {
    const self = this;
    
    // Сохраняем оригинальные методы
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    const originalConsoleLog = console.log.bind(console);
    const originalConsoleError = console.error.bind(console);
    const originalConsoleWarn = console.warn.bind(console);
    const originalConsoleInfo = console.info.bind(console);
    
    // Перехватываем stdout
    process.stdout.write = function(chunk, encoding, callback) {
      try {
        const message = chunk.toString('utf8');
        if (message.trim()) {
          // Сохраняем в лог как INFO
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: message.trim(),
            file: 'console',
            line: 0,
            source: 'stdout'
          };
          self.writeToFile(logEntry);
        }
      } catch (error) {
        // Игнорируем ошибки перехвата
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };
    
    // Перехватываем stderr
    process.stderr.write = function(chunk, encoding, callback) {
      try {
        const message = chunk.toString('utf8');
        if (message.trim()) {
          // Сохраняем в лог как ERROR
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: message.trim(),
            file: 'console',
            line: 0,
            source: 'stderr'
          };
          self.writeToFile(logEntry);
        }
      } catch (error) {
        // Игнорируем ошибки перехвата
      }
      return originalStderrWrite(chunk, encoding, callback);
    };
    
    // Перехватываем console.log
    console.log = function(...args) {
      try {
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
        ).join(' ');
        if (message.trim()) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: message.trim(),
            file: 'console',
            line: 0,
            source: 'console.log'
          };
          self.writeToFile(logEntry);
        }
      } catch (error) {
        // Игнорируем ошибки перехвата
      }
      return originalConsoleLog(...args);
    };
    
    // Перехватываем console.error
    console.error = function(...args) {
      try {
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
        ).join(' ');
        if (message.trim()) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: message.trim(),
            file: 'console',
            line: 0,
            source: 'console.error'
          };
          self.writeToFile(logEntry);
        }
      } catch (error) {
        // Игнорируем ошибки перехвата
      }
      return originalConsoleError(...args);
    };
    
    // Перехватываем console.warn
    console.warn = function(...args) {
      try {
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
        ).join(' ');
        if (message.trim()) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'WARN',
            message: message.trim(),
            file: 'console',
            line: 0,
            source: 'console.warn'
          };
          self.writeToFile(logEntry);
        }
      } catch (error) {
        // Игнорируем ошибки перехвата
      }
      return originalConsoleWarn(...args);
    };
    
    // Перехватываем console.info
    console.info = function(...args) {
      try {
        const message = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
        ).join(' ');
        if (message.trim()) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: message.trim(),
            file: 'console',
            line: 0,
            source: 'console.info'
          };
          self.writeToFile(logEntry);
        }
      } catch (error) {
        // Игнорируем ошибки перехвата
      }
      return originalConsoleInfo(...args);
    };
  }
}

// Создаем глобальный экземпляр логгера
let globalLogger = null;

/**
 * Получение глобального экземпляра логгера
 */
function getLogger(options = {}) {
  if (!globalLogger) {
    globalLogger = new Logger(options);
  }
  return globalLogger;
}

/**
 * Инициализация логгера
 */
function initLogger(options = {}) {
  globalLogger = new Logger(options);
  return globalLogger;
}

module.exports = {
  Logger,
  LogLevel,
  getLogger,
  initLogger
};

