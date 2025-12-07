/**
 * Knowledge Base - база знаний на основе SQLite
 * 
 * Сохраняет:
 * - Запросы и ответы
 * - Оценки ответов
 * - Методы и решения
 * - Скрипты
 * 
 * При работе сначала ищет в БД, затем обращается к ИИ
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class KnowledgeBase {
  constructor(dbPath = './data/knowledge.db') {
    try {
      // Создаем директорию для БД если её нет
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Подключаемся к БД
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL'); // Для лучшей производительности

      // Инициализируем схему
      this.initializeSchema();
      this.available = true;
    } catch (error) {
      console.error('❌ Ошибка инициализации базы знаний:', error.message);
      this.db = null;
      this.available = false;
      // Не пробрасываем ошибку, чтобы приложение могло работать без БД
    }
  }

  /**
   * Инициализация схемы БД
   */
  initializeSchema() {
    if (!this.available || !this.db) {
      return;
    }
    // Таблица запросов и ответов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_text TEXT NOT NULL,
        query_hash TEXT UNIQUE,
        language TEXT,
        task_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_id INTEGER NOT NULL,
        response_text TEXT NOT NULL,
        model_used TEXT,
        provider TEXT,
        tokens_used INTEGER,
        time_taken INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (query_id) REFERENCES queries(id)
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating IN (1, 2, 3, 4, 5)),
        is_good BOOLEAN DEFAULT 0,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (response_id) REFERENCES responses(id)
      );

      CREATE TABLE IF NOT EXISTS methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        code TEXT,
        category TEXT,
        tags TEXT,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS solutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        method_id INTEGER,
        category TEXT,
        tags TEXT,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (method_id) REFERENCES methods(id)
      );

      CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        code TEXT NOT NULL,
        language TEXT,
        category TEXT,
        tags TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documentation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT,
        category TEXT,
        tags TEXT,
        version TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        file TEXT,
        line INTEGER,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL,
        rule_content TEXT NOT NULL,
        source_file TEXT,
        category TEXT,
        priority INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_query_hash ON queries(query_hash);
      CREATE INDEX IF NOT EXISTS idx_query_text ON queries(query_text);
      CREATE INDEX IF NOT EXISTS idx_response_query ON responses(query_id);
      CREATE INDEX IF NOT EXISTS idx_rating_response ON ratings(response_id);
      CREATE INDEX IF NOT EXISTS idx_rating_good ON ratings(is_good);
      CREATE INDEX IF NOT EXISTS idx_method_category ON methods(category);
      CREATE INDEX IF NOT EXISTS idx_solution_problem ON solutions(problem);
      CREATE INDEX IF NOT EXISTS idx_script_name ON scripts(name);
      CREATE INDEX IF NOT EXISTS idx_doc_path ON documentation(file_path);
      CREATE INDEX IF NOT EXISTS idx_doc_category ON documentation(category);
      CREATE INDEX IF NOT EXISTS idx_log_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_log_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_rule_name ON project_rules(rule_name);
      CREATE INDEX IF NOT EXISTS idx_rule_enabled ON project_rules(enabled);
    `);
  }

  /**
   * Поиск похожих запросов в БД
   */
  searchSimilarQueries(queryText, limit = 5) {
    if (!this.available || !this.db) {
      return [];
    }
    const queryHash = this.hashQuery(queryText);
    
    // Сначала ищем точное совпадение по хешу
    const exactMatch = this.db.prepare(`
      SELECT q.*, r.response_text, r.model_used, r.provider, 
             AVG(rat.rating) as avg_rating, COUNT(rat.id) as rating_count
      FROM queries q
      LEFT JOIN responses r ON q.id = r.query_id
      LEFT JOIN ratings rat ON r.id = rat.response_id
      WHERE q.query_hash = ?
      GROUP BY q.id, r.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(queryHash, limit);

    if (exactMatch.length > 0) {
      return exactMatch;
    }

    // Если точного совпадения нет, ищем похожие по тексту
    const similar = this.db.prepare(`
      SELECT q.*, r.response_text, r.model_used, r.provider,
             AVG(rat.rating) as avg_rating, COUNT(rat.id) as rating_count,
             CASE 
               WHEN q.query_text LIKE ? THEN 1
               WHEN q.query_text LIKE ? THEN 2
               ELSE 3
             END as relevance
      FROM queries q
      LEFT JOIN responses r ON q.id = r.query_id
      LEFT JOIN ratings rat ON r.id = rat.response_id
      WHERE q.query_text LIKE ? OR q.query_text LIKE ?
      GROUP BY q.id, r.id
      ORDER BY relevance, r.created_at DESC
      LIMIT ?
    `).all(
      `%${queryText}%`,
      `${queryText}%`,
      `%${queryText}%`,
      `${queryText}%`,
      limit
    );

    return similar;
  }

  /**
   * Поиск методов по ключевым словам
   */
  searchMethods(keywords, limit = 5) {
    if (!this.available || !this.db) {
      return [];
    }
    const searchTerm = `%${keywords}%`;
    return this.db.prepare(`
      SELECT * FROM methods
      WHERE title LIKE ? OR description LIKE ? OR tags LIKE ?
      ORDER BY usage_count DESC, success_rate DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit);
  }

  /**
   * Поиск решений по проблеме
   */
  searchSolutions(problem, limit = 5) {
    if (!this.available || !this.db) {
      return [];
    }
    const searchTerm = `%${problem}%`;
    return this.db.prepare(`
      SELECT * FROM solutions
      WHERE problem LIKE ? OR tags LIKE ?
      ORDER BY usage_count DESC, success_rate DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, limit);
  }

  /**
   * Поиск скриптов
   */
  searchScripts(keywords, limit = 5) {
    if (!this.available || !this.db) {
      return [];
    }
    const searchTerm = `%${keywords}%`;
    return this.db.prepare(`
      SELECT * FROM scripts
      WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?
      ORDER BY usage_count DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit);
  }

  /**
   * Сохранение запроса и ответа
   */
  saveQueryResponse(queryText, responseText, metadata = {}) {
    if (!this.available || !this.db) {
      console.warn('⚠️ База знаний недоступна, пропускаем сохранение');
      return { queryId: null, responseId: null };
    }
    const queryHash = this.hashQuery(queryText);
    
    // Сохраняем запрос
    const queryResult = this.db.prepare(`
      INSERT OR IGNORE INTO queries (query_text, query_hash, language, task_type)
      VALUES (?, ?, ?, ?)
    `).run(
      queryText,
      queryHash,
      metadata.language || null,
      metadata.taskType || null
    );

    // Получаем ID запроса
    let queryId;
    if (queryResult.lastInsertRowid === 0) {
      // Запрос уже существует, получаем его ID
      const existing = this.db.prepare('SELECT id FROM queries WHERE query_hash = ?').get(queryHash);
      queryId = existing.id;
    } else {
      queryId = queryResult.lastInsertRowid;
    }

    // Сохраняем ответ
    const responseResult = this.db.prepare(`
      INSERT INTO responses (query_id, response_text, model_used, provider, tokens_used, time_taken)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      queryId,
      responseText,
      metadata.model || null,
      metadata.provider || null,
      metadata.tokens || null,
      metadata.time || null
    );

    return {
      queryId,
      responseId: responseResult.lastInsertRowid
    };
  }

  /**
   * Сохранение оценки ответа
   */
  saveRating(responseId, rating, comment = null) {
    if (!this.available || !this.db) {
      console.warn('⚠️ База знаний недоступна, пропускаем сохранение оценки');
      return false;
    }
    const isGood = rating >= 4; // 4 или 5 = хороший ответ
    
    this.db.prepare(`
      INSERT INTO ratings (response_id, rating, is_good, comment)
      VALUES (?, ?, ?, ?)
    `).run(responseId, rating, isGood ? 1 : 0, comment);

    // Обновляем статистику ответа
    this.updateResponseStats(responseId);
  }

  /**
   * Обновление статистики ответа
   */
  updateResponseStats(responseId) {
    const stats = this.db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as count
      FROM ratings
      WHERE response_id = ?
    `).get(responseId);

    // Обновляем статистику в связанных методах/решениях если есть
    // (можно расширить в будущем)
  }

  /**
   * Сохранение метода
   */
  saveMethod(title, description, code, category = null, tags = null) {
    if (!this.available || !this.db) {
      console.warn('⚠️ База знаний недоступна, пропускаем сохранение метода');
      return false;
    }
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    
    this.db.prepare(`
      INSERT INTO methods (title, description, code, category, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, description, code, category, tagsStr);
  }

  /**
   * Сохранение решения
   */
  saveSolution(problem, solution, methodId = null, category = null, tags = null) {
    if (!this.available || !this.db) {
      console.warn('⚠️ База знаний недоступна, пропускаем сохранение решения');
      return false;
    }
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    
    this.db.prepare(`
      INSERT INTO solutions (problem, solution, method_id, category, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(problem, solution, methodId, category, tagsStr);
  }

  /**
   * Сохранение скрипта
   */
  saveScript(name, description, code, language = null, category = null, tags = null) {
    if (!this.available || !this.db) {
      console.warn('⚠️ База знаний недоступна, пропускаем сохранение скрипта');
      return false;
    }
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    
    this.db.prepare(`
      INSERT INTO scripts (name, description, code, language, category, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, description, code, language, category, tagsStr);
  }

  /**
   * Увеличение счетчика использования
   */
  incrementUsage(table, id) {
    this.db.prepare(`
      UPDATE ${table} 
      SET usage_count = usage_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  }

  /**
   * Получение лучших ответов (с хорошими оценками)
   */
  getBestResponses(limit = 10) {
    if (!this.available || !this.db) {
      return [];
    }
    return this.db.prepare(`
      SELECT q.query_text, r.response_text, r.model_used, r.provider,
             AVG(rat.rating) as avg_rating, COUNT(rat.id) as rating_count
      FROM queries q
      JOIN responses r ON q.id = r.query_id
      JOIN ratings rat ON r.id = rat.response_id
      WHERE rat.is_good = 1
      GROUP BY q.id, r.id
      ORDER BY avg_rating DESC, rating_count DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Хеширование запроса для быстрого поиска
   */
  hashQuery(text) {
    // Простой хеш на основе текста
    let hash = 0;
    const normalized = text.toLowerCase().trim();
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Сохранение документации в БД
   */
  saveDocumentation(filePath, content, metadata = {}) {
    if (!this.available || !this.db) {
      console.warn('⚠️ База знаний недоступна, пропускаем сохранение документации');
      return null;
    }

    const fileName = path.basename(filePath);
    const contentType = metadata.contentType || this.detectContentType(fileName);
    const category = metadata.category || this.detectCategory(filePath);

    const result = this.db.prepare(`
      INSERT OR REPLACE INTO documentation 
      (file_path, file_name, content, content_type, category, tags, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      filePath,
      fileName,
      content,
      contentType,
      category,
      metadata.tags ? JSON.stringify(metadata.tags) : null,
      metadata.version || null
    );

    return result.lastInsertRowid;
  }

  /**
   * Получение документации из БД
   */
  getDocumentation(filePath = null, category = null, limit = 50) {
    if (!this.available || !this.db) {
      return [];
    }

    if (filePath) {
      return this.db.prepare(`
        SELECT * FROM documentation 
        WHERE file_path = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(filePath, limit);
    } else if (category) {
      return this.db.prepare(`
        SELECT * FROM documentation 
        WHERE category = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(category, limit);
    } else {
      return this.db.prepare(`
        SELECT * FROM documentation 
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(limit);
    }
  }

  /**
   * Сохранение лога в БД
   */
  saveLog(level, message, file = null, line = null, data = null) {
    if (!this.available || !this.db) {
      return null;
    }

    const result = this.db.prepare(`
      INSERT INTO logs (level, message, file, line, data)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      level,
      message,
      file,
      line,
      data ? JSON.stringify(data) : null
    );

    return result.lastInsertRowid;
  }

  /**
   * Получение логов из БД
   */
  getLogs(level = null, limit = 100, startTime = null, endTime = null) {
    if (!this.available || !this.db) {
      return [];
    }

    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Сохранение правила проекта
   */
  saveRule(ruleName, ruleContent, sourceFile = null, category = null, priority = 0) {
    if (!this.available || !this.db) {
      return null;
    }

    const result = this.db.prepare(`
      INSERT OR REPLACE INTO project_rules 
      (rule_name, rule_content, source_file, category, priority, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(ruleName, ruleContent, sourceFile, category, priority);

    return result.lastInsertRowid;
  }

  /**
   * Получение правил проекта
   */
  getRules(enabled = true, category = null) {
    if (!this.available || !this.db) {
      return [];
    }

    if (category) {
      return this.db.prepare(`
        SELECT * FROM project_rules 
        WHERE enabled = ? AND category = ?
        ORDER BY priority DESC, updated_at DESC
      `).all(enabled ? 1 : 0, category);
    } else {
      return this.db.prepare(`
        SELECT * FROM project_rules 
        WHERE enabled = ?
        ORDER BY priority DESC, updated_at DESC
      `).all(enabled ? 1 : 0);
    }
  }

  /**
   * Определение типа контента по имени файла
   */
  detectContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const types = {
      '.md': 'markdown',
      '.txt': 'text',
      '.json': 'json',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.html': 'html',
      '.css': 'css',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return types[ext] || 'text';
  }

  /**
   * Определение категории по пути файла
   */
  detectCategory(filePath) {
    if (filePath.includes('docs/') || filePath.includes('documentation')) {
      return 'documentation';
    } else if (filePath.includes('README')) {
      return 'readme';
    } else if (filePath.includes('Roadmap') || filePath.includes('roadmap')) {
      return 'roadmap';
    } else if (filePath.includes('Vision') || filePath.includes('vision')) {
      return 'vision';
    } else if (filePath.includes('INSTRUKCIYA') || filePath.includes('instruction')) {
      return 'instruction';
    } else if (filePath.includes('config')) {
      return 'config';
    }
    return 'other';
  }

  /**
   * Закрытие соединения с БД
   */
  close() {
    if (this.available && this.db) {
      this.db.close();
    }
  }
}

module.exports = KnowledgeBase;

