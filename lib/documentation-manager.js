/**
 * Documentation Manager - автоматическое сохранение документации в БД
 * 
 * Этот модуль отвечает за:
 * - Автоматическое сохранение документации в базу знаний
 * - Индексацию документации для быстрого поиска
 * - Загрузку документации из БД
 * - Синхронизацию документации с файлами
 */

const fs = require('fs');
const path = require('path');
const KnowledgeBase = require('./knowledge-base');
const { getLogger } = require('./logger');

const logger = getLogger();

class DocumentationManager {
  constructor(knowledgeBase = null) {
    this.knowledgeBase = knowledgeBase;
    if (!this.knowledgeBase) {
      try {
        this.knowledgeBase = new KnowledgeBase();
        if (!this.knowledgeBase.available) {
          this.knowledgeBase = null;
          logger.warn('База знаний недоступна для DocumentationManager');
        }
      } catch (error) {
        this.knowledgeBase = null;
        logger.warn('Не удалось инициализировать базу знаний для документации', null, error);
      }
    }
    
    // Файлы документации для отслеживания
    this.documentationFiles = [
      'README.md',
      'README.ru.md',
      'INSTRUKCIYA.txt',
      'Vision.md',
      'Roadmap.md',
      'ROADMAP_DORABOTKA.md',
      'docs/Vision.md',
      'docs/Roadmap.md',
      'docs/ru/Vision.md',
      'docs/ru/Roadmap.md'
    ];
  }

  /**
   * Сохранение документации из файла в БД
   */
  async saveDocumentationFromFile(filePath, metadata = {}) {
    if (!this.knowledgeBase || !this.knowledgeBase.available) {
      logger.warn('База знаний недоступна, пропускаем сохранение документации');
      return null;
    }

    try {
      const fullPath = path.resolve(filePath);
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Файл документации не найден: ${fullPath}`);
        return null;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const docId = this.knowledgeBase.saveDocumentation(fullPath, content, metadata);
      
      logger.info(`Документация сохранена в БД: ${filePath} (ID: ${docId})`);
      return docId;
    } catch (error) {
      logger.error('Ошибка сохранения документации в БД', error, { filePath });
      return null;
    }
  }

  /**
   * Индексация всех файлов документации
   */
  async indexAllDocumentation(projectRoot = null) {
    if (!this.knowledgeBase || !this.knowledgeBase.available) {
      return { processed: 0, errors: 0 };
    }

    const root = projectRoot || this.findProjectRoot();
    let processed = 0;
    let errors = 0;

    for (const docFile of this.documentationFiles) {
      const fullPath = path.join(root, docFile);
      if (fs.existsSync(fullPath)) {
        try {
          await this.saveDocumentationFromFile(fullPath);
          processed++;
        } catch (error) {
          logger.error(`Ошибка индексации документации: ${docFile}`, error);
          errors++;
        }
      }
    }

    logger.info(`Индексация документации завершена: обработано ${processed}, ошибок ${errors}`);
    return { processed, errors };
  }

  /**
   * Поиск документации в БД
   */
  searchDocumentation(query, category = null, limit = 10) {
    if (!this.knowledgeBase || !this.knowledgeBase.available) {
      return [];
    }

    try {
      const docs = this.knowledgeBase.getDocumentation(null, category, limit);
      
      // Простой поиск по содержимому
      if (query) {
        const queryLower = query.toLowerCase();
        return docs.filter(doc => 
          doc.content.toLowerCase().includes(queryLower) ||
          doc.file_name.toLowerCase().includes(queryLower) ||
          (doc.tags && doc.tags.toLowerCase().includes(queryLower))
        );
      }
      
      return docs;
    } catch (error) {
      logger.error('Ошибка поиска документации', error);
      return [];
    }
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
}

module.exports = DocumentationManager;


