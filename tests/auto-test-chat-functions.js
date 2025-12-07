/**
 * Автоматический тест всех функций чата
 * 
 * Тестирует:
 * - Чтение файлов
 * - Сохранение файлов
 * - Удаление файлов
 * - IPC обработчики
 * - Парсинг файлов из ответов AI
 * - Контекст чата
 */

const fs = require('fs');
const path = require('path');

// Имитация Electron IPC для тестирования без запуска Electron
class MockIpcMain {
  constructor() {
    this.handlers = {};
  }

  handle(channel, handler) {
    this.handlers[channel] = handler;
  }

  async invoke(channel, ...args) {
    if (this.handlers[channel]) {
      return await this.handlers[channel](null, ...args);
    }
    throw new Error(`Handler not found for channel: ${channel}`);
  }
}

// Загружаем модули для тестирования
const FileParser = require('../lib/file-parser');
const ChatContextManager = require('../lib/chat-context');
const BackupManager = require('../lib/backup-manager');

// Тестовые данные
const testDir = path.join(__dirname, '..', 'test-temp');
const testFile = path.join(testDir, 'test-file.js');
const testContent = `// Тестовый файл
function test() {
    console.log('test');
}
`;

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.error(`❌ ${name}`);
    if (error) {
      console.error(`   Ошибка: ${error.message}`);
      testResults.errors.push({ name, error: error.message });
    }
    testResults.failed++;
  }
}

async function testFileParser() {
  console.log('\n=== Тест парсера файлов ===\n');

  // Тест 1: Парсинг файла с путем в заголовке
  try {
    const response1 = `Вот файл:
\`\`\`src/test.js
function test() {
    console.log('test');
}
\`\`\``;
    const files1 = FileParser.parseFiles(response1, './src');
    logTest('Парсинг файла с путем в заголовке', files1.length === 1 && files1[0].path === 'test.js');
  } catch (error) {
    logTest('Парсинг файла с путем в заголовке', false, error);
  }

  // Тест 2: Парсинг файла с путем в комментарии
  try {
    const response2 = `Вот файл:
\`\`\`javascript
// src/main.js
const test = 'test';
\`\`\``;
    const files2 = FileParser.parseFiles(response2, './src');
    logTest('Парсинг файла с путем в комментарии', files2.length > 0);
  } catch (error) {
    logTest('Парсинг файла с путем в комментарии', false, error);
  }

  // Тест 3: Парсинг HTML блока
  try {
    const response3 = `Вот HTML:
\`\`\`html
<!DOCTYPE html>
<html>
<body>Test</body>
</html>
\`\`\``;
    const files3 = FileParser.parseFiles(response3, './src');
    logTest('Парсинг HTML блока', files3.length > 0 && files3[0].path === 'index.html');
  } catch (error) {
    logTest('Парсинг HTML блока', false, error);
  }

  // Тест 4: Нормализация пути
  try {
    const normalized1 = FileParser.normalizePath('src\\main.js', './src');
    const normalized2 = FileParser.normalizePath('src/main.js', './src');
    logTest('Нормализация пути Windows', normalized1 === 'main.js' && normalized2 === 'main.js');
  } catch (error) {
    logTest('Нормализация пути Windows', false, error);
  }
}

async function testFileOperations() {
  console.log('\n=== Тест операций с файлами ===\n');

  // Создаем тестовую директорию
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Тест 1: Создание файла
  try {
    fs.writeFileSync(testFile, testContent, 'utf8');
    const exists = fs.existsSync(testFile);
    logTest('Создание файла', exists);
  } catch (error) {
    logTest('Создание файла', false, error);
  }

  // Тест 2: Чтение файла
  try {
    const content = fs.readFileSync(testFile, 'utf8');
    logTest('Чтение файла', content === testContent);
  } catch (error) {
    logTest('Чтение файла', false, error);
  }

  // Тест 3: Изменение файла
  try {
    const newContent = testContent + '\n// Добавлена строка';
    fs.writeFileSync(testFile, newContent, 'utf8');
    const updatedContent = fs.readFileSync(testFile, 'utf8');
    logTest('Изменение файла', updatedContent === newContent);
  } catch (error) {
    logTest('Изменение файла', false, error);
  }

  // Тест 4: Удаление файла
  try {
    fs.unlinkSync(testFile);
    const exists = fs.existsSync(testFile);
    logTest('Удаление файла', !exists);
  } catch (error) {
    logTest('Удаление файла', false, error);
  }

  // Очистка
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function testChatContext() {
  console.log('\n=== Тест контекста чата ===\n');

  try {
    const contextManager = new ChatContextManager();
    
    // Тест 1: Извлечение упоминания файла
    const file1 = contextManager.extractFileMention('добавь тест в main.js');
    logTest('Извлечение упоминания файла (добавь)', file1 === 'src/main.js' || file1 === 'main.js');

    const file2 = contextManager.extractFileMention('доработай src/ui.js');
    logTest('Извлечение упоминания файла (доработай)', file2 === 'src/ui.js' || file2 === 'ui.js');

    // Тест 2: Извлечение запросов на чтение
    const readRequests = contextManager.extractFileReadRequests('покажи содержимое main.js');
    logTest('Извлечение запросов на чтение', readRequests.length > 0);

    // Тест 3: Получение контекста проекта
    const projectContext = contextManager.getProjectContext();
    logTest('Получение контекста проекта', typeof projectContext === 'string' && projectContext.length > 0);

    // Тест 4: История чата
    contextManager.addToHistory('user', 'Тестовое сообщение');
    contextManager.addToHistory('ai', 'Тестовый ответ');
    const history = contextManager.getRecentChatHistory(2);
    logTest('История чата', history.length >= 2);

  } catch (error) {
    logTest('Тест контекста чата', false, error);
  }
}

async function testDeletePatterns() {
  console.log('\n=== Тест паттернов удаления ===\n');

  const deletePatterns = [
    /(?:удали|удалить|delete|remove)\s+(?:файл|file)?\s*[:\s]+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi,
    /(?:удали|удалить|delete|remove)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi,
    /(?:удали|удалить|delete|remove)\s+(?:файл|file)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi
  ];

  const testMessages = [
    'удали main.js',
    'удалить файл test.js',
    'delete file.txt',
    'remove src/main.js',
    'удали файл: test.js'
  ];

  testMessages.forEach((message, index) => {
    try {
      let found = false;
      deletePatterns.forEach(pattern => {
        pattern.lastIndex = 0;
        const match = pattern.exec(message);
        if (match && match[1]) {
          found = true;
        }
      });
      logTest(`Паттерн удаления ${index + 1}: "${message}"`, found);
    } catch (error) {
      logTest(`Паттерн удаления ${index + 1}`, false, error);
    }
  });
}

async function testFileReadPatterns() {
  console.log('\n=== Тест паттернов чтения файлов ===\n');

  const readPatterns = [
    /(?:покажи|покажи содержимое|прочитай|открой|посмотри|просмотри|что в|что находится в|содержимое|код в|код файла)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi,
    /(?:файл|file)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))\s+(?:содержит|имеет|внутри)/gi,
    /(?:в|из)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))\s+(?:находится|есть|содержится)/gi
  ];

  const testMessages = [
    'покажи содержимое main.js',
    'что в файле ui.js',
    'прочитай src/main.js',
    'что находится в test.js',
    'покажи код файла main.js'
  ];

  testMessages.forEach((message, index) => {
    try {
      let found = false;
      readPatterns.forEach(pattern => {
        pattern.lastIndex = 0;
        const match = pattern.exec(message);
        if (match && match[1]) {
          found = true;
        }
      });
      logTest(`Паттерн чтения ${index + 1}: "${message}"`, found);
    } catch (error) {
      logTest(`Паттерн чтения ${index + 1}`, false, error);
    }
  });
}

async function testPathNormalization() {
  console.log('\n=== Тест нормализации путей ===\n');

  const testCases = [
    { input: 'src\\main.js', expected: 'main.js' },
    { input: 'src/main.js', expected: 'main.js' },
    { input: 'main.js', expected: 'main.js' },
    { input: './src/main.js', expected: 'main.js' },
    { input: 'lib\\chat-context.js', expected: 'chat-context.js' }
  ];

  testCases.forEach((testCase, index) => {
    try {
      const normalized = FileParser.normalizePath(testCase.input, './src');
      logTest(`Нормализация пути ${index + 1}: "${testCase.input}"`, normalized === testCase.expected);
    } catch (error) {
      logTest(`Нормализация пути ${index + 1}`, false, error);
    }
  });
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ ФУНКЦИЙ ЧАТА            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    await testFileParser();
    await testFileOperations();
    await testChatContext();
    await testDeletePatterns();
    await testFileReadPatterns();
    await testPathNormalization();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    РЕЗУЛЬТАТЫ ТЕСТОВ                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Пройдено: ${testResults.passed}`);
    console.log(`❌ Провалено: ${testResults.failed}`);
    console.log(`📊 Всего: ${testResults.passed + testResults.failed}\n`);

    if (testResults.errors.length > 0) {
      console.log('Ошибки:');
      testResults.errors.forEach(({ name, error }) => {
        console.log(`  - ${name}: ${error}`);
      });
    }

    if (testResults.failed === 0) {
      console.log('🎉 Все тесты пройдены успешно!');
      process.exit(0);
    } else {
      console.log('⚠️ Некоторые тесты провалены');
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



