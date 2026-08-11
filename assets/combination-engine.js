(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CombinationEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

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

  function pairCount(n) {
    return n * (n - 1) / 2;
  }

  function pagePairs(tokens, page, size) {
    const n = tokens.length;
    const total = pairCount(n);
    const safeSize = Math.min(200, Math.max(1, size || 100));
    const pageCount = Math.max(1, Math.ceil(total / safeSize));
    const currentPage = Math.min(Math.max(0, page || 0), pageCount - 1);
    const start = currentPage * safeSize;
    const end = Math.min(start + safeSize, total);
    const pairs = [];
    for (let idx = start; idx < end; idx += 1) {
      const [i, j] = pairByIndex(n, idx);
      pairs.push([tokens[i], tokens[j]]);
    }
    return { pairs, pairCount: total, page: currentPage, pageCount, size: safeSize };
  }

  return { GAN, ZHI, parseTokens, pairByIndex, pairCount, pagePairs };
});
