/* Progressive enhancement for the shared V19 Ministry surfaces. */
(() => {
  const root = document.querySelector('.ministry-v19');
  if (!root) return;
  const items = root.querySelectorAll('[data-reveal]');
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.setAttribute('data-revealed', 'true');
      instance.unobserve(entry.target);
    });
  }, { threshold: .12 });
  items.forEach((item) => observer.observe(item));
})();
