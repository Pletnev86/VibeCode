// IPC мост между основным процессом и рендерером
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    chat: (messages, model) => ipcRenderer.invoke('chat', messages, model),
    runCommand: (command) => ipcRenderer.invoke('run-command', command),
    generateProject: (task) => ipcRenderer.invoke('generate-project', task),
    analyzeProject: (projectPath) => ipcRenderer.invoke('analyze-project', projectPath),
    sendChatMessage: (message, options) => ipcRenderer.invoke('send-chat-message', message, options),
    getLogs: () => ipcRenderer.invoke('get-logs'),
    developAutonomously: () => ipcRenderer.invoke('develop-autonomously'),
});