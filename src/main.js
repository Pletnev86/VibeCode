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

// Импорт агентов и контроллеров
let selfDevAgent = null;
let interAgentController = null;
let knowledgeBase = null;

/**
 * Инициализация базы знаний (опционально)
 */
function initKnowledgeBase() {
  try {
    const KnowledgeBase = require('../lib/knowledge-base');
    knowledgeBase = new KnowledgeBase();
    if (knowledgeBase.available) {
      console.log('✅ База знаний инициализирована');
    } else {
      console.log('⚠️ База знаний недоступна, работаем без неё');
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации базы знаний:', error.message);
    knowledgeBase = null;
  }
}

/**
 * Инициализация агентов
 */
async function initAgents() {
  try {
    // Инициализация InterAgent Controller
    const InterAgentController = require('../agents/inter-agent-controller');
    interAgentController = new InterAgentController('./config.json');
    await interAgentController.init();
    
    // Получаем SelfDev Agent из контроллера
    selfDevAgent = interAgentController.agents.selfdev;
    
    if (selfDevAgent) {
      console.log('✅ SelfDev Agent инициализирован');
    } else {
      throw new Error('SelfDev Agent не удалось инициализировать');
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации агентов:', error.message);
    throw error;
  }
}

/**
 * Создание главного окна приложения
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  // Загрузка HTML страницы
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Открытие DevTools в режиме разработки (опционально)
  // mainWindow.webContents.openDevTools();
  
  return mainWindow;
}

/**
 * IPC обработчики
 */

// Обработчик генерации проекта (Self-Build)
ipcMain.handle('generate-project', async (event, task = null) => {
  try {
    if (!selfDevAgent) {
      await initAgents();
    }
    
    console.log('🚀 Начало генерации проекта через Self-Build...');
    const result = await selfDevAgent.generateProject(task);
    console.log('✅ Проект успешно сгенерирован!');
    
    return {
      success: true,
      files: result.files || [],
      logs: selfDevAgent.logs || []
    };
  } catch (error) {
    console.error('❌ Ошибка генерации проекта:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// Обработчик автономной разработки по Roadmap
ipcMain.handle('develop-autonomously', async (event) => {
  try {
    if (!selfDevAgent) {
      await initAgents();
    }
    
    console.log('🚀 Начало автономной разработки по Roadmap...');
    const result = await selfDevAgent.developAutonomously();
    console.log('✅ Автономная разработка завершена!');
    
    return {
      success: true,
      stagesCompleted: result.stagesCompleted || 0,
      logs: result.logs || []
    };
  } catch (error) {
    console.error('❌ Ошибка автономной разработки:', error.message);
    return {
      success: false,
      error: error.message
    };
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
    console.error('❌ Ошибка анализа проекта:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// Обработчик отправки сообщения в чат
ipcMain.handle('send-chat-message', async (event, message, options = {}) => {
  try {
    if (!selfDevAgent) {
      await initAgents();
    }
    
    // Используем InterAgent Controller для маршрутизации
    const taskId = interAgentController.addTask(message, options);
    const result = await interAgentController.processTask(taskId);
    
    // Сохраняем в базу знаний если доступна
    if (knowledgeBase && knowledgeBase.available) {
      try {
        const queryId = knowledgeBase.saveQuery(message, result.response || JSON.stringify(result));
        console.log(`💾 Ответ сохранен в базу знаний (ID: ${queryId})`);
      } catch (error) {
        console.error('⚠️ Ошибка сохранения в базу знаний:', error.message);
      }
    }
    
    return {
      success: true,
      response: result.response || result,
      metadata: result.metadata || {}
    };
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error.message);
    
    // Если ошибка связана с инициализацией агентов
    if (error.message.includes('не удалось инициализировать')) {
      return {
        success: false,
        error: 'SelfDev Agent не удалось инициализировать'
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
});

// Обработчик получения логов
ipcMain.handle('get-logs', async (event) => {
  try {
    if (selfDevAgent && selfDevAgent.logs) {
      return {
        success: true,
        logs: selfDevAgent.logs
      };
    }
    return {
      success: true,
      logs: []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
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
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Обработчик выполнения команды
ipcMain.handle('run-command', async (event, command) => {
  try {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
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
    const result = await router.routeRequest(lastMessage.content, {
      useOpenRouter: model === 'openrouter' || model === 'gpt4',
      model: model,
      knowledgeBaseInstance: knowledgeBase
    });
    
    return result.response || result;
  } catch (error) {
    console.error('❌ Ошибка чата:', error.message);
    return `Ошибка: ${error.message}`;
  }
});

/**
 * Инициализация приложения
 */
app.whenReady().then(async () => {
  // Инициализация базы знаний
  initKnowledgeBase();
  
  // Инициализация агентов
  try {
    await initAgents();
  } catch (error) {
    console.error('❌ Ошибка инициализации SelfDev Agent:', error.message);
    // Продолжаем работу, но без агентов
  }
  
  // Создание окна
  createWindow();
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
    } catch (error) {
      console.error('Ошибка закрытия базы знаний:', error.message);
    }
  }
});
