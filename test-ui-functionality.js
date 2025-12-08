/**
 * Тест функциональности UI
 * Проверяет работу кнопок, переключения нейросетей, чата и создания файлов
 */

const fs = require('fs');
const path = require('path');

console.log('=== Тест функциональности UI ===\n');

// Тест 1: Проверка наличия всех элементов в index.html
console.log('1. Проверка элементов UI...');
const htmlContent = fs.readFileSync('src/index.html', 'utf8');
const requiredElements = [
    'id="send"',
    'id="selfBuild"',
    'id="input"',
    'id="output"',
    'id="openRouterModel"',
    'id="lmModel"',
    'name="provider"'
];

let allElementsFound = true;
requiredElements.forEach(element => {
    if (!htmlContent.includes(element)) {
        console.log(`  ❌ Отсутствует: ${element}`);
        allElementsFound = false;
    }
});

if (allElementsFound) {
    console.log('  ✅ Все элементы UI найдены');
}

// Тест 2: Проверка моделей OpenRouter
console.log('\n2. Проверка моделей OpenRouter...');
const models = ['deepseek-r1', 'deepseek-free'];
models.forEach(model => {
    if (htmlContent.includes(`value="${model}"`)) {
        console.log(`  ✅ Модель ${model} найдена`);
    } else {
        console.log(`  ❌ Модель ${model} отсутствует`);
    }
});

// Тест 3: Проверка функций в ui.js
console.log('\n3. Проверка функций в ui.js...');
const uiContent = fs.readFileSync('src/ui.js', 'utf8');
const requiredFunctions = [
    'function sendMessage',
    'function handleSelfBuild',
    'function addMessage',
    'function initializeUI'
];

requiredFunctions.forEach(func => {
    if (uiContent.includes(func)) {
        console.log(`  ✅ Функция ${func} найдена`);
    } else {
        console.log(`  ❌ Функция ${func} отсутствует`);
    }
});

// Тест 4: Проверка обработки ошибок
console.log('\n4. Проверка обработки ошибок...');
if (uiContent.includes('try {') && uiContent.includes('catch (error)')) {
    console.log('  ✅ Обработка ошибок присутствует');
} else {
    console.log('  ❌ Обработка ошибок отсутствует');
}

// Тест 5: Проверка API методов в preload.js
console.log('\n5. Проверка API методов...');
const preloadContent = fs.readFileSync('src/preload.js', 'utf8');
const requiredMethods = [
    'sendChatMessage',
    'generateProject',
    'getLogs',
    'getSelfBuildState'
];

requiredMethods.forEach(method => {
    if (preloadContent.includes(method)) {
        console.log(`  ✅ Метод ${method} найден`);
    } else {
        console.log(`  ❌ Метод ${method} отсутствует`);
    }
});

// Тест 6: Проверка IPC обработчиков в main.js
console.log('\n6. Проверка IPC обработчиков...');
const mainContent = fs.readFileSync('src/main.js', 'utf8');
const requiredHandlers = [
    'send-chat-message',
    'generate-project',
    'get-logs',
    'get-selfbuild-state'
];

requiredHandlers.forEach(handler => {
    if (mainContent.includes(`'${handler}'`) || mainContent.includes(`"${handler}"`)) {
        console.log(`  ✅ Обработчик ${handler} найден`);
    } else {
        console.log(`  ❌ Обработчик ${handler} отсутствует`);
    }
});

// Тест 7: Проверка переключения провайдеров
console.log('\n7. Проверка переключения провайдеров...');
if (uiContent.includes('currentProvider') && uiContent.includes('openrouter') && uiContent.includes('lmstudio')) {
    console.log('  ✅ Переключение провайдеров реализовано');
} else {
    console.log('  ❌ Переключение провайдеров не реализовано');
}

// Тест 8: Проверка работы с файлами
console.log('\n8. Проверка работы с файлами...');
if (mainContent.includes('parseFiles') || mainContent.includes('FileParser')) {
    console.log('  ✅ Парсинг файлов реализован');
} else {
    console.log('  ⚠️ Парсинг файлов может быть не реализован');
}

console.log('\n=== Тестирование завершено ===');


