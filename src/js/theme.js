const STORAGE_KEY = 'compiled-identity-theme';

export function initTheme() {
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;

  const label = btn.querySelector('.theme-toggle-label');

  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    const isLight = theme === 'light';
    btn.setAttribute('aria-pressed', String(isLight));
    btn.title = isLight ? 'Switch to dark theme' : 'Switch to light theme';
    if (label) label.textContent = isLight ? 'Dark' : 'Light';
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* storage unavailable - theme still applies for this page view */
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  // Sync label/pressed state with whatever the head script applied.
  apply(current());

  btn.addEventListener('click', function () {
    apply(current() === 'dark' ? 'light' : 'dark');
  });
}
