/**
 * Тестовый скрипт для проверки автономной работы системы
 * 
 * Проверяет:
 * - Инициализацию агентов
 * - Чтение Roadmap
 * - Автономную разработку по этапам
 */

const SelfDevAgent = require('./agents/selfdev');
const InterAgentController = require('./agents/inter-agent-controller');

async function testAutonomousDevelopment() {
  console.log('🧪 Начало тестирования автономной разработки...\n');
  
  try {
    // 1. Инициализация InterAgent Controller
    console.log('1️⃣ Инициализация InterAgent Controller...');
    const controller = new InterAgentController('./config.json');
    await controller.init();
    console.log('✅ InterAgent Controller инициализирован\n');
    
    // 2. Проверка SelfDev Agent
    console.log('2️⃣ Проверка SelfDev Agent...');
    const selfDevAgent = controller.agents.selfdev;
    
    if (!selfDevAgent) {
      throw new Error('SelfDev Agent не инициализирован');
    }
    console.log('✅ SelfDev Agent доступен\n');
    
    // 3. Проверка чтения Roadmap
    console.log('3️⃣ Проверка чтения Roadmap...');
    const roadmap = selfDevAgent.readRoadmap();
    console.log(`✅ Roadmap прочитан (${roadmap.length} символов)\n`);
    
    // 4. Парсинг этапов из Roadmap
    console.log('4️⃣ Парсинг этапов из Roadmap...');
    const stages = selfDevAgent.parseRoadmapStages(roadmap);
    console.log(`✅ Найдено этапов: ${stages.length}`);
    stages.forEach((stage, index) => {
      console.log(`   ${index + 1}. ${stage.name}`);
    });
    console.log('');
    
    // 5. Тест генерации задач для первого этапа
    if (stages.length > 0) {
      console.log('5️⃣ Тест генерации задач для первого этапа...');
      const tasks = await selfDevAgent.generateTasksForStage(stages[0]);
      console.log(`✅ Сгенерировано задач: ${tasks.length}`);
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task}`);
      });
      console.log('');
    }
    
    // 6. Проверка других агентов
    console.log('6️⃣ Проверка других агентов...');
    if (controller.agents.refactor) {
      console.log('✅ Refactor Agent доступен');
    }
    if (controller.agents.fix) {
      console.log('✅ Fix Agent доступен');
    }
    if (controller.agents.explain) {
      console.log('✅ Explain Agent доступен');
    }
    console.log('');
    
    console.log('🎉 Все тесты пройдены успешно!');
    console.log('\n💡 Для запуска полной автономной разработки используйте:');
    console.log('   await selfDevAgent.developAutonomously();');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Запуск тестов
if (require.main === module) {
  testAutonomousDevelopment().then(() => {
    console.log('\n✅ Тестирование завершено');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Тестирование завершилось с ошибкой:', error.message);
    process.exit(1);
  });
}

module.exports = { testAutonomousDevelopment };




