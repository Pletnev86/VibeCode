/**
 * Тестовый скрипт для проверки работы SelfDev Agent
 * 
 * Запуск: node agents/test-selfdev.js
 */

const SelfDevAgent = require('./selfdev');

async function testSelfDevAgent() {
  console.log('=== Тест SelfDev Agent ===\n');

  try {
    // Создание экземпляра агента
    const agent = new SelfDevAgent('./config.json');
    console.log('✅ SelfDev Agent создан успешно\n');

    // Тест чтения Vision и Roadmap
    console.log('--- Тест чтения Vision и Roadmap ---');
    try {
      const vision = agent.readVision();
      console.log('✅ Vision.md прочитан, длина:', vision.length, 'символов');
      
      const roadmap = agent.readRoadmap();
      console.log('✅ Roadmap.md прочитан, длина:', roadmap.length, 'символов\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест анализа проекта (если есть тестовый проект)
    console.log('--- Тест анализа проекта ---');
    try {
      // Пробуем проанализировать текущий проект
      const result = await agent.analyzeProject('.');
      console.log('✅ Проект проанализирован:');
      console.log('  - Директорий:', result.analysis.summary.totalDirectories);
      console.log('  - Файлов:', result.analysis.summary.totalFiles);
      console.log('  - Markdown файлов:', result.analysis.summary.markdownFiles);
      console.log('  - Конфигурационных файлов:', result.analysis.summary.configFiles);
      console.log('  - Код файлов:', result.analysis.summary.codeFiles);
      console.log('  - Описание сгенерировано, длина:', result.description.length, 'символов\n');
    } catch (error) {
      console.warn('⚠️ Ошибка анализа проекта (это нормально если нет проекта):', error.message);
    }

    // Тест формирования промпта
    console.log('--- Тест формирования промпта ---');
    try {
      const prompt = await agent.generatePrompt('Создать простой тестовый файл');
      console.log('✅ Промпт сформирован, длина:', prompt.length, 'символов');
      console.log('Первые 200 символов:', prompt.substring(0, 200) + '...\n');
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    // Тест парсинга файлов (симуляция)
    console.log('--- Тест парсинга файлов ---');
    const testResponse = `
Создам файл main.js:

\`\`\`src/main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });
  
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
\`\`\`

И файл index.html:

\`\`\`src/index.html
<!DOCTYPE html>
<html>
<head>
  <title>VibeCode</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
\`\`\`
`;

    try {
      const files = agent.parseFilesFromResult(testResponse);
      console.log('✅ Файлы распарсены:', files.length);
      files.forEach(file => {
        console.log(`  - ${file.path} (${file.content.length} символов)`);
      });
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }

    console.log('\n=== Тест завершен ===');
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск теста
testSelfDevAgent();



