const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const Engine = require("./assets/combination-engine.js");
let Solar = null;
try {
  ({ Solar } = require(process.env.LUNAR_TYPESCRIPT || "/Users/tatanchaos/Documents/Codex/tools/ziwei/node_modules/lunar-typescript"));
} catch {}

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8780);
const HOST = process.env.HOST || "0.0.0.0";
const SAMPLES_FILE = path.join(ROOT, "data", "samples-inbox.ndjson");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8"
};

function handleCombine(text, page, size, res) {
  const tokens = Engine.parseTokens(text);
  if (tokens.length < 2) {
    sendJson(res, 400, { error: "请至少写两个对象，例如：甲子 乙丑 丙寅；或 甲 子 午。" });
    return;
  }
  const result = Engine.pagePairs(tokens, page, size);
  sendJson(res, 200, {
    tokens: tokens.slice(0, 100),
    tokenCount: tokens.length,
    pairCount: result.pairCount,
    page: result.page,
    pageCount: result.pageCount,
    size: result.size,
    pairs: result.pairs
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function countKeys(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const matches = text.match(/^  "[^"]+": \{/gm);
  return matches ? matches.length : 0;
}

function readSampleCount() {
  try {
    return fs.readFileSync(SAMPLES_FILE, "utf8").split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

function readSamples() {
  try {
    return fs.readFileSync(SAMPLES_FILE, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function appendSample(sample) {
  fs.mkdirSync(path.dirname(SAMPLES_FILE), { recursive: true });
  fs.appendFileSync(SAMPLES_FILE, JSON.stringify(sample) + "\n");
}

function auditStatus(src) {
  if (/待补原文|待确认|待收录|待锚定|初笺待复核/.test(src)) return "pending";
  if (/待复核/.test(src) && !/通行|流派差异/.test(src)) return "pending";
  if (/颐真初笺|初笺|通行|流派差异/.test(src)) return "synthetic";
  if (src.includes("已对校")) return "verified";
  return "verified";
}

function auditSummary() {
  const deepText = fs.readFileSync(path.join(ROOT, "assets/deep-data.js"), "utf8");
  const deepSources = [...deepText.matchAll(/source: "([^"]+)"/g)].map(m => m[1]);
  const translator = fs.readFileSync(path.join(ROOT, "translator.html"), "utf8");
  const terms = [...translator.matchAll(/\{ term: "([^"]+)", group: "([^"]+)", src: "([^"]+)"/g)].map(m => m[3]);
  const all = [...deepSources, ...terms];
  const counts = { total: all.length, verified: 0, synthetic: 0, pending: 0 };
  for (const src of all) {
    const status = auditStatus(src);
    counts[status] += 1;
  }
  const docs = fs.readdirSync(path.join(ROOT, "docs")).filter(f => f.endsWith(".md"));
  let docsPending = 0;
  for (const file of docs) {
    const content = fs.readFileSync(path.join(ROOT, "docs", file), "utf8");
    const matches = content.match(/待复核|待补原文|待确认|待收录|待锚定/g);
    docsPending += matches ? matches.length : 0;
  }
  return { ...counts, docsPending };
}

function ollamaAvailable() {
  try {
    execSync("which ollama", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function buildBaziText(dt, gender) {
  const now = new Date();
  const match = String(dt || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  const day = match ? Number(match[3]) : now.getDate();
  const hour = match && match[4] ? Number(match[4]) : now.getHours();
  const minute = match && match[5] ? Number(match[5]) : now.getMinutes();
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const yun = ec.getYun(gender === "女" ? 1 : 0, 1);
  const dayun = yun.getDaYun(8).map(d => d.getGanZhi()).join(" ");
  return [
    "八字: " + [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(" "),
    "藏干: 年[" + ec.getYearHideGan().join("") + "] 月[" + ec.getMonthHideGan().join("") + "] 日[" + ec.getDayHideGan().join("") + "] 时[" + ec.getTimeHideGan().join("") + "]",
    "十神: 年[" + ec.getYearShiShenGan() + "] 月[" + ec.getMonthShiShenGan() + "] 日主[" + ec.getDayShiShenGan() + "] 时[" + ec.getTimeShiShenGan() + "]",
    "纳音: 年[" + ec.getYearNaYin() + "] 月[" + ec.getMonthNaYin() + "] 日[" + ec.getDayNaYin() + "] 时[" + ec.getTimeNaYin() + "]",
    "农历: " + lunar.toFullString(),
    "日空: " + ec.getDayXunKong(),
    "起运: " + yun.getStartSolar().toYmd(),
    "大运: " + dayun
  ].join("\n");
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, "http://127.0.0.1:" + PORT);

  if (parsed.pathname === "/api/status") {
    sendJson(res, 200, {
      ok: true,
      service: "yizhen-shufang",
      symbols: countKeys("assets/deep-data.js"),
      jiazi: countKeys("assets/jiazi-deep.js"),
      nayin: countKeys("assets/nayin-deep.js"),
      engine: true,
      serverTime: new Date().toISOString()
    });
    return;
  }

  if (parsed.pathname === "/api/audit") {
    sendJson(res, 200, auditSummary());
    return;
  }

  if (parsed.pathname === "/api/ai" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const text = String(data.text || "").slice(0, 2000);
        const tokens = Engine.parseTokens(text).slice(0, 6);
        const reply = tokens.length
          ? "结构：" + tokens.join("、") + "。先把现实拆成可验证的动作，再用样本回填；这是本地规则深解，不是外部 AI 断语。"
          : "暂时没读到干支结构。请再写一个具体生活问题，例如：客户不回复、钱卡住、想太多不动。";
        sendJson(res, 200, { ok: true, engine: "rule", ollamaReady: ollamaAvailable(), reply });
      } catch {
        sendJson(res, 400, { error: "请求体不是有效 JSON。" });
      }
    });
    return;
  }

  if (parsed.pathname === "/api/samples") {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, count: readSampleCount() });
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 200000) req.destroy();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body || "{}");
          const sample = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            at: new Date().toISOString(),
            category: String(data.category || "").slice(0, 40),
            time: String(data.time || "").slice(0, 120),
            question: String(data.question || "").slice(0, 2000),
            result: String(data.result || "").slice(0, 4000),
            source: String(data.source || "").slice(0, 40)
          };
          if (!sample.category || !sample.question) {
            sendJson(res, 400, { error: "类别和原话问题不能为空。" });
            return;
          }
          appendSample(sample);
          sendJson(res, 200, { ok: true, id: sample.id });
        } catch {
          sendJson(res, 400, { error: "请求体不是有效 JSON。" });
        }
      });
      return;
    }
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  if (parsed.pathname === "/api/samples/export" && req.method === "GET") {
    sendJson(res, 200, { ok: true, samples: readSamples() });
    return;
  }

  if (parsed.pathname === "/api/bazi" && req.method === "GET") {
    if (!Solar) {
      sendJson(res, 501, { error: "lunar-typescript 未安装或路径不可用。" });
      return;
    }
    try {
      const text = buildBaziText(parsed.searchParams.get("dt"), parsed.searchParams.get("gender") || "男");
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(text);
    } catch (e) {
      sendJson(res, 400, { error: "排盘参数无法解析：" + e.message });
    }
    return;
  }

  if (parsed.pathname === "/api/combine") {
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) req.destroy();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body || "{}");
          const page = Math.max(0, Number(data.page || 0) || 0);
          const size = Math.min(200, Math.max(1, Number(data.size || 100) || 100));
          handleCombine(String(data.text || ""), page, size, res);
        } catch {
          sendJson(res, 400, { error: "请求体不是有效 JSON。" });
        }
      });
      return;
    }
    const page = Math.max(0, Number(parsed.searchParams.get("page") || "0") || 0);
    const size = Math.min(200, Math.max(1, Number(parsed.searchParams.get("size") || "100") || 100));
    handleCombine(parsed.searchParams.get("text") || "", page, size, res);
    return;
  }

  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  const actualPort = server.address().port;
  console.log("颐真书房 local server: http://" + HOST + ":" + actualPort);
});
