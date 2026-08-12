const http = require("http");
const fs = require("fs");
const path = require("path");
const Engine = require("./assets/combination-engine.js");

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

function appendSample(sample) {
  fs.mkdirSync(path.dirname(SAMPLES_FILE), { recursive: true });
  fs.appendFileSync(SAMPLES_FILE, JSON.stringify(sample) + "\n");
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
