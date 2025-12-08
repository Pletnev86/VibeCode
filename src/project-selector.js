/**
 * Project Selector - экран выбора проекта
 */

const { contextBridge, ipcRenderer } = require('electron');

// Используем contextBridge если доступен, иначе напрямую ipcRenderer
const api = typeof window !== 'undefined' && window.api ? window.api : {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
};

// Элементы интерфейса
const createProjectBtn = document.getElementById('createProjectBtn');
const openProjectBtn = document.getElementById('openProjectBtn');
const createProjectForm = document.getElementById('createProjectForm');
const projectNameInput = document.getElementById('projectNameInput');
const createBtn = document.getElementById('createBtn');
const cancelBtn = document.getElementById('cancelBtn');
const projectList = document.getElementById('projectList');
const emptyState = document.getElementById('emptyState');

// Показываем форму создания проекта
createProjectBtn.addEventListener('click', () => {
    createProjectForm.classList.add('active');
    projectNameInput.focus();
});

// Скрываем форму создания проекта
cancelBtn.addEventListener('click', () => {
    createProjectForm.classList.remove('active');
    projectNameInput.value = '';
});

// Создание проекта
createBtn.addEventListener('click', async () => {
    const projectName = projectNameInput.value.trim();
    
    if (!projectName) {
        alert('Введите имя проекта');
        return;
    }
    
    try {
        const result = await api.invoke('create-project', projectName);
        if (result.success) {
            // Открываем проект и переходим к основному интерфейсу
            await api.invoke('open-project', projectName);
            window.location.href = 'index.html';
        } else {
            alert(`Ошибка: ${result.error}`);
        }
    } catch (error) {
        alert(`Ошибка создания проекта: ${error.message}`);
    }
});

// Открытие проекта
openProjectBtn.addEventListener('click', async () => {
    // Загружаем список проектов
    try {
        const result = await api.invoke('list-projects');
        if (result.success) {
            displayProjects(result.projects);
            projectList.style.display = 'block';
        } else {
            alert(`Ошибка: ${result.error}`);
        }
    } catch (error) {
        alert(`Ошибка загрузки проектов: ${error.message}`);
    }
});

// Отображение списка проектов
function displayProjects(projects) {
    if (projects.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    projectList.innerHTML = '';
    
    projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        
        const projectName = document.createElement('div');
        projectName.className = 'project-name';
        projectName.textContent = project.name;
        
        const projectInfo = document.createElement('div');
        projectInfo.className = 'project-info';
        if (project.lastOpened) {
            const date = new Date(project.lastOpened);
            projectInfo.textContent = `Последнее открытие: ${date.toLocaleString('ru-RU')}`;
        } else {
            projectInfo.textContent = 'Проект создан';
        }
        
        projectItem.appendChild(projectName);
        projectItem.appendChild(projectInfo);
        
        projectItem.addEventListener('click', async () => {
            try {
                const result = await api.invoke('open-project', project.name);
                if (result.success) {
                    window.location.href = 'index.html';
                } else {
                    alert(`Ошибка: ${result.error}`);
                }
            } catch (error) {
                alert(`Ошибка открытия проекта: ${error.message}`);
            }
        });
        
        projectList.appendChild(projectItem);
    });
}

// Создание проекта по Enter
projectNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createBtn.click();
    }
});

