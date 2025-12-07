/**
 * Rules Manager - система правил проекта (как .cursorrules в Cursor)
 * 
 * Этот модуль отвечает за:
 * - Чтение правил из файлов (.cursorrules, RULES.md, rules.txt)
 * - Загрузку правил из Vision.md и Roadmap.md
 * - Сохранение правил в БД
 * - Применение правил при генерации кода
 * - Понимание контекста проекта
 */

const fs = require('fs');
const path = require('path');
const KnowledgeBase = require('./knowledge-base');
const { getLogger } = require('./logger');

const logger = getLogger();

class RulesManager {
  constructor(projectRoot = null, knowledgeBase = null) {
    this.projectRoot = projectRoot || this.findProjectRoot();
    this.knowledgeBase = knowledgeBase;
    
    // Файлы с правилами
    this.rulesFiles = [
      '.cursorrules',
      'RULES.md',
      'rules.txt',
      'docs/RULES.md',
      'docs/ru/RULES.md'
    ];
    
    // Правила в памяти
    this.rules = [];
    this.visionRules = null;
    this.roadmapRules = null;
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
   * Загрузка всех правил
   */
  async loadAllRules() {
    this.rules = [];
    
    // Загружаем правила из файлов
    for (const rulesFile of this.rulesFiles) {
      const fullPath = path.join(this.projectRoot, rulesFile);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileRules = this.parseRules(content, rulesFile);
          this.rules.push(...fileRules);
          logger.info(`Правила загружены из ${rulesFile}: ${fileRules.length} правил`);
        } catch (error) {
          logger.warn(`Ошибка загрузки правил из ${rulesFile}`, null, error);
        }
      }
    }
    
    // Загружаем правила из Vision.md
    await this.loadVisionRules();
    
    // Загружаем правила из Roadmap.md
    await this.loadRoadmapRules();
    
    // Загружаем правила из БД
    if (this.knowledgeBase && this.knowledgeBase.available) {
      const dbRules = this.knowledgeBase.getRules(true);
      this.rules.push(...dbRules.map(rule => ({
        name: rule.rule_name,
        content: rule.rule_content,
        source: rule.source_file || 'database',
        category: rule.category,
        priority: rule.priority
      })));
    }
    
    // Сортируем по приоритету
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    logger.info(`Всего правил загружено: ${this.rules.length}`);
    return this.rules;
  }

  /**
   * Парсинг правил из текста
   */
  parseRules(content, sourceFile) {
    const rules = [];
    const lines = content.split('\n');
    let currentRule = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Заголовок правила (## Правило или # Правило)
      if (line.startsWith('##') || line.startsWith('# ')) {
        if (currentRule) {
          rules.push(currentRule);
        }
        currentRule = {
          name: line.replace(/^#+\s*/, ''),
          content: '',
          source: sourceFile,
          category: this.detectCategory(sourceFile),
          priority: 0
        };
      } else if (line.startsWith('-') || line.startsWith('*')) {
        // Пункт правила
        if (currentRule) {
          currentRule.content += line + '\n';
        }
      } else if (line.length > 0 && currentRule) {
        // Текст правила
        currentRule.content += line + '\n';
      }
    }
    
    if (currentRule) {
      rules.push(currentRule);
    }
    
    // Если не найдено структурированных правил, создаем одно правило из всего содержимого
    if (rules.length === 0 && content.trim().length > 0) {
      rules.push({
        name: path.basename(sourceFile),
        content: content,
        source: sourceFile,
        category: this.detectCategory(sourceFile),
        priority: 0
      });
    }
    
    return rules;
  }

  /**
   * Загрузка правил из Vision.md
   */
  async loadVisionRules() {
    const visionPaths = [
      path.join(this.projectRoot, 'Vision.md'),
      path.join(this.projectRoot, 'docs/Vision.md'),
      path.join(this.projectRoot, 'docs/ru/Vision.md')
    ];
    
    for (const visionPath of visionPaths) {
      if (fs.existsSync(visionPath)) {
        try {
          const content = fs.readFileSync(visionPath, 'utf8');
          this.visionRules = content;
          
          // Извлекаем правила из Vision
          const visionRules = this.extractRulesFromVision(content);
          this.rules.push(...visionRules);
          
          logger.info(`Vision.md загружен: ${visionPath}`);
          break;
        } catch (error) {
          logger.warn(`Ошибка загрузки Vision.md: ${visionPath}`, null, error);
        }
      }
    }
  }

  /**
   * Загрузка правил из Roadmap.md
   */
  async loadRoadmapRules() {
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
          this.roadmapRules = content;
          
          // Извлекаем правила из Roadmap
          const roadmapRules = this.extractRulesFromRoadmap(content);
          this.rules.push(...roadmapRules);
          
          logger.info(`Roadmap.md загружен: ${roadmapPath}`);
          break;
        } catch (error) {
          logger.warn(`Ошибка загрузки Roadmap.md: ${roadmapPath}`, null, error);
        }
      }
    }
  }

  /**
   * Извлечение правил из Vision.md
   */
  extractRulesFromVision(content) {
    const rules = [];
    
    // Ищем секции с правилами, принципами, требованиями
    const rulePatterns = [
      /##\s*(?:Правила|Rules|Принципы|Principles|Требования|Requirements)[\s\S]*?(?=##|$)/gi,
      /###\s*(?:Правило|Rule|Принцип|Principle)[\s\S]*?(?=###|##|$)/gi
    ];
    
    for (const pattern of rulePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        rules.push({
          name: 'Vision Rule',
          content: match[0],
          source: 'Vision.md',
          category: 'vision',
          priority: 1
        });
      }
    }
    
    // Если не найдено структурированных правил, используем весь Vision как правило
    if (rules.length === 0) {
      rules.push({
        name: 'Vision',
        content: content,
        source: 'Vision.md',
        category: 'vision',
        priority: 2
      });
    }
    
    return rules;
  }

  /**
   * Извлечение правил из Roadmap.md
   */
  extractRulesFromRoadmap(content) {
    const rules = [];
    
    // Ищем задачи и этапы
    const taskPattern = /(?:##|###)\s*(?:Задача|Task|Этап|Stage|Phase)[\s\S]*?(?=##|###|$)/gi;
    const matches = content.matchAll(taskPattern);
    
    for (const match of matches) {
      rules.push({
        name: 'Roadmap Task',
        content: match[0],
        source: 'Roadmap.md',
        category: 'roadmap',
        priority: 1
      });
    }
    
    // Если не найдено задач, используем весь Roadmap
    if (rules.length === 0) {
      rules.push({
        name: 'Roadmap',
        content: content,
        source: 'Roadmap.md',
        category: 'roadmap',
        priority: 1
      });
    }
    
    return rules;
  }

  /**
   * Получение всех правил в виде текста для промпта
   */
  getRulesForPrompt(category = null) {
    let rulesToUse = this.rules;
    
    if (category) {
      rulesToUse = this.rules.filter(rule => rule.category === category);
    }
    
    if (rulesToUse.length === 0) {
      return '';
    }
    
    let rulesText = '\n## Правила проекта:\n\n';
    
    for (const rule of rulesToUse) {
      rulesText += `### ${rule.name} (из ${rule.source}):\n`;
      rulesText += rule.content + '\n\n';
    }
    
    return rulesText;
  }

  /**
   * Определение категории по имени файла
   */
  detectCategory(filePath) {
    if (filePath.includes('Vision') || filePath.includes('vision')) {
      return 'vision';
    } else if (filePath.includes('Roadmap') || filePath.includes('roadmap')) {
      return 'roadmap';
    } else if (filePath.includes('cursorrules')) {
      return 'cursor';
    } else if (filePath.includes('RULES') || filePath.includes('rules')) {
      return 'rules';
    }
    return 'general';
  }

  /**
   * Сохранение правила в БД
   */
  saveRuleToDB(ruleName, ruleContent, sourceFile, category, priority = 0) {
    if (this.knowledgeBase && this.knowledgeBase.available) {
      try {
        this.knowledgeBase.saveRule(ruleName, ruleContent, sourceFile, category, priority);
        logger.info(`Правило сохранено в БД: ${ruleName}`);
      } catch (error) {
        logger.warn('Ошибка сохранения правила в БД', null, error);
      }
    }
  }
}

module.exports = RulesManager;

