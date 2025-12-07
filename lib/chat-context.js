/**
 * Chat Context Manager - управление контекстом чата
 * 
 * Этот модуль отвечает за:
 * - Формирование системного промпта с контекстом проекта
 * - Управление историей разговора (краткосрочная память)
 * - Интеграцию с базой знаний (долгосрочная память)
 * - Анализ структуры проекта для контекста
 */

const fs = require('fs');
const path = require('path');
const ContextCache = require('./context-cache');
const { getLogger } = require('./logger');

let logger = null;
function getLoggerInstance() {
  if (!logger) {
    logger = getLogger();
  }
  return logger;
}

class ChatContextManager {
  constructor(projectRoot = null, knowledgeBase = null) {
    this.projectRoot = projectRoot || this.findProjectRoot();
    this.knowledgeBase = knowledgeBase;
    
    // История разговора в памяти (краткосрочная память)
    // Формат: [{ role: 'user'|'ai', message: string, timestamp: Date }]
    this.chatHistory = [];
    this.maxHistoryLength = 10; // Максимум сообщений в истории
    
    // Кэш контекста (файл + память, SQL для остального)
    this.contextCache = new ContextCache(this.projectRoot, knowledgeBase);
    
    // Кеш структуры проекта (для обратной совместимости)
    this.projectStructure = null;
    this.structureCacheTime = null;
    this.structureCacheTTL = 5 * 60 * 1000; // 5 минут
    
    this.logger = getLoggerInstance();
  }

  /**
   * Поиск корня проекта
   */
  findProjectRoot() {
    let currentPath = process.cwd();
    while (currentPath !== path.parse(currentPath).root) {
      if (fs.existsSync(path.join(currentPath, 'package.json'))) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    return process.cwd();
  }

  /**
   * Получение структуры проекта для контекста
   */
  getProjectContext() {
    // Используем ContextCache для кэширования
    try {
      const structure = this.contextCache.getProjectStructure();
      // Сохраняем для обратной совместимости
      this.projectStructure = structure;
      this.structureCacheTime = Date.now();
      return structure;
    } catch (error) {
      this.logger.warn('Ошибка получения структуры проекта', null, error);
      return 'Структура проекта недоступна';
    }
  }

  /**
   * Анализ структуры проекта
   */
  analyzeProjectStructure() {
    const structure = {
      root: this.projectRoot,
      directories: [],
      files: [],
      importantFiles: []
    };

    // Важные файлы и директории для контекста
    const importantPaths = [
      'src',
      'lib',
      'agents',
      'ai',
      'docs',
      'package.json',
      'config.json',
      'README.md',
      'Vision.md',
      'Roadmap.md'
    ];

    // Анализируем структуру
    this.scanDirectory(this.projectRoot, structure, 0, 2); // Максимум 2 уровня вложенности

    // Формируем текстовое описание
    let description = `Корень проекта: ${this.projectRoot}\n\n`;
    
    description += 'Основные директории:\n';
    structure.directories.forEach(dir => {
      description += `- ${dir}\n`;
    });

    description += '\nВажные файлы:\n';
    structure.importantFiles.forEach(file => {
      description += `- ${file.path} (${file.description || 'файл'})\n`;
    });

    // Детальная структура src/ директории
    description += '\n📁 Структура директории src/:\n';
    // Нормализуем пути для Windows (заменяем обратные слеши на прямые)
    const normalizePath = (p) => p.replace(/\\/g, '/');
    const srcFiles = structure.files.filter(f => {
      const normalized = normalizePath(f);
      return normalized.startsWith('src/');
    });
    const srcDirs = structure.directories.filter(d => {
      const normalized = normalizePath(d);
      return normalized.startsWith('src/');
    });
    
    // Файлы в корне src/
    const srcRootFiles = srcFiles.filter(f => {
      const normalized = normalizePath(f);
      const relative = normalized.replace('src/', '');
      return !relative.includes('/');
    });
    
    if (srcRootFiles.length > 0) {
      description += '\nФайлы в корне src/:\n';
      srcRootFiles.forEach(file => {
        const normalized = normalizePath(file);
        const fileName = normalized.replace('src/', '');
        description += `  📄 ${fileName}\n`;
      });
    }
    
    // Поддиректории src/ с их файлами
    const srcSubDirs = srcDirs.filter(d => {
      const normalized = normalizePath(d);
      const relative = normalized.replace('src/', '');
      return relative.split('/').length === 1;
    });
    
    srcSubDirs.forEach(subDir => {
      const normalizedSubDir = normalizePath(subDir);
      const dirName = normalizedSubDir.replace('src/', '');
      description += `\n📂 ${normalizedSubDir}/:\n`;
      
      // Файлы в этой поддиректории
      const dirFiles = srcFiles.filter(f => {
        const normalized = normalizePath(f);
        const relative = normalized.replace('src/', '');
        return relative.startsWith(dirName + '/');
      });
      
      if (dirFiles.length > 0) {
        dirFiles.forEach(file => {
          const normalized = normalizePath(file);
          const normalizedSubDirPath = normalizePath(subDir);
          const fileName = normalized.replace(normalizedSubDirPath + '/', '');
          description += `  📄 ${fileName}\n`;
        });
      } else {
        description += `  (нет файлов)\n`;
      }
    });
    
    // Если есть файлы, которые не попали в категории
    const otherSrcFiles = srcFiles.filter(f => {
      const normalized = normalizePath(f);
      const relative = normalized.replace('src/', '');
      return relative.includes('/') && !srcSubDirs.some(dir => {
        const normalizedDir = normalizePath(dir);
        return normalized.startsWith(normalizedDir + '/');
      });
    });
    
    if (otherSrcFiles.length > 0) {
      description += '\nДругие файлы в src/:\n';
      otherSrcFiles.slice(0, 10).forEach(file => {
        description += `  📄 ${file}\n`;
      });
      if (otherSrcFiles.length > 10) {
        description += `  ... и еще ${otherSrcFiles.length - 10} файлов\n`;
      }
    }

    return description;
  }

  /**
   * Рекурсивное сканирование директории
   */
  scanDirectory(dirPath, structure, depth, maxDepth) {
    if (depth > maxDepth) return;

    try {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        // Пропускаем служебные директории
        if (['node_modules', '.git', 'backups', 'logs', 'cache', 'data'].includes(item)) {
          return;
        }

        const fullPath = path.join(dirPath, item);
        const relativePath = path.relative(this.projectRoot, fullPath);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          structure.directories.push(relativePath);
          this.scanDirectory(fullPath, structure, depth + 1, maxDepth);
        } else if (stats.isFile()) {
          structure.files.push(relativePath);
          
          // Определяем важные файлы
          if (item === 'package.json') {
            structure.importantFiles.push({
              path: relativePath,
              description: 'Конфигурация проекта и зависимости'
            });
          } else if (item === 'config.json') {
            structure.importantFiles.push({
              path: relativePath,
              description: 'Конфигурация AI моделей'
            });
          } else if (item.endsWith('.md')) {
            structure.importantFiles.push({
              path: relativePath,
              description: 'Документация'
            });
          }
        }
      });
    } catch (error) {
      // Игнорируем ошибки доступа
    }
  }

  /**
   * Получение истории разговора
   */
  getRecentChatHistory(count = 5) {
    const recent = this.chatHistory.slice(-count);
    
    if (recent.length === 0) {
      return 'История разговора пуста (это начало диалога)';
    }

    let historyText = 'Последние сообщения:\n';
    recent.forEach((entry, index) => {
      const role = entry.role === 'user' ? 'Пользователь' : 'AI';
      const time = new Date(entry.timestamp).toLocaleTimeString();
      historyText += `${index + 1}. [${time}] ${role}: ${entry.message.substring(0, 200)}${entry.message.length > 200 ? '...' : ''}\n`;
    });

    return historyText;
  }

  /**
   * Добавление сообщения в историю
   */
  addToHistory(role, message) {
    this.chatHistory.push({
      role: role,
      message: typeof message === 'string' ? message : String(message),
      timestamp: new Date()
    });

    // Ограничиваем размер истории
    if (this.chatHistory.length > this.maxHistoryLength) {
      this.chatHistory.shift(); // Удаляем самое старое сообщение
    }

    // Сохраняем в базу знаний для долгосрочной памяти
    // (сохранение запроса и ответа происходит в main.js после получения ответа)
  }

  /**
   * Проверка, упоминается ли в сообщении существующий файл
   */
  extractFileMention(message) {
    if (!message || typeof message !== 'string') return null;
    
    // Убираем обратные слеши для Windows
    const normalizedMessage = message.replace(/\\/g, '/');
    
    // Паттерны для поиска упоминаний файлов
    const patterns = [
      /(?:дополни|добавь|измени|обнови|редактируй|доработай|создай|напиши|поменяй|изменяю|редактирую)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/i,
      /(?:в|файл|file)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/i,
      /([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/i
    ];
    
    for (const pattern of patterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match[1]) {
        let filePath = match[1].trim().replace(/\\/g, '/');
        // Нормализуем путь - пробуем найти файл в разных местах
        const possiblePaths = [
          filePath,
          `src/${filePath}`,
          `lib/${filePath}`,
          `agents/${filePath}`
        ];
        
        // Проверяем какой путь существует
        const fs = require('fs');
        const path = require('path');
        for (const possiblePath of possiblePaths) {
          const fullPath = path.join(this.projectRoot, possiblePath);
          if (fs.existsSync(fullPath)) {
            return possiblePath;
          }
        }
        
        // Если не нашли, возвращаем наиболее вероятный путь
        if (!filePath.startsWith('src/') && !filePath.startsWith('./') && !filePath.startsWith('lib/') && !filePath.startsWith('agents/')) {
          return 'src/' + filePath;
        }
        return filePath;
      }
    }
    
    return null;
  }

  /**
   * Чтение существующего файла для контекста
   */
  readExistingFile(filePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Нормализуем путь
      let normalizedPath = filePath.replace(/\\/g, '/');
      
      // Пробуем разные варианты пути
      const possiblePaths = [
        normalizedPath,
        `src/${normalizedPath}`,
        `lib/${normalizedPath}`,
        `agents/${normalizedPath}`
      ];
      
      for (const possiblePath of possiblePaths) {
        const fullPath = path.join(this.projectRoot, possiblePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          this.logger.debug('Файл прочитан для контекста', { path: possiblePath, size: content.length });
          return content;
        }
      }
      
      // Если не нашли, пробуем как есть
      const fullPath = path.join(this.projectRoot, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        this.logger.debug('Файл прочитан для контекста', { path: filePath, size: content.length });
        return content;
      }
      
      this.logger.warn('Файл не найден для чтения', { path: filePath, tried: possiblePaths });
    } catch (error) {
      this.logger.warn('Не удалось прочитать файл для контекста', null, error);
    }
    return null;
  }

  /**
   * Извлечение запросов на чтение файлов из сообщения
   */
  extractFileReadRequests(message) {
    if (!message || typeof message !== 'string') return [];
    
    const requests = [];
    // Паттерны для поиска запросов на чтение файлов
    const patterns = [
      /(?:покажи|покажи содержимое|прочитай|открой|посмотри|просмотри|что в|что находится в|содержимое|код в|код файла)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi,
      /(?:файл|file)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))\s+(?:содержит|имеет|внутри)/gi,
      /(?:в|из)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))\s+(?:находится|есть|содержится)/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        if (match[1]) {
          let filePath = match[1].trim();
          // Нормализуем путь
          if (!filePath.startsWith('src/') && !filePath.startsWith('./') && !filePath.startsWith('lib/')) {
            // Пробуем найти файл в разных местах
            if (filePath.includes('main.js') || filePath.includes('ui.js') || filePath.includes('preload.js')) {
              filePath = 'src/' + filePath.replace(/^src[\/\\]/, '');
            } else if (filePath.includes('logger') || filePath.includes('backup') || filePath.includes('chat-context')) {
              filePath = 'lib/' + filePath.replace(/^lib[\/\\]/, '');
            } else {
              filePath = 'src/' + filePath;
            }
          }
          if (!requests.includes(filePath)) {
            requests.push(filePath);
          }
        }
      }
    });
    
    return requests;
  }

  /**
   * Формирование системного промпта с контекстом
   */
  enhanceChatMessage(userMessage) {
    const projectContext = this.getProjectContext();
    const recentHistory = this.getRecentChatHistory(5);
    const projectRoot = this.projectRoot;
    
    // Проверяем, упоминается ли существующий файл для редактирования
    const mentionedFile = this.extractFileMention(userMessage);
    let existingFileContext = '';
    
    if (mentionedFile) {
      const existingContent = this.readExistingFile(mentionedFile);
      if (existingContent) {
        existingFileContext = `
7. СУЩЕСТВУЮЩИЙ ФАЙЛ (${mentionedFile}):
Текущее содержимое файла:
\`\`\`javascript
${existingContent.substring(0, 2000)}${existingContent.length > 2000 ? '\n... (файл обрезан, показываю первые 2000 символов)' : ''}
\`\`\`

ВАЖНО: Если пользователь просит изменить этот файл, ты ДОЛЖЕН предоставить ПОЛНЫЙ код файла со всеми изменениями, а не только фрагменты!
`;
      }
    }
    
    // Проверяем запросы на чтение файлов
    const fileReadRequests = this.extractFileReadRequests(userMessage);
    let fileReadContext = '';
    
    if (fileReadRequests.length > 0) {
      fileReadContext = '\n8. ЗАПРОШЕННЫЕ ФАЙЛЫ ДЛЯ ПРОСМОТРА:\n';
      fileReadRequests.forEach(filePath => {
        const content = this.readExistingFile(filePath);
        if (content) {
          fileReadContext += `\nФайл: ${filePath}\n`;
          fileReadContext += `\`\`\`javascript\n${content.substring(0, 3000)}${content.length > 3000 ? '\n... (файл обрезан, показываю первые 3000 символов)' : ''}\n\`\`\`\n`;
        } else {
          fileReadContext += `\nФайл: ${filePath} - не найден или недоступен\n`;
        }
      });
    }

    const systemPrompt = `
[СИСТЕМНЫЙ КОНТЕКСТ VibeCode]

Ты - AI ассистент в системе VibeCode - автономной IDE для разработки на основе Electron.

ТВОИ ВОЗМОЖНОСТИ:
1. Сохранение файлов: когда пользователь просит создать/изменить файл, предоставь код в формате:
   \`\`\`src/path/to/file.js
   // код файла
   \`\`\`
   ИЛИ
   \`\`\`javascript
   src/path/to/file.js
   // код файла
   \`\`\`
   Система автоматически сохранит файл на диск.

   КРИТИЧЕСКИ ВАЖНО при редактировании существующих файлов:
   - Если пользователь просит "дополнить", "добавить", "изменить" существующий файл - 
     ты ДОЛЖЕН предоставить ПОЛНЫЙ код файла со всеми изменениями
   - НЕ предоставляй только фрагменты кода - система перезапишет файл полностью
   - Если не знаешь текущее содержимое файла - спроси пользователя или предоставь полный код с изменениями
   - Пример: если пользователь просит "добавь функцию X в main.js" - 
     предоставь ВЕСЬ файл main.js с добавленной функцией X

2. Структура проекта:
${projectContext}

3. История разговора:
${recentHistory}

4. Важные пути:
- Корень проекта: ${projectRoot}
- Исходники: ${path.join(projectRoot, 'src')}
- Библиотеки: ${path.join(projectRoot, 'lib')}
- Агенты: ${path.join(projectRoot, 'agents')}
- Конфигурация: ${path.join(projectRoot, 'config.json')}
- Документация: ${path.join(projectRoot, 'docs')}

5. Формат ответов:
- Всегда указывай полный путь к файлу в блоке кода
- Используй формат: \`\`\`src/main.js\nкод\n\`\`\` или \`\`\`javascript\nsrc/main.js\nкод\n\`\`\`
- НЕ используй плейсхолдеры типа "filepath" или "path/to/file"
- Путь должен быть относительно корня проекта (src/main.js, а не /src/main.js)
- Каждый файл должен быть в отдельном блоке кода

6. Контекст разработки:
- Проект использует Electron для десктопного приложения
- Используется IPC (Inter-Process Communication) между main и renderer процессами
- Есть система агентов для автономной разработки
- Поддерживаются локальные модели (LM Studio) и внешние (OpenRouter)

7. ЧТЕНИЕ ФАЙЛОВ:
- Когда пользователь просит "покажи содержимое файла", "что в файле", "прочитай файл" - 
  система АВТОМАТИЧЕСКИ прочитает файл и добавит его содержимое в этот промпт
- Ты УЖЕ ВИДИШЬ содержимое запрошенных файлов ниже - используй эту информацию для ответа
- НЕ проси пользователя предоставить файл - он уже доступен тебе

8. УДАЛЕНИЕ ФАЙЛОВ:
- Если пользователь просит удалить файл (например: "удали test.js", "удалить файл main.js"), 
  система АВТОМАТИЧЕСКИ удалит файл из сообщения пользователя
- Ты можешь подтвердить удаление, но файл уже будет удален системой
- НЕ говори что файл удален, если его нет в запросе пользователя
- Если файл не найден, сообщи об этом пользователю

${existingFileContext}${fileReadContext}
[КОНЕЦ КОНТЕКСТА]

Запрос пользователя: ${userMessage}
`;

    return systemPrompt;
  }

  /**
   * Очистка истории
   */
  clearHistory() {
    this.chatHistory = [];
    this.logger.info('История разговора очищена');
  }

  /**
   * Получение полной истории (для отладки)
   */
  getFullHistory() {
    return this.chatHistory;
  }

  /**
   * Обновление структуры проекта (принудительно)
   */
  refreshProjectStructure() {
    this.projectStructure = null;
    this.structureCacheTime = null;
    return this.getProjectContext();
  }
}

module.exports = ChatContextManager;

