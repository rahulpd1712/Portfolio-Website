export function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  // Only after JS runs do elements start hidden - no JS means no hiding.
  document.documentElement.classList.add('reveal-ready');

  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
  );

  items.forEach(function (el) {
    io.observe(el);
  });

  // Safety net: if the observer never fires for something already on screen,
  // reveal it anyway. Content must never stay hidden.
  setTimeout(function () {
    items.forEach(function (el) {
      if (el.classList.contains('is-visible')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
      }
    });
  }, 1400);
}
