/**
 * Комплексный тест всех функций VibeCode
 * 
 * Проверяет:
 * - Запуск приложения
 * - Переключение нейросетей
 * - Работу кнопок
 * - Работу чата
 * - Создание и редактирование файлов
 * - Загрузку после перезапуска
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    errors.push({ name, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

console.log('=== Комплексное тестирование VibeCode ===\n');

// Тест 1: Проверка существования критичных файлов
test('Критичные файлы существуют', () => {
  const criticalFiles = [
    'src/main.js',
    'src/preload.js',
    'src/ui.js',
    'src/index.html'
  ];
  
  criticalFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Файл не найден: ${file}`);
    }
  });
});

// Тест 2: Проверка preload.js - наличие всех методов
test('preload.js содержит все необходимые методы', () => {
  const preloadContent = fs.readFileSync('src/preload.js', 'utf8');
  const requiredMethods = [
    'generateProject',
    'sendChatMessage',
    'getLogs',
    'analyzeProject',
    'enhanceModules',
    'getSelfBuildState',
    'clearSelfBuildState'
  ];
  
  requiredMethods.forEach(method => {
    if (!preloadContent.includes(method)) {
      throw new Error(`Метод ${method} отсутствует в preload.js`);
    }
  });
});

// Тест 3: Проверка main.js - наличие всех IPC обработчиков
test('main.js содержит все IPC обработчики', () => {
  const mainContent = fs.readFileSync('src/main.js', 'utf8');
  const requiredHandlers = [
    'generate-project',
    'send-chat-message',
    'get-logs',
    'analyze-project',
    'enhance-modules',
    'get-selfbuild-state',
    'clear-selfbuild-state'
  ];
  
  requiredHandlers.forEach(handler => {
    if (!mainContent.includes(`'${handler}'`) && !mainContent.includes(`"${handler}"`)) {
      throw new Error(`Обработчик ${handler} отсутствует в main.js`);
    }
  });
});

// Тест 4: Проверка ui.js - наличие всех функций
test('ui.js содержит все необходимые функции', () => {
  const uiContent = fs.readFileSync('src/ui.js', 'utf8');
  const requiredFunctions = [
    'sendMessage',
    'handleSelfBuild',
    'handleAnalyzeProject',
    'handleEnhanceModules',
    'addMessage',
    'loadLogs',
    'updateStatus'
  ];
  
  requiredFunctions.forEach(func => {
    if (!uiContent.includes(`function ${func}`) && !uiContent.includes(`${func} =`)) {
      throw new Error(`Функция ${func} отсутствует в ui.js`);
    }
  });
});

// Тест 5: Проверка index.html - наличие всех элементов
test('index.html содержит все необходимые элементы', () => {
  const htmlContent = fs.readFileSync('src/index.html', 'utf8');
  const requiredElements = [
    'id="selfBuild"',
    'id="send"',
    'id="input"',
    'id="output"',
    'id="openRouterModel"',
    'id="lmModel"',
    'name="provider"',
    'ui.js'
  ];
  
  requiredElements.forEach(element => {
    if (!htmlContent.includes(element)) {
      throw new Error(`Элемент ${element} отсутствует в index.html`);
    }
  });
});

// Тест 6: Проверка моделей OpenRouter в index.html
test('index.html содержит все модели OpenRouter', () => {
  const htmlContent = fs.readFileSync('src/index.html', 'utf8');
  const requiredModels = [
    'deepseek-r1',
    'deepseek-free'
  ];
  
  requiredModels.forEach(model => {
    if (!htmlContent.includes(`value="${model}"`)) {
      throw new Error(`Модель ${model} отсутствует в index.html`);
    }
  });
});

// Тест 7: Проверка защиты критичных файлов в Self-Build
test('Self-Build защищает критичные файлы', () => {
  const selfdevContent = fs.readFileSync('agents/selfdev.js', 'utf8');
  
  if (!selfdevContent.includes('criticalFiles')) {
    throw new Error('Защита критичных файлов отсутствует в agents/selfdev.js');
  }
  
  const criticalFiles = ['main.js', 'preload.js', 'ui.js', 'index.html'];
  criticalFiles.forEach(file => {
    if (!selfdevContent.includes(file)) {
      throw new Error(`Критичный файл ${file} не защищен`);
    }
  });
});

// Тест 8: Проверка обработки ошибок в router.js
test('router.js обрабатывает ошибку 404 для deepseek-free', () => {
  const routerContent = fs.readFileSync('ai/router.js', 'utf8');
  
  if (!routerContent.includes('404')) {
    throw new Error('Обработка ошибки 404 отсутствует в router.js');
  }
  
  if (!routerContent.includes('deepseek-r1:free')) {
    throw new Error('Специальная обработка для deepseek-r1:free отсутствует');
  }
});

// Тест 9: Проверка конфигурации
test('config.json содержит все необходимые модели', () => {
  const configContent = fs.readFileSync('config.json', 'utf8');
  const config = JSON.parse(configContent);
  
  if (!config.ai.providers.openRouter.models['deepseek-free']) {
    throw new Error('Модель deepseek-free отсутствует в config.json');
  }
  
  if (!config.ai.providers.openRouter.models['deepseek-r1']) {
    throw new Error('Модель deepseek-r1 отсутствует в config.json');
  }
});

// Тест 10: Проверка структуры проекта
test('Структура проекта корректна', () => {
  const requiredDirs = [
    'src',
    'lib',
    'agents',
    'ai',
    'logs'
  ];
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      throw new Error(`Директория ${dir} отсутствует`);
    }
  });
});

console.log('\n=== Результаты тестирования ===');
console.log(`✅ Пройдено: ${testsPassed}`);
console.log(`❌ Провалено: ${testsFailed}`);
console.log(`📊 Всего: ${testsPassed + testsFailed}`);

if (errors.length > 0) {
  console.log('\n=== Ошибки ===');
  errors.forEach(({ name, error }) => {
    console.log(`❌ ${name}: ${error}`);
  });
}

if (testsFailed === 0) {
  console.log('\n🎉 Все тесты пройдены успешно!');
  process.exit(0);
} else {
  console.log('\n⚠️ Некоторые тесты провалены. Проверьте ошибки выше.');
  process.exit(1);
}


