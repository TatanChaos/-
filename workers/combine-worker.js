const { parentPort } = require("worker_threads");
const Engine = require("../assets/combination-engine.js");

parentPort.on("message", ({ text, page, size } = {}) => {
  const tokens = Engine.parseTokens(String(text || ""));
  const result = Engine.pagePairs(tokens, page, size);
  parentPort.postMessage({
    tokens: tokens.slice(0, 100),
    tokenCount: tokens.length,
    pairCount: result.pairCount,
    page: result.page,
    pageCount: result.pageCount,
    size: result.size,
    pairs: result.pairs
  });
});
