import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function waitForPort(child) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error("server did not start in time"));
    }, 10000);
    child.stdout.on("data", chunk => {
      output += String(chunk);
      const match = output.match(/local server: http:\/\/[^:]+:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.on("exit", code => {
      clearTimeout(timer);
      reject(new Error("server exited before ready: " + code));
    });
  });
}

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  const port = await waitForPort(child);
  const base = "http://127.0.0.1:" + port;
  const pages = [
    "/",
    "/index.html",
    "/translator.html",
    "/learn.html",
    "/life.html",
    "/samples.html",
    "/排盘/八字.html",
    "/assets/deep-data.js",
    "/assets/jiazi-deep.js",
    "/assets/nayin-deep.js",
    "/assets/combination-engine.js",
    "/api/status",
    "/api/audit",
    "/api/samples",
    "/稽古.html",
    "/docs/viewer.html?file=" + encodeURIComponent("进门.md")
  ];
  for (const page of pages) {
    const res = await fetch(new URL(page, base));
    assert(res.status === 200, `${page} should return 200, got ${res.status}`);
  }
  const api = await fetch(new URL("/api/combine", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "甲子 乙丑 丙寅", page: 0, size: 100 })
  });
  const data = await api.json();
  assert(api.status === 200, "api/combine should return 200");
  assert(data.pairCount === 3, `api/combine pairCount should be 3, got ${data.pairCount}`);
  assert(data.pairs.length === 3, "api/combine should return all 3 pairs");
  const sample = await fetch(new URL("/api/samples", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "测试", time: "2026-08-12", question: "smoke test", result: "ok", source: "匿名" })
  });
  const sampleData = await sample.json();
  assert(sample.status === 200 && sampleData.ok, "api/samples POST should save a sample");
  const exportRes = await fetch(new URL("/api/samples/export", base));
  const exportData = await exportRes.json();
  assert(exportRes.status === 200 && Array.isArray(exportData.samples), "api/samples/export should return an array");
  const ai = await fetch(new URL("/api/ai", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "客户不回复" })
  });
  const aiData = await ai.json();
  assert(ai.status === 200 && aiData.ok && aiData.engine === "rule", "api/ai should return rule fallback");

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`OK: ${pages.length} routes + combination API passed.`);
  }
} finally {
  child.kill();
}
