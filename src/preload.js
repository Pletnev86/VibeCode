// IPC мост между фронтендом и Node.js
const { contextBridge, ipcRenderer } = require('electron');

// Экспортируем безопасные методы для использования в рендерере
contextBridge.exposeInMainWorld('api', {
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    chat: (messages, model) => ipcRenderer.invoke('chat', messages, model),
    runCommand: (command) => ipcRenderer.invoke('run-command', command),
    generateProject: (task, options) => ipcRenderer.invoke('generate-project', task, options),
    sendChatMessage: (message, options) => ipcRenderer.invoke('send-chat-message', message, options),
    getLogs: () => ipcRenderer.invoke('get-logs'),
    analyzeProject: (projectPath) => ipcRenderer.invoke('analyze-project', projectPath),
    enhanceModules: (task, options) => ipcRenderer.invoke('enhance-modules', task, options),
    getSelfBuildState: () => ipcRenderer.invoke('get-selfbuild-state'),
    clearSelfBuildState: () => ipcRenderer.invoke('clear-selfbuild-state')
});