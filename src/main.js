/**
 * Main Electron Process - главный процесс приложения
 * 
 * Отвечает за:
 * - Создание окна приложения
 * - IPC обработчики для связи с renderer процессом
 * - Инициализацию агентов (SelfDev, Refactor, Fix, Explain)
 * - Управление жизненным циклом приложения
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Инициализация централизованного логгера
const { initLogger } = require('../lib/logger');
const logger = initLogger({
  minLevel: 'info',
  consoleOutput: true,
  fileOutput: true
});

// Очистка старых логов при старте (старше 7 дней)
logger.cleanOldLogs(7);

// Очистка старых резервных копий при старте (старше 7 дней)
try {
  const BackupManager = require('../lib/backup-manager');
  const backupManager = new BackupManager();
  backupManager.cleanOldBackups(7);
  logger.info('Очистка старых резервных копий выполнена');
} catch (error) {
  logger.warn('Не удалось очистить старые резервные копии', null, error);
}

// Перехват всех выводов в консоль для сохранения в лог
logger.interceptConsole();

// Импорт агентов и контроллеров
let selfDevAgent = null;
let interAgentController = null;
let knowledgeBase = null;
let chatContextManager = null;

/**
 * Инициализация базы знаний (опционально)
 */
function initKnowledgeBase() {
  try {
    const KnowledgeBase = require('../lib/knowledge-base');
    knowledgeBase = new KnowledgeBase();
    if (knowledgeBase.available) {
      logger.info('База знаний инициализирована');
      
      // Инициализация менеджера документации
      try {
        const DocumentationManager = require('../lib/documentation-manager');
        const documentationManager = new DocumentationManager(knowledgeBase);
        
        // Автоматическая индексация документации при старте
        documentationManager.indexAllDocumentation().then(result => {
          logger.info(`Документация проиндексирована: ${result.processed} файлов`);
        }).catch(error => {
          logger.warn('Ошибка индексации документации', null, error);
        });
      } catch (error) {
        logger.warn('DocumentationManager недоступен', null, error);
      }
    } else {
      logger.warn('База знаний недоступна, работаем без неё');
    }
  } catch (error) {
    logger.warn('База знаний недоступна, работаем без неё', null, error);
    knowledgeBase = null;
  }
}

/**
 * Инициализация менеджера контекста чата
 */
function initChatContext() {
  try {
    const ChatContextManager = require('../lib/chat-context');
    chatContextManager = new ChatContextManager(null, knowledgeBase);
    logger.info('Менеджер контекста чата инициализирован');
  } catch (error) {
    logger.error('Ошибка инициализации менеджера контекста чата', error);
    chatContextManager = null;
  }
}

/**
 * Инициализация агентов
 */
async function initAgents() {
  try {
    logger.info('Начало инициализации агентов');
    
    // Инициализация InterAgent Controller
    const InterAgentController = require('../agents/inter-agent-controller');
    interAgentController = new InterAgentController('./config.json');
    await interAgentController.init();
    
    // Получаем SelfDev Agent из контроллера
    selfDevAgent = interAgentController.agents.selfdev;
    
    if (selfDevAgent) {
      logger.info('SelfDev Agent инициализирован');
    } else {
      throw new Error('SelfDev Agent не удалось инициализировать');
    }
  } catch (error) {
    logger.error('Ошибка инициализации агентов', error, { 
      message: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Создание главного окна приложения
 */
function createWindow() {
  try {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // Не показываем окно сразу, пока не загрузится
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
      },
    });

    // Обработка ошибок загрузки
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('Ошибка загрузки окна', new Error(errorDescription), {
        errorCode,
        url: mainWindow.webContents.getURL()
      });
    });

    // Показываем окно когда контент загрузится
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.show();
      logger.info('Окно приложения готово и отображено');
    });

    // Загрузка HTML страницы
    const htmlPath = path.join(__dirname, 'index.html');
    logger.debug('Загрузка HTML файла', { path: htmlPath });
    
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML файл не найден: ${htmlPath}`);
    }
    
    mainWindow.loadFile(htmlPath);

    // Открытие DevTools в режиме разработки
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
    
    return mainWindow;
  } catch (error) {
    logger.error('Ошибка создания окна', error);
    throw error;
  }
}

/**
 * IPC обработчики
 */

// Обработчик генерации проекта (Self-Build)
ipcMain.handle('generate-project', async (event, task = null, options = {}) => {
  try {
    logger.info('Начало генерации проекта через Self-Build', { task, options });
    
    if (!selfDevAgent) {
      await initAgents();
    }
    
    // Проверяем сохраненное состояние и предлагаем восстановление
    if (selfDevAgent.stateManager) {
      const savedState = selfDevAgent.stateManager.loadState();
      if (savedState && savedState.inProgress && !options.forceNew) {
        logger.info('Обнаружено сохраненное состояние Self-Build', {
          stage: savedState.currentStage,
          filesGenerated: savedState.filesGenerated?.length || 0
        });
        // Автоматически продолжаем если не указано иное
        if (options.resume !== false) {
          options.resume = true;
        }
      }
    }
    
    // Передаем опции модели в generateProject
    const result = await selfDevAgent.generateProject(task, options);
    logger.info('Проект успешно сгенерирован', { 
      filesCount: result.savedFiles?.length || 0,
      files: result.savedFiles 
    });
    
    return {
      success: true,
      files: result.savedFiles || [],
      logs: selfDevAgent.logs || []
    };
  } catch (error) {
    logger.error('Ошибка генерации проекта', error, { task });
    return {
      success: false,
      error: error.message
    };
  }
});

// Обработчик отправки сообщения в чат
ipcMain.handle('send-chat-message', async (event, message, options = {}) => {
  const startTime = Date.now();
  let responseText = null;

  try {
    const messagePreview = typeof message === 'string' ? message.substring(0, 100) : String(message).substring(0, 100);
    
    logger.info('📤 Сообщение пользователя в чат', {
      message: message,
      messagePreview: messagePreview,
      options: options,
      timestamp: new Date().toISOString()
    });
    
    // Инициализация менеджера контекста если еще не инициализирован
    if (!chatContextManager) {
      initChatContext();
      // Если инициализация не удалась, продолжаем без контекста
      if (!chatContextManager) {
        logger.warn('Менеджер контекста недоступен, работаем без системного промпта');
      }
    }
    
    if (!interAgentController) {
      await initAgents();
    }
    
    // Добавляем сообщение пользователя в историю
    if (chatContextManager) {
      chatContextManager.addToHistory('user', message);
    }
    
    // Для обычного чата используем AI Router напрямую, а не через агентов
    const AIRouter = require('../ai/router');
    const router = new AIRouter('./config.json');
    
    // Определяем опции для запроса
    const useOpenRouter = options.useOpenRouter !== undefined 
      ? options.useOpenRouter 
      : (options.openRouterModel !== undefined);
    
    const openRouterModel = options.openRouterModel;
    const model = options.model;
    
    logger.debug('Параметры запроса', { useOpenRouter, openRouterModel, model });
    
    // Формируем системный промпт с контекстом
    let enhancedMessage = message;
    if (chatContextManager) {
      enhancedMessage = chatContextManager.enhanceChatMessage(message);
      logger.debug('Системный промпт сформирован', { 
        originalLength: message.length,
        enhancedLength: enhancedMessage.length 
      });
    }
    
    // Отправляем запрос напрямую через router с системным промптом
    const response = await router.sendRequest(enhancedMessage, {
      useOpenRouter,
      openRouterModel,
      model,
      temperature: 0.7,
      max_tokens: 2000,
      knowledgeBaseInstance: knowledgeBase
    });
    
    responseText = response;
    
    const executionTime = Date.now() - startTime;
    
    logger.info('📥 Ответ AI в чат', {
      response: responseText,
      responseLength: typeof responseText === 'string' ? responseText.length : 0,
      responseType: typeof responseText,
      executionTime: executionTime,
      model: useOpenRouter ? openRouterModel : model,
      provider: useOpenRouter ? 'openrouter' : 'lmstudio',
      timestamp: new Date().toISOString()
    });
    
    // router.sendRequest возвращает строку напрямую
    if (typeof responseText !== 'string') {
      // Если по какой-то причине вернулся объект, извлекаем текст
      if (responseText && responseText.content) {
        responseText = responseText.content;
      } else if (responseText && responseText.message) {
        responseText = responseText.message;
      } else if (responseText && responseText.text) {
        responseText = responseText.text;
      } else {
        responseText = String(responseText || 'Пустой ответ');
      }
    }
    
    if (!responseText || responseText.trim().length === 0) {
      logger.warn('Получен пустой ответ от AI', { message: messagePreview });
      responseText = 'Получен пустой ответ от AI. Проверьте логи для деталей.';
    }
    
    // Добавляем ответ AI в историю
    if (chatContextManager) {
      chatContextManager.addToHistory('ai', responseText);
    }
    
    // Сохраняем в базу знаний для долгосрочной памяти
    if (knowledgeBase && knowledgeBase.available) {
      try {
        knowledgeBase.saveQueryResponse(message, responseText, {
          language: 'ru',
          taskType: 'chat',
          model: useOpenRouter ? openRouterModel : model,
          provider: useOpenRouter ? 'openrouter' : 'lmstudio',
          time: executionTime
        });
        logger.debug('Запрос и ответ сохранены в базу знаний');
      } catch (kbError) {
        logger.warn('Не удалось сохранить в базу знаний', null, kbError);
      }
    }
    
    // Парсим файлы из ответа для автоматического сохранения
    // Передаем оригинальное сообщение пользователя для контекста
    const FileParser = require('../lib/file-parser');
    const parsedFiles = FileParser.parseFiles(responseText, './src', message);
    
    // Проверяем запросы на удаление файлов
    const deletePatterns = [
      /(?:удали|удалить|delete|remove)\s+(?:файл|file)?\s*[:\s]+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi,
      /(?:удали|удалить|delete|remove)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi,
      /(?:удали|удалить|delete|remove)\s+(?:файл|file)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi
    ];
    
    let deletedFiles = [];
    const messageLower = message.toLowerCase();
    if (messageLower.includes('удали') || messageLower.includes('удалить') || messageLower.includes('delete') || messageLower.includes('remove')) {
      deletePatterns.forEach(pattern => {
        // Сбрасываем lastIndex для глобального регулярного выражения
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(message)) !== null) {
          if (match[1]) {
            let filePath = match[1].trim();
            // Убираем обратные слеши и нормализуем путь
            filePath = filePath.replace(/\\/g, '/');
            // Нормализуем путь
            if (!filePath.startsWith('src/') && !filePath.startsWith('./') && !filePath.startsWith('lib/') && !filePath.startsWith('agents/')) {
              // Пробуем найти файл в разных местах
              const possiblePaths = [
                `src/${filePath}`,
                `lib/${filePath}`,
                `agents/${filePath}`,
                filePath
              ];
              
              let found = false;
              for (const possiblePath of possiblePaths) {
                const fullPath = path.join(process.cwd(), possiblePath);
                if (fs.existsSync(fullPath)) {
                  try {
                    fs.unlinkSync(fullPath);
                    deletedFiles.push(fullPath);
                    logger.info('Файл удален из ответа чата', { path: possiblePath, fullPath });
                    found = true;
                    break;
                  } catch (error) {
                    logger.error('Ошибка удаления файла', error, { path: possiblePath });
                  }
                }
              }
              
              if (!found) {
                // Пробуем удалить как есть
                const fullPath = path.join(process.cwd(), filePath);
                if (fs.existsSync(fullPath)) {
                  try {
                    fs.unlinkSync(fullPath);
                    deletedFiles.push(fullPath);
                    logger.info('Файл удален из ответа чата', { path: filePath });
                  } catch (error) {
                    logger.error('Ошибка удаления файла', error, { path: filePath });
                  }
                } else {
                  logger.warn('Файл не найден для удаления', { path: filePath, fullPath });
                }
              }
            } else {
              const fullPath = path.join(process.cwd(), filePath);
              if (fs.existsSync(fullPath)) {
                try {
                  fs.unlinkSync(fullPath);
                  deletedFiles.push(fullPath);
                  logger.info('Файл удален из ответа чата', { path: filePath });
                } catch (error) {
                  logger.error('Ошибка удаления файла', error, { path: filePath });
                }
              } else {
                logger.warn('Файл не найден для удаления', { path: filePath, fullPath });
              }
            }
          }
        }
      });
    }
    
    let savedFiles = [];
    if (parsedFiles.length > 0) {
      logger.info('Найдены файлы в ответе для сохранения', { count: parsedFiles.length, files: parsedFiles.map(f => f.path) });
      
      // Сохраняем файлы
      for (const file of parsedFiles) {
        try {
          // Нормализуем путь - убираем src/ если уже есть
          let normalizedPath = file.path.replace(/\\/g, '/');
          if (normalizedPath.startsWith('src/')) {
            normalizedPath = normalizedPath.substring(4);
          }
          
          const fullPath = path.join(process.cwd(), 'src', normalizedPath);
          const dir = path.dirname(fullPath);
          
          // Проверяем существование файла перед сохранением
          const fileExists = fs.existsSync(fullPath);
          
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(fullPath, file.content, 'utf8');
          savedFiles.push(fullPath);
          
          logger.info('Файл сохранен из ответа чата', { 
            path: normalizedPath, 
            fullPath: fullPath,
            existed: fileExists,
            size: file.content.length 
          });
        } catch (error) {
          logger.error('Ошибка сохранения файла из ответа', error, { path: file.path });
        }
      }
    } else {
      logger.debug('Файлы в ответе не найдены', { responseLength: responseText.length });
    }
    
    return {
      success: true,
      response: responseText,
      metadata: {
        filesFound: parsedFiles.length,
        filesSaved: savedFiles.length,
        savedFiles: savedFiles,
        filesDeleted: deletedFiles.length,
        deletedFiles: deletedFiles
      }
    };
  } catch (error) {
    const messagePreview = typeof message === 'string' ? message.substring(0, 100) : String(message).substring(0, 100);
    logger.error('Ошибка отправки сообщения', error, { 
      message: messagePreview,
      options 
    });
    
    return {
      success: false,
      error: error.message
    };
  }
});

// Обработчик получения состояния Self-Build
ipcMain.handle('get-selfbuild-state', async (event) => {
  try {
    if (!selfDevAgent) {
      await initAgents();
    }
    
    if (selfDevAgent && selfDevAgent.stateManager) {
      const state = selfDevAgent.stateManager.loadState();
      return {
        success: true,
        state: state
      };
    }
    
    return {
      success: true,
      state: null
    };
  } catch (error) {
    logger.error('Ошибка получения состояния Self-Build', error);
    return {
      success: false,
      error: error.message,
      state: null
    };
  }
});

// Обработчик очистки состояния Self-Build
ipcMain.handle('clear-selfbuild-state', async (event) => {
  try {
    if (!selfDevAgent) {
      await initAgents();
    }
    
    if (selfDevAgent && selfDevAgent.stateManager) {
      selfDevAgent.stateManager.clearState();
      logger.info('Состояние Self-Build очищено');
      return { success: true };
    }
    
    return { success: false, error: 'StateManager недоступен' };
  } catch (error) {
    logger.error('Ошибка очистки состояния Self-Build', error);
    return { success: false, error: error.message };
  }
});

// Обработчик получения логов
ipcMain.handle('get-logs', async (event) => {
  try {
    // Получаем логи из логгера
    const recentLogs = logger.getRecentLogs(100);
    
    // Также получаем логи из SelfDev Agent если есть
    let agentLogs = [];
    if (selfDevAgent && selfDevAgent.logs) {
      agentLogs = selfDevAgent.logs;
    }
    
    // Объединяем логи, убираем дубликаты
    const allLogs = [...recentLogs, ...agentLogs];
    
    // Сортируем по времени
    allLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA; // Новые сначала
    });
    
    return {
      success: true,
      logs: allLogs.slice(0, 100) // Последние 100 логов
    };
  } catch (error) {
    logger.error('Ошибка получения логов', error);
    return {
      success: false,
      error: error.message,
      logs: []
    };
  }
});

// Обработчик чтения файла
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Обработчик записи файла
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, data, 'utf8');
    logger.info('Файл записан', { path: filePath });
    return { success: true };
  } catch (error) {
    logger.error('Ошибка записи файла', error, { path: filePath });
    return { success: false, error: error.message };
  }
});

// Обработчик удаления файла
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    const fullPath = path.resolve(filePath);
    
    // Проверка безопасности - не позволяем удалять файлы вне проекта
    const projectRoot = process.cwd();
    if (!fullPath.startsWith(projectRoot)) {
      throw new Error('Небезопасный путь для удаления');
    }
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info('Файл удален', { path: filePath });
      return { success: true };
    } else {
      logger.warn('Файл не найден для удаления', { path: filePath });
      return { success: false, error: 'Файл не найден' };
    }
  } catch (error) {
    logger.error('Ошибка удаления файла', error, { path: filePath });
    return { success: false, error: error.message };
  }
});

// Обработчик выполнения команды
ipcMain.handle('run-command', async (event, command) => {
  try {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000, encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, stderr });
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Обработчик чата (legacy, для обратной совместимости)
ipcMain.handle('chat', async (event, messages, model) => {
  try {
    const AIRouter = require('../ai/router');
    const router = new AIRouter('./config.json');
    
    const lastMessage = messages[messages.length - 1];
    const result = await router.sendRequest(lastMessage.content, {
      useOpenRouter: model === 'openrouter' || model === 'gpt4',
      model: model,
      knowledgeBaseInstance: knowledgeBase
    });
    
    // Извлекаем текстовый ответ
    let response = result.response || result;
    if (typeof response === 'object') {
      if (response.content) {
        response = response.content;
      } else if (response.message) {
        response = response.message;
      } else {
        response = JSON.stringify(response, null, 2);
      }
    }
    
    return response;
  } catch (error) {
    logger.error('Ошибка чата (legacy)', error, { model });
    return `Ошибка: ${error.message}`;
  }
});

// Обработчик анализа проекта
ipcMain.handle('analyze-project', async (event, projectPath) => {
  try {
    if (!selfDevAgent) {
      await initAgents();
    }
    
    const result = await selfDevAgent.analyzeProject(projectPath);
    return {
      success: true,
      analysis: result
    };
  } catch (error) {
    logger.error('Ошибка анализа проекта', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Обработчик доработки модулей
ipcMain.handle('enhance-modules', async (event, task, options = {}) => {
  try {
    logger.info('Начало доработки модулей', { task });
    
    if (!interAgentController) {
      await initAgents();
    }
    
    // Используем ModuleEnhancer если доступен, иначе через SelfDev Agent
    try {
      const ModuleEnhancer = require('../lib/module-enhancer');
      const enhancer = new ModuleEnhancer('./config.json');
      
      const result = await enhancer.enhanceModules(task, options);
      
      logger.info('Доработка модулей завершена', { 
        modulesCount: result.modules?.length || 0 
      });
      
      return {
        success: true,
        result: result
      };
    } catch (enhancerError) {
      // Fallback: используем SelfDev Agent
      logger.warn('ModuleEnhancer недоступен, используем SelfDev Agent', enhancerError);
      
      if (!selfDevAgent) {
        await initAgents();
      }
      
      const result = await selfDevAgent.generateProject(task, options);
      
      return {
        success: true,
        result: result
      };
    }
  } catch (error) {
    logger.error('Ошибка доработки модулей', error, { task });
    return {
      success: false,
      error: error.message
    };
  }
});

/**
 * Инициализация приложения
 */
app.whenReady().then(async () => {
  logger.info('Инициализация приложения VibeCode');
  
  // Инициализация базы знаний
  initKnowledgeBase();
  
  // Инициализация менеджера контекста чата (после базы знаний, чтобы передать её в конструктор)
  initChatContext();
  
  // Инициализация агентов
  try {
    await initAgents();
  } catch (error) {
    logger.error('Ошибка инициализации SelfDev Agent', error);
    // Продолжаем работу, но без агентов
  }
  
  // Создание окна
  const mainWindow = createWindow();
  logger.info('Главное окно приложения создано', { 
    width: mainWindow.getBounds().width,
    height: mainWindow.getBounds().height 
  });
});

// Закрытие приложения при закрытии всех окон
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Создание окна при повторном активации приложения
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Закрытие базы знаний при выходе
app.on('before-quit', () => {
  if (knowledgeBase && knowledgeBase.available) {
    try {
      knowledgeBase.close();
      logger.info('База знаний закрыта');
    } catch (error) {
      logger.error('Ошибка закрытия базы знаний', error);
    }
  }
  logger.info('Приложение завершает работу');
});
