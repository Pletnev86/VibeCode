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
const BackupManager = require('../lib/backup-manager');
const TemplateSelector = require('../lib/template-selector');
const RulesManager = require('../lib/rules-manager');
const StateManager = require('../lib/state-manager');
const { getLogger } = require('../lib/logger');

// Инициализация логгера для SelfDev Agent
const logger = getLogger();

class SelfDevAgent {
  constructor(configPath = './config.json') {
    // Загрузка конфигурации
    this.config = this.loadConfig(configPath);
    this.agentConfig = this.config.agents.selfdev;
    
    // Инициализация AI Router
    this.router = new AIRouter(configPath);
    
    // Пути к документации (с fallback на альтернативные пути)
    this.visionPath = this.findDocumentPath(this.agentConfig.visionPath || './docs/Vision.md', [
      './docs/Vision.md',
      './Vision.md',
      './docs/ru/Vision.md',
      './docs/en/Vision.md'
    ]);
    this.roadmapPath = this.findDocumentPath(this.agentConfig.roadmapPath || './docs/Roadmap.md', [
      './docs/Roadmap.md',
      './Roadmap.md',
      './docs/ru/Roadmap.md',
      './ROADMAP_DORABOTKA.md'
    ]);
    
    // Путь для сохранения файлов
    this.srcPath = path.resolve('./src');
    
    // Логи действий
    this.logs = [];
    
    // Менеджер резервных копий
    this.backupManager = new BackupManager();
    
    // Селектор шаблонов
    this.templateSelector = new TemplateSelector();
    
    // Менеджер правил проекта
    this.rulesManager = new RulesManager(null, null);
    this.rulesManager.loadAllRules().catch(error => {
      logger.warn('Ошибка загрузки правил', null, error);
    });
    
    // Execution Layer для безопасного выполнения
    this.executor = new ExecutionLayer({
      timeout: this.config.execution.timeout,
      isolated: this.config.execution.isolated
    });
    
    // Feedback Mechanism для обратной связи
    this.feedback = new FeedbackMechanism();
    
    // State Manager для сохранения прогресса
    this.stateManager = new StateManager();
    
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
        logger.info(`Обнаружено изменение в ${type}, перезагружаю контекст`, { filePath });
        this.log(`📝 Обнаружено изменение в ${type}, перезагружаю контекст...`);
        this.reloadContext();
      }
    );
  }

  /**
   * Поиск документа по списку возможных путей
   */
  findDocumentPath(primaryPath, fallbackPaths = []) {
    // Проверяем основной путь
    const resolvedPrimary = path.resolve(primaryPath);
    if (fs.existsSync(resolvedPrimary)) {
      return resolvedPrimary;
    }
    
    // Проверяем альтернативные пути
    for (const fallbackPath of fallbackPaths) {
      const resolvedFallback = path.resolve(fallbackPath);
      if (fs.existsSync(resolvedFallback)) {
        logger.info(`Документ найден по альтернативному пути: ${fallbackPath} (вместо ${primaryPath})`);
        return resolvedFallback;
      }
    }
    
    // Если не найден, возвращаем основной путь (будет ошибка при чтении)
    logger.warn(`Документ не найден ни по одному из путей: ${primaryPath}, ${fallbackPaths.join(', ')}`);
    return resolvedPrimary;
  }

  /**
   * Загрузка конфигурации
   */
  loadConfig(configPath) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      logger.error('Ошибка загрузки конфигурации', error);
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
      logger.error('Ошибка чтения Vision.md', error);
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
      logger.error('Ошибка чтения Roadmap.md', error);
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
   * Автономная разработка по этапам Roadmap
   * Читает Roadmap и выполняет задачи по этапам
   */
  async developAutonomously() {
    try {
      this.log('🚀 Начало автономной разработки по Roadmap...');
      
      const roadmap = this.readRoadmap();
      
      // Парсинг этапов из Roadmap
      const stages = this.parseRoadmapStages(roadmap);
      
      this.log(`📋 Найдено этапов: ${stages.length}`);
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        this.log(`\n📌 Этап ${i + 1}/${stages.length}: ${stage.name}`);
        this.log(`📝 Описание: ${stage.description.substring(0, 100)}...`);
        
        // Генерация задач для этапа
        const tasks = await this.generateTasksForStage(stage);
        this.log(`✅ Сгенерировано задач: ${tasks.length}`);
        
        // Выполнение задач этапа
        for (const task of tasks) {
          try {
            this.log(`\n🔄 Выполнение задачи: ${task.substring(0, 50)}...`);
            const result = await this.generateProject(task);
            this.log(`✅ Задача выполнена, создано файлов: ${result.files?.length || 0}`);
            
            // Небольшая задержка между задачами
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            this.log(`❌ Ошибка выполнения задачи: ${error.message}`);
            // Продолжаем со следующей задачей
          }
        }
        
        this.log(`\n✅ Этап ${i + 1} завершен`);
      }
      
      this.log('\n🎉 Автономная разработка завершена!');
      return {
        success: true,
        stagesCompleted: stages.length,
        logs: this.logs
      };
      
    } catch (error) {
      this.log(`❌ Ошибка автономной разработки: ${error.message}`);
      throw error;
    }
  }

  /**
   * Парсинг этапов из Roadmap
   */
  parseRoadmapStages(roadmap) {
    const stages = [];
    
    // Поиск этапов по заголовкам (## 🚀 1. MVP, ## ⚡ 2. Версия v0.2, и т.д.)
    const stagePattern = /##\s+[🚀⚡🧪🏆]+\s+(\d+)\.\s+(.+?)\n\n([\s\S]*?)(?=##\s+[🚀⚡🧪🏆]+\s+\d+\.|$)/g;
    
    let match;
    while ((match = stagePattern.exec(roadmap)) !== null) {
      const stageNumber = match[1];
      const stageName = match[2].trim();
      const stageContent = match[3].trim();
      
      // Извлечение описания (первый абзац после заголовка)
      const descriptionMatch = stageContent.match(/###\s+🎯\s+Цель\s*\n\n(.+?)(?=\n\n|###)/s);
      const description = descriptionMatch ? descriptionMatch[1].trim() : stageContent.substring(0, 200);
      
      // Извлечение шагов (### 📌 Шаги MVP, ### 🔥 Новое в версии, и т.д.)
      const stepsMatch = stageContent.match(/###\s+[📌🔥✨🏆]+\s+(.+?)\s*\n\n([\s\S]*?)(?=###|$)/s);
      const steps = stepsMatch ? stepsMatch[2].trim() : '';
      
      stages.push({
        number: parseInt(stageNumber),
        name: stageName,
        description: description,
        content: stageContent,
        steps: steps
      });
    }
    
    return stages;
  }

  /**
   * Генерация задач для этапа
   */
  async generateTasksForStage(stage) {
    const vision = this.readVision();
    
    const prompt = `Ты - AI агент для планирования разработки.

## Vision проекта:
${vision.substring(0, 1000)}

## Текущий этап:
${stage.name}

## Описание этапа:
${stage.description}

## Шаги этапа:
${stage.steps.substring(0, 2000)}

## Задача:
Создай список конкретных задач для выполнения этого этапа.
Каждая задача должна быть конкретной и выполнимой.
Верни список задач в формате:
1. Задача 1
2. Задача 2
3. Задача 3

Начни генерацию задач:`;

    try {
      const result = await this.router.sendRequest(prompt, {
        taskType: 'reasoning',
        useOpenRouter: false,
        model: 'deepseek'
      });
      
      // Преобразуем результат в нужный формат
      const response = typeof result === 'string' ? result : (result.response || result);
      
      if (!result || !result.response) {
        return [];
      }
      
      // Парсинг задач из ответа
      const tasks = [];
      const lines = result.response.split('\n');
      
      for (const line of lines) {
        const taskMatch = line.match(/^\d+\.\s+(.+)$/);
        if (taskMatch) {
          tasks.push(taskMatch[1].trim());
        }
      }
      
      return tasks.length > 0 ? tasks : [stage.name];
    } catch (error) {
      this.log(`⚠️ Ошибка генерации задач для этапа: ${error.message}`);
      // Возвращаем базовую задачу
      return [stage.name];
    }
  }

  /**
   * Формирование промпта для генерации файлов на основе Vision и Roadmap
   */
  async generatePrompt(task = null, template = null, templateInstructions = null) {
    const vision = this.readVision();
    const roadmap = this.readRoadmap();
    
    let prompt = `Ты - AI агент для самопрограммирования проекта VibeCode.

## Vision проекта:
${vision}

## Roadmap проекта:
${roadmap}

`;

    // Добавляем правила проекта
    const rulesText = this.rulesManager.getRulesForPrompt();
    if (rulesText) {
      prompt += rulesText;
    }

    // Добавляем информацию о шаблоне если выбран
    if (template) {
      prompt += `## Шаблон проекта:
Используй шаблон: ${template.name} (${template.type})
Описание: ${template.description}
Технологии: ${template.technologies?.join(', ') || 'не указаны'}

`;
      
      if (templateInstructions) {
        prompt += `## Инструкции по запуску из шаблона:
${templateInstructions}

`;
      }
      
      if (template.setup && template.setup.commands) {
        prompt += `## Команды для запуска:
${template.setup.commands.map(cmd => `- ${cmd}`).join('\n')}

`;
      }
    }

    if (task) {
      prompt += `## Текущая задача:
${task}

`;
    } else {
      prompt += `## Задача:
Создай минимальный рабочий каркас проекта на основе Vision и Roadmap.
${template ? `Используй шаблон "${template.name}" как основу.` : ''}
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
    
    // Поиск 2.5: Блоки с языком, где путь в комментарии на первой строке (// src/main.js или # src/main.js)
    const commentPathPattern = /```(?:javascript|js|html|css|json|typescript|ts|python|py|java|cpp|c|h|txt|markdown|md)\s*\n\s*(?:\/\/|#)\s*([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt))\s*\n([\s\S]*?)```/g;
    while ((match = commentPathPattern.exec(response)) !== null) {
      const filePath = match[1].trim();
      const codeBlock = match[2].trim();
      
      // Убираем комментарий с путем из начала кода
      const cleanCode = codeBlock.replace(/^(?:\/\/|#)\s*[\w\/\\\.\-]+\.\w+\s*\n?/m, '').trim();
      
      let normalizedPath = this.normalizePath(filePath);
      
      if (normalizedPath && cleanCode.length > 10) {
        if (!foundPaths.has(normalizedPath)) {
          files.push({
            path: normalizedPath,
            content: cleanCode
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
    const logEntry = {
      timestamp: timestamp,
      message: message
    };
    
    // Используем централизованный логгер
    logger.info(message, { agent: 'SelfDev' });
    
    // Сохраняем в локальный массив для обратной совместимости
    this.logs.push(logEntry);
  }

  /**
   * Основной метод для генерации каркаса проекта (улучшенный pipeline)
   */
  async generateProject(task = null, options = {}) {
    const startTime = Date.now();
    let backupCreated = false;
    
    // Проверяем сохраненное состояние
    const savedState = this.stateManager.loadState();
    const shouldResume = savedState && savedState.inProgress && !options.forceNew;
    
    try {
      if (shouldResume) {
        this.log('🔄 Восстановление предыдущей сессии Self-Build...');
        this.log(`📊 Этап: ${savedState.currentStage || 'неизвестен'}`);
        this.log(`📁 Сгенерировано файлов: ${savedState.filesGenerated?.length || 0}`);
        this.log(`💾 Сохранено файлов: ${savedState.filesSaved?.length || 0}`);
        
        // Предлагаем продолжить или начать заново
        if (options.resume !== false) {
          this.log('✅ Продолжаем с сохраненного состояния');
        } else {
          this.log('🆕 Начинаем новую генерацию');
          this.stateManager.clearState();
        }
      } else {
        this.log('=== Начало генерации проекта ===');
        // Сохраняем начальное состояние
        this.stateManager.saveState({
          inProgress: true,
          task: task,
          options: options,
          currentStage: 'initialization',
          startTime: startTime
        });
      }
      
      // Этап 0: Создание резервной копии перед изменениями
      if (fs.existsSync(this.srcPath) && !shouldResume) {
        this.log('💾 Создание резервной копии перед изменениями...');
        await this.backupManager.createBackup(this.srcPath, `pre-selfbuild-${Date.now()}`);
        backupCreated = true;
        this.log('✅ Резервная копия создана');
      }
      
      // Этап 1: Чтение Vision и Roadmap
      this.log('📖 Этап 1: Чтение Vision и Roadmap...');
      this.stateManager.updateStage('reading_documents');
      const vision = this.readVision();
      const roadmap = this.readRoadmap();
      this.log('✅ Vision и Roadmap прочитаны');
      
      // Этап 2: Классификация задачи и выбор шаблона
      this.log('🔍 Этап 2: Классификация задачи...');
      this.stateManager.updateStage('classification');
      const taskType = task ? this.router.classifyTask(task) : 'general';
      // Используем модель из options если передана, иначе выбираем автоматически
      const selectedModel = options.openRouterModel || options.model || this.router.selectModel(taskType);
      this.log(`✅ Тип задачи: ${taskType}, Модель: ${selectedModel}`);
      
      // Выбор шаблона на основе задачи
      const selectedTemplate = this.templateSelector.selectTemplate(task);
      let templateInstructions = null;
      if (selectedTemplate) {
        this.log(`📦 Выбран шаблон: ${selectedTemplate.name} (${selectedTemplate.type})`);
        templateInstructions = this.templateSelector.getInstructions(selectedTemplate);
        if (templateInstructions) {
          this.log(`📖 Инструкции по запуску загружены из шаблона`);
        }
      }
      
      // Этап 3: Формирование промпта
      this.log('📝 Этап 3: Формирование промпта для AI...');
      this.stateManager.updateStage('prompt_generation');
      const prompt = await this.generatePrompt(task, selectedTemplate, templateInstructions);
      
      // Этап 4: Отправка запроса к AI (с автоматическим переводом если нужно)
      this.log('🤖 Этап 4: Отправка запроса к AI Router...');
      this.stateManager.updateStage('ai_request');
      // Объединяем опции из параметров с опциями из options
      const requestOptions = {
        temperature: 0.7,
        max_tokens: 4000,
        ...options // Передаем опции из UI (useOpenRouter, openRouterModel и т.д.)
      };
      const response = await this.router.sendRequest(prompt, requestOptions);
      
      this.log('✅ Ответ от AI получен, длина:', response.length);
      
      // Этап 5: Парсинг файлов из ответа
      this.log('🔧 Этап 5: Парсинг файлов из ответа...');
      this.stateManager.updateStage('parsing_files');
      const files = this.parseFilesFromResult(response);
      this.log('✅ Найдено файлов:', files.length);
      
      // Сохраняем найденные файлы в состояние
      for (const file of files) {
        this.stateManager.addGeneratedFile(file.path, file.content);
      }
      
      if (files.length === 0) {
        this.log('⚠️ Файлы не найдены в ответе. Сохраняю полный ответ для анализа.');
        const debugPath = path.join(this.srcPath, '..', 'debug-response.txt');
        await this.executor.writeFile(debugPath, response);
        this.log('Полный ответ сохранен в:', debugPath);
      }
      
      // Этап 6: Сохранение файлов через Execution Layer
      this.log('💾 Этап 6: Сохранение файлов...');
      this.stateManager.updateStage('saving_files');
      const savedFiles = [];
      for (const file of files) {
        try {
          const savedPath = await this.executor.writeFile(
            path.join(this.srcPath, file.path),
            file.content
          );
          savedFiles.push(savedPath);
          this.stateManager.markFileSaved(file.path);
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
      
      // Сохраняем финальное состояние
      this.stateManager.saveState({
        inProgress: false,
        completed: true,
        task: task,
        currentStage: 'completed',
        filesGenerated: files.map(f => f.path),
        filesSaved: savedFiles,
        executionTime: executionTime,
        completedAt: Date.now()
      });
      
      this.log('=== Генерация проекта завершена ===');
      this.log(`⏱️ Время выполнения: ${executionTime}ms`);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log('❌ Ошибка генерации проекта:', error.message);
      this.log('Stack:', error.stack);
      
      // Автоматический откат при ошибке
      if (backupCreated) {
        try {
          this.log('🔄 Автоматический откат изменений из резервной копии...');
          await this.backupManager.restoreBackup();
          this.log('✅ Изменения откачены из резервной копии');
        } catch (restoreError) {
          this.log('⚠️ Ошибка отката изменений:', restoreError.message);
          logger.error('Ошибка отката изменений', restoreError);
        }
      }
      
      // Сохраняем состояние ошибки для возможности восстановления
      this.stateManager.saveState({
        inProgress: true, // Оставляем inProgress=true для возможности восстановления
        error: true,
        errorMessage: error.message,
        errorStack: error.stack,
        task: task,
        currentStage: 'error',
        executionTime: executionTime,
        errorAt: Date.now()
      });
      
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

