# Инструкция по запуску статического сайта

## Запуск

Просто откройте `index.html` в браузере:

```bash
# Windows
start index.html

# Linux/Mac
open index.html
# или
xdg-open index.html
```

## Локальный сервер (рекомендуется)

Для разработки лучше использовать локальный сервер:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Затем откройте в браузере: http://localhost:8000

## Структура

- `index.html` - главная страница
- `style.css` - стили
- `script.js` - JavaScript код


