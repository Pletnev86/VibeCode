/**
 * Refactor Agent - агент для рефакторинга кода
 * 
 * Этот модуль отвечает за:
 * - Анализ кода и выявление проблем
 * - Генерацию улучшенной версии кода
 * - Применение паттернов рефакторинга
 * - Сохранение улучшенного кода
 */

const fs = require('fs');
const path = require('path');
const AIRouter = require('../ai/router');

class RefactorAgent {
  constructor(configPath = './config.json') {
    // Загрузка конфигурации
    this.config = this.loadConfig(configPath);
    this.agentConfig = this.config.agents.refactor || {};
    
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
   * Рефакторинг кода
   * 
   * @param {string} filePath - путь к файлу для рефакторинга
   * @param {string} instructions - инструкции по рефакторингу (опционально)
   * @returns {Promise<Object>} результат рефакторинга
   */
  async refactor(filePath, instructions = null) {
    try {
      this.log(`🔧 Начало рефакторинга: ${filePath}`);
      
      // Чтение исходного кода
      if (!fs.existsSync(filePath)) {
        throw new Error(`Файл не найден: ${filePath}`);
      }
      
      const originalCode = fs.readFileSync(filePath, 'utf8');
      this.log(`📖 Исходный код прочитан (${originalCode.length} символов)`);
      
      // Формирование промпта для рефакторинга
      const prompt = this.generateRefactorPrompt(filePath, originalCode, instructions);
      
      // Отправка запроса к AI
      this.log('🤖 Отправка запроса к AI Router...');
      const result = await this.router.sendRequest(prompt, {
        taskType: 'refactor',
        useOpenRouter: false,
        model: 'deepseek'
      });
      
      // Преобразуем результат в нужный формат
      const response = typeof result === 'string' ? result : (result.response || result);
      
      if (!response) {
        throw new Error('AI не вернул ответ');
      }
      
      // Парсинг улучшенного кода из ответа
      const refactoredCode = this.parseRefactoredCode(response, originalCode);
      
      if (!refactoredCode || refactoredCode.length < 10) {
        throw new Error('Не удалось извлечь улучшенный код из ответа AI');
      }
      
      // Сохранение улучшенного кода
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, originalCode, 'utf8');
      this.log(`💾 Создан бэкап: ${backupPath}`);
      
      fs.writeFileSync(filePath, refactoredCode, 'utf8');
      this.log(`✅ Рефакторинг завершен: ${filePath}`);
      
      return {
        success: true,
        filePath,
        originalLength: originalCode.length,
        refactoredLength: refactoredCode.length,
        changes: this.detectChanges(originalCode, refactoredCode)
      };
      
    } catch (error) {
      this.log(`❌ Ошибка рефакторинга: ${error.message}`);
      throw error;
    }
  }

  /**
   * Генерация промпта для рефакторинга
   */
  generateRefactorPrompt(filePath, code, instructions) {
    let prompt = `Ты - эксперт по рефакторингу кода.

## Задача:
Улучши следующий код, применяя лучшие практики программирования.

## Файл:
${filePath}

## Исходный код:
\`\`\`javascript
${code}
\`\`\`

`;

    if (instructions) {
      prompt += `## Инструкции по рефакторингу:
${instructions}

`;
    } else {
      prompt += `## Что нужно улучшить:
1. Улучшить читаемость кода
2. Оптимизировать производительность
3. Убрать дублирование кода
4. Улучшить именование переменных и функций
5. Добавить комментарии где необходимо
6. Применить принципы SOLID
7. Улучшить обработку ошибок

`;
    }

    prompt += `## Требования:
1. Верни ТОЛЬКО улучшенный код без дополнительных объяснений
2. Код должен быть полным и рабочим
3. Сохрани всю функциональность
4. Используй современные практики JavaScript/Node.js
5. Добавь комментарии на русском языке где уместно

## Формат ответа:
\`\`\`javascript
// улучшенный код здесь
\`\`\`

Начни рефакторинг:`;

    return prompt;
  }

  /**
   * Парсинг улучшенного кода из ответа AI
   */
  parseRefactoredCode(response, originalCode) {
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
      if (code.length > originalCode.length * 0.5) {
        return code;
      }
    }
    
    // Если ничего не нашли, возвращаем весь ответ (на случай если AI вернул только код)
    if (response.length > originalCode.length * 0.5 && !response.includes('```')) {
      return response.trim();
    }
    
    return null;
  }

  /**
   * Определение изменений между исходным и улучшенным кодом
   */
  detectChanges(original, refactored) {
    const changes = {
      linesAdded: 0,
      linesRemoved: 0,
      linesModified: 0
    };
    
    const originalLines = original.split('\n');
    const refactoredLines = refactored.split('\n');
    
    // Простое сравнение количества строк
    if (refactoredLines.length > originalLines.length) {
      changes.linesAdded = refactoredLines.length - originalLines.length;
    } else if (refactoredLines.length < originalLines.length) {
      changes.linesRemoved = originalLines.length - refactoredLines.length;
    }
    
    // Подсчет измененных строк (упрощенный алгоритм)
    const minLines = Math.min(originalLines.length, refactoredLines.length);
    for (let i = 0; i < minLines; i++) {
      if (originalLines[i].trim() !== refactoredLines[i].trim()) {
        changes.linesModified++;
      }
    }
    
    return changes;
  }
}

module.exports = RefactorAgent;

