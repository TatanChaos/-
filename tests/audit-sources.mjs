import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadGlobal(rel, name) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox);
  return vm.runInContext(name, sandbox);
}

const deep = loadGlobal("assets/deep-data.js", "DEEP_DATA");
const translator = fs.readFileSync(path.join(root, "translator.html"), "utf8");
const tradMap = {
  "隂": "阴", "陽": "阳", "萬": "万", "體": "体", "爾": "尔", "爲": "为",
  "無": "无", "氣": "气", "見": "见", "長": "长", "盡": "尽", "後": "后",
  "時": "时", "會": "会", "國": "国", "書": "书", "義": "义", "猶": "犹",
  "倫": "伦", "殺": "杀", "極": "极", "滅": "灭", "閡": "阂", "閉": "闭"
};
function simplifyChinese(s) {
  return [...String(s)].map(ch => tradMap[ch] || ch).join("");
}
function normalize(s) {
  return simplifyChinese(s).replace(/[。，、；：\s“”"'《》（）()]/g, "");
}
const references = {
  五行大义: normalize(fs.readFileSync(path.join(root, "tests/fixtures/五行大义-干支名义.txt"), "utf8")),
  史记: normalize(fs.readFileSync(path.join(root, "tests/fixtures/史记-律书-干支名义.txt"), "utf8"))
};
function verifiedSource(src) {
  if (!src.includes("已对校")) return false;
  const body = src.replace(/[（(]已对校[）)]/g, "").replace(/^《五行大义》/, "");
  const segments = body.split(/[；;，,]/).map(s => s.replace(/^[^：]{0,12}：/, "")).filter(Boolean);
  return segments.every(seg => references.五行大义.includes(normalize(seg)) || references.史记.includes(normalize(seg)));
}
const terms = [...translator.matchAll(/\{ term: "([^"]+)", group: "([^"]+)", src: "([^"]+)"/g)].map(m => ({
  term: m[1],
  group: m[2],
  src: m[3]
}));

const groups = {
  干支: Object.values(deep).map(d => d.source),
  甲子: terms.filter(t => t.group === "六十甲子").map(t => t.src),
  纳音: terms.filter(t => t.group === "纳音").map(t => t.src),
  翻译: terms.filter(t => !["六十甲子", "纳音"].includes(t.group)).map(t => t.src)
};

function sourceStatus(src) {
  if (/待复核|待补|待确认|待收录|待锚定|流派差异/.test(src)) return "pending";
  if (/颐真初笺|初笺|通行/.test(src)) return "synthetic";
  if (src.includes("已对校")) return verifiedSource(src) ? "verified" : "pending";
  return "verified";
}

let total = 0;
let anchored = 0;
let synthetic = 0;
let pendingCount = 0;
const pendingSamples = [];

for (const [group, sources] of Object.entries(groups)) {
  for (const src of sources) {
    total += 1;
    const status = sourceStatus(src);
    if (status === "verified") {
      anchored += 1;
    } else if (status === "synthetic") {
      synthetic += 1;
    } else {
      pendingCount += 1;
      if (pendingSamples.length < 24) pendingSamples.push(`${group} · ${src}`);
    }
  }
}

const docs = fs.readdirSync(path.join(root, "docs")).filter(f => f.endsWith(".md"));
const docPending = [];
for (const file of docs) {
  const content = fs.readFileSync(path.join(root, "docs", file), "utf8");
  const count = (content.match(/待复核|待补原文|待确认|待收录|待锚定/g) || []).length;
  if (count > 0) docPending.push(`${file}: ${count}`);
}

console.log(`稽古状态`);
console.log(`原文/出处条目：${total}`);
console.log(`已锚定：${anchored}`);
console.log(`颐真初笺/通行：${synthetic}`);
console.log(`待复核/待补：${pendingCount}`);
console.log(`文档待补标记：${docs.length} 篇中 ${docPending.length} 篇仍有待补`);
if (pendingSamples.length) {
  console.log("\n待复核样例：");
  pendingSamples.forEach(line => console.log("- " + line));
}
if (docPending.length) {
  console.log("\n文档待补样例：");
  docPending.slice(0, 10).forEach(line => console.log("- " + line));
}
