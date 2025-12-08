/**
 * Тест парсинга HTML файлов
 * 
 * Проверяет:
 * - Парсинг HTML блоков с путем src/index.html
 * - Парсинг HTML блоков без пути (должен стать src/index.html)
 * - Правильную нормализацию путей
 */

const FileParser = require('../lib/file-parser');

function runTests() {
  console.log('=== Тест парсинга HTML файлов ===\n');
  
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
  
  // Тест 1: HTML блок с путем src/index.html
  console.log('1. HTML блок с путем src/index.html\n');
  const response1 = `
Создаю файлы:
\`\`\`html
src/index.html
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>
\`\`\`
`;
  const files1 = FileParser.parseFiles(response1, './src', 'создай сайт');
  test('Найден HTML файл с путем', files1.length > 0);
  if (files1.length > 0) {
    const htmlFile = files1.find(f => f.path.includes('index.html'));
    test('Путь содержит src/index.html', htmlFile && htmlFile.path.includes('src/index.html'));
    test('Содержимое HTML корректно', htmlFile && htmlFile.content.includes('<!DOCTYPE html>'));
  }
  
  // Тест 2: HTML блок без пути (должен стать src/index.html)
  console.log('\n2. HTML блок без пути\n');
  const response2 = `
Создаю сайт:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Test Site</title>
</head>
<body>
  <h1>Welcome</h1>
</body>
</html>
\`\`\`
`;
  const files2 = FileParser.parseFiles(response2, './src', 'создай сайт');
  test('Найден HTML файл без пути', files2.length > 0);
  if (files2.length > 0) {
    const htmlFile = files2.find(f => f.path.includes('index.html'));
    test('Путь нормализован в src/index.html', htmlFile && htmlFile.path === 'src/index.html');
    test('Содержимое HTML корректно', htmlFile && htmlFile.content.includes('<!DOCTYPE html>'));
  }
  
  // Тест 3: HTML блок с путем index.html (без src/)
  console.log('\n3. HTML блок с путем index.html (без src/)\n');
  const response3 = `
Файлы:
\`\`\`html
index.html
<!DOCTYPE html>
<html>
<body>
  <p>Test</p>
</body>
</html>
\`\`\`
`;
  const files3 = FileParser.parseFiles(response3, './src', 'создай файл');
  test('Найден HTML файл с путем index.html', files3.length > 0);
  if (files3.length > 0) {
    const htmlFile = files3.find(f => f.path.includes('index.html'));
    test('Путь нормализован в src/index.html', htmlFile && htmlFile.path === 'src/index.html');
  }
  
  // Тест 4: Множественные HTML блоки (должен взять только первый)
  console.log('\n4. Множественные HTML блоки\n');
  const response4 = `
Файлы:
\`\`\`html
<!DOCTYPE html>
<html>
<body>
  <h1>First</h1>
</body>
</html>
\`\`\`

\`\`\`html
<!DOCTYPE html>
<html>
<body>
  <h1>Second</h1>
</body>
</html>
\`\`\`
`;
  const files4 = FileParser.parseFiles(response4, './src', 'создай файлы');
  const htmlFiles4 = files4.filter(f => f.path.includes('index.html'));
  test('Найден только один HTML файл', htmlFiles4.length === 1);
  
  // Тест 5: HTML блок с путем и CSS блок
  console.log('\n5. HTML блок с CSS блоком\n');
  const response5 = `
Создаю сайт:
\`\`\`html
src/index.html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Test</h1>
</body>
</html>
\`\`\`

\`\`\`css
src/styles.css
body {
  margin: 0;
  padding: 0;
}
\`\`\`
`;
  const files5 = FileParser.parseFiles(response5, './src', 'создай сайт');
  test('Найдены HTML и CSS файлы', files5.length >= 2);
  const htmlFile5 = files5.find(f => f.path.includes('index.html'));
  const cssFile5 = files5.find(f => f.path.includes('styles.css') || f.path.includes('style.css'));
  test('HTML файл найден', htmlFile5 !== undefined);
  test('CSS файл найден', cssFile5 !== undefined);
  
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

