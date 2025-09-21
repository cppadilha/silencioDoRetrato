document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
            if (themeToggleButton) themeToggleButton.textContent = '☀️';
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            if (themeToggleButton) themeToggleButton.textContent = '🌙';
        }
    };

    const savedTheme = localStorage.getItem('theme');
    const defaultTheme = body.getAttribute('data-default-theme') || 'light';

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(defaultTheme);
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const newTheme = body.classList.contains('theme-light') ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
});
