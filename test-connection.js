/**
 * Тест подключения к LM Studio и OpenRouter
 */

const AIRouter = require('./ai/router');

async function testConnections() {
  console.log('🧪 Тестирование подключений...\n');
  
  const router = new AIRouter('./config.json');
  
  // Тест 1: LM Studio
  console.log('1️⃣ Тест LM Studio...');
  try {
    const response1 = await router.sendRequest('Привет! Ответь одним словом: работает', {
      useOpenRouter: false,
      model: 'deepseek'
    });
    console.log('✅ LM Studio работает!');
    console.log(`   Ответ: ${response1.substring(0, 50)}...\n`);
  } catch (error) {
    console.log('❌ LM Studio недоступен:', error.message);
    console.log('   Убедитесь, что LM Studio запущен и слушает на порту 1234\n');
  }
  
  // Тест 2: OpenRouter
  console.log('2️⃣ Тест OpenRouter...');
  try {
    const response2 = await router.sendRequest('Привет! Ответь одним словом: работает', {
      useOpenRouter: true,
      model: 'gpt4'
    });
    console.log('✅ OpenRouter работает!');
    console.log(`   Ответ: ${response2.substring(0, 50)}...\n`);
  } catch (error) {
    console.log('❌ OpenRouter недоступен:', error.message);
    console.log('   Проверьте API ключ в config.json\n');
  }
  
  console.log('✅ Тестирование завершено');
}

testConnections().catch(console.error);


