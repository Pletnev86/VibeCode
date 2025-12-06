/**
 * InterAgent Controller - маршрутизация между различными агентами
 * 
 * Этот модуль отвечает за:
 * - Определение типа задачи и выбор подходящего агента
 * - Маршрутизацию задач между агентами
 * - Передачу контекста между агентами
 * - Управление очередью задач
 */

const SelfDevAgent = require('./selfdev');
const RefactorAgent = require('./refactor');
const FixAgent = require('./fix');
const ExplainAgent = require('./explain');

class InterAgentController {
  constructor(configPath = './config.json') {
    this.configPath = configPath;
    this.agents = {
      selfdev: null,
      refactor: null,
      fix: null,
      explain: null,
      // Будущие агенты (будут добавлены позже)
      // patch: null,
      // autocomplete: null,
      // pcControl: null
    };
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * Инициализация агентов
   */
  async init() {
    try {
      // Инициализация SelfDev Agent
      this.agents.selfdev = new SelfDevAgent(this.configPath);
      
      // Инициализация Refactor Agent
      try {
        this.agents.refactor = new RefactorAgent(this.configPath);
        console.log('✅ Refactor Agent инициализирован');
      } catch (error) {
        console.error('⚠️ Ошибка инициализации Refactor Agent:', error.message);
      }
      
      // Инициализация Fix Agent
      try {
        this.agents.fix = new FixAgent(this.configPath);
        console.log('✅ Fix Agent инициализирован');
      } catch (error) {
        console.error('⚠️ Ошибка инициализации Fix Agent:', error.message);
      }
      
      // Инициализация Explain Agent
      try {
        this.agents.explain = new ExplainAgent(this.configPath);
        console.log('✅ Explain Agent инициализирован');
      } catch (error) {
        console.error('⚠️ Ошибка инициализации Explain Agent:', error.message);
      }
      
      console.log('✅ InterAgent Controller инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации агентов:', error.message);
      throw error;
    }
  }

  /**
   * Определение типа задачи для выбора агента
   */
  determineTaskType(task) {
    const taskLower = task.toLowerCase();
    
    // Ключевые слова для определения типа задачи
    const selfdevKeywords = ['создать', 'сгенерировать', 'построить', 'разработать', 'create', 'generate', 'build', 'develop', 'self-build', 'selfbuild'];
    const refactorKeywords = ['рефакторинг', 'рефакторить', 'улучшить', 'оптимизировать', 'refactor', 'improve', 'optimize'];
    const fixKeywords = ['исправить', 'починить', 'баг', 'ошибка', 'fix', 'bug', 'error', 'repair'];
    const patchKeywords = ['патч', 'обновить', 'patch', 'update', 'upgrade'];
    const autocompleteKeywords = ['дополнить', 'автодополнение', 'autocomplete', 'complete'];
    const pcControlKeywords = ['управление', 'клавиатура', 'мышь', 'окно', 'control', 'keyboard', 'mouse', 'window'];
    
    if (selfdevKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'selfdev';
    }
    if (refactorKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'refactor';
    }
    if (fixKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'fix';
    }
    if (patchKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'patch';
    }
    if (autocompleteKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'autocomplete';
    }
    if (pcControlKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'pc-control';
    }
    
    // По умолчанию - selfdev
    return 'selfdev';
  }

  /**
   * Добавление задачи в очередь
   */
  addTask(task, context = {}) {
    const taskType = this.determineTaskType(task);
    const taskItem = {
      id: Date.now() + Math.random(),
      task: task,
      type: taskType,
      context: context,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    this.taskQueue.push(taskItem);
    console.log(`📋 Задача добавлена в очередь: ${taskType} - "${task.substring(0, 50)}..."`);
    
    return taskItem.id;
  }

  /**
   * Обработка задачи через соответствующий агент
   */
  async processTask(taskId) {
    const taskItem = this.taskQueue.find(t => t.id === taskId);
    if (!taskItem) {
      throw new Error(`Задача ${taskId} не найдена`);
    }

    taskItem.status = 'processing';
    console.log(`🔄 Обработка задачи: ${taskItem.type} - "${taskItem.task}"`);

    try {
      let result;

      switch (taskItem.type) {
        case 'selfdev':
          if (!this.agents.selfdev) {
            await this.init();
          }
          result = await this.agents.selfdev.generateProject(taskItem.task);
          break;
        
        case 'refactor':
          if (!this.agents.refactor) {
            this.agents.refactor = new RefactorAgent(this.configPath);
          }
          // Извлекаем путь к файлу из задачи или контекста
          const refactorFilePath = taskItem.context.filePath || taskItem.task.match(/(?:файл|file)[:\s]+([\w\/\\\.\-]+)/i)?.[1];
          if (!refactorFilePath) {
            throw new Error('Не указан путь к файлу для рефакторинга');
          }
          result = await this.agents.refactor.refactor(refactorFilePath, taskItem.task);
          break;
        
        case 'fix':
          if (!this.agents.fix) {
            this.agents.fix = new FixAgent(this.configPath);
          }
          // Извлекаем путь к файлу и ошибку из задачи или контекста
          const fixFilePath = taskItem.context.filePath || taskItem.task.match(/(?:файл|file)[:\s]+([\w\/\\\.\-]+)/i)?.[1];
          const errorMessage = taskItem.context.errorMessage || taskItem.task;
          if (!fixFilePath) {
            throw new Error('Не указан путь к файлу для исправления');
          }
          result = await this.agents.fix.fix(fixFilePath, errorMessage, taskItem.context.errorStack);
          break;
        
        case 'explain':
          if (!this.agents.explain) {
            this.agents.explain = new ExplainAgent(this.configPath);
          }
          // Извлекаем путь к файлу из задачи или контекста
          const explainFilePath = taskItem.context.filePath || taskItem.task.match(/(?:файл|file)[:\s]+([\w\/\\\.\-]+)/i)?.[1];
          const language = taskItem.context.language || 'ru';
          if (!explainFilePath) {
            throw new Error('Не указан путь к файлу для объяснения');
          }
          result = await this.agents.explain.explain(explainFilePath, language);
          break;
        
        case 'patch':
          // TODO: Реализовать Patch Agent
          throw new Error('Patch Agent еще не реализован');
        
        case 'autocomplete':
          // TODO: Реализовать Autocomplete Agent
          throw new Error('Autocomplete Agent еще не реализован');
        
        case 'pc-control':
          // TODO: Реализовать PC-Control Agent
          throw new Error('PC-Control Agent еще не реализован');
        
        default:
          throw new Error(`Неизвестный тип задачи: ${taskItem.type}`);
      }

      taskItem.status = 'completed';
      taskItem.result = result;
      taskItem.completedAt = new Date().toISOString();
      
      console.log(`✅ Задача выполнена: ${taskItem.type}`);
      return result;

    } catch (error) {
      taskItem.status = 'failed';
      taskItem.error = error.message;
      taskItem.failedAt = new Date().toISOString();
      
      console.error(`❌ Ошибка выполнения задачи: ${error.message}`);
      throw error;
    }
  }

  /**
   * Обработка очереди задач
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log(`📋 Начало обработки очереди (задач: ${this.taskQueue.length})`);

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.find(t => t.status === 'pending');
      if (!task) {
        break;
      }

      try {
        await this.processTask(task.id);
      } catch (error) {
        console.error(`Ошибка обработки задачи ${task.id}:`, error.message);
      }
    }

    this.isProcessing = false;
    console.log('✅ Очередь обработана');
  }

  /**
   * Получение статуса задачи
   */
  getTaskStatus(taskId) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      task: task.task,
      type: task.type,
      status: task.status,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      failedAt: task.failedAt,
      error: task.error
    };
  }

  /**
   * Получение всех задач
   */
  getAllTasks() {
    return this.taskQueue.map(task => ({
      id: task.id,
      task: task.task,
      type: task.type,
      status: task.status,
      createdAt: task.createdAt
    }));
  }

  /**
   * Очистка завершенных задач
   */
  clearCompletedTasks() {
    const before = this.taskQueue.length;
    this.taskQueue = this.taskQueue.filter(t => t.status !== 'completed' && t.status !== 'failed');
    const after = this.taskQueue.length;
    console.log(`🧹 Очищено задач: ${before - after}`);
  }
}

module.exports = InterAgentController;




