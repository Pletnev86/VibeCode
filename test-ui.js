/**
 * Тестирование работы интерфейса VibeCode
 * 
 * Проверяет:
 * - Структуру HTML
 * - Наличие всех элементов UI
 * - Стили и CSS
 * - JavaScript функциональность
 * - IPC методы
 */

const fs = require('fs');
const path = require('path');

console.log('=== Тестирование интерфейса VibeCode ===\n');

let testsPassed = 0;
let testsFailed = 0;
const errors = [];

function test(name, testFn) {
  try {
    console.log(`🧪 Тест: ${name}`);
    const result = testFn();
    if (result !== false) {
      console.log(`✅ ${name} - ПРОЙДЕН\n`);
      testsPassed++;
      return true;
    } else {
      console.log(`❌ ${name} - ПРОВАЛЕН\n`);
      testsFailed++;
      errors.push(`${name}: тест вернул false`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} - ОШИБКА: ${error.message}\n`);
    testsFailed++;
    errors.push(`${name}: ${error.message}`);
    return false;
  }
}

// Тест 1: Структура HTML
test('HTML - наличие основных элементов', () => {
  const html = fs.readFileSync('./src/index.html', 'utf8');
  
  const requiredElements = [
    'id="selfBuild"',
    'id="analyzeProject"',
    'id="enhanceModules"',
    'id="output"',
    'id="input"',
    'id="send"',
    'id="clear"',
    'id="logs"',
    'id="status"',
    'name="provider"',
    'id="lmModel"',
    'id="openRouterModel"'
  ];
  
  for (const element of requiredElements) {
    if (!html.includes(element)) {
      throw new Error(`Элемент не найден: ${element}`);
    }
  }
  
  return true;
});

// Тест 2: Стили
test('HTML - встроенные стили', () => {
  const html = fs.readFileSync('./src/index.html', 'utf8');
  
  if (!html.includes('<style>')) {
    throw new Error('Стили не найдены в HTML');
  }
  
  // Проверяем основные стили
  const requiredStyles = [
    'background: #1e1e1e',
    'font-family',
    '.header',
    '.sidebar',
    '.chat-panel',
    '.message'
  ];
  
  for (const style of requiredStyles) {
    if (!html.includes(style)) {
      throw new Error(`Стиль не найден: ${style}`);
    }
  }
  
  return true;
});

// Тест 3: Подключение скриптов
test('HTML - подключение ui.js', () => {
  const html = fs.readFileSync('./src/index.html', 'utf8');
  
  if (!html.includes('<script src="ui.js">')) {
    throw new Error('ui.js не подключен');
  }
  
  return true;
});

// Тест 4: UI.js функциональность
test('UI.js - наличие основных функций', () => {
  const ui = fs.readFileSync('./src/ui.js', 'utf8');
  
  const requiredFunctions = [
    'initializeUI',
    'sendMessage',
    'handleSelfBuild',
    'handleAnalyzeProject',
    'handleEnhanceModules',
    'addMessage',
    'updateStatus',
    'loadLogs'
  ];
  
  for (const func of requiredFunctions) {
    if (!ui.includes(`function ${func}`) && !ui.includes(`${func} =`)) {
      throw new Error(`Функция не найдена: ${func}`);
    }
  }
  
  return true;
});

// Тест 5: UI.js - обработка событий
test('UI.js - обработчики событий', () => {
  const ui = fs.readFileSync('./src/ui.js', 'utf8');
  
  const requiredHandlers = [
    'addEventListener(\'click\'',
    'addEventListener(\'keydown\'',
    'addEventListener(\'change\''
  ];
  
  for (const handler of requiredHandlers) {
    if (!ui.includes(handler)) {
      throw new Error(`Обработчик событий не найден: ${handler}`);
    }
  }
  
  return true;
});

// Тест 6: UI.js - восстановление состояния
test('UI.js - проверка состояния Self-Build', () => {
  const ui = fs.readFileSync('./src/ui.js', 'utf8');
  
  if (!ui.includes('getSelfBuildState')) {
    throw new Error('Проверка состояния Self-Build не найдена');
  }
  
  if (!ui.includes('resumeSelfBuild')) {
    throw new Error('Восстановление Self-Build не найдено');
  }
  
  return true;
});

// Тест 7: Preload.js - IPC методы
test('Preload.js - все IPC методы', () => {
  const preload = fs.readFileSync('./src/preload.js', 'utf8');
  
  const requiredMethods = [
    'generateProject',
    'sendChatMessage',
    'getLogs',
    'analyzeProject',
    'enhanceModules',
    'getSelfBuildState',
    'clearSelfBuildState'
  ];
  
  for (const method of requiredMethods) {
    if (!preload.includes(method)) {
      throw new Error(`IPC метод не найден: ${method}`);
    }
  }
  
  return true;
});

// Тест 8: Main.js - IPC обработчики
test('Main.js - IPC обработчики для UI', () => {
  const main = fs.readFileSync('./src/main.js', 'utf8');
  
  const requiredHandlers = [
    'ipcMain.handle(\'generate-project\'',
    'ipcMain.handle(\'send-chat-message\'',
    'ipcMain.handle(\'get-logs\'',
    'ipcMain.handle(\'get-selfbuild-state\'',
    'ipcMain.handle(\'clear-selfbuild-state\''
  ];
  
  for (const handler of requiredHandlers) {
    if (!main.includes(handler)) {
      throw new Error(`IPC обработчик не найден: ${handler}`);
    }
  }
  
  return true;
});

// Тест 9: Модели OpenRouter в UI
test('HTML - все модели OpenRouter', () => {
  const html = fs.readFileSync('./src/index.html', 'utf8');
  
  const requiredModels = [
    'value="gpt4"',
    'value="claude"',
    'value="deepseek"',
    'value="deepseek-r1"',
    'value="deepseek-free"'
  ];
  
  for (const model of requiredModels) {
    if (!html.includes(model)) {
      throw new Error(`Модель не найдена в UI: ${model}`);
    }
  }
  
  return true;
});

// Тест 10: Обработка ошибок в UI
test('UI.js - обработка ошибок с предложениями', () => {
  const ui = fs.readFileSync('./src/ui.js', 'utf8');
  
  if (!ui.includes('suggestion')) {
    throw new Error('Обработка предложений не найдена');
  }
  
  if (!ui.includes('error-suggestion')) {
    throw new Error('Блок error-suggestion не найден');
  }
  
  return true;
});

// Тест 11: Горячие клавиши
test('UI.js - горячие клавиши', () => {
  const ui = fs.readFileSync('./src/ui.js', 'utf8');
  
  // Проверяем наличие обработки горячих клавиш
  if (!ui.includes('Ctrl+Enter') && !ui.includes('ctrlKey')) {
    throw new Error('Горячие клавиши не найдены');
  }
  
  return true;
});

// Тест 12: Статус и логи
test('UI.js - обновление статуса и логов', () => {
  const ui = fs.readFileSync('./src/ui.js', 'utf8');
  
  if (!ui.includes('updateStatus')) {
    throw new Error('Функция updateStatus не найдена');
  }
  
  if (!ui.includes('loadLogs')) {
    throw new Error('Функция loadLogs не найдена');
  }
  
  return true;
});

// Итоги
console.log('\n=== Результаты тестирования интерфейса ===');
console.log(`✅ Пройдено: ${testsPassed}`);
console.log(`❌ Провалено: ${testsFailed}`);
console.log(`📊 Всего тестов: ${testsPassed + testsFailed}`);

if (errors.length > 0) {
  console.log('\n=== Ошибки ===');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });
}

if (testsFailed === 0) {
  console.log('\n🎉 Все тесты интерфейса пройдены успешно!');
  process.exit(0);
} else {
  console.log('\n⚠️ Некоторые тесты интерфейса провалены');
  process.exit(1);
}

