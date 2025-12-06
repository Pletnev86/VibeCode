/**
 * UI логика для VibeCode
 * 
 * Обрабатывает:
 * - Отправку сообщений в чат
 * - Кнопку Self-Build
 * - Переключение провайдеров
 * - Выбор моделей
 * - Отображение логов
 */

// Состояние приложения
let currentProvider = 'lmstudio';
let currentModel = 'deepseek';
let currentOpenRouterModel = 'gpt4';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ UI инициализирован');
    initializeUI();
    loadLogs();
});

/**
 * Инициализация UI
 */
function initializeUI() {
    // Кнопка отправки сообщения
    document.getElementById('send').addEventListener('click', sendMessage);
    
    // Enter для отправки (Shift+Enter для новой строки)
    document.getElementById('input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Кнопка Self-Build
    document.getElementById('selfBuild').addEventListener('click', handleSelfBuild);
    
    // Кнопка анализа проекта
    document.getElementById('analyzeProject').addEventListener('click', handleAnalyzeProject);
    
    // Кнопка доработки модулей
    document.getElementById('enhanceModules').addEventListener('click', handleEnhanceModules);
    
    // Кнопка очистки
    document.getElementById('clear').addEventListener('click', () => {
        document.getElementById('output').innerHTML = '';
    });
    
    // Переключение провайдеров
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentProvider = e.target.value;
            updateStatus(`🔄 Переключено на ${currentProvider === 'lmstudio' ? 'LM Studio' : 'OpenRouter'}`);
        });
    });
    
    // Выбор модели LM Studio
    document.getElementById('lmModel').addEventListener('change', (e) => {
        currentModel = e.target.value;
    });
    
    // Выбор модели OpenRouter
    document.getElementById('openRouterModel').addEventListener('change', (e) => {
        currentOpenRouterModel = e.target.value;
    });
    
    // Периодическое обновление логов
    setInterval(loadLogs, 2000);
}

/**
 * Отправка сообщения в чат
 */
async function sendMessage() {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Добавляем сообщение пользователя
    addMessage('user', message);
    input.value = '';
    
    // Показываем индикатор загрузки
    const loadingId = addMessage('ai', '⏳ Обработка запроса...');
    const startTime = Date.now();
    
    try {
        // Определяем опции для запроса
        const useOpenRouter = currentProvider === 'openrouter';
        const model = useOpenRouter ? undefined : currentModel;
        const openRouterModel = useOpenRouter ? currentOpenRouterModel : undefined;
        
        console.log('📤 Отправка сообщения через', useOpenRouter ? 'openrouter' : 'lmstudio');
        console.log('📤 Опции:', { useOpenRouter, model, openRouterModel });
        
        // Отправляем запрос
        const result = await window.api.sendChatMessage(message, {
            useOpenRouter,
            model,
            openRouterModel
        });
        
        console.log('📥 Результат получен:', result);
        
        // Удаляем индикатор загрузки
        removeMessage(loadingId);
        
        if (result.success) {
            const response = result.response || result;
            const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            // Добавляем ответ AI
            let responseText = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
            
            // Добавляем метаданные если есть
            if (result.metadata) {
                if (result.metadata.executionTime) {
                    responseText += `\n\n⏱️ Время выполнения: ${result.metadata.executionTime} сек`;
                }
                if (result.metadata.tokens) {
                    responseText += `\n🎫 Использовано токенов: ${result.metadata.tokens.total} (промпт: ${result.metadata.tokens.prompt}, ответ: ${result.metadata.tokens.completion})`;
                }
            } else {
                responseText += `\n\n⏱️ Время выполнения: ${executionTime} сек`;
            }
            
            addMessage('ai', responseText);
        } else {
            addMessage('ai', `❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        removeMessage(loadingId);
        addMessage('ai', `❌ Ошибка: ${error.message}`);
        console.error('❌ Ошибка в результате:', error);
    }
}

/**
 * Обработка Self-Build
 */
async function handleSelfBuild() {
    const button = document.getElementById('selfBuild');
    
    button.disabled = true;
    button.textContent = '⏳ Генерация...';
    
    addMessage('system', '🚀 Начало генерации проекта через Self-Build...');
    
    try {
        const result = await window.api.generateProject();
        
        if (result.success) {
            addMessage('system', '✅ Проект успешно сгенерирован!');
            if (result.files && result.files.length > 0) {
                addMessage('system', `📁 Создано файлов: ${result.files.length}`);
                addMessage('system', `💾 Сохранено файлов: ${result.files.length}`);
                addMessage('system', 'Созданные файлы:');
                result.files.forEach(file => {
                    addMessage('system', `- ${file}`);
                });
            }
        } else {
            addMessage('system', `❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        addMessage('system', `❌ Ошибка: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Self-Build';
    }
}

/**
 * Обработка анализа проекта
 */
async function handleAnalyzeProject() {
    addMessage('system', '📊 Анализ проекта...');
    // TODO: Реализовать анализ проекта
    addMessage('system', '⚠️ Функция в разработке');
}

/**
 * Обработка доработки модулей
 */
async function handleEnhanceModules() {
    addMessage('system', '🔧 Доработка модулей...');
    // TODO: Реализовать доработку модулей
    addMessage('system', '⚠️ Функция в разработке');
}

/**
 * Добавление сообщения в чат
 */
function addMessage(type, content) {
    const output = document.getElementById('output');
    const messageId = 'msg-' + Date.now() + '-' + Math.random();
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `message ${type}`;
    
    const label = type === 'user' ? 'Вы' : type === 'ai' ? 'AI' : 'Система';
    messageDiv.innerHTML = `
        <div class="message-label">${label}:</div>
        <div>${escapeHtml(content)}</div>
    `;
    
    output.appendChild(messageDiv);
    output.scrollTop = output.scrollHeight;
    
    return messageId;
}

/**
 * Удаление сообщения
 */
function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Загрузка логов
 */
async function loadLogs() {
    try {
        const result = await window.api.getLogs();
        if (result.success && result.logs) {
            const logsDiv = document.getElementById('logs');
            logsDiv.innerHTML = result.logs
                .slice(-50) // Последние 50 логов
                .map(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    return `<div class="log-entry">[${time}] ${escapeHtml(log.message)}</div>`;
                })
                .join('');
            logsDiv.scrollTop = logsDiv.scrollHeight;
        }
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
    }
}

/**
 * Обновление статуса
 */
function updateStatus(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        setTimeout(() => {
            statusDiv.textContent = '✅ Приложение готово к работе';
        }, 3000);
    }
}
