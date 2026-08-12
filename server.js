const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const vm = require("vm");
const Engine = require("./assets/combination-engine.js");
let Solar = null;
try {
  ({ Solar } = require(process.env.LUNAR_TYPESCRIPT || "/Users/tatanchaos/Documents/Codex/tools/ziwei/node_modules/lunar-typescript"));
} catch {}

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8780);
const HOST = process.env.HOST || "0.0.0.0";
const SAMPLES_FILE = path.join(ROOT, "data", "samples-inbox.ndjson");

function loadGlobal(rel, name) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox);
  return vm.runInContext(name, sandbox);
}

const JIAZI_60 = loadGlobal("assets/jiazi-60.js", "JIAZI_60");
const JIAZI_DEEP = loadGlobal("assets/jiazi-deep.js", "JIAZI_DEEP");
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

function ruleDeepReply(text) {
  const rules = [
    { re: /杯|摔|碎|打翻|碰倒|掉地|掉到/, reply: "结构：酉+卯：精工/成品遇上并发冲击。判：东西在手里没拿稳，说明注意力被分散，像卯的忙碌撞上酉的易碎。用：先把手上非必要的事放下，一次只拿一件。验：记录专注做一件事后，意外是否减少。批注：摔的不是杯子，是节奏？" },
    { re: /客户|不回复|回复|联系/, reply: "结构：巳+丑：热连接进入冷库。判：对方不是没看见，是还没决定。用：停止追问，给一个明确选择项。验：记录给选择后是否回应。批注：你等的是客户，还是确认自己有用？" },
    { re: /钱.*卡|卡.*钱|钱不到位|缺钱|欠款|没到账/, reply: "结构：辰+申：库里有，规则卡住。判：不是没钱，是钱进不了该进的流程。用：先理清一条收支或交付规则。验：三天记录钱具体卡在哪一步。批注：你缺的是钱，还是路径？" },
    { re: /感情|喜欢|追求|对象|冷淡|复合|分手/, reply: "结构：巳+亥：热连接撞上没打开的源头。判：越追，对方越退回亥。用：停止加温，先确认对方需求。验：三天不主动联系后的反应。批注：你在乎的是人，还是回应？" },
    { re: /选择|选|纠结|要不要|该不该/, reply: "结构：寅+申：启动冲动撞上规则边界。判：不是选不了，是没把选项拆成规则。用：给每个选项写三条可执行标准。验：按标准筛选后是否更清楚。批注：你怕选错，还是怕选完要负责？" },
    { re: /忙|乱|赶|加班|多线程|批量/, reply: "结构：卯+辰：并发生产冲进大库，没人消化。判：量在涨，库存也在涨。用：先停一批，只留一条主线。验：记录减产后错误率和焦虑变化。批注：你在赶量，还是在赶自己？" },
    { re: /内容|流量|没人看|没流量|曝光/, reply: "结构：丙+亥：曝光点亮源头，但还没显形。判：内容有核，但没被看见。用：先让一个人看懂，再谈传播。验：改完一句人话后，反馈是否变化。批注：你要的是流量，还是被懂？" },
    { re: /坚持|中断|半途|断/, reply: "结构：丁+卯：灯烛被批量节奏打乱。判：你缺的不是决心，是固定时段。用：每天固定只做 30 分钟。验：记录连续 7 天是否断。批注：你守的是火，还是给自己看的努力？" },
    { re: /方向|迷茫|焦虑|没落地|想法|内耗/, reply: "结构：亥+寅：源头里有很多芽，没破土。判：不是没方向，是不敢启动。用：只选一颗芽，做三天小动作。验：三天后这颗芽有没有长大。批注：你等的是灵感，还是勇气？" },
    { re: /搬家|搬迁|出行|出发/, reply: "结构：申+巳：规则交接与连接热度同时动。判：规则先理顺，连接才接得住；否则越连越乱。用：搬迁前先列交接清单，再通知各方。验：记录搬迁后流程是否清晰、沟通是否顺畅。批注：你搬的是地方，还是没理清的规则？" }
  ];
  for (const rule of rules) {
    if (rule.re.test(text)) return rule.reply + " 真实样本回填前不作断言。";
  }
  const tokens = Engine.parseTokens(text).slice(0, 6);
  if (tokens.length) {
    return "结构：" + tokens.join("、") + "。先把现实拆成可验证的动作，再用样本回填；这是本地规则深解，不是外部 AI 断语。";
  }
  const hash = [...String(text)].reduce((s, c) => s + c.codePointAt(0), 0);
  const line = JIAZI_60[hash % JIAZI_60.length];
  const pair = line.split("：")[0];
  const d = JIAZI_DEEP[pair] || {};
  return "结构：" + line +
    "\n怎么用：" + (d.use || "先记录现实，再看结构是否变化。") +
    "\n过与不及：" + (d.over || "过则重复，不及则没有开始。") +
    "\n验证：" + (d.verify || "记录接下来 3 天的可观察变化。") +
    "\n批注：" + (d.luokuan || "留白给你。") +
    "\n这是通用结构解：真实样本回填前不作断言。";
}

function aiReply(text) {
  if (ollamaAvailable()) {
    const model = process.env.OLLAMA_MODEL || "qwen2.5:3b";
    const prompt = "你是颐真书房的表达助手。把下面的生活问题翻译成结构语言：先拆结构，再给动作，再给验证。不要算命，不要断语，不要编原文。问题：" + text;
    try {
      const reply = execSync("ollama run " + model + " " + JSON.stringify(prompt), {
        encoding: "utf8",
        timeout: 60000,
        maxBuffer: 2 * 1024 * 1024
      }).trim();
      return { engine: "ollama", reply };
    } catch {}
  }
  return { engine: "rule", reply: ruleDeepReply(text) };
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

function buildHuangli(dateStr) {
  const now = new Date();
  const match = String(dateStr || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  const day = match ? Number(match[3]) : now.getDate();
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  return {
    date: solar.toYmd(),
    lunar: lunar.toFullString(),
    dayGanZhi: lunar.getDayInGanZhi(),
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    jiShen: lunar.getDayJiShen(),
    xiongSha: lunar.getDayXiongSha(),
    pengZuGan: lunar.getPengZuGan(),
    pengZuZhi: lunar.getPengZuZhi(),
    chong: lunar.getDayChongDesc(),
    sha: lunar.getDaySha(),
    positions: {
      喜神: lunar.getDayPositionXiDesc(),
      阳贵神: lunar.getDayPositionYangGuiDesc(),
      阴贵神: lunar.getDayPositionYinGuiDesc(),
      福神: lunar.getDayPositionFuDesc(),
      财神: lunar.getDayPositionCaiDesc()
    }
  };
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

  if (parsed.pathname === "/api/ai") {
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 50000) req.destroy();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body || "{}");
          const text = String(data.text || "").slice(0, 2000);
          const result = aiReply(text);
          sendJson(res, 200, { ok: true, engine: result.engine, ollamaReady: ollamaAvailable(), reply: result.reply });
        } catch {
          sendJson(res, 400, { error: "请求体不是有效 JSON。" });
        }
      });
      return;
    }
    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        note: "这是一个 JSON 接口，不是网页。浏览器直接打开可以看状态；调用请用 POST。",
        usage: {
          method: "POST",
          url: "/api/ai",
          body: { text: "客户不回复" }
        },
        engine: "rule",
        ollamaReady: ollamaAvailable()
      });
      return;
    }
    sendJson(res, 405, { error: "Method Not Allowed" });
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
            source: String(data.source || "").slice(0, 40),
            status: String(data.status || "待验证").slice(0, 20),
            method: String(data.method || "").slice(0, 500),
            review: String(data.review || "").slice(0, 4000)
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

  if (parsed.pathname === "/api/huangli" && req.method === "GET") {
    if (!Solar) {
      sendJson(res, 501, { error: "lunar-typescript 未安装或路径不可用。" });
      return;
    }
    try {
      sendJson(res, 200, buildHuangli(parsed.searchParams.get("date") || ""));
    } catch (e) {
      sendJson(res, 400, { error: "黄历参数无法解析：" + e.message });
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
