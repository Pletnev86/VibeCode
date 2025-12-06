/**
 * Test Runner - базовый раннер для автотестов
 * 
 * Этот модуль готов к расширению для интеграции с Jest, pytest-lite и другими тестовыми фреймворками
 */

class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  /**
   * Регистрация теста
   */
  test(name, fn) {
    this.tests.push({ name, fn });
  }

  /**
   * Запуск всех тестов
   */
  async run() {
    console.log(`\n🧪 Запуск тестов (${this.tests.length} тестов)...\n`);

    for (const test of this.tests) {
      try {
        const start = Date.now();
        await test.fn();
        const duration = Date.now() - start;
        
        this.results.push({
          name: test.name,
          status: 'passed',
          duration: duration
        });
        
        console.log(`✅ ${test.name} (${duration}ms)`);
      } catch (error) {
        this.results.push({
          name: test.name,
          status: 'failed',
          error: error.message,
          duration: 0
        });
        
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    this.printSummary();
  }

  /**
   * Вывод сводки результатов
   */
  printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;

    console.log(`\n📊 Результаты тестирования:`);
    console.log(`   Всего: ${total}`);
    console.log(`   ✅ Успешно: ${passed}`);
    console.log(`   ❌ Провалено: ${failed}`);
    console.log(`   Успешность: ${((passed / total) * 100).toFixed(1)}%\n`);
  }

  /**
   * Получение результатов
   */
  getResults() {
    return this.results;
  }
}

module.exports = TestRunner;





