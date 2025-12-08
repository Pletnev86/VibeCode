/**
 * State Manager - сохранение и восстановление состояния Self-Build
 * 
 * Этот модуль отвечает за:
 * - Сохранение прогресса Self-Build
 * - Восстановление состояния при перезапуске
 * - Отслеживание этапов генерации
 * - Сохранение сгенерированных файлов
 */

const fs = require('fs');
const path = require('path');
const { getLogger } = require('./logger');

const logger = getLogger();

class StateManager {
  constructor(projectRoot = null) {
    this.projectRoot = projectRoot || this.findProjectRoot();
    this.stateFilePath = path.join(this.projectRoot, 'cache', 'selfbuild-state.json');
    this.initStateFile();
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
   * Инициализация файла состояния
   */
  initStateFile() {
    const cacheDir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * Сохранение состояния Self-Build
   */
  saveState(state) {
    try {
      const stateData = {
        ...state,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      fs.writeFileSync(this.stateFilePath, JSON.stringify(stateData, null, 2), 'utf8');
      logger.info('Состояние Self-Build сохранено', { stateFilePath: this.stateFilePath });
      return true;
    } catch (error) {
      logger.error('Ошибка сохранения состояния Self-Build', error);
      return false;
    }
  }

  /**
   * Загрузка состояния Self-Build
   */
  loadState() {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return null;
      }

      const stateData = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
      
      // Проверяем актуальность состояния (не старше 24 часов)
      const stateAge = Date.now() - (stateData.timestamp || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа
      
      if (stateAge > maxAge) {
        logger.warn('Состояние Self-Build устарело, очищаем');
        this.clearState();
        return null;
      }

      logger.info('Состояние Self-Build загружено', { 
        stage: stateData.currentStage,
        filesGenerated: stateData.filesGenerated?.length || 0
      });
      
      return stateData;
    } catch (error) {
      logger.error('Ошибка загрузки состояния Self-Build', error);
      return null;
    }
  }

  /**
   * Очистка состояния
   */
  clearState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        fs.unlinkSync(this.stateFilePath);
        logger.info('Состояние Self-Build очищено');
      }
      return true;
    } catch (error) {
      logger.error('Ошибка очистки состояния', error);
      return false;
    }
  }

  /**
   * Обновление текущего этапа
   */
  updateStage(stage, progress = null) {
    const currentState = this.loadState() || {};
    currentState.currentStage = stage;
    if (progress !== null) {
      currentState.progress = progress;
    }
    this.saveState(currentState);
  }

  /**
   * Добавление сгенерированного файла
   */
  addGeneratedFile(filePath, content = null) {
    const currentState = this.loadState() || {
      filesGenerated: [],
      filesSaved: []
    };
    
    if (!currentState.filesGenerated) {
      currentState.filesGenerated = [];
    }
    
    currentState.filesGenerated.push({
      path: filePath,
      timestamp: Date.now(),
      content: content ? content.substring(0, 1000) : null // Сохраняем только превью
    });
    
    this.saveState(currentState);
  }

  /**
   * Отметка файла как сохраненного
   */
  markFileSaved(filePath) {
    const currentState = this.loadState() || {
      filesGenerated: [],
      filesSaved: []
    };
    
    if (!currentState.filesSaved) {
      currentState.filesSaved = [];
    }
    
    if (!currentState.filesSaved.includes(filePath)) {
      currentState.filesSaved.push(filePath);
      this.saveState(currentState);
    }
  }

  /**
   * Получение списка несохраненных файлов
   */
  getUnsavedFiles() {
    const state = this.loadState();
    if (!state || !state.filesGenerated) {
      return [];
    }
    
    const saved = new Set(state.filesSaved || []);
    return state.filesGenerated
      .filter(file => !saved.has(file.path))
      .map(file => file.path);
  }
}

module.exports = StateManager;


