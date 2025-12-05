/**
 * Быстрое тестирование локальных моделей (короткие запросы)
 */

const AIRouter = require('./ai/router');

async function quickTest() {
  console.log('=== Быстрое тестирование моделей ===\n');

  const router = new AIRouter('./config.json');

  try {
    // Проверка доступности
    console.log('Проверка доступности LM Studio...');
    const isAvailable = await router.checkLMStudioAvailability();
    console.log(`LM Studio: ${isAvailable ? '✅ Доступен' : '❌ Недоступен'}\n`);

    if (!isAvailable) {
      console.error('Запустите LM Studio и загрузите модели!');
      return;
    }

    // Тест 1: DeepSeek - короткий запрос
    console.log('--- Тест 1: DeepSeek (русский, короткий) ---');
    try {
      const start = Date.now();
      const response = await router.queryLMStudio('deepseek', 'Привет! Ответь одним словом: хорошо.', {
        temperature: 0.7,
        max_tokens: 50
      });
      const duration = Date.now() - start;
      console.log(`✅ Ответ получен за ${duration}ms:`);
      console.log(response.substring(0, 200));
      console.log('');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест 2: Определение языка и классификация
    console.log('--- Тест 2: Определение языка и классификация ---');
    const tests = [
      'Создать функцию',
      'Create a function',
      'Объясни',
      'Explain'
    ];
    tests.forEach(text => {
      const lang = router.detectLanguage(text);
      const type = router.classifyTask(text);
      const model = router.selectModel(type);
      console.log(`"${text}" → ${lang === 'ru' ? 'RU' : 'EN'}, тип: ${type}, модель: ${model}`);
    });
    console.log('');

    // Тест 3: Проверка перевода (без выполнения, только проверка логики)
    console.log('--- Тест 3: Логика перевода ---');
    const russianCode = 'Создать функцию для сложения';
    const lang = router.detectLanguage(russianCode);
    const type = router.classifyTask(russianCode);
    const model = router.selectModel(type);
    console.log(`Запрос: "${russianCode}"`);
    console.log(`Язык: ${lang}, Тип: ${type}, Модель: ${model}`);
    if (model === 'falcon' && lang === 'ru') {
      console.log('✅ Логика перевода активирована: Falcon + русский = нужен перевод');
    } else {
      console.log('ℹ️ Перевод не требуется');
    }
    console.log('');

    // Тест 4: Получение списка моделей
    console.log('--- Тест 4: Список моделей ---');
    const models = await router.getAvailableModels();
    console.log(`Найдено моделей: ${models.local.length}`);
    models.local.forEach(m => console.log(`  - ${m.id}`));
    console.log('');

    console.log('=== Тестирование завершено ===');
    console.log('\nПримечание: Если модели отвечают медленно, это нормально для локальных моделей.');
    console.log('Убедитесь, что модели загружены в LM Studio и готовы к работе.');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

quickTest();



