/**
 * Модуль управления резервными копиями
 * 
 * Функционал:
 * - Создание резервных копий перед изменениями
 * - Автоматический откат при ошибках
 * - Управление версиями бэкапов
 */

const fs = require('fs');
const path = require('path');

// Логгер инициализируется лениво, чтобы избежать циклических зависимостей
let logger = null;
function getLogger() {
  if (!logger) {
    const { getLogger: getLoggerFn } = require('./logger');
    logger = getLoggerFn();
  }
  return logger;
}

class BackupManager {
  constructor(projectRoot = null) {
    // Определяем корневую директорию проекта
    this.projectRoot = projectRoot || this.findProjectRoot();
    
    // Директория для бэкапов
    this.backupDir = path.join(this.projectRoot, 'backups');
    
    // Создаем директорию для бэкапов если её нет
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Текущая активная резервная копия
    this.currentBackup = null;
    
    // Логгер инициализируем лениво
    this.logger = null;
  }
  
  /**
   * Получение логгера (ленивая инициализация)
   */
  getLogger() {
    if (!this.logger) {
      this.logger = getLogger();
    }
    return this.logger;
  }

  /**
   * Поиск корневой директории проекта
   */
  findProjectRoot() {
    let currentDir = __dirname;
    
    // Поднимаемся вверх пока не найдем package.json с name: "vibecode"
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name === 'vibecode') {
            return currentDir;
          }
        } catch (error) {
          // Игнорируем ошибки парсинга
        }
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Если не нашли, используем директорию lib
    return path.dirname(__dirname);
  }

  /**
   * Создание резервной копии директории или файлов
   */
  async createBackup(sourcePath, backupName = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupNameFinal = backupName || `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupNameFinal);
      
      this.getLogger().info('Создание резервной копии', { source: sourcePath, backup: backupNameFinal });
      
      // Если это файл
      if (fs.statSync(sourcePath).isFile()) {
        const backupFilePath = path.join(backupPath, path.basename(sourcePath));
        const backupFileDir = path.dirname(backupFilePath);
        
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }
        
        fs.copyFileSync(sourcePath, backupFilePath);
        this.getLogger().info('Файл скопирован в бэкап', { file: sourcePath, backup: backupFilePath });
        
        this.currentBackup = {
          name: backupNameFinal,
          path: backupPath,
          type: 'file',
          source: sourcePath,
          files: [backupFilePath]
        };
        
        return this.currentBackup;
      }
      
      // Если это директория
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // Копируем все файлы из директории
      const files = this.getAllFiles(sourcePath);
      const copiedFiles = [];
      
      for (const file of files) {
        const relativePath = path.relative(sourcePath, file);
        const backupFilePath = path.join(backupPath, relativePath);
        const backupFileDir = path.dirname(backupFilePath);
        
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }
        
        fs.copyFileSync(file, backupFilePath);
        copiedFiles.push(backupFilePath);
      }
      
      this.getLogger().info('Директория скопирована в бэкап', { 
        source: sourcePath, 
        backup: backupPath,
        filesCount: copiedFiles.length 
      });
      
      this.currentBackup = {
        name: backupNameFinal,
        path: backupPath,
        type: 'directory',
        source: sourcePath,
        files: copiedFiles
      };
      
      return this.currentBackup;
    } catch (error) {
      this.getLogger().error('Ошибка создания резервной копии', error, { source: sourcePath });
      throw error;
    }
  }

  /**
   * Получение всех файлов из директории рекурсивно
   */
  getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        // Пропускаем node_modules, .git, backups
        if (!['node_modules', '.git', 'backups', 'logs', 'cache'].includes(file)) {
          arrayOfFiles = this.getAllFiles(filePath, arrayOfFiles);
        }
      } else {
        arrayOfFiles.push(filePath);
      }
    });
    
    return arrayOfFiles;
  }

  /**
   * Восстановление из резервной копии
   */
  async restoreBackup(backupName = null) {
    try {
      let backup;
      
      if (backupName) {
        // Ищем указанную копию
        backup = this.getBackupInfo(backupName);
        if (!backup) {
          // Пробуем найти по части имени
          const backups = this.listBackups();
          const found = backups.find(b => b.name.includes(backupName));
          if (found) {
            backup = this.getBackupInfo(found.name);
          }
        }
      } else {
        // Используем текущую активную копию
        backup = this.currentBackup;
      }
      
      // Если не найдена, ищем последнюю рабочую версию
      if (!backup) {
        const backups = this.listBackups();
        const workingBackups = backups.filter(b => b.name.startsWith('working-version-'));
        if (workingBackups.length > 0) {
          backup = this.getBackupInfo(workingBackups[0].name);
          this.getLogger().info('Используется последняя рабочая версия', { backup: backup.name });
        }
      }
      
      if (!backup) {
        throw new Error('Резервная копия не найдена');
      }
      
      this.getLogger().info('Восстановление из резервной копии', { backup: backup.name });
      
      if (backup.type === 'file') {
        // Восстанавливаем один файл
        const sourceFile = backup.source;
        const backupFile = backup.files[0];
        
        if (fs.existsSync(backupFile)) {
          const sourceDir = path.dirname(sourceFile);
          if (!fs.existsSync(sourceDir)) {
            fs.mkdirSync(sourceDir, { recursive: true });
          }
          
          fs.copyFileSync(backupFile, sourceFile);
          this.getLogger().info('Файл восстановлен', { file: sourceFile });
        }
      } else {
        // Восстанавливаем директорию
        let restoredCount = 0;
        for (const backupFile of backup.files) {
          const relativePath = path.relative(backup.path, backupFile);
          const sourceFile = path.join(backup.source, relativePath);
          const sourceDir = path.dirname(sourceFile);
          
          if (!fs.existsSync(sourceDir)) {
            fs.mkdirSync(sourceDir, { recursive: true });
          }
          
          if (fs.existsSync(backupFile)) {
            fs.copyFileSync(backupFile, sourceFile);
            restoredCount++;
          }
        }
        
        this.getLogger().info('Директория восстановлена', { 
          source: backup.source,
          filesCount: restoredCount,
          totalFiles: backup.files.length
        });
      }
      
      return true;
    } catch (error) {
      this.getLogger().error('Ошибка восстановления из резервной копии', error);
      throw error;
    }
  }

  /**
   * Получение информации о резервной копии
   */
  getBackupInfo(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return null;
    }
    
    const stats = fs.statSync(backupPath);
    const files = this.getAllFiles(backupPath);
    
    // Определяем исходный путь из метаданных или используем src
    const sourcePath = path.join(this.projectRoot, 'src');
    
    return {
      name: backupName,
      path: backupPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      source: sourcePath,
      files: files,
      created: stats.birthtime
    };
  }

  /**
   * Список всех резервных копий
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }
      
      const backups = fs.readdirSync(this.backupDir)
        .filter(item => {
          const itemPath = path.join(this.backupDir, item);
          return fs.statSync(itemPath).isDirectory();
        })
        .map(backupName => {
          const backupPath = path.join(this.backupDir, backupName);
          const stats = fs.statSync(backupPath);
          return {
            name: backupName,
            path: backupPath,
            created: stats.birthtime,
            size: this.getDirectorySize(backupPath)
          };
        })
        .sort((a, b) => b.created - a.created); // Новые сначала
      
      return backups;
    } catch (error) {
      this.getLogger().error('Ошибка получения списка резервных копий', error);
      return [];
    }
  }

  /**
   * Получение размера директории
   */
  getDirectorySize(dirPath) {
    let size = 0;
    try {
      const files = this.getAllFiles(dirPath);
      files.forEach(file => {
        try {
          size += fs.statSync(file).size;
        } catch (error) {
          // Игнорируем ошибки доступа
        }
      });
    } catch (error) {
      // Игнорируем ошибки
    }
    return size;
  }

  /**
   * Удаление старых резервных копий (старше N дней)
   */
  cleanOldBackups(daysToKeep = 7) {
    try {
      const backups = this.listBackups();
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      backups.forEach(backup => {
        const age = now - backup.created.getTime();
        if (age > maxAge) {
          try {
            fs.rmSync(backup.path, { recursive: true, force: true });
            this.getLogger().info('Удалена старая резервная копия', { name: backup.name });
            deletedCount++;
          } catch (error) {
            this.getLogger().warn('Не удалось удалить резервную копию', null, error);
          }
        }
      });
      
      if (deletedCount > 0) {
        this.getLogger().info(`Удалено старых резервных копий: ${deletedCount}`);
      }
      
      return deletedCount;
    } catch (error) {
      this.getLogger().error('Ошибка очистки старых резервных копий', error);
      return 0;
    }
  }

  /**
   * Удаление резервной копии
   */
  deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Резервная копия ${backupName} не найдена`);
      }
      
      fs.rmSync(backupPath, { recursive: true, force: true });
      this.getLogger().info('Резервная копия удалена', { name: backupName });
      
      if (this.currentBackup && this.currentBackup.name === backupName) {
        this.currentBackup = null;
      }
      
      return true;
    } catch (error) {
      this.getLogger().error('Ошибка удаления резервной копии', error);
      throw error;
    }
  }
}

module.exports = BackupManager;

