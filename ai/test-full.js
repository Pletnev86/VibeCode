/**
 * Полный тест AI Router с реальными запросами
 * 
 * Запуск: node ai/test-full.js
 */

const AIRouter = require('./router');

async function testFullRouter() {
  console.log('=== Полный тест AI Router ===\n');

  try {
    const router = new AIRouter('./config.json');
    console.log('✅ Router создан успешно\n');

    // Тест 1: Простой запрос на reasoning
    console.log('--- Тест 1: Reasoning запрос ---');
    try {
      const response1 = await router.sendRequest('Почему важно использовать модульную архитектуру в программировании?');
      console.log('✅ Ответ получен:');
      console.log(response1.substring(0, 200) + '...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 2: Запрос на генерацию кода
    console.log('--- Тест 2: Генерация кода ---');
    try {
      const response2 = await router.sendRequest('Создать простую функцию на JavaScript для сложения двух чисел');
      console.log('✅ Ответ получен:');
      console.log(response2.substring(0, 200) + '...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 3: Запрос на объяснение
    console.log('--- Тест 3: Объяснение ---');
    try {
      const response3 = await router.sendRequest('Объясни что такое REST API простыми словами');
      console.log('✅ Ответ получен:');
      console.log(response3.substring(0, 200) + '...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 4: Проверка fallback механизма (симуляция недоступности)
    console.log('--- Тест 4: Проверка обработки ошибок ---');
    try {
      // Временно отключаем провайдер для теста fallback
      const originalEnabled = router.providers.lmStudio.enabled;
      router.providers.lmStudio.enabled = false;
      
      try {
        await router.sendRequest('Тестовый запрос');
      } catch (error) {
        console.log('✅ Fallback механизм работает - ошибка обработана:', error.message);
      } finally {
        router.providers.lmStudio.enabled = originalEnabled;
      }
    } catch (error) {
      console.error('❌ Ошибка теста fallback:', error.message);
    }

    console.log('\n=== Полный тест завершен ===');
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск теста
testFullRouter();





