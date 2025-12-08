/**
 * Project Manager - управление проектами VibeCode
 * 
 * Функционал:
 * - Создание проектов
 * - Открытие проектов
 * - Защита системных файлов
 * - Рабочий стол проекта
 */

const fs = require('fs');
const path = require('path');

class ProjectManager {
  constructor(projectRoot = null) {
    this.projectRoot = projectRoot || this.findProjectRoot();
    this.projectsDir = path.join(this.projectRoot, 'projects');
    this.currentProject = null;
    this.currentProjectPath = null;
    
    // Создаем директорию проектов если её нет
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
    
    // Защищенные системные файлы и директории
    this.protectedFiles = [
      'main.js',
      'preload.js',
      'ui.js',
      'index.html',
      'style.css',
      'vibecode.html',
      'app.js',
      'package.json',
      'config.json'
    ];
    
    this.protectedDirs = [
      'src',
      'lib',
      'agents',
      'ai',
      'node_modules',
      'backups',
      'logs',
      'projects',
      'docs',
      'tests'
    ];
  }
  
  /**
   * Поиск корня проекта
   */
  findProjectRoot() {
    let currentDir = process.cwd();
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
        if (pkg.name === 'vibecode') {
          return currentDir;
        }
      }
      currentDir = path.dirname(currentDir);
    }
    return process.cwd();
  }
  
  /**
   * Проверка, является ли путь системным файлом
   */
  isSystemFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    const projectRoot = this.projectRoot.replace(/\\/g, '/');
    
    // Если файл находится вне папки проектов - это системный файл
    if (!normalizedPath.startsWith(projectRoot + '/projects/')) {
      return true;
    }
    
    // Проверяем защищенные файлы
    const fileName = path.basename(resolvedPath);
    if (this.protectedFiles.includes(fileName)) {
      // Если файл в системных директориях - защищен
      const relativePath = path.relative(this.projectRoot, resolvedPath);
      if (relativePath.startsWith('src/') || 
          relativePath.startsWith('lib/') || 
          relativePath.startsWith('agents/') ||
          relativePath.startsWith('ai/')) {
        return true;
      }
    }
    
    // Проверяем защищенные директории
    for (const dir of this.protectedDirs) {
      if (normalizedPath.includes(`/${dir}/`) && !normalizedPath.includes(`/projects/`)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Создание нового проекта
   */
  createProject(projectName) {
    if (!projectName || projectName.trim() === '') {
      throw new Error('Имя проекта не может быть пустым');
    }
    
    // Очищаем имя проекта от недопустимых символов
    const cleanName = projectName.trim().replace(/[<>:"/\\|?*]/g, '_');
    
    const projectPath = path.join(this.projectsDir, cleanName);
    
    // Проверяем, не существует ли уже проект с таким именем
    if (fs.existsSync(projectPath)) {
      throw new Error(`Проект "${cleanName}" уже существует`);
    }
    
    // Создаем структуру проекта
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'logs'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'data'), { recursive: true });
    
    // Создаем рабочий стол проекта
    const projectDesktop = {
      projectName: cleanName,
      projectPath: projectPath,
      createdAt: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      settings: {
        aiProvider: 'openrouter',
        aiModel: 'gpt4',
        autoSave: true
      },
      chatHistory: [],
      files: []
    };
    
    const desktopPath = path.join(projectPath, 'project-desktop.json');
    fs.writeFileSync(desktopPath, JSON.stringify(projectDesktop, null, 2), 'utf8');
    
    // Открываем созданный проект
    this.openProject(cleanName);
    
    return {
      name: cleanName,
      path: projectPath,
      desktop: projectDesktop
    };
  }
  
  /**
   * Открытие проекта
   */
  openProject(projectName) {
    const projectPath = path.join(this.projectsDir, projectName);
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Проект "${projectName}" не найден`);
    }
    
    const desktopPath = path.join(projectPath, 'project-desktop.json');
    let projectDesktop = null;
    
    if (fs.existsSync(desktopPath)) {
      projectDesktop = JSON.parse(fs.readFileSync(desktopPath, 'utf8'));
      projectDesktop.lastOpened = new Date().toISOString();
      fs.writeFileSync(desktopPath, JSON.stringify(projectDesktop, null, 2), 'utf8');
    } else {
      // Создаем рабочий стол если его нет
      projectDesktop = {
        projectName: projectName,
        projectPath: projectPath,
        createdAt: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        settings: {
          aiProvider: 'openrouter',
          aiModel: 'gpt4',
          autoSave: true
        },
        chatHistory: [],
        files: []
      };
      fs.writeFileSync(desktopPath, JSON.stringify(projectDesktop, null, 2), 'utf8');
    }
    
    this.currentProject = projectName;
    this.currentProjectPath = projectPath;
    
    return projectDesktop;
  }
  
  /**
   * Закрытие текущего проекта
   */
  closeProject() {
    if (this.currentProject) {
      // Сохраняем состояние проекта перед закрытием
      this.saveProjectDesktop();
    }
    
    this.currentProject = null;
    this.currentProjectPath = null;
  }
  
  /**
   * Сохранение рабочего стола проекта
   */
  saveProjectDesktop(desktopData = null) {
    if (!this.currentProject || !this.currentProjectPath) {
      return;
    }
    
    const desktopPath = path.join(this.currentProjectPath, 'project-desktop.json');
    const desktop = desktopData || this.getProjectDesktop();
    
    if (desktop) {
      desktop.lastOpened = new Date().toISOString();
      fs.writeFileSync(desktopPath, JSON.stringify(desktop, null, 2), 'utf8');
    }
  }
  
  /**
   * Получение рабочего стола проекта
   */
  getProjectDesktop() {
    if (!this.currentProject || !this.currentProjectPath) {
      return null;
    }
    
    const desktopPath = path.join(this.currentProjectPath, 'project-desktop.json');
    if (fs.existsSync(desktopPath)) {
      return JSON.parse(fs.readFileSync(desktopPath, 'utf8'));
    }
    
    return null;
  }
  
  /**
   * Список всех проектов
   */
  listProjects() {
    if (!fs.existsSync(this.projectsDir)) {
      return [];
    }
    
    const projects = [];
    const entries = fs.readdirSync(this.projectsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(this.projectsDir, entry.name);
        const desktopPath = path.join(projectPath, 'project-desktop.json');
        
        let projectInfo = {
          name: entry.name,
          path: projectPath,
          createdAt: null,
          lastOpened: null
        };
        
        if (fs.existsSync(desktopPath)) {
          try {
            const desktop = JSON.parse(fs.readFileSync(desktopPath, 'utf8'));
            projectInfo.createdAt = desktop.createdAt;
            projectInfo.lastOpened = desktop.lastOpened;
          } catch (error) {
            // Игнорируем ошибки чтения
          }
        }
        
        projects.push(projectInfo);
      }
    }
    
    // Сортируем по дате последнего открытия
    projects.sort((a, b) => {
      const dateA = a.lastOpened ? new Date(a.lastOpened) : new Date(0);
      const dateB = b.lastOpened ? new Date(b.lastOpened) : new Date(0);
      return dateB - dateA;
    });
    
    return projects;
  }
  
  /**
   * Получение пути к текущему проекту
   */
  getCurrentProjectPath() {
    return this.currentProjectPath;
  }
  
  /**
   * Проверка, открыт ли проект
   */
  isProjectOpen() {
    return this.currentProject !== null;
  }
}

module.exports = ProjectManager;

