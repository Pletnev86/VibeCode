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

class InterAgentController {
  constructor(configPath = './config.json') {
    this.configPath = configPath;
    this.agents = {
      selfdev: null,
      // Будущие агенты (будут добавлены позже)
      // refactor: null,
      // fix: null,
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
          // TODO: Реализовать Refactor Agent
          throw new Error('Refactor Agent еще не реализован');
        
        case 'fix':
          // TODO: Реализовать Fix Agent
          throw new Error('Fix Agent еще не реализован');
        
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



