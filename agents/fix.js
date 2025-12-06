/**
 * Fix Agent - агент для исправления ошибок в коде
 * 
 * Этот модуль отвечает за:
 * - Анализ ошибок в коде
 * - Поиск причин ошибок
 * - Генерацию исправлений
 * - Применение исправлений
 * - Тестирование исправленного кода
 */

const fs = require('fs');
const path = require('path');
const AIRouter = require('../ai/router');

class FixAgent {
  constructor(configPath = './config.json') {
    // Загрузка конфигурации
    this.config = this.loadConfig(configPath);
    this.agentConfig = this.config.agents.fix || {};
    
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
   * Исправление ошибки в коде
   * 
   * @param {string} filePath - путь к файлу с ошибкой
   * @param {string} errorMessage - сообщение об ошибке
   * @param {string} errorStack - стек ошибки (опционально)
   * @returns {Promise<Object>} результат исправления
   */
  async fix(filePath, errorMessage, errorStack = null) {
    try {
      this.log(`🔧 Начало исправления ошибки в: ${filePath}`);
      this.log(`❌ Ошибка: ${errorMessage}`);
      
      // Чтение кода с ошибкой
      if (!fs.existsSync(filePath)) {
        throw new Error(`Файл не найден: ${filePath}`);
      }
      
      const code = fs.readFileSync(filePath, 'utf8');
      this.log(`📖 Код прочитан (${code.length} символов)`);
      
      // Формирование промпта для исправления
      const prompt = this.generateFixPrompt(filePath, code, errorMessage, errorStack);
      
      // Отправка запроса к AI
      this.log('🤖 Отправка запроса к AI Router...');
      const result = await this.router.routeRequest(prompt, {
        taskType: 'fix',
        useOpenRouter: false,
        model: 'deepseek'
      });
      
      if (!result || !result.response) {
        throw new Error('AI не вернул ответ');
      }
      
      // Парсинг исправленного кода из ответа
      const fixedCode = this.parseFixedCode(result.response, code);
      
      if (!fixedCode || fixedCode.length < 10) {
        throw new Error('Не удалось извлечь исправленный код из ответа AI');
      }
      
      // Сохранение исправленного кода
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, code, 'utf8');
      this.log(`💾 Создан бэкап: ${backupPath}`);
      
      fs.writeFileSync(filePath, fixedCode, 'utf8');
      this.log(`✅ Ошибка исправлена: ${filePath}`);
      
      return {
        success: true,
        filePath,
        errorMessage,
        fixed: true
      };
      
    } catch (error) {
      this.log(`❌ Ошибка исправления: ${error.message}`);
      throw error;
    }
  }

  /**
   * Генерация промпта для исправления ошибки
   */
  generateFixPrompt(filePath, code, errorMessage, errorStack) {
    let prompt = `Ты - эксперт по исправлению ошибок в коде.

## Задача:
Исправь ошибку в следующем коде.

## Файл:
${filePath}

## Исходный код:
\`\`\`javascript
${code}
\`\`\`

## Ошибка:
${errorMessage}

`;

    if (errorStack) {
      prompt += `## Стек ошибки:
\`\`\`
${errorStack}
\`\`\`

`;
    }

    prompt += `## Требования:
1. Найди причину ошибки
2. Исправь ошибку
3. Верни ТОЛЬКО исправленный код без дополнительных объяснений
4. Код должен быть полным и рабочим
5. Сохрани всю функциональность
6. Добавь комментарии на русском языке где необходимо

## Формат ответа:
\`\`\`javascript
// исправленный код здесь
\`\`\`

Начни исправление:`;

    return prompt;
  }

  /**
   * Парсинг исправленного кода из ответа AI
   */
  parseFixedCode(response, originalCode) {
    // Паттерн 1: Блок кода с языком
    const codeBlockPattern = /```(?:javascript|js|typescript|ts)\s*\n([\s\S]*?)```/;
    let match = response.match(codeBlockPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Паттерн 2: Блок кода без языка
    const simpleBlockPattern = /```\s*\n([\s\S]*?)```/;
    match = response.match(simpleBlockPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Паттерн 3: Если не нашли блок, ищем код между маркерами
    const codeStart = response.indexOf('```');
    const codeEnd = response.lastIndexOf('```');
    
    if (codeStart !== -1 && codeEnd !== -1 && codeEnd > codeStart) {
      let code = response.substring(codeStart, codeEnd);
      // Убираем маркеры
      code = code.replace(/```[\w]*\s*\n?/g, '').trim();
      if (code.length > originalCode.length * 0.3) {
        return code;
      }
    }
    
    // Если ничего не нашли, возвращаем весь ответ (на случай если AI вернул только код)
    if (response.length > originalCode.length * 0.3 && !response.includes('```')) {
      return response.trim();
    }
    
    return null;
  }
}

module.exports = FixAgent;

