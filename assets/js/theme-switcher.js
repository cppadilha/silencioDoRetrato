document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => { // theme can be 'light', 'dark', or null (for page default)
        body.classList.remove('theme-light', 'theme-dark');
        const pageDefaultTheme = body.getAttribute('data-default-theme') || 'light';

        let themeToApply = theme;
        if (themeToApply === null) { // If theme is null, apply page's default
            themeToApply = pageDefaultTheme;
        }

        if (themeToApply === 'dark') {
            body.classList.add('theme-dark');
        } else { // 'light' or any other value defaults to light
            body.classList.add('theme-light');
        }
    };

    const updateButtonIcon = () => {
        if (themeToggleButton) {
            const currentAppliedTheme = body.classList.contains('theme-dark') ? 'dark' : 'light';
            const savedTheme = localStorage.getItem('theme'); // Check if a theme is explicitly saved

            if (savedTheme === null) {
                // If no theme is saved, it means the page's default theme is applied.
                themeToggleButton.textContent = '🌓'; // Show half-moon for page default
            } else if (currentAppliedTheme === 'dark') {
                // If dark theme is currently applied (and savedTheme is not null)
                themeToggleButton.textContent = '🌙'; // Show moon for dark theme
            } else { // currentAppliedTheme === 'light' (and savedTheme is not null)
                // If light theme is currently applied
                themeToggleButton.textContent = '☀️'; // Show sun for light theme
            }
        }
    };

    // Initial load
    const savedTheme = localStorage.getItem('theme');
    applyTheme(savedTheme); // If savedTheme is null, applyTheme will use pageDefaultTheme
    updateButtonIcon(); // Update icon after initial theme is applied

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const savedTheme = localStorage.getItem('theme');
            const pageDefaultTheme = body.getAttribute('data-default-theme') || 'light';

            if (savedTheme === null) {
                // Currently in page default state. Next is dark.
                applyTheme('dark');
                localStorage.setItem('theme', 'dark');
            } else if (savedTheme === 'dark') {
                // Currently dark. Next is light.
                applyTheme('light');
                localStorage.setItem('theme', 'light');
            } else { // savedTheme === 'light'
                // Currently light. Next is page default.
                localStorage.removeItem('theme'); // Clear saved preference
                applyTheme(null); // Apply page's default
            }
            updateButtonIcon(); // Update icon after theme change and localStorage update
        });
    }
});
