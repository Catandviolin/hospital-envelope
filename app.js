const $ = (id) => document.getElementById(id);

const KEYS = {
  hospitals: "referral_app_custom_hospitals_v1",
  sender: "referral_app_sender_v1"
};

function loadCustomHospitals() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.hospitals) || "[]");
  } catch {
    return [];
  }
}

function saveCustomHospitals(items) {
  localStorage.setItem(KEYS.hospitals, JSON.stringify(items));
}

function allHospitals() {
  const custom = loadCustomHospitals();
  const defaults = Array.isArray(window.DEFAULT_HOSPITALS) ? window.DEFAULT_HOSPITALS : [];
  const merged = [...custom, ...defaults];
  const seen = new Set();
  return merged.filter(h => {
    const key = `${h.name}|${h.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

function renderSearchResults(query) {
  const box = $("searchResults");
  box.innerHTML = "";
  const q = normalize(query);
  if (!q) return;

  const results = allHospitals()
    .filter(h => normalize(h.name).includes(q) || normalize(h.address).includes(q))
    .slice(0, 12);

  if (!results.length) {
    box.innerHTML = '<div class="hint">登録済み病院に見つかりません。「Googleで検索」後、未登録病院として追加してください。</div>';
    return;
  }

  results.forEach(h => {
    const btn = document.createElement("button");
    btn.className = "search-result";
    btn.type = "button";
    btn.innerHTML = `<strong>${escapeHtml(h.name)}</strong><small>〒${escapeHtml(h.postalCode || "")} ${escapeHtml(h.address || "")}${h.fax ? " / FAX " + escapeHtml(h.fax) : ""}</small>`;
    btn.addEventListener("click", () => selectHospital(h));
    box.appendChild(btn);
  });
}

function selectHospital(h) {
  $("selectedHospital").value = h.name || "";
  $("postalCode").value = h.postalCode || "";
  $("address").value = h.address || "";
  $("faxNumber").value = h.fax || "";
  $("hospitalSearch").value = h.name || "";
  $("searchResults").innerHTML = "";
  updateAllPreviews();
  document.querySelectorAll("input, select, textarea").forEach(el => el.blur());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRecipientLines() {
  const hospital = $("selectedHospital").value.trim();
  const dept = $("department").value.trim();
  const doctor = $("doctorName").value.trim();
  const type = $("honorific").value;

  let deptLine = dept;
  let doctorLine = "";

  if (type === "desk") {
    doctorLine = doctor ? `${doctor} 先生　御机下` : "先生　御机下";
  } else if (type === "sama") {
    doctorLine = doctor ? `${doctor} 先生` : "先生";
  } else if (type === "department") {
    deptLine = dept ? `${dept}　御中` : "御中";
  } else if (type === "hospital") {
    deptLine = "";
    doctorLine = "";
  }

  return { hospital, deptLine, doctorLine, dept, doctor, type };
}

function updateEnvelopePreview() {
  const postal = $("postalCode").value.trim();
  const address = $("address").value.trim();
  const r = formatRecipientLines();

  $("envPostal").textContent = postal ? `〒${postal}` : "〒";
  $("envAddress").textContent = address || "住所";
  $("envHospital").textContent = r.hospital || "病院名";

  if (r.type === "hospital") {
    $("envHospital").textContent = r.hospital ? `${r.hospital}　御中` : "病院名　御中";
    $("envDepartment").textContent = "";
    $("envDoctor").textContent = "";
  } else {
    $("envDepartment").textContent = r.deptLine;
    $("envDoctor").textContent = r.doctorLine;
  }
}

function todayJapanese() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function recipientForFax() {
  const r = formatRecipientLines();
  const lines = [];
  if (r.type === "hospital") {
    if (r.hospital) lines.push(`${r.hospital}　御中`);
    return lines.join("\n");
  }
  if (r.hospital) lines.push(r.hospital);
  if (r.deptLine) lines.push(r.deptLine);
  if (r.doctorLine) lines.push(r.doctorLine);
  return lines.join("\n");
}

function updateFaxPreview() {
  $("faxDateCell").textContent = todayJapanese();
  $("faxToCell").textContent = recipientForFax();
  $("faxToNumberCell").textContent = $("faxNumber").value.trim();

  $("faxFromCell").textContent = $("senderClinic").value.trim();
  const tel = $("senderTel").value.trim();
  const fax = $("senderFax").value.trim();
  $("faxFromNumberCell").textContent = [tel ? `TEL ${tel}` : "", fax ? `FAX ${fax}` : ""].filter(Boolean).join(" / ");

  $("faxSenderCell").textContent = $("senderName").value.trim();
  const pages = $("faxPages").value.trim();
  $("faxPagesCell").textContent = pages ? `本状を含め ${pages} 枚` : "";
  $("faxSubjectCell").textContent = $("faxSubject").value.trim();
  $("faxMessageCell").textContent = $("faxMessage").value;
}

function updateAllPreviews() {
  updateEnvelopePreview();
  updateFaxPreview();
}

function printEnvelope() {
  const postal = $("postalCode").value.trim();
  const address = $("address").value.trim();
  const r = formatRecipientLines();

  const hospitalText = r.type === "hospital"
    ? `${r.hospital || "病院名"}　御中`
    : (r.hospital || "病院名");

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>長3封筒</title>
<style>
@page { size: 235mm 120mm; margin: 0; }
html,body { margin:0; padding:0; width:235mm; height:120mm; background:#fff; }
body {
  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;
}
.envelope { position:relative; width:235mm; height:120mm; overflow:hidden; }
.postal { position:absolute; top:18mm; left:19mm; font-size:5.6mm; letter-spacing:.6mm; }
.address { position:absolute; top:33mm; left:19mm; right:16mm; font-size:6mm; line-height:1.45; }
.hospital { position:absolute; top:58mm; left:62mm; right:15mm; font-size:8mm; font-weight:700; }
.department { position:absolute; top:75mm; left:62mm; right:15mm; font-size:7mm; }
.doctor { position:absolute; top:91mm; left:62mm; right:15mm; font-size:8mm; font-weight:700; }
</style>
</head>
<body>
<div class="envelope">
  <div class="postal">${escapeHtml(postal ? "〒"+postal : "")}</div>
  <div class="address">${escapeHtml(address)}</div>
  <div class="hospital">${escapeHtml(hospitalText)}</div>
  <div class="department">${escapeHtml(r.type === "hospital" ? "" : r.deptLine)}</div>
  <div class="doctor">${escapeHtml(r.type === "hospital" ? "" : r.doctorLine)}</div>
</div>
<script>
window.onload = () => setTimeout(() => window.print(), 250);
<\/script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("ポップアップがブロックされました。Safariのポップアップブロックを一時的に解除してください。");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function printFax() {
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FAX送付状</title>
<style>
@page { size:A4; margin:15mm; }
body { font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif; color:#111; }
h1 { text-align:center; font-size:22pt; margin:0 0 12mm; }
table { width:100%; border-collapse:collapse; font-size:11.5pt; }
th,td { border:1px solid #333; padding:3mm; vertical-align:top; }
th { width:31mm; background:#f2f2f2; text-align:left; }
.message { margin-top:10mm; white-space:pre-wrap; font-size:12pt; line-height:1.8; }
.note { margin-top:12mm; font-size:9pt; color:#444; }
</style>
</head>
<body>
<h1>FAX送付状</h1>
<table>
<tr><th>送信日</th><td>${escapeHtml(todayJapanese())}</td></tr>
<tr><th>送信先</th><td style="white-space:pre-wrap">${escapeHtml(recipientForFax())}</td></tr>
<tr><th>FAX</th><td>${escapeHtml($("faxNumber").value.trim())}</td></tr>
<tr><th>送信元</th><td>${escapeHtml($("senderClinic").value.trim())}</td></tr>
<tr><th>TEL / FAX</th><td>${escapeHtml([
  $("senderTel").value.trim() ? "TEL "+$("senderTel").value.trim() : "",
  $("senderFax").value.trim() ? "FAX "+$("senderFax").value.trim() : ""
].filter(Boolean).join(" / "))}</td></tr>
<tr><th>送信者</th><td>${escapeHtml($("senderName").value.trim())}</td></tr>
<tr><th>送信枚数</th><td>${escapeHtml($("faxPages").value.trim() ? `本状を含め ${$("faxPages").value.trim()} 枚` : "")}</td></tr>
<tr><th>件名</th><td>${escapeHtml($("faxSubject").value.trim())}</td></tr>
</table>
<div class="message">${escapeHtml($("faxMessage").value)}</div>
<div class="note">※送信先FAX番号は、送信前に必ず確認してください。</div>
<script>
window.onload = () => setTimeout(() => window.print(), 250);
<\/script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("ポップアップがブロックされました。Safariのポップアップブロックを一時的に解除してください。");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function loadSender() {
  try {
    const s = JSON.parse(localStorage.getItem(KEYS.sender) || "{}");
    $("senderClinic").value = s.clinic || "";
    $("senderTel").value = s.tel || "";
    $("senderFax").value = s.fax || "";
    $("senderName").value = s.name || "";
  } catch {}
}

function saveSender() {
  const s = {
    clinic: $("senderClinic").value.trim(),
    tel: $("senderTel").value.trim(),
    fax: $("senderFax").value.trim(),
    name: $("senderName").value.trim()
  };
  localStorage.setItem(KEYS.sender, JSON.stringify(s));
  alert("送信元情報をこのiPadに保存しました。");
}

function addHospital() {
  const name = $("newHospitalName").value.trim();
  const postalCode = $("newPostalCode").value.trim();
  const address = $("newAddress").value.trim();
  const fax = $("newFax").value.trim();

  if (!name || !address) {
    alert("病院名と住所を入力してください。");
    return;
  }

  const custom = loadCustomHospitals();
  custom.unshift({ name, postalCode, address, fax });
  saveCustomHospitals(custom);

  selectHospital({ name, postalCode, address, fax });

  $("newHospitalName").value = "";
  $("newPostalCode").value = "";
  $("newAddress").value = "";
  $("newFax").value = "";

  alert("病院を登録しました。次回から検索候補に表示されます。");
}

function clearRecipient() {
  ["selectedHospital","postalCode","address","faxNumber","department","doctorName","hospitalSearch"]
    .forEach(id => $(id).value = "");
  $("honorific").value = "desk";
  $("searchResults").innerHTML = "";
  updateAllPreviews();
}

function resetApp() {
  if (!confirm("送信元情報と現在の入力内容を初期化しますか？登録した病院は残ります。")) return;
  localStorage.removeItem(KEYS.sender);
  clearRecipient();
  ["senderClinic","senderTel","senderFax","senderName"].forEach(id => $(id).value = "");
  $("faxPages").value = "2";
  $("faxSubject").value = "診療情報提供書送付の件";
  $("faxMessage").value = "いつも大変お世話になっております。\n診療情報提供書を送付いたします。\nご査収のほど、よろしくお願いいたします。";
  updateAllPreviews();
}

function googleSearch() {
  const q = $("hospitalSearch").value.trim() || $("selectedHospital").value.trim();
  if (!q) {
    alert("病院名を入力してから検索してください。");
    return;
  }
  const url = `https://www.google.com/search?q=${encodeURIComponent(q + " 住所 FAX")}`;
  window.open(url, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
  loadSender();
  updateAllPreviews();

  $("hospitalSearch").addEventListener("input", e => renderSearchResults(e.target.value));
  $("googleSearchBtn").addEventListener("click", googleSearch);
  $("addHospitalBtn").addEventListener("click", addHospital);

  $("printEnvelopeBtn").addEventListener("click", printEnvelope);
  $("printFaxBtn").addEventListener("click", printFax);
  $("saveSenderBtn").addEventListener("click", saveSender);
  $("clearRecipientBtn").addEventListener("click", clearRecipient);
  $("resetAppBtn").addEventListener("click", resetApp);

  document.querySelectorAll("input, select, textarea").forEach(el => {
    el.addEventListener("input", updateAllPreviews);
    el.addEventListener("change", updateAllPreviews);
  });
});
