import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import Engine from "../assets/combination-engine.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function loadGlobal(rel, name) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox);
  return vm.runInContext(name, sandbox);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const labels = loadGlobal("assets/deep-data.js", "DEEP_FIELD_LABELS");
const deep = loadGlobal("assets/deep-data.js", "DEEP_DATA");
const jiaziDeep = loadGlobal("assets/jiazi-deep.js", "JIAZI_DEEP");
const nayinDeep = loadGlobal("assets/nayin-deep.js", "NAYIN_DEEP");

assert(Object.keys(deep).length === 22, `DEEP_DATA should have 22 symbols, got ${Object.keys(deep).length}`);
for (const key of Object.keys(deep)) {
  for (const [field] of labels) {
    assert(deep[key][field], `DEEP_DATA.${key} missing ${field}`);
  }
}

assert(Object.keys(jiaziDeep).length === 60, `JIAZI_DEEP should have 60 entries, got ${Object.keys(jiaziDeep).length}`);
for (const [key, value] of Object.entries(jiaziDeep)) {
  for (const field of ["essence", "use", "over", "verify", "luokuan"]) {
    assert(value[field], `JIAZI_DEEP.${key} missing ${field}`);
  }
}

assert(Object.keys(nayinDeep).length === 30, `NAYIN_DEEP should have 30 entries, got ${Object.keys(nayinDeep).length}`);
for (const [key, value] of Object.entries(nayinDeep)) {
  for (const field of ["sharp", "limit", "verify"]) {
    assert(value[field], `NAYIN_DEEP.${key} missing ${field}`);
  }
}

const indexHtml = read("index.html");
const jiaziMatch = indexHtml.match(/const JIAZI_60 = \[([\s\S]*?)\n\s*\];/);
assert(!!jiaziMatch, "Cannot find JIAZI_60 in index.html");
const jiazi60 = jiaziMatch
  ? [...jiaziMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1])
  : [];
assert(jiazi60.length === 60, `JIAZI_60 should have 60 entries, got ${jiazi60.length}`);
for (const line of jiazi60) {
  const key = line.split("：")[0];
  assert(jiaziDeep[key], `JIAZI_60 has ${key} but JIAZI_DEEP does not`);
}
for (const key of Object.keys(jiaziDeep)) {
  assert(jiazi60.some(line => line.startsWith(key + "：")), `JIAZI_DEEP has ${key} but JIAZI_60 does not`);
}

const translator = read("translator.html");
const nayinTerms = [...translator.matchAll(/\{ term: "([^"]+)", group: "纳音"/g)].map(m => m[1]);
assert(nayinTerms.length === 30, `translator should have 30 nayin terms, got ${nayinTerms.length}`);
for (const term of nayinTerms) {
  assert(nayinDeep[term], `translator nayin ${term} missing from NAYIN_DEEP`);
}
for (const key of Object.keys(nayinDeep)) {
  assert(nayinTerms.includes(key), `NAYIN_DEEP ${key} missing from translator`);
}

const jiaziTerms = [...translator.matchAll(/\{ term: "([^"]+)", group: "六十甲子"/g)].map(m => m[1]);
assert(jiaziTerms.length === 60, `translator should have 60 jiazi terms, got ${jiaziTerms.length}`);
for (const term of jiaziTerms) {
  assert(jiaziDeep[term], `translator jiazi ${term} missing from JIAZI_DEEP`);
}

const parsed = Engine.parseTokens("甲子 乙丑 丙寅");
assert(parsed.join(",") === "甲子,乙丑,丙寅", "Engine.parseTokens failed for 甲子 乙丑 丙寅");
assert(Engine.pairByIndex(4, 0).join(",") === "0,1", "Engine.pairByIndex first pair failed");
assert(Engine.pairByIndex(4, 5).join(",") === "2,3", "Engine.pairByIndex last pair failed");
const page = Engine.pagePairs(["甲", "乙", "丙", "丁"], 0, 2);
assert(page.pairCount === 6, "Engine.pagePairs pairCount failed");
assert(page.pageCount === 3, "Engine.pagePairs pageCount failed");
assert(page.pairs.length === 2, "Engine.pagePairs first page size failed");

const privacyPatterns = [/1[3-9]\d{9}/, /身份证/, /\b\d{17}[\dXx]\b/];
for (const file of ["index.html", "translator.html"]) {
  const content = read(file);
  for (const pattern of privacyPatterns) {
    assert(!pattern.test(content), `${file} may contain private data matching ${pattern}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: 22 symbols, 60 jiazi, 30 nayin, engine and privacy checks passed.`);
