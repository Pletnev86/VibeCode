/**
 * Template Selector - выбор шаблона на основе задачи
 * 
 * Этот модуль отвечает за:
 * - Анализ задачи пользователя
 * - Выбор подходящего шаблона
 * - Загрузку инструкций по запуску
 * - Предоставление шаблона для генерации кода
 */

const fs = require('fs');
const path = require('path');

class TemplateSelector {
  constructor(templatesDir = './templates') {
    this.templatesDir = path.resolve(templatesDir);
    this.templates = this.loadTemplates();
  }

  /**
   * Загрузка всех шаблонов
   */
  loadTemplates() {
    const templates = {
      apps: [],
      websites: [],
      scripts: []
    };

    try {
      // Загружаем шаблоны приложений
      const appsDir = path.join(this.templatesDir, 'apps');
      if (fs.existsSync(appsDir)) {
        const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const appDir of appDirs) {
          const templatePath = path.join(appsDir, appDir, 'template.json');
          if (fs.existsSync(templatePath)) {
            try {
              const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
              template.path = path.join(appsDir, appDir);
              templates.apps.push(template);
            } catch (error) {
              console.warn(`Ошибка загрузки шаблона ${appDir}:`, error.message);
            }
          }
        }
      }

      // Загружаем шаблоны веб-сайтов
      const websitesDir = path.join(this.templatesDir, 'websites');
      if (fs.existsSync(websitesDir)) {
        const websiteDirs = fs.readdirSync(websitesDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const websiteDir of websiteDirs) {
          const templatePath = path.join(websitesDir, websiteDir, 'template.json');
          if (fs.existsSync(templatePath)) {
            try {
              const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
              template.path = path.join(websitesDir, websiteDir);
              templates.websites.push(template);
            } catch (error) {
              console.warn(`Ошибка загрузки шаблона ${websiteDir}:`, error.message);
            }
          }
        }
      }

      // Загружаем шаблоны скриптов
      const scriptsDir = path.join(this.templatesDir, 'scripts');
      if (fs.existsSync(scriptsDir)) {
        const scriptDirs = fs.readdirSync(scriptsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const scriptDir of scriptDirs) {
          const templatePath = path.join(scriptsDir, scriptDir, 'template.json');
          if (fs.existsSync(templatePath)) {
            try {
              const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
              template.path = path.join(scriptsDir, scriptDir);
              templates.scripts.push(template);
            } catch (error) {
              console.warn(`Ошибка загрузки шаблона ${scriptDir}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Ошибка загрузки шаблонов:', error.message);
    }

    return templates;
  }

  /**
   * Выбор шаблона на основе задачи
   */
  selectTemplate(task) {
    if (!task) return null;

    const taskLower = task.toLowerCase();

    // Ключевые слова для определения типа проекта
    const appKeywords = ['приложение', 'app', 'application', 'desktop', 'электрон', 'electron', 'node.js', 'nodejs'];
    const websiteKeywords = ['сайт', 'website', 'веб', 'web', 'html', 'страница', 'page', 'react', 'vue', 'angular'];
    const scriptKeywords = ['скрипт', 'script', 'утилита', 'utility', 'tool', 'инструмент'];

    // Определяем тип проекта
    let projectType = null;
    let selectedTemplate = null;

    if (appKeywords.some(keyword => taskLower.includes(keyword))) {
      projectType = 'app';
      // Выбираем первый доступный шаблон приложения
      if (this.templates.apps.length > 0) {
        selectedTemplate = this.templates.apps[0];
      }
    } else if (websiteKeywords.some(keyword => taskLower.includes(keyword))) {
      projectType = 'website';
      // Выбираем первый доступный шаблон веб-сайта
      if (this.templates.websites.length > 0) {
        selectedTemplate = this.templates.websites[0];
      }
    } else if (scriptKeywords.some(keyword => taskLower.includes(keyword))) {
      projectType = 'script';
      if (this.templates.scripts.length > 0) {
        selectedTemplate = this.templates.scripts[0];
      }
    }

    return selectedTemplate;
  }

  /**
   * Получение инструкций по запуску для шаблона
   */
  getInstructions(template) {
    if (!template || !template.path) return null;

    const instructionsPath = path.join(template.path, 'instructions.md');
    if (fs.existsSync(instructionsPath)) {
      try {
        return fs.readFileSync(instructionsPath, 'utf8');
      } catch (error) {
        console.warn('Ошибка чтения инструкций:', error.message);
        return null;
      }
    }

    return null;
  }

  /**
   * Получение всех доступных шаблонов
   */
  getAllTemplates() {
    return {
      apps: this.templates.apps,
      websites: this.templates.websites,
      scripts: this.templates.scripts
    };
  }
}

module.exports = TemplateSelector;

