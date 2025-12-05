# Примеры использования Local Cursor X

## Пример 1: Генерация проекта через Self-Build

### Шаг 1: Подготовка
1. Убедитесь, что LM Studio запущен
2. Загрузите модели DeepSeek и Falcon
3. Проверьте наличие Vision.md и Roadmap.md в `/docs`

### Шаг 2: Запуск приложения
```bash
npm start
```

### Шаг 3: Использование Self-Build
1. Нажмите кнопку "Self-Build" в UI
2. Система автоматически:
   - Прочитает Vision и Roadmap
   - Сформирует промпт для AI
   - Сгенерирует файлы проекта
   - Сохранит их в `/src`

### Результат
Созданные файлы будут отображены в логах и сохранены в `/src`.

---

## Пример 2: Использование чат-интерфейса

### Запрос на русском языке
```
Создать простую функцию для парсинга JSON
```

**Что происходит:**
1. Система определяет язык: русский
2. Классифицирует задачу: code
3. Выбирает модель: Falcon
4. Переводит запрос на английский через DeepSeek
5. Генерирует код через Falcon
6. Отображает результат в чате

### Запрос на английском языке
```
Create a REST API endpoint for user authentication
```

**Что происходит:**
1. Система определяет язык: английский
2. Классифицирует задачу: code
3. Выбирает модель: Falcon
4. Генерирует код напрямую (без перевода)

---

## Пример 3: Анализ существующего проекта

### Через UI
1. Нажмите кнопку "Анализ проекта"
2. Система проанализирует текущую директорию
3. Покажет статистику:
   - Количество директорий и файлов
   - Markdown файлы
   - Конфигурационные файлы
   - Код файлы

### Программно
```javascript
const SelfDevAgent = require('./agents/selfdev');
const agent = new SelfDevAgent('./config.json');

const result = await agent.analyzeProject('./my-project');
console.log(result.analysis.summary);
```

---

## Пример 4: Использование InterAgent Controller

```javascript
const InterAgentController = require('./agents/inter-agent-controller');

const controller = new InterAgentController('./config.json');
await controller.init();

// Добавление задачи
const taskId = controller.addTask('Создать новый модуль для работы с БД');

// Обработка задачи
await controller.processTask(taskId);

// Получение статуса
const status = controller.getTaskStatus(taskId);
console.log(status);
```

---

## Пример 5: Отслеживание изменений в документах

```javascript
const SelfDevAgent = require('./agents/selfdev');
const agent = new SelfDevAgent('./config.json');

// Запуск отслеживания
agent.startWatchingDocuments();

// При изменении Vision.md или Roadmap.md
// контекст автоматически перезагрузится

// Остановка отслеживания
agent.stopWatchingDocuments();
```

---

## Пример 6: Использование Feedback Mechanism

```javascript
const FeedbackMechanism = require('./lib/feedback-mechanism');
const feedback = new FeedbackMechanism();

// Регистрация задачи
feedback.recordTask('Создать API', { success: true }, 5000);

// Регистрация ошибки
feedback.recordError('Создать API', new Error('Timeout'), { timeout: 30000 });

// Получение статистики
const stats = feedback.getStatistics();
console.log(stats);

// Получение рекомендаций
const recommendations = feedback.getRecommendations();
console.log(recommendations);
```

---

## Пример 7: Безопасное выполнение команд

```javascript
const ExecutionLayer = require('./lib/execution-layer');
const executor = new ExecutionLayer();

// Безопасная запись файла
await executor.writeFile('./safe-file.txt', 'content');

// Безопасное чтение файла
const content = await executor.readFile('./safe-file.txt');

// Безопасное выполнение команды
const result = await executor.executeCommand('node --version');
console.log(result.stdout);
```

---

## Пример 8: Прямое использование AI Router

```javascript
const AIRouter = require('./ai/router');
const router = new AIRouter('./config.json');

// Отправка запроса с автоматическим выбором модели
const response = await router.sendRequest('Объясни что такое REST API');

// Прямой запрос к конкретной модели
const code = await router.queryLMStudio('falcon', 'Create a hello world function', {
  temperature: 0.7,
  max_tokens: 200
});
```

---

## Пример 9: Обновление Vision и Roadmap

### Автоматическое обновление
Система автоматически отслеживает изменения в Vision.md и Roadmap.md и перезагружает контекст.

### Ручное обновление
```javascript
const agent = new SelfDevAgent('./config.json');

// Перезагрузка контекста
agent.reloadContext();

// Проверка актуальности
const freshness = agent.checkDocumentsFreshness();
if (freshness.needsReload) {
  agent.reloadContext();
}
```

---

## Пример 10: Получение internal prompt

```javascript
const agent = new SelfDevAgent('./config.json');
const prompt = agent.getInternalPrompt();

console.log(prompt);
// Выведет инструкции для загрузки реальных Vision и Roadmap
```

---

## Советы и рекомендации

1. **Для быстрых ответов**: Используйте короткие запросы и указывайте `max_tokens`
2. **Для генерации кода**: Используйте английский язык или позвольте системе автоматически перевести
3. **Для объяснений**: Используйте русский язык - DeepSeek отлично работает с русским
4. **Мониторинг**: Следите за логами для отслеживания прогресса
5. **Ошибки**: Используйте Feedback Mechanism для анализа повторяющихся ошибок



