(function () {
  var type = document.body.getAttribute("data-live-type");
  var out = document.getElementById("liveOutput");
  var dateEl = document.getElementById("liveDate");
  var flowEl = document.getElementById("liveFlow");
  var goBtn = document.getElementById("liveGo");
  if (!type || !out) return;
  var isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  function nowValue() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function queryString() {
    var parts = [];
    if (dateEl && dateEl.value) parts.push("dt=" + encodeURIComponent(dateEl.value));
    if (flowEl && flowEl.value) parts.push("flow=" + encodeURIComponent(flowEl.value));
    return parts.length ? "?" + parts.join("&") : "";
  }
  var loadSeq = 0;
  function setText(text, online) {
    out.textContent = text;
    out.classList.toggle("online", !!online);
  }
  function setTag(text) {
    var tag = document.querySelector(".page-head .tag");
    if (tag) tag.textContent = text;
  }
  function chosenLabel() {
    if (!dateEl || !dateEl.value) return "当前时刻";
    return dateEl.value.replace("T", " ");
  }
  function setHint(text) {
    var panel = document.querySelector(".live-panel");
    if (!panel) return;
    var hint = document.getElementById("liveHint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "liveHint";
      hint.className = "live-hint";
      panel.appendChild(hint);
    }
    hint.textContent = text;
  }
  function applyLiuren(text) {
    var rules = {
      "八字": /^八字:\s*(.+)/,
      "月将": /^月将:\s*(.+)/,
      "旬空": /^旬空:\s*(.+)/,
      "课体": /^课体:\s*(.+)/,
      "三传": /^三传:\s*(.+)/,
      "六亲": /^六亲:\s*(.+)/,
      "初传": /^初传:\s*(.+)/,
      "中传": /^中传:\s*(.+)/,
      "末传": /^末传:\s*(.+)/,
      "神煞": /^神煞:\s*(.+)/
    };
    var lines = text.split("\n");
    var values = {};
    lines.forEach(function (line) {
      Object.keys(rules).forEach(function (key) {
        var m = line.match(rules[key]);
        if (m) values[key] = m[1].trim();
      });
    });
    var courses = lines
      .filter(function (line) { return /^\s+[一二三四]:/.test(line); })
      .map(function (line) {
        return line
          .replace(/^\s+/, "")
          .replace(/\s*神=\S+\s*宿=\S+\s*天将=/, " ");
      })
      .join("；");
    if (courses) values["四课"] = courses;
    if (values["旬空"]) {
      values["旬空"] = values["旬空"].replace(/\[|\]|'|"/g, "").replace(/\s*,\s*/, "、").trim();
    }
    ["初传", "中传", "末传"].forEach(function (key) {
      if (values[key]) {
        values[key] = values[key].replace(/\s*(\S+)\s+(\S+)\s*天将=(\S+)/, "$1 · $3").trim();
      }
    });
    document.querySelectorAll(".chart-grid .chart-item").forEach(function (item) {
      var labelEl = item.querySelector(".label");
      var valueEl = item.querySelector(".value");
      if (!labelEl || !valueEl) return;
      var key = labelEl.textContent.trim();
      if (values[key]) valueEl.textContent = values[key];
    });
  }
  async function load() {
    var seq = ++loadSeq;
    if (!isLocal) {
      setText("静态快照：实时盘仅在本地内测服务中启用。", false);
      setTag("静态快照 · 本地内测实时服务未启用");
      setHint("实时盘仅在本地内测服务中启用。");
      return;
    }
    try {
      var res = await fetch("http://127.0.0.1:8778/api/" + type + queryString());
      if (!res.ok) throw new Error("bad status");
      if (seq !== loadSeq) return;
      var text = await res.text();
      if (type === "liuren") applyLiuren(text);
      setText(text, true);
      setTag("实时盘已更新 · " + chosenLabel());
      setHint("下方盘面格为静态快照，仅作对照；实时盘以本框为准。");
    } catch (e) {
      if (seq !== loadSeq) return;
      setText("实时服务未连接，当前显示静态快照。", false);
      setTag("静态快照 · 实时服务未连接");
      setHint("下方盘面格为静态快照。");
    }
  }
  if (dateEl && !dateEl.value) dateEl.value = nowValue();
  if (goBtn) goBtn.addEventListener("click", load);
  load();
  setInterval(load, 60000);
})();
