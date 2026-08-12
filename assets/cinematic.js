(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const revealTargets = document.querySelectorAll(".card, .portal-card, .term, .detail-section, .section-title, .pillar, .stat, .sample-box");
  revealTargets.forEach((el, i) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || (el.getBoundingClientRect().width === 0 && el.getBoundingClientRect().height === 0)) {
      el.classList.add("in-view");
      return;
    }
    el.classList.add("reveal");
    el.style.transitionDelay = Math.min((i % 9) * 40, 320) + "ms";
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealTargets.forEach(el => io.observe(el));

  document.querySelectorAll(".card, .portal-card, .term").forEach(el => {
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = "translateY(-4px) rotateX(" + (-y * 3).toFixed(2) + "deg) rotateY(" + (x * 3).toFixed(2) + "deg) scale(1.01)";
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
})();
