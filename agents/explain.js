/**
 * Explain Agent - агент для объяснения кода
 * 
 * Этот модуль отвечает за:
 * - Анализ кода
 * - Генерацию объяснений на русском/английском
 * - Объяснение логики работы
 * - Объяснение сложных участков кода
 */

const fs = require('fs');
const path = require('path');
const AIRouter = require('../ai/router');

class ExplainAgent {
  constructor(configPath = './config.json') {
    // Загрузка конфигурации
    this.config = this.loadConfig(configPath);
    this.agentConfig = this.config.agents.explain || {};
    
    // Инициализация AI Router
    this.router = new AIRouter(configPath);
    
    // Логи действий
    this.logs = [];
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
      return { agents: {} };
    }
  }

  /**
   * Логирование действий
   */
  log(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    this.logs.push(logEntry);
    console.log(`[${logEntry.timestamp}] ${message}`, data || '');
  }

  /**
   * Объяснение кода
   * 
   * @param {string} filePath - путь к файлу для объяснения
   * @param {string} language - язык объяснения ('ru' или 'en', по умолчанию 'ru')
   * @param {number} startLine - начальная строка (опционально, для объяснения части кода)
   * @param {number} endLine - конечная строка (опционально)
   * @returns {Promise<Object>} объяснение кода
   */
  async explain(filePath, language = 'ru', startLine = null, endLine = null) {
    try {
      this.log(`📖 Начало объяснения кода: ${filePath}`);
      
      // Чтение кода
      if (!fs.existsSync(filePath)) {
        throw new Error(`Файл не найден: ${filePath}`);
      }
      
      let code = fs.readFileSync(filePath, 'utf8');
      
      // Если указаны строки, извлекаем только нужную часть
      if (startLine !== null && endLine !== null) {
        const lines = code.split('\n');
        code = lines.slice(startLine - 1, endLine).join('\n');
        this.log(`📄 Извлечена часть кода (строки ${startLine}-${endLine})`);
      }
      
      this.log(`📖 Код прочитан (${code.length} символов)`);
      
      // Формирование промпта для объяснения
      const prompt = this.generateExplainPrompt(filePath, code, language);
      
      // Отправка запроса к AI
      this.log('🤖 Отправка запроса к AI Router...');
      const result = await this.router.sendRequest(prompt, {
        taskType: 'explain',
        useOpenRouter: false,
        model: 'deepseek'
      });
      
      // Преобразуем результат в нужный формат
      const response = typeof result === 'string' ? result : (result.response || result);
      
      if (!response) {
        throw new Error('AI не вернул ответ');
      }
      
      const explanation = response.trim();
      this.log(`✅ Объяснение получено (${explanation.length} символов)`);
      
      return {
        success: true,
        filePath,
        explanation,
        language,
        codeLength: code.length
      };
      
    } catch (error) {
      this.log(`❌ Ошибка объяснения: ${error.message}`);
      throw error;
    }
  }

  /**
   * Генерация промпта для объяснения
   */
  generateExplainPrompt(filePath, code, language) {
    const langText = language === 'ru' ? 'русском' : 'английском';
    
    let prompt = `Ты - эксперт по объяснению кода.

## Задача:
Объясни следующий код на ${langText} языке.

## Файл:
${filePath}

## Код:
\`\`\`javascript
${code}
\`\`\`

## Требования:
1. Объясни что делает этот код
2. Объясни логику работы
3. Объясни назначение основных функций и переменных
4. Укажи на сложные или важные участки кода
5. Объясни алгоритмы если они есть
6. Используй простой и понятный язык
7. Структурируй объяснение (используй заголовки и списки)

## Формат ответа:
Объяснение должно быть структурированным и понятным.

Начни объяснение:`;

    return prompt;
  }
}

module.exports = ExplainAgent;

