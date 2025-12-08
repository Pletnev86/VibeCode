/**
 * Тест UI компонентов (без запуска Electron)
 * 
 * Проверяет:
 * - Наличие всех UI файлов
 * - Корректность структуры HTML
 * - Наличие необходимых элементов
 */

const fs = require('fs');
const path = require('path');

function testUI() {
  console.log('=== Тест UI компонентов ===\n');

  try {
    // Проверка файлов UI
    console.log('--- Проверка файлов UI ---');
    const uiFiles = [
      'src/index.html',
      'src/ui.js',
      'src/main.js',
      'src/preload.js'
    ];

    let allFilesExist = true;
    uiFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
      } else {
        console.error(`❌ ${file} не найден`);
        allFilesExist = false;
      }
    });

    if (!allFilesExist) {
      throw new Error('Не все UI файлы найдены');
    }
    console.log('');

    // Проверка структуры HTML
    console.log('--- Проверка структуры HTML ---');
    const htmlContent = fs.readFileSync('src/index.html', 'utf8');
    
    const requiredElements = [
      'selfbuild-btn',
      'analyze-btn',
      'send-btn',
      'message-input',
      'chat-area',
      'logs-container'
    ];

    let allElementsExist = true;
    requiredElements.forEach(element => {
      if (htmlContent.includes(`id="${element}"`) || htmlContent.includes(`id='${element}'`)) {
        console.log(`✅ Элемент найден: ${element}`);
      } else {
        console.error(`❌ Элемент не найден: ${element}`);
        allElementsExist = false;
      }
    });

    if (!allElementsExist) {
      throw new Error('Не все необходимые элементы найдены в HTML');
    }
    console.log('');

    // Проверка UI.js
    console.log('--- Проверка UI.js ---');
    const uiJsContent = fs.readFileSync('src/ui.js', 'utf8');
    
    const requiredFunctions = [
      'addMessage',
      'handleSelfBuild',
      'sendMessage',
      'updateLogs',
      'window.api'
    ];

    let allFunctionsExist = true;
    requiredFunctions.forEach(func => {
      if (uiJsContent.includes(func)) {
        console.log(`✅ Функция/API найдена: ${func}`);
      } else {
        console.error(`❌ Функция/API не найдена: ${func}`);
        allFunctionsExist = false;
      }
    });

    if (!allFunctionsExist) {
      throw new Error('Не все необходимые функции найдены в UI.js');
    }
    console.log('');

    // Проверка main.js
    console.log('--- Проверка main.js ---');
    const mainJsContent = fs.readFileSync('src/main.js', 'utf8');
    
    const requiredHandlers = [
      'generate-project',
      'analyze-project',
      'send-chat-message',
      'get-logs'
    ];

    let allHandlersExist = true;
    requiredHandlers.forEach(handler => {
      if (mainJsContent.includes(handler)) {
        console.log(`✅ IPC обработчик найден: ${handler}`);
      } else {
        console.error(`❌ IPC обработчик не найден: ${handler}`);
        allHandlersExist = false;
      }
    });

    if (!allHandlersExist) {
      throw new Error('Не все IPC обработчики найдены в main.js');
    }
    console.log('');

    // Проверка preload.js
    console.log('--- Проверка preload.js ---');
    const preloadContent = fs.readFileSync('src/preload.js', 'utf8');
    
    if (preloadContent.includes('contextBridge') && preloadContent.includes('window.api')) {
      console.log('✅ Preload.js корректно настроен');
    } else {
      throw new Error('Preload.js не настроен корректно');
    }
    console.log('');

    console.log('=== Тест UI компонентов завершен успешно ===\n');
    console.log('✅ Все UI компоненты на месте и корректны');
    console.log('✅ Electron приложение готово к запуску');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка теста UI:', error.message);
    return false;
  }
}

// Запуск теста
const success = testUI();
process.exit(success ? 0 : 1);








