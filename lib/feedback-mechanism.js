/**
 * Feedback Mechanism - механизм обратной связи и улучшения
 * 
 * Этот модуль отвечает за:
 * - Анализ результатов выполнения
 * - Улучшение на основе ошибок
 * - Обновление стратегии генерации
 * - Сохранение опыта для будущих задач
 */

const fs = require('fs');
const path = require('path');

class FeedbackMechanism {
  constructor(feedbackPath = './data/feedback.json') {
    this.feedbackPath = path.resolve(feedbackPath);
    this.feedbackData = this.loadFeedback();
  }

  /**
   * Загрузка данных обратной связи
   */
  loadFeedback() {
    try {
      const dir = path.dirname(this.feedbackPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.feedbackPath)) {
        const data = fs.readFileSync(this.feedbackPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Ошибка загрузки feedback:', error.message);
    }

    return {
      tasks: [],
      errors: [],
      improvements: [],
      statistics: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageExecutionTime: 0
      }
    };
  }

  /**
   * Сохранение данных обратной связи
   */
  saveFeedback() {
    try {
      fs.writeFileSync(this.feedbackPath, JSON.stringify(this.feedbackData, null, 2), 'utf8');
    } catch (error) {
      console.error('Ошибка сохранения feedback:', error.message);
    }
  }

  /**
   * Регистрация выполненной задачи
   */
  recordTask(task, result, executionTime) {
    const taskRecord = {
      id: Date.now(),
      task: task,
      result: result,
      executionTime: executionTime,
      timestamp: new Date().toISOString(),
      success: result.success || false
    };

    this.feedbackData.tasks.push(taskRecord);
    
    // Обновление статистики
    this.feedbackData.statistics.totalTasks++;
    if (taskRecord.success) {
      this.feedbackData.statistics.successfulTasks++;
    } else {
      this.feedbackData.statistics.failedTasks++;
    }

    // Обновление среднего времени выполнения
    const totalTime = this.feedbackData.tasks.reduce((sum, t) => sum + (t.executionTime || 0), 0);
    this.feedbackData.statistics.averageExecutionTime = totalTime / this.feedbackData.tasks.length;

    this.saveFeedback();
    return taskRecord;
  }

  /**
   * Регистрация ошибки
   */
  recordError(task, error, context = {}) {
    const errorRecord = {
      id: Date.now(),
      task: task,
      error: error.message || error,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    };

    this.feedbackData.errors.push(errorRecord);
    this.saveFeedback();
    return errorRecord;
  }

  /**
   * Анализ ошибок и предложение улучшений
   */
  analyzeErrors() {
    const recentErrors = this.feedbackData.errors.slice(-10); // Последние 10 ошибок
    
    const errorPatterns = {};
    recentErrors.forEach(error => {
      const errorType = this.categorizeError(error.error);
      if (!errorPatterns[errorType]) {
        errorPatterns[errorType] = [];
      }
      errorPatterns[errorType].push(error);
    });

    const improvements = [];
    
    // Анализ паттернов ошибок
    Object.keys(errorPatterns).forEach(errorType => {
      const count = errorPatterns[errorType].length;
      if (count >= 2) {
        improvements.push({
          type: errorType,
          frequency: count,
          suggestion: this.generateSuggestion(errorType, errorPatterns[errorType])
        });
      }
    });

    return improvements;
  }

  /**
   * Категоризация ошибки
   */
  categorizeError(errorMessage) {
    const errorLower = errorMessage.toLowerCase();
    
    if (errorLower.includes('timeout')) {
      return 'timeout';
    }
    if (errorLower.includes('connection') || errorLower.includes('connect')) {
      return 'connection';
    }
    if (errorLower.includes('permission') || errorLower.includes('access')) {
      return 'permission';
    }
    if (errorLower.includes('not found') || errorLower.includes('не найден')) {
      return 'not_found';
    }
    if (errorLower.includes('parse') || errorLower.includes('syntax')) {
      return 'parse';
    }
    
    return 'unknown';
  }

  /**
   * Генерация предложения по улучшению
   */
  generateSuggestion(errorType, errors) {
    const suggestions = {
      timeout: 'Увеличить таймаут для медленных операций или использовать более быстрые модели',
      connection: 'Проверить доступность LM Studio и сетевые настройки',
      permission: 'Проверить права доступа к файлам и директориям',
      not_found: 'Убедиться, что все необходимые файлы и пути существуют',
      parse: 'Улучшить парсинг ответов от AI и обработку ошибок формата'
    };

    return suggestions[errorType] || 'Требуется дополнительный анализ';
  }

  /**
   * Получение статистики
   */
  getStatistics() {
    return {
      ...this.feedbackData.statistics,
      successRate: this.feedbackData.statistics.totalTasks > 0
        ? (this.feedbackData.statistics.successfulTasks / this.feedbackData.statistics.totalTasks * 100).toFixed(2) + '%'
        : '0%',
      recentErrors: this.feedbackData.errors.length,
      recentTasks: this.feedbackData.tasks.length
    };
  }

  /**
   * Получение рекомендаций на основе опыта
   */
  getRecommendations() {
    const stats = this.getStatistics();
    const improvements = this.analyzeErrors();
    
    const recommendations = [];

    if (parseFloat(stats.successRate) < 70) {
      recommendations.push({
        priority: 'high',
        message: 'Низкий процент успешных задач. Рекомендуется улучшить обработку ошибок.'
      });
    }

    if (stats.averageExecutionTime > 60000) {
      recommendations.push({
        priority: 'medium',
        message: 'Долгое время выполнения задач. Рассмотрите оптимизацию или использование более быстрых моделей.'
      });
    }

    improvements.forEach(improvement => {
      recommendations.push({
        priority: 'medium',
        message: `Частая ошибка: ${improvement.type}. ${improvement.suggestion}`
      });
    });

    return recommendations;
  }
}

module.exports = FeedbackMechanism;







