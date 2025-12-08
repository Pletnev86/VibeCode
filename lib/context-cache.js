/**
 * Context Cache - кэш для контекста проекта
 * 
 * Этот модуль отвечает за:
 * - Кэширование контекста в памяти (быстрый доступ)
 * - Сохранение контекста в файл (персистентность)
 * - Использование SQL для остальных данных
 * - Оптимизацию работы с контекстом
 */

const fs = require('fs');
const path = require('path');
const KnowledgeBase = require('./knowledge-base');
const { getLogger } = require('./logger');

const logger = getLogger();

class ContextCache {
  constructor(projectRoot = null, knowledgeBase = null) {
    this.projectRoot = projectRoot || this.findProjectRoot();
    this.knowledgeBase = knowledgeBase;
    
    // Кэш в памяти (быстрый доступ)
    this.memoryCache = {
      projectStructure: null,
      projectStructureTime: null,
      vision: null,
      visionTime: null,
      roadmap: null,
      roadmapTime: null,
      rules: null,
      rulesTime: null
    };
    
    // TTL для кэша (в миллисекундах)
    this.cacheTTL = {
      projectStructure: 5 * 60 * 1000, // 5 минут
      vision: 10 * 60 * 1000, // 10 минут
      roadmap: 10 * 60 * 1000, // 10 минут
      rules: 15 * 60 * 1000 // 15 минут
    };
    
    // Путь к файлу кэша
    this.cacheFilePath = path.join(this.projectRoot, 'cache', 'context-cache.json');
    this.initCacheFile();
  }

  /**
   * Поиск корня проекта
   */
  findProjectRoot() {
    let currentPath = process.cwd();
    const maxDepth = 10;
    let depth = 0;

    while (depth < maxDepth) {
      if (fs.existsSync(path.join(currentPath, 'package.json'))) {
        return currentPath;
      }
      const parent = path.dirname(currentPath);
      if (parent === currentPath) break;
      currentPath = parent;
      depth++;
    }

    return process.cwd();
  }

  /**
   * Инициализация файла кэша
   */
  initCacheFile() {
    const cacheDir = path.dirname(this.cacheFilePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Загружаем кэш из файла если существует
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const fileCache = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
        // Восстанавливаем только не устаревшие данные
        const now = Date.now();
        for (const key in fileCache) {
          if (fileCache[key] && fileCache[key].data && fileCache[key].timestamp) {
            const age = now - fileCache[key].timestamp;
            const ttl = this.cacheTTL[key] || Infinity;
            if (age < ttl) {
              this.memoryCache[key] = fileCache[key].data;
              this.memoryCache[`${key}Time`] = fileCache[key].timestamp;
            }
          }
        }
        logger.info('Кэш контекста загружен из файла');
      } catch (error) {
        logger.warn('Ошибка загрузки кэша из файла', null, error);
      }
    }
  }

  /**
   * Сохранение кэша в файл
   */
  saveCacheToFile() {
    try {
      const cacheData = {};
      for (const key in this.memoryCache) {
        if (key.endsWith('Time')) continue;
        const timeKey = `${key}Time`;
        if (this.memoryCache[key] && this.memoryCache[timeKey]) {
          cacheData[key] = {
            data: this.memoryCache[key],
            timestamp: this.memoryCache[timeKey]
          };
        }
      }
      
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (error) {
      logger.warn('Ошибка сохранения кэша в файл', null, error);
    }
  }

  /**
   * Получение структуры проекта (с кэшированием)
   */
  getProjectStructure(forceReload = false) {
    if (!forceReload && this.memoryCache.projectStructure) {
      const age = Date.now() - (this.memoryCache.projectStructureTime || 0);
      if (age < this.cacheTTL.projectStructure) {
        return this.memoryCache.projectStructure;
      }
    }

    // Загружаем из SQL если доступна БД
    if (this.knowledgeBase && this.knowledgeBase.available && !forceReload) {
      try {
        const docs = this.knowledgeBase.getDocumentation(null, 'config', 1);
        if (docs.length > 0) {
          // Можно использовать данные из БД
        }
      } catch (error) {
        // Игнорируем ошибки БД
      }
    }

    // Анализируем структуру проекта
    const structure = this.analyzeProjectStructure();
    
    // Сохраняем в кэш
    this.memoryCache.projectStructure = structure;
    this.memoryCache.projectStructureTime = Date.now();
    this.saveCacheToFile();
    
    return structure;
  }

  /**
   * Получение Vision (с кэшированием)
   */
  getVision(forceReload = false) {
    if (!forceReload && this.memoryCache.vision) {
      const age = Date.now() - (this.memoryCache.visionTime || 0);
      if (age < this.cacheTTL.vision) {
        return this.memoryCache.vision;
      }
    }

    // Загружаем из файла
    const visionPaths = [
      path.join(this.projectRoot, 'Vision.md'),
      path.join(this.projectRoot, 'docs/Vision.md'),
      path.join(this.projectRoot, 'docs/ru/Vision.md')
    ];

    for (const visionPath of visionPaths) {
      if (fs.existsSync(visionPath)) {
        try {
          const content = fs.readFileSync(visionPath, 'utf8');
          this.memoryCache.vision = content;
          this.memoryCache.visionTime = Date.now();
          this.saveCacheToFile();
          
          // Сохраняем в БД
          if (this.knowledgeBase && this.knowledgeBase.available) {
            this.knowledgeBase.saveDocumentation(visionPath, content, {
              contentType: 'markdown',
              category: 'vision'
            });
          }
          
          return content;
        } catch (error) {
          logger.warn(`Ошибка чтения Vision: ${visionPath}`, null, error);
        }
      }
    }

    return null;
  }

  /**
   * Получение Roadmap (с кэшированием)
   */
  getRoadmap(forceReload = false) {
    if (!forceReload && this.memoryCache.roadmap) {
      const age = Date.now() - (this.memoryCache.roadmapTime || 0);
      if (age < this.cacheTTL.roadmap) {
        return this.memoryCache.roadmap;
      }
    }

    // Загружаем из файла
    const roadmapPaths = [
      path.join(this.projectRoot, 'Roadmap.md'),
      path.join(this.projectRoot, 'ROADMAP_DORABOTKA.md'),
      path.join(this.projectRoot, 'docs/Roadmap.md'),
      path.join(this.projectRoot, 'docs/ru/Roadmap.md')
    ];

    for (const roadmapPath of roadmapPaths) {
      if (fs.existsSync(roadmapPath)) {
        try {
          const content = fs.readFileSync(roadmapPath, 'utf8');
          this.memoryCache.roadmap = content;
          this.memoryCache.roadmapTime = Date.now();
          this.saveCacheToFile();
          
          // Сохраняем в БД
          if (this.knowledgeBase && this.knowledgeBase.available) {
            this.knowledgeBase.saveDocumentation(roadmapPath, content, {
              contentType: 'markdown',
              category: 'roadmap'
            });
          }
          
          return content;
        } catch (error) {
          logger.warn(`Ошибка чтения Roadmap: ${roadmapPath}`, null, error);
        }
      }
    }

    return null;
  }

  /**
   * Анализ структуры проекта
   */
  analyzeProjectStructure() {
    const structure = {
      directories: [],
      files: [],
      mainFiles: []
    };

    try {
      const srcPath = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcPath)) {
        this.scanDirectory(srcPath, structure, 0, 2); // Максимум 2 уровня вложенности
      }
    } catch (error) {
      logger.warn('Ошибка анализа структуры проекта', null, error);
    }

    return structure;
  }

  /**
   * Сканирование директории
   */
  scanDirectory(dirPath, structure, depth, maxDepth) {
    if (depth >= maxDepth) return;

    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(this.projectRoot, fullPath);
        
        // Пропускаем скрытые файлы и node_modules
        if (item.name.startsWith('.') || item.name === 'node_modules') {
          continue;
        }

        if (item.isDirectory()) {
          structure.directories.push(relativePath);
          this.scanDirectory(fullPath, structure, depth + 1, maxDepth);
        } else if (item.isFile()) {
          structure.files.push(relativePath);
          
          // Определяем основные файлы
          if (item.name === 'main.js' || item.name === 'index.js' || 
              item.name === 'app.js' || item.name === 'index.html') {
            structure.mainFiles.push(relativePath);
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки доступа
    }
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    this.memoryCache = {
      projectStructure: null,
      projectStructureTime: null,
      vision: null,
      visionTime: null,
      roadmap: null,
      roadmapTime: null,
      rules: null,
      rulesTime: null
    };
    
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        fs.unlinkSync(this.cacheFilePath);
      } catch (error) {
        logger.warn('Ошибка удаления файла кэша', null, error);
      }
    }
  }
}

module.exports = ContextCache;


