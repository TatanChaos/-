(function () {
  var type = document.body.getAttribute("data-live-type");
  var out = document.getElementById("liveOutput");
  if (!type || !out) return;
  var isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  function setText(text, online) {
    out.textContent = text;
    out.classList.toggle("online", !!online);
  }
  async function load() {
    if (!isLocal) {
      setText("静态快照：实时盘仅在本地内测服务中启用。", false);
      return;
    }
    try {
      var res = await fetch("http://127.0.0.1:8778/api/" + type);
      if (!res.ok) throw new Error("bad status");
      setText(await res.text(), true);
    } catch (e) {
      setText("实时服务未连接，当前显示静态快照。", false);
    }
  }
  load();
  setInterval(load, 60000);
})();
