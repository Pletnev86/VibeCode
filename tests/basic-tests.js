/**
 * Базовые тесты для проверки основных компонентов
 * 
 * Запуск: node tests/basic-tests.js
 */

const TestRunner = require('./test-runner');
const AIRouter = require('../ai/router');
const SelfDevAgent = require('../agents/selfdev');
const InterAgentController = require('../agents/inter-agent-controller');
const ExecutionLayer = require('../lib/execution-layer');
const FeedbackMechanism = require('../lib/feedback-mechanism');

const runner = new TestRunner();

// Тест 1: AI Router
runner.test('AI Router - инициализация', async () => {
  const router = new AIRouter('./config.json');
  if (!router) {
    throw new Error('Router не создан');
  }
});

runner.test('AI Router - определение языка', async () => {
  const router = new AIRouter('./config.json');
  const lang1 = router.detectLanguage('Создать функцию');
  const lang2 = router.detectLanguage('Create a function');
  
  if (lang1 !== 'ru' || lang2 !== 'en') {
    throw new Error('Неправильное определение языка');
  }
});

runner.test('AI Router - классификация задач', async () => {
  const router = new AIRouter('./config.json');
  const type1 = router.classifyTask('Создать функцию');
  const type2 = router.classifyTask('Объясни как работает');
  
  if (type1 !== 'code' || type2 !== 'explanation') {
    throw new Error('Неправильная классификация задач');
  }
});

// Тест 2: SelfDev Agent
runner.test('SelfDev Agent - инициализация', async () => {
  const agent = new SelfDevAgent('./config.json');
  if (!agent) {
    throw new Error('Agent не создан');
  }
});

runner.test('SelfDev Agent - чтение Vision', async () => {
  const agent = new SelfDevAgent('./config.json');
  const vision = agent.readVision();
  if (!vision || vision.length === 0) {
    throw new Error('Vision не прочитан');
  }
});

runner.test('SelfDev Agent - чтение Roadmap', async () => {
  const agent = new SelfDevAgent('./config.json');
  const roadmap = agent.readRoadmap();
  if (!roadmap || roadmap.length === 0) {
    throw new Error('Roadmap не прочитан');
  }
});

// Тест 3: InterAgent Controller
runner.test('InterAgent Controller - инициализация', async () => {
  const controller = new InterAgentController('./config.json');
  await controller.init();
  if (!controller) {
    throw new Error('Controller не создан');
  }
});

runner.test('InterAgent Controller - определение типа задачи', async () => {
  const controller = new InterAgentController('./config.json');
  const type1 = controller.determineTaskType('Создать проект');
  const type2 = controller.determineTaskType('Исправить ошибку');
  
  if (type1 !== 'selfdev' || type2 !== 'fix') {
    throw new Error('Неправильное определение типа задачи');
  }
});

runner.test('InterAgent Controller - добавление задачи в очередь', async () => {
  const controller = new InterAgentController('./config.json');
  const taskId = controller.addTask('Тестовая задача');
  
  if (!taskId) {
    throw new Error('Задача не добавлена');
  }
  
  const task = controller.getTaskStatus(taskId);
  if (!task || task.status !== 'pending') {
    throw new Error('Задача не найдена или неправильный статус');
  }
});

// Тест 4: Execution Layer
runner.test('Execution Layer - инициализация', async () => {
  const executor = new ExecutionLayer();
  if (!executor) {
    throw new Error('Executor не создан');
  }
});

runner.test('Execution Layer - проверка безопасности пути', async () => {
  const executor = new ExecutionLayer();
  const safe = executor.isPathSafe('./test.txt');
  const unsafe = executor.isPathSafe('C:\\Windows\\System32\\test.txt');
  
  if (!safe || unsafe) {
    throw new Error('Неправильная проверка безопасности пути');
  }
});

runner.test('Execution Layer - запись и чтение файла', async () => {
  const executor = new ExecutionLayer();
  const testPath = './test-temp-file.txt';
  const testContent = 'Тестовое содержимое';
  
  await executor.writeFile(testPath, testContent);
  const content = await executor.readFile(testPath);
  
  if (content !== testContent) {
    throw new Error('Содержимое файла не совпадает');
  }
  
  // Очистка
  await executor.deleteFile(testPath);
});

// Тест 5: Feedback Mechanism
runner.test('Feedback Mechanism - инициализация', async () => {
  const feedback = new FeedbackMechanism();
  if (!feedback) {
    throw new Error('Feedback не создан');
  }
});

runner.test('Feedback Mechanism - регистрация задачи', async () => {
  const feedback = new FeedbackMechanism();
  const record = feedback.recordTask('Тест', { success: true }, 100);
  
  if (!record || !record.id) {
    throw new Error('Задача не зарегистрирована');
  }
});

runner.test('Feedback Mechanism - получение статистики', async () => {
  const feedback = new FeedbackMechanism();
  const stats = feedback.getStatistics();
  
  if (!stats || typeof stats.totalTasks !== 'number') {
    throw new Error('Статистика не получена');
  }
});

// Запуск тестов
runner.run().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});







