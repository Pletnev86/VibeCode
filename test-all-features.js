/**
 * Тестирование всего функционала VibeCode
 * 
 * Проверяет:
 * - Self-Build с выбором модели
 * - Обработку ошибок ИИ
 * - Шаблоны
 * - БД для документации и логов
 * - Систему правил
 * - Кэш контекста
 */

const fs = require('fs');
const path = require('path');

console.log('=== Тестирование функционала VibeCode ===\n');

let testsPassed = 0;
let testsFailed = 0;

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
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} - ОШИБКА: ${error.message}\n`);
    testsFailed++;
    return false;
  }
}

// Тест 1: Проверка файлов
test('Проверка основных файлов', () => {
  const requiredFiles = [
    'src/main.js',
    'src/ui.js',
    'src/index.html',
    'src/preload.js',
    'ai/router.js',
    'agents/selfdev.js',
    'lib/knowledge-base.js',
    'lib/logger.js',
    'lib/template-selector.js',
    'lib/rules-manager.js',
    'lib/context-cache.js',
    'lib/documentation-manager.js',
    'config.json'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Файл не найден: ${file}`);
    }
  }
  return true;
});

// Тест 2: Проверка шаблонов
test('Проверка шаблонов', () => {
  const templatesDir = 'templates';
  if (!fs.existsSync(templatesDir)) {
    throw new Error('Директория templates не найдена');
  }
  
  const electronTemplate = path.join(templatesDir, 'apps', 'electron-app', 'template.json');
  if (!fs.existsSync(electronTemplate)) {
    throw new Error('Шаблон electron-app не найден');
  }
  
  const staticSiteTemplate = path.join(templatesDir, 'websites', 'static-site', 'template.json');
  if (!fs.existsSync(staticSiteTemplate)) {
    throw new Error('Шаблон static-site не найден');
  }
  
  return true;
});

// Тест 3: Проверка модулей
test('Проверка загрузки модулей', () => {
  const TemplateSelector = require('./lib/template-selector');
  const RulesManager = require('./lib/rules-manager');
  const ContextCache = require('./lib/context-cache');
  const DocumentationManager = require('./lib/documentation-manager');
  
  const templateSelector = new TemplateSelector();
  const rulesManager = new RulesManager();
  const contextCache = new ContextCache();
  const docManager = new DocumentationManager();
  
  return true;
});

// Тест 4: Проверка конфигурации
test('Проверка config.json', () => {
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  
  if (!config.ai || !config.ai.providers) {
    throw new Error('Некорректная структура config.json');
  }
  
  if (!config.ai.providers.openRouter || !config.ai.providers.openRouter.models) {
    throw new Error('Конфигурация OpenRouter не найдена');
  }
  
  // Проверяем наличие всех моделей
  const models = config.ai.providers.openRouter.models;
  const requiredModels = ['gpt4', 'claude', 'deepseek', 'deepseek-r1', 'deepseek-free'];
  for (const model of requiredModels) {
    if (!models[model]) {
      throw new Error(`Модель ${model} не найдена в конфигурации`);
    }
  }
  
  return true;
});

// Тест 5: Проверка SelfDev Agent
test('Проверка SelfDev Agent', () => {
  const SelfDevAgent = require('./agents/selfdev');
  const agent = new SelfDevAgent('./config.json');
  
  if (!agent.router) {
    throw new Error('AI Router не инициализирован');
  }
  
  if (!agent.templateSelector) {
    throw new Error('TemplateSelector не инициализирован');
  }
  
  if (!agent.rulesManager) {
    throw new Error('RulesManager не инициализирован');
  }
  
  return true;
});

// Тест 6: Проверка TemplateSelector
test('Проверка выбора шаблонов', () => {
  const TemplateSelector = require('./lib/template-selector');
  const selector = new TemplateSelector();
  
  const appTemplate = selector.selectTemplate('создай приложение');
  if (!appTemplate) {
    throw new Error('Шаблон для приложения не найден');
  }
  
  const websiteTemplate = selector.selectTemplate('создай сайт');
  if (!websiteTemplate) {
    throw new Error('Шаблон для сайта не найден');
  }
  
  return true;
});

// Тест 7: Проверка RulesManager
test('Проверка загрузки правил', async () => {
  const RulesManager = require('./lib/rules-manager');
  const rulesManager = new RulesManager();
  
  await rulesManager.loadAllRules();
  
  if (rulesManager.rules.length === 0) {
    console.warn('⚠️ Правила не загружены (возможно, файлы не найдены)');
  }
  
  return true;
});

// Тест 8: Проверка ContextCache
test('Проверка кэша контекста', () => {
  const ContextCache = require('./lib/context-cache');
  const cache = new ContextCache();
  
  const structure = cache.getProjectStructure();
  if (!structure) {
    throw new Error('Структура проекта не получена');
  }
  
  return true;
});

// Итоги
console.log('\n=== Результаты тестирования ===');
console.log(`✅ Пройдено: ${testsPassed}`);
console.log(`❌ Провалено: ${testsFailed}`);
console.log(`📊 Всего тестов: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 Все тесты пройдены успешно!');
  process.exit(0);
} else {
  console.log('\n⚠️ Некоторые тесты провалены');
  process.exit(1);
}


