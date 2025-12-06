// IPC мост между фронтендом и Node.js
const { contextBridge, ipcRenderer } = require('electron');

// Экспортируем безопасные методы для использования в рендерере
contextBridge.exposeInMainWorld('api', {
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    chat: (messages, model) => ipcRenderer.invoke('chat', messages, model),
    runCommand: (command) => ipcRenderer.invoke('run-command', command)
});