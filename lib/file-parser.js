/**
 * Универсальный парсер файлов из ответов AI
 * 
 * Извлекает код и пути к файлам из различных форматов ответов:
 * - Markdown блоки кода с путями
 * - HTML блоки
 * - Упоминания файлов в тексте
 */

const path = require('path');

class FileParser {
  /**
   * Парсинг файлов из ответа AI
   * @param {string} response - Ответ от AI
   * @param {string} basePath - Базовый путь для сохранения (по умолчанию './src')
   * @param {string} contextMessage - Контекстное сообщение пользователя (для извлечения имени файла)
   * @returns {Array} Массив объектов {path, content}
   */
  static parseFiles(response, basePath = './src', contextMessage = '') {
    const files = [];
    
    if (!response || typeof response !== 'string') {
      return files;
    }
    
    // Паттерн 1: Блоки с путем в заголовке: ```html\n<!DOCTYPE html>...
    // или ```src/index.html\n<!DOCTYPE html>...
    const fileBlockPattern = /```(?:[\w]+\s+)?([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))\s*\n([\s\S]*?)```/g;
    
    // Паттерн 2: Блоки с языком, где путь в комментарии внутри: ```html\n<!-- index.html -->\n<!DOCTYPE...
    const langBlockWithCommentPath = /```(?:html|css|javascript|js|typescript|ts|json|python|py|java|cpp|c|h|xml|yaml|yml)\s*\n(?:\s*<!--\s*([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))\s*-->\s*\n)?([\s\S]*?)```/g;
    
    // Паттерн 3: Упоминания файлов в тексте перед блоками
    const filePathPattern = /(?:file|файл|path|путь|создаю|создам|сохрани|сохранить|файл\s+называется|file\s+named)[:\s]+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/gi;
    
    // Паттерн 4: HTML блоки без явного пути (сохраняем как index.html)
    const htmlBlockPattern = /```html\s*\n([\s\S]*?)```/g;
    
    // Паттерн 5: CSS блоки без явного пути (сохраняем как style.css)
    const cssBlockPattern = /```css\s*\n([\s\S]*?)```/g;
    
    // Паттерн 6: JavaScript блоки без явного пути (сохраняем как script.js)
    const jsBlockPattern = /```(?:javascript|js)\s*\n([\s\S]*?)```/g;
    
    let match;
    const foundPaths = new Set();
    const processedBlocks = new Set();
    
    // Поиск 1: Блоки с путем в заголовке
    while ((match = fileBlockPattern.exec(response)) !== null) {
      let filePath = match[1].trim();
      const codeBlock = match[2].trim();
      
      // Нормализуем путь - убираем обратные слеши для Windows
      filePath = filePath.replace(/\\/g, '/');
      
      if (codeBlock.length > 0) {
        const normalizedPath = this.normalizePath(filePath, basePath);
        if (normalizedPath && !foundPaths.has(normalizedPath)) {
          files.push({
            path: normalizedPath,
            content: codeBlock
          });
          foundPaths.add(normalizedPath);
          processedBlocks.add(match[0]);
        }
      }
    }
    
    // Поиск 2: Блоки с языком и путем в комментарии
    while ((match = langBlockWithCommentPath.exec(response)) !== null) {
      const filePath = match[1] ? match[1].trim() : null;
      const codeBlock = match[3] ? match[3].trim() : match[2] ? match[2].trim() : '';
      
      if (codeBlock.length > 0 && !processedBlocks.has(match[0])) {
        if (filePath) {
          const normalizedPath = this.normalizePath(filePath, basePath);
          if (normalizedPath && !foundPaths.has(normalizedPath)) {
            files.push({
              path: normalizedPath,
              content: codeBlock
            });
            foundPaths.add(normalizedPath);
            processedBlocks.add(match[0]);
          }
        }
      }
    }
    
    // Поиск 3: HTML блоки без пути
    if (!foundPaths.has('index.html')) {
      while ((match = htmlBlockPattern.exec(response)) !== null) {
        const codeBlock = match[1].trim();
        if (codeBlock.length > 50 && !processedBlocks.has(match[0])) {
          files.push({
            path: 'index.html',
            content: codeBlock
          });
          foundPaths.add('index.html');
          processedBlocks.add(match[0]);
          break; // Берем только первый HTML блок
        }
      }
    }
    
    // Поиск 4: CSS блоки без пути
    if (!foundPaths.has('style.css')) {
      while ((match = cssBlockPattern.exec(response)) !== null) {
        const codeBlock = match[1].trim();
        if (codeBlock.length > 10 && !processedBlocks.has(match[0])) {
          files.push({
            path: 'style.css',
            content: codeBlock
          });
          foundPaths.add('style.css');
          processedBlocks.add(match[0]);
          break;
        }
      }
    }
    
    // Поиск 5: JavaScript блоки без пути (только если нет других JS файлов)
    const hasJsFiles = Array.from(foundPaths).some(p => p.endsWith('.js'));
    if (!hasJsFiles) {
      // Пытаемся извлечь имя файла из контекста запроса
      let defaultJsFileName = 'script.js';
      if (contextMessage) {
        const contextFileMatch = contextMessage.match(/(?:доработай|создай|напиши|обнови|измени|изменяю|редактирую|редактируй|добавь|добавить)\s+([\w\/\\\.\-]+\.(?:js|ts|jsx|tsx))/i);
        if (contextFileMatch && contextFileMatch[1]) {
          defaultJsFileName = path.basename(contextFileMatch[1]);
        }
      }
      
      while ((match = jsBlockPattern.exec(response)) !== null) {
        const codeBlock = match[1].trim();
        if (codeBlock.length > 20 && !processedBlocks.has(match[0])) {
          files.push({
            path: defaultJsFileName,
            content: codeBlock
          });
          foundPaths.add(defaultJsFileName);
          processedBlocks.add(match[0]);
          break;
        }
      }
    }
    
    // Поиск 6: Упоминания файлов в тексте (для случаев когда файл упомянут, но блок кода отдельно)
    const textBeforeBlocks = response.split('```')[0];
    const pathMatches = textBeforeBlocks.matchAll(filePathPattern);
    
    for (const pathMatch of pathMatches) {
      const mentionedPath = pathMatch[1].trim();
      const normalizedPath = this.normalizePath(mentionedPath, basePath);
      
      if (normalizedPath && !foundPaths.has(normalizedPath)) {
        // Ищем соответствующий блок кода после упоминания
        const pathIndex = pathMatch.index;
        const afterPath = response.substring(pathIndex);
        const nextBlock = afterPath.match(/```[\s\S]*?```/);
        
        if (nextBlock) {
          const codeContent = nextBlock[0]
            .replace(/```[\w]*\s*\n?/g, '')
            .replace(/```/g, '')
            .trim();
          
          if (codeContent.length > 10) {
            files.push({
              path: normalizedPath,
              content: codeContent
            });
            foundPaths.add(normalizedPath);
          }
        }
      }
    }
    
    return files;
  }
  
  /**
   * Нормализация пути к файлу
   */
  static normalizePath(filePath, basePath = './src') {
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }
    
    let normalized = filePath.trim();
    
    // Нормализуем обратные слеши для Windows
    normalized = normalized.replace(/\\/g, '/');
    
    // Убираем начальный слэш
    if (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    
    // Убираем ./ в начале
    if (normalized.startsWith('./')) {
      normalized = normalized.substring(2);
    }
    
    // Убираем начальный src/ если он есть
    if (normalized.startsWith('src/')) {
      normalized = normalized.substring(4);
    }
    
    // Убираем двойной src/src/
    if (normalized.startsWith('src/src/')) {
      normalized = normalized.substring(4);
    }
    
    // Убираем lib/ если basePath не lib
    if (!basePath.includes('lib') && normalized.startsWith('lib/')) {
      normalized = normalized.substring(4);
    }
    
    // Убираем пробелы и переносы строк
    normalized = normalized.replace(/[\r\n]/g, '').trim();
    
    // Проверяем что это валидный путь
    if (normalized.length < 3 || !normalized.includes('.')) {
      return null;
    }
    
    // Проверяем расширение
    const validExtensions = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.md', '.py', '.java', '.cpp', '.c', '.h', '.txt', '.xml', '.yaml', '.yml'];
    const hasValidExtension = validExtensions.some(ext => normalized.endsWith(ext));
    
    if (!hasValidExtension) {
      return null;
    }
    
    return normalized;
  }
  
  /**
   * Проверка, содержит ли ответ файлы для сохранения
   */
  static hasFiles(response) {
    if (!response || typeof response !== 'string') {
      return false;
    }
    
    // Проверяем наличие блоков кода
    const hasCodeBlocks = /```[\s\S]*?```/.test(response);
    if (!hasCodeBlocks) {
      return false;
    }
    
    // Проверяем наличие упоминаний файлов
    const hasFileMentions = /(?:file|файл|path|путь|\.(?:js|html|css|json|md|py|java|cpp|c|h|txt|xml|yaml|yml))/i.test(response);
    
    return hasCodeBlocks && hasFileMentions;
  }
}

module.exports = FileParser;

