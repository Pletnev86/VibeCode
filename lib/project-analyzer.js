/**
 * Project Analyzer - анализ файловой структуры проектов
 * 
 * Этот модуль отвечает за:
 * - Анализ структуры проекта из Cursor
 * - Понимание файлов .md, конфигурационных файлов и т.д.
 * - Поддержку перетаскивания проектов из Cursor в VibeCode
 * - Генерацию описания структуры проекта для AI
 */

const fs = require('fs');
const path = require('path');

class ProjectAnalyzer {
  constructor(projectPath) {
    this.projectPath = path.resolve(projectPath);
    this.ignoredDirs = ['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', '.next', 'out'];
    this.ignoredFiles = ['.DS_Store', 'Thumbs.db', '.gitignore'];
    this.importantExtensions = ['.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.html', '.css', '.scss', '.yml', '.yaml', '.xml', '.txt'];
  }

  /**
   * Проверка, является ли файл/папка игнорируемым
   */
  shouldIgnore(itemPath) {
    const name = path.basename(itemPath);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      return this.ignoredDirs.includes(name) || name.startsWith('.');
    }
    
    return this.ignoredFiles.includes(name) || name.startsWith('.');
  }

  /**
   * Проверка, является ли файл важным для анализа
   */
  isImportantFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.importantExtensions.includes(ext);
  }

  /**
   * Рекурсивное сканирование директории
   */
  scanDirectory(dirPath, relativePath = '', depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
      return [];
    }

    const items = [];
    
    try {
      const entries = fs.readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const relative = path.join(relativePath, entry);
        
        if (this.shouldIgnore(fullPath)) {
          continue;
        }

        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          items.push({
            type: 'directory',
            name: entry,
            path: relative,
            fullPath: fullPath
          });
          
          // Рекурсивно сканируем поддиректории
          const subItems = this.scanDirectory(fullPath, relative, depth + 1, maxDepth);
          items.push(...subItems);
        } else if (stats.isFile() && this.isImportantFile(fullPath)) {
          items.push({
            type: 'file',
            name: entry,
            path: relative,
            fullPath: fullPath,
            size: stats.size,
            extension: path.extname(entry).toLowerCase()
          });
        }
      }
    } catch (error) {
      console.warn(`Ошибка сканирования ${dirPath}:`, error.message);
    }

    return items;
  }

  /**
   * Чтение содержимого важных файлов
   */
  readFileContent(filePath, maxSize = 100000) {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.size > maxSize) {
        return `[Файл слишком большой: ${stats.size} байт. Показаны первые ${maxSize} символов]\n\n` +
               fs.readFileSync(filePath, 'utf8').substring(0, maxSize);
      }
      
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return `[Ошибка чтения файла: ${error.message}]`;
    }
  }

  /**
   * Анализ проекта и создание структурированного описания
   */
  analyze() {
    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Проект не найден: ${this.projectPath}`);
    }

    const stats = fs.statSync(this.projectPath);
    if (!stats.isDirectory()) {
      throw new Error(`Путь не является директорией: ${this.projectPath}`);
    }

    console.log(`Анализ проекта: ${this.projectPath}`);

    // Сканирование структуры
    const structure = this.scanDirectory(this.projectPath);
    
    // Группировка по типам
    const directories = structure.filter(item => item.type === 'directory');
    const files = structure.filter(item => item.type === 'file');
    
    // Чтение важных файлов
    const importantFiles = {
      markdown: [],
      config: [],
      code: [],
      other: []
    };

    files.forEach(file => {
      const content = this.readFileContent(file.fullPath);
      
      if (file.extension === '.md') {
        importantFiles.markdown.push({
          path: file.path,
          name: file.name,
          content: content
        });
      } else if (['.json', '.yml', '.yaml', '.xml'].includes(file.extension)) {
        importantFiles.config.push({
          path: file.path,
          name: file.name,
          content: content
        });
      } else if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h'].includes(file.extension)) {
        importantFiles.code.push({
          path: file.path,
          name: file.name,
          content: content.substring(0, 5000) // Ограничение для кода
        });
      } else {
        importantFiles.other.push({
          path: file.path,
          name: file.name,
          content: content.substring(0, 2000)
        });
      }
    });

    // Поиск README и основных конфигурационных файлов
    const readmeFiles = files.filter(f => 
      f.name.toLowerCase().includes('readme') || 
      f.name.toLowerCase().includes('vision') ||
      f.name.toLowerCase().includes('roadmap')
    );

    const configFiles = files.filter(f => 
      ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js', 
       'dockerfile', '.env', 'requirements.txt', 'pom.xml', 'build.gradle'].includes(f.name.toLowerCase())
    );

    return {
      projectPath: this.projectPath,
      structure: {
        directories: directories.map(d => d.path),
        files: files.map(f => ({
          path: f.path,
          name: f.name,
          size: f.size,
          extension: f.extension
        }))
      },
      importantFiles: importantFiles,
      readmeFiles: readmeFiles.map(f => ({
        path: f.path,
        content: this.readFileContent(f.fullPath)
      })),
      configFiles: configFiles.map(f => ({
        path: f.path,
        content: this.readFileContent(f.fullPath)
      })),
      summary: {
        totalDirectories: directories.length,
        totalFiles: files.length,
        markdownFiles: importantFiles.markdown.length,
        configFiles: importantFiles.config.length,
        codeFiles: importantFiles.code.length
      }
    };
  }

  /**
   * Генерация текстового описания проекта для AI
   */
  generateDescription(analysis) {
    let description = `# Структура проекта\n\n`;
    description += `Путь: ${analysis.projectPath}\n\n`;
    description += `## Статистика\n`;
    description += `- Директорий: ${analysis.summary.totalDirectories}\n`;
    description += `- Файлов: ${analysis.summary.totalFiles}\n`;
    description += `- Markdown файлов: ${analysis.summary.markdownFiles}\n`;
    description += `- Конфигурационных файлов: ${analysis.summary.configFiles}\n`;
    description += `- Код файлов: ${analysis.summary.codeFiles}\n\n`;

    if (analysis.readmeFiles.length > 0) {
      description += `## README и документация\n\n`;
      analysis.readmeFiles.forEach(readme => {
        description += `### ${readme.path}\n\n`;
        description += `${readme.content}\n\n`;
      });
    }

    if (analysis.configFiles.length > 0) {
      description += `## Конфигурационные файлы\n\n`;
      analysis.configFiles.forEach(config => {
        description += `### ${config.path}\n\n`;
        description += `\`\`\`\n${config.content}\n\`\`\`\n\n`;
      });
    }

    description += `## Структура директорий\n\n`;
    description += `\`\`\`\n`;
    const dirs = analysis.structure.directories.sort();
    dirs.forEach(dir => {
      description += `${dir}/\n`;
    });
    description += `\`\`\`\n\n`;

    description += `## Основные файлы\n\n`;
    const mainFiles = analysis.structure.files
      .filter(f => !f.path.includes('node_modules'))
      .slice(0, 50); // Ограничение для размера
    
    mainFiles.forEach(file => {
      description += `- ${file.path} (${file.extension})\n`;
    });

    return description;
  }

  /**
   * Экспорт анализа в JSON
   */
  exportToJSON(outputPath) {
    const analysis = this.analyze();
    const json = JSON.stringify(analysis, null, 2);
    fs.writeFileSync(outputPath, json, 'utf8');
    return analysis;
  }
}

module.exports = ProjectAnalyzer;



