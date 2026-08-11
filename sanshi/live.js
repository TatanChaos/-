(function () {
  var type = document.body.getAttribute("data-live-type");
  var out = document.getElementById("liveOutput");
  if (!type || !out) return;
  var isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  function setText(text, online) {
    out.textContent = text;
    out.classList.toggle("online", !!online);
  }
  function setTag(text) {
    var tag = document.querySelector(".page-head .tag");
    if (tag) tag.textContent = text;
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
  async function load() {
    if (!isLocal) {
      setText("静态快照：实时盘仅在本地内测服务中启用。", false);
      setTag("静态快照 · 本地内测实时服务未启用");
      setHint("实时盘仅在本地内测服务中启用。");
      return;
    }
    try {
      var res = await fetch("http://127.0.0.1:8778/api/" + type);
      if (!res.ok) throw new Error("bad status");
      setText(await res.text(), true);
      setTag("实时盘已更新 · " + new Date().toLocaleString("zh-CN", { hour12: false }));
      setHint("下方盘面格为静态快照，仅作对照；实时盘以本框为准。");
    } catch (e) {
      setText("实时服务未连接，当前显示静态快照。", false);
      setTag("静态快照 · 实时服务未连接");
      setHint("下方盘面格为静态快照。");
    }
  }
  load();
  setInterval(load, 60000);
})();
