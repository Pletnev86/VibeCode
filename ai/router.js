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
    this.lastUsedModel = null; // Последняя использованная модель
    this.lastUsedProvider = null; // Последний использованный провайдер
    this.lastRequestedModel = null; // Последняя запрошенная модель (для отображения)
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
        return 'llama3';
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
    console.log(`📤 OpenRouter: отправка запроса к модели: ${modelName}`);
    logger.info('OpenRouter: отправка запроса', { 
      modelKey: model, 
      modelName: modelName,
      promptLength: typeof prompt === 'string' ? prompt.length : 0
    });

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
      
      // Получаем информацию о модели из ответа (если есть)
      const responseModel = response.data?.model || modelName;
      console.log(`✅ OpenRouter: ответ получен от модели: ${responseModel}`);
      
      // Обновляем lastUsedModel на фактически использованную модель из ответа API
      if (responseModel && responseModel !== modelName) {
        console.log(`⚠️ OpenRouter: запрошена модель "${modelName}", но использована "${responseModel}"`);
        this.lastUsedModel = responseModel;
      } else {
        this.lastUsedModel = modelName;
      }

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        const usage = response.data.usage || {};
        const tokensUsed = usage.total_tokens || 0;
        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;
        
        console.log(`📊 OpenRouter: получен ответ длиной ${content.length} символов от модели ${responseModel}`);
        console.log(`🎫 OpenRouter: использовано токенов - всего: ${tokensUsed}, промпт: ${promptTokens}, ответ: ${completionTokens}`);
        
        // Сохраняем информацию об использовании токенов и модели для логирования
        this.lastTokenUsage = {
          total: tokensUsed,
          prompt: promptTokens,
          completion: completionTokens,
          model: responseModel // Сохраняем фактически использованную модель из ответа API
        };
        
        return content;
      }

      throw new Error('Неожиданный формат ответа от OpenRouter');
    } catch (error) {
      logger.error('OpenRouter: ошибка запроса', error);
      
      // Формируем детальное сообщение об ошибке с предложением переключиться
      let errorMessage = '';
      let suggestion = '';
      
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const apiError = error.response.data?.error?.message || statusText;
        
        // Определяем причину ошибки
        if (status === 401 || status === 403) {
          errorMessage = `Ошибка авторизации OpenRouter (${status}): ${apiError}`;
          suggestion = 'Проверьте API ключ в config.json. Или переключитесь на LM Studio (локальный).';
        } else if (status === 429) {
          errorMessage = `Превышен лимит запросов OpenRouter (${status}): ${apiError}`;
          suggestion = 'Подождите немного или переключитесь на другую модель/провайдер (например, LM Studio).';
        } else if (status === 402) {
          errorMessage = `Недостаточно средств на счету OpenRouter (${status}): ${apiError}`;
          suggestion = 'Пополните баланс OpenRouter или переключитесь на бесплатную модель (deepseek-free) или LM Studio.';
        } else if (status >= 500) {
          errorMessage = `Ошибка сервера OpenRouter (${status}): ${apiError}`;
          suggestion = 'Сервер OpenRouter временно недоступен. Переключитесь на LM Studio или попробуйте позже.';
        } else if (status === 404) {
          // Специальная обработка для 404 - модель не найдена
          errorMessage = `OpenRouter API ошибка (404): Модель "${modelName}" не найдена. ${apiError || 'No endpoints found'}`;
          
          // Если это была попытка использовать deepseek-free, предлагаем альтернативу
          if (modelName && modelName.includes('deepseek-r1:free')) {
            suggestion = 'Модель deepseek-r1:free может быть недоступна. Попробуйте переключиться на deepseek/deepseek-chat или другую модель.';
          } else {
            suggestion = 'Модель не найдена. Попробуйте переключиться на другую модель (например, deepseek/deepseek-chat) или провайдер (LM Studio).';
          }
          
          console.error(`❌ ${errorMessage}`);
          console.log(`💡 Рекомендация: ${suggestion}`);
        } else {
          errorMessage = `OpenRouter API ошибка (${status}): ${apiError}`;
          suggestion = 'Попробуйте переключиться на другую модель или провайдер (LM Studio).';
          console.error(`❌ ${errorMessage}`);
          console.log(`💡 Рекомендация: ${suggestion}`);
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = `Не удалось подключиться к OpenRouter: ${error.message}`;
        suggestion = 'Проверьте интернет-соединение или переключитесь на LM Studio (локальный).';
        console.error(`❌ ${errorMessage}`);
        console.log(`💡 Рекомендация: ${suggestion}`);
      } else {
        errorMessage = `Ошибка подключения к OpenRouter: ${error.message}`;
        suggestion = 'Попробуйте переключиться на другую модель или провайдер.';
        logger.error('OpenRouter: ошибка подключения', error);
      }
      
      // Создаем объект ошибки с дополнительной информацией
      const enhancedError = new Error(errorMessage);
      enhancedError.suggestion = suggestion;
      enhancedError.provider = 'openrouter';
      enhancedError.model = modelName;
      // Сохраняем statusCode для проверки в sendRequest
      if (error.response) {
        enhancedError.statusCode = error.response.status;
      } else if (error.statusCode) {
        enhancedError.statusCode = error.statusCode;
      }
      throw enhancedError;
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

    console.log(`📤 LM Studio: отправка запроса к модели: ${modelName}`);
    logger.info('LM Studio: отправка запроса', { 
      modelKey: model, 
      modelName: modelName,
      promptLength: typeof prompt === 'string' ? prompt.length : 0
    });

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
        
        // Получаем информацию о модели из ответа (если есть)
        const responseModel = response.data?.model || modelName;
        console.log(`✅ LM Studio: ответ получен от модели: ${responseModel}`);
        console.log(`📊 LM Studio: получен ответ длиной ${cleanedContent.length} символов, время выполнения: ${(requestTime / 1000).toFixed(2)} сек`);
        
        return cleanedContent;
      }

      throw new Error('Неожиданный формат ответа от LM Studio');
    } catch (error) {
      // Детальная обработка ошибок с предложением переключиться
      let errorMessage = '';
      let suggestion = '';
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'LM Studio недоступен. Убедитесь, что LM Studio запущен и слушает на порту 1234';
        suggestion = 'Запустите LM Studio и загрузите модель, или переключитесь на OpenRouter (API).';
        console.error(`❌ ${errorMessage}`);
        console.log(`💡 Рекомендация: ${suggestion}`);
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Превышено время ожидания ответа от LM Studio';
        suggestion = 'Модель отвечает слишком долго. Попробуйте другую модель или переключитесь на OpenRouter.';
        console.error(`❌ ${errorMessage}`);
        console.log(`💡 Рекомендация: ${suggestion}`);
      } else if (error.message && error.message.includes('не найдена')) {
        errorMessage = error.message;
        suggestion = 'Проверьте конфигурацию модели в config.json или переключитесь на другую модель.';
        console.error(`❌ ${errorMessage}`);
        console.log(`💡 Рекомендация: ${suggestion}`);
      } else {
        errorMessage = `Ошибка LM Studio: ${error.message}`;
        suggestion = 'Попробуйте перезапустить LM Studio или переключитесь на OpenRouter.';
        logger.error('LM Studio: ошибка запроса', error);
      }
      
      // Создаем объект ошибки с дополнительной информацией
      const enhancedError = new Error(errorMessage);
      enhancedError.suggestion = suggestion;
      enhancedError.provider = 'lmstudio';
      enhancedError.model = modelName;
      throw enhancedError;
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
    // Если useOpenRouter явно указан (true или false), используем его
    // Иначе используем OpenRouter только если он включен и есть API ключ
    const useOpenRouter = options.useOpenRouter === false 
      ? false 
      : (options.useOpenRouter === true 
        ? true 
        : (this.providers.openRouter.enabled && this.providers.openRouter.apiKey));
    
    // Флаг что пользователь явно выбрал модель
    const explicitModelChoice = options.useOpenRouter !== undefined || options.model !== undefined || options.openRouterModel !== undefined;

    if (useOpenRouter) {
      // Использование OpenRouter
      console.log('🌐 Использование OpenRouter API');
      const isOpenRouterAvailable = await this.checkOpenRouterAvailability();
      
      // Объявляем переменную вне блока try-catch чтобы она была доступна в catch
      let openRouterModelName = options.openRouterModel || this.providers.openRouter.selectedModel || 'gpt4';
      
      if (isOpenRouterAvailable) {
        try {
          // Для OpenRouter используем модель из опций или маппим из конфига
          openRouterModelName = options.openRouterModel || this.providers.openRouter.selectedModel || 'gpt4';
          
          console.log(`🔍 OpenRouter: исходное имя модели из опций: ${openRouterModelName}`);
          console.log(`🔍 OpenRouter: доступные модели в конфиге:`, Object.keys(this.providers.openRouter.models || {}));
          console.log(`🔍 OpenRouter: все опции:`, options);
          
          // Если передана строка модели напрямую (например "deepseek-free"), маппим её
          if (this.providers.openRouter.models && this.providers.openRouter.models[openRouterModelName]) {
            const mappedModel = this.providers.openRouter.models[openRouterModelName];
            console.log(`✅ OpenRouter: модель найдена в конфиге, маппинг: ${openRouterModelName} -> ${mappedModel}`);
            openRouterModelName = mappedModel;
          } else if (openRouterModelName === 'deepseek-free' || openRouterModelName === 'deepseek-r1:free') {
            // Специальная обработка для deepseek-free
            const mappedModel = this.providers.openRouter.models && this.providers.openRouter.models['deepseek-free'];
            if (mappedModel) {
              console.log(`✅ OpenRouter: deepseek-free найдена в конфиге, маппинг: ${openRouterModelName} -> ${mappedModel}`);
              openRouterModelName = mappedModel;
            } else {
              console.log(`⚠️ OpenRouter: deepseek-free не найдена в конфиге, используем прямое имя: deepseek/deepseek-r1:free`);
              openRouterModelName = 'deepseek/deepseek-r1:free';
            }
          } else if (openRouterModelName && !openRouterModelName.includes('/')) {
            // Если это короткое имя без слэша, используем маппинг или значение по умолчанию
            const mappedModel = this.providers.openRouter.models && this.providers.openRouter.models[openRouterModelName];
            if (mappedModel) {
              console.log(`✅ OpenRouter: модель найдена в конфиге (короткое имя), маппинг: ${openRouterModelName} -> ${mappedModel}`);
              openRouterModelName = mappedModel;
            } else {
              console.log(`⚠️ OpenRouter: модель "${openRouterModelName}" не найдена в конфиге, используем значение по умолчанию: ${this.providers.openRouter.defaultModel}`);
              openRouterModelName = this.providers.openRouter.defaultModel;
            }
          } else if (openRouterModelName && openRouterModelName.includes('/')) {
            console.log(`✅ OpenRouter: используется полное имя модели: ${openRouterModelName}`);
          } else {
            console.log(`⚠️ OpenRouter: модель не указана, используем значение по умолчанию: ${this.providers.openRouter.defaultModel}`);
            openRouterModelName = this.providers.openRouter.defaultModel;
          }
          
          // Сохраняем информацию о запрошенной модели
          this.lastRequestedModel = options.openRouterModel || openRouterModelName;
          
          // Сохраняем информацию о модели ДО запроса
          this.lastUsedModel = openRouterModelName;
          this.lastUsedProvider = 'openrouter';
          
          console.log(`🔍 OpenRouter: отправка запроса к модели "${openRouterModelName}" (запрошена: ${this.lastRequestedModel})`);
          
          return await this.queryOpenRouter(openRouterModelName, prompt, options);
        } catch (error) {
          // ВАЖНО: Если пользователь явно выбрал модель, НЕ делаем автоматический fallback
          if (explicitModelChoice) {
            // Для явно выбранной модели показываем ошибку, а не переключаемся автоматически
            const requestedModelKey = options.openRouterModel || 'не указана';
            // Проверяем статус 404 через statusCode или message
            const is404 = error.statusCode === 404 || (error.message && error.message.includes('404'));
            if (is404) {
              throw new Error(`Модель "${openRouterModelName}" (запрошена: ${requestedModelKey}) недоступна (404). Модель была явно выбрана пользователем, поэтому автоматический fallback не выполнен. Попробуйте выбрать другую модель.`);
            }
            // Сохраняем информацию о запрошенной модели для отображения
            this.lastRequestedModel = requestedModelKey;
            throw error;
          }
          
          // Специальная обработка для 404 - модель не найдена (только если модель НЕ была явно выбрана)
          const is404 = error.statusCode === 404 || (error.message && error.message.includes('404'));
          if (is404 && openRouterModelName && openRouterModelName.includes('deepseek-r1:free')) {
            console.warn('⚠️ Модель deepseek-r1:free недоступна (404), пробуем fallback на deepseek/deepseek-chat');
            try {
              // Пробуем использовать deepseek/deepseek-chat как fallback
              const fallbackModel = 'deepseek/deepseek-chat';
              console.log(`🔄 Fallback на модель: ${fallbackModel}`);
              this.lastUsedModel = fallbackModel;
              this.lastUsedProvider = 'openrouter';
              return await this.queryOpenRouter(fallbackModel, prompt, options);
            } catch (fallbackError) {
              console.warn('⚠️ Fallback на deepseek-chat не удался:', fallbackError.message);
              // НЕ переключаемся автоматически на другую модель - выбрасываем ошибку
              throw new Error(`Модель deepseek-r1:free недоступна, fallback на deepseek-chat также не удался: ${fallbackError.message}`);
            }
          }
          
          // Проверяем, не закончились ли токены
          const isTokenError = error.message && (
            error.message.includes('insufficient') || 
            error.message.includes('token') || 
            error.message.includes('quota') ||
            error.message.includes('balance') ||
            error.message.includes('credits')
          );
          
          // Если пользователь явно выбрал модель, не делаем автоматический fallback
          // Выбрасываем ошибку, чтобы пользователь знал о проблеме
          if (isTokenError) {
            throw new Error(`Недостаточно средств/токенов на OpenRouter для модели "${openRouterModelName}". ${error.message}`);
          } else {
            // Для других ошибок также выбрасываем, а не делаем автоматический fallback
            throw new Error(`Ошибка OpenRouter для модели "${openRouterModelName}": ${error.message}`);
          }
        }
      } else {
        console.warn('⚠️ OpenRouter недоступен, используем LM Studio');
      }
    }

    // Проверка доступности LM Studio
    const isLMStudioAvailable = await this.checkLMStudioAvailability();
    
    if (!isLMStudioAvailable) {
      // Если пользователь явно выбрал модель, не делаем автоматический fallback
      if (explicitModelChoice) {
        throw new Error(`Выбранная модель недоступна. LM Studio недоступен, и выбранная модель не может быть использована.`);
      }
      
      // Если OpenRouter включен, пробуем его как fallback (только если модель не была явно выбрана)
      if (this.providers.openRouter.enabled && this.providers.openRouter.apiKey) {
        console.log('🔄 Fallback на OpenRouter...');
        try {
          const isOpenRouterAvailable = await this.checkOpenRouterAvailability();
          if (isOpenRouterAvailable) {
            console.warn('⚠️ ВНИМАНИЕ: Используется fallback на OpenRouter gpt4 вместо выбранной модели');
            this.lastUsedModel = 'gpt4';
            this.lastUsedProvider = 'openrouter';
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
          this.lastUsedModel = this.smartAutoMode.fallbackModel;
          this.lastUsedProvider = 'lmstudio';
          return await this.queryLMStudio(this.smartAutoMode.fallbackModel, prompt, options);
        } catch (error) {
          throw new Error(`Fallback также не сработал: ${error.message}`);
        }
      }
      throw new Error('LM Studio недоступен и fallback не настроен');
    }

    // llama-3-8b-gpt-4o-ru1.0 понимает русский и английский языки, перевод не требуется
    let finalPrompt = prompt;

    // Отправка запроса к выбранной модели
    try {
      // Сохраняем информацию о модели
      this.lastUsedModel = selectedModel;
      this.lastUsedProvider = 'lmstudio';
      
      return await this.queryLMStudio(selectedModel, finalPrompt, options);
    } catch (error) {
      // Если выбранная модель не сработала, пробуем fallback
      console.warn(`Ошибка с моделью ${selectedModel}, пробуем fallback:`, error.message);
      
      // Если пользователь явно выбрал модель, не делаем автоматический fallback
      if (explicitModelChoice) {
        throw new Error(`Ошибка с выбранной моделью ${selectedModel}: ${error.message}. Fallback не выполнен, так как модель была явно выбрана пользователем.`);
      }
      
      // Пробуем OpenRouter как fallback (только если модель не была явно выбрана)
      if (this.providers.openRouter.enabled && this.providers.openRouter.apiKey) {
        try {
          const isOpenRouterAvailable = await this.checkOpenRouterAvailability();
          if (isOpenRouterAvailable) {
            console.warn('⚠️ ВНИМАНИЕ: Используется fallback на OpenRouter gpt4 вместо выбранной модели');
            this.lastUsedModel = 'gpt4';
            this.lastUsedProvider = 'openrouter';
            return await this.queryOpenRouter('gpt4', prompt, options);
          }
        } catch (openRouterError) {
          console.warn('OpenRouter fallback не сработал:', openRouterError.message);
        }
      }

      if (this.smartAutoMode.fallbackModel && selectedModel !== this.smartAutoMode.fallbackModel) {
        // Для fallback используем оригинальный промпт (DeepSeek понимает русский)
        this.lastUsedModel = this.smartAutoMode.fallbackModel;
        this.lastUsedProvider = 'lmstudio';
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

