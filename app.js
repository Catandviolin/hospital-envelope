(() => {
  "use strict";

  // Public Nominatim policy:
  // - no more than 1 request/second
  // - valid Referer or User-Agent
  // - attribution
  // - cache repeated queries
  // This app uses the browser's Referer, waits >= 1.1 sec between searches,
  // and caches results in localStorage.
  const NOMINATIM = "https://nominatim.openstreetmap.org/search";
  const CACHE_KEY = "hospital-envelope-search-cache-v1";
  const SETTINGS_KEY = "hospital-envelope-settings-v1";

  const $ = (id) => document.getElementById(id);

  const el = {
    query: $("hospitalQuery"),
    searchBtn: $("searchBtn"),
    status: $("status"),
    results: $("results"),
    postal: $("postal"),
    address: $("address"),
    hospital: $("hospitalName"),
    department: $("department"),
    doctor: $("doctor"),
    offsetX: $("offsetX"),
    offsetY: $("offsetY"),
    fontSize: $("fontSize"),
    offsetXValue: $("offsetXValue"),
    offsetYValue: $("offsetYValue"),
    fontSizeValue: $("fontSizeValue"),
    printContent: $("printContent"),
    previewPostal: $("previewPostal"),
    previewAddress: $("previewAddress"),
    previewHospital: $("previewHospital"),
    previewDepartment: $("previewDepartment"),
    previewRecipient: $("previewRecipient"),
    printBtn: $("printBtn"),
    clearBtn: $("clearBtn"),
  };

  let lastRequestAt = 0;
  let activeController = null;

  function loadJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function normalizePostal(value = "") {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length === 7) return `${digits.slice(0,3)}-${digits.slice(3)}`;
    return String(value).replace(/^〒\s*/, "").trim();
  }

  function pickName(item) {
    if (item.name) return item.name;
    const first = (item.display_name || "").split(",")[0].trim();
    return first || "名称不明";
  }

  function makeJapaneseAddress(a = {}) {
    // Nominatim fields vary by region/object.
    // Use Japanese administrative order and remove duplicates.
    const parts = [
      a.province || a.state,
      a.city || a.town || a.village || a.municipality,
      a.city_district || a.borough,
      a.suburb || a.quarter || a.neighbourhood,
      a.road,
      a.house_number
    ].filter(Boolean);

    const unique = [];
    for (const p of parts) {
      if (!unique.includes(p)) unique.push(p);
    }
    return unique.join("");
  }

  function cacheGet(query) {
    const cache = loadJSON(CACHE_KEY, {});
    const entry = cache[query];
    if (!entry) return null;
    // 30-day cache
    if (Date.now() - entry.time > 30 * 24 * 60 * 60 * 1000) return null;
    return entry.data;
  }

  function cacheSet(query, data) {
    const cache = loadJSON(CACHE_KEY, {});
    cache[query] = { time: Date.now(), data };
    // Keep at most 50 distinct searches
    const keys = Object.keys(cache).sort((a,b) => cache[b].time - cache[a].time);
    for (const k of keys.slice(50)) delete cache[k];
    saveJSON(CACHE_KEY, cache);
  }

  async function waitForRateLimit() {
    const elapsed = Date.now() - lastRequestAt;
    const wait = Math.max(0, 1100 - elapsed);
    if (wait) await new Promise(r => setTimeout(r, wait));
  }

  async function searchHospitals() {
    const query = el.query.value.trim();
    if (query.length < 2) {
      el.status.textContent = "病院名を2文字以上入力してください。";
      return;
    }

    const normalized = query.toLowerCase();
    const cached = cacheGet(normalized);
    if (cached) {
      renderResults(cached, true);
      return;
    }

    if (activeController) activeController.abort();
    activeController = new AbortController();

    el.searchBtn.disabled = true;
    el.status.textContent = "検索中…";
    el.results.innerHTML = "";

    try {
      await waitForRateLimit();

      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        namedetails: "1",
        "accept-language": "ja",
        countrycodes: "jp",
        limit: "8"
      });

      lastRequestAt = Date.now();
      const response = await fetch(`${NOMINATIM}?${params.toString()}`, {
        method: "GET",
        mode: "cors",
        signal: activeController.signal,
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      cacheSet(normalized, data);
      renderResults(data, false);
    } catch (err) {
      if (err.name === "AbortError") return;
      el.status.textContent =
        "検索できませんでした。通信状態を確認するか、住所・病院名を手入力してください。";
    } finally {
      el.searchBtn.disabled = false;
      activeController = null;
    }
  }

  function renderResults(data, fromCache) {
    el.results.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) {
      el.status.textContent =
        "候補が見つかりませんでした。病院名を短くするか、住所・病院名を手入力してください。";
      return;
    }

    el.status.textContent = `${data.length}件の候補${fromCache ? "（保存済み検索結果）" : ""}`;

    data.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "result";
      btn.setAttribute("role", "listitem");

      const name = pickName(item);
      const postal = normalizePostal(item.address?.postcode || "");
      const address = makeJapaneseAddress(item.address || {});
      const fallback = (item.display_name || "").replace(/,\s*/g, " ");

      const strong = document.createElement("strong");
      strong.textContent = name;
      const span = document.createElement("span");
      span.textContent = `${postal ? "〒" + postal + " " : ""}${address || fallback}`;

      btn.append(strong, span);
      btn.addEventListener("click", () => {
        el.postal.value = postal;
        el.address.value = address || fallback;
        el.hospital.value = name;
        updatePreview();
        el.status.textContent = `「${name}」を選択しました。住所を確認してください。`;
        window.scrollTo({ top: el.postal.getBoundingClientRect().top + window.scrollY - 20, behavior: "smooth" });
      });

      el.results.appendChild(btn);
    });
  }

  function getRecipientType() {
    return document.querySelector('input[name="recipientType"]:checked')?.value || "doctor";
  }

  function updatePreview() {
    const postal = normalizePostal(el.postal.value);
    const address = el.address.value.trim();
    const hospital = el.hospital.value.trim();
    const dept = el.department.value.trim();
    const doctor = el.doctor.value.trim();
    const type = getRecipientType();

    el.previewPostal.textContent = postal ? `〒${postal}` : "";
    el.previewAddress.textContent = address;
    el.previewHospital.textContent = hospital;
    el.previewDepartment.textContent = type === "hospital" ? "" : dept;

    if (type === "doctor") {
      el.previewRecipient.textContent = doctor ? `${doctor} 先生　御机下` : "先生　御机下";
    } else if (type === "department") {
      el.previewRecipient.textContent = dept ? `${dept} 御中` : "御中";
      el.previewDepartment.textContent = "";
    } else {
      el.previewRecipient.textContent = hospital ? "御中" : "御中";
    }

    const x = Number(el.offsetX.value);
    const y = Number(el.offsetY.value);
    const fs = Number(el.fontSize.value);

    el.printContent.style.transform = `translate(${x}mm, ${y}mm)`;
    el.printContent.style.fontSize = `${fs}pt`;

    el.offsetXValue.textContent = `${x} mm`;
    el.offsetYValue.textContent = `${y} mm`;
    el.fontSizeValue.textContent = `${fs} pt`;

    saveJSON(SETTINGS_KEY, { x, y, fs, type });
  }

  function restoreSettings() {
    const s = loadJSON(SETTINGS_KEY, {});
    if (Number.isFinite(s.x)) el.offsetX.value = s.x;
    if (Number.isFinite(s.y)) el.offsetY.value = s.y;
    if (Number.isFinite(s.fs)) el.fontSize.value = s.fs;
    if (s.type) {
      const radio = document.querySelector(`input[name="recipientType"][value="${s.type}"]`);
      if (radio) radio.checked = true;
    }
  }

  function clearInputs() {
    if (!confirm("入力内容をクリアしますか？")) return;
    [el.query, el.postal, el.address, el.hospital, el.department, el.doctor]
      .forEach(x => x.value = "");
    el.results.innerHTML = "";
    el.status.textContent = "";
    updatePreview();
  }

  function validateBeforePrint() {
    if (!el.hospital.value.trim()) {
      alert("病院名を入力してください。");
      el.hospital.focus();
      return false;
    }
    if (!el.address.value.trim()) {
      alert("住所を入力してください。");
      el.address.focus();
      return false;
    }
    if (getRecipientType() === "doctor" && !el.doctor.value.trim()) {
      const ok = confirm("医師名が空欄です。このまま「先生 御机下」で印刷しますか？");
      if (!ok) {
        el.doctor.focus();
        return false;
      }
    }
    return true;
  }

  el.searchBtn.addEventListener("click", searchHospitals);
  el.query.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchHospitals();
    }
  });

  [el.postal, el.address, el.hospital, el.department, el.doctor,
   el.offsetX, el.offsetY, el.fontSize]
    .forEach(node => node.addEventListener("input", updatePreview));

  document.querySelectorAll('input[name="recipientType"]')
    .forEach(node => node.addEventListener("change", updatePreview));

  el.printBtn.addEventListener("click", () => {
    updatePreview();
    if (validateBeforePrint()) window.print();
  });

  el.clearBtn.addEventListener("click", clearInputs);

  restoreSettings();
  updatePreview();
})();
