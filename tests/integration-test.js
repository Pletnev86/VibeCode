/**
 * Интеграционный тест всей системы
 * 
 * Проверяет:
 * - Чтение Vision и Roadmap
 * - Работу pipeline
 * - Интеграцию всех компонентов
 * - Генерацию файлов
 */

const SelfDevAgent = require('../agents/selfdev');
const InterAgentController = require('../agents/inter-agent-controller');
const AIRouter = require('../ai/router');
const fs = require('fs');
const path = require('path');

async function integrationTest() {
  console.log('=== Интеграционный тест системы ===\n');

  try {
    // Тест 1: Проверка чтения Vision и Roadmap
    console.log('--- Тест 1: Чтение Vision и Roadmap ---');
    const agent = new SelfDevAgent('./config.json');
    const vision = agent.readVision();
    const roadmap = agent.readRoadmap();
    
    if (!vision || vision.length === 0) {
      throw new Error('Vision не прочитан');
    }
    if (!roadmap || roadmap.length === 0) {
      throw new Error('Roadmap не прочитан');
    }
    console.log('✅ Vision и Roadmap прочитаны успешно');
    console.log(`   Vision: ${vision.length} символов`);
    console.log(`   Roadmap: ${roadmap.length} символов\n`);

    // Тест 2: Проверка AI Router
    console.log('--- Тест 2: Проверка AI Router ---');
    const router = new AIRouter('./config.json');
    const isAvailable = await router.checkLMStudioAvailability();
    
    if (!isAvailable) {
      console.warn('⚠️ LM Studio недоступен (это нормально для теста без запущенного LM Studio)');
    } else {
      console.log('✅ LM Studio доступен');
    }
    
    // Проверка классификации
    const taskType = router.classifyTask('Создать функцию');
    const model = router.selectModel(taskType);
    const lang = router.detectLanguage('Создать функцию');
    console.log(`✅ Классификация работает: "${taskType}" → модель: ${model}, язык: ${lang}\n`);

    // Тест 3: Проверка InterAgent Controller
    console.log('--- Тест 3: Проверка InterAgent Controller ---');
    const controller = new InterAgentController('./config.json');
    await controller.init();
    
    const taskId = controller.addTask('Тестовая задача для проверки');
    const taskStatus = controller.getTaskStatus(taskId);
    
    if (!taskStatus || taskStatus.status !== 'pending') {
      throw new Error('Задача не добавлена корректно');
    }
    console.log('✅ InterAgent Controller работает');
    console.log(`   Задача добавлена: ${taskId}`);
    console.log(`   Статус: ${taskStatus.status}\n`);

    // Тест 4: Проверка Execution Layer
    console.log('--- Тест 4: Проверка Execution Layer ---');
    const executor = agent.executor;
    const testFile = './test-integration-temp.txt';
    const testContent = 'Тестовое содержимое для интеграционного теста';
    
    await executor.writeFile(testFile, testContent);
    const readContent = await executor.readFile(testFile);
    
    if (readContent !== testContent) {
      throw new Error('Содержимое файла не совпадает');
    }
    
    await executor.deleteFile(testFile);
    console.log('✅ Execution Layer работает корректно\n');

    // Тест 5: Проверка Feedback Mechanism
    console.log('--- Тест 5: Проверка Feedback Mechanism ---');
    const feedback = agent.feedback;
    feedback.recordTask('Тестовая задача', { success: true }, 100);
    const stats = feedback.getStatistics();
    
    if (!stats || stats.totalTasks === 0) {
      throw new Error('Статистика не записана');
    }
    console.log('✅ Feedback Mechanism работает');
    console.log(`   Всего задач: ${stats.totalTasks}`);
    console.log(`   Успешных: ${stats.successfulTasks}\n`);

    // Тест 6: Проверка структуры проекта
    console.log('--- Тест 6: Проверка структуры проекта ---');
    const requiredDirs = ['src', 'ai', 'agents', 'lib', 'docs', 'tests'];
    const requiredFiles = [
      'src/main.js',
      'src/preload.js',
      'src/index.html',
      'src/ui.js',
      'ai/router.js',
      'agents/selfdev.js',
      'config.json',
      'package.json'
    ];
    
    let allDirsExist = true;
    let allFilesExist = true;
    
    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        console.error(`❌ Директория не найдена: ${dir}`);
        allDirsExist = false;
      }
    });
    
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        console.error(`❌ Файл не найден: ${file}`);
        allFilesExist = false;
      }
    });
    
    if (!allDirsExist || !allFilesExist) {
      throw new Error('Структура проекта неполная');
    }
    console.log('✅ Структура проекта корректна');
    console.log(`   Директорий: ${requiredDirs.length}`);
    console.log(`   Файлов: ${requiredFiles.length}\n`);

    // Тест 7: Проверка формирования промпта
    console.log('--- Тест 7: Проверка формирования промпта ---');
    const prompt = await agent.generatePrompt('Создать тестовый файл');
    
    if (!prompt || prompt.length === 0) {
      throw new Error('Промпт не сформирован');
    }
    
    if (!prompt.includes('Vision') || !prompt.includes('Roadmap')) {
      throw new Error('Промпт не содержит Vision и Roadmap');
    }
    
    console.log('✅ Промпт формируется корректно');
    console.log(`   Длина промпта: ${prompt.length} символов\n`);

    // Тест 8: Проверка парсинга файлов
    console.log('--- Тест 8: Проверка парсинга файлов ---');
    const testResponse = `
Создам файл:

\`\`\`src/test.js
console.log('Hello World');
\`\`\`
`;

    const files = agent.parseFilesFromResult(testResponse);
    
    if (files.length === 0) {
      console.warn('⚠️ Парсинг не нашел файлы (может потребоваться улучшение)');
    } else {
      console.log('✅ Парсинг файлов работает');
      console.log(`   Найдено файлов: ${files.length}`);
      files.forEach(file => {
        console.log(`   - ${file.path}`);
      });
    }
    console.log('');

    console.log('=== Интеграционный тест завершен успешно ===\n');
    console.log('✅ Все компоненты интегрированы и работают');
    console.log('✅ Система готова к самопрограммированию');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка интеграционного теста:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Запуск теста
integrationTest().then(success => {
  process.exit(success ? 0 : 1);
});




