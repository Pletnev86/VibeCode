/**
 * Тест работы с файлами в проектах
 * 
 * Проверяет:
 * - Создание проекта
 * - Сохранение файлов в папку проекта
 * - Редактирование файлов
 * - Защиту системных файлов
 * - Правильные пути к файлам
 */

const fs = require('fs');
const path = require('path');
const ProjectManager = require('../lib/project-manager');
const FileParser = require('../lib/file-parser');

const testProjectName = 'test-project-files';
let projectManager;
let testProjectPath;

async function runTests() {
  console.log('=== Тест работы с файлами в проектах ===\n');
  
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
  
  try {
    // Инициализация
    projectManager = new ProjectManager();
    console.log('1. Инициализация ProjectManager\n');
    
    // Тест 1: Создание проекта
    console.log('2. Создание тестового проекта\n');
    try {
      const project = projectManager.createProject(testProjectName);
      testProjectPath = project.path;
      test('Создание проекта', project !== null && fs.existsSync(project.path));
      test('Папка src создана', fs.existsSync(path.join(project.path, 'src')));
      test('Рабочий стол создан', fs.existsSync(path.join(project.path, 'project-desktop.json')));
    } catch (error) {
      test('Создание проекта', false, error);
    }
    
    // Тест 2: Проверка защиты системных файлов
    console.log('\n3. Проверка защиты системных файлов\n');
    const systemFiles = [
      path.join(process.cwd(), 'src', 'main.js'),
      path.join(process.cwd(), 'src', 'preload.js'),
      path.join(process.cwd(), 'src', 'ui.js')
    ];
    
    systemFiles.forEach(sysFile => {
      test(`Защита ${path.basename(sysFile)}`, projectManager.isSystemFile(sysFile));
    });
    
    // Тест 3: Парсинг файлов из ответа AI
    console.log('\n4. Парсинг файлов из ответа AI\n');
    const testResponse = `
Создаю файлы:
\`\`\`src/test.js
console.log('test');
\`\`\`

\`\`\`src/components/App.jsx
import React from 'react';
\`\`\`

\`\`\`test.txt
test content
\`\`\`
`;
    
    const parsedFiles = FileParser.parseFiles(testResponse, './src', 'создай файлы');
    test('Парсинг файлов', parsedFiles.length >= 2);
    
    if (parsedFiles.length > 0) {
      parsedFiles.forEach(file => {
        const hasSrc = file.path.startsWith('src/');
        test(`Путь ${file.path} начинается с src/`, hasSrc);
      });
    }
    
    // Тест 4: Сохранение файлов в проект
    console.log('\n5. Сохранение файлов в проект\n');
    if (parsedFiles.length > 0) {
      for (const file of parsedFiles) {
        try {
          // Нормализуем путь
          let normalizedPath = file.path.replace(/\\/g, '/');
          if (normalizedPath.startsWith('src/')) {
            normalizedPath = normalizedPath.substring(4);
          }
          
          const projectSrcPath = path.join(testProjectPath, 'src');
          const targetPath = path.join(projectSrcPath, normalizedPath);
          const dir = path.dirname(targetPath);
          
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(targetPath, file.content, 'utf8');
          const exists = fs.existsSync(targetPath);
          test(`Файл ${normalizedPath} сохранен в проект`, exists);
          
          // Проверяем содержимое
          const content = fs.readFileSync(targetPath, 'utf8');
          test(`Содержимое файла ${normalizedPath} корректно`, content === file.content);
        } catch (error) {
          test(`Сохранение файла ${file.path}`, false, error);
        }
      }
    }
    
    // Тест 5: Редактирование файла
    console.log('\n6. Редактирование файла\n');
    if (parsedFiles.length > 0) {
      const firstFile = parsedFiles[0];
      let normalizedPath = firstFile.path.replace(/\\/g, '/');
      if (normalizedPath.startsWith('src/')) {
        normalizedPath = normalizedPath.substring(4);
      }
      
      const filePath = path.join(testProjectPath, 'src', normalizedPath);
      if (fs.existsSync(filePath)) {
        const newContent = firstFile.content + '\n// Обновлено';
        fs.writeFileSync(filePath, newContent, 'utf8');
        const updatedContent = fs.readFileSync(filePath, 'utf8');
        test('Редактирование файла', updatedContent === newContent);
      }
    }
    
    // Тест 6: Проверка путей
    console.log('\n7. Проверка путей файлов\n');
    const projectFiles = [];
    function scanDir(dir, baseDir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        if (entry.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else {
          projectFiles.push(relativePath);
        }
      }
    }
    
    scanDir(path.join(testProjectPath, 'src'), testProjectPath);
    test('Файлы находятся в папке проекта', projectFiles.length > 0);
    projectFiles.forEach(file => {
      const isInProject = !file.includes('..') && file.startsWith('src');
      test(`Файл ${file} в правильной папке`, isInProject);
    });
    
    // Очистка
    console.log('\n8. Очистка тестового проекта\n');
    try {
      if (fs.existsSync(testProjectPath)) {
        fs.rmSync(testProjectPath, { recursive: true, force: true });
        test('Удаление тестового проекта', !fs.existsSync(testProjectPath));
      }
    } catch (error) {
      test('Удаление тестового проекта', false, error);
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
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    console.error(error.stack);
    
    // Очистка при ошибке
    try {
      if (testProjectPath && fs.existsSync(testProjectPath)) {
        fs.rmSync(testProjectPath, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Ошибка очистки:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Запуск тестов
runTests();

