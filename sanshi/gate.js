(function () {
  var gate = document.getElementById("agreementGate");
  if (!gate) return;
  var agree = document.getElementById("gateAgree");
  var enter = document.getElementById("gateEnter");
  var key = document.body.getAttribute("data-gate-key") || "yizhen-sanshi-gate-v1";
  var textEl = document.getElementById("agreementText");
  if (textEl) {
    textEl.innerHTML =
      '<h3>一、定位</h3>' +
      '<p>本网站用于中国古天文、传统典籍、术数与符号体系的文化研究与学习交流。所有内容均属于“拓展面候选”，不构成对现实事务的结论。</p>' +
      '<h3>二、非决策依据</h3>' +
      '<p>本网站内容不构成医疗、法律、投资、心理或其他专业建议；使用者应独立思辨，自行取舍，因采信相关内容作出的决定及其后果自行承担。</p>' +
      '<h3>三、验证边界</h3>' +
      '<p>未经过原文版本锚定、历法与时辰校准、真实样本回填的盘面和断语，不视为已验证结论。</p>' +
      '<h3>四、账号与发布</h3>' +
      '<p>当前公开版无需注册，不要求填写姓名、电话、微信号或住址；未来开放投稿时，使用者须对发布内容负责。</p>' +
      '<h3>五、隐私</h3>' +
      '<p>本地样本记录仅保存在当前浏览器中，不上传、不采集、不售出；如未来需要收集邮箱，将仅用于安全通知并在收集页单独说明。</p>' +
      '<h3>六、内容管理</h3>' +
      '<p>本网站保留对违规内容进行提示、隐藏或删除的权利；涉及违法内容将依法处理。</p>' +
      '<h3>七、版权与引用</h3>' +
      '<p>原创内容按许可规则授权；引用公开典籍与第三方资料的部分，版权归原作者所有；用户提供的素材保留原提供者权益。</p>' +
      '<h3>八、风险与更新</h3>' +
      '<p>本网站按“现状”提供，不对完整性、准确性或持续性作保证；重大变更会在页首或协议门中说明。</p>';
  }
  var accepted = false;
  try {
    accepted = localStorage.getItem(key) === "1";
  } catch (e) {}
  if (accepted) {
    gate.hidden = true;
    return;
  }
  document.body.classList.add("gate-open");
  agree.addEventListener("change", function () {
    enter.disabled = !agree.checked;
  });
  enter.addEventListener("click", function () {
    if (!agree.checked) return;
    try {
      localStorage.setItem(key, "1");
    } catch (e) {}
    gate.hidden = true;
    document.body.classList.remove("gate-open");
  });
})();
