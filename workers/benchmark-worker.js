const { parentPort } = require("worker_threads");

parentPort.on("message", ({ duration = 600 } = {}) => {
  const end = Date.now() + Number(duration);
  let ops = 0;
  while (Date.now() < end) {
    let hash = 0;
    for (let i = 0; i < 4096; i += 1) {
      hash = (hash * 31 + i) % 2147483647;
    }
    ops += 1;
  }
  parentPort.postMessage({ ops });
});
