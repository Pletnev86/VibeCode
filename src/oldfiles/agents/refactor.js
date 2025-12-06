// Агент, выполняющий рефакторинг кода
export async function refactorCode(code) {
    const task = {
        type: 'code',
        messages: [{ role: 'user', content: `Рефакторинг кода: ${code}` }]
    };
    const response = await aiRouter(task); // Маршрутизируем задачу
    return response.content; // Возвращаем рефакторенный код
}