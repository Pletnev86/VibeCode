/**
 * Тест подключения к OpenRouter
 */

const AIRouter = require('./router');

async function testConnection() {
  console.log('=== Тест подключения к OpenRouter ===\n');

  const router = new AIRouter('./config.json');

  console.log('Конфигурация:');
  console.log('  Enabled:', router.providers.openRouter.enabled);
  console.log('  API Key:', router.providers.openRouter.apiKey ? router.providers.openRouter.apiKey.substring(0, 20) + '...' : 'НЕ НАСТРОЕН');
  console.log('  Base URL:', router.providers.openRouter.baseUrl);
  console.log('');

  if (!router.providers.openRouter.enabled) {
    console.error('❌ OpenRouter отключен в config.json');
    console.log('Измените "enabled": false на "enabled": true');
    return;
  }

  if (!router.providers.openRouter.apiKey) {
    console.error('❌ API ключ не настроен');
    return;
  }

  console.log('Проверка доступности...');
  try {
    const isAvailable = await router.checkOpenRouterAvailability();
    
    if (isAvailable) {
      console.log('✅ OpenRouter доступен!\n');
      
      console.log('Тест отправки запроса...');
      try {
        const response = await router.queryOpenRouter('gpt4', 'Привет! Ответь одним словом: хорошо.', {
          max_tokens: 50
        });
        console.log('✅ Ответ получен:');
        console.log(response);
      } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
      }
    } else {
      console.error('❌ OpenRouter недоступен');
      console.log('\nВозможные причины:');
      console.log('  1. Нет интернет-соединения');
      console.log('  2. Неверный API ключ');
      console.log('  3. Проблемы с OpenRouter API');
    }
  } catch (error) {
    console.error('❌ Ошибка проверки:', error.message);
  }
}

testConnection();




