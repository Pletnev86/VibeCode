/**
 * Execution Layer - безопасное выполнение команд и операций
 * 
 * Этот модуль отвечает за:
 * - Безопасное выполнение команд через Node.js
 * - Запись и чтение файлов
 * - Запуск скриптов
 * - Изоляцию выполнения
 * - Контроль времени выполнения
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ExecutionLayer {
  constructor(config = {}) {
    this.timeout = config.timeout || 30000; // 30 секунд по умолчанию
    this.isolated = config.isolated !== false; // Изоляция включена по умолчанию
    this.allowedCommands = config.allowedCommands || ['node', 'npm', 'git'];
    this.blockedPaths = config.blockedPaths || [
      '/etc',
      '/sys',
      '/proc',
      'C:\\Windows\\System32',
      'C:\\Windows\\SysWOW64'
    ];
  }

  /**
   * Проверка безопасности пути
   */
  isPathSafe(filePath) {
    const resolvedPath = path.resolve(filePath);
    
    // Проверка на заблокированные пути
    for (const blockedPath of this.blockedPaths) {
      if (resolvedPath.startsWith(path.resolve(blockedPath))) {
        return false;
      }
    }
    
    // Проверка на попытку выхода за пределы проекта
    const projectRoot = process.cwd();
    if (!resolvedPath.startsWith(projectRoot)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Проверка, является ли путь системным файлом VibeCode
   */
  isSystemFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    const projectRoot = process.cwd().replace(/\\/g, '/');
    
    // Список системных файлов и директорий VibeCode
    const systemFiles = [
      'src/main.js',
      'src/preload.js',
      'src/ui.js',
      'src/index.html',
      'src/style.css',
      'package.json',
      'config.json'
    ];
    
    const systemDirs = [
      'src/main.js',
      'src/preload.js',
      'src/ui.js',
      'src/index.html'
    ];
    
    // Проверяем, не является ли файл системным
    for (const sysFile of systemFiles) {
      const sysPath = path.join(projectRoot, sysFile).replace(/\\/g, '/');
      if (normalizedPath === sysPath || normalizedPath.endsWith('/' + sysFile)) {
        return true;
      }
    }
    
    // Проверяем, не находится ли файл в системных директориях (кроме projects/)
    if (normalizedPath.includes('/src/') && !normalizedPath.includes('/projects/')) {
      const relativePath = normalizedPath.replace(projectRoot + '/', '');
      if (relativePath.startsWith('src/') && !relativePath.includes('/projects/')) {
        // Проверяем, не является ли это файлом в корне src/
        const srcRelative = relativePath.replace('src/', '');
        if (!srcRelative.includes('/')) {
          return true; // Файл в корне src/ - системный
        }
      }
    }
    
    return false;
  }

  /**
   * Безопасная запись файла
   */
  async writeFile(filePath, content, options = {}) {
    if (!this.isPathSafe(filePath)) {
      throw new Error(`Небезопасный путь: ${filePath}`);
    }

    const resolvedPath = path.resolve(filePath);
    
    // ЗАЩИТА СИСТЕМНЫХ ФАЙЛОВ VIBECODE
    // Проверяем, не является ли файл системным
    if (this.isSystemFile(resolvedPath)) {
      const fileName = path.basename(resolvedPath);
      throw new Error(`⚠️ ЗАЩИТА: Попытка перезаписать системный файл VibeCode "${fileName}". Системные файлы защищены от перезаписи. Используйте ручное редактирование или создайте проект в отдельной папке через "Новый проект".`);
    }
    
    // Дополнительная защита критичных файлов
    const criticalFiles = [
      'main.js',
      'preload.js',
      'ui.js',
      'index.html',
      'style.css',
      'vibecode.html',
      'app.js'
    ];
    
    const fileName = path.basename(resolvedPath);
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    const projectRoot = process.cwd().replace(/\\/g, '/');
    const isInSrcRoot = normalizedPath.includes('/src/') && !normalizedPath.replace(/.*\/src\//, '').includes('/');
    const isInProjectRoot = normalizedPath.startsWith(projectRoot + '/src/') && !normalizedPath.includes('/projects/');
    
    // Если файл критичный и находится в системных директориях - блокируем запись
    if (criticalFiles.includes(fileName) && (isInSrcRoot || isInProjectRoot || normalizedPath.endsWith(`/src/${fileName}`) || normalizedPath.endsWith(`\\src\\${fileName}`))) {
      throw new Error(`⚠️ ЗАЩИТА: Попытка перезаписать критичный файл приложения "${fileName}". Этот файл защищен от перезаписи. Используйте ручное редактирование или создайте проект в отдельной папке.`);
    }

    const dir = path.dirname(resolvedPath);

    // Создание директории если нужно
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Запись файла
    fs.writeFileSync(resolvedPath, content, {
      encoding: options.encoding || 'utf8',
      mode: options.mode || 0o644
    });

    return resolvedPath;
  }

  /**
   * Безопасное чтение файла
   */
  async readFile(filePath, options = {}) {
    if (!this.isPathSafe(filePath)) {
      throw new Error(`Небезопасный путь: ${filePath}`);
    }

    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Файл не найден: ${resolvedPath}`);
    }

    return fs.readFileSync(resolvedPath, {
      encoding: options.encoding || 'utf8'
    });
  }

  /**
   * Безопасное выполнение команды
   */
  async executeCommand(command, options = {}) {
    // Проверка разрешенных команд
    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];
    
    if (!this.allowedCommands.includes(baseCommand)) {
      throw new Error(`Команда не разрешена: ${baseCommand}`);
    }

    // Проверка аргументов на небезопасные паттерны
    const unsafePatterns = [
      /rm\s+-rf/,
      /del\s+\/s/,
      /format/,
      /mkfs/,
      />\s*\/dev/
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(command)) {
        throw new Error(`Небезопасная команда обнаружена: ${command}`);
      }
    }

    const timeout = options.timeout || this.timeout;
    const cwd = options.cwd || process.cwd();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd,
        timeout: timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      return {
        success: true,
        stdout: stdout,
        stderr: stderr,
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }

  /**
   * Безопасный запуск скрипта Node.js
   */
  async runScript(scriptPath, args = [], options = {}) {
    if (!this.isPathSafe(scriptPath)) {
      throw new Error(`Небезопасный путь к скрипту: ${scriptPath}`);
    }

    const resolvedPath = path.resolve(scriptPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Скрипт не найден: ${resolvedPath}`);
    }

    const command = `node "${resolvedPath}" ${args.join(' ')}`;
    return await this.executeCommand(command, options);
  }

  /**
   * Создание директории
   */
  async createDirectory(dirPath) {
    if (!this.isPathSafe(dirPath)) {
      throw new Error(`Небезопасный путь: ${dirPath}`);
    }

    const resolvedPath = path.resolve(dirPath);
    
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }

    return resolvedPath;
  }

  /**
   * Удаление файла (с проверкой безопасности)
   */
  async deleteFile(filePath) {
    if (!this.isPathSafe(filePath)) {
      throw new Error(`Небезопасный путь: ${filePath}`);
    }

    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      return false;
    }

    fs.unlinkSync(resolvedPath);
    return true;
  }

  /**
   * Копирование файла
   */
  async copyFile(sourcePath, destPath) {
    if (!this.isPathSafe(sourcePath) || !this.isPathSafe(destPath)) {
      throw new Error('Небезопасный путь');
    }

    const source = path.resolve(sourcePath);
    const dest = path.resolve(destPath);

    if (!fs.existsSync(source)) {
      throw new Error(`Исходный файл не найден: ${source}`);
    }

    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(source, dest);
    return dest;
  }

  /**
   * Проверка существования файла/директории
   */
  exists(filePath) {
    if (!this.isPathSafe(filePath)) {
      return false;
    }

    return fs.existsSync(path.resolve(filePath));
  }

  /**
   * Получение информации о файле
   */
  getFileInfo(filePath) {
    if (!this.isPathSafe(filePath)) {
      throw new Error(`Небезопасный путь: ${filePath}`);
    }

    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const stats = fs.statSync(resolvedPath);
    return {
      path: resolvedPath,
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  }
}

module.exports = ExecutionLayer;







