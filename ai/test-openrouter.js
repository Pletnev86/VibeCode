/**
 * Тест работы OpenRouter API
 * 
 * Запуск: node ai/test-openrouter.js
 */

const AIRouter = require('./router');

async function testOpenRouter() {
  console.log('=== Тест OpenRouter API ===\n');

  const router = new AIRouter('./config.json');

  try {
    // Проверка конфигурации
    console.log('--- Проверка конфигурации ---');
    console.log('OpenRouter enabled:', router.providers.openRouter.enabled);
    console.log('OpenRouter API Key:', router.providers.openRouter.apiKey ? 'Настроен ✅' : 'Не настроен ❌');
    console.log('OpenRouter baseUrl:', router.providers.openRouter.baseUrl);
    console.log('');

    if (!router.providers.openRouter.apiKey) {
      console.error('❌ API ключ OpenRouter не настроен в config.json');
      return;
    }

    // Проверка доступности OpenRouter
    console.log('--- Проверка доступности OpenRouter ---');
    const isAvailable = await router.checkOpenRouterAvailability();
    console.log(`OpenRouter доступен: ${isAvailable ? '✅ Да' : '❌ Нет'}\n`);

    if (!isAvailable) {
      console.warn('⚠️ OpenRouter недоступен. Проверьте интернет-соединение и API ключ.');
      return;
    }

    // Тест получения списка моделей
    console.log('--- Получение списка моделей OpenRouter ---');
    const models = await router.getAvailableModels();
    console.log('Доступные модели:');
    if (models.external && models.external.length > 0) {
      models.external.slice(0, 5).forEach(model => {
        console.log(`  - ${model.id}`);
      });
      console.log(`  ... и еще ${models.external.length - 5} моделей\n`);
    } else {
      console.log('  Модели не получены\n');
    }

    // Тест отправки запроса через OpenRouter
    console.log('--- Тест отправки запроса через OpenRouter ---');
    try {
      const response = await router.sendRequest('Привет! Ответь одним словом: хорошо.', {
        useOpenRouter: true,
        max_tokens: 50
      });
      console.log('✅ Ответ получен:');
      console.log(response.substring(0, 200));
      console.log('');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест прямого запроса к OpenRouter
    console.log('--- Тест прямого запроса к OpenRouter ---');
    try {
      const response = await router.queryOpenRouter('gpt4', 'What is REST API? Answer in one sentence.', {
        temperature: 0.7,
        max_tokens: 100
      });
      console.log('✅ Ответ получен:');
      console.log(response.substring(0, 200));
      console.log('');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    console.log('=== Тест завершен ===');
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
  }
}

testOpenRouter();





