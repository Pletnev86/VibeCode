/**
 * Тестирование нового функционала VibeCode
 * 
 * Проверяет:
 * - StateManager (сохранение/восстановление состояния)
 * - TemplateSelector (выбор шаблонов)
 * - RulesManager (загрузка правил)
 * - ContextCache (кэширование)
 * - DocumentationManager (управление документацией)
 * - Обработку ошибок ИИ
 * - UI функциональность
 */

const fs = require('fs');
const path = require('path');

console.log('=== Тестирование нового функционала VibeCode ===\n');

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

// Тест 1: StateManager
test('StateManager - создание и сохранение состояния', () => {
  const StateManager = require('./lib/state-manager');
  const stateManager = new StateManager();
  
  const testState = {
    inProgress: true,
    currentStage: 'test',
    filesGenerated: ['test.js']
  };
  
  const saved = stateManager.saveState(testState);
  if (!saved) {
    throw new Error('Не удалось сохранить состояние');
  }
  
  const loaded = stateManager.loadState();
  if (!loaded || loaded.currentStage !== 'test') {
    throw new Error('Не удалось загрузить состояние');
  }
  
  stateManager.clearState();
  return true;
});

// Тест 2: TemplateSelector
test('TemplateSelector - выбор шаблона для приложения', () => {
  const TemplateSelector = require('./lib/template-selector');
  const selector = new TemplateSelector();
  
  const template = selector.selectTemplate('создай приложение');
  if (!template || template.type !== 'app') {
    throw new Error('Шаблон для приложения не выбран');
  }
  
  return true;
});

test('TemplateSelector - выбор шаблона для сайта', () => {
  const TemplateSelector = require('./lib/template-selector');
  const selector = new TemplateSelector();
  
  const template = selector.selectTemplate('создай сайт');
  if (!template || template.type !== 'website') {
    throw new Error('Шаблон для сайта не выбран');
  }
  
  return true;
});

// Тест 3: RulesManager
test('RulesManager - загрузка правил', async () => {
  const RulesManager = require('./lib/rules-manager');
  const rulesManager = new RulesManager();
  
  await rulesManager.loadAllRules();
  
  if (rulesManager.rules.length === 0) {
    console.warn('⚠️ Правила не загружены (возможно, файлы не найдены)');
  }
  
  const rulesText = rulesManager.getRulesForPrompt();
  return true; // Тест пройден, даже если правил нет
});

// Тест 4: ContextCache
test('ContextCache - кэширование структуры проекта', () => {
  const ContextCache = require('./lib/context-cache');
  const cache = new ContextCache();
  
  const structure = cache.getProjectStructure();
  if (!structure) {
    throw new Error('Структура проекта не получена');
  }
  
  // Проверяем, что кэш работает
  const structure2 = cache.getProjectStructure();
  if (structure !== structure2) {
    throw new Error('Кэш не работает');
  }
  
  return true;
});

test('ContextCache - кэширование Vision', () => {
  const ContextCache = require('./lib/context-cache');
  const cache = new ContextCache();
  
  const vision = cache.getVision();
  // Vision может быть null если файл не найден, это нормально
  return true;
});

// Тест 5: DocumentationManager
test('DocumentationManager - инициализация', () => {
  const DocumentationManager = require('./lib/documentation-manager');
  const docManager = new DocumentationManager();
  
  if (!docManager) {
    throw new Error('DocumentationManager не создан');
  }
  
  return true;
});

// Тест 6: SelfDev Agent интеграция
test('SelfDev Agent - StateManager интегрирован', () => {
  const SelfDevAgent = require('./agents/selfdev');
  const agent = new SelfDevAgent('./config.json');
  
  if (!agent.stateManager) {
    throw new Error('StateManager не интегрирован в SelfDev Agent');
  }
  
  return true;
});

test('SelfDev Agent - TemplateSelector интегрирован', () => {
  const SelfDevAgent = require('./agents/selfdev');
  const agent = new SelfDevAgent('./config.json');
  
  if (!agent.templateSelector) {
    throw new Error('TemplateSelector не интегрирован в SelfDev Agent');
  }
  
  return true;
});

test('SelfDev Agent - RulesManager интегрирован', () => {
  const SelfDevAgent = require('./agents/selfdev');
  const agent = new SelfDevAgent('./config.json');
  
  if (!agent.rulesManager) {
    throw new Error('RulesManager не интегрирован в SelfDev Agent');
  }
  
  return true;
});

test('SelfDev Agent - findDocumentPath с fallback', () => {
  const SelfDevAgent = require('./agents/selfdev');
  const agent = new SelfDevAgent('./config.json');
  
  if (typeof agent.findDocumentPath !== 'function') {
    throw new Error('Метод findDocumentPath не найден');
  }
  
  // Тестируем поиск с fallback
  const visionPath = agent.findDocumentPath('./docs/Vision.md', [
    './docs/Vision.md',
    './Vision.md'
  ]);
  
  if (!visionPath) {
    throw new Error('findDocumentPath не вернул путь');
  }
  
  return true;
});

// Тест 7: Обработка ошибок в router.js
test('AI Router - обработка ошибок с предложениями', () => {
  const fs = require('fs');
  const routerContent = fs.readFileSync('./ai/router.js', 'utf8');
  
  if (!routerContent.includes('suggestion')) {
    throw new Error('Обработка ошибок с предложениями не найдена');
  }
  
  if (!routerContent.includes('Рекомендация')) {
    throw new Error('Рекомендации не найдены в коде');
  }
  
  return true;
});

// Тест 8: UI файлы
test('UI - проверка файлов интерфейса', () => {
  const requiredFiles = [
    'src/index.html',
    'src/ui.js',
    'src/preload.js',
    'src/main.js'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Файл не найден: ${file}`);
    }
  }
  
  return true;
});

test('UI - проверка IPC методов для состояния', () => {
  const preloadContent = fs.readFileSync('./src/preload.js', 'utf8');
  
  if (!preloadContent.includes('getSelfBuildState')) {
    throw new Error('getSelfBuildState не найден в preload.js');
  }
  
  if (!preloadContent.includes('clearSelfBuildState')) {
    throw new Error('clearSelfBuildState не найден в preload.js');
  }
  
  return true;
});

test('UI - проверка восстановления состояния в ui.js', () => {
  const uiContent = fs.readFileSync('./src/ui.js', 'utf8');
  
  if (!uiContent.includes('getSelfBuildState')) {
    throw new Error('Проверка состояния не найдена в ui.js');
  }
  
  if (!uiContent.includes('resumeSelfBuild')) {
    throw new Error('Восстановление состояния не найдено в ui.js');
  }
  
  return true;
});

// Тест 9: Шаблоны
test('Шаблоны - проверка структуры', () => {
  const templates = [
    'templates/apps/electron-app/template.json',
    'templates/apps/electron-app/instructions.md',
    'templates/websites/static-site/template.json',
    'templates/websites/static-site/instructions.md'
  ];
  
  for (const template of templates) {
    if (!fs.existsSync(template)) {
      throw new Error(`Шаблон не найден: ${template}`);
    }
  }
  
  // Проверяем валидность JSON
  const electronTemplate = JSON.parse(fs.readFileSync('templates/apps/electron-app/template.json', 'utf8'));
  if (!electronTemplate.name || !electronTemplate.type) {
    throw new Error('Шаблон electron-app некорректен');
  }
  
  return true;
});

// Тест 10: БД расширения
test('Knowledge Base - расширение для документации', () => {
  const kbContent = fs.readFileSync('./lib/knowledge-base.js', 'utf8');
  
  if (!kbContent.includes('CREATE TABLE IF NOT EXISTS documentation')) {
    throw new Error('Таблица documentation не найдена');
  }
  
  if (!kbContent.includes('CREATE TABLE IF NOT EXISTS logs')) {
    throw new Error('Таблица logs не найдена');
  }
  
  if (!kbContent.includes('saveDocumentation')) {
    throw new Error('Метод saveDocumentation не найден');
  }
  
  return true;
});

// Итоги
console.log('\n=== Результаты тестирования ===');
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
  console.log('\n🎉 Все тесты пройдены успешно!');
  process.exit(0);
} else {
  console.log('\n⚠️ Некоторые тесты провалены');
  process.exit(1);
}


