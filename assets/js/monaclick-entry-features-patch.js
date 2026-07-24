(() => {
  if (!window.location.pathname.startsWith('/entry/')) return;

  const featureSections = () => {
    const marked = Array.from(document.querySelectorAll('section[data-mc-features="1"]'));
    const headed = Array.from(document.querySelectorAll('h1, h2, h3'))
      .filter((heading) => (heading.textContent || '').trim().toLowerCase() === 'features')
      .map((heading) => heading.closest('section, .card, [data-mc-features]'))
      .filter(Boolean);
    return Array.from(new Set([...marked, ...headed]));
  };

  const removeDuplicates = () => {
    const sections = featureSections();
    sections.slice(1).forEach((section) => section.remove());
  };

  const install = () => {
    removeDuplicates();

    const style = document.createElement('style');
    style.id = 'mc-single-features-style';
    style.textContent = `
      section[data-mc-features="1"] ~ section[data-mc-features="1"] {
        display: none !important;
      }
    `;
    if (!document.getElementById(style.id)) document.head.appendChild(style);

    const observer = new MutationObserver(removeDuplicates);
    observer.observe(document.body, { childList: true, subtree: true });

    let runs = 0;
    const timer = window.setInterval(() => {
      removeDuplicates();
      runs += 1;
      if (runs >= 20) window.clearInterval(timer);
    }, 500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  window.__MC_ENTRY_FEATURES_PATCH__ = '2026-07-25-r8';
})();