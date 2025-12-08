/**
 * Тест парсинга HTML файлов с путем на отдельной строке
 * 
 * Проверяет случай: ```html\nsrc/index.html\n<!DOCTYPE html>...
 */

const FileParser = require('../lib/file-parser');

function runTests() {
  console.log('=== Тест парсинга HTML с путем на отдельной строке ===\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, condition, error = null) {
    if (condition) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}${error ? ': ' + error.message : ''}`);
      failed++;
    }
  }
  
  // Тест: HTML блок с путем на отдельной строке
  console.log('1. HTML блок с путем на отдельной строке\n');
  const response = `
Создаю сайт:
\`\`\`html
src/index.html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Test</title>
</head>
<body>
  <h1>Привет мир!</h1>
  <button>Нажми меня</button>
</body>
</html>
\`\`\`
`;
  const files = FileParser.parseFiles(response, './src', 'создай сайт');
  test('Найден HTML файл', files.length > 0);
  if (files.length > 0) {
    const htmlFile = files.find(f => f.path.includes('index.html'));
    test('HTML файл найден', htmlFile !== undefined);
    if (htmlFile) {
      test('Путь правильный', htmlFile.path === 'src/index.html');
      test('Содержимое HTML корректно', htmlFile.content.includes('<!DOCTYPE html>'));
      test('Содержимое содержит заголовок', htmlFile.content.includes('Привет мир!'));
    }
  }
  
  // Итоги
  console.log('\n=== Результаты тестов ===');
  console.log(`✅ Пройдено: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`📊 Всего: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 Все тесты пройдены!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Некоторые тесты провалены');
    process.exit(1);
  }
}

// Запуск тестов
runTests();

