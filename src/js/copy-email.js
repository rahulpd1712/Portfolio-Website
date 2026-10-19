export function initCopyEmail() {
  const buttons = document.querySelectorAll('[data-copy-email]');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    const status =
      btn.parentElement && btn.parentElement.querySelector('.copy-status')
        ? btn.parentElement.querySelector('.copy-status')
        : null;
    let timer = null;

    function announce(message) {
      if (!status) return;
      status.textContent = message;
      clearTimeout(timer);
      timer = setTimeout(function () {
        status.textContent = '';
      }, 2800);
    }

    btn.addEventListener('click', async function () {
      const email = btn.getAttribute('data-copy-email') || '';
      let ok = false;

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(email);
          ok = true;
        }
      } catch (e) {
        ok = false;
      }

      if (!ok) {
        // Fallback for non-secure contexts / older browsers.
        try {
          const ta = document.createElement('textarea');
          ta.value = email;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (e) {
          ok = false;
        }
      }

      announce(ok ? 'Copied!' : 'Copy blocked - select the address');
    });
  });
}
