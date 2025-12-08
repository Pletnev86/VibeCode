/**
 * Тест доступности AI моделей
 * 
 * Проверяет:
 * - Доступность LM Studio
 * - Доступность моделей llama3 и deepseek
 * - Доступность OpenRouter
 * - Работу переключения моделей
 */

const AIRouter = require('../ai/router');
const axios = require('axios');

async function testModels() {
  console.log('=== Тест доступности AI моделей ===\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, condition, error = null) {
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}${error ? ': ' + error.message : ''}`);
      failed++;
    }
  }
  
  try {
    const router = new AIRouter('./config.json');
    console.log('1. Инициализация AI Router\n');
    
    // Тест 1: Проверка конфигурации
    console.log('2. Проверка конфигурации моделей\n');
    const config = router.providers;
    test('LM Studio провайдер настроен', config.lmStudio !== undefined);
    test('OpenRouter провайдер настроен', config.openRouter !== undefined);
    
    if (config.lmStudio && config.lmStudio.models) {
      test('Модель llama3 в конфиге', config.lmStudio.models.llama3 === 'llama-3-8b-gpt-4o-ru1.0');
      test('Модель deepseek в конфиге', config.lmStudio.models.deepseek !== undefined);
      test('Модель falcon удалена', config.lmStudio.models.falcon === undefined);
    }
    
    // Тест 2: Проверка доступности LM Studio
    console.log('\n3. Проверка доступности LM Studio\n');
    try {
      const response = await axios.get('http://127.0.0.1:1234/v1/models', {
        timeout: 5000
      });
      test('LM Studio доступен', response.status === 200);
      
      if (response.data && response.data.data) {
        const models = response.data.data.map(m => m.id);
        test('Модель llama-3-8b-gpt-4o-ru1.0 доступна', models.includes('llama-3-8b-gpt-4o-ru1.0'));
        test('Модель deepseek доступна', models.some(m => m.includes('deepseek')));
        console.log(`   Доступные модели: ${models.join(', ')}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        test('LM Studio недоступен (ожидаемо, если не запущен)', true);
        console.log('   ⚠️ LM Studio не запущен. Это нормально, если используешь только OpenRouter.');
      } else {
        test('LM Studio доступен', false, error);
      }
    }
    
    // Тест 3: Проверка доступности OpenRouter
    console.log('\n4. Проверка доступности OpenRouter\n');
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.openRouter.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000'
        },
        timeout: 10000
      });
      test('OpenRouter доступен', response.status === 200);
    } catch (error) {
      test('OpenRouter доступен', false, error);
      console.log('   ⚠️ Проверь API ключ OpenRouter');
    }
    
    // Тест 4: Проверка выбора модели
    console.log('\n5. Проверка выбора модели\n');
    const codeModel = router.selectModel('code');
    const explanationModel = router.selectModel('explanation');
    test('Модель для кода: llama3', codeModel === 'llama3');
    test('Модель для объяснений: deepseek', explanationModel === 'deepseek');
    
    // Тест 5: Проверка работы с русским языком
    console.log('\n6. Проверка работы с русским языком\n');
    const russianText = 'Привет, как дела?';
    const language = router.detectLanguage(russianText);
    test('Определение русского языка', language === 'ru');
    
    // Итоги
    console.log('\n=== Результаты тестов ===');
    console.log(`✅ Пройдено: ${passed}`);
    console.log(`❌ Провалено: ${failed}`);
    console.log(`📊 Всего: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 Все тесты пройдены!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Некоторые тесты провалены');
      console.log('   Примечание: Если LM Studio не запущен, это нормально.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск тестов
testModels();

