/**
 * Тест парсинга реального ответа AI с HTML файлом
 * 
 * Симулирует реальный ответ от AI с форматом:
 * ```html
 * src/index.html
 * <!DOCTYPE html>
 * ...
 * ```
 */

const FileParser = require('../lib/file-parser');

function runTests() {
  console.log('=== Тест парсинга реального ответа AI ===\n');
  
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
  
  // Реальный ответ от AI из логов
  const realResponse = `Отлично! Создам простой одностраничный сайт с запрошенными элементами. Вот файлы: **HTML-страница (главный файл):** \`\`\`html
src/index.html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Привет, мир!</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Привет, мир!</h1>
    <button id="actionButton">Нажми меня</button>
  </div>
  <script>
    document.getElementById('actionButton').addEventListener('click', function() {
      alert('Кнопка работает!');
    });
  </script>
</body>
</html>
\`\`\` **CSS-стили:** \`\`\`css
src/styles.css
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
}
.container {
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px 60px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
h1 {
  font-size: 3rem;
  margin-bottom: 30px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
button {
  background-color: #ffffff;
  color: #2575fc;
  border: none;
  padding: 15px 40px;
  font-size: 1.2rem;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  font-weight: bold;
}
button:hover {
  background-color: #f0f0f0;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}
button:active {
  transform: translateY(1px);
}
\`\`\``;
  
  console.log('1. Парсинг реального ответа AI\n');
  const files = FileParser.parseFiles(realResponse, './src', 'создай сайт');
  
  console.log(`Найдено файлов: ${files.length}`);
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.path} (${file.content.length} символов)`);
  });
  
  test('Найдены файлы', files.length > 0);
  test('Найден HTML файл', files.some(f => f.path.includes('index.html')));
  test('Найден CSS файл', files.some(f => f.path.includes('styles.css')));
  
  const htmlFile = files.find(f => f.path.includes('index.html'));
  if (htmlFile) {
    test('HTML путь правильный', htmlFile.path === 'src/index.html');
    test('HTML содержит DOCTYPE', htmlFile.content.includes('<!DOCTYPE html>'));
    test('HTML содержит заголовок', htmlFile.content.includes('Привет, мир!'));
  } else {
    test('HTML файл найден', false);
  }
  
  const cssFile = files.find(f => f.path.includes('styles.css'));
  if (cssFile) {
    test('CSS путь правильный', cssFile.path === 'src/styles.css');
    test('CSS содержит стили', cssFile.content.includes('body {'));
  } else {
    test('CSS файл найден', false);
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

