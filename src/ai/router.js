// AI маршрутизатор, определяющий, какую модель использовать
import { lmStudioChat } from './providers/lmstudio.js';

export async function aiRouter(task) {
    let response;
    
    switch (task.type) {
        case 'code':
            response = await lmStudioChat(task.messages, 'falcon'); // Используем Falcon для кода
            break;
        case 'explain':
            response = await lmStudioChat(task.messages, 'deepseek'); // Используем DeepSeek для объяснений
            break;
        // Добавить другие типы задач по мере необходимости
        default:
            response = { content: 'Неизвестный тип задачи' };
            break;
    }

    return response;
}