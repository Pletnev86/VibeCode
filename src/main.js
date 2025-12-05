// Точка входа для Electron-приложения
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    // Создание окна браузера
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
    });

    // Загрузка HTML страницы
    mainWindow.loadFile('index.html');

    // Открытие DevTools (опционально)
    // mainWindow.webContents.openDevTools();
}

// Запуск приложения после загрузки
app.whenReady().then(createWindow);

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