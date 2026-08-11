const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8780);
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
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

function parseTokens(text) {
  const cleaned = String(text).replace(/[，,、。；;和与及vsVS對对对照]/g, " ");
  const re = /([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])|([甲乙丙丁戊己庚辛壬癸])|([子丑寅卯辰巳午未申酉戌亥])/g;
  const out = [];
  let m;
  while ((m = re.exec(cleaned)) !== null) out.push(m[1] || m[2] || m[3]);
  return out;
}

function pairByIndex(n, idx) {
  let i = 0;
  let remaining = idx;
  while (remaining >= n - 1 - i) {
    remaining -= n - 1 - i;
    i += 1;
  }
  return [i, i + 1 + remaining];
}

function handleCombine(text, page, size, res) {
  const tokens = parseTokens(text);
  if (tokens.length < 2) {
    sendJson(res, 400, { error: "请至少写两个对象，例如：甲子 乙丑 丙寅；或 甲 子 午。" });
    return;
  }
  const pairCount = tokens.length * (tokens.length - 1) / 2;
  const pageCount = Math.max(1, Math.ceil(pairCount / size));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * size;
  const end = Math.min(start + size, pairCount);
  const pairs = [];
  for (let idx = start; idx < end; idx += 1) {
    const [i, j] = pairByIndex(tokens.length, idx);
    pairs.push([tokens[i], tokens[j]]);
  }
  sendJson(res, 200, {
    tokens: tokens.slice(0, 100),
    tokenCount: tokens.length,
    pairCount,
    page: currentPage,
    pageCount,
    size,
    pairs
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, "http://127.0.0.1:" + PORT);

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

server.listen(PORT, "127.0.0.1", () => {
  console.log("颐真书房 local server: http://127.0.0.1:" + PORT);
});
