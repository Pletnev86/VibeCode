// Логика чат-интерфейса и обработки команд
document.getElementById('send').addEventListener('click', async () => {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    const message = input.value;

    if (message) {
        // Отправка сообщения на AI
        const response = await window.api.chat([{ role: 'user', content: message }], 'deepseek'); // Пример использования модели
        output.innerHTML += `<div><strong>Вы:</strong> ${message}</div>`;
        output.innerHTML += `<div><strong>AI:</strong> ${response}</div>`;
        input.value = ''; // Очистка поля ввода
    }
});