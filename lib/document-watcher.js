/**
 * Document Watcher - отслеживание изменений в Vision и Roadmap
 * 
 * Этот модуль отвечает за:
 * - Мониторинг изменений в документах
 * - Автоматическую перезагрузку контекста
 * - Уведомления об изменениях
 */

const fs = require('fs');
const path = require('path');

class DocumentWatcher {
  constructor(visionPath, roadmapPath, onChangeCallback) {
    this.visionPath = path.resolve(visionPath);
    this.roadmapPath = path.resolve(roadmapPath);
    this.onChangeCallback = onChangeCallback;
    this.watchers = [];
    this.isWatching = false;
  }

  /**
   * Начало отслеживания изменений
   */
  startWatching() {
    if (this.isWatching) {
      return;
    }

    try {
      // Отслеживание Vision.md
      if (fs.existsSync(this.visionPath)) {
        fs.watchFile(this.visionPath, { interval: 1000 }, (curr, prev) => {
          if (curr.mtime !== prev.mtime) {
            this.handleChange('vision', this.visionPath);
          }
        });
        this.watchers.push({ type: 'vision', path: this.visionPath });
      }

      // Отслеживание Roadmap.md
      if (fs.existsSync(this.roadmapPath)) {
        fs.watchFile(this.roadmapPath, { interval: 1000 }, (curr, prev) => {
          if (curr.mtime !== prev.mtime) {
            this.handleChange('roadmap', this.roadmapPath);
          }
        });
        this.watchers.push({ type: 'roadmap', path: this.roadmapPath });
      }

      this.isWatching = true;
      console.log('✅ Document Watcher запущен');
    } catch (error) {
      console.error('Ошибка запуска Document Watcher:', error.message);
    }
  }

  /**
   * Остановка отслеживания
   */
  stopWatching() {
    this.watchers.forEach(({ type, watcher, path }) => {
      fs.unwatchFile(path || (type === 'vision' ? this.visionPath : this.roadmapPath));
    });
    this.watchers = [];
    this.isWatching = false;
    console.log('⏹️ Document Watcher остановлен');
  }

  /**
   * Обработка изменения документа
   */
  handleChange(type, filePath) {
    console.log(`📝 Обнаружено изменение в ${type}: ${filePath}`);
    
    if (this.onChangeCallback) {
      this.onChangeCallback(type, filePath);
    }
  }

  /**
   * Проверка существования документов
   */
  checkDocumentsExist() {
    return {
      visionExists: fs.existsSync(this.visionPath),
      roadmapExists: fs.existsSync(this.roadmapPath),
      bothExist: fs.existsSync(this.visionPath) && fs.existsSync(this.roadmapPath)
    };
  }
}

module.exports = DocumentWatcher;

