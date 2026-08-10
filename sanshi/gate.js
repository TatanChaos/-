(function () {
  var gate = document.getElementById("agreementGate");
  if (!gate) return;
  var agree = document.getElementById("gateAgree");
  var enter = document.getElementById("gateEnter");
  var key = document.body.getAttribute("data-gate-key") || "yizhen-sanshi-gate-v1";
  var accepted = false;
  try {
    accepted = localStorage.getItem(key) === "1";
  } catch (e) {}
  if (accepted) {
    gate.hidden = true;
    return;
  }
  document.body.classList.add("gate-open");
  agree.addEventListener("change", function () {
    enter.disabled = !agree.checked;
  });
  enter.addEventListener("click", function () {
    if (!agree.checked) return;
    try {
      localStorage.setItem(key, "1");
    } catch (e) {}
    gate.hidden = true;
    document.body.classList.remove("gate-open");
  });
})();
