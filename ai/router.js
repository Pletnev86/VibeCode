/**
 * AI Router - маршрутизация запросов между различными AI провайдерами
 * 
 * Этот модуль отвечает за:
 * - Выбор оптимальной модели для задачи
 * - Маршрутизацию запросов к LM Studio, OpenRouter, GPT API
 * - Smart Auto Mode - автоматический выбор модели по типу задачи
 * - Fallback механизм при недоступности провайдеров
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getLogger } = require('../lib/logger');

// Инициализация логгера для AI Router
const logger = getLogger();

class AIRouter {
  constructor(configPath = './config.json') {
    // Загрузка конфигурации
    this.config = this.loadConfig(configPath);
    this.providers = this.config.ai.providers;
    this.smartAutoMode = this.config.ai.smartAutoMode;
    this.lastTokenUsage = null;
    this.lastRequestTime = null;
  }

  /**
   * Загрузка конфигурации из файла
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
   * Классификация типа задачи для выбора модели
   * Определяет тип задачи: code, explanation, translation, analysis, reasoning
   */
  classifyTask(task) {
    const taskLower = task.toLowerCase();
    
    // Ключевые слова для определения типа задачи
    const codeKeywords = ['создать', 'написать', 'код', 'функция', 'класс', 'модуль', 'файл', 'generate', 'create', 'write', 'code', 'function', 'class'];
    const explanationKeywords = ['объясни', 'что делает', 'как работает', 'explain', 'what does', 'how does', 'describe'];
    const translationKeywords = ['переведи', 'translate', 'перевод'];
    const analysisKeywords = ['проанализируй', 'анализ', 'analyze', 'analysis', 'review'];
    const reasoningKeywords = ['почему', 'зачем', 'как лучше', 'why', 'how to', 'best way', 'should'];
    
    if (codeKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'code';
    }
    if (explanationKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'explanation';
    }
    if (translationKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'translation';
    }
    if (analysisKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'analysis';
    }
    if (reasoningKeywords.some(keyword => taskLower.includes(keyword))) {
      return 'reasoning';
    }
    
    // По умолчанию - reasoning для общих вопросов
    return 'reasoning';
  }

  /**
   * Определение языка запроса (русский или английский)
   * Простая проверка на наличие кириллических символов
   */
  detectLanguage(text) {
    // Проверка на наличие кириллических символов
    const cyrillicPattern = /[а-яёА-ЯЁ]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
  }

  /**
   * Удаление тегов <think> и <think> из ответа
   */
  removeThinkingTags(text) {
    if (!text) return text;
    
    // Удаляем <think>...</think>
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Удаляем <think>...</think>
    text = text.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, '');
    
    // Удаляем одиночные теги
    text = text.replace(/<\/?think>/gi, '');
    text = text.replace(/<\/?redacted_reasoning>/gi, '');
    
    return text.trim();
  }

  /**
   * Перевод текста с русского на английский через DeepSeek
   */
  async translateToEnglish(text) {
    try {
      const translationPrompt = `Переведи следующий текст с русского на английский язык. Переведи только текст, без дополнительных комментариев и без тегов <think> или <think>:\n\n${text}`;
      
      const translated = await this.queryLMStudio('deepseek', translationPrompt, {
        temperature: 0.3,
        max_tokens: 2000
      });
      
      // Очистка ответа от возможных метаданных и тегов
      return this.removeThinkingTags(translated.trim());
    } catch (error) {
      console.warn('Ошибка перевода через DeepSeek:', error.message);
      throw new Error(`Не удалось перевести запрос на английский: ${error.message}`);
    }
  }

  /**
   * Выбор модели на основе типа задачи (Smart Auto Mode)
   */
  selectModel(taskType, options = {}) {
    // Если модель указана в опциях, используем её
    if (options.model) {
      return options.model;
    }

    if (!this.smartAutoMode.enabled) {
      return this.smartAutoMode.defaultModel;
    }

    // Логика выбора модели по типу задачи
    switch (taskType) {
      case 'code':
        // Falcon для генерации кода (по умолчанию)
        return 'falcon';
      case 'explanation':
      case 'reasoning':
      case 'translation':
        // DeepSeek для объяснений, reasoning и переводов
        return 'deepseek';
      case 'analysis':
        // Для сложного анализа можно использовать внешние модели, но пока DeepSeek
        return 'deepseek';
      default:
        return this.smartAutoMode.defaultModel;
    }
  }

  /**
   * Проверка доступности провайдера LM Studio
   */
  async checkLMStudioAvailability() {
    if (!this.providers.lmStudio.enabled) {
      return false;
    }

    try {
      // Используем правильный endpoint /v1/models
      const response = await axios.get(`${this.providers.lmStudio.baseUrl}/models`, {
        timeout: 5000
      });
      // Проверяем наличие данных в ответе
      return response.status === 200 && response.data && response.data.data;
    } catch (error) {
      logger.warn('LM Studio недоступен', null, error);
      return false;
    }
  }

  /**
   * Проверка доступности OpenRouter
   */
  async checkOpenRouterAvailability() {
    if (!this.providers.openRouter.enabled || !this.providers.openRouter.apiKey) {
      console.log('OpenRouter: disabled или API ключ отсутствует');
      return false;
    }

    try {
      console.log('Проверка доступности OpenRouter...');
      const response = await axios.get(`${this.providers.openRouter.baseUrl}/models`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${this.providers.openRouter.apiKey}`,
          'HTTP-Referer': 'http://localhost',
          'X-Title': 'VibeCode'
        }
      });
      const isAvailable = !!(response.status === 200 && response.data);
      console.log(`OpenRouter доступен: ${isAvailable}`);
      return isAvailable;
    } catch (error) {
      logger.error('OpenRouter недоступен', error);
      if (error.response) {
        console.error('Статус:', error.response.status);
        console.error('Ответ:', error.response.data);
      }
      return false;
    }
  }

  /**
   * Отправка запроса к OpenRouter
   */
  async queryOpenRouter(model, prompt, options = {}) {
    if (!this.providers.openRouter.enabled) {
      throw new Error('OpenRouter провайдер отключен');
    }

    if (!this.providers.openRouter.apiKey) {
      throw new Error('OpenRouter API ключ не настроен');
    }

    const modelName = this.providers.openRouter.models[model] || model || this.providers.openRouter.defaultModel;
    console.log(`OpenRouter: отправка запроса к модели ${modelName}`);

    try {
      const response = await axios.post(
        `${this.providers.openRouter.baseUrl}/chat/completions`,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 2000
        },
        {
          timeout: this.providers.openRouter.timeout,
          headers: {
            'Authorization': `Bearer ${this.providers.openRouter.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost',
            'X-Title': 'VibeCode'
          }
        }
      );

      console.log('OpenRouter: ответ получен, статус:', response.status);

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        const usage = response.data.usage || {};
        const tokensUsed = usage.total_tokens || 0;
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        
        console.log(`OpenRouter: получен ответ длиной ${content.length} символов`);
        console.log(`OpenRouter: использовано токенов - всего: ${tokensUsed}, промпт: ${promptTokens}, ответ: ${completionTokens}`);
        
        // Сохраняем информацию об использовании токенов для логирования
        this.lastTokenUsage = {
          total: tokensUsed,
          prompt: promptTokens,
          completion: completionTokens
        };
        
        return content;
      }

      throw new Error('Неожиданный формат ответа от OpenRouter');
    } catch (error) {
      logger.error('OpenRouter: ошибка запроса', error);
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const errorMessage = error.response.data?.error?.message || statusText;
        console.error(`OpenRouter: статус ${status}, ошибка: ${errorMessage}`);
        throw new Error(`OpenRouter API ошибка (${status}): ${errorMessage}`);
      }
      logger.error('OpenRouter: ошибка подключения', error);
      throw new Error(`Ошибка подключения к OpenRouter: ${error.message}`);
    }
  }

  /**
   * Отправка запроса к LM Studio
   */
  async queryLMStudio(model, prompt, options = {}) {
    if (!this.providers.lmStudio.enabled) {
      throw new Error('LM Studio провайдер отключен');
    }

    const modelName = this.providers.lmStudio.models[model];
    if (!modelName) {
      throw new Error(`Модель ${model} не найдена в конфигурации`);
    }

    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.providers.lmStudio.baseUrl}/chat/completions`,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 2000
        },
        {
          timeout: this.providers.lmStudio.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        // Убираем <think> теги из ответа DeepSeek
        const cleanedContent = this.removeThinkingTags(content);
        
        // Сохраняем время выполнения для логирования
        const requestTime = Date.now() - startTime;
        this.lastRequestTime = requestTime;
        
        return cleanedContent;
      }

      throw new Error('Неожиданный формат ответа от LM Studio');
    } catch (error) {
      // Детальная обработка ошибок
      if (error.code === 'ECONNREFUSED') {
        throw new Error('LM Studio недоступен. Убедитесь, что LM Studio запущен и слушает на порту 1234');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Превышено время ожидания ответа от LM Studio');
      }
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const errorMessage = error.response.data?.error?.message || statusText;
        throw new Error(`LM Studio API ошибка (${status}): ${errorMessage}`);
      }
      throw new Error(`Ошибка подключения к LM Studio: ${error.message}`);
    }
  }

  /**
   * Основной метод для отправки запроса с автоматическим выбором модели
   */
  async sendRequest(prompt, options = {}) {
    // Сначала ищем в базе знаний
    if (options.knowledgeBaseInstance && !options.skipKnowledgeBase) {
      try {
        const kbResults = options.knowledgeBaseInstance.searchSimilarQueries(prompt, 3);
        if (kbResults && kbResults.length > 0) {
          // Проверяем, есть ли хорошие ответы
          const goodAnswers = kbResults.filter(r => r.avg_rating >= 4 && r.rating_count > 0);
          if (goodAnswers.length > 0) {
            console.log('📚 Найден ответ в базе знаний');
            // Возвращаем лучший ответ из БД с меткой
            const bestAnswer = goodAnswers[0];
            return `📚 ${bestAnswer.response_text}`;
          }
        }
      } catch (error) {
        console.warn('⚠️ Ошибка поиска в базе знаний:', error.message);
      }
    }

    // Определение языка запроса
    const language = this.detectLanguage(prompt);
    console.log(`Язык запроса: ${language}`);

    // Классификация задачи
    const taskType = this.classifyTask(prompt);
    console.log(`Тип задачи: ${taskType}`);

    // Выбор модели (с учетом опций)
    let selectedModel = this.selectModel(taskType, options);
    console.log(`Выбранная модель: ${selectedModel}`);
    
    // Если модель указана в опциях, используем её
    if (options.model) {
      selectedModel = options.model;
      console.log(`Используется модель из опций: ${selectedModel}`);
    }

    // Проверка приоритета провайдеров (OpenRouter имеет приоритет если включен)
    const useOpenRouter = options.useOpenRouter !== undefined 
      ? options.useOpenRouter 
      : (this.providers.openRouter.enabled && this.providers.openRouter.apiKey);

    if (useOpenRouter) {
      // Использование OpenRouter
      console.log('🌐 Использование OpenRouter API');
      const isOpenRouterAvailable = await this.checkOpenRouterAvailability();
      
      if (isOpenRouterAvailable) {
        try {
          // Для OpenRouter используем модель из опций или маппим из конфига
          let openRouterModelName = options.openRouterModel || this.providers.openRouter.selectedModel || 'gpt4';
          
          // Если передана строка модели напрямую (например "deepseek"), маппим её
          if (this.providers.openRouter.models[openRouterModelName]) {
            openRouterModelName = this.providers.openRouter.models[openRouterModelName];
          } else if (!openRouterModelName.includes('/')) {
            // Если это короткое имя без слэша, используем маппинг
            openRouterModelName = this.providers.openRouter.models[openRouterModelName] || this.providers.openRouter.defaultModel;
          }
          
          return await this.queryOpenRouter(openRouterModelName, prompt, options);
        } catch (error) {
          // Проверяем, не закончились ли токены
          const isTokenError = error.message && (
            error.message.includes('insufficient') || 
            error.message.includes('token') || 
            error.message.includes('quota') ||
            error.message.includes('balance') ||
            error.message.includes('credits')
          );
          
          if (isTokenError && this.providers.openRouter.autoFallback) {
            console.warn('⚠️ Токены OpenRouter закончились, переключаемся на LM Studio');
            // Fallback на LM Studio при отсутствии токенов
          } else {
            console.warn('⚠️ OpenRouter недоступен, пробуем LM Studio:', error.message);
          }
          // Fallback на LM Studio
        }
      } else {
        console.warn('⚠️ OpenRouter недоступен, используем LM Studio');
      }
    }

    // Проверка доступности LM Studio
    const isLMStudioAvailable = await this.checkLMStudioAvailability();
    
    if (!isLMStudioAvailable) {
      // Если OpenRouter включен, пробуем его как fallback
      if (this.providers.openRouter.enabled && this.providers.openRouter.apiKey) {
        console.log('🔄 Fallback на OpenRouter...');
        try {
          const isOpenRouterAvailable = await this.checkOpenRouterAvailability();
          if (isOpenRouterAvailable) {
            return await this.queryOpenRouter('gpt4', prompt, options);
          }
        } catch (error) {
          console.warn('OpenRouter также недоступен:', error.message);
        }
      }

      // Fallback на локальный DeepSeek (если доступен)
      console.warn('LM Studio недоступен, используем fallback');
      if (this.smartAutoMode.fallbackModel) {
        try {
          return await this.queryLMStudio(this.smartAutoMode.fallbackModel, prompt, options);
        } catch (error) {
          throw new Error(`Fallback также не сработал: ${error.message}`);
        }
      }
      throw new Error('LM Studio недоступен и fallback не настроен');
    }

    // ВАЖНО: Falcon работает только с английским языком
    // Если выбран Falcon и запрос на русском - переводим через DeepSeek
    let finalPrompt = prompt;
    if (selectedModel === 'falcon' && language === 'ru') {
      console.log('⚠️ Falcon требует английский язык. Переводим запрос через DeepSeek...');
      try {
        // Используем DeepSeek для перевода
        const translationPrompt = `Переведи следующий текст на английский язык. Ответь только переводом, без дополнительных комментариев и без тегов <think> или <think>:\n\n${prompt}`;
        finalPrompt = await this.queryLMStudio('deepseek', translationPrompt, { max_tokens: 1000 });
        finalPrompt = this.removeThinkingTags(finalPrompt.trim());
        console.log('✅ Перевод выполнен:', finalPrompt.substring(0, 100) + '...');
      } catch (error) {
        console.warn('⚠️ Не удалось перевести, используем DeepSeek вместо Falcon');
        // Если перевод не удался, используем DeepSeek
        selectedModel = 'deepseek';
        finalPrompt = prompt;
      }
    }

    // Отправка запроса к выбранной модели
    try {
      return await this.queryLMStudio(selectedModel, finalPrompt, options);
    } catch (error) {
      // Если выбранная модель не сработала, пробуем fallback
      console.warn(`Ошибка с моделью ${selectedModel}, пробуем fallback:`, error.message);
      
      // Пробуем OpenRouter как fallback
      if (this.providers.openRouter.enabled && this.providers.openRouter.apiKey) {
        try {
          const isOpenRouterAvailable = await this.checkOpenRouterAvailability();
          if (isOpenRouterAvailable) {
            console.log('🔄 Fallback на OpenRouter...');
            return await this.queryOpenRouter('gpt4', prompt, options);
          }
        } catch (openRouterError) {
          console.warn('OpenRouter fallback не сработал:', openRouterError.message);
        }
      }

      if (this.smartAutoMode.fallbackModel && selectedModel !== this.smartAutoMode.fallbackModel) {
        // Для fallback используем оригинальный промпт (DeepSeek понимает русский)
        return await this.queryLMStudio(this.smartAutoMode.fallbackModel, prompt, options);
      }
      throw error;
    }
  }

  /**
   * Получение информации о доступных моделях
   */
  async getAvailableModels() {
    const models = {
      local: [],
      external: []
    };

    // Локальные модели (LM Studio)
    if (this.providers.lmStudio.enabled) {
      const isAvailable = await this.checkLMStudioAvailability();
      if (isAvailable) {
        try {
          const response = await axios.get(`${this.providers.lmStudio.baseUrl}/models`, {
            timeout: 5000
          });
          models.local = response.data.data || [];
        } catch (error) {
          console.warn('Не удалось получить список моделей LM Studio:', error.message);
        }
      }
    }

    // Внешние модели (OpenRouter)
    if (this.providers.openRouter.enabled && this.providers.openRouter.apiKey) {
      const isAvailable = await this.checkOpenRouterAvailability();
      if (isAvailable) {
        try {
          const response = await axios.get(`${this.providers.openRouter.baseUrl}/models`, {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${this.providers.openRouter.apiKey}`,
              'HTTP-Referer': 'http://localhost',
              'X-Title': 'VibeCode'
            }
          });
          models.external = response.data.data || [];
        } catch (error) {
          console.warn('Не удалось получить список моделей OpenRouter:', error.message);
        }
      }
    }

    return models;
  }
}

module.exports = AIRouter;

