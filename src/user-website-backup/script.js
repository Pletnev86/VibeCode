document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('registrationModal');
    const registerBtn = document.getElementById('registerBtn');
    const closeBtn = document.querySelector('.close');
    const form = document.getElementById('registrationForm');

    // Открытие модального окна
    registerBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Закрытие модального окна
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Закрытие при клике вне окна
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Обработка отправки формы
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        
        // Здесь можно добавить отправку данных на сервер
        console.log('Отправленные данные:', { phone, email });
        alert('Данные отправлены!');
        
        modal.style.display = 'none';
        form.reset();
    });
});