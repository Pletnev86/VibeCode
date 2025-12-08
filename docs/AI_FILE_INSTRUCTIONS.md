# Инструкции для AI по созданию файловой инфраструктуры

## Важно: Модель llama-3-8b-gpt-4o-ru1.0

⚠️ **Модель llama-3-8b-gpt-4o-ru1.0 понимает русский и английский языки!**
- НЕ нужно переводить запросы на английский
- Модель работает с русским и английским текстом одинаково хорошо
- Отвечай на том же языке, на котором задан вопрос

## Основные правила

### 1. Структура путей к файлам
⚠️ ВСЕГДА указывай путь начиная с `src/`:
- ✅ Правильно: `src/index.html`, `src/components/App.js`, `src/styles/main.css`
- ❌ Неправильно: `index.html`, `/src/index.html`, `./index.html`

### 2. Типы проектов и их структура

#### Веб-сайт (одностраничный)
```
src/
  index.html          # Главная страница
  styles.css          # Стили (или styles/main.css)
  script.js           # JavaScript (или scripts/main.js)
```

#### Веб-приложение (React/Vue)
```
src/
  index.html          # Точка входа
  components/         # Компоненты
    App.jsx
    Header.jsx
    Footer.jsx
  styles/             # Стили
    main.css
    components.css
  scripts/            # Утилиты
    utils.js
    api.js
```

#### Electron приложение
```
src/
  main.js             # Главный процесс
  preload.js          # Preload скрипт
  renderer/           # Renderer процесс
    index.html
    renderer.js
    styles.css
```

#### Node.js приложение
```
src/
  index.js            # Точка входа
  config/              # Конфигурация
    config.js
  routes/              # Маршруты
    api.js
  utils/               # Утилиты
    helpers.js
```

### 3. Создание файлов

**Формат в ответе:**
```
\`\`\`src/path/to/file.js
// содержимое файла
\`\`\`
```

**Важно:**
- Каждый файл в отдельном блоке кода
- Указывай полный путь с `src/`
- Предоставляй полный код файла (не фрагменты)

### 4. Редактирование существующих файлов

**При изменении файла:**
- Предоставляй ПОЛНЫЙ код файла со всеми изменениями
- НЕ предоставляй только фрагменты
- Если не знаешь текущее содержимое - спроси или предоставь полный код

**Пример:**
Пользователь: "Добавь функцию X в main.js"
Ты должен предоставить:
```
\`\`\`src/main.js
// ВЕСЬ код main.js + новая функция X
\`\`\`
```

### 5. Создание структуры проекта

**При создании нового проекта:**
1. Сначала создай базовую структуру (index.html, основные файлы)
2. Затем добавляй компоненты/модули
3. Создавай файлы в логическом порядке (зависимости сначала)

**Пример для веб-сайта:**
```
1. src/index.html (структура)
2. src/styles.css (базовые стили)
3. src/script.js (базовая логика)
```

### 6. Именование файлов

- HTML: `index.html`, `about.html`, `contact.html`
- CSS: `styles.css`, `main.css`, `components.css`
- JavaScript: `script.js`, `main.js`, `app.js`, `utils.js`
- Компоненты: `App.jsx`, `Header.jsx`, `Button.jsx`
- Папки: `components/`, `styles/`, `scripts/`, `utils/`

### 7. Организация файлов

**По типу:**
```
src/
  html/       # HTML файлы
  css/        # CSS файлы
  js/         # JavaScript файлы
```

**По функциональности:**
```
src/
  components/ # Компоненты
  pages/      # Страницы
  utils/      # Утилиты
  styles/     # Стили
```

**По модулям:**
```
src/
  auth/       # Модуль авторизации
  dashboard/  # Модуль дашборда
  settings/   # Модуль настроек
```

### 8. Зависимости между файлами

**При создании файлов учитывай:**
- HTML файлы ссылаются на CSS и JS
- JS файлы могут импортировать другие JS файлы
- Указывай правильные пути в импортах/ссылках

**Пример:**
```html
<!-- В index.html -->
<link rel="stylesheet" href="styles/main.css">
<script src="scripts/app.js"></script>
```

### 9. Шаблоны для быстрого старта

#### Простой сайт
```
src/index.html
src/styles.css
src/script.js
```

#### React-подобное приложение
```
src/index.html
src/components/App.jsx
src/components/Header.jsx
src/styles/main.css
src/scripts/utils.js
```

#### Electron приложение
```
src/main.js
src/preload.js
src/renderer/index.html
src/renderer/renderer.js
src/renderer/styles.css
```

### 10. Важные напоминания

- ✅ Всегда начинай путь с `src/`
- ✅ Создавай полный код файла, не фрагменты
- ✅ Учитывай зависимости между файлами
- ✅ Используй понятные имена файлов
- ✅ Организуй файлы логически
- ❌ НЕ создавай файлы без `src/` в пути
- ❌ НЕ предоставляй только фрагменты кода при редактировании
- ❌ НЕ создавай системные файлы (main.js, preload.js в корне src проекта)

