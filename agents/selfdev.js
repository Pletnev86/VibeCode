/**
 * SelfDev Agent - автономный агент для самопрограммирования
 * 
 * Этот модуль отвечает за:
 * - Чтение Vision.md и Roadmap.md
 * - Формирование плана действий для генерации файлов проекта
 * - Генерацию кода через AI Router
 * - Парсинг и сохранение файлов
 * - Логирование всех действий
 * - Анализ существующих проектов из Cursor
 */

const fs = require('fs');
const path = require('path');
const AIRouter = require('../ai/router');
const ProjectAnalyzer = require('../lib/project-analyzer');
const ExecutionLayer = require('../lib/execution-layer');
const FeedbackMechanism = require('../lib/feedback-mechanism');
const DocumentWatcher = require('../lib/document-watcher');

class SelfDevAgent {
  constructor(configPath = './config.json') {
    // Загрузка конфигурации
    this.config = this.loadConfig(configPath);
    this.agentConfig = this.config.agents.selfdev;
    
    // Инициализация AI Router
    this.router = new AIRouter(configPath);
    
    // Пути к документации
    this.visionPath = path.resolve(this.agentConfig.visionPath);
    this.roadmapPath = path.resolve(this.agentConfig.roadmapPath);
    
    // Путь для сохранения файлов
    this.srcPath = path.resolve('./src');
    
    // Логи действий
    this.logs = [];
    
    // Execution Layer для безопасного выполнения
    this.executor = new ExecutionLayer({
      timeout: this.config.execution.timeout,
      isolated: this.config.execution.isolated
    });
    
    // Feedback Mechanism для обратной связи
    this.feedback = new FeedbackMechanism();
    
    // Кеш для Vision и Roadmap (для отслеживания изменений)
    this.visionCache = null;
    this.roadmapCache = null;
    this.lastVisionModified = null;
    this.lastRoadmapModified = null;
    
    // Document Watcher для отслеживания изменений
    this.documentWatcher = new DocumentWatcher(
      this.visionPath,
      this.roadmapPath,
      (type, filePath) => {
        this.log(`📝 Обнаружено изменение в ${type}, перезагружаю контекст...`);
        this.reloadContext();
      }
    );
  }

  /**
   * Загрузка конфигурации
   */
  loadConfig(configPath) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Ошибка загрузки конфигурации:', error.message);
      throw error;
    }
  }

  /**
   * Валидация структуры документа
   */
  validateDocument(content, docType) {
    if (!content || content.length === 0) {
      throw new Error(`${docType} пуст или не найден`);
    }

    // Проверка на минимальную структуру markdown
    const hasHeaders = /^#\s/.test(content.trim());
    if (!hasHeaders) {
      this.log(`⚠️ Предупреждение: ${docType} не содержит заголовков markdown`);
    }

    // Проверка минимальной длины
    if (content.length < 100) {
      this.log(`⚠️ Предупреждение: ${docType} очень короткий (${content.length} символов)`);
    }

    return true;
  }

  /**
   * Проверка изменений в документе
   */
  isDocumentChanged(filePath, lastModified) {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const stats = fs.statSync(filePath);
    const currentTime = stats.mtime.getTime();
    
    // lastModified может быть числом (timestamp) или null
    if (!lastModified) {
      return true; // Первое чтение
    }
    
    // Если lastModified - число, сравниваем напрямую
    const lastTime = typeof lastModified === 'number' ? lastModified : lastModified.getTime();
    return currentTime !== lastTime;
  }

  /**
   * Чтение Vision.md с кешированием и проверкой изменений
   */
  readVision(forceReload = false) {
    try {
      if (!fs.existsSync(this.visionPath)) {
        throw new Error(`Vision.md не найден: ${this.visionPath}`);
      }

      // Проверка изменений
      const stats = fs.statSync(this.visionPath);
      const isChanged = forceReload || this.isDocumentChanged(this.visionPath, this.lastVisionModified);

      if (isChanged || !this.visionCache) {
        const content = fs.readFileSync(this.visionPath, 'utf8');
        this.validateDocument(content, 'Vision.md');
        this.visionCache = content;
        this.lastVisionModified = stats.mtime.getTime();
        this.log('📖 Vision.md перезагружен');
      }

      return this.visionCache;
    } catch (error) {
      console.error('Ошибка чтения Vision.md:', error.message);
      throw error;
    }
  }

  /**
   * Чтение Roadmap.md с кешированием и проверкой изменений
   */
  readRoadmap(forceReload = false) {
    try {
      if (!fs.existsSync(this.roadmapPath)) {
        throw new Error(`Roadmap.md не найден: ${this.roadmapPath}`);
      }

      // Проверка изменений
      const stats = fs.statSync(this.roadmapPath);
      const isChanged = forceReload || this.isDocumentChanged(this.roadmapPath, this.lastRoadmapModified);

      if (isChanged || !this.roadmapCache) {
        const content = fs.readFileSync(this.roadmapPath, 'utf8');
        this.validateDocument(content, 'Roadmap.md');
        this.roadmapCache = content;
        this.lastRoadmapModified = stats.mtime.getTime();
        this.log('📖 Roadmap.md перезагружен');
      }

      return this.roadmapCache;
    } catch (error) {
      console.error('Ошибка чтения Roadmap.md:', error.message);
      throw error;
    }
  }

  /**
   * Перезагрузка контекста (Vision и Roadmap)
   */
  reloadContext() {
    this.log('🔄 Перезагрузка контекста...');
    this.visionCache = null;
    this.roadmapCache = null;
    this.lastVisionModified = null;
    this.lastRoadmapModified = null;
    
    const vision = this.readVision(true);
    const roadmap = this.readRoadmap(true);
    
    this.log('✅ Контекст перезагружен');
    return { vision, roadmap };
  }

  /**
   * Проверка актуальности документов
   */
  checkDocumentsFreshness() {
    const visionChanged = this.isDocumentChanged(this.visionPath, this.lastVisionModified);
    const roadmapChanged = this.isDocumentChanged(this.roadmapPath, this.lastRoadmapModified);
    
    return {
      visionChanged,
      roadmapChanged,
      needsReload: visionChanged || roadmapChanged
    };
  }

  /**
   * Анализ существующего проекта (для импорта из Cursor)
   */
  async analyzeProject(projectPath) {
    try {
      this.log('Анализ проекта:', projectPath);
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      const description = analyzer.generateDescription(analysis);
      
      this.log('Проект проанализирован:', {
        directories: analysis.summary.totalDirectories,
        files: analysis.summary.totalFiles
      });
      
      return {
        analysis,
        description
      };
    } catch (error) {
      this.log('Ошибка анализа проекта:', error.message);
      throw error;
    }
  }

  /**
   * Формирование промпта для генерации файлов на основе Vision и Roadmap
   */
  async generatePrompt(task = null) {
    const vision = this.readVision();
    const roadmap = this.readRoadmap();
    
    let prompt = `Ты - AI агент для самопрограммирования проекта VibeCode.

## Vision проекта:
${vision}

## Roadmap проекта:
${roadmap}

`;

    if (task) {
      prompt += `## Текущая задача:
${task}

`;
    } else {
      prompt += `## Задача:
Создай минимальный рабочий каркас проекта на основе Vision и Roadmap.
Сгенерируй основные файлы:
- src/main.js - точка входа Electron
- src/preload.js - IPC мост
- src/index.html - структура UI
- src/ui.js - логика UI

`;
    }

    prompt += `## Требования:
1. Генерируй полный, рабочий код
2. Используй комментарии на русском языке где уместно
3. Следуй структуре проекта из Roadmap
4. Код должен быть готов к использованию

Сгенерируй файлы в формате:
\`\`\`javascript
src/имя_файла.js
// код файла
\`\`\`

ИЛИ в формате:
\`\`\`src/имя_файла.js
// код файла
\`\`\`

КРИТИЧЕСКИ ВАЖНО: 
- Указывай полный путь к файлу на первой строке внутри блока после языка (например: \`\`\`javascript\nsrc/main.js)
- ИЛИ указывай путь в заголовке блока (например: \`\`\`src/main.js)
- НЕ используй плейсхолдеры типа "filepath" - всегда указывай реальный путь
- Путь должен быть относительно корня проекта (src/main.js, а не /src/main.js или просто main.js)
- Каждый файл должен быть в отдельном блоке кода

Начни генерацию:`;

    return prompt;
  }

  /**
   * Парсинг ответа AI и извлечение файлов
   */
  parseFilesFromResult(response) {
    const files = [];
    
    // Паттерн 1: Блоки с путем в заголовке: ```src/main.js
    const fileBlockPattern = /```([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt))\s*\n([\s\S]*?)```/g;
    
    // Паттерн 2: Блоки с языком, где путь на следующей строке: ```javascript\nsrc/main.js\nкод
    const langBlockPattern = /```(?:javascript|js|html|css|json|typescript|ts|python|py|java|cpp|c|h|txt|markdown|md)\s*\n\s*([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt))\s*\n([\s\S]*?)```/g;
    
    // Паттерн 3: Упоминания файлов в тексте перед блоками
    const filePathPattern = /(?:file|файл|path|путь|создаю|создам)[:\s]+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt))/gi;
    
    let match;
    const foundPaths = new Set();
    
    // Поиск 1: Блоки с путем в заголовке
    while ((match = fileBlockPattern.exec(response)) !== null) {
      const filePath = match[1].trim();
      const codeBlock = match[2].trim();
      
      // Нормализуем путь
      let normalizedPath = this.normalizePath(filePath);
      
      if (normalizedPath && codeBlock.length > 0) {
        files.push({
          path: normalizedPath,
          content: codeBlock
        });
        foundPaths.add(normalizedPath);
      }
    }
    
    // Поиск 2: Блоки с языком, где путь на первой строке
    while ((match = langBlockPattern.exec(response)) !== null) {
      const filePath = match[1].trim();
      const codeBlock = match[2].trim();
      
      // Нормализуем путь
      let normalizedPath = this.normalizePath(filePath);
      
      if (normalizedPath && codeBlock.length > 10) {
        if (!foundPaths.has(normalizedPath)) {
          files.push({
            path: normalizedPath,
            content: codeBlock
          });
          foundPaths.add(normalizedPath);
        }
      }
    }
    
    // Поиск 3: Если не нашли файлы, ищем упоминания путей перед блоками
    if (files.length === 0) {
      const codeBlockPattern = /```[\w]*\s*\n([\s\S]*?)```/g;
      let blockMatch;
      while ((blockMatch = codeBlockPattern.exec(response)) !== null) {
        const codeBlock = blockMatch[1].trim();
        const beforeBlock = response.substring(0, blockMatch.index);
        
        // Ищем путь перед блоком
        const pathMatch = beforeBlock.match(/(?:file|файл|path|путь|создаю|создам)[:\s]+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt))/i);
        
        if (pathMatch && codeBlock.length > 10) {
          let filePath = pathMatch[1].trim();
          let normalizedPath = this.normalizePath(filePath);
          
          if (normalizedPath && !foundPaths.has(normalizedPath)) {
            files.push({
              path: normalizedPath,
              content: codeBlock
            });
            foundPaths.add(normalizedPath);
          }
        }
      }
    }
    
    // Поиск 4: Если все еще не нашли, ищем упоминания путей в тексте
    if (files.length === 0) {
      while ((match = filePathPattern.exec(response)) !== null) {
        const filePath = match[1].trim();
        let normalizedPath = this.normalizePath(filePath);
        
        if (normalizedPath && !foundPaths.has(normalizedPath)) {
          // Пытаемся найти код после упоминания файла
          const afterMatch = response.substring(match.index + match[0].length);
          const codeMatch = afterMatch.match(/```[\s\S]*?```/);
          
          files.push({
            path: normalizedPath,
            content: codeMatch ? codeMatch[0].replace(/```[\w]*\s*\n?/g, '').trim() : ''
          });
          foundPaths.add(normalizedPath);
        }
      }
    }
    
    return files;
  }

  /**
   * Нормализация пути к файлу
   */
  normalizePath(filePath) {
    if (!filePath || filePath.length < 3) {
      return null;
    }
    
    // Пропускаем плейсхолдеры
    if (filePath.toLowerCase() === 'filepath' || filePath.toLowerCase() === 'path') {
      return null;
    }
    
    let normalized = filePath.trim();
    
    // Убираем ведущий /
    if (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    
    // Исправляем двойной src/src/
    if (normalized.startsWith('src/src/')) {
      normalized = normalized.substring(4);
    }
    
    // Убираем начальный src/ если он есть (файлы будут сохранены в srcPath)
    if (normalized.startsWith('src/')) {
      normalized = normalized.substring(4);
    }
    
    // Убираем пробелы и переносы строк
    normalized = normalized.replace(/[\r\n]/g, '').trim();
    
    return normalized.length >= 3 ? normalized : null;
  }

  /**
   * Сохранение файлов в директорию src
   */
  saveFiles(files) {
    const savedFiles = [];
    
    // Создаем директорию src если её нет
    if (!fs.existsSync(this.srcPath)) {
      fs.mkdirSync(this.srcPath, { recursive: true });
      this.log('Создана директория:', this.srcPath);
    }
    
    files.forEach(file => {
      try {
        const fullPath = path.join(this.srcPath, file.path);
        const dir = path.dirname(fullPath);
        
        // Создаем директории если нужно
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Сохраняем файл
        fs.writeFileSync(fullPath, file.content, 'utf8');
        savedFiles.push(fullPath);
        this.log('Файл сохранен:', fullPath);
      } catch (error) {
        this.log('Ошибка сохранения файла:', file.path, error.message);
      }
    });
    
    return savedFiles;
  }

  /**
   * Логирование действий
   */
  log(...args) {
    const timestamp = new Date().toISOString();
    const message = args.join(' ');
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry);
    this.logs.push(logEntry);
    
    // Сохранение логов в файл
    try {
      const logPath = path.join(this.srcPath, '..', 'logs');
      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
      }
      
      const logFile = path.join(logPath, `selfdev-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
    } catch (error) {
      console.warn('Не удалось сохранить лог:', error.message);
    }
  }

  /**
   * Основной метод для генерации каркаса проекта (улучшенный pipeline)
   */
  async generateProject(task = null) {
    const startTime = Date.now();
    
    try {
      this.log('=== Начало генерации проекта ===');
      
      // Этап 1: Чтение Vision и Roadmap
      this.log('📖 Этап 1: Чтение Vision и Roadmap...');
      const vision = this.readVision();
      const roadmap = this.readRoadmap();
      this.log('✅ Vision и Roadmap прочитаны');
      
      // Этап 2: Классификация задачи
      this.log('🔍 Этап 2: Классификация задачи...');
      const taskType = task ? this.router.classifyTask(task) : 'general';
      const selectedModel = this.router.selectModel(taskType);
      this.log(`✅ Тип задачи: ${taskType}, Модель: ${selectedModel}`);
      
      // Этап 3: Формирование промпта
      this.log('📝 Этап 3: Формирование промпта для AI...');
      const prompt = await this.generatePrompt(task);
      
      // Этап 4: Отправка запроса к AI (с автоматическим переводом если нужно)
      this.log('🤖 Этап 4: Отправка запроса к AI Router...');
      const response = await this.router.sendRequest(prompt, {
        temperature: 0.7,
        max_tokens: 4000
      });
      
      this.log('✅ Ответ от AI получен, длина:', response.length);
      
      // Этап 5: Парсинг файлов из ответа
      this.log('🔧 Этап 5: Парсинг файлов из ответа...');
      const files = this.parseFilesFromResult(response);
      this.log('✅ Найдено файлов:', files.length);
      
      if (files.length === 0) {
        this.log('⚠️ Файлы не найдены в ответе. Сохраняю полный ответ для анализа.');
        const debugPath = path.join(this.srcPath, '..', 'debug-response.txt');
        await this.executor.writeFile(debugPath, response);
        this.log('Полный ответ сохранен в:', debugPath);
      }
      
      // Этап 6: Сохранение файлов через Execution Layer
      this.log('💾 Этап 6: Сохранение файлов...');
      const savedFiles = [];
      for (const file of files) {
        try {
          const savedPath = await this.executor.writeFile(
            path.join(this.srcPath, file.path),
            file.content
          );
          savedFiles.push(savedPath);
          this.log('  ✅ Сохранен:', file.path);
        } catch (error) {
          this.log('  ❌ Ошибка сохранения:', file.path, error.message);
        }
      }
      this.log('✅ Сохранено файлов:', savedFiles.length);
      
      // Этап 7: Регистрация результата в Feedback Mechanism
      const executionTime = Date.now() - startTime;
      const result = {
        success: true,
        filesGenerated: files.length,
        filesSaved: savedFiles.length,
        savedFiles: savedFiles,
        logs: this.logs,
        executionTime: executionTime
      };
      
      this.feedback.recordTask(task || 'Self-Build', result, executionTime);
      
      this.log('=== Генерация проекта завершена ===');
      this.log(`⏱️ Время выполнения: ${executionTime}ms`);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log('❌ Ошибка генерации проекта:', error.message);
      this.log('Stack:', error.stack);
      
      // Регистрация ошибки в Feedback Mechanism
      this.feedback.recordError(task || 'Self-Build', error, {
        executionTime: executionTime
      });
      
      throw error;
    }
  }

  /**
   * Получение логов
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Запуск отслеживания изменений документов
   */
  startWatchingDocuments() {
    this.documentWatcher.startWatching();
  }

  /**
   * Остановка отслеживания изменений документов
   */
  stopWatchingDocuments() {
    this.documentWatcher.stopWatching();
  }

  /**
   * Получение internal prompt для загрузки реальных Vision и Roadmap
   */
  getInternalPrompt() {
    return `Загрузите реальные Vision и Roadmap. 
После их получения SelfDev Agent начнёт самопрограммирование проекта.

Текущие пути к документам:
- Vision: ${this.visionPath}
- Roadmap: ${this.roadmapPath}

Система готова к приёму актуальных документов и автоматически перезагрузит контекст при их изменении.`;
  }
}

module.exports = SelfDevAgent;

