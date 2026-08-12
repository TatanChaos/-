(function () {
  if (!window.THREE) return;
  var panels = document.querySelectorAll(".multi-dim[data-pan-type]");
  if (!panels.length) return;

  var CONFIG = {
    taiyi: {
      title: "太乙 · 多维盘",
      desc: "九宫为空间，天盘为结构层，算局为状态，时间与样本继续向上加维。",
      nodes: [
        ["1坎", -2, -2], ["2坤", 2, -2], ["3震", 0, 0],
        ["4巽", -2, 2], ["5中", 0, 2], ["6乾", 2, 2],
        ["7兑", -2, 0], ["8艮", 0, -2], ["9离", 2, 0]
      ],
      path: [
        { x: -2, y: 0, z: -2 },
        { x: 0, y: 2, z: 0 },
        { x: 2, y: 4, z: 2 }
      ],
      state: ["主算31", "客算16", "定算29", "文昌艮", "始击巳"],
      read: [
        ["空间", "九宫"],
        ["时间", "局"],
        ["状态", "主客算"]
      ],
      why: "现实局面同时有空间、时间、力量大小和状态。九宫给空间，局给时间，主客算给力量，所以一张平面图装不下。"
    },
    qimen: {
      title: "奇门 · 多维盘",
      desc: "九宫为空间，年/月/日/时沿时间轴堆叠，门星神与样本继续加维。",
      nodes: [
        ["4巽", -2, -2], ["9离", 2, -2], ["2坤", 0, 0],
        ["3震", -2, 2], ["5中", 0, 2], ["7兑", 2, 2],
        ["8艮", -2, 0], ["1坎", 0, -2], ["6乾", 2, 0]
      ],
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 2, z: 0 },
        { x: 0, y: 4, z: 0 },
        { x: 0, y: 6, z: 0 }
      ],
      state: ["年家", "月家", "日家", "时家", "门星神"],
      read: [
        ["空间", "九宫"],
        ["时间", "年/月/日/时"],
        ["状态", "门星神"]
      ],
      why: "同一件事会同时按年、月、日、时四个尺度发生。九宫是空间骨架，四层时间叠起来，才能表达当前在哪个尺度上。"
    },
    liuren: {
      title: "六壬 · 多维盘",
      desc: "天地盘为空间，四课为状态，三传为路径，720 课体与样本继续加维。",
      nodes: [
        ["子", -3, 0], ["丑", -2.6, 1.5], ["寅", -1.5, 2.6], ["卯", 0, 3],
        ["辰", 1.5, 2.6], ["巳", 2.6, 1.5], ["午", 3, 0], ["未", 2.6, -1.5],
        ["申", 1.5, -2.6], ["酉", 0, -3], ["戌", -1.5, -2.6], ["亥", -2.6, -1.5]
      ],
      path: [
        { x: 0, y: 0, z: 3 },
        { x: -1.5, y: 2.5, z: 2.6 },
        { x: -2.6, y: 5, z: 1.5 }
      ],
      state: ["重审", "四课", "三传", "旬空", "神煞"],
      read: [
        ["空间", "天地盘"],
        ["时间", "月将加时"],
        ["状态", "四课三传"]
      ],
      why: "一件事不是静态的，而是从起点经路径到结果。天地盘是空间，月将加时是时间旋转，四课三传是演化过程。"
    }
  };

  function makeTextSprite(text, color, scale) {
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 96);
    ctx.font = "700 36px 'Songti SC','STSong','Noto Serif SC',serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 48);
    var texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    var material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale * 0.375, 1);
    return sprite;
  }

  function makeGrid(size, divisions, color) {
    var group = new THREE.Group();
    var half = size / 2;
    var step = size / divisions;
    var material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.22 });
    for (var i = 0; i <= divisions; i += 1) {
      var x = -half + i * step;
      var pointsA = [new THREE.Vector3(x, 0, -half), new THREE.Vector3(x, 0, half)];
      var pointsB = [new THREE.Vector3(-half, 0, x), new THREE.Vector3(half, 0, x)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsA), material));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsB), material));
    }
    return group;
  }

  function makeRing(radius, y, color, opacity) {
    var points = [];
    for (var i = 0; i <= 72; i += 1) {
      var a = i / 72 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity || 0.55 })
    );
  }

  function makeMarker(color) {
    var geometry = new THREE.OctahedronGeometry(0.28);
    var material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.45 });
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  panels.forEach(function (panel) {
    var cfg = CONFIG[panel.getAttribute("data-pan-type")];
    if (!cfg) return;
    var container = document.createElement("div");
    container.className = "md-canvas";
    panel.innerHTML = [
      '<div class="md-head"><div><h3>' + cfg.title + '</h3><p>' + cfg.desc + "</p></div>",
      '<div class="md-dimensions" aria-label="维度">' +
        [3, 4, 5, 6, 7, 8, 9, 10].map(function (n) {
          return '<button type="button" data-dim="' + n + '" aria-pressed="' + (n === 4 ? "true" : "false") + '">' + n + "D</button>";
        }).join("") +
      "</div></div>",
      '<div class="md-controls"><button type="button" id="mdPlay">暂停</button>',
      '<input type="range" min="0" max="1" step="0.001" value="0" aria-label="时间维度">',
      '<span id="mdState">时间 · 0%</span></div>',
      '<div class="md-read">' + cfg.read.map(function (item) {
        return '<div><b>' + item[0] + '</b><span>' + item[1] + "</span></div>";
      }).join("") + "</div>",
      '<div class="md-why"><b>为什么用多维</b>：' + cfg.why + "</div>",
      '<div class="md-legend"><b>读法</b><span>3D 空间</span><span>4D 时间</span><span>5D 状态</span><span>6D 样本</span><span>7D 口径</span><span>8D-10D 观察/验证/流派</span></div>'
    ].join("");
    panel.appendChild(container);

    var canvasHolder = container;
    var wrap = panel.closest(".multi-dim-wrap");
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      container.innerHTML = '<div style="padding:120px 20px;text-align:center;color:#9db2ab">当前浏览器不支持 WebGL，保留平面盘面。</div>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    canvasHolder.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(11, 8, 13);
    camera.lookAt(0, 1, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 10, 7);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0x79d3c1, 0.35);
    fill.position.set(-6, 3, -5);
    scene.add(fill);

    var root = new THREE.Group();
    scene.add(root);
    root.add(makeGrid(8, 3, 0x79d3c1));
    root.add(makeRing(3.6, 0, 0xc9a85d, 0.4));
    root.add(makeRing(4.4, 0, 0x79d3c1, 0.25));

    cfg.nodes.forEach(function (node) {
      var label = makeTextSprite(node[0], "#f0ead9", 1.5);
      label.position.set(node[1], 0.35, node[2]);
      root.add(label);
      var dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xc9a85d, emissive: 0x8a5c2b, emissiveIntensity: 0.25 })
      );
      dot.position.set(node[1], 0.12, node[2]);
      root.add(dot);
    });

    var pathPoints = cfg.path.map(function (p) {
      return new THREE.Vector3(p.x, p.y, p.z);
    });
    var curve = new THREE.CatmullRomCurve3(pathPoints);
    var curveLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
      new THREE.LineBasicMaterial({ color: 0xe05a4f, transparent: true, opacity: 0.7 })
    );
    root.add(curveLine);
    var marker = makeMarker(0xe05a4f);
    root.add(marker);

    var extra = new THREE.Group();
    root.add(extra);

    var dimButtons = Array.prototype.slice.call(panel.querySelectorAll("[data-dim]"));
    var slider = panel.querySelector("input");
    var state = panel.querySelector("#mdState");
    var playBtn = panel.querySelector("#mdPlay");
    var currentDim = 4;
    var playing = true;

    function clearExtra() {
      while (extra.children.length) extra.remove(extra.children[0]);
    }

    function addStateAxis() {
      cfg.state.forEach(function (label, i) {
        var sprite = makeTextSprite(label, "#79d3c1", 1.5);
        sprite.position.set(5.6, 0.5 + i * 1.1, -3);
        extra.add(sprite);
      });
      var axis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(5.6, 0, -3), new THREE.Vector3(5.6, 6, -3)]),
        new THREE.LineBasicMaterial({ color: 0x79d3c1, transparent: true, opacity: 0.35 })
      );
      extra.add(axis);
    }

    function addSampleAxis() {
      var points = [];
      for (var i = 0; i < 12; i += 1) {
        var x = (i % 4 - 1.5) * 1.8;
        var z = (Math.floor(i / 4) - 1.5) * 1.8;
        var y = -0.2;
        points.push(new THREE.Vector3(x, y, z));
        var dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xf0ead9, emissive: 0x6d5b35, emissiveIntensity: 0.2 })
        );
        dot.position.set(x, y, z);
        extra.add(dot);
      }
      extra.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xf0ead9, transparent: true, opacity: 0.25 })
      ));
    }

    function addPerspectiveAxis(color) {
      var points = [new THREE.Vector3(-5, -1, -5), new THREE.Vector3(5, 3, 5)];
      extra.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.45 })
      ));
    }

    function applyDimension() {
      clearExtra();
      if (currentDim >= 5) addStateAxis();
      if (currentDim >= 6) addSampleAxis();
      if (currentDim >= 7) addPerspectiveAxis(0xc9a85d);
      if (currentDim >= 8) addPerspectiveAxis(0x79d3c1);
      if (currentDim >= 9) addPerspectiveAxis(0xe05a4f);
      if (currentDim >= 10) {
        var ring = makeRing(5.4, 1.2, 0xf0ead9, 0.18);
        extra.add(ring);
      }
    }

    dimButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentDim = Number(btn.getAttribute("data-dim"));
        dimButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        applyDimension();
      });
    });

    playBtn.addEventListener("click", function () {
      playing = !playing;
      playBtn.textContent = playing ? "暂停" : "播放";
    });

    function resize() {
      var w = canvasHolder.clientWidth || 400;
      var h = canvasHolder.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    if (wrap) {
      wrap.addEventListener("toggle", function () {
        if (wrap.open) resize();
      });
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvasHolder);
    }

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      var delta = clock.getDelta();
      if (playing) {
        slider.value = (Number(slider.value) + delta * 0.08) % 1;
        root.rotation.y += delta * 0.12;
      }
      var t = Number(slider.value);
      state.textContent = currentDim + "D · " + Math.round(t * 100) + "%";
      var point = curve.getPoint(t);
      marker.position.copy(point);
      marker.rotation.y = t * Math.PI * 2;
      renderer.render(scene, camera);
    }
    animate();
    applyDimension();
  });
})();
