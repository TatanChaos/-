self.onmessage = function (event) {
  var duration = Number(event.data && event.data.duration) || 600;
  var end = Date.now() + duration;
  var ops = 0;
  while (Date.now() < end) {
    var hash = 0;
    for (var i = 0; i < 4096; i += 1) {
      hash = (hash * 31 + i) % 2147483647;
    }
    ops += 1;
  }
  self.postMessage({ ops: ops });
};
