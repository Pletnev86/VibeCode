/**
 * Полное тестирование локальных моделей LM Studio
 * 
 * Тестирует:
 * - Подключение к LM Studio
 * - Работу DeepSeek (русский язык)
 * - Работу Falcon (только английский)
 * - Автоматический перевод для Falcon
 * - Fallback механизм
 */

const AIRouter = require('./ai/router');

async function testModels() {
  console.log('=== Полное тестирование локальных моделей ===\n');

  const router = new AIRouter('./config.json');

  try {
    // Тест 1: Проверка доступности LM Studio
    console.log('--- Тест 1: Проверка доступности LM Studio ---');
    const isAvailable = await router.checkLMStudioAvailability();
    console.log(`LM Studio доступен: ${isAvailable ? '✅ Да' : '❌ Нет'}\n`);

    if (!isAvailable) {
      console.error('❌ LM Studio недоступен. Запустите LM Studio и загрузите модели.');
      return;
    }

    // Тест 2: Получение списка моделей
    console.log('--- Тест 2: Получение списка моделей ---');
    const models = await router.getAvailableModels();
    console.log('Доступные модели:');
    models.local.forEach(model => {
      console.log(`  - ${model.id}`);
    });
    console.log('');

    // Тест 3: DeepSeek - русский язык (reasoning)
    console.log('--- Тест 3: DeepSeek - русский язык (reasoning) ---');
    try {
      const response1 = await router.sendRequest('Почему важно использовать модульную архитектуру в программировании? Ответь кратко.');
      console.log('✅ Ответ получен:');
      console.log(response1.substring(0, 300));
      console.log('...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 4: DeepSeek - объяснение
    console.log('--- Тест 4: DeepSeek - объяснение ---');
    try {
      const response2 = await router.sendRequest('Объясни что такое REST API простыми словами. Ответь кратко.');
      console.log('✅ Ответ получен:');
      console.log(response2.substring(0, 300));
      console.log('...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 5: Falcon - генерация кода (английский)
    console.log('--- Тест 5: Falcon - генерация кода (английский) ---');
    try {
      const response3 = await router.sendRequest('Create a simple JavaScript function to add two numbers');
      console.log('✅ Ответ получен:');
      console.log(response3.substring(0, 300));
      console.log('...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 6: Falcon - русский запрос (должен переводиться)
    console.log('--- Тест 6: Falcon - русский запрос (автоматический перевод) ---');
    try {
      console.log('Отправка запроса на русском: "Создать простую функцию на JavaScript для сложения двух чисел"');
      const response4 = await router.sendRequest('Создать простую функцию на JavaScript для сложения двух чисел');
      console.log('✅ Ответ получен (после перевода):');
      console.log(response4.substring(0, 300));
      console.log('...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 7: Определение языка
    console.log('--- Тест 7: Определение языка ---');
    const testTexts = [
      'Создать функцию',
      'Create a function',
      'Объясни как работает',
      'Explain how it works'
    ];
    testTexts.forEach(text => {
      const lang = router.detectLanguage(text);
      console.log(`"${text}" → ${lang === 'ru' ? 'Русский' : 'Английский'}`);
    });
    console.log('');

    // Тест 8: Классификация задач
    console.log('--- Тест 8: Классификация задач ---');
    const testTasks = [
      'Создать функцию для парсинга данных',
      'Объясни как работает этот код',
      'Переведи текст на английский',
      'Проанализируй этот файл',
      'Почему это не работает?',
      'Create a function to parse data',
      'Explain how this code works'
    ];
    testTasks.forEach(task => {
      const type = router.classifyTask(task);
      const model = router.selectModel(type);
      const lang = router.detectLanguage(task);
      console.log(`"${task.substring(0, 40)}..." → Тип: ${type}, Модель: ${model}, Язык: ${lang}`);
    });
    console.log('');

    // Тест 9: Прямой запрос к DeepSeek
    console.log('--- Тест 9: Прямой запрос к DeepSeek ---');
    try {
      const response5 = await router.queryLMStudio('deepseek', 'Привет! Как дела? Ответь кратко.', {
        temperature: 0.7,
        max_tokens: 100
      });
      console.log('✅ Ответ получен:');
      console.log(response5.substring(0, 200));
      console.log('...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 10: Прямой запрос к Falcon (английский)
    console.log('--- Тест 10: Прямой запрос к Falcon (английский) ---');
    try {
      const response6 = await router.queryLMStudio('falcon', 'Write a simple hello world function in JavaScript', {
        temperature: 0.7,
        max_tokens: 200
      });
      console.log('✅ Ответ получен:');
      console.log(response6.substring(0, 300));
      console.log('...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 11: Тест перевода через DeepSeek
    console.log('--- Тест 11: Тест перевода через DeepSeek ---');
    try {
      const russianText = 'Создать функцию для сложения двух чисел';
      console.log(`Исходный текст (русский): "${russianText}"`);
      const translated = await router.translateToEnglish(russianText);
      console.log(`Переведенный текст (английский): "${translated}"\n`);
    } catch (error) {
      console.error('❌ Ошибка перевода:', error.message);
    }

    console.log('=== Тестирование завершено ===');
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск теста
testModels();







