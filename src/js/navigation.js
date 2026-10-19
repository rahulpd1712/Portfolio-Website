export function initNavigation() {
  const toggle = document.querySelector('.nav-toggle');
  const list = document.getElementById('primary-nav-list');
  if (!toggle || !list) return;

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  function setOpen(open) {
    list.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', function () {
    setOpen(!isOpen());
  });

  // Close after choosing a section (works for anchor navigation).
  list.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('a')) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Close when clicking/tapping outside the menu. The toggle button itself
  // lives outside .site-nav, so it must be excluded or the opening click
  // would immediately close the menu again.
  document.addEventListener('click', function (event) {
    if (!isOpen()) return;
    if (event.target && event.target.closest) {
      if (event.target.closest('.site-nav')) return;
      if (event.target.closest('.nav-toggle')) return;
    }
    setOpen(false);
  });

  const wide = window.matchMedia('(min-width: 768px)');
  const onChange = function (event) {
    if (event.matches) setOpen(false);
  };
  if (wide.addEventListener) wide.addEventListener('change', onChange);
  else if (wide.addListener) wide.addListener(onChange);
}
