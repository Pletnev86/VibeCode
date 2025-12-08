/**
 * Менеджер чатов - управление несколькими чатами
 * 
 * Функционал:
 * - Создание новых чатов
 * - Сохранение истории чатов
 * - Открытие сохраненных чатов
 * - Удаление чатов
 * - Управление логами чатов
 */

const fs = require('fs');
const path = require('path');

class ChatManager {
  constructor(projectRoot = null) {
    // Определяем корневую директорию проекта
    this.projectRoot = projectRoot || this.findProjectRoot();
    
    // Директория для сохранения чатов
    this.chatsDir = path.join(this.projectRoot, 'data', 'chats');
    
    // Создаем директорию если её нет
    if (!fs.existsSync(this.chatsDir)) {
      fs.mkdirSync(this.chatsDir, { recursive: true });
    }
    
    // Текущий активный чат
    this.currentChatId = null;
    this.currentChat = null;
  }
  
  /**
   * Поиск корневой директории проекта
   */
  findProjectRoot() {
    let currentDir = __dirname;
    
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name === 'vibecode' || packageJson.name === 'apihosting') {
            return currentDir;
          }
        } catch (error) {
          // Игнорируем ошибки парсинга
        }
      }
      currentDir = path.dirname(currentDir);
    }
    
    return path.dirname(__dirname);
  }
  
  /**
   * Создание нового чата
   */
  createChat(name = null) {
    const chatId = `chat-${Date.now()}`;
    const chatName = name || `Чат ${new Date().toLocaleString('ru-RU')}`;
    
    const chat = {
      id: chatId,
      name: chatName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    
    this.currentChatId = chatId;
    this.currentChat = chat;
    
    // Сохраняем чат
    this.saveChat(chat);
    
    return chat;
  }
  
  /**
   * Сохранение чата
   */
  saveChat(chat) {
    try {
      const chatFile = path.join(this.chatsDir, `${chat.id}.json`);
      chat.updatedAt = new Date().toISOString();
      fs.writeFileSync(chatFile, JSON.stringify(chat, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Ошибка сохранения чата:', error);
      return false;
    }
  }
  
  /**
   * Загрузка чата по ID
   */
  loadChat(chatId) {
    try {
      const chatFile = path.join(this.chatsDir, `${chatId}.json`);
      if (!fs.existsSync(chatFile)) {
        return null;
      }
      
      const chatData = fs.readFileSync(chatFile, 'utf8');
      const chat = JSON.parse(chatData);
      
      this.currentChatId = chatId;
      this.currentChat = chat;
      
      return chat;
    } catch (error) {
      console.error('Ошибка загрузки чата:', error);
      return null;
    }
  }
  
  /**
   * Получение списка всех чатов
   */
  getAllChats() {
    try {
      const files = fs.readdirSync(this.chatsDir);
      const chats = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const chatFile = path.join(this.chatsDir, file);
            const chatData = fs.readFileSync(chatFile, 'utf8');
            const chat = JSON.parse(chatData);
            chats.push({
              id: chat.id,
              name: chat.name,
              createdAt: chat.createdAt,
              updatedAt: chat.updatedAt,
              messageCount: chat.messages ? chat.messages.length : 0
            });
          } catch (error) {
            console.warn(`Ошибка чтения чата ${file}:`, error.message);
          }
        }
      }
      
      // Сортируем по дате обновления (новые первыми)
      chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return chats;
    } catch (error) {
      console.error('Ошибка получения списка чатов:', error);
      return [];
    }
  }
  
  /**
   * Добавление сообщения в текущий чат
   */
  addMessage(role, content) {
    if (!this.currentChat) {
      // Создаем новый чат если нет активного
      this.createChat();
    }
    
    const message = {
      role: role, // 'user' или 'ai' или 'system'
      content: content,
      timestamp: new Date().toISOString()
    };
    
    this.currentChat.messages.push(message);
    this.currentChat.updatedAt = new Date().toISOString();
    
    // Автосохранение
    this.saveChat(this.currentChat);
    
    return message;
  }
  
  /**
   * Удаление чата
   */
  deleteChat(chatId) {
    try {
      const chatFile = path.join(this.chatsDir, `${chatId}.json`);
      
      // Удаляем файл чата
      if (fs.existsSync(chatFile)) {
        fs.unlinkSync(chatFile);
      }
      
      // Удаляем логи чата если есть
      const logsDir = path.join(this.projectRoot, 'logs', 'chats');
      const chatLogFile = path.join(logsDir, `${chatId}.log`);
      if (fs.existsSync(chatLogFile)) {
        fs.unlinkSync(chatLogFile);
      }
      
      // Если удаляемый чат был текущим - очищаем
      if (this.currentChatId === chatId) {
        this.currentChatId = null;
        this.currentChat = null;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка удаления чата:', error);
      return false;
    }
  }
  
  /**
   * Получение текущего чата
   */
  getCurrentChat() {
    return this.currentChat;
  }
  
  /**
   * Очистка сообщений текущего чата (без удаления чата)
   */
  clearCurrentChat() {
    if (this.currentChat) {
      this.currentChat.messages = [];
      this.currentChat.updatedAt = new Date().toISOString();
      this.saveChat(this.currentChat);
    }
  }
}

module.exports = ChatManager;


