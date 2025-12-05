/**
 * Module Enhancer - агент для анализа задач и доработки модулей системы
 * 
 * Этот модуль отвечает за:
 * - Анализ задачи пользователя
 * - Определение модулей, которые нужно доработать
 * - Генерацию улучшений для модулей
 * - Безопасное применение изменений
 * - Сохранение улучшений в базу знаний
 */

const fs = require('fs');
const path = require('path');
const AIRouter = require('../ai/router');
const ExecutionLayer = require('../lib/execution-layer');

class ModuleEnhancer {
  constructor(configPath = './config.json', knowledgeBase = null) {
    this.configPath = configPath;
    this.knowledgeBase = knowledgeBase;
    this.router = new AIRouter(configPath);
    this.executor = new ExecutionLayer({
      timeout: 30000,
      isolated: true
    });
    
    // Карта модулей системы
    this.modules = {
      'ai/router.js': {
        name: 'AI Router',
        description: 'Маршрутизация запросов между AI провайдерами',
        path: './ai/router.js',
        category: 'core'
      },
      'agents/selfdev.js': {
        name: 'SelfDev Agent',
        description: 'Агент для самопрограммирования',
        path: './agents/selfdev.js',
        category: 'agent'
      },
      'lib/knowledge-base.js': {
        name: 'Knowledge Base',
        description: 'База знаний на SQLite',
        path: './lib/knowledge-base.js',
        category: 'core'
      },
      'lib/project-analyzer.js': {
        name: 'Project Analyzer',
        description: 'Анализ структуры проектов',
        path: './lib/project-analyzer.js',
        category: 'core'
      },
      'lib/execution-layer.js': {
        name: 'Execution Layer',
        description: 'Безопасное выполнение команд',
        path: './lib/execution-layer.js',
        category: 'core'
      },
      'src/main.js': {
        name: 'Main Process',
        description: 'Главный процесс Electron',
        path: './src/main.js',
        category: 'ui'
      },
      'src/ui.js': {
        name: 'UI Logic',
        description: 'Логика пользовательского интерфейса',
        path: './src/ui.js',
        category: 'ui'
      }
    };
  }

  /**
   * Анализ задачи и определение модулей для доработки
   */
  async analyzeTask(taskDescription) {
    console.log('🔍 Анализ задачи:', taskDescription);
    
    // Формируем промпт для анализа
    const analysisPrompt = this.generateAnalysisPrompt(taskDescription);
    
    // Отправляем запрос к ИИ
    const analysis = await this.router.sendRequest(analysisPrompt, {
      model: 'deepseek', // Используем DeepSeek для анализа
      useOpenRouter: false
    });
    
    // Парсим ответ
    const parsedAnalysis = this.parseAnalysis(analysis, taskDescription);
    
    return parsedAnalysis;
  }

  /**
   * Генерация промпта для анализа задачи
   */
  generateAnalysisPrompt(taskDescription) {
    const modulesList = Object.entries(this.modules)
      .map(([key, module]) => `- ${key}: ${module.name} - ${module.description}`)
      .join('\n');

    return `Проанализируй задачу и определи, какие модули системы нужно доработать.

Задача: ${taskDescription}

Доступные модули системы:
${modulesList}

Ответь в формате JSON:
{
  "affectedModules": ["путь/к/модулю.js", ...],
  "changes": [
    {
      "module": "путь/к/модулю.js",
      "description": "описание изменений",
      "priority": "high|medium|low",
      "type": "add|modify|refactor"
    }
  ],
  "dependencies": ["модули, от которых зависят изменения"],
  "risks": ["потенциальные риски"],
  "testing": "что нужно протестировать"
}

Будь конкретным и точным.`;
  }

  /**
   * Парсинг ответа анализа
   */
  parseAnalysis(analysisText, taskDescription) {
    try {
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          task: taskDescription,
          ...parsed,
          rawAnalysis: analysisText
        };
      }
    } catch (error) {
      console.warn('Не удалось распарсить JSON из анализа:', error.message);
    }

    // Fallback: простой анализ
    return {
      task: taskDescription,
      affectedModules: this.simpleModuleDetection(taskDescription),
      changes: [],
      rawAnalysis: analysisText
    };
  }

  /**
   * Простое определение модулей по ключевым словам
   */
  simpleModuleDetection(taskDescription) {
    const taskLower = taskDescription.toLowerCase();
    const affected = [];

    if (taskLower.includes('ai') || taskLower.includes('модель') || taskLower.includes('router')) {
      affected.push('ai/router.js');
    }
    if (taskLower.includes('ui') || taskLower.includes('интерфейс') || taskLower.includes('чат')) {
      affected.push('src/ui.js');
    }
    if (taskLower.includes('база') || taskLower.includes('knowledge') || taskLower.includes('sql')) {
      affected.push('lib/knowledge-base.js');
    }
    if (taskLower.includes('selfdev') || taskLower.includes('саморазработка')) {
      affected.push('agents/selfdev.js');
    }

    return affected.length > 0 ? affected : ['ai/router.js']; // По умолчанию
  }

  /**
   * Генерация улучшений для модуля
   */
  async enhanceModule(modulePath, changeDescription) {
    console.log(`🔧 Доработка модуля: ${modulePath}`);
    
    // Читаем текущий код модуля
    const currentCode = this.readModule(modulePath);
    if (!currentCode) {
      throw new Error(`Модуль ${modulePath} не найден`);
    }

    // Формируем промпт для генерации улучшений
    const enhancementPrompt = this.generateEnhancementPrompt(modulePath, currentCode, changeDescription);
    
    // Отправляем запрос к ИИ
    const enhancedCode = await this.router.sendRequest(enhancementPrompt, {
      model: 'falcon', // Используем Falcon для генерации кода
      useOpenRouter: false
    });

    // Парсим улучшенный код
    const parsedCode = this.parseCodeResponse(enhancedCode, currentCode);
    
    return parsedCode;
  }

  /**
   * Генерация промпта для улучшения модуля
   */
  generateEnhancementPrompt(modulePath, currentCode, changeDescription) {
    const module = this.modules[modulePath] || { name: path.basename(modulePath) };

    return `Доработай модуль системы согласно задаче.

Модуль: ${modulePath}
Название: ${module.name}
Описание: ${module.description || 'Нет описания'}

Текущий код модуля:
\`\`\`javascript
${currentCode.substring(0, 5000)} // Ограничение для промпта
\`\`\`

Задача доработки: ${changeDescription}

Требования:
1. Сохрани всю существующую функциональность
2. Добавь только необходимые изменения
3. Следуй стилю кода модуля
4. Добавь комментарии к новому коду
5. Убедись, что код работает корректно

Верни полный код модуля с улучшениями в формате:
\`\`\`javascript
// Полный код модуля
\`\`\`

Если изменения небольшие, можешь показать только измененные части в формате diff.`;
  }

  /**
   * Парсинг ответа с кодом
   */
  parseCodeResponse(response, currentCode) {
    // Пытаемся извлечь код из markdown блоков
    const codeBlockMatch = response.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Если нет блоков, пытаемся найти diff
    if (response.includes('@@') || response.includes('+++') || response.includes('---')) {
      // Это diff формат, нужно применить патч
      return this.applyDiff(currentCode, response);
    }

    // Если ничего не найдено, возвращаем весь ответ
    return response;
  }

  /**
   * Применение diff патча (упрощенная версия)
   */
  applyDiff(currentCode, diffText) {
    // Упрощенная реализация - в будущем можно использовать библиотеку для diff
    // Пока просто возвращаем текущий код с предупреждением
    console.warn('⚠️ Diff формат не полностью поддерживается, требуется ручная проверка');
    return currentCode;
  }

  /**
   * Чтение модуля
   */
  readModule(modulePath) {
    try {
      const fullPath = path.resolve(modulePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf8');
      }
      return null;
    } catch (error) {
      console.error(`Ошибка чтения модуля ${modulePath}:`, error.message);
      return null;
    }
  }

  /**
   * Безопасное сохранение улучшенного модуля
   */
  async saveEnhancedModule(modulePath, newCode, createBackup = true) {
    const fullPath = path.resolve(modulePath);
    
    // Создаем бэкап
    if (createBackup && fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      fs.copyFileSync(fullPath, backupPath);
      console.log(`💾 Создан бэкап: ${backupPath}`);
    }

    // Сохраняем новый код
    await this.executor.writeFile(fullPath, newCode);
    console.log(`✅ Модуль ${modulePath} обновлен`);

    // Сохраняем в базу знаний
    if (this.knowledgeBase) {
      try {
        this.knowledgeBase.saveMethod(
          `Улучшение: ${path.basename(modulePath)}`,
          `Доработка модуля ${modulePath}`,
          newCode,
          'enhancement',
          ['module', 'enhancement', path.basename(modulePath)]
        );
      } catch (error) {
        console.warn('Не удалось сохранить в базу знаний:', error.message);
      }
    }

    return true;
  }

  /**
   * Основной метод для доработки модулей по задаче
   */
  async enhanceModulesByTask(taskDescription) {
    console.log('🚀 Начало доработки модулей по задаче:', taskDescription);

    // 1. Анализируем задачу
    const analysis = await this.analyzeTask(taskDescription);
    console.log('📊 Анализ завершен:', analysis.affectedModules);

    const results = {
      task: taskDescription,
      analysis: analysis,
      enhancedModules: [],
      errors: []
    };

    // 2. Дорабатываем каждый модуль
    for (const change of analysis.changes || []) {
      try {
        console.log(`🔧 Доработка: ${change.module}`);
        
        // Генерируем улучшения
        const enhancedCode = await this.enhanceModule(change.module, change.description);
        
        // Сохраняем улучшенный модуль
        await this.saveEnhancedModule(change.module, enhancedCode);
        
        results.enhancedModules.push({
          module: change.module,
          status: 'success',
          description: change.description
        });
      } catch (error) {
        console.error(`❌ Ошибка доработки ${change.module}:`, error.message);
        results.errors.push({
          module: change.module,
          error: error.message
        });
      }
    }

    // Если нет изменений в анализе, но есть затронутые модули
    if (analysis.changes.length === 0 && analysis.affectedModules.length > 0) {
      for (const modulePath of analysis.affectedModules) {
        try {
          console.log(`🔧 Доработка: ${modulePath}`);
          const enhancedCode = await this.enhanceModule(modulePath, taskDescription);
          await this.saveEnhancedModule(modulePath, enhancedCode);
          
          results.enhancedModules.push({
            module: modulePath,
            status: 'success',
            description: taskDescription
          });
        } catch (error) {
          results.errors.push({
            module: modulePath,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Логирование действий
   */
  log(...args) {
    const timestamp = new Date().toISOString();
    const message = args.join(' ');
    console.log(`[${timestamp}] ${message}`);
  }
}

module.exports = ModuleEnhancer;



