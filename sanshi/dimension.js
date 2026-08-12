(function () {
  var panels = document.querySelectorAll(".dimension-panel[data-pan-type]");
  if (!panels.length) return;

  var CONFIG = {
    taiyi: {
      title: "太乙 · 九宫 + 天盘 + 算局 = 3D",
      desc: "二维是九宫，三维把天盘和算局叠上去，第四维由时间局和主客状态给出。",
      layers: [
        { name: "地盘 · 九宫", kind: "grid", cells: ["1坎", "2坤", "3震", "4巽", "5中", "6乾", "7兑", "8艮", "9离"] },
        { name: "天盘 · 太乙行宫", kind: "grid", cells: ["景", "死", "惊", "开", "休", "生", "伤", "杜", "中"] },
        { name: "算局 · 主客定算", kind: "grid", cells: ["主算31", "客算16", "定算29", "文昌艮", "始击巳", "计神戌", "合神酉", "定目寅", "值事景"] }
      ]
    },
    qimen: {
      title: "奇门 · 九宫 × 四层时间 = 4D",
      desc: "每层都是同一套九宫坐标，四层沿时间轴堆叠：年、月、日、时。",
      layers: [
        { name: "年家 · 下元阴遁7局", kind: "grid", cells: ["4巽", "9离", "2坤", "3震", "5中", "7兑", "8艮", "1坎", "6乾"] },
        { name: "月家 · 中元阴遁4局", kind: "grid", cells: ["4巽", "9离", "2坤", "3震", "5中", "7兑", "8艮", "1坎", "6乾"] },
        { name: "日家 · 上元阴遁9局", kind: "grid", cells: ["4巽", "9离", "2坤", "3震", "5中", "7兑", "8艮", "1坎", "6乾"] },
        { name: "时家 · 阴遁5局", kind: "grid", cells: ["4巽", "9离", "2坤", "3震", "5中", "7兑", "8艮", "1坎", "6乾"] }
      ]
    },
    liuren: {
      title: "六壬 · 天地盘 + 四课 + 三传 = 3D/4D",
      desc: "天地盘是底，四课是中间状态，三传是从起点向上展开的路径；720 课体是状态空间。",
      layers: [
        { name: "天地盘 · 十二支环列", kind: "ring", nodes: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] },
        { name: "四课 · 事态环境", kind: "grid", cells: ["一 · 辰戊", "二 · 卯辰", "三 · 巳午", "四 · 辰巳"] },
        { name: "三传 · 路径", kind: "path", path: ["卯", "寅", "丑"] }
      ]
    }
  };

  function gridHTML(cells) {
    return '<div class="pan-grid">' + cells.map(function (cell, i) {
      return '<div class="pan-cell' + (i === 4 ? " center" : "") + '">' + cell + "</div>";
    }).join("") + "</div>";
  }

  function ringHTML(nodes) {
    return '<div class="pan-ring">' + nodes.map(function (node, i) {
      return '<div class="pan-node' + (i === 0 ? " center" : "") + '" style="--i:' + i + '">' + node + "</div>";
    }).join("") + "</div>";
  }

  function pathHTML(path) {
    return '<div class="pan-path">' + path.map(function (node) {
      return "<span>" + node + "</span>";
    }).join('<span style="border:0;background:transparent;color:var(--muted)">→</span>') + "</div>";
  }

  panels.forEach(function (panel) {
    var cfg = CONFIG[panel.getAttribute("data-pan-type")];
    if (!cfg) return;
    var layers = cfg.layers.map(function (layer, i) {
      var content = layer.kind === "ring" ? ringHTML(layer.nodes) : layer.kind === "path" ? pathHTML(layer.path) : gridHTML(layer.cells);
      return '<div class="pan-layer" data-layer="' + i + '" style="--z:' + (i * 42) + 'px"><h4>' + layer.name + "</h4>" + content + "</div>";
    }).join("");
    panel.innerHTML = [
      '<div class="dimension-head">',
      "<div><h3>" + cfg.title + "</h3><p>" + cfg.desc + "</p></div>",
      '<div class="dimension-controls">',
      '<button type="button" data-view="flat" aria-pressed="true">俯视</button>',
      '<button type="button" data-view="side" aria-pressed="false">侧视</button>',
      '<button type="button" data-view="orbit" aria-pressed="false">旋转</button>',
      "</div></div>",
      '<div class="dimension-stage"><div class="dimension-stack">' + layers + "</div></div>",
      '<div class="dimension-slider"><label for="dim-' + panel.getAttribute("data-pan-type") + '">时间 / 状态维度</label>',
      '<input type="range" id="dim-' + panel.getAttribute("data-pan-type") + '" min="0" max="' + (cfg.layers.length - 1) + '" value="' + (cfg.layers.length - 1) + '">',
      '<span class="dimension-label">' + cfg.layers[cfg.layers.length - 1].name + "</span></div>",
      '<div class="dimension-legend"><b>读法</b><span>Z 轴＝结构层</span><span>滑杆＝时间/状态轴</span><span>当前高亮＝这一层正在生效</span></div>'
    ].join("");

    var stack = panel.querySelector(".dimension-stack");
    var slider = panel.querySelector("input");
    var label = panel.querySelector(".dimension-label");
    function updateLayer(value) {
      panel.querySelectorAll(".pan-layer").forEach(function (layer, i) {
        layer.classList.toggle("active", String(i) === value);
      });
      label.textContent = cfg.layers[Number(value)].name;
    }
    updateLayer(String(slider.value));
    slider.addEventListener("input", function () {
      updateLayer(slider.value);
    });

    panel.querySelectorAll(".dimension-controls button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        panel.querySelectorAll(".dimension-controls button").forEach(function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        btn.setAttribute("aria-pressed", "true");
        stack.classList.remove("orbit");
        stack.style.animation = "";
        if (btn.getAttribute("data-view") === "flat") {
          stack.style.transform = "rotateX(55deg) rotateZ(0deg)";
        } else if (btn.getAttribute("data-view") === "side") {
          stack.style.transform = "rotateX(12deg) rotateZ(0deg)";
        } else {
          stack.classList.add("orbit");
        }
      });
    });
  });
})();
