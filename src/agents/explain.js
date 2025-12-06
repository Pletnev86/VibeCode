// Агент, объясняющий код
export async function explainCode(code) {
    const task = {
        type: 'explain',
        messages: [{ role: 'user', content: code }]
    };
    const response = await aiRouter(task); // Маршрутизируем задачу
    return response.content; // Возвращаем объяснение
}