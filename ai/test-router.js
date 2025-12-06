/**
 * Тестовый скрипт для проверки работы AI Router
 * 
 * Запуск: node ai/test-router.js
 */

const AIRouter = require('./router');

async function testRouter() {
  console.log('=== Тест AI Router ===\n');

  try {
    // Создание экземпляра роутера
    const router = new AIRouter('./config.json');
    console.log('✅ Router создан успешно');

    // Тест классификации задач
    console.log('\n--- Тест классификации задач ---');
    const testTasks = [
      'Создать функцию для парсинга данных',
      'Объясни как работает этот код',
      'Переведи текст на английский',
      'Проанализируй этот файл',
      'Почему это не работает?'
    ];

    testTasks.forEach(task => {
      const type = router.classifyTask(task);
      console.log(`Задача: "${task}" → Тип: ${type}`);
    });

    // Тест выбора модели
    console.log('\n--- Тест выбора модели ---');
    const taskTypes = ['code', 'explanation', 'translation', 'analysis', 'reasoning'];
    taskTypes.forEach(type => {
      const model = router.selectModel(type);
      console.log(`Тип: ${type} → Модель: ${model}`);
    });

    // Проверка доступности LM Studio
    console.log('\n--- Проверка доступности LM Studio ---');
    const isAvailable = await router.checkLMStudioAvailability();
    console.log(`LM Studio доступен: ${isAvailable ? '✅ Да' : '❌ Нет'}`);

    if (isAvailable) {
      // Тест получения списка моделей
      console.log('\n--- Получение списка моделей ---');
      const models = await router.getAvailableModels();
      console.log('Доступные модели:', JSON.stringify(models, null, 2));
    }

    console.log('\n=== Тест завершен ===');
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск теста
testRouter();




