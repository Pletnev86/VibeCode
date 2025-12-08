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

// Инициализация сессионного логгера
const SessionLogger = require('../lib/session-logger');
const sessionLogger = new SessionLogger(logger);

// Инициализация менеджера проектов
const ProjectManager = require('../lib/project-manager');
const projectManager = new ProjectManager();

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

    // Загрузка HTML страницы - показываем экран выбора проекта если проект не открыт
    let htmlPath;
    if (!projectManager.isProjectOpen()) {
      htmlPath = path.join(__dirname, 'project-selector.html');
      logger.info('Проект не открыт, показываем экран выбора проекта');
    } else {
      htmlPath = path.join(__dirname, 'index.html');
      logger.info('Проект открыт, показываем основной интерфейс', { project: projectManager.currentProject });
    }
    
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
ipcMain.handle('generate-project', async (event, task = null) => {
  try {
    logger.info('Начало генерации проекта через Self-Build', { task });
    
    if (!selfDevAgent) {
      await initAgents();
    }
    
    const result = await selfDevAgent.generateProject(task);
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
    
    // Сохраняем сообщение в историю проекта
    if (projectManager.isProjectOpen()) {
      const desktop = projectManager.getProjectDesktop();
      if (desktop) {
        if (!desktop.chatHistory) {
          desktop.chatHistory = [];
        }
        desktop.chatHistory.push({
          role: 'user',
          message: message,
          timestamp: new Date().toISOString()
        });
        projectManager.saveProjectDesktop(desktop);
      }
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
      // Передаем информацию о текущем проекте в ChatContextManager
      if (projectManager.isProjectOpen()) {
        const projectPath = projectManager.getCurrentProjectPath();
        // Обновляем projectRoot в chatContextManager для текущего проекта
        chatContextManager.projectRoot = projectPath;
      }
      
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
    
    // Получаем информацию о фактически использованной модели из router
    const actualModel = router.lastUsedModel || (useOpenRouter ? openRouterModel : model);
    const actualProvider = router.lastUsedProvider || (useOpenRouter ? 'openrouter' : 'lmstudio');
    
    // Определяем запрошенную модель для логирования (из router или из опций)
    const requestedModel = router.lastRequestedModel || (useOpenRouter ? openRouterModel : model);
    
    // Логируем информацию о модели
    logger.info('📤 Запрос к AI модели', {
      requestedModel: requestedModel,
      actualModel: actualModel,
      provider: actualProvider,
      useOpenRouter: useOpenRouter,
      modelChanged: requestedModel !== actualModel
    });
    
    const executionTime = Date.now() - startTime;
    
    // Сохраняем ответ AI в историю проекта
    if (projectManager.isProjectOpen()) {
      const desktop = projectManager.getProjectDesktop();
      if (desktop) {
        if (!desktop.chatHistory) {
          desktop.chatHistory = [];
        }
        desktop.chatHistory.push({
          role: 'assistant',
          message: responseText,
          timestamp: new Date().toISOString(),
          model: actualModel,
          provider: actualProvider
        });
        projectManager.saveProjectDesktop(desktop);
      }
    }
    
    logger.info('📥 Ответ AI в чат', {
      response: responseText,
      responseLength: typeof responseText === 'string' ? responseText.length : 0,
      responseType: typeof responseText,
      executionTime: executionTime,
      requestedModel: requestedModel,
      actualModel: actualModel,
      provider: actualProvider,
      modelChanged: requestedModel !== actualModel,
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
      
      // ВАЖНО: Если проект не открыт, файлы не сохраняются
      if (!projectManager.isProjectOpen()) {
        logger.warn('⚠️ Проект не открыт, файлы не будут сохранены', { 
          count: parsedFiles.length,
          message: 'Откройте проект через "Открыть проект" для работы с файлами.'
        });
        // Не сохраняем файлы, но продолжаем выполнение
      } else {
        // Сохраняем файлы
        for (const file of parsedFiles) {
          try {
            // Нормализуем путь - убираем src/ если уже есть
            let normalizedPath = file.path.replace(/\\/g, '/');
            if (normalizedPath.startsWith('src/')) {
              normalizedPath = normalizedPath.substring(4);
            }
            
            // Сохраняем файлы ТОЛЬКО в папку проекта
            const projectPath = projectManager.getCurrentProjectPath();
            const projectSrcPath = path.join(projectPath, 'src');
            const targetPath = path.join(projectSrcPath, normalizedPath);
            
            // Проверяем, не является ли это системным файлом (защита от перезаписи системных файлов)
            // Файлы в папке проекта НЕ являются системными, даже если имеют те же имена
            // Защищаем только файлы в системных директориях (src/, lib/, agents/, ai/ в корне проекта)
            const fileName = path.basename(targetPath);
            const protectedSystemFiles = ['main.js', 'preload.js', 'ui.js']; // Только системные JS файлы
            
            // Проверяем только системные JS файлы, НЕ HTML/CSS файлы проектов
            // index.html и style.css в проектах - это нормальные файлы проектов
            if (protectedSystemFiles.includes(fileName)) {
              // Проверяем, не находится ли файл в системной директории (вне projects/)
              const relativeToProjectRoot = path.relative(projectManager.projectRoot, targetPath);
              if (!relativeToProjectRoot.startsWith('projects' + path.sep)) {
                logger.warn('⚠️ ЗАЩИТА: Попытка создать системный файл', { 
                  path: file.path,
                  fileName: fileName,
                  message: 'Системные файлы нельзя создавать вне папки projects.'
                });
                continue;
              }
            }
            
            logger.info('Сохранение файла в проект', { 
              originalPath: file.path,
              normalizedPath: normalizedPath,
              projectPath: targetPath,
              project: projectManager.currentProject
            });
            
            const dir = path.dirname(targetPath);
            
            // Проверяем существование файла перед сохранением
            const fileExists = fs.existsSync(targetPath);
            
            // Создаем директории если нужно
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
              logger.info('Создана директория для файла', { dir: dir });
            }
            
            // Сохраняем файл
            fs.writeFileSync(targetPath, file.content, 'utf8');
            savedFiles.push(targetPath);
            
            logger.info('✅ Файл сохранен в проект', { 
              path: normalizedPath, 
              fullPath: targetPath,
              existed: fileExists,
              size: file.content.length,
              project: projectManager.currentProject
            });
          } catch (error) {
            logger.error('❌ Ошибка сохранения файла из ответа', error, { 
              path: file.path,
              project: projectManager.currentProject
            });
          }
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
        deletedFiles: deletedFiles,
        model: actualModel, // Фактически использованная модель
        provider: actualProvider, // Фактически использованный провайдер
        requestedModel: useOpenRouter ? openRouterModel : model, // Запрошенная модель
        executionTime: executionTime,
        tokens: router.lastTokenUsage || null // Информация о токенах если есть
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

// Обработчик получения логов
ipcMain.handle('get-logs', async (event) => {
  try {
    // Получаем только логи текущей сессии
    const sessionLogs = sessionLogger.getSessionLogs(100);
    
    // Также получаем логи из SelfDev Agent если есть
    let agentLogs = [];
    if (selfDevAgent && selfDevAgent.logs) {
      agentLogs = selfDevAgent.logs.map(log => ({
        ...log,
        sessionId: sessionLogger.sessionId
      }));
    }
    
    // Объединяем логи, убираем дубликаты
    const allLogs = [...sessionLogs, ...agentLogs];
    
    // Сортируем по времени
    allLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA; // Новые сначала
    });
    
    return {
      success: true,
      logs: allLogs.slice(0, 100), // Последние 100 логов сессии
      sessionInfo: sessionLogger.getSessionInfo()
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

// Обработчик для получения общего лога (для анализа проблем)
ipcMain.handle('get-general-logs', async (event, limit = 1000) => {
  try {
    const generalLogs = sessionLogger.getGeneralLogs(limit);
    return {
      success: true,
      logs: generalLogs,
      filePath: sessionLogger.generalLogFile
    };
  } catch (error) {
    logger.error('Ошибка получения общего лога', error);
    return {
      success: false,
      error: error.message,
      logs: []
    };
  }
});

// Обработчики для управления проектами
ipcMain.handle('create-project', async (event, projectName) => {
  try {
    const project = projectManager.createProject(projectName);
    logger.info('Проект создан', { name: project.name, path: project.path });
    
    // Обновляем logger для использования папки проекта
    logger.setCurrentProject(projectManager.getCurrentProjectPath());
    
    return { success: true, project: project };
  } catch (error) {
    logger.error('Ошибка создания проекта', error, { projectName });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-project', async (event, projectName) => {
  try {
    const desktop = projectManager.openProject(projectName);
    logger.info('Проект открыт', { name: projectName });
    
    // Обновляем logger для использования папки проекта
    logger.setCurrentProject(projectManager.getCurrentProjectPath());
    
    // Загружаем историю чатов в chatContextManager
    if (chatContextManager && desktop.chatHistory && desktop.chatHistory.length > 0) {
      // Очищаем текущую историю
      chatContextManager.history = [];
      
      // Загружаем историю из проекта
      desktop.chatHistory.forEach(msg => {
        chatContextManager.addToHistory(msg.role, msg.message);
      });
      
      logger.info('История чатов загружена', { count: desktop.chatHistory.length });
    }
    
    return { success: true, desktop: desktop };
  } catch (error) {
    logger.error('Ошибка открытия проекта', error, { projectName });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-projects', async (event) => {
  try {
    const projects = projectManager.listProjects();
    return { success: true, projects: projects };
  } catch (error) {
    logger.error('Ошибка получения списка проектов', error);
    return { success: false, error: error.message, projects: [] };
  }
});

ipcMain.handle('get-current-project', async (event) => {
  try {
    if (projectManager.isProjectOpen()) {
      const desktop = projectManager.getProjectDesktop();
      return { 
        success: true, 
        project: {
          name: projectManager.currentProject,
          path: projectManager.getCurrentProjectPath(),
          desktop: desktop
        }
      };
    }
    return { success: false, project: null };
  } catch (error) {
    logger.error('Ошибка получения текущего проекта', error);
    return { success: false, error: error.message };
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
    const resolvedPath = path.resolve(filePath);
    
    // ЗАЩИТА СИСТЕМНЫХ ФАЙЛОВ
    if (projectManager.isSystemFile(resolvedPath)) {
      const fileName = path.basename(resolvedPath);
      logger.warn('⚠️ ЗАЩИТА: Попытка перезаписать системный файл', { 
        path: filePath,
        fileName: fileName
      });
      return { 
        success: false, 
        error: `⚠️ ЗАЩИТА: Системный файл "${fileName}" защищен от редактирования. Создайте проект через "Создать проект" для работы с файлами.`
      };
    }
    
    // Если проект открыт, сохраняем файлы только в папку проекта
    if (projectManager.isProjectOpen()) {
      const projectPath = projectManager.getCurrentProjectPath();
      const projectSrcPath = path.join(projectPath, 'src');
      
      // Если файл должен быть в src/, сохраняем в папку проекта
      if (resolvedPath.includes('src') && !resolvedPath.includes('projects')) {
        const relativePath = path.relative(process.cwd(), resolvedPath);
        if (relativePath.startsWith('src')) {
          const projectFilePath = path.join(projectSrcPath, relativePath.replace('src/', ''));
          const dir = path.dirname(projectFilePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(projectFilePath, data, 'utf8');
          logger.info('Файл записан в проект', { 
            originalPath: filePath,
            projectPath: projectFilePath,
            project: projectManager.currentProject
          });
          return { success: true, projectPath: projectFilePath };
        }
      }
    }
    
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
  
  // Очищаем сессию при запуске новой сессии
  sessionLogger.clearSession();
  logger.info('Новая сессия VibeCode начата', { sessionId: sessionLogger.sessionId });
  
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
  // Сохраняем сессионные логи перед закрытием
  try {
    sessionLogger.saveSessionToGeneralLog();
  } catch (error) {
    console.error('Ошибка сохранения сессионных логов:', error);
  }
  
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

// Закрытие базы знаний и сохранение сессии при выходе
app.on('before-quit', () => {
  // Сохраняем сессионные логи в общий лог
  try {
    sessionLogger.saveSessionToGeneralLog();
    logger.info('Сессионные логи сохранены в общий лог');
  } catch (error) {
    logger.error('Ошибка сохранения сессионных логов', error);
  }
  
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
