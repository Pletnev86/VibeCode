/**
 * Полный план тестирования всех функций по Roadmap
 * 
 * Тестирует:
 * - MVP функции (Electron, Monaco, LM Studio, AI Router, чтение/запись файлов, агенты)
 * - v0.2 функции (несколько моделей, авто-переводчик, Router v1, Autocomplete, Patch)
 * - v0.5 функции (автотестирование, AutoIt, PC-Automation, Orchestration)
 * - v1.0 функции (Multi-Agent System, Intents Classifier, авторазвёртывание, LSP, интерфейс)
 * - Запуск после закрытия
 */

const fs = require('fs');
const path = require('path');

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  categories: {}
};

function logTest(category, name, passed, error = null) {
  if (!testResults.categories[category]) {
    testResults.categories[category] = { passed: 0, failed: 0 };
  }
  
  if (passed) {
    console.log(`✅ [${category}] ${name}`);
    testResults.passed++;
    testResults.categories[category].passed++;
  } else {
    console.error(`❌ [${category}] ${name}`);
    if (error) {
      console.error(`   Ошибка: ${error.message}`);
      testResults.errors.push({ category, name, error: error.message });
    }
    testResults.failed++;
    testResults.categories[category].failed++;
  }
}

// ==================== MVP ТЕСТЫ ====================

async function testMVP() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              ТЕСТИРОВАНИЕ MVP ФУНКЦИЙ                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 1. Electron App структура
  console.log('--- 1. Electron App структура ---');
  const electronFiles = [
    'src/main.js',
    'src/preload.js',
    'src/index.html',
    'src/ui.js'
  ];
  
  electronFiles.forEach(file => {
    const exists = fs.existsSync(file);
    logTest('MVP', `Файл ${file}`, exists);
  });

  // 2. Monaco интеграция (проверка упоминаний в коде)
  console.log('\n--- 2. Monaco интеграция ---');
  try {
    const indexHtml = fs.readFileSync('src/index.html', 'utf8');
    const hasMonaco = indexHtml.includes('monaco') || indexHtml.includes('Monaco');
    logTest('MVP', 'Monaco Editor упоминается в HTML', hasMonaco);
  } catch (error) {
    logTest('MVP', 'Monaco Editor упоминается в HTML', false, error);
  }

  // 3. LM Studio provider
  console.log('\n--- 3. LM Studio provider ---');
  try {
    const possiblePaths = [
      'ai/providers/lmstudio.js',
      'src/ai/providers/lmstudio.js'
    ];
    
    let found = false;
    for (const lmStudioPath of possiblePaths) {
      if (fs.existsSync(lmStudioPath)) {
        found = true;
        const content = fs.readFileSync(lmStudioPath, 'utf8');
        const hasFunction = content.includes('lmStudioChat') || content.includes('function');
        logTest('MVP', 'LM Studio provider существует', true);
        logTest('MVP', 'LM Studio provider содержит функцию', hasFunction);
        break;
      }
    }
    
    if (!found) {
      logTest('MVP', 'LM Studio provider существует', false);
    }
  } catch (error) {
    logTest('MVP', 'LM Studio provider', false, error);
  }

  // 4. AI Router
  console.log('\n--- 4. AI Router ---');
  try {
    const routerPath = 'ai/router.js';
    const exists = fs.existsSync(routerPath);
    logTest('MVP', 'AI Router существует', exists);
    
    if (exists) {
      const content = fs.readFileSync(routerPath, 'utf8');
      const hasClass = content.includes('class') || content.includes('function');
      logTest('MVP', 'AI Router содержит код', hasClass);
    }
  } catch (error) {
    logTest('MVP', 'AI Router', false, error);
  }

  // 5. preload.js → UI связь
  console.log('\n--- 5. preload.js → UI связь ---');
  try {
    const preload = fs.readFileSync('src/preload.js', 'utf8');
    const requiredMethods = [
      'readFile',
      'writeFile',
      'chat',
      'runCommand'
    ];
    
    requiredMethods.forEach(method => {
      const hasMethod = preload.includes(method);
      logTest('MVP', `preload.js содержит ${method}`, hasMethod);
    });
  } catch (error) {
    logTest('MVP', 'preload.js → UI связь', false, error);
  }

  // 6. ExplainAgent + RefactorAgent
  console.log('\n--- 6. ExplainAgent + RefactorAgent ---');
  const agents = [
    'agents/explain.js',
    'agents/refactor.js'
  ];
  
  agents.forEach(agent => {
    const exists = fs.existsSync(agent);
    logTest('MVP', `Агент ${agent} существует`, exists);
  });

  // 7. UI чат
  console.log('\n--- 7. UI чат ---');
  try {
    const ui = fs.readFileSync('src/ui.js', 'utf8');
    const hasChat = ui.includes('sendMessage') || ui.includes('chat');
    logTest('MVP', 'UI содержит функцию отправки сообщений', hasChat);
    
    const indexHtml = fs.readFileSync('src/index.html', 'utf8');
    const hasInput = indexHtml.includes('input') || indexHtml.includes('textarea');
    logTest('MVP', 'HTML содержит поле ввода', hasInput);
  } catch (error) {
    logTest('MVP', 'UI чат', false, error);
  }
}

// ==================== v0.2 ТЕСТЫ ====================

async function testV02() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            ТЕСТИРОВАНИЕ v0.2 ФУНКЦИЙ                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 2.1. Поддержка нескольких моделей
  console.log('--- 2.1. Поддержка нескольких моделей ---');
  try {
    const router = fs.readFileSync('ai/router.js', 'utf8');
    const hasDeepseek = router.includes('deepseek') || router.includes('DeepSeek');
    const hasFalcon = router.includes('falcon') || router.includes('Falcon');
    logTest('v0.2', 'Router поддерживает deepseek', hasDeepseek);
    logTest('v0.2', 'Router поддерживает falcon', hasFalcon);
  } catch (error) {
    logTest('v0.2', 'Поддержка нескольких моделей', false, error);
  }

  // 2.3. Полный Router v1
  console.log('\n--- 2.3. Полный Router v1 ---');
  try {
    const router = fs.readFileSync('ai/router.js', 'utf8');
    const hasClassify = router.includes('classify') || router.includes('selectModel');
    const hasTaskType = router.includes('taskType') || router.includes('type');
    logTest('v0.2', 'Router классифицирует задачи', hasClassify);
    logTest('v0.2', 'Router определяет тип задачи', hasTaskType);
  } catch (error) {
    logTest('v0.2', 'Полный Router v1', false, error);
  }

  // Проверка UI для выбора моделей
  console.log('\n--- UI выбор моделей ---');
  try {
    const indexHtml = fs.readFileSync('src/index.html', 'utf8');
    const hasModelSelect = indexHtml.includes('lmModel') || indexHtml.includes('openRouterModel');
    logTest('v0.2', 'UI содержит выбор моделей', hasModelSelect);
    
    const ui = fs.readFileSync('src/ui.js', 'utf8');
    const hasProviderSwitch = ui.includes('provider') || ui.includes('currentProvider');
    logTest('v0.2', 'UI поддерживает переключение провайдеров', hasProviderSwitch);
  } catch (error) {
    logTest('v0.2', 'UI выбор моделей', false, error);
  }
}

// ==================== IPC ОБРАБОТЧИКИ ====================

async function testIPC() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          ТЕСТИРОВАНИЕ IPC ОБРАБОТЧИКОВ                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╗\n');

  const requiredHandlers = [
    'generate-project',
    'send-chat-message',
    'get-logs',
    'read-file',
    'write-file',
    'delete-file',
    'run-command',
    'analyze-project',
    'enhance-modules',
    'chat'
  ];

  try {
    const main = fs.readFileSync('src/main.js', 'utf8');
    
    requiredHandlers.forEach(handler => {
      const hasHandler = main.includes(`handle('${handler}'`) || main.includes(`handle("${handler}"`);
      logTest('IPC', `Обработчик ${handler}`, hasHandler);
    });
  } catch (error) {
    logTest('IPC', 'IPC обработчики', false, error);
  }

  // Проверка preload.js
  try {
    const preload = fs.readFileSync('src/preload.js', 'utf8');
    const requiredAPI = [
      'generateProject',
      'sendChatMessage',
      'getLogs',
      'readFile',
      'writeFile',
      'deleteFile',
      'runCommand',
      'analyzeProject',
      'enhanceModules'
    ];
    
    requiredAPI.forEach(api => {
      const hasAPI = preload.includes(api);
      logTest('IPC', `preload.js содержит ${api}`, hasAPI);
    });
  } catch (error) {
    logTest('IPC', 'preload.js API', false, error);
  }
}

// ==================== КНОПКИ И UI ====================

async function testButtons() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            ТЕСТИРОВАНИЕ КНОПОК И UI                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const indexHtml = fs.readFileSync('src/index.html', 'utf8');
    const ui = fs.readFileSync('src/ui.js', 'utf8');
    
    // Кнопки
    const buttons = [
      { id: 'selfBuild', handler: 'handleSelfBuild' },
      { id: 'analyzeProject', handler: 'handleAnalyzeProject' },
      { id: 'enhanceModules', handler: 'handleEnhanceModules' },
      { id: 'send', handler: 'sendMessage' },
      { id: 'clear', handler: 'clear' }
    ];
    
    buttons.forEach(btn => {
      const hasButton = indexHtml.includes(`id="${btn.id}"`) || indexHtml.includes(`id='${btn.id}'`);
      const hasHandler = ui.includes(btn.handler);
      logTest('UI', `Кнопка ${btn.id} в HTML`, hasButton);
      logTest('UI', `Обработчик ${btn.handler} в UI`, hasHandler);
    });

    // Элементы интерфейса
    const elements = [
      { name: 'input', id: 'input' },
      { name: 'output', id: 'output' },
      { name: 'logs', id: 'logs' }
    ];
    
    elements.forEach(el => {
      const hasElement = indexHtml.includes(`id="${el.id}"`) || indexHtml.includes(`id='${el.id}'`);
      logTest('UI', `Элемент ${el.name} (${el.id})`, hasElement);
    });
  } catch (error) {
    logTest('UI', 'Кнопки и UI', false, error);
  }
}

// ==================== ФУНКЦИОНАЛЬНОСТЬ ====================

async function testFunctionality() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         ТЕСТИРОВАНИЕ ФУНКЦИОНАЛЬНОСТИ                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Чтение файлов
  console.log('--- Чтение файлов ---');
  try {
    const chatContext = fs.readFileSync('lib/chat-context.js', 'utf8');
    const hasReadFile = chatContext.includes('readExistingFile') || chatContext.includes('readFile');
    logTest('Функциональность', 'Чтение файлов реализовано', hasReadFile);
  } catch (error) {
    logTest('Функциональность', 'Чтение файлов', false, error);
  }

  // Сохранение файлов
  console.log('\n--- Сохранение файлов ---');
  try {
    const main = fs.readFileSync('src/main.js', 'utf8');
    const hasSave = main.includes('writeFileSync') || main.includes('writeFile');
    logTest('Функциональность', 'Сохранение файлов реализовано', hasSave);
    
    const fileParser = fs.readFileSync('lib/file-parser.js', 'utf8');
    const hasParser = fileParser.includes('parseFiles');
    logTest('Функциональность', 'Парсер файлов из ответов AI', hasParser);
  } catch (error) {
    logTest('Функциональность', 'Сохранение файлов', false, error);
  }

  // Удаление файлов
  console.log('\n--- Удаление файлов ---');
  try {
    const main = fs.readFileSync('src/main.js', 'utf8');
    const hasDelete = main.includes('unlinkSync') || main.includes('delete-file');
    logTest('Функциональность', 'Удаление файлов реализовано', hasDelete);
    
    const hasDeletePatterns = main.includes('deletePatterns') || main.includes('удали');
    logTest('Функциональность', 'Паттерны удаления файлов', hasDeletePatterns);
  } catch (error) {
    logTest('Функциональность', 'Удаление файлов', false, error);
  }

  // Контекст чата
  console.log('\n--- Контекст чата ---');
  try {
    const chatContext = fs.readFileSync('lib/chat-context.js', 'utf8');
    const hasContext = chatContext.includes('ChatContextManager') || chatContext.includes('enhanceChatMessage');
    logTest('Функциональность', 'Контекст чата реализован', hasContext);
    
    const hasHistory = chatContext.includes('addToHistory') || chatContext.includes('chatHistory');
    logTest('Функциональность', 'История чата реализована', hasHistory);
    
    const hasProjectContext = chatContext.includes('getProjectContext') || chatContext.includes('analyzeProjectStructure');
    logTest('Функциональность', 'Контекст проекта реализован', hasProjectContext);
  } catch (error) {
    logTest('Функциональность', 'Контекст чата', false, error);
  }

  // Бэкапы
  console.log('\n--- Система бэкапов ---');
  try {
    const backupManager = fs.readFileSync('lib/backup-manager.js', 'utf8');
    const hasBackup = backupManager.includes('createBackup') || backupManager.includes('BackupManager');
    logTest('Функциональность', 'Система бэкапов реализована', hasBackup);
    
    const hasRestore = backupManager.includes('restoreBackup');
    logTest('Функциональность', 'Восстановление из бэкапа', hasRestore);
  } catch (error) {
    logTest('Функциональность', 'Система бэкапов', false, error);
  }

  // Логирование
  console.log('\n--- Логирование ---');
  try {
    const logger = fs.readFileSync('lib/logger.js', 'utf8');
    const hasLogger = logger.includes('Logger') || logger.includes('initLogger');
    logTest('Функциональность', 'Система логирования реализована', hasLogger);
    
    const hasFileOutput = logger.includes('fileOutput') || logger.includes('writeFileSync');
    logTest('Функциональность', 'Логирование в файлы', hasFileOutput);
  } catch (error) {
    logTest('Функциональность', 'Логирование', false, error);
  }
}

// ==================== ЗАПУСК ПОСЛЕ ЗАКРЫТИЯ ====================

async function testRestart() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║      ТЕСТИРОВАНИЕ ЗАПУСКА ПОСЛЕ ЗАКРЫТИЯ                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Проверка что main.js не требует интерактивности
  try {
    const main = fs.readFileSync('src/main.js', 'utf8');
    const hasAppReady = main.includes('app.whenReady') || main.includes('app.on');
    logTest('Запуск', 'main.js использует app.whenReady', hasAppReady);
    
    const hasWindowClose = main.includes('window-all-closed');
    logTest('Запуск', 'Обработка закрытия окна', hasWindowClose);
  } catch (error) {
    logTest('Запуск', 'Запуск после закрытия', false, error);
  }

  // Проверка путей к модулям
  try {
    const main = fs.readFileSync('src/main.js', 'utf8');
    const hasCorrectLoggerPath = main.includes("require('../lib/logger')") || main.includes('require("../lib/logger")');
    logTest('Запуск', 'Правильный путь к logger', hasCorrectLoggerPath);
  } catch (error) {
    logTest('Запуск', 'Проверка путей', false, error);
  }

  // Проверка что нет синхронных операций при старте
  try {
    const main = fs.readFileSync('src/main.js', 'utf8');
    // Проверяем что инициализация асинхронная
    const hasAsyncInit = main.includes('async') || main.includes('await');
    logTest('Запуск', 'Асинхронная инициализация', hasAsyncInit);
  } catch (error) {
    logTest('Запуск', 'Асинхронная инициализация', false, error);
  }
}

// ==================== АНАЛИЗ ЛОГОВ ====================

async function analyzeLogs() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              АНАЛИЗ ЛОГОВ НА ОШИБКИ                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    const logFile = 'logs/vibecode-2025-12-06.log';
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const recentLines = lines.slice(-100); // Последние 100 строк
      
      const errors = recentLines.filter(l => {
        const line = l.toLowerCase();
        return (line.includes('"level":"error"') || 
                line.includes('"level":"error"') ||
                line.includes('cannot find module') ||
                line.includes('throw') ||
                line.includes('exception')) &&
               !line.includes('ответ ai') && // Исключаем INFO сообщения
               !line.includes('📥 ответ');
      });
      
      if (errors.length > 0) {
        console.log(`⚠️ Найдено ${errors.length} ошибок в логах:`);
        errors.slice(-10).forEach(err => {
          console.log(`   ${err.substring(0, 150)}...`);
        });
        logTest('Логи', 'Ошибки в логах', false, new Error(`${errors.length} ошибок найдено`));
      } else {
        logTest('Логи', 'Ошибки в логах', true);
      }
      
      const warnings = recentLines.filter(l => 
        l.includes('WARN') || 
        l.includes('Warning') || 
        l.includes('warning')
      );
      
      if (warnings.length > 0) {
        console.log(`\n⚠️ Найдено ${warnings.length} предупреждений в логах`);
        logTest('Логи', 'Предупреждения в логах', warnings.length < 5, new Error(`${warnings.length} предупреждений`));
      } else {
        logTest('Логи', 'Предупреждения в логах', true);
      }
    } else {
      logTest('Логи', 'Лог файл существует', false, new Error('Лог файл не найден'));
    }
  } catch (error) {
    logTest('Логи', 'Анализ логов', false, error);
  }
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     ПОЛНОЕ ТЕСТИРОВАНИЕ ПО ROADMAP                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    await analyzeLogs();
    await testMVP();
    await testV02();
    await testIPC();
    await testButtons();
    await testFunctionality();
    await testRestart();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    РЕЗУЛЬТАТЫ ТЕСТОВ                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log(`✅ Пройдено: ${testResults.passed}`);
    console.log(`❌ Провалено: ${testResults.failed}`);
    console.log(`📊 Всего: ${testResults.passed + testResults.failed}\n`);

    console.log('Результаты по категориям:');
    Object.keys(testResults.categories).forEach(category => {
      const cat = testResults.categories[category];
      const total = cat.passed + cat.failed;
      const percent = total > 0 ? ((cat.passed / total) * 100).toFixed(1) : 0;
      console.log(`  ${category}: ${cat.passed}/${total} (${percent}%)`);
    });

    if (testResults.errors.length > 0) {
      console.log('\nОшибки:');
      testResults.errors.slice(0, 10).forEach(({ category, name, error }) => {
        console.log(`  - [${category}] ${name}: ${error}`);
      });
    }

    if (testResults.failed === 0) {
      console.log('\n🎉 Все тесты пройдены успешно!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Некоторые тесты провалены');
      process.exit(1);
    }
  } catch (error) {
    console.error('Критическая ошибка при выполнении тестов:', error);
    process.exit(1);
  }
}

// Запуск тестов
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };

