# AI Router

Модуль маршрутизации запросов между различными AI провайдерами.

## Описание

AI Router обеспечивает:
- Автоматический выбор оптимальной модели для задачи
- Маршрутизацию запросов к LM Studio, OpenRouter, GPT API
- Smart Auto Mode - интеллектуальный выбор модели
- Fallback механизм при недоступности провайдеров

## Использование

```javascript
const AIRouter = require('./ai/router');

// Создание экземпляра
const router = new AIRouter('./config.json');

// Отправка запроса с автоматическим выбором модели
const response = await router.sendRequest('Создать функцию для парсинга данных');
console.log(response);
```

## Типы задач

Router автоматически классифицирует задачи:

- **code** - генерация кода → модель Falcon
- **explanation** - объяснения → модель DeepSeek
- **translation** - переводы → модель DeepSeek
- **analysis** - анализ → модель DeepSeek
- **reasoning** - рассуждения → модель DeepSeek

## Конфигурация

Настройки в `config.json`:

```json
{
  "ai": {
    "providers": {
      "lmStudio": {
        "enabled": true,
        "baseUrl": "http://localhost:1234/v1",
        "models": {
          "deepseek": "deepseek/deepseek-r1-0528-qwen3-8b",
          "falcon": "nomic-ai-gpt4all-falcon"
        }
      }
    },
    "smartAutoMode": {
      "enabled": true,
      "defaultModel": "deepseek",
      "fallbackModel": "deepseek"
    }
  }
}
```

## Методы

### `sendRequest(prompt, options)`
Отправка запроса с автоматическим выбором модели.

### `classifyTask(task)`
Классификация типа задачи.

### `selectModel(taskType)`
Выбор модели на основе типа задачи.

### `checkLMStudioAvailability()`
Проверка доступности LM Studio.

### `getAvailableModels()`
Получение списка доступных моделей.

## Тестирование

```bash
node ai/test-router.js
```







