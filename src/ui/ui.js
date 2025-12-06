// Основная логика пользовательского интерфейса

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  const chatOutput = document.getElementById('chat-output');

  // Инициализация Monaco Editor
  require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.33.0/min/vs' }});
  require(['vs/editor/editor.main'], () => {
    window.editor = monaco.editor.create(document.getElementById('editor'), {
      value: '',
      language: 'javascript',
      theme: 'vs-dark'
    });
  });

  // Обработка ввода в чат
  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (message) {
        addMessage('user', message);
        chatInput.value = '';

        // Отправляем запрос к AI
        try {
          const response = await window.electronAPI.chat([{ role: 'user', content: message }], 'deepseek');
          addMessage('assistant', response.choices[0].message.content);
        } catch (error) {
          addMessage('error', `Ошибка: ${error.message}`);
        }
      }
    }
  });

  function addMessage(role, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    messageElement.textContent = content;
    chatOutput.appendChild(messageElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }
});