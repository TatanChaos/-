(function () {
  if (!document.body.classList.contains("ui-tactical")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll(".module-seal").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5;
      var y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = "perspective(500px) rotateX(" + (-y * 8).toFixed(2) + "deg) rotateY(" + (x * 8).toFixed(2) + "deg)";
    });
    el.addEventListener("pointerleave", function () {
      el.style.transform = "";
    });
  });

  document.querySelectorAll(".interact-query button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.classList.add("tactical-press");
      setTimeout(function () { btn.classList.remove("tactical-press"); }, 180);
    });
  });
})();
