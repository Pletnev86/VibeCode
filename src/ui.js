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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ UI инициализирован');
    // Очищаем логи при загрузке для свежего старта новой сессии
    const logsDiv = document.getElementById('logs');
    if (logsDiv) {
        logsDiv.innerHTML = '<div class="log-entry">[Новая сессия] Логи текущей сессии VibeCode</div>';
    }
    initializeUI();
    
    // Загружаем историю чатов проекта если проект открыт
    try {
        const projectResult = await window.api.getCurrentProject();
        if (projectResult.success && projectResult.project && projectResult.project.desktop) {
            const desktop = projectResult.project.desktop;
            if (desktop.chatHistory && desktop.chatHistory.length > 0) {
                console.log('Загрузка истории чатов проекта:', desktop.chatHistory.length, 'сообщений');
                const outputDiv = document.getElementById('output');
                desktop.chatHistory.forEach(msg => {
                    if (msg.role === 'user') {
                        addMessage('user', msg.message);
                    } else if (msg.role === 'assistant') {
                        addMessage('ai', msg.message);
                    }
                });
                // Прокручиваем вниз
                if (outputDiv) {
                    outputDiv.scrollTop = outputDiv.scrollHeight;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки истории чатов:', error);
    }
    
    // Загружаем логи с небольшой задержкой, чтобы сессия успела инициализироваться
    setTimeout(loadLogs, 500);
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
    
    // Кнопка анализа проекта
    document.getElementById('analyzeProject').addEventListener('click', handleAnalyzeProject);
    
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
        updateStatus(`🔄 Модель LM Studio: ${currentModel}`);
    });
    
    // Выбор модели OpenRouter
    document.getElementById('openRouterModel').addEventListener('change', (e) => {
        currentOpenRouterModel = e.target.value;
        updateStatus(`🔄 Модель OpenRouter: ${currentOpenRouterModel}`);
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
        
        // Показываем выбранную модель в системном сообщении
        const selectedModelName = useOpenRouter 
            ? (openRouterModel === 'gpt4' ? 'openai/gpt-4o-mini' : 
               openRouterModel === 'claude' ? 'anthropic/claude-3.5-sonnet' :
               openRouterModel === 'deepseek' ? 'deepseek/deepseek-chat' :
               openRouterModel === 'deepseek-r1' ? 'deepseek/deepseek-r1' :
               openRouterModel === 'deepseek-free' ? 'deepseek/deepseek-r1:free' : openRouterModel)
            : (model === 'deepseek' ? 'deepseek/deepseek-r1-0528-qwen3-8b' : 
               model === 'llama3' ? 'llama-3-8b-gpt-4o-ru1.0' : model);
        const providerName = useOpenRouter ? 'OpenRouter' : 'LM Studio';
        addMessage('system', `📤 Отправка запроса через ${providerName}, модель: ${selectedModelName}`);
        
        // Отправляем запрос
        const result = await window.api.sendChatMessage(message, {
            useOpenRouter: useOpenRouter,
            model: model,
            openRouterModel: openRouterModel
        });
        
        console.log('📥 Результат получен:', result);
        
        // Удаляем индикатор загрузки
        removeMessage(loadingId);
        
        if (result.success) {
            const response = result.response || result;
            const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            // Показываем информацию о сохраненных файлах
            if (result.metadata && result.metadata.filesSaved > 0) {
                addMessage('system', `💾 Автоматически сохранено файлов: ${result.metadata.filesSaved}`);
                if (result.metadata.savedFiles && result.metadata.savedFiles.length > 0) {
                    result.metadata.savedFiles.forEach(file => {
                        addMessage('system', `  ✅ ${file}`);
                    });
                }
            }
            
            // Показываем информацию об удаленных файлах
            if (result.metadata && result.metadata.filesDeleted > 0) {
                addMessage('system', `🗑️ Автоматически удалено файлов: ${result.metadata.filesDeleted}`);
                if (result.metadata.deletedFiles && result.metadata.deletedFiles.length > 0) {
                    result.metadata.deletedFiles.forEach(file => {
                        addMessage('system', `  ❌ ${file}`);
                    });
                }
            }
            
            // Добавляем ответ AI
            let responseText = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
            
            // Добавляем информацию о модели в начало ответа
            let modelInfo = '';
            if (result.metadata) {
                if (result.metadata.model) {
                    const providerName = result.metadata.provider === 'openrouter' ? 'OpenRouter' : 'LM Studio';
                    modelInfo = `\n\n🤖 Использована модель: ${result.metadata.model} (${providerName})`;
                    
                    // Если запрошенная модель отличается от фактической, показываем предупреждение
                    if (result.metadata.requestedModel && result.metadata.requestedModel !== result.metadata.model) {
                        modelInfo += `\n⚠️ Запрошена: ${result.metadata.requestedModel}, но использована: ${result.metadata.model}`;
                    }
                }
                
                if (result.metadata.executionTime) {
                    responseText += `\n\n⏱️ Время выполнения: ${(result.metadata.executionTime / 1000).toFixed(2)} сек`;
                } else {
                    responseText += `\n\n⏱️ Время выполнения: ${executionTime} сек`;
                }
                
                if (result.metadata.tokens) {
                    responseText += `\n🎫 Использовано токенов: ${result.metadata.tokens.total} (промпт: ${result.metadata.tokens.prompt}, ответ: ${result.metadata.tokens.completion})`;
                }
            } else {
                responseText += `\n\n⏱️ Время выполнения: ${executionTime} сек`;
            }
            
            // Добавляем информацию о модели
            responseText += modelInfo;
            
            addMessage('ai', responseText);
            
            // Также добавляем информацию о модели в системное сообщение для логов
            if (result.metadata && result.metadata.model) {
                const providerName = result.metadata.provider === 'openrouter' ? 'OpenRouter' : 'LM Studio';
                let modelLogMessage = `🤖 Использована модель: ${result.metadata.model} (${providerName})`;
                
                // Если запрошенная модель отличается от фактической, показываем предупреждение
                if (result.metadata.requestedModel && result.metadata.requestedModel !== result.metadata.model) {
                    modelLogMessage += ` ⚠️ Запрошена: ${result.metadata.requestedModel}`;
                }
                
                addMessage('system', modelLogMessage);
            }
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
 * Обработка анализа проекта
 */
async function handleAnalyzeProject() {
    const button = document.getElementById('analyzeProject');
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '⏳ Анализ...';
    
    addMessage('system', '📊 Начало анализа проекта...');
    
    try {
        const result = await window.api.analyzeProject('.');
        
        if (result.success) {
            addMessage('system', '✅ Анализ проекта завершен!');
            if (result.analysis) {
                addMessage('ai', JSON.stringify(result.analysis, null, 2));
            }
        } else {
            addMessage('system', `❌ Ошибка анализа: ${result.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        addMessage('system', `❌ Ошибка: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
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
            
            // Показываем информацию о сессии если есть
            let sessionInfoHtml = '';
            if (result.sessionInfo) {
                const sessionInfo = result.sessionInfo;
                sessionInfoHtml = `<div class="log-entry" style="color: #4ec9b0; font-weight: bold;">[Сессия ${sessionInfo.sessionId}] Логов: ${sessionInfo.logCount}, Длительность: ${sessionInfo.duration}</div>`;
            }
            
            // Показываем только логи текущей сессии
            const logsHtml = result.logs
                .slice(-50) // Последние 50 логов сессии
                .map(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    const level = log.level || 'info';
                    const levelColor = level === 'error' ? '#f48771' : 
                                      level === 'warn' ? '#dcdcaa' : 
                                      level === 'info' ? '#4ec9b0' : '#858585';
                    
                    // Извлекаем информацию о модели из данных лога если есть
                    let modelInfo = '';
                    if (log.data) {
                        if (log.data.requestedModel || log.data.actualModel) {
                            const reqModel = log.data.requestedModel || 'не указана';
                            const actModel = log.data.actualModel || 'неизвестна';
                            if (reqModel === actModel) {
                                modelInfo = ` [Модель: ${actModel}]`;
                            } else {
                                modelInfo = ` [Запрошена: ${reqModel}, Использована: ${actModel}]`;
                            }
                        }
                    }
                    
                    return `<div class="log-entry" style="color: ${levelColor};">[${time}] [${level.toUpperCase()}] ${escapeHtml(log.message)}${modelInfo}</div>`;
                })
                .join('');
            
            logsDiv.innerHTML = sessionInfoHtml + logsHtml;
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
