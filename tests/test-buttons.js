/**
 * Тест проверки всех кнопок интерфейса
 * 
 * Проверяет наличие и доступность всех кнопок:
 * - Отправить
 * - Очистить
 * - Анализ проекта
 * - Доработать модули
 * - Переключение провайдеров
 * - Выбор моделей
 */

const fs = require('fs');
const path = require('path');

function testButtons() {
    console.log('=== Тест проверки кнопок интерфейса ===\n');
    
    const htmlPath = path.join(__dirname, '..', 'src', 'index.html');
    const jsPath = path.join(__dirname, '..', 'src', 'ui.js');
    
    try {
        // Читаем HTML
        const html = fs.readFileSync(htmlPath, 'utf8');
        console.log('✅ HTML файл прочитан');
        
        // Читаем JS
        const js = fs.readFileSync(jsPath, 'utf8');
        console.log('✅ JS файл прочитан\n');
        
        // Список кнопок для проверки
        const buttons = [
            { id: 'send', name: 'Отправить', required: true },
            { id: 'clear', name: 'Очистить', required: true },
            { id: 'analyzeProject', name: 'Анализ проекта', required: true },
            { id: 'enhanceModules', name: 'Доработать модули', required: false }, // Должна быть удалена
            { id: 'selfBuild', name: 'Self-Build', required: false } // Должна быть удалена
        ];
        
        // Список элементов для проверки
        const elements = [
            { id: 'input', name: 'Поле ввода', required: true },
            { id: 'output', name: 'Область вывода', required: true },
            { id: 'logs', name: 'Панель логов', required: true },
            { id: 'status', name: 'Статус', required: true },
            { id: 'lmModel', name: 'Выбор модели LM Studio', required: true },
            { id: 'openRouterModel', name: 'Выбор модели OpenRouter', required: true }
        ];
        
        // Проверка кнопок
        console.log('--- Проверка кнопок ---');
        let buttonsOk = 0;
        let buttonsFailed = 0;
        
        for (const button of buttons) {
            const exists = html.includes(`id="${button.id}"`);
            if (button.required) {
                if (exists) {
                    console.log(`✅ Кнопка "${button.name}" (${button.id}) найдена`);
                    buttonsOk++;
                } else {
                    console.log(`❌ Кнопка "${button.name}" (${button.id}) НЕ найдена`);
                    buttonsFailed++;
                }
            } else {
                // Для необязательных кнопок проверяем что их НЕТ
                if (!exists) {
                    console.log(`✅ Кнопка "${button.name}" (${button.id}) правильно удалена`);
                    buttonsOk++;
                } else {
                    console.log(`⚠️ Кнопка "${button.name}" (${button.id}) все еще присутствует (должна быть удалена)`);
                    buttonsFailed++;
                }
            }
        }
        
        // Проверка элементов
        console.log('\n--- Проверка элементов интерфейса ---');
        let elementsOk = 0;
        let elementsFailed = 0;
        
        for (const element of elements) {
            const exists = html.includes(`id="${element.id}"`);
            if (exists) {
                console.log(`✅ Элемент "${element.name}" (${element.id}) найден`);
                elementsOk++;
            } else {
                console.log(`❌ Элемент "${element.name}" (${element.id}) НЕ найден`);
                elementsFailed++;
            }
        }
        
        // Проверка обработчиков в JS
        console.log('\n--- Проверка обработчиков событий ---');
        const handlers = [
            { name: 'sendMessage', element: 'send', required: true },
            { name: 'handleAnalyzeProject', element: 'analyzeProject', required: true },
            { name: 'handleEnhanceModules', element: 'enhanceModules', required: false }, // Должен быть удален
            { name: 'handleSelfBuild', element: 'selfBuild', required: false } // Должен быть удален
        ];
        
        let handlersOk = 0;
        let handlersFailed = 0;
        
        for (const handler of handlers) {
            const exists = js.includes(handler.name);
            if (handler.required) {
                if (exists) {
                    console.log(`✅ Обработчик "${handler.name}" найден`);
                    handlersOk++;
                } else {
                    console.log(`❌ Обработчик "${handler.name}" НЕ найден`);
                    handlersFailed++;
                }
            } else {
                // Для необязательных обработчиков проверяем что их НЕТ
                if (!exists) {
                    console.log(`✅ Обработчик "${handler.name}" правильно удален`);
                    handlersOk++;
                } else {
                    console.log(`⚠️ Обработчик "${handler.name}" все еще присутствует (должен быть удален)`);
                    handlersFailed++;
                }
            }
        }
        
        // Проверка переключения провайдеров
        console.log('\n--- Проверка переключения провайдеров ---');
        const hasProviderRadio = html.includes('name="provider"');
        const hasLmStudioOption = html.includes('value="lmstudio"');
        const hasOpenRouterOption = html.includes('value="openrouter"');
        
        if (hasProviderRadio && hasLmStudioOption && hasOpenRouterOption) {
            console.log('✅ Переключение провайдеров настроено правильно');
        } else {
            console.log('❌ Проблемы с переключением провайдеров');
        }
        
        // Проверка выбора моделей
        console.log('\n--- Проверка выбора моделей ---');
        const hasLmModelSelect = html.includes('id="lmModel"');
        const hasOpenRouterModelSelect = html.includes('id="openRouterModel"');
        
        if (hasLmModelSelect && hasOpenRouterModelSelect) {
            console.log('✅ Выбор моделей настроен правильно');
        } else {
            console.log('❌ Проблемы с выбором моделей');
        }
        
        // Итоги
        console.log('\n=== Итоги проверки ===');
        console.log(`Кнопки: ${buttonsOk} OK, ${buttonsFailed} ошибок`);
        console.log(`Элементы: ${elementsOk} OK, ${elementsFailed} ошибок`);
        console.log(`Обработчики: ${handlersOk} OK, ${handlersFailed} ошибок`);
        
        const totalOk = buttonsOk + elementsOk + handlersOk;
        const totalFailed = buttonsFailed + elementsFailed + handlersFailed;
        
        console.log(`\nВсего: ${totalOk} OK, ${totalFailed} ошибок`);
        
        if (totalFailed === 0) {
            console.log('\n✅ Все проверки пройдены успешно!');
            process.exit(0);
        } else {
            console.log('\n❌ Обнаружены проблемы');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Запуск теста
testButtons();

