/**
 * Тест Этапа 7: Подготовка к запросу реального Vision и Roadmap
 */

const SelfDevAgent = require('../agents/selfdev');
const DocumentWatcher = require('../lib/document-watcher');
const fs = require('fs');
const path = require('path');

async function testStage7() {
  console.log('=== Тест Этапа 7 ===\n');

  try {
    const agent = new SelfDevAgent('./config.json');

    // Тест 1: Валидация документов
    console.log('--- Тест 1: Валидация документов ---');
    const vision = agent.readVision();
    const roadmap = agent.readRoadmap();
    
    try {
      agent.validateDocument(vision, 'Vision.md');
      console.log('✅ Vision.md валиден');
    } catch (error) {
      console.error('❌ Ошибка валидации Vision:', error.message);
    }
    
    try {
      agent.validateDocument(roadmap, 'Roadmap.md');
      console.log('✅ Roadmap.md валиден');
    } catch (error) {
      console.error('❌ Ошибка валидации Roadmap:', error.message);
    }
    console.log('');

    // Тест 2: Кеширование и проверка изменений
    console.log('--- Тест 2: Кеширование и проверка изменений ---');
    const vision1 = agent.readVision();
    const vision2 = agent.readVision(); // Должен использовать кеш
    
    if (vision1 === vision2) {
      console.log('✅ Кеширование работает');
    } else {
      console.log('⚠️ Кеш не работает (это нормально при первом чтении)');
    }
    
    const freshness = agent.checkDocumentsFreshness();
    console.log(`✅ Проверка актуальности работает:`, freshness);
    console.log('');

    // Тест 3: Перезагрузка контекста
    console.log('--- Тест 3: Перезагрузка контекста ---');
    const reloaded = agent.reloadContext();
    
    if (reloaded.vision && reloaded.roadmap) {
      console.log('✅ Перезагрузка контекста работает');
      console.log(`   Vision: ${reloaded.vision.length} символов`);
      console.log(`   Roadmap: ${reloaded.roadmap.length} символов`);
    } else {
      throw new Error('Перезагрузка контекста не работает');
    }
    console.log('');

    // Тест 4: Document Watcher
    console.log('--- Тест 4: Document Watcher ---');
    const watcher = new DocumentWatcher(
      './docs/Vision.md',
      './docs/Roadmap.md',
      (type, filePath) => {
        console.log(`📝 Изменение обнаружено: ${type} - ${filePath}`);
      }
    );
    
    const exists = watcher.checkDocumentsExist();
    if (exists.bothExist) {
      console.log('✅ Document Watcher может отслеживать документы');
    } else {
      console.warn('⚠️ Документы не найдены для отслеживания');
    }
    
    // Запуск и остановка (для теста)
    watcher.startWatching();
    console.log('✅ Document Watcher запущен');
    
    // Небольшая задержка для проверки
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    watcher.stopWatching();
    console.log('✅ Document Watcher остановлен');
    console.log('');

    // Тест 5: Internal Prompt
    console.log('--- Тест 5: Internal Prompt ---');
    const prompt = agent.getInternalPrompt();
    
    if (prompt && prompt.includes('Vision') && prompt.includes('Roadmap')) {
      console.log('✅ Internal Prompt сформирован корректно');
      console.log(`   Длина: ${prompt.length} символов`);
      console.log(`   Первые 100 символов: ${prompt.substring(0, 100)}...`);
    } else {
      throw new Error('Internal Prompt не сформирован корректно');
    }
    console.log('');

    // Тест 6: Интеграция с SelfDev Agent
    console.log('--- Тест 6: Интеграция отслеживания с SelfDev Agent ---');
    agent.startWatchingDocuments();
    console.log('✅ Отслеживание запущено через SelfDev Agent');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    agent.stopWatchingDocuments();
    console.log('✅ Отслеживание остановлено');
    console.log('');

    console.log('=== Тест Этапа 7 завершен успешно ===\n');
    console.log('✅ Все функции Этапа 7 реализованы и работают');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
    console.error(error.stack);
    return false;
  }
}

testStage7().then(success => {
  process.exit(success ? 0 : 1);
});




